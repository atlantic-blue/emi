# @emi/mobile

The Expo application. Everything a woman sees is here, and so is everything Emi knows. The screens
are under `src/app`, which expo-router reads as the route list. The data layer is under `src/data`,
and the code that joins the two is under `src/features`.

## What is inside

`src/data/database.ts` declares the port: three methods, `execute`, `run` and `all`. Two adapters
implement it. `expoDatabase.ts` opens SQLite on the phone through expo-sqlite. The one under
`tests/data` opens the SQLite that ships with Node, so a test runs the application's own statements
against a real engine rather than against a double that agrees with them.

`schema.ts` applies the migrations in version order and reads `PRAGMA user_version`. Two are
shipped: the day log and the cycle cache. A shipped migration is never edited, because a phone has
already run it. Add a new one instead.

`dayLogRepository.ts` writes one day. It raises the revision on every write and refuses a second row
for the same day. `cycleRepository.ts` holds the cache, which is derived and never a source.

`src/features/cycle/rebuild.ts` is the write path: `logDay`, `editDay` and `deleteDay`. Each one
writes the day and then rebuilds the whole cache from the whole day log.

## How to run it

From the root of the repository:

    npm ci
    npm start --workspace apps/mobile

Press `i` for the iOS simulator. Press `w` for the browser.

    npm test --workspace apps/mobile

## The trap

Write a day through `rebuild.ts` and never through the repository directly. A day she edits can move
the start of the cycle it falls in, which moves the length of the cycle before it and of every cycle
after it, so there is no smaller correct rebuild. A write that skips this path leaves the ring
showing a cycle that no longer exists.

The second trap belongs to the tests. `render` from `@testing-library/react-native` version 14
returns a promise. A test that forgets to await it asserts on a screen that has not drawn yet, and
it passes for the wrong reason. Await every render.
