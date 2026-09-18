import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { interfaceFilesOf, interfaceRoot } from './singleDayForecast';

/**
 * Contract VAULT-1 says the vault key never reaches a log, an export, an error message or a crash
 * report. A test can prove that the module's own refusals carry no key. It cannot prove that some
 * later screen never writes one out, so three rules are held here instead, and each is about the
 * sink rather than about the bytes.
 *
 * The first: the application writes nothing to a log at all. A key cannot reach a log line that
 * does not exist, and a crash reporter collects what the application already wrote. A step that
 * genuinely needs to log adds itself to this file, where a reviewer sees it.
 *
 * The second: each keychain item is named in one directory and nowhere else. An export, a
 * diagnostic screen or a support form cannot write out an item it cannot read.
 *
 * The third is contract VAULT-2, and it is about a value that is stored nowhere at all. The
 * recovery code lives on her paper, and in memory for as long as she is on three screens. So only
 * the screens that show it and the module that wraps a key with it may name it, and the service
 * may not name it anywhere. A field called recovery code on a request body is the whole failure,
 * and it reads as entirely reasonable until somebody asks what the server would do with it.
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
  {
    item: 'emi.accountId.v1',
    constant: 'accountIdItem',
    home: join(interfaceRoot, 'services', 'sync'),
  },
  {
    item: 'emi.recoveryConfirmed.v1',
    constant: 'recoveryConfirmedItem',
    home: join(interfaceRoot, 'services', 'vault'),
  },
];

/** The source the service is made of. It holds a wrapped key and no way at all to unwrap one. */
export const serviceRoot = join('services', 'vault', 'src');

/**
 * How a recovery code would be written if somebody gave it a name: as a field, a parameter, a
 * column or a constant. Case and a separator are allowed for, because the failure arrives as
 * recovery_code on a request body as easily as recoveryCode.
 */
export const recoveryCodeWord = /recovery[_ -]?code/i;

/**
 * The only two directories in the application that may name it. The first shows it to her. The
 * second turns it into a key and forgets it. Nothing else has any business with it, and the
 * service is deliberately absent from this list rather than given an empty one.
 */
export const recoveryCodeHomes: readonly string[] = [
  join(interfaceRoot, 'features', 'recovery'),
  join(interfaceRoot, 'services', 'vault'),
];

export interface KeyLeak {
  readonly file: string;
  readonly reason: 'logs' | 'names-a-keychain-item' | 'names-the-recovery-code';
  readonly context: string;
}

const reasons: Readonly<Record<KeyLeak['reason'], string>> = {
  logs: 'writes to a log, and the key must reach none',
  'names-a-keychain-item': 'names a keychain item it does not hold',
  'names-the-recovery-code': 'names the recovery code, which lives on her paper and nowhere else',
};

export function describeKeyLeak(leak: KeyLeak): string {
  return `${leak.file} ${reasons[leak.reason]}: ${leak.context}`;
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

/**
 * Where a file may name the recovery code. A file under the service is passed no homes at all by
 * its caller, so every line of it that names one is a leak.
 */
export function recoveryCodeNamedIn(
  file: string,
  contents: string,
  homes: readonly string[] = recoveryCodeHomes,
): KeyLeak[] {
  if (homes.some((home) => file.startsWith(`${home}/`))) {
    return [];
  }

  return contents
    .split('\n')
    .filter((line) => recoveryCodeWord.test(line))
    .map((line) => ({
      file,
      reason: 'names-the-recovery-code' as const,
      context: line.trim(),
    }));
}

export function keyLeaksIn(
  file: string,
  contents: string,
  homes: readonly string[] = recoveryCodeHomes,
): KeyLeak[] {
  return [
    ...logCallsIn(file, contents),
    ...keychainItemsNamedIn(file, contents),
    ...recoveryCodeNamedIn(file, contents, homes),
  ];
}

export function keyLeaksUnder(
  root: string,
  files: readonly string[],
  homes: readonly string[] = recoveryCodeHomes,
): KeyLeak[] {
  return files.flatMap((file) => keyLeaksIn(file, readFileSync(join(root, file), 'utf8'), homes));
}

export { interfaceFilesOf, interfaceRoot };

function namesTheConstant(line: string, constant: string): boolean {
  return new RegExp(`\\b${constant}\\b`).test(line);
}
