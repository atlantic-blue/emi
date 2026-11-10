import { resolve } from 'node:path';

import { type Answered, readTheLiveApi } from './liveApi.ts';
import { readTheRoutes } from './routes.ts';

/** The pipeline command. It reads the real api at the address the deploy was given. */

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const given = process.argv.slice(2).find((argument) => !argument.startsWith('--'));

async function ask(address: string, method: string, body: string | undefined): Promise<Answered> {
  const answered = await fetch(address, { method, body });

  return { status: answered.status };
}

try {
  const read = await readTheLiveApi({
    origin: given ?? '',
    routes: readTheRoutes(repositoryRoot),
    ask,
    report: (line) => process.stdout.write(`${line}\n`),
  });

  process.stdout.write(`${read} routes answered the way a deploy owes\n`);
} catch (thrown) {
  process.stderr.write(`${thrown instanceof Error ? thrown.message : String(thrown)}\n`);
  process.exit(1);
}
