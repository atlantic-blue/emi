# apps/website

`@emi/website` is the site on myemi.app. It is a Next.js application that uses the App Router. Its
pages render on an AWS Lambda function, and the files a browser asks for by name sit in a private
bucket beside it. Only the CloudFront distribution in front of the two may read either one.

`@opennextjs/aws` turns a Next.js build into those two things: the code of the server function, and
a folder of assets. `npm run build` compiles the pages. `npm run build:lambda` packages that build
into `.open-next/server-functions/default` and `.open-next/assets`. Neither directory is committed.

Next.js reports a build to its author unless the environment says otherwise, so every script that
starts Next.js or OpenNext sets `NEXT_TELEMETRY_DISABLED=1` in front of the command. That is part of
contract SITE-4, and a test in `test/` reads the manifest and fails on a script that forgets it.

## The commands

`npm run dev --workspace apps/website` serves the site on this machine while you work on it.

`npm run build --workspace apps/website` compiles the pages into `.next`.

`npm run build:lambda --workspace apps/website` packages that build for Lambda and for the bucket.

`npm test --workspace apps/website` runs the unit tests under `test/`, which render the components
with `react-dom/server` in node. The root `npm test` runs them too.

`npm run typecheck --workspace apps/website` reads the types. The root `npm run typecheck` reads
this workspace with the rest.

`npm run test:e2e` opens the site in a real browser. It builds the site, starts it on port 3100,
and reads it with Chromium at 1280 and at 390 points wide. The root `npm run test:e2e` runs the
same thing. It is not part of the root `npm test`, so the `check` job of the pipeline needs no
browser; a job of its own installs Chromium and runs it. Set `BASE_URL` to read another host
instead, and the suite starts no site of its own. The last command of the script refuses a run that
carried out no scenario, because a browser suite with nothing to do reports a pass that reads the
same as every other pass.

## Where the colours, the sizes and the faces come from

`tailwind.config.ts` is the theme, and it reads `packages/tokens`. Every colour, face, size, gap
and corner of the site comes from there, so `bg-accent` is the accent the phone draws and
`rounded-full` is the corner the design system names. The scale is closed: a class naming a value
Emi never chose draws nothing at all.

The theme is TypeScript rather than a block inside the stylesheet. The rule that refuses a colour
outside the token package is an eslint rule, and eslint reads TypeScript and not stylesheets, so a
palette written in `app/globals.css` would be a palette no gate measures. The stylesheet holds the
import, the two directories Tailwind reads, and the name of the theme. Nothing else.

`app/fonts.ts` serves the four Figtree cuts from `apps/mobile/assets/fonts`, the same files the
phone ships. No font service is named anywhere: a face fetched from another company tells that
company a woman opened a page about periods. The data face is JetBrains Mono at 268 kilobytes and
no page draws a figure yet, so it is not served yet.

`components.json` points `npx shadcn add` at that theme and that stylesheet. A component it adds
arrives with shadcn's own colour names, so point its classes at Emi tokens before committing it.

## What is here, and what arrives later

Today the site holds the document every page arrives in, the header and the footer, three
components under `components/ui`, and one page: the one behind an address the site does not have.

`public/emi-wordmark.svg` is the mark the header draws, and it is the file
`brand/logo/emi-wordmark.svg` generates. `npm run generate:logo` writes that file, so copy it
across after a redraw; `test/wordmark.test.ts` reads the two against each other and fails on the
day they differ.

`test/pictures` holds two captures of that page, at 1280 and at 390 points wide. They were taken
by hand, so read them as a record of one run and not as a gate. The suite under `e2e/` now reads
that page at the same two widths on every pull request: the gherkin is in `e2e/features`, the
steps that drive the browser are in `e2e/steps`, and `playwright.config.ts` declares the two
widths. `.features-gen` holds the Playwright tests generated from the gherkin and is not
committed.

The page carries no content width, because no token names one. The card runs the width of the
window at 1280 until the home page of step 13 brings a layout.

The home page, the three languages and the language switcher arrive in the steps after this one.
