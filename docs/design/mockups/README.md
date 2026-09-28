# The approved mockups

`flows.json` is the mockups stage, as the stage delivered it on 2026-09-28. It holds 52 screens
under `screens` and 13 stories under `stories`. Nobody edits it by hand. A drawing that changes
comes back from the stage as a new file.

Each screen is keyed by a short name such as `todayNext`, and carries:

- `html`, the drawing as markup
- `route`, the address the built screen answers on
- `status`, which is `built` or `proposed`
- `surface`, which is `mobile` for every screen today
- `source`, the file the drawing was taken from or the file it replaces
- `notes`, what the stage wanted a builder to know

The file is committed as the stage wrote it, with the repository formatter run over it. The
formatter moves no data: it puts a single item array on one line and changes nothing else.

## What reads it

`tools/pipeline/mockups.ts` reads the file and turns one screen's markup into the ordered list of
parts it names, which is what the `data-component` attributes carry.

`apps/mobile/tests/fixtures/theMockupScreen.ts` holds a rendered screen against one of those lists.
It reads the parts and their order and never the words. The words come from the catalogue in three
languages, and the stage says the wording is not its to settle, so a comparison of text would hold
the product to a draft.

A drawing names a part by its component name and a built screen answers by a test identifier, so
the fixture carries the record that joins the two. A part the record does not carry fails the
comparison and the failure names it. That is how a screen nobody has built yet goes red instead of
quietly passing.

## The wrapper rule

A part is named where the press is. The dock is drawn as a bar named `BottomNavigation` holding
four columns each named `BottomNavigation`, and the two round actions under the ring the same way.
The reader drops a wrapper that repeats the name of the part inside it, so the home screen asks a
built screen for four dock columns rather than for five docks.

## The check

    npm run check:mockups

It fails on four things. A stage that holds fewer than the 52 screens it delivered. A screen key a
test names and the stage does not hold. A screen whose drawing names no part. A run where no test
named a screen at all, because a run that read nothing reports success just the same.

It also refuses a call that builds its key at run time. The check finds the screens a test names by
reading the key written at the call, so a key assembled from a variable is a key nothing can check.
Write the key out.
