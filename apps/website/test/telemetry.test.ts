import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Contract SITE-4 refuses Next.js telemetry in the build. Next.js reads it from the environment
 * and from nothing else, so the switch lives in front of every command that starts it, and a
 * script added later that forgets it is what this reads for.
 */
const theSwitch = 'NEXT_TELEMETRY_DISABLED=1';

/** The commands that start Next.js or the tool that packages it. */
const startsNextPattern = /(^|[\s&|;])(next|open-next)\s/;

export function scriptsThatStartNext(scripts: Readonly<Record<string, string>>): string[] {
  return Object.entries(scripts)
    .filter(([, command]) => startsNextPattern.test(command))
    .map(([name]) => name);
}

export function scriptsMissingTheSwitch(scripts: Readonly<Record<string, string>>): string[] {
  return scriptsThatStartNext(scripts).filter(
    (name) => (scripts[name] ?? '').includes(theSwitch) !== true,
  );
}

function manifestScripts(): Record<string, string> {
  const manifest = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };

  return manifest.scripts ?? {};
}

describe('nothing in this workspace reports a build to Vercel', () => {
  const scripts = manifestScripts();

  it('finds the scripts that start Next.js, so agreement is never two empty lists', () => {
    expect(scriptsThatStartNext(scripts).sort()).toEqual(['build', 'build:lambda', 'dev', 'start']);
  });

  it('turns the telemetry off in every one of them', () => {
    expect(scriptsMissingTheSwitch(scripts)).toEqual([]);
  });

  it('leaves the scripts that start nothing alone', () => {
    expect(scriptsThatStartNext(scripts)).not.toContain('typecheck');
    expect(scriptsThatStartNext(scripts)).not.toContain('test');
  });

  it('names a script that starts Next.js with the switch missing', () => {
    expect(scriptsMissingTheSwitch({ build: 'next build' })).toEqual(['build']);
  });

  it('does not read a script that only has the word next inside another one', () => {
    expect(scriptsThatStartNext({ nextdoor: 'nextdoor --help' })).toEqual([]);
  });
});
