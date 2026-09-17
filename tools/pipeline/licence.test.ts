import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(__dirname, '..', '..');

const manifests = [
  'package.json',
  'apps/mobile/package.json',
  'packages/tokens/package.json',
  'packages/cycle/package.json',
  'packages/crypto/package.json',
];

function read(file: string): string {
  return readFileSync(join(repositoryRoot, file), 'utf8');
}

describe('the licence is MIT everywhere it is named', () => {
  it('the file says MIT and names the holder and the year', () => {
    const licence = read('LICENCE');

    expect(licence).toContain('MIT License');
    expect(licence).toContain('Copyright (c) 2026 Atlantic Blue Solutions Limited');
    expect(licence).toContain('Permission is hereby granted, free of charge');
  });

  it.each(manifests)('%s declares MIT', (manifest) => {
    const declared = (JSON.parse(read(manifest)) as { license?: string }).license;

    expect(declared).toBe('MIT');
  });

  it('the readme points at the same licence', () => {
    expect(read('README.md')).toContain('MIT. Read `LICENCE`.');
  });

  it('nothing still names a licence the operator did not choose', () => {
    const named = ['LICENCE', 'README.md', ...manifests].filter((file) => {
      const contents = read(file);
      return contents.includes('Apache') || contents.includes('General Public License');
    });

    expect(named).toEqual([]);
  });
});
