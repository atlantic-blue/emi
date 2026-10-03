import type { ForecastResult } from '@emi/cycle';
import { washTestID } from '@emi/ui';
import { render, screen } from '@testing-library/react-native';

import { CycleLength, cycleLengthTestID } from '../../src/features/onboarding/CycleLength';
import { Feeling, feelingTestID } from '../../src/features/onboarding/Feeling';
import {
  FirstForecast,
  firstForecastActionTestID,
  firstForecastLearningTestID,
  firstForecastLinesTestID,
  firstForecastNoGuessTestID,
  firstForecastOnThisPhoneTestID,
  firstForecastStillLearningTestID,
  firstForecastRangeTestID,
  firstForecastTitleTestID,
  firstForecastWhyTestID,
} from '../../src/features/onboarding/FirstForecast';
import { Focus, focusTestID } from '../../src/features/onboarding/Focus';
import { Goals, goalTestID } from '../../src/features/onboarding/Goals';
import { HerName, nameFieldTestID } from '../../src/features/onboarding/HerName';
import {
  HoldToBegin,
  holdCoreTestID,
  holdRingTestID,
  holdSaidTestID,
  holdTitleTestID,
} from '../../src/features/onboarding/HoldToBegin';
import { LastPeriod } from '../../src/features/onboarding/LastPeriod';
import {
  onboardingActionTestID,
  onboardingBackTestID,
  onboardingEmblemTestID,
  onboardingHeaderWordTestID,
  onboardingLinesTestID,
  onboardingProgressTestID,
  onboardingSheetTestID,
  onboardingSkipTestID,
  onboardingStepLabelTestID,
  onboardingTitleTestID,
  onboardingWayPastTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { PeriodBefore } from '../../src/features/onboarding/PeriodBefore';
import { PeriodLength, periodLengthTestID } from '../../src/features/onboarding/PeriodLength';
import { Regularity, regularityTestID } from '../../src/features/onboarding/Regularity';
import {
  ThePromise,
  promiseActionTestID,
  promiseLineTestID,
  thePromiseTestID,
} from '../../src/features/onboarding/ThePromise';
import { Today, todayTestID } from '../../src/features/onboarding/Today';
import {
  TourScreen,
  tourActionTestID,
  tourLinesTestID,
  tourSkipTestID,
  tourTitleTestID,
} from '../../src/features/onboarding/TourScreen';
import {
  WhatEmiDoesWithIt,
  whatEmiDoesActionTestID,
  whatEmiDoesCardTestID,
  whatEmiDoesTitleTestID,
} from '../../src/features/onboarding/WhatEmiDoesWithIt';
import { WhatEmiIs } from '../../src/features/onboarding/WhatEmiIs';
import { YearOfBirth } from '../../src/features/onboarding/YearOfBirth';
import { calendarTestID } from '../../src/features/onboarding/Calendar';
import type { FirstRunScreen } from '../../src/features/onboarding/copy';
import {
  defaultCycleLengthDays,
  defaultPeriodLengthDays,
} from '../../src/features/onboarding/firstRun';
import { cycleRingTestID } from '../../src/components/CycleRing';
import { yearWheelTestID } from '../../src/components/YearWheel';
import {
  ConfirmRecoveryCode,
  recoveryEntryTestID,
} from '../../src/features/recovery/ConfirmRecoveryCode';
import {
  recoveryActionTestID,
  recoveryLinesTestID,
  recoveryTitleTestID,
} from '../../src/features/recovery/RecoveryScreen';
import { RecoveryFlow } from '../../src/features/recovery/RecoveryFlow';
import { ShowRecoveryCode, recoveryCodeTestID } from '../../src/features/recovery/ShowRecoveryCode';
import { OnAPhone } from './theSafeArea';
import { type Box, anIPhone16, widthGivenTo } from './theWidthOfARow';
import {
  type Part,
  type PartIdentifiers,
  partsMissing,
  theIdentifiersDrawn,
  thePartsOfTheMockupWithoutItsNotes,
} from './theMockupScreen';

/**
 * The screens of the first run, each one held against the drawing of it.
 *
 * One file for all of them, because the redesign reaches the whole run at once and a part named in
 * one place is a part every screen that draws it is held to. Nothing here presses anything: it
 * renders one screen and reads what the screen drew.
 *
 * A drawing names a part by a component name and a built screen answers by a test identifier, so
 * every drawing below carries a record joining the two. A part the record does not carry fails the
 * comparison and the failure names it, which is how a part nobody built goes red rather than
 * quietly passing.
 */

/** Midday, away from any change of clock, so a calendar reads the same in every timezone. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const threeDaysBack = '2026-05-11';

/** The twenty six characters the recovery flow shows her, which no test reads for its value. */
const aRecoveryCode = 'WRQ48KDM2PXV7HLT9BNFZCXKQJ';

/** What the arithmetic answers for a woman who gave a day, which is a range of two days. */
const aForecastWithARange: ForecastResult = {
  completeCycles: 1,
  kind: 'learning',
  needsCycles: 2,
  start: { from: '2026-06-11', to: '2026-06-15' },
};

/** What it answers for a woman who gave none, which is no range at all. */
const aForecastWithNoRange: ForecastResult = {
  completeCycles: 0,
  kind: 'learning',
  needsCycles: 2,
};

const nothing = (): void => undefined;

/**
 * Every drawing of the first run this step holds a screen to, in the order she meets them.
 *
 * `lastPeriodNext` and `firstForecastLearning` are second states of a screen already in the list
 * rather than screens of their own, so the run is nineteen screens drawn twenty one ways.
 */
export const theFirstRunDrawings = [
  'tour',
  'welcome',
  'name',
  'yearOfBirth',
  'lastPeriod',
  'lastPeriodNext',
  'periodBefore',
  'cycleLength',
  'periodLength',
  'regularity',
  'feeling',
  'goals',
  'focus',
  'todayFirstRun',
  'firstForecast',
  'firstForecastLearning',
  'thePromise',
  'whatEmiDoesWithIt',
  'hold',
  'recoverySetup',
  'recoveryCode',
  'recoveryConfirm',
] as const;

export type FirstRunDrawing = (typeof theFirstRunDrawings)[number];

/**
 * The two screens of the run that draw no bar. The welcome asks her nothing, and the first run log
 * names the day in the middle of its header instead, which is what the prototype draws.
 */
export const theScreensWithNoBar: readonly FirstRunScreen[] = ['welcome', 'today'];

/**
 * The ten questions the prototype draws a bar on. The welcome asks her nothing, and the first run
 * log takes a header naming the day instead, so neither of them is counted along.
 */
export const theQuestionsTheBarCounts: readonly FirstRunDrawing[] = [
  'name',
  'yearOfBirth',
  'lastPeriod',
  'periodBefore',
  'cycleLength',
  'periodLength',
  'regularity',
  'feeling',
  'goals',
  'focus',
];

/**
 * The frame eleven of the twelve first run screens stand in, so one record answers for all of
 * them. The drawing names the question and the lines under it by the name of the frame both stand
 * in, which is why one part name carries two identifiers.
 */
const theFrame: PartIdentifiers = {
  DropEmblem: [onboardingEmblemTestID],
  OnboardingScreen: [onboardingTitleTestID, onboardingLinesTestID],
  PrimaryButton: [onboardingActionTestID],
  ProgressBar: [onboardingProgressTestID],
  QuestionSheet: [onboardingSheetTestID],
  StepLabel: [onboardingStepLabelTestID],
  Text: [onboardingHeaderWordTestID],
  TextLink: [onboardingBackTestID, onboardingSkipTestID, onboardingWayPastTestID],
};

/** The recovery flow has a frame of its own, in the same three shapes. */
const theRecoveryFrame: PartIdentifiers = {
  PrimaryButton: [recoveryActionTestID],
  Text: [recoveryTitleTestID, recoveryLinesTestID],
};

/** What each part of each drawing is built under, drawing by drawing. */
const theIdentifiersOf: Readonly<Record<FirstRunDrawing, PartIdentifiers>> = {
  cycleLength: { ...theFrame, Stepper: [cycleLengthTestID] },
  feeling: { ...theFrame, SingleChoiceRow: [feelingTestID('fine')] },
  firstForecast: {
    Card: [firstForecastWhyTestID, firstForecastOnThisPhoneTestID],
    FirstForecast: [
      firstForecastTitleTestID,
      firstForecastRangeTestID,
      firstForecastLearningTestID,
    ],
    PrimaryButton: [firstForecastActionTestID],
  },
  firstForecastLearning: {
    Card: [firstForecastStillLearningTestID],
    FirstForecast: [firstForecastTitleTestID, firstForecastLinesTestID],
    PrimaryButton: [firstForecastActionTestID],
    Text: [firstForecastNoGuessTestID],
  },
  focus: { ...theFrame, MultiChoiceRow: [focusTestID('sleep')] },
  goals: { ...theFrame, MultiChoiceRow: [goalTestID('forecast')] },
  hold: {
    CycleRing: [holdRingTestID],
    HoldToBegin: [holdTitleTestID, holdSaidTestID],
    PrimaryButton: [holdCoreTestID],
  },
  lastPeriod: { ...theFrame, Calendar: [calendarTestID] },
  lastPeriodNext: { ...theFrame, Calendar: [calendarTestID] },
  name: { ...theFrame, TextField: [nameFieldTestID] },
  periodBefore: { ...theFrame, Calendar: [calendarTestID] },
  periodLength: { ...theFrame, Stepper: [periodLengthTestID] },
  recoveryCode: {
    ...theRecoveryFrame,
    Text: [recoveryTitleTestID, recoveryCodeTestID, recoveryLinesTestID],
  },
  recoveryConfirm: { ...theRecoveryFrame, TextField: [recoveryEntryTestID] },
  recoverySetup: theRecoveryFrame,
  regularity: { ...theFrame, SingleChoiceRow: [regularityTestID('regular')] },
  thePromise: {
    Card: [promiseLineTestID('encrypted')],
    PrimaryButton: [promiseActionTestID],
    ThePromise: [thePromiseTestID],
  },
  todayFirstRun: { ...theFrame, SelectableTile: [todayTestID('cramps')] },
  tour: {
    CycleRing: [cycleRingTestID],
    PrimaryButton: [tourActionTestID],
    TextLink: [tourSkipTestID],
    TourScreen: [tourTitleTestID, tourLinesTestID],
  },
  welcome: theFrame,
  // The drawing names the sentence about her own groups as a part of its own, and the built screen
  // writes that sentence inside the card about her log, so that card answers for it.
  whatEmiDoesWithIt: {
    Card: [whatEmiDoesCardTestID('forecast')],
    PrimaryButton: [whatEmiDoesActionTestID],
    WhatEmiDoesWithIt: [whatEmiDoesTitleTestID, whatEmiDoesCardTestID('log')],
  },
  yearOfBirth: { ...theFrame, Stepper: [yearWheelTestID] },
};

/**
 * Where a screen draws a part somewhere other than where its drawing places it, and why.
 *
 * Three screens are in this record and the rest answer their drawings in order. A difference is
 * written out rather than left out, because a comparison that quietly skipped a part would read
 * exactly like a comparison the screen answered.
 */
export const theDifferencesTheStepKeeps: Readonly<Partial<Record<FirstRunDrawing, number>>> = {
  // The lines stand above the days rather than under them, so she reads what Emi does with the
  // day before she picks one. Measured on the glass when the line about encryption moved.
  lastPeriod: 1,
  lastPeriodNext: 1,
  // The drawing of the tour is one page carrying the first card and the card about the price, and
  // the built tour draws one card at a time. The card about the price is the fourth of four.
  tour: 1,
  // The drawing and the prototype both put a pill at the foot of the hold. Emi's hold is the ring
  // itself: the press and hold is the write, and a second control that wrote would be a second way
  // to begin.
  hold: 1,
};

/** The screen she is looking at, rendered on a phone that keeps part of its glass. */
export async function sheIsLookingAt(drawing: FirstRunDrawing): Promise<void> {
  await render(<OnAPhone>{theScreenOf(drawing)}</OnAPhone>);
}

function theScreenOf(drawing: FirstRunDrawing): React.ReactElement {
  switch (drawing) {
    case 'tour':
      return <TourScreen card="ring" onBack={nothing} onNext={nothing} onSkip={nothing} />;
    case 'welcome':
      return <WhatEmiIs onContinue={nothing} />;
    case 'name':
      return (
        <HerName onBack={nothing} onContinue={nothing} onSkip={nothing} onType={nothing} typed="" />
      );
    case 'yearOfBirth':
      return (
        <YearOfBirth
          chosen={undefined}
          name={undefined}
          now={whenSheOpensIt}
          onBack={nothing}
          onChoose={nothing}
          onContinue={nothing}
          onSkip={nothing}
        />
      );
    // The question is one screen, and the two drawings are the same screen: the way past is drawn
    // on both, and the drawing of it without one names one part fewer.
    case 'lastPeriod':
    case 'lastPeriodNext':
      return (
        <LastPeriod
          chosen={threeDaysBack}
          now={whenSheOpensIt}
          onBack={nothing}
          onChoose={nothing}
          onContinue={nothing}
          onWayPast={nothing}
        />
      );
    case 'periodBefore':
      return (
        <PeriodBefore
          chosen={undefined}
          lastPeriodStartedOn={threeDaysBack}
          now={whenSheOpensIt}
          onAdd={nothing}
          onBack={nothing}
          onChoose={nothing}
          onSkip={nothing}
        />
      );
    case 'cycleLength':
      return (
        <CycleLength
          days={defaultCycleLengthDays}
          onBack={nothing}
          onChange={nothing}
          onDone={nothing}
        />
      );
    case 'periodLength':
      return (
        <PeriodLength
          days={defaultPeriodLengthDays}
          onBack={nothing}
          onChange={nothing}
          onDone={nothing}
          onNotSure={nothing}
        />
      );
    case 'regularity':
      return (
        <Regularity
          chosen={undefined}
          onBack={nothing}
          onChoose={nothing}
          onContinue={nothing}
          onSkip={nothing}
        />
      );
    case 'feeling':
      return (
        <Feeling
          chosen={undefined}
          onBack={nothing}
          onChoose={nothing}
          onContinue={nothing}
          onSkip={nothing}
        />
      );
    case 'goals':
      return (
        <Goals
          chosen={[]}
          onBack={nothing}
          onContinue={nothing}
          onPress={nothing}
          onSkip={nothing}
        />
      );
    case 'focus':
      return (
        <Focus
          chosen={[]}
          onBack={nothing}
          onContinue={nothing}
          onPress={nothing}
          onSkip={nothing}
        />
      );
    case 'todayFirstRun':
      return (
        <Today
          chosen={[]}
          name={undefined}
          onBack={nothing}
          onPress={nothing}
          onSave={nothing}
          onSkip={nothing}
        />
      );
    case 'firstForecast':
      return (
        <FirstForecast
          cycleLengthDays={defaultCycleLengthDays}
          forecast={aForecastWithARange}
          name={undefined}
          onContinue={nothing}
        />
      );
    case 'firstForecastLearning':
      return (
        <FirstForecast
          cycleLengthDays={defaultCycleLengthDays}
          forecast={aForecastWithNoRange}
          name={undefined}
          onContinue={nothing}
        />
      );
    case 'thePromise':
      return <ThePromise onContinue={nothing} />;
    case 'whatEmiDoesWithIt':
      return <WhatEmiDoesWithIt focus={[]} name={undefined} onContinue={nothing} />;
    case 'hold':
      return <HoldToBegin onHeld={() => Promise.resolve()} />;
    case 'recoverySetup':
      return <RecoveryFlow code={aRecoveryCode} onConfirmed={nothing} opensTheVault={() => true} />;
    case 'recoveryCode':
      return <ShowRecoveryCode code={aRecoveryCode} onContinue={nothing} />;
    default:
      return <ConfirmRecoveryCode onConfirmed={nothing} opensTheVault={() => true} />;
  }
}

/** Every part the drawing places, in its order, each one carrying what it is built under. */
export function whatTheDrawingAsksFor(drawing: FirstRunDrawing): Part[] {
  switch (drawing) {
    case 'tour':
      return thePartsOfTheMockupWithoutItsNotes('tour', theIdentifiersOf.tour);
    case 'welcome':
      return thePartsOfTheMockupWithoutItsNotes('welcome', theIdentifiersOf.welcome);
    case 'name':
      return thePartsOfTheMockupWithoutItsNotes('name', theIdentifiersOf.name);
    case 'yearOfBirth':
      return thePartsOfTheMockupWithoutItsNotes('yearOfBirth', theIdentifiersOf.yearOfBirth);
    case 'lastPeriod':
      return thePartsOfTheMockupWithoutItsNotes('lastPeriod', theIdentifiersOf.lastPeriod);
    case 'lastPeriodNext':
      return thePartsOfTheMockupWithoutItsNotes('lastPeriodNext', theIdentifiersOf.lastPeriodNext);
    case 'periodBefore':
      return thePartsOfTheMockupWithoutItsNotes('periodBefore', theIdentifiersOf.periodBefore);
    case 'cycleLength':
      return thePartsOfTheMockupWithoutItsNotes('cycleLength', theIdentifiersOf.cycleLength);
    case 'periodLength':
      return thePartsOfTheMockupWithoutItsNotes('periodLength', theIdentifiersOf.periodLength);
    case 'regularity':
      return thePartsOfTheMockupWithoutItsNotes('regularity', theIdentifiersOf.regularity);
    case 'feeling':
      return thePartsOfTheMockupWithoutItsNotes('feeling', theIdentifiersOf.feeling);
    case 'goals':
      return thePartsOfTheMockupWithoutItsNotes('goals', theIdentifiersOf.goals);
    case 'focus':
      return thePartsOfTheMockupWithoutItsNotes('focus', theIdentifiersOf.focus);
    case 'todayFirstRun':
      return thePartsOfTheMockupWithoutItsNotes('todayFirstRun', theIdentifiersOf.todayFirstRun);
    case 'firstForecast':
      return thePartsOfTheMockupWithoutItsNotes('firstForecast', theIdentifiersOf.firstForecast);
    case 'firstForecastLearning':
      return thePartsOfTheMockupWithoutItsNotes(
        'firstForecastLearning',
        theIdentifiersOf.firstForecastLearning,
      );
    case 'thePromise':
      return thePartsOfTheMockupWithoutItsNotes('thePromise', theIdentifiersOf.thePromise);
    case 'whatEmiDoesWithIt':
      return thePartsOfTheMockupWithoutItsNotes(
        'whatEmiDoesWithIt',
        theIdentifiersOf.whatEmiDoesWithIt,
      );
    case 'hold':
      return thePartsOfTheMockupWithoutItsNotes('hold', theIdentifiersOf.hold);
    case 'recoverySetup':
      return thePartsOfTheMockupWithoutItsNotes('recoverySetup', theIdentifiersOf.recoverySetup);
    case 'recoveryCode':
      return thePartsOfTheMockupWithoutItsNotes('recoveryCode', theIdentifiersOf.recoveryCode);
    default:
      return thePartsOfTheMockupWithoutItsNotes(
        'recoveryConfirm',
        theIdentifiersOf.recoveryConfirm,
      );
  }
}

/** What the rendered screen does not answer for, given the drawing of that name. */
export function whatTheScreenDoesNotAnswerFor(drawing: FirstRunDrawing): string[] {
  return partsMissing(whatTheDrawingAsksFor(drawing), theIdentifiersDrawn());
}

/**
 * The width the sheet is given on the glass of an iPhone 16. It reaches both edges, so the number
 * is the width of the glass, and a margin or a padding above it would show up here as a smaller one.
 */
export function theWidthOfTheSheet(): number {
  return widthGivenTo(
    screen.getByTestId(onboardingSheetTestID) as unknown as Box,
    anIPhone16.width,
  );
}

/** Whether the wash is drawn at the top of the screen she is looking at. */
export function theWashIsAtTheTop(): boolean {
  return screen.queryByTestId(washTestID) !== null;
}

/** Every part of every drawing of the first run, counted, so a shrinking comparison is visible. */
export function howManyPartsTheFirstRunIsHeldTo(): number {
  return theFirstRunDrawings.reduce(
    (held, drawing) => held + whatTheDrawingAsksFor(drawing).length,
    0,
  );
}
