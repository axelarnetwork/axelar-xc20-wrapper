'use strict';
require('dotenv').config();
const {
    utils: { setJSON },
    testnetInfo,
} = require('@axelar-network/axelar-local-dev');
const { Wallet } = require('ethers');
const { keccak256, defaultAbiCoder } = require('ethers/lib/utils');
const index = require(`./index.js`);

async function addLocalXc20(chain, walletUnconnected) {
    await index.addLocalXc20(chain, walletUnconnected);
}

module.exports = {
    addLocalXc20,
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

    addLocalXc20(chains[0], wallet).then(() => {
        setJSON(chains, `./info/${env}.json`);
    });
}
