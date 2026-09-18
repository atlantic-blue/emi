# The onboarding illustration

Three pieces, drawn for the three screens of the first run, and the style they all follow. A piece
is two or three soft edged shapes in the phase colours, overlapping on the stone ground. It is never
a picture of a thing.

## Why the style is abstract

The design opens on one sentence: Emi is opened on a bus, at a desk, in a waiting room, with
somebody sitting beside her. The screen must tell her everything and tell that person nothing. A
drawing is read from further away than any word on the page, so a drawing of the subject is the
fastest way to lose the whole promise.

## The five refused subjects

The category draws all five. Emi draws none of them.

- A body. A torso or a belly on the screen names the subject to anybody standing behind her.
- A face. A face is read before anything else on a screen, and it reads as a mood she did not
  report.
- A flower. The category uses a flower as a stand in for the subject, which fools nobody.
- A droplet. A droplet is the clearest picture of the subject the category draws.
- Blood. The subject itself, drawn.

`refusals.ts` holds the five, each with the words that carry it. A test reads every drawing in this
directory, takes the file name and each line apart into words, and refuses a drawing that carries
one. A joined name is taken apart too, so `bloodDrop`, `blood-drop` and `blood_drop` all read as two
words. The generator runs the same check before it writes, so the refusal reaches the person drawing
and not only the pipeline.

Two words cost something and are refused anyway. `stem` is a plant part, so a shape may not be named
for one. `drop` is refused in every form, which also refuses the `feDropShadow` element. Nothing
here needs it: the soft edge is a blur.

The words are named in `refusals.ts` and in this file, and neither is a drawing, so the scan never
reads them.

## The rules a piece follows

- Two or three shapes. One shape is a symbol, and four is a pattern.
- The phase colours only: period, follicular, ovulation and luteal. Nothing is drawn in ember,
  because ember is the colour of a control she can press.
- Each shape is laid down between 20 and 30 percent. Below that it disappears on the ground. Above
  it, the colour states a phase she has not reached.
- The ground is stone, the colour of the application canvas.
- Every edge is soft, by a blur. There is no outline and no fill at full strength.
- The canvas is 320 by 220 points.

The shapes are organic because the outline swells and falls three times on one turn, and because the
outline is drawn as curves rather than as corners. Three swells give a rounded shape. Four give a
star, and a four pointed star in these colours reads as a petal, which is a flower.

## The three pieces

- `welcome.svg` is three colours crossing, so the whole cycle reads as one movement rather than four
  states.
- `last-period.svg` is one shape settling into a wider one, so a start reads as a moment inside
  something longer.
- `cycle-length.svg` is three shapes of one size at one spacing, so a length reads as a rhythm she
  can count.

## Adding one

Add it to `pieces.ts` and run the generator:

    node brand/illustration/generate.ts
    node brand/illustration/render.ts

The first writes the drawings. The second draws each one into the picture beside it, through a
headless browser, at 320 by 220. Set `EMI_BROWSER` to a Chromium or Chrome binary when it cannot
find yours.

## The trap

An svg file here is output. A hand edit is overwritten the next time somebody runs the generator,
and the test fails before that anyway: it compares every committed drawing against what the numbers
draw now. Change the numbers in `pieces.ts`.

The picture is the second trap. The pipeline does not draw one. It asks that every drawing has a
picture beside it, never that the picture is current, so run the renderer whenever the numbers
change.

The colour is the third rule. A generator reads the token package, and no hex value is written into
a source file here. The lint rule refuses one.
