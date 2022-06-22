

'use strict';
require("dotenv").config();
const { testnetInfo } = require('@axelar-network/axelar-local-dev');
const { setJSON } = require('@axelar-network/axelar-local-dev/dist/utils');
const {  Wallet, getDefaultProvider, Contract, constants: {AddressZero} } = require('ethers');
const { keccak256, defaultAbiCoder } = require('ethers/lib/utils');

const XC20Wrapper = require('../artifacts/contracts/XC20Wrapper.sol/XC20Wrapper.json');
const XC20Sample = require('../artifacts/contracts/XC20Sample.sol/XC20Sample.json');

async function addWrapping(chains, symbol, walletUnconnected, example) {
    const chain = chains[0];
    const rpc = chain.rpc;
    const provider = getDefaultProvider(rpc);
    const wallet = walletUnconnected.connect(provider);
    const wrapper = new Contract(chain.xc20Wrapper, XC20Wrapper.abi, wallet);
    let i;
    for(i=0; i<chain.xc20Samples.length;i++) {
        if(await wrapper.unwrapped(chain.xc20Samples[i]) == AddressZero) break;
    }
    if(i == chain.xc20Samples.length) {
        console.log('Need to add more XC20s.')
        return;
    }
    symbol = symbol || `TT${i}`;
    console.log(`Adding wrapping for ${symbol} and ${chain.xc20Samples[i]}`);
    await example.addToken(wrapper.address, symbol, chain.xc20Samples[i], wallet);
}

module.exports = {
    addWrapping,
}

if (require.main === module) {
    //0x8ff26335325ad2c33d87bf8be4a53f28abaac5cf654a42080bc2b91938b1281d
    const private_key = keccak256(defaultAbiCoder.encode(['string'], [process.env.PRIVATE_KEY_GENERATOR]));
    const wallet = new Wallet(private_key);

    const example = require(`./index.js`);
    const env = process.argv[2];
    if(env == null || (env != 'testnet' && env != 'local')) throw new Error('Need to specify tesntet or local as an argument to this script.');
    let temp;
    if(env == 'local') {
        temp = require(`../info/local.json`);
    } else {
        try {
            temp = require(`../info/testnet.json`);
        } catch {
            temp = testnetInfo;
        }
    }
    const chains = temp;
    const symbol = process.argv[3];


    addWrapping(chains, symbol, wallet, example).then(() =>{
        setJSON(chains, './info/local.json');
    });
}
