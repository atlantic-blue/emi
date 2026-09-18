# The documents

Emi is a period and cycle tracker. The repository is public so that a reader can check the privacy
claim against the code that makes it. These documents are the readable half of that.

- `architecture.md` says what runs on the phone, what runs in Amazon Web Services, and what crosses
  between the two.
- `features.md` names the eight features, the contracts each one builds, and what version 1 refuses
  to do.
- `contracts.md` states the input, the output and every error of each contract.
- `privacy.md` says which keys exist, where each one lives, what one encrypted day looks like, and
  the four attacks Emi does not defend against.
- `licences.md` names every third party file that ships inside the application, which today is
  the three fonts, and the licence each one travels under.
- `brand.md` carries the palette, the measured contrast ratios, the type scale and the spacing. It
  is generated from `packages/tokens`, so nobody edits it by hand.

Each section of `architecture.md` carries a status line. `Status: built` means the code is here now.
`Status: designed` means the design describes it and nobody wrote it yet. A test refuses a section
that carries neither.

## The checks that guard these documents

The pipeline runs one command over this directory and over every other tracked markdown file.

    npm run check:documents

It renders every mermaid diagram through the mermaid command line tool, so a diagram that does not
parse fails the run. It compares the directory list in `architecture.md` against the workspaces in
the root `package.json` and against the disk. It reads the status line under every heading of
`architecture.md`.

It also reads `features.md` and `contracts.md` together. A contract that one document names and the
other does not fails the run. A contract that two features both claim fails it too. An empty
refusal list fails it, because a version 1 that refuses nothing is a version 1 nobody can plan
around.

The check fails when it finds no diagram at all. A render that finds nothing to render reports
success just the same, and a green check that ran nothing is worth nothing.

## The document that generates itself

`brand.md` is written by `tools/brand/writeBrandDocument.ts` from the token package. The pipeline
runs one more command.

    npm run check:brand

It regenerates the document in memory and compares it against the committed copy. A difference of
one character fails the run, names the line, and says to run `npm run generate:brand`. So a colour
that changes in `packages/tokens` changes this document or stops the pipeline.

## Running the check on a machine with no bundled browser

The mermaid command line tool draws through Chrome. `npm ci` fetches one on the pipeline runner. A
machine that already has a browser can point the tool at it instead.

    PUPPETEER_EXECUTABLE_PATH=/path/to/headless_shell npm run check:documents

## The wording check

One more gate reads every tracked document, every source file and the store listing copy, and
refuses the wording of a claim Emi cannot support: a claim about preventing a pregnancy, a claim
that a day is safe, a badge, or the name of a standard nobody has audited.

    npx jest --ci --config jest.node.config.js tools/pipeline/forbiddenClaims.test.ts

The list of wording, and the short list of sentences that deny a claim and may therefore carry the
words, are in `tools/pipeline/forbiddenClaims.ts`. `privacy.md` says why the list exists.
