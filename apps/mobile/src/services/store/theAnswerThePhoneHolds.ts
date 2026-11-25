import type { Database } from '../../data/database';
import { readSetting, writeSetting } from '../../data/settingRepository';
import {
  type WhatSheIsEntitledTo,
  type WhatSheIsEntitledToNow,
  theStatesSheCanBeIn,
} from './theEntitlement';

/**
 * Where the last known answer lives between two launches.
 *
 * The setting table, because none of this is a fact she entered about her body: a state, a plan
 * identifier and an instant are facts about a sale. Nothing here syncs and nothing here is sealed.
 *
 * It is one row rather than five, so one statement writes the whole answer. Five rows could be
 * half written by a phone that stopped between two of them, and a half written answer is a woman
 * read as lapsed on a plan she is paying for.
 */

/** The one key the answer is held under. */
export const THE_KEY_THE_ANSWER_IS_HELD_UNDER = 'entitlement';

/** The shape the row is read back through. A test hands one in with no database behind it. */
export interface HoldsTheAnswer {
  readonly read: () => WhatSheIsEntitledToNow | null;
  readonly hold: (answer: WhatSheIsEntitledToNow) => void;
}

function aStringOrNull(value: unknown): string | null | undefined {
  if (value === null || typeof value === 'string') {
    return value;
  }

  return undefined;
}

/**
 * A row this version of Emi did not write reads as nothing held. A later version may add a field
 * or a state, and a woman who moves back to an older build must read a paywall rather than a
 * state that build cannot name.
 */
function theAnswerIn(value: string): WhatSheIsEntitledToNow | null {
  let read: unknown;

  try {
    read = JSON.parse(value);
  } catch {
    return null;
  }

  if (typeof read !== 'object' || read === null) {
    return null;
  }

  const held = read as Record<string, unknown>;
  const state = held.state;
  const until = aStringOrNull(held.until);
  const plan = aStringOrNull(held.plan);
  const transaction = aStringOrNull(held.transaction);

  if (
    typeof state !== 'string' ||
    !theStatesSheCanBeIn.includes(state as WhatSheIsEntitledTo) ||
    typeof held.readAt !== 'string' ||
    until === undefined ||
    plan === undefined ||
    transaction === undefined
  ) {
    return null;
  }

  return { state: state as WhatSheIsEntitledTo, until, plan, transaction, readAt: held.readAt };
}

export function theSettingTableHolds(database: Database): HoldsTheAnswer {
  return {
    read: () => {
      const value = readSetting(database, THE_KEY_THE_ANSWER_IS_HELD_UNDER);

      return value === undefined ? null : theAnswerIn(value);
    },
    hold: (answer) => {
      writeSetting(database, THE_KEY_THE_ANSWER_IS_HELD_UNDER, JSON.stringify(answer));
    },
  };
}
