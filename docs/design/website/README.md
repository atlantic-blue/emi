# The design of the website

These files are the approved design of myemi.app. The operator approved the board "Home, version 2"
on the design canvas. A session cannot open that canvas, so the design is committed here, and every
step that builds the site builds it from these files.

## What is here

`home-v2/boards/` holds the canvas sources: `MainV2.dc.html` is the home page, `Header.dc.html` is
the band at the top, and `Footer.dc.html` is the band at the bottom. The board imports the other
two, and each one leaves a hole for a value it does not own.

`home-v2/render/MainV2.html` is that board as plain markup, with every hole filled and the two
imports inlined. `home-v2/render/render.ts` is the program that wrote it. The five faces it loads
are in `home-v2/render/fonts/`, and the two pictures it draws are in `home-v2/render/assets/`. Open
the markup in a browser and you see the page the operator approved.

`home-v2/reference/MainV2-1280.png` and `home-v2/reference/MainV2-390.png` are that markup in
Chrome, at the width of a desktop and at the width of a phone.

## How the design changes

The canvas is where the design changes. Nobody edits these files by hand. A change to the design
arrives as a pull request that replaces them: the operator draws it on the canvas, renders it
again, and the new board, the new markup and the new pictures land here together.

So the files are committed as the tool wrote them, byte for byte. The formatter and the linter skip
this directory, because a line either tool moved would make this markup a different page from the
one in the pictures, and the home page is held to the pictures.

## The licence of the faces

The five font files in `home-v2/render/fonts/` are Newsreader, Plus Jakarta Sans and JetBrains
Mono. Each one is published under the SIL Open Font License, version 1.1, and is redistributed here
unmodified. `docs/licences.md` names the faces the application ships, which are a different set.
