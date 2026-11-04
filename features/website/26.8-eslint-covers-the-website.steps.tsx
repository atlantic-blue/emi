import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

import { colour } from '@emi/tokens';
import { defineFeature, loadFeature } from 'jest-cucumber';

const feature = loadFeature(join(__dirname, '26.8-eslint-covers-the-website.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');
const eslintCommandLine = join(repositoryRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');

/** A spawn costs a second or two, and this scenario reads six pages. */
const longEnoughForSixRuns = 120_000;

interface Refusal {
  readonly rule: string;
  readonly message: string;
}

/**
 * The gate the pipeline runs, asked about one page. The page goes in through standard input under
 * a made up path, so the path decides which rules reach it and nothing is written into the tree.
 */
function theGateReads(file: string, page: string): Refusal[] {
  const run = spawnSync(
    process.execPath,
    [
      eslintCommandLine,
      '--stdin',
      '--stdin-filename',
      file,
      '--format',
      'json',
      '--no-warn-ignored',
    ],
    { cwd: repositoryRoot, encoding: 'utf8', input: page },
  );

  if (run.stdout.trim().length === 0) {
    throw new Error(`eslint said nothing about ${file}: ${run.stderr}`);
  }

  const reported = JSON.parse(run.stdout) as {
    messages: { ruleId: string | null; message: string }[];
  }[];

  return reported
    .flatMap((result) => result.messages)
    .map((message) => ({ rule: message.ruleId ?? 'the parser', message: message.message }));
}

/** Built from a token, so this file writes no colour of its own. */
const aColourTypedIntoAPage = `export const ground = '${colour.card}';\n`;

const aPlainImageElement = `export default function Page() {
  return <img src="/emi.png" alt="Emi" />;
}
`;

const aHookInsideACondition = `import { useState } from 'react';

export default function Page({ open }: { open: boolean }) {
  if (open) {
    const [name] = useState('');

    return <p>{name}</p>;
  }

  return null;
}
`;

const anImportOfTheReactNativeText = `import { Text } from 'react-native';

export const Label = Text;
`;

const anEnvironmentVariableReadThroughAName = `const name = 'EXPO_PUBLIC_EMI_VAULT_URL';

export const url = process.env[name];
`;

defineFeature(feature, (test) => {
  test(
    'eslint refuses a hex colour in the website',
    ({ given, when, then, and }) => {
      let page = '';
      let refusals: Refusal[] = [];

      given('a page for myemi.app with a colour typed into it', () => {
        page = aColourTypedIntoAPage;

        expect(page).toContain('export const ground');
      });

      when('the gate reads the pages of the website', () => {
        refusals = theGateReads('apps/website/app/probe.ts', page);
      });

      then('the colour is refused, and the package it belongs in is named', () => {
        expect(refusals.map((refusal) => refusal.rule)).toEqual(['no-restricted-syntax']);
        expect(refusals[0]?.message).toContain('packages/tokens');
      });

      and('a plain image element is reported, because the pages are read as web code', () => {
        const read = theGateReads('apps/website/app/probe.tsx', aPlainImageElement);

        expect(read.map((refusal) => refusal.rule)).toContain('@next/next/no-img-element');
      });

      and('a hook inside a condition is refused', () => {
        const read = theGateReads('apps/website/app/probe.tsx', aHookInsideACondition);

        expect(read.map((refusal) => refusal.rule)).toContain('react-hooks/rules-of-hooks');
      });

      and('the screens of the phone keep every rule they had', () => {
        expect(
          theGateReads('apps/mobile/src/probe.ts', aColourTypedIntoAPage).map(
            (refusal) => refusal.rule,
          ),
        ).toEqual(['no-restricted-syntax']);
        expect(
          theGateReads('apps/mobile/src/features/probe.tsx', anImportOfTheReactNativeText).map(
            (refusal) => refusal.rule,
          ),
        ).toEqual(['no-restricted-imports']);
        expect(
          theGateReads('apps/mobile/src/probe.ts', anEnvironmentVariableReadThroughAName).map(
            (refusal) => refusal.rule,
          ),
        ).toEqual(['expo/no-dynamic-env-var']);
      });
    },
    longEnoughForSixRuns,
  );
});
