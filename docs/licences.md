# The licences of everything Emi redistributes

Emi itself is MIT. Read `LICENCE`. This document covers the third party files that travel inside the
application, which today is the font binaries in `apps/mobile/assets/fonts`.

The repository is public and the fonts ship inside the application, so each family keeps its licence
next to its files, and a reader gets one page that names all three. A test in
`packages/tokens/tests/fonts.test.ts` reads this page and the tree, and it fails when the two
disagree.

## How to read this document

Status: built

Every section carries one status line, the same as `architecture.md`. `Status: built` means the
files are in this repository now.

Every font here is redistributed unmodified. Nothing is subset, renamed or re-hinted, and
`.gitattributes` stops git from rewriting a line ending in a licence file.

## Newsreader 16pt

Status: built

Every display role and every headline. The design system sets `display-lg`, `display-lg-mobile`,
`headline-lg`, `headline-md` and `headline-sm` in it, and the wordmark is set in it too.

Licence: SIL Open Font License, Version 1.1, in `apps/mobile/assets/fonts/newsreader/OFL.txt`.
Copyright 2020 The Newsreader Project Authors (http://github.com/productiontype/Newsreader)
Source: https://github.com/productiontype/Newsreader

Files:

- `newsreader/Newsreader16pt-Regular.ttf`
- `newsreader/Newsreader16pt-Medium.ttf`

Newsreader carries an optical size axis and the repository ships one static cut of it. The cut is
`16pt`. Emi sets headlines from 20 to 48 points. The family also publishes a `6pt` cut, drawn for
captions, and a `72pt` cut, drawn for sizes well above where most of Emi's headlines sit, so the
middle cut is the one chosen. The two were not drawn side by side on a device. If the 16pt cut reads
heavy at 48 points, the replacement is the 72pt cut at the same two weights.

## Plus Jakarta Sans

Status: built

Every sentence and every label. The design system sets `body-lg`, `body-md`, `body-sm`, `label-md`
and `label-sm` in it.

Licence: SIL Open Font License, Version 1.1, in
`apps/mobile/assets/fonts/plus-jakarta-sans/OFL.txt`.
Copyright 2020 The Plus Jakarta Sans Project Authors (https://github.com/tokotype/PlusJakartaSans)
Source: https://github.com/tokotype/PlusJakartaSans

Files:

- `plus-jakarta-sans/PlusJakartaSans-Regular.ttf`
- `plus-jakarta-sans/PlusJakartaSans-SemiBold.ttf`

## JetBrains Mono

Status: built

Every number and every measurement. The design system sets `data-lg`, `data-md` and `data-sm` in it,
which carry a cycle day, a calendar grid, a temperature and a duration. A monospaced figure holds its
place as it changes, so a number does not move while she reads it.

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

None of the three licences reserves a font name. A licence that does declares it on its first line,
and the token package records it beside the family, so a family that arrives with a reservation is
held to it rather than trusted.

## Two weights for each face

Status: built

Each face ships two cuts and no others, and each cut answers a weight the design system's own roles
ask for. Newsreader ships 400 and 500, Plus Jakarta Sans ships 400 and 600, and JetBrains Mono ships
400 and 500. A third weight is bytes in the download that no role asks for.

Each file is a static instance rather than a variable font. A variable font registers as its default
instance on a phone, so a weight set in a style would draw the default one, and the mistake would be
invisible in every test. The token package names each file, and the test reads the name out of the
file itself.
