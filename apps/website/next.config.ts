import type { NextConfig } from 'next';

/**
 * `standalone` is what OpenNext reads: it writes the server and the modules it needs into one
 * folder, which is the folder the Lambda function is built from. `poweredByHeader` would answer
 * every request with the name of the framework, which tells a reader of the headers one thing
 * about the site and her nothing at all.
 *
 * `trailingSlash` is the address contract SITE-3 writes: `/en/`, `/ru/` and `/es/` each serve a
 * page, and the redirect at the edge sends the root to `/en/`. Without it Next.js answers every one
 * of those with a 308 to the address without the slash, so the page the contract names is a
 * redirect and the live check of the deploy reads it as one.
 *
 * `@emi/tokens` ships TypeScript rather than a build, because every other workspace reads it that
 * way, so the site compiles it with its own pages.
 */
const config: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  trailingSlash: true,
  transpilePackages: ['@emi/tokens'],
};

export default config;
