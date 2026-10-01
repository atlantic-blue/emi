# The licences of everything Emi redistributes

Emi itself is MIT. Read `LICENCE`. This document covers the third party files that travel inside the
application, which today is the font binaries in `apps/mobile/assets/fonts`.

The repository is public and the fonts ship inside the application, so each family keeps its licence
next to its files, and a reader gets one page that names both. A test in
`packages/tokens/tests/fonts.test.ts` reads this page and the tree, and it fails when the two
disagree.

## How to read this document

Status: built

Every section carries one status line, the same as `architecture.md`. `Status: built` means the
files are in this repository now.

Every font here is redistributed unmodified. Nothing is subset, renamed or re-hinted, and
`.gitattributes` stops git from rewriting a line ending in a licence file.

## Figtree

Status: built

Every word of the application. The design system sets `display-lg`, `display-lg-mobile`,
`headline-lg`, `headline-md`, `headline-sm`, `body-lg`, `body-sm`, `label-md` and `label-sm` in it,
and the wordmark is set in it too.

Licence: SIL Open Font License, Version 1.1, in `apps/mobile/assets/fonts/figtree/OFL.txt`.
Copyright 2022 The Figtree Project Authors (https://github.com/erikdkennedy/figtree)
Source: https://github.com/erikdkennedy/figtree

Files:

- `figtree/Figtree-Regular.ttf`
- `figtree/Figtree-SemiBold.ttf`
- `figtree/Figtree-Bold.ttf`
- `figtree/Figtree-ExtraBold.ttf`

Figtree publishes a variable file and a set of static cuts. The static cuts ship here, because a
variable font registers as its default instance on a phone. The redesign asks for four weights, and
each one arrives as its own file.

## JetBrains Mono

Status: built

The recovery code, and every number a reader has to copy. The design system sets `data-lg` and
`data-sm` in it. A monospaced figure holds its place as it changes, so a number does not move while
she reads it, and one character cannot be mistaken for another.

Licence: SIL Open Font License, Version 1.1, in `apps/mobile/assets/fonts/jetbrains-mono/OFL.txt`.
Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)
Source: https://github.com/JetBrains/JetBrainsMono

Files:

- `jetbrains-mono/JetBrainsMono-Regular.ttf`
- `jetbrains-mono/JetBrainsMono-Medium.ttf`

## What the Open Font License asks of Emi

Status: built

The licence text travels with the files, which is why `OFL.txt` sits in each family's own directory
rather than once at the root. The fonts may be bundled in the application and sold with it. They may
not be sold on their own. The attribution sits on this page.

Neither licence reserves a font name. A licence that does declares it on its first line,
and the token package records it beside the family, so a family that arrives with a reservation is
held to it rather than trusted.

## The cuts each family ships

Status: built

Each cut answers a weight the design system own roles ask for. Figtree ships 400, 600, 700 and 800,
because the redesign draws running text, a row label, a heading and a number at four weights.
JetBrains Mono ships 400 and 500. A weight nobody asks for is bytes in the download.

Each file is a static instance rather than a variable font. A variable font registers as its default
instance on a phone, so a weight set in a style would draw the default one, and the mistake would be
invisible in every test. The token package names each file, and the test reads the name out of the
file itself.
