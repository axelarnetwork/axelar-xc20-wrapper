'use strict';

const chai = require('chai');
const {
    utils: { defaultAbiCoder },
    Contract,
    Wallet,
    getDefaultProvider,
} = require('ethers');

const { expect } = chai;
const {
    createNetwork,
    relay,
    stopAll,
    getNetwork,
    utils: { defaultAccounts, setLogger, deployContract },
    setupNetwork,
    getDepositAddress,
    getFee,
    listen,
    forkNetwork,
    mainnetInfo,
    networks,
} = require('@axelar-network/axelar-local-dev');

setLogger((...args) => {});

const { keccak256, toUtf8Bytes } = require('ethers/lib/utils');

const { createLocal } = require('../scripts/createLocal.js');
const { deploy } = require('../scripts/deploy');
const { addWrapping } = require('../scripts/addWrapping');
const { addLocalTokenPair } = require('../scripts/addLocalTokenPair');
const { addLocalXc20 } = require('../scripts/addLocalXc20');

const XC20Wrapper = require('../artifacts/contracts/XC20Wrapper.sol/XC20Wrapper.json');
const IERC20 = require('../artifacts/contracts/interfaces/IERC20.sol/IERC20.json');
const IAxelarGateway = require('../artifacts/@axelar-network/axelar-utils-solidity/contracts/interfaces/IAxelarGateway.sol/IAxelarGateway.json');
const XC20Sample = require('../artifacts/contracts/XC20Sample.sol/XC20Sample.json');

const deployer_key = keccak256(defaultAbiCoder.encode(['string'], [process.env.PRIVATE_KEY_GENERATOR]));
const deployer_address = new Wallet(deployer_key).address;

let contract;
let provider;
let wallet;
let chains;
let chain;
const initialBalance = BigInt(1e18);

beforeEach(async () => {
    const toFund = [deployer_address];
    await createLocal(toFund, ['Moonbeam']);
    chains = require('../info/local.json');
    chain = chains[0]
    provider = getDefaultProvider(chain.rpc);
    wallet = new Wallet(deployer_key, provider);
    await deploy('local', chains, wallet);
    contract = new Contract(chain.xc20Wrapper, XC20Wrapper.abi, wallet);
    await addLocalXc20(chain, wallet);
});

afterEach(async () => {
    await stopAll();
})

describe('manage wrappings', () => {
    it('should add a Wrapping', async () => {
        await addWrapping(chain, 'aUSDC', wallet);
    });
    it('should add a pair and a wrapping', async () => {
        await addWrapping(chain, 'aUSDC', wallet);
        const symbol = await addLocalTokenPair(chains, wallet);

        await addWrapping(chain, symbol, wallet);
    });
});

describe('wrap/unwrap', () => {
    let usdc;
    let xc20;
    beforeEach(async() => {
        await addWrapping(chain, 'aUSDC', wallet);
        const gateway = new Contract(chain.gateway, IAxelarGateway.abi, provider);
        const usdcAddress = await gateway.tokenAddresses('aUSDC');
        usdc = new Contract(usdcAddress, IERC20.abi, provider);
        xc20 = new Contract(await contract.wrapped(usdcAddress), XC20Sample.abi, wallet);
    });
    it('should wrap and unwrap', async () => {
        const amountWrapped = BigInt(2e6);
        const amountUnwrapped = BigInt(1e6);
        expect(BigInt(await usdc.balanceOf(wallet.address))).to.equal(initialBalance); 
        expect(BigInt(await xc20.balanceOf(wallet.address))).to.equal(0n); 

        await (await usdc.connect(wallet).approve(contract.address, amountWrapped)).wait();
        await (await contract.connect(wallet).wrap(usdc.address, amountWrapped)).wait();
        
        expect(BigInt(await usdc.balanceOf(wallet.address))).to.equal(initialBalance - amountWrapped);
        expect(BigInt(await xc20.balanceOf(wallet.address))).to.equal(amountWrapped); 


        await (await xc20.connect(wallet).approve(contract.address, amountUnwrapped)).wait();
        await (await contract.connect(wallet).unwrap(xc20.address, amountUnwrapped)).wait();

        expect(BigInt(await usdc.balanceOf(wallet.address))).to.equal(initialBalance - amountWrapped + amountUnwrapped);
        expect(BigInt(await xc20.balanceOf(wallet.address))).to.equal(amountWrapped - amountUnwrapped); 
    });
});
