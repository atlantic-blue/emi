/**
 * The words of the first run, in one place, so a test can read them without rendering a screen.
 * Section 9.7 of the design sets the rules they follow: say what happens, never congratulate, no
 * exclamation mark, write the number.
 */
export const firstRunCopy = {
  welcome: {
    title: 'Emi learns your cycle. You keep your data.',
    lines: [
      'Your cycle is worked out on this phone. Nothing is sent anywhere.',
      'There is no account. Emi never asks for your email address or a password.',
      'Emi is not a contraceptive, and it is not a medical device.',
    ],
    action: 'Continue',
  },
  lastPeriod: {
    title: 'When did your last period start?',
    lines: ['The first day you bled. The nearest day you remember is close enough.'],
    action: 'Continue',
  },
  cycleLength: {
    title: 'How long is your cycle, roughly?',
    lines: [
      'Count the first day of one period to the day before the next.',
      'Emi corrects this once it has seen two cycles of your own.',
    ],
    action: 'Done',
  },
} as const;

export const firstRunScreens = ['welcome', 'lastPeriod', 'cycleLength'] as const;

export type FirstRunScreen = (typeof firstRunScreens)[number];

export const firstRunScreenCount = firstRunScreens.length;

export function stepLabel(screen: FirstRunScreen): string {
  return `Step ${firstRunScreens.indexOf(screen) + 1} of ${firstRunScreenCount}`;
}
