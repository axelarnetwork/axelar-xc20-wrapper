To setup:

```
npm i
npm run build
```

To create a local Moonbeam (on a separate terminal):

```
node scripts/createLocal
```

To deploy the contracts:

```
node scripts/deploy local
```

To test the contracts (you need to redeploy every 5 tests):

```
node scripts/test local
```