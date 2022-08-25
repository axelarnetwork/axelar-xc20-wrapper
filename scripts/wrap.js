'use strict';
require('dotenv').config();
const { testnetInfo } = require('@axelar-network/axelar-local-dev');
const {
    Wallet,
    getDefaultProvider,
    Contract,
} = require('ethers');

const XC20Wrapper = require('../artifacts/contracts/XC20Wrapper.sol/XC20Wrapper.json');
const IERC20 = require('../artifacts/contracts/interfaces/IERC20.sol/IERC20.json');
const IAxelarGateway = require('../artifacts/@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol/IAxelarGateway.json');

async function wrap(chain, symbol, amount, walletUnconnected) {
    const rpc = chain.rpc;
    const provider = getDefaultProvider(rpc);
    const wallet = walletUnconnected.connect(provider);
    const wrapperContract = new Contract(chain.xc20Wrapper, XC20Wrapper.abi, wallet);
    const gatewayContract = new Contract(chain.gateway, IAxelarGateway.abi, wallet);
    const tokenContract = new Contract(await gatewayContract.tokenAddresses(symbol), IERC20.abi, wallet);

    const approvalTx = await (await tokenContract.connect(wallet).approve(wrapperContract.address, amount)).wait();
    const wrappedTx = await (await wrapperContract.connect(wallet).wrap(tokenContract.address, amount)).wait();
    
    return { approvalTx, wrappedTx };
}

module.exports = {
    wrap,
};

if (require.main === module) {
    const wallet = new Wallet(process.env.PRIVATE_KEY);

    const env = process.argv[2];
    if (env === null || (env !== 'testnet' && env !== 'local'))
        throw new Error('Need to specify tesntet or local as an argument to this script.');
    let temp;

    if (env === 'local') {
        temp = require(`../info/local.json`);
    } else {
        try {
            temp = require(`../info/testnet.json`);
        } catch {
            temp = testnetInfo;
        }
    }

    const chains = temp;

    const chain = chains[0];
    const symbol = process.argv[3];
    const amount = process.argv[4];

    wrap(chain, symbol, amount, wallet).then(({ approvalTx, wrappedTx }) => {
        console.log("wrapped ",symbol, " on ",chain.name, " at tx ",wrappedTx.transactionHash);
    });
}
