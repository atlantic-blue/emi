# The Warm Humanist Editorial prototype, superseded

This is the style Emi was drawn in before 2026-09-23. The Warm Editorial Journal style replaced it,
and that one is in `docs/design/prototype/` with its document in
`docs/design/prototype-design-system.md`.

Nothing new is drawn from here. It stays in the repository for two steps only, because the
application still draws its whole theme from it:

- `packages/tokens` holds this palette, this type scale and these spacing steps, and
  `packages/tokens/tests/designSystem.test.ts` holds the two together value for value. The step that
  moves the tokens to the new front matter deletes `design-system.md`.
- `apps/mobile/tailwind.config.js` reads `today-dashboard.html` for the type roles, the corners and
  the spacing, and `apps/mobile/tests/theme/prototypeTheme.test.ts` holds it there. The dock also
  measures the room at the foot of a screen off these five screens, and the new prototype reserves
  no such room because it has no dock. The step that moves the components deletes this directory.

Until both of those land, deleting anything here turns the application's theme into an empty read,
which is why it was moved rather than removed.

## The five screens

`today-dashboard` is the home screen: the cycle ring, the day, the phase and the next few days.

`log-entry` is one day written down: the flow, how she feels, and a note.

`cycle-insights` is the history read back: how regular her cycles are, how long a period lasts, and
which symptoms repeat.

`partner-sharing` shows a partner a high level phase and nothing else. Version 1 does not build it.

`privacy-data-sovereignty` is the promise written as a screen.

## The pictures

`today-dashboard.png` and `partner-sharing.png` came out of the tool that made the prototype.

`log-entry.png`, `cycle-insights.png` and `privacy-data-sovereignty.png` are renders, not exports.
The tool gave back the text "<FIFE Image failed to fetch>" in place of those three, so each one was
drawn from its own markup in headless Chrome at a device scale of 2.

## The words on these screens

They are not approved copy and they never were. The numbers are invented for the drawing.
