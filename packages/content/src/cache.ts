import type { PhaseName } from '@emi/tokens';

import type { Article } from './article';

/**
 * What was read last, and when. A screen draws many times in one visit. An article changes about
 * as often as a phase does, so a read that is hours old is as good as one made now.
 *
 * What the source answered is kept even when it answered nothing. A server that is down would
 * otherwise be asked again on every draw, which is the one thing this exists to stop.
 *
 * Nothing here reaches storage. An answer is held for as long as the process runs, so a launch
 * that meets a source which is down asks it once more, which is one request. The phone remembers
 * the slug alone, in the row `lastShown` describes, because a row that named a cycle phase would
 * be a statement about her body sitting in plain text.
 */

/** Milliseconds. Twelve hours, so a phase that turns overnight is read again in the morning. */
export const CACHE_LIFETIME_MILLISECONDS = 12 * 60 * 60 * 1000;

/** One answer as it is held between draws. */
export interface HeldAnswer {
  /** Null where the source answered nothing, which is remembered rather than retried at once. */
  readonly article: Article | null;
  /** When it was read, as an instant in the format the rest of Emi writes instants in. */
  readonly readAt: string;
}

/** Where answers are held between draws, one for each phase. */
export interface ArticleCache {
  read(phase: PhaseName): Promise<HeldAnswer | null>;
  write(phase: PhaseName, answer: HeldAnswer): Promise<void>;
}

/**
 * Whether a held answer can stand in for a call: it was read no longer ago than the lifetime, and
 * it was not read after now. A clock that has moved backwards makes the second of those true, and
 * the answer is dropped rather than trusted.
 *
 * The phase is not compared here. Each phase holds its own answer, so an answer about one phase is
 * never the answer another phase is handed.
 */
export function isFresh(answer: HeldAnswer, now: Date): boolean {
  const readAt = Date.parse(answer.readAt);

  if (Number.isNaN(readAt)) {
    return false;
  }

  const age = now.getTime() - readAt;

  return age >= 0 && age <= CACHE_LIFETIME_MILLISECONDS;
}

/** A cache held in this process, which is what a screen runs on and what a test drives. */
export function memoryCache(held: Partial<Record<PhaseName, HeldAnswer>> = {}): ArticleCache {
  const answers: Partial<Record<PhaseName, HeldAnswer>> = { ...held };

  return {
    read: (phase) => Promise.resolve(answers[phase] ?? null),
    write: (phase, answer) => {
      answers[phase] = answer;
      return Promise.resolve();
    },
  };
}
