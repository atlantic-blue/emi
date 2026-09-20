import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { registerCSS } from 'react-native-css/jest';

/**
 * The application's own theme, compiled and handed to the runner.
 *
 * A class name means nothing on its own: NativeWind looks it up in the stylesheet Tailwind
 * compiled, and under the runner nothing compiles it. So this runs the same Tailwind over the same
 * `global.css` the bundler runs, which is what makes an assertion about a colour or a size in a
 * test an assertion about `apps/mobile/tailwind.config.js` and not about a string.
 *
 * One rem is sixteen points here, the same as `metro.config.js` sets, because a rem left alone is
 * the phone's own text size and every measurement taken from the prototype then comes out short.
 */

const mobileRoot = resolve(__dirname, '..', '..');
const tailwind = join(mobileRoot, '..', '..', 'node_modules', '.bin', 'tailwindcss');

export const REM_IN_POINTS = 16;

let compiled: string | undefined;

/** Compiled once for the whole file, because the compiler takes about a second to start. */
export function theCompiledTheme(): string {
  compiled ??= execFileSync(tailwind, ['--input', 'global.css', '--output', '-'], {
    cwd: mobileRoot,
    encoding: 'utf8',
  });

  if (!compiled.includes('.text-label-sm')) {
    throw new Error('Tailwind compiled nothing for the dock, so no test below proves anything');
  }

  return compiled;
}

/**
 * Registers the theme with the runner. Every test that renders anything carrying a class name
 * calls this first, or the tree comes back with the class names still on it and no styles at all.
 */
export function theThemeIsLoaded(): void {
  registerCSS(theCompiledTheme(), { inlineRem: REM_IN_POINTS });
}

/**
 * The same configuration, compiled with every text role asked for by name.
 *
 * Tailwind writes a utility only for a class something uses, so compiling the application proves
 * the roles the application draws today and says nothing about the other ten. This asks for all
 * eleven, which is what makes a test of the scale a test of the configuration.
 */
export function theThemeWithEveryTextRole(roles: readonly string[]): string {
  const asked = roles.map((role) => `@source inline("text-${role}");`).join('\n');
  const cache = join(mobileRoot, '..', '..', 'node_modules', '.cache', 'emi-theme');
  const page = join(cache, 'everyTextRole.css');

  mkdirSync(cache, { recursive: true });

  writeFileSync(
    page,
    [
      "@import 'tailwindcss/theme.css' layer(theme);",
      "@import 'tailwindcss/utilities.css';",
      `@config '${join(mobileRoot, 'tailwind.config.js')}';`,
      asked,
      '',
    ].join('\n'),
    'utf8',
  );

  return execFileSync(tailwind, ['--input', page, '--output', '-'], {
    cwd: mobileRoot,
    encoding: 'utf8',
  });
}
