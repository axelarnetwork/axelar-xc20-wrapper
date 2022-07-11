'use strict';

const {
    getDefaultProvider,
    Wallet,
    Contract,
    constants: { AddressZero },
    utils: { defaultAbiCoder, keccak256 },
} = require('ethers');
const {
    utils: { deployContract },
    getNetwork,
} = require('@axelar-network/axelar-local-dev');

const XC20Wrapper = require('../artifacts/contracts/XC20Wrapper.sol/XC20Wrapper.json');
const XC20Sample = require('../artifacts/contracts/XC20Sample.sol/XC20Sample.json');
const Proxy = require('../artifacts/contracts/Proxy.sol/Proxy.json');
const IERC20 = require('../artifacts/contracts/interfaces/IERC20.sol/IERC20.json');
const IAxelarGateway = require('../artifacts/@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarGateway.sol/IAxelarGateway.json');
const { setJSON } = require('@axelar-network/axelar-local-dev/dist/utils');

async function deploy(chain, wallet) {
    console.log(`Deploying XC20Wrapper for ${chain.name}.`);
    const impl = await deployContract(wallet, XC20Wrapper, []);
    console.log(`Deployed XC20Wrapper for ${chain.name} at ${impl.address}.`);
    console.log(`Deploying Proxy for ${chain.name}.`);

    const xc20Sample = await deployContract(wallet, XC20Sample, [AddressZero, 'i trust this will hash chaotically']);
    const provider = getDefaultProvider(chain.rpc);
    const implementationCode = await provider.getCode(xc20Sample.address);

    const codeHash = keccak256(implementationCode);
    const proxy = await deployContract(wallet, Proxy, [
        impl.address,
        //0x9a289e138d67f0784b748f6f06b39ef6f9cfd5eba9f8467f55002494cf47d343
        defaultAbiCoder.encode(['address', 'address', 'bytes32'], [chain.gateway, wallet.address, codeHash]),
    ]);
    chain.xc20Wrapper = proxy.address;
    console.log(`Deployed Proxy for ${chain.name} at ${proxy.address}.`);

    chain.xc20Samples = [];
}

async function upgrade(chain, wallet) {
    console.log(`Deploying XC20Wrapper for ${chain.name}.`);
    const impl = await deployContract(wallet, XC20Wrapper, []);
    console.log(`Deployed XC20Wrapper for ${chain.name} at ${impl.address}.`);
    console.log(`Upgrading Proxy for ${chain.name}.`);

    const provider = getDefaultProvider(chain.rpc);
    const xc20code = await provider.getCode(chain.xc20Samples[0]);
    const xc20Codehash = keccak256(xc20code);

    const implCode = await provider.getCode(impl.address);
    const implCodehash = keccak256(implCode);

    const proxy = new Contract(chain.xc20Wrapper, XC20Wrapper.abi, wallet);
    await (
        await proxy.upgrade(
            impl.address,
            implCodehash,
            defaultAbiCoder.encode(['address', 'address', 'bytes32'], [chain.gateway, wallet.address, xc20Codehash]),
        )
    ).wait();
    chain.xc20Wrapper = proxy.address;
    console.log(`Upgraded Proxy for ${chain.name} at ${proxy.address}.`);
}

async function addToken(wrapperAddress, symbol, xc20Address, wallet, value) {
    const wrapper = new Contract(wrapperAddress, XC20Wrapper.abi, wallet);
    console.log(await wrapper.unwrapped(xc20Address));
    await (
        await wrapper.addWrapping(symbol, xc20Address, 'X-USDC', 'xUSDC', {
            value: value,
        })
    ).wait();
}

async function addLocalTokenPair(chains, walletUnconnected) {
    const chain = chains[0];
    const provider = getDefaultProvider(chain.rpc);
    const wallet = walletUnconnected.connect(provider);
    console.log(`Deploying XC20Sample.`);
    const xc20Sample = await deployContract(wallet, XC20Sample, [chain.xc20Wrapper, 'i trust this will hash chaotically']);
    chain.xc20Samples.push(xc20Sample.address);
    console.log(`Deployed XC20Sample for ${chain.name} at ${xc20Sample.address}.`);
    const i = chain.xc20Samples.length - 1;
    const name = `Test Token #${i}`;
    const symbol = `TT${i}`;
    const decimals = 13 + i;

    for (const chain of chains) {
        const provider = getDefaultProvider(chain.rpc);
        const wallet = walletUnconnected.connect(provider);
        const network = await getNetwork(chain.rpc);
        const unwrapped = await network.deployToken(name, symbol, decimals, BigInt(1e30), AddressZero);
        console.log(`Deployed [ ${name}, ${symbol}, ${decimals} ] at ${unwrapped.address}.`);
        await network.giveToken(wallet.address, symbol, BigInt(1e18));
    }
}

async function test(chains, unconnectedWallet, options) {
    const chain = chains[0];
    const provider = getDefaultProvider(chain.rpc);
    const wallet = new Wallet(unconnectedWallet, provider);
    const wrapper = new Contract(chain.xc20Wrapper, XC20Wrapper.abi, wallet);

    let i;
    for (i = chain.xc20Samples.length - 1; i >= 0; i--) {
        if ((await wrapper.unwrapped(chain.xc20Samples[i])) != AddressZero) break;
    }
    if (i < 0) {
        console.log('Nothing is wrapped.');
        return;
    }
    const xc20 = new Contract(chain.xc20Samples[i], XC20Sample.abi, wallet);
    const unwrappedAddress = await wrapper.unwrapped(chain.xc20Samples[i]);
    const unwrapped = new Contract(unwrappedAddress, XC20Sample.abi, wallet);
    const decimals = 6; //await unwrapped.decimals();
    const symbol = await unwrapped.symbol();
    const amount = BigInt(Math.pow(10, decimals));

    async function print() {
        console.log(
            `User has ${(await unwrapped.balanceOf(wallet.address)) / Math.pow(10, decimals)} unwrapped and ${
                (await xc20.balanceOf(wallet.address)) / Math.pow(10, decimals)
            } wrapped.`,
        );
    }
    function sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, ms);
        });
    }

    console.log('--- Initially ---');
    await print();

    await (await unwrapped.connect(wallet).approve(wrapper.address, amount)).wait();
    await (await wrapper.wrap(unwrapped.address, amount)).wait();

    console.log('--- After Wrap---');
    await print();

    await (await wrapper.unwrap(xc20.address, amount)).wait();

    console.log('--- After Unwrap---');
    await print();

    return;

    const remote = chains[1];
    const remoteProvider = getDefaultProvider(remote.rpc);
    const remoteWallet = unconnectedWallet.connect(remoteProvider);
    const remoteGateway = new Contract(remote.gateway, IAxelarGateway.abi, remoteWallet);
    const remoteUnwrappedAddress = await remoteGateway.tokenAddresses(symbol);
    const remoteUnwrapped = new Contract(remoteUnwrappedAddress, IERC20.abi, remoteWallet);
    await (await remoteUnwrapped.approve(remoteGateway.address, amount)).wait();

    const payload = defaultAbiCoder.encode(['address', 'uint256'], [wallet.address, new Date().getTime()]);
    await (await remoteGateway.callContractWithToken(chain.name, chain.xc20Wrapper, payload, symbol, amount)).wait();
    console.log('waiting for call to get there.');
    const gateway = new Contract(chain.gateway, IAxelarGateway.abi, wallet);
    const filter = gateway.filters.ContractCallApprovedWithMint(null, null, null, wrapper.address, keccak256(payload));
    let validated;
    while (true) {
        validated = (await gateway.queryFilter(filter))[0];
        if (validated) break;
        await sleep(1000);
    }
    console.log('executing');
    const tx = await (
        await wrapper.executeWithToken(validated.args.commandId, remote.name, remoteWallet.address, payload, symbol, validated.args.amount)
    ).wait();
    console.log('--- After a execution ---');
    await print();
}

module.exports = {
    deploy,
    test,
    addLocalTokenPair,
    addToken,
    upgrade,
};
