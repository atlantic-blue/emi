# The design of the website

These files are the approved design of myemi.app. The operator approved the boards on the design
canvas. A session cannot open that canvas, so the design is committed here, and every step that
builds the site builds it from these files.

One directory for each page: `home-v2/` is "Home, version 2", `protection/` is "How Emi protects
your data", `privacy-policy/` is "Privacy policy", `support/` is "Emi Support", and `sign-in/`
holds the page she signs in on and the account she lands on. Each one holds the same four things,
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

## The support page

`support/` holds the same shapes again: `boards/Support.dc.html` with its tablet and phone boards,
the same header and footer boards, `render/Support.html` with the faces it loads and the one
drawing it fetches, which is the mark in the band at the top, and `reference/Support-1280.png`,
`-834.png` and `-390.png`.

The board sets its two headings in Newsreader, from the same files `protection/` uses. It draws no
screenshot, so the page adds no file to the ones the edge serves.

### The three lines this page changed in the render program

`support/render-board.ts` is `protection/render-board.ts` with three lines changed.

The first line reads the `sc-if` band of a board. It keeps the band when the value is true and
drops it when the value is false. This board holds one such band, around the line that reads
"Nothing found", and the other three boards hold none. Without that line the program stops on the
hole inside the tag and writes nothing.

The second line reads the browser from `EMI_CHROME` when that name is set, the way
`share-preview/render.ts` reads it. The value behind it is the same Google Chrome of a Mac.

The third line copies the two Inter files from `home-v2/render/fonts/`. The other three programs
read those files from a directory beside themselves that nobody committed, so none of the three
runs from a fresh clone.

### Where the three pictures come from

A machine with no Chrome drew them, with the headless Chromium shell of Playwright, from the
markup beside them. The other three pages name a Mac here. This command wrote the markup and the
pictures into `render/`, and the three pictures were moved to `reference/` after it:

```
EMI_CHROME=<the browser> node --experimental-strip-types \
  docs/design/website/support/render-board.ts \
  "$PWD/docs/design/website/support/boards" \
  "$PWD/docs/design/website/support/render" Support 1280 834 390
```

Both paths must be whole. The program writes the address of the markup into the browser, and a
browser refuses a relative one. The mark in the band at the top is not copied by the program: it
is `render/assets/2f3b95d653826b5ca02acab62e8534de.svg`, taken from `protection/` byte for byte.

### Four parts of this board are not true today

The board is the design the operator approved and no character of it changed. These four parts of
it describe a product that does not exist yet, so the page built from it may not copy them as they
are.

1. The first question reads "I lost my phone. Can you restore my records?" and the answer reads
   "Only with your recovery code". Sync and restore are designed and are not built. Today a lost
   phone loses every day she recorded, unless she exported her data first.

2. The board writes to `hello@myemi.app`. The live site writes to `privacy@myemi.app`, which
   `apps/website/lib/addresses.ts` holds as `THE_PRIVACY_INBOX`. Neither address receives mail
   today. On 2026-11-04 `myemi.app` answered with no mail record and no text record.

3. The Subscription card and the words "your profile" point at `Profile.dc.html`, which is the
   account page. The site does not serve that page yet.

4. The Emi Community card and The beta card both point at `#`. The first address is
   `THE_EMI_COMMUNITY` in `apps/website/lib/addresses.ts`. The second is
   `https://testflight.apple.com/join/xFSv5Gqa`, which no file of this repository holds yet.

## The page she signs in on

`sign-in/` holds three boards rather than one, because a sign in is three screens and one of
them is a second state of the first. `boards/SignIn.dc.html` is the page she arrives on,
`boards/SignInCode.dc.html` is the same page after she has pressed "Send code", and
`boards/Profile.dc.html` is her account. The same header and footer boards sit beside them, and
`render/` holds each board as plain markup with the faces it loads and the mark in the band at
the top. `reference/` holds each of the three at 1280, 834 and 390 pixels wide.

The operator drew no tablet board and no phone board for this page. The other four directories
hold a board for each width, and those boards are preview frames around the one board rather than
a different drawing, so nothing of the design is missing here. The three widths are read from the
markup by the browser suite, the same way they are for the other four pages.

### What the page built from these boards does not copy

The board offers four ways in. Sign in with Apple, Google and Telegram each need a credential only
a person can make, and step 28.3 makes all three, so the page draws none of the three and none of
the divider above the form. Their words stay in all three catalogues, so each one comes back with
one edit. The mark each press carries is Apple own, Google own and Telegram own, and each company
states how its mark may be drawn, so the three marks arrive with the credentials rather than being
drawn from memory now.

The account board draws four sections under its head: the subscription, the ways she signs in, the
preferences and the data. Each one is a step of its own, so the page builds the head of that board
and nothing under it.

### Where the nine pictures come from

A machine with no Chrome drew them, with the headless Chromium shell of Playwright, from the
markup beside them. `sign-in/render-board.ts` is `support/render-board.ts` with nothing changed.
This command wrote the markup and the pictures into `render/`, once for each board, and the nine
pictures were moved to `reference/` after it:

```
EMI_CHROME=<the browser> node --experimental-strip-types \
  docs/design/website/sign-in/render-board.ts \
  "$PWD/docs/design/website/sign-in/boards" \
  "$PWD/docs/design/website/sign-in/render" SignIn 1280 834 390
```

Both paths must be whole. The program writes the address of the markup into the browser, and a
browser refuses a relative one. The mark in the band at the top is not copied by the program: it
is `render/assets/2f3b95d653826b5ca02acab62e8534de.svg`, taken from `support/` byte for byte.

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
