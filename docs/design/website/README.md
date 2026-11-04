# The design of the website

These files are the approved design of myemi.app. The operator approved the boards on the design
canvas. A session cannot open that canvas, so the design is committed here, and every step that
builds the site builds it from these files.

One directory for each page: `home-v2/` is "Home, version 2", `protection/` is "How Emi protects
your data", and `privacy-policy/` is "Privacy policy". Each one holds the same four things,
described below for the home page.

## What is here

`home-v2/boards/` holds the canvas sources: `MainV2.dc.html` is the home page, `Header.dc.html` is
the band at the top, and `Footer.dc.html` is the band at the bottom. The board imports the other
two, and each one leaves a hole for a value it does not own. `MainV2.tablet.dc.html` and
`MainV2.phone.dc.html` are the same board at the two narrower widths, and `boards/ds/emi/` holds
the tokens and the faces the canvas itself reads.

`home-v2/render/MainV2.html` is that board as plain markup, with every hole filled and the two
imports inlined. `home-v2/render-board.ts` is the program that wrote it. The seven faces it loads
are in `home-v2/render/fonts/`, and the two pictures it draws are in `home-v2/render/assets/`. Open
the markup in a browser and you see the page the operator approved.

`home-v2/reference/MainV2-1280.png`, `-834.png` and `-390.png` are that markup in Chrome, at the
width of a desktop, a tablet and a phone. Those three were taken on a Mac, where a heading is drawn
in Apple's own interface face, so they are taller or shorter than the same markup on Linux. The
comparison the pipeline runs never reads them: it draws the markup and the page in one browser on
one machine, which is the only way two pictures can be held against each other.

## The page that explains the encryption

`protection/` holds the same shapes under its own names: `boards/Protection.dc.html` with its
tablet and phone boards, the same header and footer boards, `render/Protection.html` with the
faces and the one screenshot it draws, and `reference/Protection-1280.png`, `-834.png` and
`-390.png`.

This board sets its four headings in Newsreader. The site serves that family for this page alone,
from `protection/render/fonts/`, byte for byte, and no other page names it in a class. The
screenshot it draws is served as `apps/website/public/the-privacy-screen.png`, also byte for byte.

## The privacy policy

`privacy-policy/` holds the same shapes again: `boards/Privacy.dc.html` with its tablet and phone
boards, the same header and footer boards, `render/Privacy.html` with the faces it loads and the
one drawing it fetches, which is the mark in the band at the top, and
`reference/Privacy-1280.png`, `-834.png` and `-390.png`.

This board sets its heading, the line under it and its eight section headings in Newsreader, from
the same files `protection/` uses. It draws no screenshot, so the page adds no file to the ones
the edge serves.

The date at the top is the one hole this board keeps. It reads `LAST UPDATED [DATE]` on the canvas
and on the page, because nobody set a date for the policy, and a page showing a date it was never
given would be the first sentence on it that is not true. Setting the date is an edit to the board
and to the three catalogues of words together.

## How the design changes

The canvas is where the design changes. Nobody edits these files by hand. A change to the design
arrives as a pull request that replaces them: the operator draws it on the canvas, renders it
again, and the new board, the new markup and the new pictures land here together.

So the files are committed as the tool wrote them, byte for byte. The formatter and the linter skip
this directory, because a line either tool moved would make this markup a different page from the
one in the pictures, and the home page is held to the pictures.

## The licence of the faces

The seven font files in `home-v2/render/fonts/` are Inter, Newsreader, Plus Jakarta Sans and
JetBrains Mono. Each one is published under the SIL Open Font License, version 1.1, and is
redistributed here unmodified. `docs/licences.md` names the faces the application ships, which are
a different set.

The board asks for a heading in Apple's own interface face first and in Inter behind it. No licence
lets Emi ship Apple's face, so the site serves the two Inter files and asks for Apple's by name.
The two Inter files the site serves are copied from `home-v2/render/fonts/`, byte for byte, because
another release of the same family measures differently and the page is held to this markup.
