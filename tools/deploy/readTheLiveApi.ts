import { resolve } from 'node:path';

import { type Answered, type AnsweredThePreflight, readTheLiveApi } from './liveApi.ts';
import { readTheRoutes } from './routes.ts';

/** The pipeline command. It reads the real api at the address the deploy was given. */

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const given = process.argv.slice(2).find((argument) => !argument.startsWith('--'));

async function ask(address: string, method: string, body: string | undefined): Promise<Answered> {
  const answered = await fetch(address, { method, body });

  return { status: answered.status };
}

/**
 * The preflight, sent the way a browser sends one. The two request headers are what makes a request
 * a preflight: without them the api answers no allowed origin and this read would refuse a deploy
 * of an api that is right.
 */
async function askThePreflight(
  address: string,
  origin: string,
  method: string,
  header: string,
): Promise<AnsweredThePreflight> {
  const answered = await fetch(address, {
    method: 'OPTIONS',
    headers: {
      origin,
      'access-control-request-method': method,
      'access-control-request-headers': header,
    },
  });

  return {
    allowOrigin: answered.headers.get('access-control-allow-origin'),
    allowMethods: answered.headers.get('access-control-allow-methods'),
    allowHeaders: answered.headers.get('access-control-allow-headers'),
  };
}

try {
  const read = await readTheLiveApi({
    origin: given ?? '',
    routes: readTheRoutes(repositoryRoot),
    ask,
    askThePreflight,
    report: (line) => process.stdout.write(`${line}\n`),
  });

  process.stdout.write(`${read} answers read, every one the way a deploy owes\n`);
} catch (thrown) {
  process.stderr.write(`${thrown instanceof Error ? thrown.message : String(thrown)}\n`);
  process.exit(1);
}
