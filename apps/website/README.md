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

## What is here, and what arrives later

Today the site holds the document every page arrives in and one page: the one behind an address the
site does not have. It says the page does not exist and offers the way back. It carries no style.

The components from shadcn, the theme drawn from `packages/tokens`, the fonts the site serves
itself, the home page and the three languages arrive in the steps after this one. No colour or face
is written here until they do.
