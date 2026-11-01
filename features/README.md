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
contracts of myemi.app and the grants the pipeline needs before it can build the site.
`npm run check:features` reads this directory one level deep, so a scenario in a subdirectory names
no contract and maps to no feature.

The tier runs as two projects of one runner. Every scenario outside `website/` runs under the
preset of the phone, which is the runtime a screen of Emi has. The scenarios in `website/` run in
node with the transforms `apps/website` uses, because Next.js draws those pages on a server: there
is no window, no document and nothing of a phone behind a page a woman reads on myemi.app. A page
drawn beside a browser global the server does not have proves nothing about what reaches her.

So a scenario of the site may render a page with `react-dom/server` and read the words she gets.
`npm run test:behaviour` runs both projects, and `--selectProjects behaviour` or
`--selectProjects "behaviour website"` runs one of them.

`docs/features.md` names the website as feature 9, and these scenarios stay here until the site
exists. A numbered feature file must hold a scenario for each contract of its feature, and no
`SITE` contract can pass before the certificate, the bucket, the distribution and the pages are
built. Each one moves into `features/9-the-website-on-myemi-app.feature` as that work lands.
