import { resolve } from 'node:path';

import { appVersion, releaseTagProblem } from './releaseTag.ts';

const tag = process.argv[2];
if (tag === undefined || tag === '') {
  process.stderr.write('Name the tag to release, for example v0.1.0.\n');
  process.exit(1);
}

const version = appVersion(resolve(import.meta.dirname, '..', '..'));
const problem = releaseTagProblem(tag, version);
if (problem !== undefined) {
  process.stderr.write(`${problem}. Nothing is built.\n`);
  process.exit(1);
}

process.stdout.write(`The tag ${tag} is the version in apps/mobile/app.json.\n`);
