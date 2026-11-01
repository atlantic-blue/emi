#!/usr/bin/env -S node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { scenariosRan } from './scenarioCount.ts';
import type { RunReport } from './scenarioCount.ts';

const file = resolve(process.argv[2] ?? 'e2e/report/scenarios.json');
const report = JSON.parse(readFileSync(file, 'utf8')) as RunReport;

process.stdout.write(`the browser suite carried out ${scenariosRan(report)} scenario(s)\n`);
