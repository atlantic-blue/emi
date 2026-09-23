# The reference

What each package exports, generated from the source by `npm run generate:reference`. A readme says
what a package is for. These pages say what it offers, what each function refuses, and which
values are in range.

- `content.md` is `@emi/content`, 21 exported symbols across 5 files.
- `crypto.md` is `@emi/crypto`, 114 exported symbols across 8 files.
- `cycle.md` is `@emi/cycle`, 97 exported symbols across 8 files.
- `tokens.md` is `@emi/tokens`, 81 exported symbols across 8 files.
- `ui.md` is `@emi/ui`, 17 exported symbols across 10 files.
- `vault.md` is `@emi/vault`, 84 exported symbols across 14 files.

## The three rules the pipeline enforces

`npm run check:reference` and `tools/pipeline/reference.test.ts` hold these between them.

Every exported symbol carries a documentation comment. A symbol without one fails the run and
is named with its file and its line.

The committed page is what the generator writes. A difference of one character fails the run,
names the line, and says to run `npm run generate:reference`. So a changed signature cannot leave a
stale page behind.

A comment says something the signature cannot. A comment holding no word the declaration does
not already carry is refused, because it costs a reader a line and tells them nothing.
