# @emi/sign-in

The sign in with an email code, and the last step of the Telegram sign in, against the Amazon
Cognito pool of Emi. The website and the application both import it, each through its own client of
the pool.

## What it exports

The whole surface, with the comment that sits on each symbol, is in `docs/reference/sign-in.md`.
That page is generated from the source.

`theSignInFor` takes a client identifier and returns the calls: `askForACode`,
`sendHerAnotherCode`, `signInWithTheCode`, `signInWithTheOneTimeAnswer` and `signOut`. Each call
takes how it reaches the service as its last argument, so a test answers without a network.

A phone has no web crypto, so the application passes its own random source for the username.
