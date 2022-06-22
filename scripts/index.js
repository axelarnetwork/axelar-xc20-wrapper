'use strict';

const { getDefaultProvider, Contract, constants: { AddressZero }, utils: {defaultAbiCoder, keccak256} } = require('ethers');
const { utils: { deployContract }, getNetwork} = require('@axelar-network/axelar-local-dev');

const XC20Wrapper = require('../artifacts/contracts/XC20Wrapper.sol/XC20Wrapper.json');
const XC20Sample = require('../artifacts/contracts/XC20Sample.sol/XC20Sample.json');
const Proxy = require('../artifacts/contracts/Proxy.sol/Proxy.json');

async function deploy(chain, wallet) {
    console.log(`Deploying XC20Wrapper for ${chain.name}.`);
    const impl = await deployContract(wallet, XC20Wrapper, []);
    console.log(`Deployed XC20Wrapper for ${chain.name} at ${impl.address}.`);
    console.log(`Deploying Proxy for ${chain.name}.`);

    const xc20Sample = await deployContract(wallet, XC20Sample, [
        AddressZero, 
        'i trust this will hash chaotically'
    ]);
    const provider = getDefaultProvider(chain.rpc);
    const implementationCode = await provider.getCode(
        xc20Sample.address,
    );
        
    const codeHash = keccak256(implementationCode);
    const proxy = await deployContract(wallet, Proxy, [
        impl.address, 
        //0x9a289e138d67f0784b748f6f06b39ef6f9cfd5eba9f8467f55002494cf47d343
        defaultAbiCoder.encode(['address', 'address', 'bytes32'], [chain.gateway, wallet.address, codeHash]),
    ]);
    const contract = new Contract(proxy.address, XC20Wrapper.abi, wallet);
    chain.xc20Wrapper = proxy.address;
    console.log(`Deployed Proxy for ${chain.name} at ${proxy.address}.`);
    const N = 5;
    chain.xc20Samples = [];
    console.log(`Deploying XC20Sample ${N+1} times.`);
    for(let i=0;i<N+1;i++) {
        const xc20Sample = await deployContract(wallet, XC20Sample, [
            chain.xc20Wrapper, 
            'i trust this will hash chaotically'
        ]);
        chain.xc20Samples.push(xc20Sample.address);
        console.log(`Deployed XC20Sample ${i+1} / ${N+1} for ${chain.name} at ${xc20Sample.address}.`);
    }
    console.log(`Adding token aUSDC for ${chain.xc20Samples[N]}.`);
    await addToken(contract.address, 'aUSDC', chain.xc20Samples[N], wallet);
}

async function addToken(wrapperAddress, symbol, xc20Address, wallet) {
    const wrapper = new Contract(wrapperAddress, XC20Wrapper.abi, wallet);
    await (await wrapper.addWrapping(
        symbol, 
        xc20Address, 
        'X-USDC', 
        'xUSDC'
    )).wait();
}

async function test(chains, walletUnconnected, options) {
    const args = options.args || [];
    const chain = chains[0];
    const provider = getDefaultProvider(chain.rpc);
    const wallet = walletUnconnected.connect(provider);
    const wrapper = new Contract(chain.xc20Wrapper, XC20Wrapper.abi, wallet);
    let i;
    for(i=0; i<chain.xc20Samples.length;i++) {
        if(await wrapper.unwrapped(chain.xc20Samples[i]) == AddressZero) break;
    }
    if(i == chain.xc20Samples.length) {
        console.log('All XC20s are being used, deploy some more.');
        return;
    }
    const network = await getNetwork(chain.rpc);
    const name = `Test Token #${i}`
    const symbol = `TT${i}`
    const decimals = 13+i;
    const xc20 = new Contract(chain.xc20Samples[i], XC20Sample.abi, wallet);
    const unwrapped = await network.deployToken(name, symbol, decimals, BigInt(1e30), AddressZero);
    await addToken(wrapper.address, symbol, xc20.address, wallet);
    await network.giveToken(wallet.address, symbol, BigInt(1e18));
    const amount = BigInt(Math.pow(10, decimals));

    async function print() {
        console.log(`User has ${await unwrapped.balanceOf(wallet.address)/Math.pow(10, decimals)} unwrapped and ${await xc20.balanceOf(wallet.address)/Math.pow(10, decimals)} wrapped.`);
    }
    function sleep(ms) {
        return new Promise((resolve)=> {
            setTimeout(() => {resolve()}, ms);
        })
    }

    console.log('--- Initially ---');
    await print();

    await (await unwrapped.connect(wallet).approve(wrapper.address, amount)).wait();
    await (await wrapper.wrap(unwrapped.address, amount));

    console.log('--- After Wrap---');
    await print();

    await (await wrapper.unwrap(xc20.address, amount));

    console.log('--- After Unwrap---');
    await print();
}

module.exports = {
    deploy,
    test,
}
