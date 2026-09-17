# The documents

Emi is a period and cycle tracker. The repository is public so that a reader can check the privacy
claim against the code that makes it. These documents are the readable half of that.

- `architecture.md` says what runs on the phone, what runs in Amazon Web Services, and what crosses
  between the two.
- `brand.md` carries the palette, the measured contrast ratios, the type scale and the spacing. It
  is generated from `packages/tokens`, so nobody edits it by hand.

Each section of each document carries a status line. `Status: built` means the code is here now.
`Status: designed` means the design describes it and nobody wrote it yet. A test refuses a section
that carries neither.

## The checks that guard these documents

The pipeline runs one command over this directory and over every other tracked markdown file.

    npm run check:documents

It does three things. It renders every mermaid diagram through the mermaid command line tool, so a
diagram that does not parse fails the run. It compares the directory list in `architecture.md`
against the workspaces in the root `package.json` and against the disk. It reads the status line
under every heading.

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
