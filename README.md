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
    brand               the logo, the specimen and the generators that draw them
    docs                the licences of everything Emi redistributes

## How to run it

You need Node 22 or later.

    make install
    make ios

`make android` runs it on an Android emulator. `make web` runs it in a browser.

## The gates

    make check

It runs what the pipeline runs, in the pipeline order, and it stops at the first failure. Type
`make` on its own for every other command this repository answers to.

A test run that finds no test fails. It does not report success.

## The brand sheets

    npm run generate:specimen

It draws the type specimen into `brand/specimen/specimen.png`. It needs a Chromium or Chrome
binary, and it looks for one in the usual places. Set `EMI_BROWSER` to the binary when it cannot
find yours.

## Licence

MIT. Read `LICENCE`. The copyright holder is Atlantic Blue Solutions Limited.

The three fonts inside the application are redistributed under the SIL Open Font License, version
1.1. Each family keeps its licence next to its files, and `docs/licences.md` names all three.
