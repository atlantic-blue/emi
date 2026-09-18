# @emi/mobile

The Expo application. Everything a woman sees is here, and so is everything Emi knows. The routes
are under `src/app`, which expo-router reads as the route list, and each one is a thin file over a
screen in `src/features`. The data layer is under `src/data`.

## What is inside

`src/data/database.ts` declares the port: three methods, `execute`, `run` and `all`. Two adapters
implement it. `expoDatabase.ts` opens SQLite on the phone through expo-sqlite. The one under
`tests/data` opens the SQLite that ships with Node, so a test runs the application's own statements
against a real engine rather than against a double that agrees with them. `DatabaseProvider` opens
the database once and migrates it before any screen reads it.

`schema.ts` applies the migrations in version order and reads `PRAGMA user_version`. Three are
shipped: the day log, the cycle cache and the setting table. A shipped migration is never edited,
because a phone has already run it. Add a new one instead.

`dayLogRepository.ts` writes one day. It raises the revision on every write and refuses a second row
for the same day. `cycleRepository.ts` holds the cache, which is derived and never a source.
`settingRepository.ts` holds what she chose, one key to one value.

`src/services/vault` holds the key that encrypts every day she logs. `keychain.ts` declares the
port, two methods over expo-secure-store, and `vaultKey.ts` makes the key once and reads it back. A
second creation while one exists is refused, because every day she wrote is sealed under the first
key. `src/services/sync` holds the device key and the request signature, and it reaches the
keychain through the same port.

`src/features/onboarding` is the first run: what Emi is, when her last period started, how long her
cycle usually runs. `src/features/home` draws the home screen. `src/features/cycle/rebuild.ts` is
the write path: `logDay`, `editDay` and `deleteDay`.

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
