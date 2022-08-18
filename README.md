To setup:

```
npm i
npm run build
```

To set up your EVM account:

```
cp .env.example .env
#then copy your private key to use in this exercise
```

To create a local Moonbeam (on a separate terminal):

```
node scripts/createLocal
```

To deploy the contracts:

```
node scripts/deploy local
```

To test the contracts:

```
node scripts/addLocalXc20.js local
node scripts/addMapping local aUSDC
```

See [test.js](test/test.js) for more in-depth tests.
