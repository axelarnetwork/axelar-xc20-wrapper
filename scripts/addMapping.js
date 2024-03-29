'use strict';
require('dotenv').config();
const { testnetInfo } = require('@axelar-network/axelar-local-dev');
const { setJSON } = require('@axelar-network/axelar-local-dev/dist/utils');
const {
    Wallet,
    getDefaultProvider,
    Contract,
    constants: { AddressZero },
} = require('ethers');

const XC20Wrapper = require('../artifacts/contracts/XC20Wrapper.sol/XC20Wrapper.json');

async function addMapping(chain, symbol, walletUnconnected) {
    const index = require(`./index.js`);
    const rpc = chain.rpc;
    const provider = getDefaultProvider(rpc);
    const wallet = walletUnconnected.connect(provider);
    const wrapper = new Contract(chain.xc20Wrapper, XC20Wrapper.abi, wallet);
    let i;

    for (i = 0; i < chain.xc20Samples.length; i++) {
        if ((await wrapper.xc20ToAxelarToken(chain.xc20Samples[i])) === AddressZero) break;
    }

    if (i === chain.xc20Samples.length) {
        throw new Error('Need to add more XC20s.');
    }

    symbol = symbol || `TT${i}`;
    console.log(`Adding wrapping for ${symbol} and ${chain.xc20Samples[i]}`);
    await index.addToken(wrapper.address, symbol, chain.xc20Samples[i], wallet, BigInt(2e18));
}

module.exports = {
    addMapping,
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

    addMapping(chain, symbol, wallet).then(() => {
        setJSON(chains, './info/local.json');
    });
}
