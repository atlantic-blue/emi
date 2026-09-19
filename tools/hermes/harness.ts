/**
 * The runner inside the bundle. Jest cannot run here: it needs Node, and the point of this tier is
 * that Node is not the engine the application runs on. So a case is a name and a function, the
 * runner reports one line for each, and `tools/hermes/outcome.ts` reads those lines back.
 *
 * The count is printed on purpose. A run that discovers nothing to do looks exactly like a run
 * that did everything correctly, so the count is what tells the two apart.
 */

interface Case {
  readonly name: string;
  readonly run: () => void;
}

const collected: Case[] = [];

/** Adds a case. The name says what happens, never what is called. */
export function check(name: string, run: () => void): void {
  collected.push({ name, run });
}

/** Runs everything collected, reports each one, and refuses an empty run and any failure. */
export function runEveryCase(): void {
  const failures: string[] = [];

  for (const held of collected) {
    try {
      held.run();
      console.log(`case ok ${held.name}`);
    } catch (thrown) {
      failures.push(held.name);
      console.log(`case failed ${held.name}: ${messageOf(thrown)}`);
    }
  }

  // Printed before anything is thrown, so a reader and the caller both see the count even when
  // the run ends badly.
  console.log(`cases ran ${collected.length}`);

  if (collected.length === 0) {
    throw new Error('this run discovered no case, which is a failure and not a pass');
  }

  if (failures.length > 0) {
    throw new Error(`${failures.length} of ${collected.length} cases failed on this engine`);
  }
}

/** Only for the harness's own test. A run of the real tier collects once and never clears. */
export function forgetEveryCase(): void {
  collected.length = 0;
}

export function messageOf(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown);
}

export function isTrue(held: boolean, what: string): void {
  if (!held) {
    throw new Error(what);
  }
}

export function sameValue(held: unknown, wanted: unknown, what: string): void {
  if (held !== wanted) {
    throw new Error(`${what}: this engine gave ${String(held)} and ${String(wanted)} was wanted`);
  }
}

export function sameBytes(held: Uint8Array, wanted: Uint8Array, what: string): void {
  if (held.length !== wanted.length) {
    throw new Error(
      `${what}: this engine gave ${held.length} bytes and ${wanted.length} were wanted`,
    );
  }

  for (let at = 0; at < held.length; at += 1) {
    if (held[at] !== wanted[at]) {
      throw new Error(
        `${what}: byte ${at} is ${String(held[at])} and ${String(wanted[at])} was wanted`,
      );
    }
  }
}

/**
 * Asserts the refusal rather than the message. Every refusal in `@emi/crypto` carries a value for
 * exactly this, so a reworded message does not move a case.
 */
export function refusedWith(action: () => unknown, refusal: string, what: string): void {
  try {
    action();
  } catch (thrown) {
    const held = (thrown as { refusal?: unknown }).refusal;

    if (held !== refusal) {
      throw new Error(
        `${what}: this engine refused with ${String(held ?? messageOf(thrown))} and ${refusal} was wanted`,
      );
    }

    return;
  }

  throw new Error(`${what}: this engine allowed it, and ${refusal} was wanted`);
}

/** Bytes from lowercase hexadecimal, so a frozen vector can be written the way it is stored. */
export function bytesFromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);

  for (let at = 0; at < bytes.length; at += 1) {
    bytes[at] = Number.parseInt(hex.slice(at * 2, at * 2 + 2), 16);
  }

  return bytes;
}

/** Lowercase hexadecimal of bytes, for a message that has to name which byte moved. */
export function hexFromBytes(bytes: Uint8Array): string {
  let written = '';

  for (const byte of bytes) {
    written += byte.toString(16).padStart(2, '0');
  }

  return written;
}
