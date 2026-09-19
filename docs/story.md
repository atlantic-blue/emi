# The story of Emi

Emi is a period and cycle tracker. This document shows what it looks like. It follows one woman
through the product, one feature at a time, and it puts a picture under each thing she does.

`features.md` names the eight features. `contracts.md` says what each part must do. Neither one
shows anybody a screen, so a person who wants to know what Emi looks like has to run it. This is the
document that answers that instead.

## How to read it

A section tells one feature. The sections are in the order `features.md` gives.

A beat is a sentence and a picture. The sentence says what she does. The picture shows the screen
she does it on.

No picture here was captured from a phone, and none is a mockup. Every one comes from the code, in
one of two ways, and the line under each picture says which way and names the command that makes it
again.

A picture of a screen is rendered under the test runner. The runner mounts the screen the
application ships, reads the tree it produced, and draws that tree in a browser. A picture of a
drawing, which is everything in feature 1, is written by a generator of its own from the numbers in
the token package.

Three things a rendered screen does not carry. A browser lays a screen out in rows where a phone
lays it out in columns, which the renderer restores by hand, so a control can sit a little higher up
the frame than it does on a phone. The first run names the monospaced face, which no screen loads
yet, so it falls back here and on a phone alike. And a screen that names no face at all takes the
browser's own where a phone takes the system one.

Two features have a section today. The pipeline runs `npm run check:story`, which names every
feature with no section, names every picture in `brand/screens` that no section shows, and fails
when the story names a picture that is not there or when the line under a picture does not say how
it was made. A later step turns the first of those into a failure as well. Feature 7 is not built
yet, so there is nothing of it to show.

## Feature 1: The brand exists

She sees the mark before she sees a screen: on the home screen of her phone, in the store, and on
the first screen of the first run. This feature is everything that is drawn rather than written.
Every number in it is measured and not chosen by eye, and the whole of it sits on one sheet.

The pictures in this section are made differently from the rest of the story. Each one is written by
a generator of its own rather than under the test runner, so the line under each names the command
that writes it again.

She reads the name first. The mark is `emi` in lowercase Fraunces, and the dot of the `i` is a ring
with a gap of 40 degrees opening at the upper left, which is the same open ring her cycle is drawn
on.

![The wordmark, with the open ring in place of the dot of the i](../brand/logo/emi-lockup.svg)

Drawn by its own generator, rather than under the test runner. `npm run generate:logo` writes this
file from the numbers in `brand/logo/geometry.ts`, and a test redraws it and refuses a file edited by
hand.

On the home screen of her phone the mark is the ring alone, at 56 percent of the width and sitting a
little above the middle so it reads as centred. One program writes all 24 files the two stores ask
for from that one drawing.

![The application icon, drawn at 1024 points](../apps/mobile/assets/icon/apple-1024.png)

Drawn by its own generator, rather than under the test runner. `npm run generate:app-icon` writes
every size from `brand/logo/emi-ring.svg`, and a test refuses a size a store asks for and nobody
wrote.

She can read every word on every ground, because the palette is measured rather than chosen.
Eighteen colours, each text colour carrying the ground it sits on and the ratio it was measured at,
and a pair below 4.5 to 1 fails the build. Text never sits on a phase fill: each phase colour has a
darker ink partner that carries the words.

![The brand sheet: the mark, the measured palette, the type scale, the ring, the icons and the illustrations](../brand/sheet/brand-sheet.png)

Drawn by its own generator, rather than under the test runner. `npm run generate:sheet` writes the
page from `packages/tokens`, and `npm run check:sheet` fails when the committed page and the tokens
disagree by one character.

She reads Emi in three faces. Fraunces carries the headings and the wordmark, Plus Jakarta Sans
carries what she reads at length, and IBM Plex Mono carries a number, a unit or a label. Six sizes,
each with the line height the token package fixes, and every sentence on the page is one Emi writes.

![The type specimen: three faces at six sizes, in two weights](../brand/specimen/specimen.png)

Drawn by its own generator, rather than under the test runner. `npm run generate:specimen` reads the
type scale and the font files from `packages/tokens`, so the page cannot name a size the application
does not have.

The ring carries the meaning, so the words do not have to. Each arc is sized by the days of that
phase, three degrees of ground sit at every boundary, the days she has had are solid where the days
ahead are at a fifth, and the ember bead is today. Feature 2 draws it from her own cycle.

![The ring at a short cycle of 21 days, a usual one of 28 and a long one of 45](../brand/ring/cycle-ring.png)

Drawn by its own generator, rather than under the test runner. `npm run generate:ring-picture` draws
it from the geometry in `packages/tokens/src/ring.ts`, which is the arithmetic the screen draws
with.

Every symbol she presses comes from one set. Twenty drawings, one weight, on a 24 point grid and
shown at it. Each one leaves its colour as `currentColor`, so the screen that uses it decides the
colour and nobody writes a value into the drawing.

![The icon set: twenty line symbols on the contact sheet](../brand/icons/contact-sheet.png)

Drawn by its own generator, rather than under the test runner. Run
`node --experimental-strip-types brand/icons/generate.ts`, which reads the directory and writes the
token module that names them.

An illustration is two or three soft shapes in the phase colours, and never a picture of a thing.
The style refuses a body, a face, a flower, a droplet and blood, because a stranger at arm's length
must learn nothing from her screen, and a test reads every drawing and every file name for those
five subjects.

![One of the three illustration pieces: soft shapes in the phase colours](../brand/illustration/welcome.png)

Drawn by its own generator, rather than under the test runner. Run
`node --experimental-strip-types brand/illustration/render.ts`, which draws each piece into the
picture beside it.

## Feature 2: She opens Emi and logs her first period

She installs Emi and opens it. Three screens ask her two things, and then she is on her own ring
with her own period on it. Nothing leaves the phone, and she is never asked who she is.

She opens Emi for the first time and it asks her nothing about herself. It says what Emi does, what
it never does, and the two things it refuses to be.

![The welcome screen, step one of three](../brand/screens/welcome.png)

Rendered under the test runner at 390 by 844 points, and not captured from a phone. Draw it again
with `npm run generate:welcome-picture`.

It asks when her last period started, and it opens on the month she is in. Today and yesterday sit
above the calendar, because those are the two answers she gives most. A day she has not lived is
drawn faint and takes no press.

![The month calendar, with a day five back chosen](../brand/screens/last-period.png)

Rendered under the test runner at 390 by 844 points, and not captured from a phone. Draw it again
with `npm run generate:last-period-picture`.

It asks how long her cycle runs. The number starts at 28 days, and one press moves it by one day,
between 21 and 45. Emi corrects this itself once it has seen two cycles of her own, and the screen
says so.

![The cycle length screen at 28, 31 and 21 days](../brand/screens/cycle-length.png)

Rendered under the test runner at 390 by 844 points, and not captured from a phone. Draw it again
with `npm run generate:cycle-length-picture`.

Her answers make the ring, and the ring is the product. It carries the day of her cycle and the
phase she is in, so she can read it across a room and nobody beside her can. It draws what her own
records support and no more: with one cycle recorded Emi says it is still learning, and it gives a
range with a confidence only once it has two.

![The home screen at six recorded histories](../brand/screens/home-screen.png)

Rendered under the test runner at 390 by 844 points, and not captured from a phone. Draw it again
with `npm run generate:home-picture`.

Her week sits above the ring. Seven columns end on today. Each column says which day of her cycle
it was. A day she bled is filled and carries the day of her period. A day her next period can start
on has a dotted outline. She presses a column to open that day and correct it.

![The week above the ring, on six recorded histories](../brand/screens/home-screen.png)

Rendered under the test runner at 390 by 844 points, and not captured from a phone. Draw it again
with `npm run generate:home-picture`.

She bleeds, so she logs the day. She presses one of five flow values and the ring redraws around
her. A day she marks as not her period is kept and never starts a cycle.

![The flow screen, before and after she picks](../brand/screens/log-flow.png)

Rendered under the test runner at 390 by 844 points, and not captured from a phone. Draw it again
with `npm run generate:flow-picture`.

She forgot a day of that period, and it is now several days later. She opens that day at its own
address and corrects it. The ring beside the picker stays on today, because what a corrected day
changes is where she stands now. A day she has not lived is refused by the write and not only by the
screen.

![A past day, corrected, and a future day refused](../brand/screens/past-day.png)

Rendered under the test runner at 390 by 844 points, and not captured from a phone. Draw it again
with `npm run generate:past-day-picture`.
