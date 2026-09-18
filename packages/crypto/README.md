# @emi/crypto

One implementation of the encrypted record format. The application seals every day through it. The
vault service reads the shape of an envelope through it and never the content. Two implementations
would drift, and a drift here is a day she cannot read.

## What it exports

The whole surface, with the comment that sits on each symbol, is in `docs/reference/crypto.md`.
That page is generated from the source, so this section is the shape of the package and that one is
the detail.

`sealRecord` takes a day and a 32 byte key and returns the envelope: one byte of version `0x01`,
then a 24 byte nonce, then the ciphertext and its 16 byte authentication tag. The cipher is
XChaCha20-Poly1305 from `@noble/ciphers`. `openRecord` takes the envelope and the key and gives the
day back.

`readEnvelope` reads the version, the nonce and the sealed bytes, and that is all a service with no
key may do. It is the one function `services/vault` imports.

`recordProblems` and `checkedRecord` hold the ranges of the day record. A temperature sits between
34 and 42 degrees, a weight between 20 and 400 kilograms, energy between 1 and 5, a note under 2000
characters, and every symptom slug must be in the catalogue of `@emi/cycle`.

`canonicalJson`, `canonicalBytes` and `fromCanonicalBytes` sort the keys and drop the whitespace, so
the same record produces the same bytes on every phone.

Each refusal arrives as `EnvelopeError`, `RecordError` or `CanonicalError`, and each one carries a
name such as `envelope-is-not-authentic` or `nonce-is-all-zero`, so a screen can say what happened.

## How to run its tests

From the root of the repository:

    npm run test:workspace

To run this package alone:

    npx jest --config jest.node.config.js packages/crypto

## The trap

The libraries are pure TypeScript, and that is why they were chosen. `@noble/ciphers` is audited, it
has no dependencies, and it holds no native code. A package with native code reaches an Expo
application through autolinking, and a package whose native code sits outside its `ios` directory
installs by half: every test stays green and the application dies at launch on a device. Do not
replace it with a library that carries a native module.

Two smaller rules sit beside it. `tests/vectors.json` is frozen: a new version byte adds vectors and
never edits the ones already there, because a vector that moves with the code proves nothing about
the code. And nothing seals bytes directly. `sealRecord` is the only way in, so a value outside its
range cannot reach the cipher.
