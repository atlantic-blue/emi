import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { interfaceFilesOf, interfaceRoot } from './singleDayForecast';

/**
 * Contract VAULT-1 says the vault key never reaches a log, an export, an error message or a crash
 * report. A test can prove that the module's own refusals carry no key. It cannot prove that some
 * later screen never writes one out, so two rules are held here instead, and both are about the
 * sink rather than about the bytes.
 *
 * The first: the application writes nothing to a log at all. A key cannot reach a log line that
 * does not exist, and a crash reporter collects what the application already wrote. A step that
 * genuinely needs to log adds itself to this file, where a reviewer sees it.
 *
 * The second: each keychain item is named in one directory and nowhere else. An export, a
 * diagnostic screen or a support form cannot write out an item it cannot read.
 */

/** Every way a JavaScript runtime is asked to write something down. */
export const logCalls: readonly string[] = [
  'console.log',
  'console.info',
  'console.warn',
  'console.error',
  'console.debug',
  'console.trace',
  'console.table',
  'console.dir',
];

export interface KeyholdingItem {
  /** The name the platform knows the item by. */
  readonly item: string;
  /** The exported constant the application reads it through. */
  readonly constant: string;
  /** The one directory allowed to name either, written from the repository root. */
  readonly home: string;
}

export const keyholdingItems: readonly KeyholdingItem[] = [
  {
    item: 'emi.vaultKey.v1',
    constant: 'vaultKeyItem',
    home: join(interfaceRoot, 'services', 'vault'),
  },
  {
    item: 'emi.deviceKey.v1',
    constant: 'deviceKeyItem',
    home: join(interfaceRoot, 'services', 'sync'),
  },
];

export interface KeyLeak {
  readonly file: string;
  readonly reason: 'logs' | 'names-a-keychain-item';
  readonly context: string;
}

export function describeKeyLeak(leak: KeyLeak): string {
  return leak.reason === 'logs'
    ? `${leak.file} writes to a log, and the key must reach none: ${leak.context}`
    : `${leak.file} names a keychain item it does not hold: ${leak.context}`;
}

export function logCallsIn(file: string, contents: string): KeyLeak[] {
  return contents
    .split('\n')
    .filter((line) => logCalls.some((call) => line.includes(call)))
    .map((line) => ({ file, reason: 'logs' as const, context: line.trim() }));
}

export function keychainItemsNamedIn(
  file: string,
  contents: string,
  items: readonly KeyholdingItem[] = keyholdingItems,
): KeyLeak[] {
  const away = items.filter((held) => !file.startsWith(`${held.home}/`));

  return contents.split('\n').flatMap((line) =>
    away
      .filter((held) => line.includes(held.item) || namesTheConstant(line, held.constant))
      .map((held) => ({
        file,
        reason: 'names-a-keychain-item' as const,
        context: `${held.item} belongs to ${held.home}, and this line reads ${line.trim()}`,
      })),
  );
}

export function keyLeaksIn(file: string, contents: string): KeyLeak[] {
  return [...logCallsIn(file, contents), ...keychainItemsNamedIn(file, contents)];
}

export function keyLeaksUnder(root: string, files: readonly string[]): KeyLeak[] {
  return files.flatMap((file) => keyLeaksIn(file, readFileSync(join(root, file), 'utf8')));
}

export { interfaceFilesOf, interfaceRoot };

function namesTheConstant(line: string, constant: string): boolean {
  return new RegExp(`\\b${constant}\\b`).test(line);
}
