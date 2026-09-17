# The licences of everything Emi redistributes

Emi itself is MIT. Read `LICENCE`. This file covers the third party files that ship inside the
application, which is the font binaries in `apps/mobile/assets/fonts`.

The repository is public and the fonts travel inside the application, so each family needs its
licence next to it and a reader needs one page that says what those licences are. A test in
`packages/tokens/tests/fonts.test.ts` reads this page and the tree, and fails when the two
disagree.

Every font here is redistributed unmodified. Nothing is subset, renamed or re-hinted.

## Fraunces 72pt Soft

Headings and the wordmark.

Licence: SIL Open Font License, Version 1.1, in `apps/mobile/assets/fonts/fraunces/OFL.txt`.
Copyright 2018 The Fraunces Project Authors (https://github.com/undercasetype/Fraunces)
Source: https://github.com/undercasetype/Fraunces

Files:

- `fraunces/Fraunces72ptSoft-Regular.ttf`
- `fraunces/Fraunces72ptSoft-SemiBold.ttf`

Fraunces has an optical size axis and a softness axis, and the repository ships one static cut of
it. The cut is `72pt Soft`. Emi sets headings from 20 to 34 points, which is the middle of that
axis, and the soft cut is the warmth the design asks for. The three cuts were rendered side by side
at 20 and at 34 points before the choice: the 9pt cut is sturdier and wider, the 144pt cut is too
delicate at 20 points. If the 72pt cut reads thin on a device, the replacement is the 9pt cut at the
same two weights.

## Plus Jakarta Sans

The interface and running text.

Licence: SIL Open Font License, Version 1.1, in
`apps/mobile/assets/fonts/plus-jakarta-sans/OFL.txt`.
Copyright 2020 The Plus Jakarta Sans Project Authors (https://github.com/tokotype/PlusJakartaSans)
Source: https://github.com/tokotype/PlusJakartaSans

Files:

- `plus-jakarta-sans/PlusJakartaSans-Regular.ttf`
- `plus-jakarta-sans/PlusJakartaSans-SemiBold.ttf`

## IBM Plex Mono

Numbers, units and labels.

Licence: SIL Open Font License, Version 1.1, in `apps/mobile/assets/fonts/ibm-plex-mono/OFL.txt`.
Copyright © 2017 IBM Corp. with Reserved Font Name "Plex"
Source: https://github.com/google/fonts/tree/main/ofl/ibmplexmono

Files:

- `ibm-plex-mono/IBMPlexMono-Regular.ttf`
- `ibm-plex-mono/IBMPlexMono-SemiBold.ttf`

This licence reserves the name `Plex`. A modified version of these files may be distributed, and it
may not carry that name. Emi modifies nothing, so the name stays.

## What the Open Font License asks of Emi

The licence text travels with the files, which is why `OFL.txt` sits in each family's own
directory rather than once at the root. The fonts may be bundled in the application and sold with
it. They may not be sold on their own. Attribution sits on this page.

## Two weights for each face

Each face ships regular and semi bold, and no other weight. Running text needs one weight and
emphasis needs a second. A third weight is bytes in the download that no screen in version 1 asks
for.

Each file is a static instance rather than a variable font. A variable font registers as its
default instance on a phone, so a semi bold set in a style would draw the regular one and the
mistake would be invisible in every test.
