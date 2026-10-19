import type { ForecastResult } from '@emi/cycle';
import { washTestID } from '@emi/ui';
import { render, screen } from '@testing-library/react-native';

import { CycleLength, cycleLengthWheelTestID } from '../../src/features/onboarding/CycleLength';
import { Feeling, feelingTestID } from '../../src/features/onboarding/Feeling';
import {
  FirstForecast,
  firstForecastActionTestID,
  firstForecastLearningTestID,
  firstForecastLinesTestID,
  firstForecastNoGuessTestID,
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
  holdButtonTestID,
  holdRingTestID,
  holdSaidTestID,
  holdTitleTestID,
} from '../../src/features/onboarding/HoldToBegin';
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
import { ThreePeriods } from '../../src/features/onboarding/ThreePeriods';
import { PeriodLength, periodLengthWheelTestID } from '../../src/features/onboarding/PeriodLength';
import { Regularity, regularityTestID } from '../../src/features/onboarding/Regularity';
import { Today, todayTestID } from '../../src/features/onboarding/Today';
import {
  Reminder,
  reminderLineTestID,
  reminderPreviewTestID,
  reminderTestID,
} from '../../src/features/onboarding/Reminder';
import {
  TourScreen,
  tourActionTestID,
  tourLinesTestID,
  tourPriceTestID,
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
import type { FirstRunScreen } from '../../src/features/onboarding/copy';
import { defaultCycleLengthDays } from '../../src/features/onboarding/firstRun';
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
 * `firstForecastLearning` is a second state of a screen already in the list rather than a screen
 * of its own, so the run is nineteen screens drawn twenty ways. The list of her last three periods
 * replaced the two drawings of the last period and the one of the period before.
 */
export const theFirstRunDrawings = [
  'welcome',
  'tour',
  'name',
  'yearOfBirth',
  'cycleLength',
  'periodLength',
  'regularity',
  'feeling',
  'goals',
  'focus',
  'todayFirstRun',
  'reminder',
  'firstForecast',
  'firstForecastLearning',
  'whatEmiDoesWithIt',
  'hold',
  'recoverySetup',
  'recoveryCode',
  'recoveryConfirm',
] as const;

export type FirstRunDrawing = (typeof theFirstRunDrawings)[number];

/**
 * A screen of the first run she can be shown, which is every drawing of the mockups stage and the
 * list of her last three periods. That list is drawn on the redesign canvas only, so it is held to
 * the frame here and to the canvas board by its own tests, not to a drawing of the older stage.
 */
export type FirstRunLook = FirstRunDrawing | 'threePeriods';

/**
 * The two screens of the run that draw no bar. The welcome asks her nothing, and the first run log
 * names the day in the middle of its header instead, which is what the prototype draws.
 */
export const theScreensWithNoBar: readonly FirstRunScreen[] = ['welcome', 'today'];

/**
 * The ten questions the prototype draws a bar on. The welcome asks her nothing, and the first run
 * log takes a header naming the day instead, so neither of them is counted along.
 */
export const theQuestionsTheBarCounts: readonly FirstRunLook[] = [
  'name',
  'yearOfBirth',
  'threePeriods',
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
  cycleLength: { ...theFrame, Stepper: [cycleLengthWheelTestID] },
  feeling: { ...theFrame, SingleChoiceRow: [feelingTestID('fine')] },
  firstForecast: {
    Card: [firstForecastWhyTestID],
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
    PrimaryButton: [holdButtonTestID],
  },
  name: { ...theFrame, TextField: [nameFieldTestID] },
  periodLength: { ...theFrame, Stepper: [periodLengthWheelTestID] },
  recoveryCode: {
    ...theRecoveryFrame,
    Text: [recoveryTitleTestID, recoveryCodeTestID, recoveryLinesTestID],
  },
  recoveryConfirm: { ...theRecoveryFrame, TextField: [recoveryEntryTestID] },
  recoverySetup: theRecoveryFrame,
  regularity: { ...theFrame, SingleChoiceRow: [regularityTestID('regular')] },
  todayFirstRun: { ...theFrame, SelectableTile: [todayTestID('cramps')] },
  reminder: {
    ...theFrame,
    OnboardingScreen: [onboardingTitleTestID, reminderLineTestID],
    ReminderPreview: [reminderPreviewTestID],
    SingleChoiceRow: [reminderTestID('twoDaysBefore')],
  },
  tour: {
    CycleRing: [cycleRingTestID],
    PrimaryButton: [tourActionTestID],
    TextLink: [tourSkipTestID],
    TourScreen: [tourTitleTestID, tourLinesTestID, tourPriceTestID],
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
 * The drawings in this record keep a difference, and the rest answer their drawings in order. A difference is
 * written out rather than left out, because a comparison that quietly skipped a part would read
 * exactly like a comparison the screen answered.
 */
export const theDifferencesTheStepKeeps: Readonly<Partial<Record<FirstRunDrawing, number>>> = {
  // The mockups put the way past in the header. The redesign canvas puts it over the button, so
  // every part above it is counted as drawn before it.
  periodLength: 6,
  // The mockups put the step above the drop, and the redesign canvas puts the drop above the step.
  // The canvas is the later drawing, so the welcome follows it.
  welcome: 1,
  // The mockups put the hint under the goals. The redesign canvas puts it under the title, so the
  // goals follow the canvas.
  goals: 1,
  // The mockups put a line under the year. The redesign canvas draws no line there, only the
  // promise at the foot, so the year follows the canvas.
  yearOfBirth: 1,
  // The mockups put a line under the tiles. The redesign canvas puts "You can skip this." under the
  // title and only the promise under the tiles, so today follows the canvas.
  todayFirstRun: 1,
  // The mockups put the sample under the question and "Not now" over the button. The redesign
  // canvas puts the sample at the top and "Not now" under "Remind me", so the reminder follows it.
  reminder: 2,
  // The mockups put a card about this phone under the why card. The first run no longer draws it,
  // because the welcome links to the page that says who can see her records.
  firstForecast: 1,
};

/** The screen she is looking at, rendered on a phone that keeps part of its glass. */
export async function sheIsLookingAt(drawing: FirstRunLook): Promise<void> {
  await render(<OnAPhone>{theScreenOf(drawing)}</OnAPhone>);
}

function theScreenOf(drawing: FirstRunLook): React.ReactElement {
  switch (drawing) {
    case 'tour':
      return <TourScreen onNext={nothing} onSkip={nothing} />;
    case 'welcome':
      return <WhatEmiIs onContinue={nothing} onWhoCanSee={nothing} />;
    case 'name':
      return (
        <HerName onBack={nothing} onContinue={nothing} onSkip={nothing} onType={nothing} typed="" />
      );
    case 'yearOfBirth':
      return (
        <YearOfBirth
          chosen={undefined}
          now={whenSheOpensIt}
          onBack={nothing}
          onChoose={nothing}
          onContinue={nothing}
          onSkip={nothing}
        />
      );
    case 'threePeriods':
      return (
        <ThreePeriods
          now={whenSheOpensIt}
          onBack={nothing}
          onContinue={nothing}
          onGive={nothing}
          onRemove={nothing}
          onWayPast={nothing}
          periods={[{ lengthDays: 5, startedOn: threeDaysBack }]}
        />
      );
    case 'cycleLength':
      return (
        <CycleLength chosen={undefined} onBack={nothing} onChoose={nothing} onDone={nothing} />
      );
    case 'periodLength':
      return (
        <PeriodLength
          chosen={undefined}
          onBack={nothing}
          onChoose={nothing}
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
          onAllSymptoms={nothing}
          onBack={nothing}
          onPress={nothing}
          onSave={nothing}
          onSkip={nothing}
        />
      );
    // The drawing has the first of the three moments pressed, so the screen is drawn with it.
    case 'reminder':
      return (
        <Reminder
          chosen="twoDaysBefore"
          onBack={nothing}
          onChoose={nothing}
          onNotNow={nothing}
          onRemind={nothing}
        />
      );
    case 'firstForecast':
      return (
        <FirstForecast
          cycleLengthDays={defaultCycleLengthDays}
          forecast={aForecastWithARange}
          onContinue={nothing}
        />
      );
    case 'firstForecastLearning':
      return (
        <FirstForecast
          cycleLengthDays={defaultCycleLengthDays}
          forecast={aForecastWithNoRange}
          onContinue={nothing}
        />
      );
    case 'whatEmiDoesWithIt':
      return <WhatEmiDoesWithIt focus={[]} onContinue={nothing} />;
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
    case 'reminder':
      return thePartsOfTheMockupWithoutItsNotes('reminder', theIdentifiersOf.reminder);
    case 'firstForecast':
      return thePartsOfTheMockupWithoutItsNotes('firstForecast', theIdentifiersOf.firstForecast);
    case 'firstForecastLearning':
      return thePartsOfTheMockupWithoutItsNotes(
        'firstForecastLearning',
        theIdentifiersOf.firstForecastLearning,
      );
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
