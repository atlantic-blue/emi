import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

import { colour } from '../../packages/tokens/src/colour';

const repositoryRoot = resolve(__dirname, '..', '..');
const eslintCommandLine = join(repositoryRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');

interface Refusal {
  readonly rule: string;
  readonly severity: number;
  readonly message: string;
}

/**
 * The repository's own configuration answers, rather than a configuration this file wrote. The
 * ESLint class cannot load a flat configuration from inside Jest, so the binary the pipeline runs
 * is spawned instead. The source goes in through standard input under a made up path, so the path
 * decides which block applies and no probe file is ever left in the tree.
 */
function whatTheGateSaysAbout(file: string, code: string): Refusal[] {
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
    { cwd: repositoryRoot, encoding: 'utf8', input: code },
  );

  if (run.stdout.trim().length === 0) {
    throw new Error(`eslint said nothing about ${file}: ${run.stderr}`);
  }

  const reported = JSON.parse(run.stdout) as {
    messages: { ruleId: string | null; severity: number; message: string }[];
  }[];

  return reported
    .flatMap((result) => result.messages)
    .map((message) => ({
      rule: message.ruleId ?? 'the parser',
      severity: message.severity,
      message: message.message,
    }));
}

function rulesIn(refusals: Refusal[]): string[] {
  return refusals.map((refusal) => refusal.rule);
}

/** Built from a token rather than written out, so this file holds no colour of its own. */
const aColourTypedIntoAPage = `export const ground = '${colour.card}';\n`;

const aHookInsideACondition = `import { useState } from 'react';

export default function Page({ open }: { open: boolean }) {
  if (open) {
    const [name] = useState('');

    return <p>{name}</p>;
  }

  return null;
}
`;

const aPlainImageElement = `export default function Page() {
  return <img src="/emi.png" alt="Emi" />;
}
`;

const aPageThatReadsTheBrowser = `'use client';

export default function Page() {
  return <p>{window.location.pathname}</p>;
}
`;

describe('the website is read as web code and keeps the colour rule', () => {
  it('refuses a colour written into a page, and names the package it belongs in', () => {
    const refusals = whatTheGateSaysAbout('apps/website/app/probe.ts', aColourTypedIntoAPage);

    expect(rulesIn(refusals)).toEqual(['no-restricted-syntax']);
    expect(refusals[0]?.severity).toBe(2);
    expect(refusals[0]?.message).toContain('packages/tokens');
  });

  it('refuses a hook called inside a condition', () => {
    const refusals = whatTheGateSaysAbout('apps/website/app/probe.tsx', aHookInsideACondition);

    expect(rulesIn(refusals)).toContain('react-hooks/rules-of-hooks');
    expect(
      refusals.find((refusal) => refusal.rule === 'react-hooks/rules-of-hooks')?.severity,
    ).toBe(2);
  });

  // Next.js ships this one as a warning in its core web vitals set, and the level is read here so
  // that a change to it is a change to this test rather than a quiet loss of the report.
  it('reports a plain image element, which only a web linter knows about', () => {
    const refusals = whatTheGateSaysAbout('apps/website/app/probe.tsx', aPlainImageElement);

    expect(rulesIn(refusals)).toContain('@next/next/no-img-element');
    expect(refusals.find((refusal) => refusal.rule === '@next/next/no-img-element')?.severity).toBe(
      1,
    );
  });

  it('leaves a page that reads the browser alone, because the browser names are declared', () => {
    expect(whatTheGateSaysAbout('apps/website/app/probe.tsx', aPageThatReadsTheBrowser)).toEqual(
      [],
    );
  });
});

describe('the application keeps every rule it had', () => {
  it('still refuses a colour written into a screen', () => {
    expect(
      rulesIn(whatTheGateSaysAbout('apps/mobile/src/probe.ts', aColourTypedIntoAPage)),
    ).toEqual(['no-restricted-syntax']);
  });

  it('still refuses the react native text components', () => {
    const anImportOfText = `import { Text } from 'react-native';

export const Label = Text;
`;

    expect(
      rulesIn(whatTheGateSaysAbout('apps/mobile/src/features/probe.tsx', anImportOfText)),
    ).toEqual(['no-restricted-imports']);
  });

  it('still refuses an environment variable read through a name', () => {
    const aVariableReadThroughAName = `const name = 'EXPO_PUBLIC_EMI_VAULT_URL';

export const url = process.env[name];
`;

    expect(
      rulesIn(whatTheGateSaysAbout('apps/mobile/src/probe.ts', aVariableReadThroughAName)),
    ).toEqual(['expo/no-dynamic-env-var']);
  });
});
