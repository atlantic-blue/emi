import { words } from '../../language';

/**
 * The words of the first run. Section 9.7 of the design sets the rules they follow: say what
 * happens, never congratulate, no exclamation mark, write the number.
 */
export const firstRunCopy = {
  welcome: {
    title: words('onboarding.welcome.title'),
    lines: [
      words('onboarding.welcome.line.nothingSent'),
      words('onboarding.welcome.line.noAccount'),
      words('onboarding.welcome.line.showsYou'),
    ],
    action: words('onboarding.welcome.action'),
  },
  lastPeriod: {
    title: words('onboarding.lastPeriod.title'),
    lines: [words('onboarding.lastPeriod.line')],
    action: words('onboarding.lastPeriod.action'),
  },
  cycleLength: {
    title: words('onboarding.cycleLength.title'),
    lines: [
      words('onboarding.cycleLength.line.count'),
      words('onboarding.cycleLength.line.corrects'),
    ],
    action: words('onboarding.cycleLength.action'),
  },
  shorter: words('onboarding.cycleLength.shorter'),
  longer: words('onboarding.cycleLength.longer'),
  earlier: words('onboarding.lastPeriod.earlier'),
  earlierMonth: words('onboarding.lastPeriod.earlierMonth'),
  later: words('onboarding.lastPeriod.later'),
  laterMonth: words('onboarding.lastPeriod.laterMonth'),
} as const;

export const firstRunScreens = ['welcome', 'lastPeriod', 'cycleLength'] as const;

export type FirstRunScreen = (typeof firstRunScreens)[number];

export const firstRunScreenCount = firstRunScreens.length;

export function stepLabel(screen: FirstRunScreen): string {
  return words('onboarding.step', undefined, {
    step: firstRunScreens.indexOf(screen) + 1,
    of: firstRunScreenCount,
  });
}

/** How she reads the cycle length she is setting, which is a count and takes the form to match. */
export function cycleLengthDaysLabel(days: number): string {
  return words('onboarding.cycleLength.days', days);
}
