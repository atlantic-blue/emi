# @emi/tokens

Every colour, size, space, radius and stroke Emi draws with. The package holds the measured values
from the design, and the two functions that measure them. Nothing here imports the application, so
a test can read a token without starting a screen.

## What it exports

`colours` holds the eighteen tokens. Each one carries its value, the roles it may take (`ground`,
`text`, `fill` or `line`) and `textOn`, the list of grounds it is approved to carry text on. A text
token with an empty `textOn` is a token nobody measured. `colour` is the same set flattened to the
value alone, for a screen that wants the string.

`relativeLuminance` and `contrastRatio` do the arithmetic. `CONTRAST_FLOOR` is 4.5, which is level
AA of the Web Content Accessibility Guidelines for normal text.

`typeScale` holds the six sizes with their line heights and their face. `face` names the three
faces. `LINE_HEIGHT_FLOOR` is 1.2 and the display size ships at 34 over 41 to clear it.

`space`, `radius`, `stroke` and `MINIMUM_TAP_TARGET` hold the layout values. The tap target is 44
points on both axes.

## How to run its tests

From the root of the repository:

    npm run test:workspace

To run this package alone:

    npx jest --config jest.node.config.js packages/tokens

## The trap

A colour is never written by hand. A hex value outside this package fails the lint rule. It also
fails `tools/pipeline/colourLeak.test.ts`, which reads every tracked source and configuration file.
Add the colour here, give it a role, and name the grounds it is measured on.

The measurement is the reason for the `textOn` list. `muted` reaches 4.43 on `sunk` and 4.36 on
`emberTint`, so those two grounds are absent from its list and the contrast test refuses to approve
the pair. A phase fill carries no text at all. Its ink partner does.
