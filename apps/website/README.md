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

Two palettes reach the theme. `colour` is the phone's, and `websiteColour` in
`packages/tokens/src/website.ts` is the site's own, from the board the operator approved in
`docs/design/website/home-v2/`. They are two surfaces painted in different values. Every name of
the site's own palette starts with `site`, because Tailwind carries one flat namespace and would
otherwise answer `bg-ground` with whichever of the two was written last.

`phone:` is the one breakpoint the board adds, at `websitePhoneWidth`. At that width and narrower
the six links in the band at the top are not drawn and the menu button is.

The theme is TypeScript rather than a block inside the stylesheet. The rule that refuses a colour
outside the token package is an eslint rule, and eslint reads TypeScript and not stylesheets, so a
palette written in `app/globals.css` would be a palette no gate measures. The stylesheet holds the
import, the two directories Tailwind reads, and the name of the theme. Nothing else.

`app/fonts.ts` serves three families from `assets/fonts`: Newsreader for a heading, Plus Jakarta
Sans for text and JetBrains Mono for a small label. They are the five files the approved board
names in its own styles, copied from `docs/design/website/home-v2/render/fonts/`, so a page
measures the same as the design it was drawn from. Each one is published under the SIL Open Font
License, version 1.1, which `docs/design/website/README.md` records. No font service is named
anywhere: a face fetched from another company tells that company a woman opened a page about
periods.

The phone draws in Figtree and keeps its own files. The two surfaces share no face.

`components.json` points `npx shadcn add` at that theme and that stylesheet. A component it adds
arrives with shadcn's own colour names, so point its classes at Emi tokens before committing it.

## The language in the address

Every page sits under a language: `/en/`, `/ru/` and `/es/`. That is contract SITE-3, and it is
why the root layout is `app/[lang]/layout.tsx` and not `app/layout.tsx`. Next.js sets the `lang`
attribute of the html element in a layout, and a layout above the segment cannot read which
language the address asked for.

`app/words` holds the words, one file per language, the way `apps/mobile/src/language` holds the
words of the application. A sentence that already exists there is copied from there rather than
written again: the price line is the application's own, and `test/words.test.ts` reads the two
against each other so they cannot drift. The band at the foot opens with an approved denial of
`tools/pipeline/forbiddenClaims.ts`, word for word, and the same test reads it against the gate's
own list. It is also the board's own sentence, so the gate and the design agree and neither has to
be bent for the other.

`next.config.ts` sets `trailingSlash`, because the contract and the redirect at the edge both name
`/en/` with the slash. Without it Next.js answers that address with a redirect.

An address naming a language the site does not serve answers 404 with the Emi page, and so does any
deeper address: `app/[lang]/[...rest]` matches what no other route does and answers the same way.
Next.js has its own page for an address outside every language, and that page carries none of Emi,
which is what that route exists to prevent.

## What is here, and what arrives later

Today the site holds the document every page arrives in, the band at the top and the band at the
foot from the approved board, three components under `components/ui`, the home page in three
languages, and the page behind an address the site does not have. The body of the home page is
still the earlier draft; the board's own page arrives in step 20.

`public/emi-icon.svg` is the mark the band at the top asks for. It is the icon the community chose
in issue 331, byte for byte the file `apps/mobile/assets/icon/emi-icon.svg` ships to the phone and
the file the approved board draws. The scenario in
`features/website/26.19-the-approved-faces-the-header-and-the-footer.feature` reads all three
against each other, so the drawing at the top of a page cannot drift from the drawing on her home
screen.

`test/pictures` holds four captures, of the home page and of the page behind an address the site
does not have, each at 1280 and at 390 points wide. They were taken by hand from the built site,
so read them as a record of one run and not as a gate. The suite under `e2e/` reads both pages at
the same two widths on every pull request: the gherkin is in `e2e/features`, the steps that drive
the browser are in `e2e/steps`, and `playwright.config.ts` declares the two widths.
`.features-gen` holds the Playwright tests generated from the gherkin and is not committed.

The home page is the one place with a content width, and the two measures are Tailwind's own
rather than tokens, because `packages/tokens` names no page width.
