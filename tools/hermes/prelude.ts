/**
 * The phone's global surface, on a bare engine.
 *
 * Emi runs on Hermes. A bare Hermes has no React Native and no Expo under it, so it starts with
 * fewer globals than a phone has. This file puts back the ones a phone provides and the code in
 * this tier reaches. Every entry names who provides it on the phone.
 *
 * Nothing here installs `crypto`, because a phone has no `crypto` either. That absence is the
 * whole reason this tier exists. A seal that falls back to `globalThis.crypto` passes on Node and
 * refuses on her phone, and this is the only place that difference is visible before the store is.
 *
 * So every entry added here is one refusal this tier stops being able to catch. Add one only when
 * a real phone provides it, name who provides it, and add nothing else.
 */

import { TextDecoder as ExpoTextDecoder } from 'expo/src/winter/TextDecoder';

import structuredCloneOf from './structuredClone.ts';

/** Hermes writes a line with this. A phone has no such thing, and nothing outside this file uses it. */
declare const print: (line: string) => void;

/**
 * React Native's `InitializeCore` installs `console` before any application code runs, so a phone
 * always has one. This one carries the four methods that runtime offers and writes every line the
 * one way a bare engine can.
 */
function installConsole(): void {
  const write = (label: string, parts: readonly unknown[]): void => {
    print(`${label}${parts.map(readable).join(' ')}`);
  };

  const held = {
    log: (...parts: readonly unknown[]) => {
      write('', parts);
    },
    info: (...parts: readonly unknown[]) => {
      write('', parts);
    },
    warn: (...parts: readonly unknown[]) => {
      write('warn: ', parts);
    },
    error: (...parts: readonly unknown[]) => {
      write('error: ', parts);
    },
  };

  // The engine's `console` is absent rather than partial, so this is an install and never a patch.
  (globalThis as { console?: unknown }).console = held;
}

function readable(part: unknown): string {
  if (typeof part === 'string') {
    return part;
  }

  try {
    return JSON.stringify(part) ?? String(part);
  } catch {
    return String(part);
  }
}

/**
 * Hermes provides `TextEncoder` from version 0.17, which is the version the application ships.
 * The newest Hermes published as a command line engine is 0.12 and has none, so this stands in
 * for it. It is the one entry here that is a copy rather than the phone's own code, so a case in
 * `cases/canonical.ts` holds it to known bytes instead of to itself.
 */
class Utf8TextEncoder {
  readonly encoding = 'utf-8';

  encode(input = ''): Uint8Array {
    const bytes: number[] = [];

    for (let at = 0; at < input.length; at += 1) {
      let point = input.charCodeAt(at);

      if (point >= 0xd800 && point <= 0xdbff) {
        const low = at + 1 < input.length ? input.charCodeAt(at + 1) : 0;

        if (low >= 0xdc00 && low <= 0xdfff) {
          point = 0x10000 + ((point - 0xd800) << 10) + (low - 0xdc00);
          at += 1;
        } else {
          // Half of a pair on its own is not a character, and the encoding rules replace it rather
          // than write it, so the bytes stay readable text.
          point = 0xfffd;
        }
      } else if (point >= 0xdc00 && point <= 0xdfff) {
        point = 0xfffd;
      }

      if (point < 0x80) {
        bytes.push(point);
      } else if (point < 0x800) {
        bytes.push(0xc0 | (point >> 6), 0x80 | (point & 0x3f));
      } else if (point < 0x10000) {
        bytes.push(0xe0 | (point >> 12), 0x80 | ((point >> 6) & 0x3f), 0x80 | (point & 0x3f));
      } else {
        bytes.push(
          0xf0 | (point >> 18),
          0x80 | ((point >> 12) & 0x3f),
          0x80 | ((point >> 6) & 0x3f),
          0x80 | (point & 0x3f),
        );
      }
    }

    return new Uint8Array(bytes);
  }
}

/** Installs a global that is absent, and leaves one that is already there alone. */
function install(name: string, make: () => unknown): void {
  const held = globalThis as unknown as Record<string, unknown>;

  if (held[name] === undefined) {
    held[name] = make();
  }
}

installConsole();

// Hermes 0.17 provides this, and the command line engine at 0.12 does not.
install('TextEncoder', () => Utf8TextEncoder);
// Expo's runtime installs this from `expo/src/winter/runtime.native.ts`. This is the module that
// file installs, imported rather than copied, so a phone and this tier decode the same way.
install('TextDecoder', () => ExpoTextDecoder);
// Expo's runtime installs this out of the same file, from the same package.
install('structuredClone', () => structuredCloneOf);

/**
 * The gate, checked rather than assumed. Something imported above could install `crypto` without
 * meaning to, and this tier would then be green for the one reason it was built to refuse.
 */
if ((globalThis as { crypto?: unknown }).crypto !== undefined) {
  throw new Error(
    'something installed globalThis.crypto on this engine, and a phone has none, so this tier can no longer catch a seal that falls back to it',
  );
}
