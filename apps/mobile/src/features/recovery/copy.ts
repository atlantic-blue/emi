import { recoveryCodeLength } from '@emi/crypto';

import { words } from '../../language';

/**
 * The words of the recovery code. The sentence that matters is the second one on the first screen.
 * Section 7.4 of the design says she is told, before she sees the code, that nobody can recover it
 * for her. That is not a disclaimer. It is the same fact as the one on the front of the product,
 * said from the other side: an Emi that could recover her code is an Emi that could read her days.
 */
export const recoveryCopy = {
  before: {
    title: words('recovery.before.title'),
    lines: [
      words('recovery.before.line.onlyWay'),
      words('recovery.before.line.nobody'),
      words('recovery.before.line.paper'),
    ],
    action: words('recovery.before.action'),
  },
  code: {
    title: words('recovery.code.title'),
    lines: [
      words('recovery.code.line.once', recoveryCodeLength),
      words('recovery.code.line.writeDown'),
    ],
    action: words('recovery.code.action'),
  },
  confirm: {
    title: words('recovery.confirm.title'),
    lines: [words('recovery.confirm.line.checks'), words('recovery.confirm.line.case')],
    action: words('recovery.confirm.action'),
    label: words('recovery.confirm.label', recoveryCodeLength),
    wrong: words('recovery.confirm.wrong'),
  },
} as const;

export const recoveryScreens = ['before', 'code', 'confirm'] as const;

export type RecoveryScreen = (typeof recoveryScreens)[number];

export const recoveryScreenCount = recoveryScreens.length;

export function recoveryStepLabel(screen: RecoveryScreen): string {
  return words('recovery.step', undefined, {
    step: recoveryScreens.indexOf(screen) + 1,
    of: recoveryScreenCount,
  });
}

/**
 * The code, in groups, because 26 characters in a row is 26 chances to lose your place. The groups
 * are how it is shown and never how it is held: `readRecoveryCode` drops the spaces again.
 */
export const recoveryCodeGroupSize = 4;

export function groupedRecoveryCode(code: string): string {
  const groups: string[] = [];

  for (let at = 0; at < code.length; at += recoveryCodeGroupSize) {
    groups.push(code.slice(at, at + recoveryCodeGroupSize));
  }

  return groups.join(' ');
}
