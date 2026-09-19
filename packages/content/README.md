# `@emi/content`

The article feed. The package holds the shape of an article, the client that reads one from the
endpoint, and the rule for how long an answer is held on the device.

Nothing here imports the application, so the whole path can be driven without starting a screen.

## What it exports

The whole surface, with the comment that sits on each symbol, is in `docs/reference/content.md`.
That page is generated from the source, so this section is the shape of the package and that one is
the detail.

`Article` is the contract: an identifier, the phase, a title, a body, an attribution line and a
link. The link may be nothing, for a piece with no page to open. `articleFrom` is the shape check,
and it answers nothing rather than throwing.

`articlesAt` is the client. It takes an address and a sender, carries a timeout, and answers
nothing on every way a call can go wrong. An address of nothing is one of those ways, and it is the
one every build takes today.

`CachedAnswer`, `ArticleCache` and `isFresh` are the holding rule. `readAnswer` and `writtenAnswer`
are how a row survives a launch. `memoryCache` is the one a test drives; the application supplies
one built on its own storage.

`articleReader` puts the two together: what is already held, then the endpoint.

## How to run its tests

From the root of the repository:

    npm run test:workspace

To run this package alone:

    npx jest --config jest.node.config.js packages/content

## What the request carries

The path is `/v1/articles/<phase>`, and the cycle phase is the whole of it. It carries no account
identifier, no signature, no dates and no body. Four phases exist, so the most a server can read
from one request is which quarter of a cycle somebody somewhere is reading about.

## The trap

No endpoint is deployed, so no build carries an address, and the client answers nothing without
making a call. That is the right answer and not a gap: the card is drawn only where there is an
article. The endpoint is https://github.com/atlantic-blue/emi/issues/132 and it waits on the data
model, https://github.com/atlantic-blue/emi/issues/131.

The prototype draws this card under a label naming a clinical feed and a named reviewer. Emi has
neither. Those words are written into no screen and into no file here, and a test reads both
directories to keep it that way. What a card says about where the words came from is the
`attribution` the endpoint supplies.
