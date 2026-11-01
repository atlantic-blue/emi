import type { NextConfig } from 'next';

/**
 * `standalone` is what OpenNext reads: it writes the server and the modules it needs into one
 * folder, which is the folder the Lambda function is built from. `poweredByHeader` would answer
 * every request with the name of the framework, which tells a reader of the headers one thing
 * about the site and her nothing at all.
 *
 * `@emi/tokens` ships TypeScript rather than a build, because every other workspace reads it that
 * way, so the site compiles it with its own pages.
 *
 * `trailingSlash` keeps the slash the site hands out. Every address of Emi ends in one: the
 * function at the edge sends the bare root to `/en/`, and `/ru/` and `/es/` are what the language
 * switcher points at and what a store listing carries. Without this, the framework answers each of
 * them with a 308 to the form without the slash, so the address a woman follows is never the
 * address that answers her.
 */
const config: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  trailingSlash: true,
  transpilePackages: ['@emi/tokens'],
};

export default config;
