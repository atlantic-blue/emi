#!/usr/bin/env -S node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { refusalFor, scenariosRan } from './scenarioCount.ts';
import type { RunReport } from './scenarioCount.ts';

const file = resolve(process.argv[2] ?? 'e2e/report/scenarios.json');

let report: RunReport;

try {
  report = JSON.parse(readFileSync(file, 'utf8')) as RunReport;
} catch (reason) {
  process.stderr.write(
    `The browser suite wrote no report at ${file}, so nobody can say what it ran: ${String(reason)}\n`,
  );
  process.exit(1);
}

const refusal = refusalFor(report);

if (refusal !== null) {
  process.stderr.write(`${refusal}\n`);
  process.exit(1);
}

process.stdout.write(`the browser suite carried out ${scenariosRan(report)} scenario(s)\n`);
