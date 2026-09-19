import type { PhaseName } from '@emi/tokens';
import { phaseNames } from '@emi/tokens';

import type { Article } from './article';
import { articleFrom } from './article';

/**
 * What was read last, and when. A screen draws many times in one visit. An article changes about
 * as often as a phase does, so a read that is hours old is as good as one made now.
 *
 * What the source answered is kept even when it answered nothing. A server that is down would
 * otherwise be asked again on every draw, which is the one thing this exists to stop.
 */

/** Milliseconds. Twelve hours, so a phase that turns overnight is read again in the morning. */
export const CACHE_LIFETIME_MILLISECONDS = 12 * 60 * 60 * 1000;

/** One answer as it is held between draws. */
export interface CachedAnswer {
  readonly phase: PhaseName;
  /** Null where the source answered nothing, which is remembered rather than retried at once. */
  readonly article: Article | null;
  /** When it was read, as an instant in the format the rest of Emi writes instants in. */
  readonly readAt: string;
}

/** Where an answer is held on the device. The application supplies one built on its own storage. */
export interface ArticleCache {
  read(): Promise<CachedAnswer | null>;
  write(answer: CachedAnswer): Promise<void>;
}

/**
 * Whether a held answer can stand in for a call: it is about the phase being asked about, it was
 * read no longer ago than the lifetime, and it was not read after now. A clock that has moved
 * backwards makes the last of those true, and the answer is dropped rather than trusted.
 */
export function isFresh(answer: CachedAnswer, phase: PhaseName, now: Date): boolean {
  const readAt = Date.parse(answer.readAt);

  if (Number.isNaN(readAt) || answer.phase !== phase) {
    return false;
  }

  const age = now.getTime() - readAt;

  return age >= 0 && age <= CACHE_LIFETIME_MILLISECONDS;
}

/** An answer written for storage, which is one line of json. */
export function writtenAnswer(answer: CachedAnswer): string {
  return JSON.stringify(answer);
}

/**
 * An answer read back from storage, or nothing. Storage is read as untrusted: a line that is not
 * json, or that holds something other than the shape written above, answers nothing rather than
 * throwing on the draw that reads it.
 */
export function readAnswer(written: string): CachedAnswer | null {
  let held: unknown = null;

  try {
    held = JSON.parse(written);
  } catch {
    return null;
  }

  if (held === null || typeof held !== 'object' || Array.isArray(held)) {
    return null;
  }

  const fields = held as Record<string, unknown>;
  const phase = phaseOf(fields.phase);

  if (phase === null || typeof fields.readAt !== 'string') {
    return null;
  }

  const article = fields.article === null ? null : articleFrom(fields.article, phase);

  return fields.article !== null && article === null
    ? null
    : { phase, article, readAt: fields.readAt };
}

/** A cache held in this process, which is what a test drives and what a screen starts with. */
export function memoryCache(held: CachedAnswer | null = null): ArticleCache {
  let answer = held;

  return {
    read: () => Promise.resolve(answer),
    write: (written) => {
      answer = written;
      return Promise.resolve();
    },
  };
}

function phaseOf(given: unknown): PhaseName | null {
  return phaseNames.find((name) => name === given) ?? null;
}
