'use strict';
require('dotenv').config();
const { testnetInfo } = require('@axelar-network/axelar-local-dev');
const { Contract, Wallet, getDefaultProvider } = require('ethers');
const { keccak256, defaultAbiCoder } = require('ethers/lib/utils');

const XC20Wrapper = require('../artifacts/contracts/XC20Wrapper.sol/XC20Wrapper.json');
const ERC20 = require('../artifacts/contracts/ERC20.sol/ERC20.json');

async function test(chains, args, unconnectedWallet, example) {
    const chain = chains[0];
    const provider = getDefaultProvider(chain.rpc);
    const wallet = unconnectedWallet.connect(provider);
    const wrapped = new Contract('0xffFfFffeFd9d0bf45a2947A519a741c4b9E99EB6', ERC20.abi, wallet);
    console.log(await wrapped.decimals());
}

module.exports = {
    test,
};

if (require.main === module) {
    //0x8ff26335325ad2c33d87bf8be4a53f28abaac5cf654a42080bc2b91938b1281d
    const private_key = keccak256(defaultAbiCoder.encode(['string'], [process.env.PRIVATE_KEY_GENERATOR]));
    const wallet = new Wallet(private_key);

    const example = require(`./index.js`);
    const env = process.argv[2];
    if (env == null || (env != 'testnet' && env != 'local'))
        throw new Error('Need to specify tesntet or local as an argument to this script.');
    let temp;
    if (env == 'local') {
        temp = require(`../info/local.json`);
    } else {
        try {
            temp = require(`../info/testnet.json`);
        } catch {
            temp = testnetInfo;
        }
    }
    const chains = temp;
    const args = process.argv.slice(3);

    test(chains, args, wallet, example);
}
