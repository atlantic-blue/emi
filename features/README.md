# features

This directory holds the behaviour tier. One file for each feature of Emi, named for the feature
and numbered as `docs/features.md` numbers it, written as scenarios somebody can read without
opening a line of code.

Each scenario opens with the contract it proves, so a reader moves from the map in
`docs/features.md` to the scenario that proves a contract without asking anybody. A contract names
every error it must produce, and a scenario that covers only the happy path has covered half of it,
so the errors get scenarios of their own.

The steps beside each feature file drive the real screens and the real data layer, the way the
integration tests under `apps/mobile/tests/integration` do, and they read what she is left looking
at rather than the call the code made.

Run the tier with `npm run test:behaviour`. Read what it covers with `npm run check:features`,
which reports every feature with no file yet, and fails on a contract that a covered feature
leaves without a scenario.

A subdirectory holds a scenario that proves something other than a screen. `website/` holds the
grants the pipeline needs before it can build myemi.app. `npm run check:features` reads this
directory one level deep, so a scenario in a subdirectory names no contract and maps to no feature.
Each one moves into a numbered feature file as soon as `docs/features.md` names its feature.
