import { resolve } from 'node:path';

import {
  fingerprintIn,
  fingerprintProblem,
  fingerprintedWorkspace,
  runFingerprint,
} from './fingerprint.ts';

// The tooling lives in this repository. The tree being read need not, so a fixture tree can be
// handed to the same command the pipeline runs.
const given = process.argv[2];
const root = given === undefined ? resolve(import.meta.dirname, '..', '..') : resolve(given);

const run = runFingerprint(root);
const problem = fingerprintProblem(run);
const fingerprint = fingerprintIn(run.output);

if (problem !== undefined || fingerprint === undefined) {
  process.stderr.write(`${problem ?? 'the fingerprint command printed no fingerprint'}\n`);
  process.stderr.write(
    '\nExpo takes this fingerprint before it queues a build, so a release stops where this ' +
      'stops. Read the lock file for a nested dependency it left unsatisfied.\n',
  );
  process.exit(1);
}

process.stdout.write(
  `${fingerprintedWorkspace} fingerprints as ${fingerprint.hash}, over ` +
    `${fingerprint.sources} source(s).\n`,
);
