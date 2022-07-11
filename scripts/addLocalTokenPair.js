'use strict';
require('dotenv').config();
const { setJSON } = require('@axelar-network/axelar-local-dev/dist/utils');
const { Wallet } = require('ethers');
const { keccak256, defaultAbiCoder } = require('ethers/lib/utils');
const example = require(`./index.js`);

async function addLocalTokenPair(chains, walletUnconnected, example) {
    await example.addLocalTokenPair(chains, walletUnconnected);
}

module.exports = {
    addLocalTokenPair,
};

if (require.main === module) {
    const private_key = keccak256(defaultAbiCoder.encode(['string'], [process.env.PRIVATE_KEY_GENERATOR]));
    const wallet = new Wallet(private_key);

    const chains = require(`../info/local.json`);

    addLocalTokenPair(chains, wallet, example).then(() => {
        setJSON(chains, './info/local.json');
    });
}
