import type { DayVault } from '../services/vault/dayVault';
import type { ProfileVault } from '../services/vault/profileVault';
import type { Database } from './database';
import { rebuildTheFile } from './freePages';
import { type EncryptOutcome, encryptPlainPayloads } from './migrations/004-encrypt-payloads';
import {
  type CycleLengthOutcome,
  moveCycleLengthIntoProfile,
} from './migrations/006-cycle-length-into-profile';
import {
  type ArticleAnswerOutcome,
  takeThePhaseOffTheArticleAnswer,
} from './migrations/007-article-answer-without-the-phase';

/**
 * The three passes that cannot be statements, run together on the launch that holds her key.
 *
 * They are run in one place because the file is rebuilt once for all of them rather than once
 * each: a rebuild writes every page of her history out again, and a launch that has moved nothing
 * must not pay for one at all.
 */

export interface LaunchOutcome {
  readonly days: EncryptOutcome;
  readonly cycleLength: CycleLengthOutcome;
  readonly articleAnswer: ArticleAnswerOutcome;
  /** Whether the file was written again, which is what takes the plain copies out of it. */
  readonly fileRebuilt: boolean;
}

/** Her key, in the two shapes the passes seal with. */
export interface HerVaults {
  readonly day: DayVault;
  readonly profile: ProfileVault;
}

export function runTheLaunchPasses(db: Database, vaults: HerVaults, now: Date): LaunchOutcome {
  const days = encryptPlainPayloads(db, vaults.day, now);
  const cycleLength = moveCycleLengthIntoProfile(db, vaults.profile, now);
  const articleAnswer = takeThePhaseOffTheArticleAnswer(db);
  const moved =
    days.sealed > 0 || tookThePlainKeyOut(cycleLength) || tookThePhaseOut(articleAnswer);

  if (moved) {
    rebuildTheFile(db);
  }

  return { days, cycleLength, articleAnswer, fileRebuilt: moved };
}

/**
 * Both of these took the plain row out of the setting table. The third answer left it where it
 * was, and the fourth never found one, so neither of those has anything to rebuild the file for.
 */
function tookThePlainKeyOut(outcome: CycleLengthOutcome): boolean {
  return outcome.move === 'sealed-into-the-profile' || outcome.move === 'already-in-the-profile';
}

/**
 * The rewrite replaced the row and the removal dropped it, and the file holds the old copy of it
 * either way. A row this build wrote, and a phone that drew no article, have nothing to clear.
 */
function tookThePhaseOut(outcome: ArticleAnswerOutcome): boolean {
  return outcome.move === 'rewritten-as-the-slug' || outcome.move === 'removed';
}
