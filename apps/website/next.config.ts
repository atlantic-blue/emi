import type { NextConfig } from 'next';

/**
 * `standalone` is what OpenNext reads: it writes the server and the modules it needs into one
 * folder, which is the folder the Lambda function is built from. `poweredByHeader` would answer
 * every request with the name of the framework, which tells a reader of the headers one thing
 * about the site and her nothing at all.
 *
 * `@emi/tokens` ships TypeScript rather than a build, because every other workspace reads it that
 * way, so the site compiles it with its own pages.
 */
const config: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  transpilePackages: ['@emi/tokens'],
};

export default config;
