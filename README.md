# emi

Emi is a period and cycle tracker. She pays 29.99 pounds a year. Nobody sells her data, because
nobody can read it. The predictions are arithmetic on her own phone. The cloud holds ciphertext and
no key.

Emi is not a contraceptive. Emi is not a medical device.

## What is here

    apps/mobile         the Expo application
    packages/tokens     the colours, the type scale and the spacing
    packages/cycle      the prediction arithmetic
    packages/crypto     the encrypted record format

## How to run it

You need Node 22 or later.

    npm ci
    npm start --workspace apps/mobile

Press `i` for the iOS simulator. Press `w` for the browser.

## The gates

The pipeline runs these four commands, in this order, on every pull request.

    npm run format:check
    npm run lint
    npm run typecheck
    npm test

A test run that finds no test fails. It does not report success.

## Licence

MIT. Read `LICENCE`. The copyright holder is Atlantic Blue Solutions Limited.
