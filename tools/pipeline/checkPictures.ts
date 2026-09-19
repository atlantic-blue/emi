import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  comparedIn,
  drawingsIn,
  LEDGER_VARIABLE,
  pictureFilesOf,
  pictureProblems,
} from './pictures.ts';

/**
 * Compares every picture in the repository against the screens that draw it. The run needs no
 * browser, because it reads the committed markup and never the image.
 *
 * The runner is pointed at the whole configuration and never at a list of names, so a picture
 * added tomorrow is compared by this check on the day it lands.
 */

const root = resolve(import.meta.dirname, '..', '..');
const directory = mkdtempSync(join(tmpdir(), 'emi-pictures-'));
const ledger = join(directory, 'compared.txt');

const found = pictureFilesOf(root);

const run = spawnSync(
  join(root, 'node_modules', '.bin', 'jest'),
  ['--ci', '--config', join('brand', 'screens', 'jest.config.js')],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, EMI_PICTURE_CHECK: '1', [LEDGER_VARIABLE]: ledger },
  },
);

const compared = comparedIn(existsSync(ledger) ? readFileSync(ledger, 'utf8') : '');

rmSync(directory, { force: true, recursive: true });

const checked = pictureProblems(found, compared, drawingsIn(root));

for (const problem of checked.problems) {
  console.error(problem);
}

console.log(checked.said);

if (run.status !== 0) {
  console.error('the picture run itself failed, and the lines above say which picture drifted');
}

process.exit(checked.problems.length > 0 || run.status !== 0 ? 1 : 0);
