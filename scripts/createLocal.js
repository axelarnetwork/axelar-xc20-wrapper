const { createAndExport, utils: { setJSON, deployContract } } = require('@axelar-network/axelar-local-dev');
const { Wallet, utils: {keccak256, defaultAbiCoder} } = require('ethers');

async function createLocal () {
    const deployer_key = keccak256(defaultAbiCoder.encode(['string'], ['this is a random string to get a random account. You need to provide the private key for a funded account here.']));
    const deployer_address = new Wallet(deployer_key).address;

    async function callback(chain, info) {
        await chain.giveToken(deployer_address, 'aUSDC', BigInt(1e18));
    }

    const toFund = [deployer_address]

    for(let j=2; j<process.argv.length; j++) {
        toFund.push(process.argv[j]);
    }
    
    await createAndExport({
        chainOutputPath: "./info/local.json",
        accountsToFund: toFund,
        chains: ['Moonbeam'],
        callback: callback,
    });
}

module.exports = {
    createLocal,
}

if (require.main === module) {
    createLocal();
}