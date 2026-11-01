# apps/website

`@emi/website` is the site on myemi.app. It is static files: pages of hypertext markup written by a
TypeScript program on the machine that builds them, and uploaded to a storage bucket that only the
distribution in front of it may read.

There is no site framework and no generator here. Each page is a React component in a `.tsx` file
under `src/`, written with JSX. `build.ts` draws the component, turns it into markup, and writes the
file. Nothing in the output runs in a browser, because a page that needs no interaction needs no
script. That is contract SITE-4: no cookie, no request to a third party, and no script that counts
her visit.

Node strips the types out of a `.ts` file on its own and refuses a `.tsx` file, because it does not
read JSX. So `jsxLoader.ts` registers a module hook that compiles every `.tsx` file through babel,
with the same preset and the same automatic runtime the test runners use. The build asks for it with
`--import`, which runs it before the entry point. There is no bundler and no build output to keep.

## The commands

`npm run build --workspace apps/website` writes into `apps/website/dist`. Give it a directory to
write somewhere else, which is what the tests do.

`npm test --workspace apps/website` runs the unit tests under `test/`. The root `npm test` runs
them too.

`npm run typecheck --workspace apps/website` reads the types. The root `npm run typecheck` reads
this workspace with the rest.

## What is here, and what arrives later

Today the site holds one page, the one behind an address the site does not have. It says the page
does not exist and links to the home page. It carries no style.

The components, the theme drawn from `packages/tokens`, the home page and the three languages
arrive in the steps after this one.
