# tools

The checks that guard the repository rather than the product. Nothing here ships to a phone. This
directory is not a workspace and it carries no manifest of its own, so it runs on the root install.

## What is inside

`pipeline/checkDocuments.ts` is the command behind `npm run check:documents`. It renders every
mermaid diagram through the mermaid command line tool, compares the directory list in
`docs/architecture.md` against the workspaces on disk in both directions, and reads the status line
under every heading. `pipeline/documentation.ts` holds the readers it calls, so each one can be run
against a fixture repository rather than against this one.

`brand/writeBrandDocument.ts` writes `docs/brand.md` from `packages/tokens`. `npm run generate:brand`
writes it and `npm run check:brand` fails when the committed copy differs by one character.

The tests beside them run under the workspace jest project. `documentation.test.ts` covers the
documents and the readmes. `forbiddenClaims.test.ts` reads every tracked text file for wording Emi
may never use about itself. `colourLeak.test.ts` proves a hex value outside `packages/tokens` is
refused. `licence.test.ts` reads the licence and every manifest that names one.
`emptyTestRun.test.ts` proves a run that finds no test fails.

## How to run them

From the root of the repository:

    npm run check:documents
    npm run check:brand
    npm run test:workspace

The mermaid tool draws through Chrome, and `npm ci` fetches one on the pipeline runner. On a machine
that already has a browser, point the tool at it:

    PUPPETEER_EXECUTABLE_PATH=/path/to/headless_shell npm run check:documents

## The trap

A check that finds nothing to check reports success. That is the failure every test in here is
written against, so each one counts what it saw and fails on zero: the document check refuses a run
that rendered no diagram, the colour check refuses a file list under eleven files, and the readme
check names the five directories it read. When you add a check, count the thing, and prove on a
fixture that the count can reach zero.
