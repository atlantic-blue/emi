# @emi/ui

The chrome. Every screen in Emi draws its boxes, its words and its controls from this package, so
the product has one Box, one Text, one Pressable and one dock rather than a look invented again on
each screen.

## What is in here

`src/gluestack/` holds the components copied in from gluestack-ui version 5. They are copies on
purpose: gluestack is a copy in library, so the source lives here and is read like any other file
in this repository rather than resolved out of `node_modules`. Run
`npx gluestack-ui@latest add <component>` to fetch another one, then move it under `src/gluestack/`
and export it from `src/index.ts`.

`src/BottomNavigation.tsx` is the dock at the bottom of the screen. It knows nothing about routing
and nothing about language: it is handed the tabs, told which one she is on, and calls back when
she picks another. The one list of tabs lives in `apps/mobile/src/features/chrome/tabs.ts`, beside
the screens it names, because the labels come from the catalogue the application reads.

`src/Icon.tsx` draws one symbol from the closed set in `@emi/tokens`.

## How it is styled

NativeWind, which is Tailwind for React Native. A component carries the same class names the
prototype's markup carries, and `apps/mobile/tailwind.config.js` turns them into the prototype's
own points and colours. The colours in that configuration are read from `@emi/tokens`, so the
palette has one home.

Nothing here builds a theme of its own, and nothing here holds a hex code.
