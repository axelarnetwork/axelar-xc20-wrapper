'use strict';

const { testnetInfo } = require('@axelar-network/axelar-local-dev');
const {  Wallet } = require('ethers');
const { keccak256, defaultAbiCoder } = require('ethers/lib/utils');



async function test(chains, args, wallet, example) {
    await example.test(chains, wallet, {
        args: args
    });
}

module.exports = {
    test,
}

if (require.main === module) {
    //0x8ff26335325ad2c33d87bf8be4a53f28abaac5cf654a42080bc2b91938b1281d
    const private_key = keccak256(defaultAbiCoder.encode(['string'], ['this is a random string to get a random account. You need to provide the private key for a funded account here.']));
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
    const args = process.argv.slice(3);

    test(chains, args, wallet, example);
}