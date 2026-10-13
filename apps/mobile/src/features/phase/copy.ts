import type { CycleDays, CyclePhaseName } from '@emi/cycle';

import { type WordKey, words } from '../../language';
import type { DiaryRow } from './diary';
import type { PastPhase } from './pastPhases';
import type { PhaseEstimate, PhaseNow } from './phaseNow';

/** The words of the Cycle phase page and of the guidance it opens. */

export type GuideArea = 'mood' | 'food' | 'body' | 'training';

export const guideAreas: readonly GuideArea[] = ['mood', 'food', 'body', 'training'];

export const phasePageCopy = {
  title: words('phase.title'),
  back: words('phase.back'),
  diary: {
    heading: words('phase.diary.heading'),
    note: words('phase.diary.note'),
    allSymptoms: words('phase.diary.allSymptoms'),
    rows: {
      symptoms: words('phase.diary.symptoms'),
      food: words('phase.diary.food'),
      emotions: words('phase.diary.emotions'),
    } satisfies Record<DiaryRow, string>,
  },
  guide: {
    open: words('phase.guide.open'),
    close: words('phase.guide.close'),
    areas: {
      mood: words('phase.guide.mood'),
      food: words('phase.guide.food'),
      body: words('phase.guide.body'),
      training: words('phase.guide.training'),
    } satisfies Record<GuideArea, string>,
  },
  lock: words('onboarding.encrypts'),
} as const;

const theNames: Readonly<Record<CyclePhaseName, WordKey>> = {
  period: 'phase.name.period',
  follicular: 'phase.name.follicular',
  ovulation: 'phase.name.ovulation',
  luteal: 'phase.name.luteal',
};

const theBarNames: Readonly<Record<CyclePhaseName, WordKey>> = {
  period: 'phase.bar.period',
  follicular: 'phase.bar.follicular',
  ovulation: 'phase.bar.ovulation',
  luteal: 'phase.bar.luteal',
};

const thePastHeadings: Readonly<Record<CyclePhaseName, WordKey>> = {
  period: 'phase.past.heading.period',
  follicular: 'phase.past.heading.follicular',
  ovulation: 'phase.past.heading.ovulation',
  luteal: 'phase.past.heading.luteal',
};

const theGuidance: Readonly<Record<CyclePhaseName, Readonly<Record<GuideArea, WordKey>>>> = {
  period: {
    mood: 'phase.guide.period.mood',
    food: 'phase.guide.period.food',
    body: 'phase.guide.period.body',
    training: 'phase.guide.period.training',
  },
  follicular: {
    mood: 'phase.guide.follicular.mood',
    food: 'phase.guide.follicular.food',
    body: 'phase.guide.follicular.body',
    training: 'phase.guide.follicular.training',
  },
  ovulation: {
    mood: 'phase.guide.ovulation.mood',
    food: 'phase.guide.ovulation.food',
    body: 'phase.guide.ovulation.body',
    training: 'phase.guide.ovulation.training',
  },
  luteal: {
    mood: 'phase.guide.luteal.mood',
    food: 'phase.guide.luteal.food',
    body: 'phase.guide.luteal.body',
    training: 'phase.guide.luteal.training',
  },
};

export function phaseTitle(phase: CyclePhaseName): string {
  return words(theNames[phase]);
}

export function dayOfAbout(now: PhaseNow): string {
  return words('phase.dayOf', undefined, { day: now.day, length: now.cycleLengthDays });
}

function theDaysSentence(days: CycleDays): string {
  return days.from === days.to
    ? words('phase.day', undefined, { from: days.from })
    : words('phase.days', undefined, { from: days.from, to: days.to });
}

function theAboutSentence(now: PhaseNow): string {
  const days = now.phaseDays[now.phase];

  switch (now.phase) {
    case 'period':
      return words('phase.about.period');
    case 'follicular':
      return words('phase.about.follicular');
    case 'ovulation':
      return words('phase.about.ovulation', undefined, {
        from: days.from,
        to: days.to,
        day: now.ovulationDay,
      });
    case 'luteal':
      return words('phase.about.luteal');
  }
}

function theEstimateSentence(estimate: PhaseEstimate): string {
  return estimate.kind === 'cycles'
    ? words('phase.estimate.cycles', estimate.count)
    : words('phase.estimate.learning');
}

/** The sentence under the title: the days of the phase, what they are, and what they come from. */
export function phaseLead(now: PhaseNow): string {
  return [
    theDaysSentence(now.phaseDays[now.phase]),
    theAboutSentence(now),
    theEstimateSentence(now.estimate),
  ].join(' ');
}

/** One phase of the bar: its name and its days in her cycle. */
export function barWords(
  phase: CyclePhaseName,
  days: CycleDays,
): { readonly name: string; readonly days: string } {
  const range =
    days.to < days.from
      ? words('phase.bar.none')
      : days.from === days.to
        ? words('phase.bar.day', undefined, { from: days.from })
        : words('phase.bar.days', undefined, { from: days.from, to: days.to });

  return { name: words(theBarNames[phase]), days: range };
}

export function guidanceFor(phase: CyclePhaseName, area: GuideArea): string {
  return words(theGuidance[phase][area]);
}

export function pastHeading(phase: CyclePhaseName): string {
  return words(thePastHeadings[phase]);
}

/** What her past phases say, and only what the counts behind it prove. */
export function pastSentence(past: PastPhase): string {
  if (past.kind === 'waiting') {
    return words('phase.past.waiting');
  }

  const [first, second] = past.noted;
  if (first === undefined) {
    return words('phase.past.nothing');
  }

  const one = { first: first.chip.label, firstCount: first.cycles };

  return second === undefined
    ? words('phase.past.one', past.cycles, one)
    : words('phase.past.two', past.cycles, {
        ...one,
        second: second.chip.label,
        secondCount: second.cycles,
      });
}
