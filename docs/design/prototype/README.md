# The prototype

The markup here is the source of truth for what Emi looks like. `docs/design/prototype-design-system.md`
is written from it, `packages/tokens` is written from that document, and every screen reads the
tokens. So a value that moves here moves everything, and a value that moves anywhere else has left
the prototype behind.

Each screen carries the configuration it draws with, in a script element with the id
`tailwind-config`. All five carry the same one. `tools/pipeline/prototype.test.ts` reads it out of
`today-dashboard.html` and compares it with the front matter of the design system document, value
for value: the colours, the corners, the spacing and the eleven type roles with their sizes, line
heights, tracking and weights. The corners do not agree yet, and the decision is
https://github.com/atlantic-blue/emi/issues/159.

## The five screens

`today-dashboard` is the first screen she sees. It carries the cycle ring, the day she is on, the
phase she is in and the next few days.

`log-entry` is one day, written down: the flow, how she feels, and a note. It is the screen she
uses most.

`cycle-insights` is the history read back to her: how regular her cycles are, how long a period
lasts, and which symptoms repeat.

`partner-sharing` shows a partner a high level phase and nothing else. Version 1 does not build it.
The screen is here because the design system was drawn from all five.

`privacy-data-sovereignty` is the promise, written as a screen: what stays on the phone, what the
server holds, and the one action that deletes everything.

## The pictures

`today-dashboard.png` and `partner-sharing.png` came out of the tool that made the prototype.

`log-entry.png`, `cycle-insights.png` and `privacy-data-sovereignty.png` are renders, not exports.
The tool gave back the text "<FIFE Image failed to fetch>" in place of those three, so each one was
drawn from its own markup in headless Chrome at a device scale of 2. Read them as a browser's
reading of the markup beside them, and read the other two as the tool's own.

## What the check does not hold

The check reads the configuration and nothing else. The words on these screens are not approved
copy, the numbers are invented for the drawing, and several pieces are not in version 1. Read the
markup for the shape, the spacing and the colour, and read `.krewe/design.md` for what Emi builds.
