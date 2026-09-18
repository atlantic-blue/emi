import { recoveryCodeLength } from '@emi/crypto';

/**
 * The words of the recovery code, in one place, so a test reads them without rendering a screen.
 * Section 9.7 of the design sets the rules: say what happens, never congratulate, no exclamation
 * mark, write the number.
 *
 * The sentence that matters is the second one on the first screen. Section 7.4 of the design says
 * she is told, before she sees the code, that nobody can recover it for her. That is not a
 * disclaimer. It is the same fact as the one on the front of the product, said from the other
 * side: an Emi that could recover her code is an Emi that could read her days.
 */
export const recoveryCopy = {
  before: {
    title: 'Your data is locked to this phone',
    lines: [
      'Emi is about to show you a recovery code. It is the only way back to your cycles if you lose this phone.',
      'Nobody at Emi can recover it for you. An Emi that could recover your code would be an Emi that could read your days.',
      'Write it on paper. Keep the paper where you keep other paper that matters.',
    ],
    action: 'Show my code',
  },
  code: {
    title: 'Your recovery code',
    lines: [
      `${recoveryCodeLength} characters. Emi shows them once and stores them nowhere.`,
      'Write them down now. The next screen asks you to type them back.',
    ],
    action: 'I have written it down',
  },
  confirm: {
    title: 'Type the code back',
    lines: [
      'Emi checks what you type against the code it showed you.',
      'Emi reads upper case and lower case the same way, and ignores the spaces you put in.',
    ],
    action: 'Done',
    label: `Your ${recoveryCodeLength} character recovery code`,
    wrong: 'That is not the code Emi showed you. Read it off the paper and type it again.',
  },
} as const;

export const recoveryScreens = ['before', 'code', 'confirm'] as const;

export type RecoveryScreen = (typeof recoveryScreens)[number];

export const recoveryScreenCount = recoveryScreens.length;

export function recoveryStepLabel(screen: RecoveryScreen): string {
  return `Step ${recoveryScreens.indexOf(screen) + 1} of ${recoveryScreenCount}`;
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
