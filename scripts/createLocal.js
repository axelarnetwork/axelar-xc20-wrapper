const {
    createAndExport,
    utils: { setJSON, deployContract },
} = require('@axelar-network/axelar-local-dev');
const {
    Wallet,
    utils: { keccak256, defaultAbiCoder },
} = require('ethers');
const { deploy } = require('.');
require('dotenv').config();
async function createLocal(toFund, chains = null) {
    async function callback(chain, info) {
        await chain.deployToken('Axelar Wrapped USDC', 'aUSDC', 6, BigInt(1e17));
        for (const address of toFund) await chain.giveToken(address, 'aUSDC', BigInt(1e18));
    }

    await createAndExport({
        chainOutputPath: './info/local.json',
        accountsToFund: toFund,
        chains: chains || ['Moonbeam', 'Avalanche'],
        callback: callback,
    });
}

module.exports = {
    createLocal,
};

if (require.main === module) {
    const deployer_key = keccak256(defaultAbiCoder.encode(['string'], [process.env.PRIVATE_KEY_GENERATOR]));
    const deployer_address = new Wallet(deployer_key).address;

    const toFund = [deployer_address];

    for (let j = 2; j < process.argv.length; j++) {
        toFund.push(process.argv[j]);
    }
    createLocal(toFund);
}
