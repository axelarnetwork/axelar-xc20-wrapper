# XC WRAPPER FOR AXELAR TOKENS

To setup:

```
npm i
npm run build
```

To set up your EVM account:

```
cp .env.example .env
#then copy your private key to use in this exercise
#this will be the key that the local dev environment will fund for scripts run locally.
#for testnet, please ensure your account tied to this private key is funded on Moonbeam
```

## Local Development

#### To create a local Moonbeam (on a separate terminal):

```
node scripts/createLocal
```

#### To deploy the contracts:

```
node scripts/deploy local
```

#### To test the admin functions to add an XC token to wrap an Axelar ERC-20 token:

```
node scripts/addXc20Token.js local #deploys an additional XC-20 token
node scripts/addMapping local aUSDC #pairs the XC-20 token with the specified Axelar ERC-20
```

#### To test the wrap feature:

```
node scripts/wrap local aUSDC 1000000
```

#### To test the unwrap feature:

```
node scripts/unwrap local aUSDC 1000000
```

## Testnet Development

The XC-wrapper has already been deployed and verified on Moonbeam testnet: 0xaAbeb41FA2b7e525364bBE3801B743B78a404326
https://moonbase.moonscan.io/address/0xaAbeb41FA2b7e525364bBE3801B743B78a404326#readProxyContract

#### To test the admin functions to add an XC token to wrap an Axelar ERC-20 token:

1. You can either invoke the below to deploy a new XC-20 token to be wrapped:

```
node scripts/addXc20Token.js testnet #deploys an additional XC-20 token
```

, or if you have an existing and unpaired XC-20 token in testnet to add, you should add it to `info/testnet.json`, appending it to the `xc20Samples` array.

2. Then map it:

```
node scripts/addMapping testnet <AXELAR_ERC20_TOKEN_SYMBOL> #pairs the XC-20 token with the specified Axelar ERC-20
```

#### To test the wrap feature:

```
node scripts/wrap local aUSDC 1000000
```

#### To test the unwrap feature:

```
node scripts/unwrap local aUSDC 1000000
```

## Other

See [test.js](test/test.js) for more in-depth tests.
