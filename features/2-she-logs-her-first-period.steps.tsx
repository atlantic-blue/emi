import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { type DayRecord } from '@emi/crypto';
import {
  CYCLE_LENGTH_HIGH_DAYS,
  CYCLE_LENGTH_LOW_DAYS,
  CYCLES_BEFORE_A_FORECAST,
  addDays,
  findSymptom,
  type PublishedFigure,
  type PublishedMeasurement,
  publishedFigures,
  symptomGroups,
} from '@emi/cycle';
import {
  Wash,
  bottomNavigationTestID,
  deepestHomeIndicator,
  dockPanelTestID,
  dockRoom,
  tabTestID,
  washFieldGradientID,
  washFieldTestID,
  washTintGradientID,
} from '@emi/ui';
import {
  CONTRAST_FLOOR,
  FULL_TURN_DEGREES,
  GAP_DEGREES,
  ICON_SIZE,
  MINIMUM_TAP_TARGET,
  type PhaseName,
  RING_OPEN_MILLISECONDS,
  colour,
  colours,
  contrastRatio,
  hasRole,
  phaseLabel,
  phaseNames,
  radius,
  stroke,
  textStyle,
  washNames,
  washOfPhase,
  washStops,
  washes,
} from '@emi/tokens';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import { render, waitFor, within } from '@testing-library/react-native';

import { PrimaryButton, SecondaryButton, TextLink } from '../apps/mobile/src/components/Button';
import { Card } from '../apps/mobile/src/components/Card';
import { LockLine, lockLineIconTestID } from '../apps/mobile/src/components/LockLine';
import {
  SettingsRow,
  rowChevronTestID,
  rowDrawingTestID,
  rowTileTestID,
} from '../apps/mobile/src/components/SettingsRow';
import { StatusPill, pillPalette, pillTones } from '../apps/mobile/src/components/StatusPill';
import { RoundIconButton } from '../apps/mobile/src/components/RoundIconButton';
import { Chip } from '../apps/mobile/src/components/Chip';
import {
  MultiChoiceRow,
  SingleChoiceRow,
  rowCheckTestID,
  rowDiscTestID,
  rowRingTestID,
} from '../apps/mobile/src/components/ChoiceRow';
import {
  SelectableTile,
  tileBeadTestID,
  tileCheckTestID,
} from '../apps/mobile/src/components/SelectableTile';
import { Stepper, stepperReadingTestID } from '../apps/mobile/src/components/Stepper';
import { TextField } from '../apps/mobile/src/components/TextField';
import {
  cycleRingTestID,
  ringArcTestID,
  ringTrackTestID,
} from '../apps/mobile/src/components/CycleRing';
import {
  cycleCopy,
  ringCycleLengthWords,
  ringSpokenLabel,
  weekTodayWord,
} from '../apps/mobile/src/features/cycle/copy';
import { WhatEmiIs } from '../apps/mobile/src/features/onboarding/WhatEmiIs';
import { OnAPhone } from '../apps/mobile/tests/fixtures/theSafeArea';
import {
  learningCyclesWantedTestID,
  learningStatedLengthTestID,
  learningTestID,
} from '../apps/mobile/src/features/forecast/Learning';
import { type CycleRow, listCycles } from '../apps/mobile/src/data/cycleRepository';
import type { Database } from '../apps/mobile/src/data/database';
import {
  DayLogError,
  insertDayLog,
  listDayLogs,
  readDayLog,
  updateDayLog,
} from '../apps/mobile/src/data/dayLogRepository';
import { migrate } from '../apps/mobile/src/data/schema';
import { profileRow, readProfile } from '../apps/mobile/src/data/profileRepository';
import { readSetting, settingKeys } from '../apps/mobile/src/data/settingRepository';
import {
  calendarBackTestID,
  calendarEarlierTestID,
  calendarEditPeriodTestID,
  calendarLaterTestID,
  calendarTodayTestID,
} from '../apps/mobile/src/features/calendar/CalendarScreen';
import { daySheetTestID } from '../apps/mobile/src/features/calendar/DaySheet';
import { monthLegendCopy } from '../apps/mobile/src/features/calendar/copy';
import { DAYS_IN_A_WEEK } from '../apps/mobile/src/features/cycle/herWeek';
import { tabs } from '../apps/mobile/src/features/chrome/tabs';
import { dayRefusedBackTestID, dayRefusedCopy } from '../apps/mobile/src/features/log/DayRefused';
import {
  flowLabel,
  flowOptionTestID,
  flowPickerTestID,
} from '../apps/mobile/src/features/log/FlowPicker';
import {
  unexpectedBleedingLineTestID,
  unexpectedBleedingMarkTestID,
} from '../apps/mobile/src/features/log/UnexpectedBleeding';
import { opensOnParameter, theSymptoms } from '../apps/mobile/src/features/log/askedGroup';
import {
  historyArcTestID,
  historyBackTestID,
  historyCycleTestID,
  historyPatternTestID,
  historyPatternsTestID,
  historyScreenTestID,
  historyWaitingTestID,
} from '../apps/mobile/src/features/history/HistoryScreen';
import {
  cycleStripBarTestID,
  cycleStripFillTestID,
  cycleStripLengthTestID,
  cycleStripTestID,
  homeCyclesTestID,
} from '../apps/mobile/src/features/home/CycleStrip';
import { stripsSheReads } from '../apps/mobile/src/features/home/herCycles';
import { cyclesBeforeAPattern } from '../apps/mobile/src/features/home/herPatterns';
import {
  sectionWaitingTestID,
  waitingSections,
} from '../apps/mobile/src/features/home/SectionWaiting';
import { patternsWaitingSentence } from '../apps/mobile/src/features/cycle/patternsWaiting';
import {
  cyclesBeforeATrend,
  cyclesSheReadsAsATrend,
} from '../apps/mobile/src/features/home/herTrend';
import {
  PLOT_HEIGHT,
  homeTrendTestID,
  trendAxisTestID,
  trendBandTestID,
  trendPointTestID,
} from '../apps/mobile/src/features/home/CycleTrend';
import {
  homeCyclesLineTestID,
  homeFiguresLineTestID,
  homeFiguresPressTestID,
  homeForecastTestID,
  homeLogTodayTestID,
  homeNoRingLineTestID,
  homeNoRingTitleTestID,
  homePatternsLineTestID,
  homePatternsPressTestID,
  homeScreenTestID,
  homeTrendCountTestID,
  homeTrendPressTestID,
  roundActionTestID,
} from '../apps/mobile/src/features/home/HomeScreen';
import {
  homeGreetingTestID,
  homeHeaderMarkTestID,
  homeHeaderTestID,
  homeHeaderWordTestID,
} from '../apps/mobile/src/features/home/HomeHeader';
import {
  citationFigureTestID,
  citationIdentifierTestID,
  citationPaperTestID,
  citationRowTestID,
  figuresBackTestID,
  figuresQuotedTestID,
  figuresScreenTestID,
} from '../apps/mobile/src/features/cycle/CitationRow';
import { loggedTodayTestID } from '../apps/mobile/src/features/home/LoggedToday';
import { phaseLineTestID } from '../apps/mobile/src/features/home/PhaseLine';
import {
  cycleLengthSentence,
  cycleSentence,
  patternEvidenceSentence,
} from '../apps/mobile/src/features/history/copy';
import {
  cyclesOutsideReads,
  greeting,
  homeCopy,
  patternCardReads,
  patternWhenReads,
} from '../apps/mobile/src/features/home/copy';
import { logFlowDoneTestID, logFlowTestID } from '../apps/mobile/src/features/log/LogFlow';
import { symptomChipTestID } from '../apps/mobile/src/features/log/SymptomGroup';
import {
  weekDateTestID,
  weekDayTestID,
  weekLetterTestID,
  weekStripTestID,
} from '../apps/mobile/src/features/home/WeekStrip';
import {
  herNumberTestID,
  homeNumbersTestID,
  publishedNumberTestID,
} from '../apps/mobile/src/features/home/MeasuredRow';
import { longerTestID } from '../apps/mobile/src/features/onboarding/CycleLength';
import { nameFieldTestID } from '../apps/mobile/src/features/onboarding/HerName';
import {
  regularityReplyTestID,
  regularityTestID,
} from '../apps/mobile/src/features/onboarding/Regularity';
import { yearTestID } from '../apps/mobile/src/components/YearWheel';
import { periodLengthTestID } from '../apps/mobile/src/features/onboarding/PeriodLength';
import {
  dayTestID,
  weekCellTestIDs,
  weekTestID,
} from '../apps/mobile/src/features/onboarding/Calendar';
import {
  HOLD_MILLISECONDS,
  holdScreenTestID,
} from '../apps/mobile/src/features/onboarding/HoldToBegin';
import {
  onboardingActionTestID,
  onboardingBackTestID,
  onboardingProgressTestID,
  onboardingSkipTestID,
  onboardingTitleTestID,
  onboardingWayPastTestID,
} from '../apps/mobile/src/features/onboarding/OnboardingScreen';
import {
  tourScreenTestID,
  tourSkipTestID,
} from '../apps/mobile/src/features/onboarding/TourScreen';
import {
  settingsDeleteTestID,
  settingsExportTestID,
  settingsScreenTestID,
} from '../apps/mobile/src/features/settings/SettingsScreen';
import {
  deleteActionTestID,
  deleteScreenTestID,
  deletedScreenTestID,
} from '../apps/mobile/src/features/settings/DeleteEverything';
import {
  type TourCard,
  cyclesBeforeAForecastSentence,
  firstRunCopy,
  firstRunScreenCount,
  tourCards,
  tourCopy,
} from '../apps/mobile/src/features/onboarding/copy';
import {
  learningCopy,
  ordinal,
  statedLengthSentence,
} from '../apps/mobile/src/features/forecast/copy';
import {
  monthLabel,
  startOfMonth,
  weekdayLetter,
} from '../apps/mobile/src/features/onboarding/days';
import {
  defaultCycleLengthDays,
  forecastFromHerAnswers,
} from '../apps/mobile/src/features/onboarding/firstRun';
import { resetExpoSqlite } from '../apps/mobile/tests/data/expoSqlite';
import { openTestDatabase } from '../apps/mobile/tests/data/nodeDatabase';
import { aDayRecord } from '../apps/mobile/tests/fixtures/dayRecord';
import {
  itemsInTheKeychain,
  resetExpoSecureStore,
} from '../apps/mobile/tests/fixtures/expoSecureStore';
import {
  firstForecastActionTestID,
  firstForecastLinesTestID,
  firstForecastNoGuessTestID,
  firstForecastRangeTestID,
  firstForecastStillLearningTestID,
  firstForecastTestID,
  firstForecastTitleTestID,
} from '../apps/mobile/src/features/onboarding/FirstForecast';
import {
  promiseActionTestID,
  thePromiseTestID,
} from '../apps/mobile/src/features/onboarding/ThePromise';
import {
  whatEmiDoesActionTestID,
  whatEmiDoesTitleTestID,
} from '../apps/mobile/src/features/onboarding/WhatEmiDoesWithIt';
import {
  sheAnswersEveryQuestion,
  sheAnswersEveryQuestionWithNoDate,
  sheReachesTheLastPeriodQuestion,
} from '../apps/mobile/tests/fixtures/theFirstRun';
import {
  thePartsOfTheDayOneDrawing,
  thePartsTheDayOneDrawingNames,
} from '../apps/mobile/tests/fixtures/theDrawingOfDayOne';
import { sheHoldsTheRing } from '../apps/mobile/tests/fixtures/theHold';
import {
  aBleedingDay,
  dayOf,
  herDatabase,
  herPhoneHolds,
  herPhoneHoldsTheseAnswers,
} from '../apps/mobile/tests/fixtures/herPhone';
import {
  herVault,
  theProfileVaultOnHerPhone,
  theVaultOnHerPhone,
} from '../apps/mobile/tests/fixtures/herVault';
import {
  herPhoneHoldsHerDaysAnd,
  theHeaderCarries,
  theHeaderOfTheDrawing,
  theNameSheGave,
  theOrderTheDrawingPlacesThemIn,
  whatTheHeaderDrew,
  whatTheScreenSheOpensDrew,
} from '../apps/mobile/tests/fixtures/theHeaderSheOpensWith';
import {
  aWeekOfHerMonth,
  herPhoneHoldsThreeRecordedCycles,
  theColumnsOfTheDrawing,
  theCycleDayOver,
  theCycleDaysOfTheDrawing,
  theDatesOfTheDrawing,
  theDayAheadSheCannotOpen,
  theDayTheDrawingsSheetNames,
  theDayTheEarlierDrawingOpens,
  theEarlierMonthOfTheDrawing,
  theMonthBeforeSheOpens,
  theMonthTheEarlierDrawingNames,
  theMonthTwoBeforeSheOpens,
  theSquareSheSees,
  theMonthAndItsSheetOfTheDrawing,
  theSheetSheReads,
  theDatesTheMonthDrew,
  theDaySheOpensTheMonth,
  theDayTheDrawingOutlines,
  theDayTheRingSaysOn,
  theDaysTheDrawingFills,
  theEmptyBoxesOfTheDrawing,
  theEmptyBoxesTheMonthDrew,
  theHeaderAndTheMonthOfTheDrawing,
  theMarkOnTheSquare,
  theMonthSheOpens,
  theMonthSheReads,
  theMonthSheReadsBack,
  theMonthTheDrawingNames,
  theRangeHerNextPeriodMayStartOn,
  theSquaresCountingTheirCycleDayBelowTheDate,
  theSquaresTakingAWidthOfTheirOwn,
  theSquaresTheMonthDrew,
  theSquaresTooShortForAThumb,
  thePhaseTheRingSaysOn,
  theDateInkOn,
  theDiscAroundTheDate,
  theFertileDaysTheRingCounts,
  theLegendDots,
  theLegendSheReads,
  theOvulationDayTheForecastNames,
  thePhaseGroundOn,
  theWeekMeasuredOn,
  whatThePanelHolds,
  whatTheMonthScreenDrew,
} from '../apps/mobile/tests/fixtures/theMonthSheOpens';
import {
  aCycleIsWrittenByHand,
  type HeldDay,
  herPhoneHoldsAPeriodOfFourDays,
  herThreePeriodStarts,
  howManyDaysSheTakesOff,
  sheIsOnThePeriodPicker,
  theChangeLineSheReads,
  theCycleStartsHerDayLogGives,
  theCycleStartsHerPhoneHolds,
  theDayHerNextPeriodMayStartOn,
  theDaySheOpensEmi,
  theDaySheStopped,
  theDaySheTakesOff,
  theDaysEmiHolds,
  theDaysHerPhoneHoldsIn,
  theDaysSheAdds,
  theDaysSheIsLeftHolding,
  theDaysTickedOnThePicker,
  theLeadSheReads,
  theMonthSheCorrects,
  thePartsOfTheRangePickerDrawing,
  theWayToEditHerPeriod,
  whatHerPhoneHoldsOn,
  whatSomebodyListeningHearsOn,
  whatTheRangePickerDrew,
  whenSheOpensEmi,
} from '../apps/mobile/tests/fixtures/thePeriodSheCorrects';
import { editPeriodSaveTestID } from '../apps/mobile/src/features/calendar/PeriodRangePicker';
import { textDrawnOnAPhaseFill } from '../apps/mobile/tests/fixtures/phaseInk';
import {
  theDaySheReachesHerLutealPhase,
  theLargestTheyMayBeDrawn,
  theWordsAStrangerWouldRead,
  theFillOf,
  theFourWordsDrawnOn,
  theFourWordsDrawnTooLargeOn,
  theInkOf,
  thePhaseLineOfTheDrawing,
  thePhaseLineOnTheGlass,
  thePhaseLineSheReads,
  theTopOfTheDrawing,
} from '../apps/mobile/tests/fixtures/thePhaseLineSheReads';
import {
  roundActionProblems,
  roundActionsTooSmallToPress,
  theRoundActionsOnTheGlass,
  theScreenDownToTheRoundActions,
} from '../apps/mobile/tests/fixtures/theRoundActionsUnderTheRing';
import {
  theDrawingOfTheFlow,
  theDrawingOfTheSymptoms,
  theDrawingPlaces,
  theFlowPickerIsOnTheLog,
  theGroupsTheLogDrew,
  theLogProblems,
  whatTheDrawingOpensOn,
  whatTheLogDrew,
} from '../apps/mobile/tests/fixtures/theLogSheLandsOn';
import {
  herPhoneHoldsFourRecordedPeriodDays,
  theDayTheRingSaysFor,
  theDaysOfHerWeekTooSmallToPress,
  theStripMeasuredOn,
  theDaySheOpensIt,
  theDaysOfHerWeek,
  theDaysOfTheDrawingsStrip,
  theDaysTheStripDrew,
  theMarkOnTheDate,
  theStripSheReads,
} from '../apps/mobile/tests/fixtures/theWeekSheOpensWith';
import { partsMissing, theIdentifiersDrawn } from '../apps/mobile/tests/fixtures/theMockupScreen';
import {
  type Measured,
  everySectionMeasured,
  partsNoSectionAnswersFor,
  sectionsBreakingTheRule,
  sectionsClaimingTheSamePart,
  theSectionsOfTheScreenSheOpens,
} from '../apps/mobile/tests/fixtures/everySection';
import {
  type HerDataState,
  type HerDays,
  herPhoneHoldsThisState,
  theStatesOfHerData,
  whatHerPhoneHolds,
} from '../apps/mobile/tests/fixtures/theStatesOfHerData';
import { catalogueFilesOf, samplesUnder } from '../tools/pipeline/sampleWording';
import { approvedDenials, describeClaim, searchableText } from '../tools/pipeline/forbiddenClaims';
import { interfaceClaimsIn } from '../tools/pipeline/interfaceClaims';
import {
  type Described,
  type Screen,
  coloursDrawnIn,
  coloursWithNoName,
  describedIn,
  designSystemDocument,
  namedValues,
  namesDrawnNowhere,
  opaqueBaseOf,
  prototypeDirectory,
  screenSuffix,
} from '../tools/pipeline/prototype';
import {
  gradientNamed,
  paintedWith,
  stopsOf,
  washColoursOf,
} from '../apps/mobile/tests/fixtures/theWashOnTheGlass';
import { thePartsOfTheForecastWithNoDate } from '../apps/mobile/tests/fixtures/theFirstForecastWithNoDate';
import {
  type WaitingDrawn,
  theWaitingSectionsOnTheGlass,
  theWaitingSectionsTheDrawingPlaces,
} from '../apps/mobile/tests/fixtures/theWaitingSections';
import {
  thePartsOfTheDrawingOfARefusedDay,
  whatTheRefusalDrew,
} from '../apps/mobile/tests/fixtures/theDayEmiRefuses';
import {
  type Language,
  type Words,
  catalogueOf,
  languages,
  wordKeys,
  words,
} from '../apps/mobile/src/language';
import {
  herPhoneHoldsNothingForToday,
  theDrawingAfterSheLogged,
  theDrawingBeforeSheLogged,
  theDrawingPlacesTheRow,
  theRowIsOnTheScreen,
  theRowSheReads,
  theScreenDownToTheRing,
  theSymptomsTheDrawingNames,
  theSymptomsTheRowNames,
} from '../apps/mobile/tests/fixtures/whatSheLoggedToday';
import { daysNamedIn, sizedTextIn, textIn } from '../apps/mobile/tests/fixtures/renderedText';
import {
  type DrawnArc,
  theArcsOnTheRing,
  theBeadDegrees,
  theBeadSheSees,
  theEndsOfTheArcs,
  theGroundBetweenTheArcs,
  theMiddleOfTheRing,
} from '../apps/mobile/tests/fixtures/theRingSheReads';
import {
  herCyclesVaryBy,
  herLastCycleRuns,
  herLastPeriodRuns,
  daysOfHerThreeCycles,
} from '../apps/mobile/tests/fixtures/herThreeCycles';
import {
  daysOfHerSixCycles,
  herCycleLengths,
  herCyclesOutsideTheBand,
} from '../apps/mobile/tests/fixtures/herSixCycles';
import {
  daysOfHerRepeatingSymptoms,
  theCyclesEmiReads,
  theSymptomSheLoggedTwice,
  theSymptomsThatCameBack,
} from '../apps/mobile/tests/fixtures/herRepeatingSymptoms';
import {
  homePatternsTestID,
  patternCardEvidenceTestID,
  patternCardTestID,
  patternCardWhenTestID,
} from '../apps/mobile/src/features/home/PatternCard';
import {
  type Control,
  controlsTooSmallToPress,
  daySquaresLeavingTheRowDead,
} from '../apps/mobile/tests/fixtures/tapTargets';
import {
  type Box,
  type Phone,
  aSmallIPhone,
  anIPhone16,
  theRow,
} from '../apps/mobile/tests/fixtures/theWidthOfARow';
import {
  theBodyOfTheScreen,
  theRoomAboveTheContent,
  theRoomAtTheFoot,
  theRoomAtTheTop,
} from '../apps/mobile/tests/fixtures/theBodyOfTheScreen';
import {
  type PlacedBox,
  placedOnTheGlass,
} from '../apps/mobile/tests/fixtures/theHeightDownTheGlass';

jest.mock('expo-sqlite', () => jest.requireActual('../apps/mobile/tests/data/expoSqlite'));
jest.mock('expo-secure-store', () =>
  jest.requireActual('../apps/mobile/tests/fixtures/expoSecureStore'),
);
jest.mock('expo-crypto', () => jest.requireActual('../apps/mobile/tests/fixtures/expoCrypto'));

const feature = loadFeature(join(__dirname, '2-she-logs-her-first-period.feature'));

/** A handler a measurement does not drive, where the part under it takes one all the same. */
const nothing = (): void => undefined;

const appDirectory = join(__dirname, '..', 'apps', 'mobile', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

/** The Thursday of the week the drawing shows, which the week strip scenario is read on. */
const whenSheOpensTheStrip = new Date(`${theDaySheOpensIt}T12:00:00.000Z`);

/** Midday on the day the drawing of the month rings, which is the day she opens it on. */
function whenSheOpensTheMonth(): Date {
  return new Date(`${theDaySheOpensTheMonth()}T12:00:00.000Z`);
}

/** The day she names at her first run, which is five days behind the day she opens Emi. */
const herPeriodStarted = addDays(today, -5);
const sheSaysHerCycleRuns = defaultCycleLengthDays + 2;

/** The name and the year she gives, so her sealed answers hold more than one number. */
const theNameSheGives = 'Ada';
const theYearSheWasBornIn = 1994;

/**
 * How many steps the counter has always said, written out by hand rather than read off the list
 * of screens, so a question that quietly leaves the first run is named here.
 */
const theStepsOfTheFirstRun = 12;
const theCycleLengthIsStepSix = 6;

/**
 * The questions between the cycle length and the three screens she reads rather than answers:
 * her period length, how steady her cycle is, how she feels, her goals, her focus and today.
 */
const theQuestionsLeftAfterTheCycleLength = 6;

/** When the hold ends, which is the instant everything she answered is written at. */
const whenSheFinishesTheHold = new Date(whenSheOpensIt.getTime() + HOLD_MILLISECONDS);

/** Thursday. The day she did not log is the Monday three days behind her. */
const sheForgot = addDays(today, -3);
const aDayAhead = addDays(today, 2);
const notADayAtAll = '2026-02-30';

/** The symptom she marked on the day the drawing of the month names in its sheet. */
const theSymptomSheMarked = theSymptomCalled('cramps');

function theSymptomCalled(slug: string): { readonly slug: string; readonly name: string } {
  const found = findSymptom(slug);

  if (found === undefined) {
    throw new Error(`${slug} is not a symptom Emi offers`);
  }

  return found;
}

const septemberTheFourteenth = '2026-09-14';
const wroteAt = new Date('2026-09-14T08:15:00.000Z');
const changedAt = new Date('2026-09-14T19:40:30.250Z');

interface HerCycles {
  readonly cycleLengthDays: number;
  readonly periodDays: number;
  /** The day of the open cycle she is standing on when she opens Emi. */
  readonly dayOfCycle: number;
}

/**
 * Her days, counted backwards from the day she opens Emi, so the cycle she is in is the one the
 * scenario names. Six complete cycles sit behind it, which is what the forecast reads from.
 */
function herRecordedDays(her: HerCycles): DayRecord[] {
  const thisCycleStarted = addDays(today, -(her.dayOfCycle - 1));
  const records: DayRecord[] = [];

  for (let back = 6; back >= 1; back -= 1) {
    const started = addDays(thisCycleStarted, -back * her.cycleLengthDays);

    for (let day = 0; day < her.periodDays; day += 1) {
      records.push(aBleedingDay(addDays(started, day)));
    }
  }

  for (let day = 0; day < Math.min(her.periodDays, her.dayOfCycle); day += 1) {
    records.push(aBleedingDay(addDays(thisCycleStarted, day)));
  }

  return records;
}

/**
 * Her phone four days into the first period she ever logged, with the name she gave or none at all.
 * Nothing is complete yet, so the forecast is the one that cannot say how sure it is.
 */
async function herPhoneHoldsOnePeriodAnd(name?: string): Promise<void> {
  const started = addDays(today, -3);
  const records: DayRecord[] = [0, 1, 2, 3].map((day) => aBleedingDay(addDays(started, day)));

  await herPhoneHoldsTheseAnswers(
    whenSheOpensIt,
    {
      kind: 'profile',
      cycleLengthDays: sheSaysHerCycleRuns,
      ...(name === undefined ? {} : { name }),
      recordedAt: whenSheOpensIt.toISOString(),
    },
    records,
  );
}

/**
 * The words the screen she opens says after this step, each under the key that holds it. They are
 * written out here rather than read off the catalogue, because a sentence read off the thing it is
 * holding moves with it and catches nothing.
 */
const theHomeScreenSaysInEnglish: Readonly<Record<string, string>> = {
  'cycle.noRing.line': 'Log a day you bled and your cycle appears here.',
  'cycle.noRing.title': 'Your ring is waiting',
  'forecast.confidence.sentence': '{word} confidence, based on your last {cycles} cycles',
  'forecast.cycleMoves': 'Your cycle moves around, so the range is wider.',
  'forecast.fertileWindow.sentence':
    'An estimate based on your last {cycles} cycles. Emi never says a day is safe, because no day is.',
  'forecast.nextPeriod': 'Your next period',
  'forecast.statedLength': "Until then, we're using the {days} day cycle you told us about.",
  'forecast.stillLearning': 'Still getting to know you',
  'home.cycles.line':
    'Each strip is one of your cycles, starting with this one. Tap one to see it in full.',
  'home.doctorRecord':
    "You wanted a record for your doctor. It's ready whenever you are, in Export.",
  'home.greeting': 'Hi, {name}',
  'home.greeting.noName': 'Hi',
  'home.painLine': 'You told us these days can be hard. Start with how much it hurts.',
  'home.patterns.line':
    "A symptom you logged once or twice isn't a pattern, so we won't call it one.",
  'home.trend.allInside': 'All of your last {cycles} fell inside the band.',
  'home.trend.caption': 'Your last {cycles}. The shaded band is the published range.',
  'home.trend.outside': '{outside} of your last {cycles} fell outside the band.',
  'home.waiting.cycles.needs': 'Your numbers arrive with your second period.',
  'home.waiting.cycles.read': "So far we've seen {cycles}.",
  'home.waiting.trend.read': 'Emi draws nothing from nothing, and it holds no sample data.',
};

/** The two keys of this screen whose words change with the number, and every form of each. */
const theHomeScreenCountsInEnglish: Readonly<Record<string, readonly string[]>> = {
  'forecast.cyclesWanted': [
    'We need {count} more full cycle before we can say how sure we are.',
    'We need {count} more full cycles before we can say how sure we are.',
  ],
  'home.waiting.trend.needs': [
    'Your chart appears once {count} cycle is complete.',
    'Your chart appears once {count} cycles are complete.',
  ],
};

/** Every key the screen she opens says, the plain ones and the counted ones together. */
const theKeysOfTheScreenSheOpens: readonly string[] = [
  ...Object.keys(theHomeScreenSaysInEnglish),
  ...Object.keys(theHomeScreenCountsInEnglish),
];

/**
 * The two lines of this screen that name Emi on purpose: the denial the fertile window carries
 * word for word, and the one sentence `sampleWording.ts` allows about drawing nothing.
 */
const theTwoLinesThatNameEmi: readonly string[] = [
  'forecast.fertileWindow.sentence',
  'home.waiting.trend.read',
];

/** How each language writes the second person, which is who this screen is talking to. */
const howEachLanguageSaysYou: Readonly<Record<Language, RegExp>> = {
  en: /(?<!\p{Letter})(you|your)(?!\p{Letter})/iu,
  es: /(?<!\p{Letter})(tu|tus|tú|te|ti)(?!\p{Letter})/iu,
  ru: /(?<!\p{Letter})(вы|ваш|ваши|вас|вам)/iu,
};

/** One language's catalogue, read by key rather than by type, so a new key needs no cast. */
function theCatalogueOf(language: Language): Readonly<Record<string, Words>> {
  return Object.fromEntries(Object.entries(catalogueOf(language)));
}

/** Every word this screen says in one language, out of that language's own catalogue. */
function theWordsOfTheScreenSheOpensIn(language: Language, keys = theKeysOfTheScreenSheOpens) {
  const catalogue = theCatalogueOf(language);

  return keys.flatMap((key) => formsOf(catalogue[key] ?? ''));
}

/**
 * The words the log and the period editor say after this step, each under the key that holds it.
 * They are written out here rather than read off the catalogue, because a sentence read off the
 * thing it is holding moves with it and catches nothing.
 */
const theLogAndTheEditorSayInEnglish: Readonly<Record<string, string>> = {
  'calendar.editPeriod.added': 'Added {days}.',
  'calendar.editPeriod.leadWithNoDay': 'Tap the days you bled. Nothing is marked this month yet.',
  'calendar.editPeriod.noDayLeft': 'A period needs at least one day. Tap a day you bled.',
  'calendar.editPeriod.removed': 'Removed {days}.',
  'log.day.notADay.line': "That date isn't in the calendar.",
  'log.day.notADay.title': "That's not a day",
  'log.day.notYet.line': "That day hasn't happened yet. You can log today or any day before it.",
  'log.day.notYet.title': 'Not yet',
  'log.energy.heading': "How's your energy?",
  'log.energy.name.3': 'Okay',
  'log.flow.saved': 'Saved on your phone.',
  'log.flow.title': "How's your flow today?",
  'log.sheet.noMatch': 'No symptoms match {query}',
  'log.temperature.hint': 'Take it before you get up.',
  'log.unexpected.invitation':
    "Bleeding that isn't your period? Log it here, and we'll keep an eye on the pattern.",
  'log.unexpected.marked': "Saved to your record. It won't count as the start of a cycle.",
  'log.weight.hint': 'Once a day is plenty.',
};

/** The one key of these two screens whose words change with the number, and both forms of it. */
const theEditorCountsInEnglish: Readonly<Record<string, readonly string[]>> = {
  'calendar.editPeriod.lead': [
    'Tap the days you bled. You have {count} day marked, from {date}.',
    'Tap the days you bled. You have {count} days marked, from {date}.',
  ],
};

/** Every key this step rewrites, the plain ones and the counted one together. */
const theKeysOfTheLogAndTheEditor: readonly string[] = [
  ...Object.keys(theLogAndTheEditorSayInEnglish),
  ...Object.keys(theEditorCountsInEnglish),
];

/** Every word the log and the editor say in one language, out of that language's own catalogue. */
function theWordsOfTheLogAndTheEditorIn(
  language: Language,
  keys: readonly string[] = theKeysOfTheLogAndTheEditor,
): string[] {
  const catalogue = theCatalogueOf(language);

  return keys.flatMap((key) => formsOf(catalogue[key] ?? ''));
}

/**
 * Words that turn her record into a question for a doctor, and words that make a spot sound like
 * an emergency. A woman who is told to worry stops logging, and the pattern she came for is built
 * out of the days she keeps logging.
 */
const adviceAndAlarm: readonly string[] = [
  'doctor',
  'nurse',
  'clinic',
  'consult',
  'seek',
  'advice',
  'should',
  'recommend',
  'treatment',
  'diagnosis',
  'abnormal',
  'unusual',
  'warning',
  'worry',
  'concern',
  'serious',
  'danger',
  'urgent',
  'risk',
  'alert',
];

/**
 * The words the privacy screens, the insights screen, the lock and the recovery code say after
 * this step, each under the key that holds it. Written out here rather than read off the catalogue,
 * because a sentence read off the thing it is holding moves with it and catches nothing.
 */
const thePrivacyScreensSayInEnglish: Readonly<Record<string, string>> = {
  'cycle.figures.quoted':
    "Each figure is quoted in the paper's own words, so you can check it for yourself.",
  'export.failed': "We couldn't save the files. Your phone may be out of space.",
  'export.what':
    'Two files: one you can read or give to your doctor, and one another app can open.',
  'export.where':
    'Nothing is sent anywhere. The files are made on this phone, and you decide who gets them.',
  'history.noCycles': 'No cycles yet. Log a day you bled and this fills in.',
  'history.nothingRepeats':
    "Nothing has come back in 3 cycles yet. Keep logging and we'll show you.",
  'history.patternsNeed': "We'll point out a symptom once it's come back in {needs} cycles.",
  'lock.locked.line': 'Use your face, your fingerprint or your passcode to open it.',
  'lock.locked.refused': 'Still locked. Tap Unlock to try again.',
  'lock.locked.title': 'Emi is locked.',
  'recovery.before.line.nobody':
    "We can't recover it for you. If we could, we could read your days.",
  'recovery.before.line.onlyWay':
    "Next, you'll see a recovery code. It's the only way to get your cycles back if you lose this phone.",
  'recovery.before.line.paper': 'Write it on paper and keep it with your other important papers.',
  'recovery.code.action': "I've written it down",
  'recovery.code.line.once':
    "{count} characters. You'll only see them once, and we don't keep a copy.",
  'recovery.code.line.writeDown': "Write them down now. Next, you'll type them back.",
  'recovery.confirm.line.case': "Capitals and spaces don't matter.",
  'recovery.confirm.line.checks': "Just to check you've got it right.",
  'recovery.confirm.title': 'Type your code back',
  'recovery.confirm.wrong': "That doesn't match. Check your paper and try again.",
  'settings.answer.gaveAtFirstRun': 'You told us {answer} when you started.',
  'settings.delete.line':
    "One press and it's gone. No undo, no waiting period. Nobody at Emi can bring it back, because nobody at Emi can read it.",
  'settings.delete.refused':
    'Your days are gone, but your phone held on to one thing in the keychain. Press again to finish.',
  'settings.deleted.line':
    'This phone holds nothing about you now. You can start fresh whenever you like.',
  'settings.deleted.title': "It's gone.",
  'settings.deleted.withoutTheServer':
    "We couldn't reach our server to remove your account. Nothing can open what's left there: the only key was on this phone, and it went with your days.",
  'settings.settings.answersLine': 'What you told us when you started',
  'settings.settings.deleteLine': "One press, and it's gone for good",
};

const theKeysOfThePrivacyScreens: readonly string[] = Object.keys(thePrivacyScreensSayInEnglish);

/**
 * The two lines of these screens that name Emi on purpose: the claim about who cannot bring her
 * days back, and the lock, which names the application it is holding shut.
 */
const theTwoPrivacyLinesThatNameEmi: readonly string[] = [
  'lock.locked.title',
  'settings.delete.line',
];

/** Every word these screens say in one language, out of that language's own catalogue. */
function theWordsOfThePrivacyScreensIn(
  language: Language,
  keys: readonly string[] = theKeysOfThePrivacyScreens,
): string[] {
  const catalogue = theCatalogueOf(language);

  return keys.flatMap((key) => formsOf(catalogue[key] ?? ''));
}

/** How many complete cycles her phone holds in the middle of her month, before she logs anything. */
const theCyclesBehindHer = 6;

/** The day of the open cycle she is standing on: the middle of her month, nowhere near a period. */
const herMiddleOfTheMonth: HerCycles = {
  cycleLengthDays: 28,
  periodDays: 4,
  dayOfCycle: 14,
};

/** The day each cycle her phone holds started on, which a mark in the middle must leave alone. */
function theCycleStartsOnHerPhone(): string[] {
  return theCyclesHerPhoneHolds().map((cycle) => cycle.startedOn);
}

/** Six periods, four days each, and a Monday she opened at the time and said nothing happened on. */
function herSixPeriodsAndAWrongMonday(): DayRecord[] {
  const cycleLengthDays = 28;
  const herLastPeriodStarted = addDays(sheForgot, -cycleLengthDays);
  const records: DayRecord[] = [];

  for (let back = 5; back >= 0; back -= 1) {
    const started = addDays(herLastPeriodStarted, -back * cycleLengthDays);

    for (let day = 0; day < 4; day += 1) {
      records.push(aBleedingDay(addDays(started, day)));
    }
  }

  records.push({ day: sheForgot, flow: 'none', recordedAt: `${sheForgot}T21:00:00.000Z` });

  return records;
}

interface OpenApp {
  readonly pathname: () => string;
  /** What the address she is on carries, which is how the log is asked to open on the symptoms. */
  readonly searchParams: () => Record<string, string | string[]>;
  /** She puts the phone down and the application goes away. Her phone keeps what was written. */
  readonly close: () => Promise<void>;
}

/**
 * renderRouter hangs its own readers on the promise it returns, so the promise is kept and the
 * resolved view is kept beside it.
 */
async function sheOpens(at: string): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: at });
  const view = await app;

  return {
    pathname: () => app.getPathname(),
    searchParams: () => app.getSearchParams(),
    close: () => view.unmount(),
  };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/**
 * The columns of the dock, in the order it drew them, read off the bar rather than asked for
 * by name. Asking for them by name reads back the order of the ask.
 */
function theColumnsOfTheDock(): string[] {
  return screen
    .getByTestId(dockPanelTestID)
    .children.map((column) =>
      String((column as unknown as { props: { testID: unknown } }).props.testID),
    );
}

async function sheAnswersEveryQuestionOfTheFirstRun(): Promise<void> {
  await sheAnswersEveryQuestion({
    periodStartedOn: herPeriodStarted,
    cycleLengthDays: sheSaysHerCycleRuns,
  });
}

/** What the ring says about the day she is on, read off the ring and not off the arithmetic. */
function theRingSays(): string {
  return String(screen.getByTestId(cycleRingTestID).props.accessibilityLabel);
}

/** The three sentences of the first card, which is the first thing Emi ever says to her. */
const whatTheFirstCardSays = {
  title: 'This ring is your cycle.',
  dot: "The dot is today. The number inside it tells you which day of your cycle you're on.",
  colours:
    'The four colours are the four parts of your cycle: your period, the days after it, the days around ovulation, and the days before your next period.',
};

/**
 * How each language writes the first person plural. The voice says Emi tells her what we do for
 * her, so each catalogue carries its own form of it rather than the English word.
 */
const howEachLanguageSaysWe: Readonly<Record<Language, RegExp>> = {
  en: /(?<!\p{Letter})(we|our)(?!\p{Letter})/iu,
  es: /(?<!\p{Letter})(nos|nuestro|nuestra)(?!\p{Letter})|mos(?!\p{Letter})/iu,
  ru: /(?<!\p{Letter})(мы|наш)/iu,
};

/** Which card of the tour she is on, read off the screen rather than counted by the step. */
function theCardOfTheTourSheIsOn(): TourCard | undefined {
  return tourCards.find((card) => screen.queryByTestId(tourScreenTestID(card)) !== null);
}

function formsOf(held: Words): string[] {
  return typeof held === 'string' ? [held] : Object.values(held);
}

/** Every word of the four cards in one language, out of that language's own catalogue. */
function theWordsOfTheTourIn(language: Language): string[] {
  const catalogue = catalogueOf(language);

  return wordKeys
    .filter((key) => key.startsWith('onboarding.tour.'))
    .flatMap((key) => formsOf(catalogue[key]));
}

/** The way out of the tour, which is on every card and leaves her on the first question. */
async function sheSkipsTheTour(): Promise<void> {
  await shePresses(tourSkipTestID);
}

function everyControlOnTheScreen() {
  return [...screen.queryAllByRole('radio'), ...screen.queryAllByRole('button')];
}

/**
 * A week of the month she is looking at, with the seven boxes that stand in it. The grid keeps a
 * box for a day the month has no room for, so a week holds seven of them whatever month it is.
 */
function aWeekOfTheMonth(): { row: Box; cells: Box[] } {
  const rows = screen.getAllByTestId(weekTestID);
  const last = rows.at(-1);

  if (last === undefined) {
    throw new Error('the calendar drew no weeks, so there was no row to measure');
  }

  return {
    row: last as unknown as Box,
    cells: within(last).getAllByTestId(weekCellTestIDs) as unknown as Box[],
  };
}

function whatWasRecordedOn(day: string): DayRecord | undefined {
  const row = readDayLog(herDatabase(), day);

  return row ? herVault().open(row.payload) : undefined;
}

function theRevisionOf(day: string): number | undefined {
  return readDayLog(herDatabase(), day)?.revision;
}

/** A table on its own, opened and migrated, with no screen and no phone around it. */
function aMigratedTable(): Database {
  const database = openTestDatabase();
  migrate(database);

  return database;
}

function anEnvelopeFor(day: string, flow: DayRecord['flow']): Uint8Array {
  return herVault().seal(aDayRecord({ day, flow, recordedAt: `${day}T08:15:00.000Z` }));
}

function refusalOf(act: () => unknown): string {
  try {
    act();
  } catch (error) {
    if (error instanceof DayLogError) {
      return error.refusal;
    }
    throw error;
  }
  throw new Error('the write was accepted, and a refusal was expected');
}

/** Every word one part of the screen puts in front of her, read as one line. */
function whatItSays(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

/** Everything one waiting section says, both lines of it, read as one line. */
function whatAWaitingSectionSays(section: WaitingDrawn): string {
  return `${section.needs} ${section.read ?? ''}`;
}

/** How many of her cycles are complete, read out of her phone and never off the screen. */
function herCompleteCycles(): number {
  return listCycles(herDatabase()).filter((cycle) => cycle.lengthDays !== null).length;
}

/**
 * What each of the three sections says it needs, in the order the screen draws them. Written out
 * by hand: a sentence read off the catalogue it is holding moves with it and catches nothing.
 */
const theThreeSectionsSayTheyNeed: readonly string[] = [
  'Your numbers arrive with your second period.',
  'Your chart appears once 2 cycles are complete.',
  "We'll point out a symptom once it's come back in 3 cycles.",
];

/** The drawing of day one, below the ring, which places a waiting section for each of the three. */
const theDrawingOfWhatArrivesLater = 'todayEmptyBody';

/** The most recent cycle her phone closed, which is the one her two lengths are read from. */
function theLastCompleteCycleOnHerPhone(): CycleRow {
  const complete = listCycles(herDatabase()).filter((cycle) => cycle.lengthDays !== null);
  const last = complete[complete.length - 1];

  if (last === undefined) {
    throw new Error('her own days were written and no complete cycle was read back');
  }

  return last;
}

/**
 * Her cycles as her phone holds them, most recent first, which is the order the strips are drawn
 * in. The strips are read against the cache, because the cache is where a cycle comes from.
 */
function theCyclesHerPhoneHolds(): CycleRow[] {
  return [...listCycles(herDatabase())]
    .filter((cycle) => !cycle.isPredicted)
    .sort((one, other) => other.startedOn.localeCompare(one.startedOn));
}

/** Every cycle strip on the glass, in the order the screen she opens drew them. */
function theStripsSheReads(): string[] {
  const hers = new Set(theCyclesHerPhoneHolds().map((cycle) => cycleStripTestID(cycle.startedOn)));

  return screen
    .queryAllByTestId(/.+/)
    .map((element) => String(element.props.testID))
    .filter((identifier) => hers.has(identifier));
}

/** The phases one strip drew, which are the phases that cycle had a day for. */
function thePhasesOfTheStrip(startedOn: string): PhaseName[] {
  const drawn = new Set(
    screen.queryAllByTestId(/.+/).map((element) => String(element.props.testID)),
  );

  return phaseNames.filter((phase) => drawn.has(cycleStripFillTestID(startedOn, phase)));
}

/** The days one fill of a strip covers, read off the drawing itself. */
function theDaysOfTheFill(startedOn: string, phase: PhaseName): number {
  const style = StyleSheet.flatten(
    screen.getByTestId(cycleStripFillTestID(startedOn, phase)).props.style,
  ) as { flexGrow?: number };

  return style.flexGrow ?? 0;
}

/** The days one arc of the same cycle covers on the Insights screen. */
function theDaysOfTheArc(startedOn: string, phase: PhaseName): number {
  const style = StyleSheet.flatten(
    screen.getByTestId(historyArcTestID(startedOn, phase)).props.style,
  ) as { flexGrow?: number };

  return style.flexGrow ?? 0;
}

/** Every cycle the Insights screen marks as the one she arrived at. */
function theCyclesMarkedOnInsights(): string[] {
  return theCyclesHerPhoneHolds()
    .filter((cycle) => {
      const state = screen.getByTestId(historyCycleTestID(cycle.startedOn)).props
        .accessibilityState as { selected?: boolean } | undefined;

      return state?.selected === true;
    })
    .map((cycle) => cycle.startedOn);
}

/**
 * Her complete cycles as her phone holds them, oldest first, which is the order the chart draws its
 * points in. The chart is read against the cache, because the cache is where a cycle comes from.
 */
function theCompleteCyclesHerPhoneHolds(): CycleRow[] {
  return [...listCycles(herDatabase())]
    .filter((cycle) => !cycle.isPredicted && cycle.lengthDays !== null)
    .sort((one, other) => one.startedOn.localeCompare(other.startedOn))
    .slice(-cyclesSheReadsAsATrend);
}

/** Every point of the trend chart on the glass, in the order the screen she opens drew them. */
function thePointsSheReads(): string[] {
  const drawn = new Set(
    screen.queryAllByTestId(/.+/).map((element) => String(element.props.testID)),
  );

  return theCompleteCyclesHerPhoneHolds()
    .map((cycle) => trendPointTestID(cycle.startedOn))
    .filter((identifier) => drawn.has(identifier));
}

/** The band behind the points, read off the drawing: the top of it and the bottom of it. */
function theBandBehindThePoints(): { top: number; bottom: number } {
  const band = screen.getByTestId(trendBandTestID).props as { y: number; height: number };

  return { bottom: band.y + band.height, top: band.y };
}

/** Where one point sits down the plot, read off the drawing. */
function theHeightOfThePoint(startedOn: string): number {
  return (screen.getByTestId(trendPointTestID(startedOn)).props as { cy: number }).cy;
}

/**
 * The days a height down the plot stands for, worked out from the two numbers printed beside the
 * axis and from nothing the chart holds. A reader with those two numbers gets this, which is why
 * they are printed.
 */
function theDaysAtTheHeight(height: number): number {
  const low = Number(whatItSays(trendAxisTestID('low')));
  const high = Number(whatItSays(trendAxisTestID('high')));

  return high - (height * (high - low)) / PLOT_HEIGHT;
}

/**
 * The points a reader counts as sitting outside the band, by looking at the points and the band.
 * A coordinate is drawn to two decimal places, so a point on the edge of the band is read as on it
 * rather than as outside it.
 */
function thePointsDrawnOutsideTheBand(): number[] {
  const band = theBandBehindThePoints();
  const onTheEdge = 0.05;

  return theCompleteCyclesHerPhoneHolds()
    .map((cycle) => theHeightOfThePoint(cycle.startedOn))
    .filter((height) => height < band.top - onTheEdge || height > band.bottom + onTheEdge);
}

/**
 * Every pattern card on the glass, read off the section rather than asked for by name. Asking for
 * the cards she is expected to read back would hide a card for a symptom that came back twice.
 */
function theCardsSheReads(): string[] {
  return screen
    .getByTestId(homePatternsTestID)
    .children.map((card) =>
      String((card as unknown as { props: { testID: unknown } }).props.testID),
    );
}

/** Every symptom the Insights screen names, read off its list the same way. */
function theSymptomsInsightsNames(): string[] {
  return screen
    .getByTestId(historyPatternsTestID)
    .children.map((row) => String((row as unknown as { props: { testID: unknown } }).props.testID));
}

/** Every word of the section of cards, as one line, which is what a stranger could read. */
function whatTheSectionSays(): string {
  return [
    whatItSays(homePatternsTestID),
    whatItSays(homePatternsLineTestID),
    whatItSays(homePatternsPressTestID),
  ].join(' ');
}

/** Every whole number the section prints, so each one can be held to a count of her own. */
function theNumbersTheSectionPrints(): number[] {
  return [...whatTheSectionSays().matchAll(/\d+/g)].map((found) => Number(found[0]));
}

/** How many of her own days carry one symptom, read back out of her phone and not out of a card. */
function theDaysSheLogged(slug: string): number {
  const vault = herVault();

  return listDayLogs(herDatabase())
    .map((row) => vault.open(row.payload))
    .filter((record) => (record.symptoms ?? []).includes(slug)).length;
}

/** Every symptom the Insights screen marks as the one she arrived at. */
function theSymptomsMarkedOnInsights(): string[] {
  return theSymptomsInsightsNames().filter((identifier) => {
    const state = screen.getByTestId(identifier).props.accessibilityState as
      { selected?: boolean } | undefined;

    return state?.selected === true;
  });
}

/** The address the drawing of the page that says where the figures come from gives it. */
const theFiguresPage = '/cycles/figures';

/** The measurement each row of that page is about, in the order the page draws them. */
function theRowsSheReads(): PublishedMeasurement[] {
  const measurements: PublishedMeasurement[] = [
    'cycle-length',
    'period-duration',
    'cycle-length-variation',
  ];

  return screen
    .queryAllByTestId(/.+/)
    .map((element) => String(element.props.testID))
    .flatMap((identifier) =>
      measurements.filter((measures) => identifier === citationRowTestID(measures)),
    );
}

/**
 * The one list of published figures, as the arithmetic ships it, and a way to change it.
 *
 * Nothing is mocked. The page is meant to quote the arithmetic rather than keep a copy of it, so
 * the only way to show that is to change the arithmetic and open the page again. A page that had
 * typed a figure of its own would keep drawing the old one.
 */
const theFiguresTheArithmeticShips: readonly PublishedFigure[] = [...publishedFigures];

function theArithmeticHolds(figures: readonly PublishedFigure[]): void {
  const held = publishedFigures as PublishedFigure[];

  held.splice(0, held.length, ...figures);
}

/** The same measurement, reported by another paper with another range and another identifier. */
const anotherPaperReportsTheCycleLength: PublishedFigure = {
  measures: 'cycle-length',
  value: { kind: 'range', low: 20, high: 41 },
  unit: 'days',
  citation: {
    source: 'A later cohort, reported somewhere else',
    doi: '10.0000/another.paper',
    figure: 'menstrual cycle frequency, reported as 20 to 41 days',
  },
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(whenSheOpensIt);
  resetExpoSqlite();
  resetExpoSecureStore();
  // The ring's one movement is its own pair of scenarios below. Everywhere else it arrives
  // already open, so what a step reads off it is the shape and never a frame of an animation.
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
});

afterEach(() => {
  // A scenario that changed the published figures and then failed would leave every scenario after
  // it reading an arithmetic nobody ships, so the list goes back whatever happened.
  theArithmeticHolds(theFiguresTheArithmeticShips);
  jest.useRealTimers();
  jest.restoreAllMocks();
});

defineFeature(feature, (test) => {
  test('SCREEN-1, her first run ends on the home screen with her period recorded', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
    });

    and('she answers every question of the first run', async () => {
      await sheAnswersEveryQuestionOfTheFirstRun();
    });

    and('she presses and holds the ring', async () => {
      await sheHoldsTheRing();
    });

    then('she is looking at the home screen', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    and('her phone holds the day she said her period started', async () => {
      const row = readDayLog(herDatabase(), herPeriodStarted);
      // The key is the one her first run drew, read back out of the keychain, because no
      // scenario knows it in advance.
      const vault = await theVaultOnHerPhone();

      expect(row && vault.open(row.payload)).toEqual({
        day: herPeriodStarted,
        flow: 'medium',
        recordedAt: whenSheFinishesTheHold.toISOString(),
      });
    });

    and('her phone holds the cycle length she gave', async () => {
      expect(readProfile(herDatabase(), await theProfileVaultOnHerPhone())?.cycleLengthDays).toBe(
        sheSaysHerCycleRuns,
      );
    });
  });

  test('SCREEN-1, she answers everything, leaves before the hold, and nothing is written', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
    });

    and('she answers every question of the first run', async () => {
      await sheAnswersEveryQuestionOfTheFirstRun();
      expect(app.pathname()).toBe('/onboarding/hold');
    });

    and('she closes Emi at the hold, without holding the ring', async () => {
      await app.close();
    });

    then('her phone holds no day, no answers and no marker', () => {
      expect(listDayLogs(herDatabase())).toEqual([]);
      expect(profileRow(herDatabase())).toBeUndefined();
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBeUndefined();
    });

    and('opening Emi again asks her the same questions', async () => {
      const again = await sheOpens('/');

      expect(again.pathname()).toBe('/onboarding/welcome');
    });
  });

  test('SCREEN-1, she presses Done twice and her first run is written once', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
    });

    and(
      'she answers every question, and presses Done a second time before the screen goes',
      async () => {
        await shePresses(onboardingActionTestID);
        await shePresses(onboardingSkipTestID);
        await shePresses(onboardingSkipTestID);
        await shePresses(dayTestID(herPeriodStarted));
        await shePresses(onboardingActionTestID);
        await shePresses(onboardingSkipTestID);

        for (let pressed = defaultCycleLengthDays; pressed < sheSaysHerCycleRuns; pressed += 1) {
          await shePresses(longerTestID);
        }

        await shePresses(onboardingActionTestID);

        // Both presses land before the screen redraws. That is what her second press meets
        // while the question after it is still on its way.
        const done = screen.getByTestId(onboardingActionTestID);
        await act(async () => {
          fireEvent.press(done);
          fireEvent.press(done);
        });
        await shePresses(onboardingSkipTestID);
        await shePresses(onboardingSkipTestID);
        await shePresses(onboardingSkipTestID);
        await shePresses(onboardingSkipTestID);
        await shePresses(onboardingSkipTestID);
        await shePresses(firstForecastActionTestID);
        await shePresses(promiseActionTestID);
        await shePresses(whatEmiDoesActionTestID);
      },
    );

    and('she presses and holds the ring', async () => {
      await sheHoldsTheRing();
    });

    then('she is looking at the home screen', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    and('her phone holds one day, the day she said her period started', () => {
      expect(listDayLogs(herDatabase()).map((row) => row.day)).toEqual([herPeriodStarted]);
    });

    and(
      'her phone holds the time of the hold, and one instant on all three of her answers',
      async () => {
        const row = readDayLog(herDatabase(), herPeriodStarted);
        const vault = await theVaultOnHerPhone();

        expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBe(
          whenSheFinishesTheHold.toISOString(),
        );
        expect(row && vault.open(row.payload).recordedAt).toBe(
          whenSheFinishesTheHold.toISOString(),
        );
        expect(
          (await theProfileVaultOnHerPhone()) &&
            readProfile(herDatabase(), await theProfileVaultOnHerPhone())?.recordedAt,
        ).toBe(whenSheFinishesTheHold.toISOString());
      },
    );
  });

  test('SCREEN-1, the first run asks its questions and the hold after them', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;
    const visited: string[] = [];
    const whatEachScreenSaid: string[] = [];

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
      visited.push(app.pathname());
      whatEachScreenSaid.push(screen.getByText(firstRunCopy.welcome.title).props.children);
    });

    and('she answers every question of the first run', async () => {
      await shePresses(onboardingActionTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(dayTestID(herPeriodStarted));
      await shePresses(onboardingActionTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingActionTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(firstForecastActionTestID);
      visited.push(app.pathname());
      await shePresses(promiseActionTestID);
      visited.push(app.pathname());
      await shePresses(whatEmiDoesActionTestID);
      visited.push(app.pathname());
    });

    and('she presses and holds the ring', async () => {
      await sheHoldsTheRing();
    });

    then(
      'she was asked what Emi is, her name, the year she was born, when her last period started, when the period before that started, how long her cycle runs, how long her period lasts, how steady her cycle is, how she feels about it, and what she wants Emi to help with, and what changes with her cycle, and what she feels today',
      () => {
        expect(visited).toEqual([
          '/onboarding/welcome',
          '/onboarding/name',
          '/onboarding/year-of-birth',
          '/onboarding/last-period',
          '/onboarding/period-before',
          '/onboarding/cycle-length',
          '/onboarding/period-length',
          '/onboarding/regularity',
          '/onboarding/feeling',
          '/onboarding/goals',
          '/onboarding/focus',
          '/onboarding/today',
          '/onboarding/first-forecast',
          '/onboarding/the-promise',
          '/onboarding/what-emi-does-with-it',
          '/onboarding/hold',
        ]);
        expect(whatEachScreenSaid).toEqual([firstRunCopy.welcome.title]);
      },
    );

    and('there was no further question to answer', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });
  });

  test('SCREEN-1, the first run asks for no account, no email address and no password', ({
    given,
    when,
    and,
    then,
  }) => {
    const everyFieldShePassed: string[] = [];

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      await sheOpens('/');
      everyFieldShePassed.push(...fieldsDrawn());
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
    });

    and('she answers every question of the first run', async () => {
      await shePresses(onboardingActionTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(dayTestID(herPeriodStarted));
      await shePresses(onboardingActionTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());

      for (let pressed = defaultCycleLengthDays; pressed < sheSaysHerCycleRuns; pressed += 1) {
        await shePresses(longerTestID);
      }

      await shePresses(onboardingActionTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(firstForecastActionTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(promiseActionTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(whatEmiDoesActionTestID);
      everyFieldShePassed.push(...fieldsDrawn());
    });

    and('she presses and holds the ring', async () => {
      await sheHoldsTheRing();
    });

    then('the only thing she could type into was her name', () => {
      expect([...new Set(everyFieldShePassed)]).toEqual([firstRunCopy.name.label]);
      // She reached the home screen, so the run is finished, and the only two answers her
      // phone holds are the two the questions asked her for.
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(settingKeys.filter((key) => /account|email|password|sign.?in/i.test(key))).toEqual([]);
    });
  });

  test('SCREEN-1, she says she does not remember when her last period started and the first run moves on', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
    });

    and('she reaches the question about when her last period started', async () => {
      await sheReachesTheLastPeriodQuestion();

      expect(screen.getByTestId('onboarding-lastPeriod')).toBeTruthy();
    });

    and('she says she does not remember', async () => {
      await shePresses(onboardingWayPastTestID);
    });

    then('she is being asked how long her cycle runs', () => {
      expect(app.pathname()).toBe('/onboarding/cycle-length');
      expect(screen.getByTestId('onboarding-cycleLength')).toBeTruthy();
    });

    and('the question she could not answer is behind her', () => {
      expect(screen.queryByTestId('onboarding-lastPeriod')).toBeNull();
    });
  });

  test('SCREEN-2, the home screen shows the ring, the day of her cycle and the phase she is in', ({
    given,
    when,
    then,
    and,
  }) => {
    let app: OpenApp;

    given('her phone holds six cycles of her own', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 28, periodDays: 4, dayOfCycle: 2 }),
      );
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    then('she is looking at the home screen', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    and('the ring says she is on day 2 of 28, in the period phase', () => {
      expect(theRingSays()).toBe('Day 2 of 28, period');
      // The day is read inside the ring rather than anywhere on the glass, because the week
      // strip draws a date and a cycle day too, and a number found loose could be either.
      expect(within(screen.getByTestId(cycleRingTestID)).getByText('2')).toBeTruthy();
      expect(within(screen.getByTestId(cycleRingTestID)).getByText(phaseLabel.period)).toBeTruthy();
    });

    and('the ring is drawn on the screen she is looking at', () => {
      expect(screen.getByTestId(cycleRingTestID)).toBeTruthy();
      expect(theArcsOnTheRing().length).toBeGreaterThan(0);
    });
  });

  test('SCREEN-2, no word a stranger could read is drawn above 14 points', ({
    given,
    when,
    then,
    and,
  }) => {
    let drawn: { text: string; points: number | undefined }[] = [];

    given('her phone holds six cycles of her own', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 28, periodDays: 4, dayOfCycle: 2 }),
      );
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
      drawn = sizedTextIn(screen.toJSON()).filter(({ text }) =>
        theWordsAStrangerWouldRead.some((word) => text.toLowerCase().includes(word)),
      );
    });

    then(
      'the words period, bleeding, fertile and ovulation are all drawn at 14 points or less',
      () => {
        expect(
          drawn.filter((run) => run.points === undefined || run.points > theLargestTheyMayBeDrawn),
        ).toEqual([]);
      },
    );

    and('at least one of those words is on the screen, so the measurement is of something', () => {
      expect(drawn.length).toBeGreaterThan(0);
    });
  });

  test('SCREEN-2, the screen she opens begins at the top of the glass', ({
    given,
    when,
    then,
    and,
  }) => {
    let app: OpenApp;
    let boxes: PlacedBox[] = [];

    given('her phone holds her answers and not one day', async () => {
      await herPhoneHoldsTheseAnswers(whenSheOpensIt, {
        kind: 'profile',
        cycleLengthDays: sheSaysHerCycleRuns,
        recordedAt: whenSheOpensIt.toISOString(),
      });
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
      boxes = placedOnTheGlass(theScreenSheIsLookingAt(), thePhoneSheHolds);
    });

    then('she is looking at the home screen', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    and('the first thing it says sits at the top of the glass, with no empty room above it', () => {
      expect(theRoomAboveTheContent(theBodyOfTheScreen(boxes))).toBe(0);
    });

    and('the room left over falls under the last thing on it, and not above the first', () => {
      const body = theBodyOfTheScreen(boxes);

      expect(theRoomAtTheFoot(body)).toBeGreaterThan(theRoomAtTheTop(body));
    });
  });

  test('SCREEN-4, she opens the day she got wrong and the ring is redrawn', ({
    given,
    when,
    and,
    then,
  }) => {
    given('her phone holds six periods and a Monday she said nothing happened on', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriodsAndAWrongMonday());
    });

    when('she opens that Monday', async () => {
      await sheOpens(`/day/${sheForgot}`);
    });

    and('she says her period came back that day', async () => {
      await shePresses(flowOptionTestID('heavy'));
    });

    then('that Monday holds the flow she picked', () => {
      expect(whatWasRecordedOn(sheForgot)).toEqual({
        day: sheForgot,
        flow: 'heavy',
        recordedAt: whenSheOpensIt.toISOString(),
      });
    });

    and('the ring says she is on day 4 of 28, in the follicular phase', () => {
      expect(theRingSays()).toBe('Day 4 of 28, follicular');
      expect(screen.getByText(phaseLabel.follicular)).toBeTruthy();
    });
  });

  test('SCREEN-4, an edit raises the revision of the day she changed', ({
    given,
    when,
    and,
    then,
  }) => {
    given('her phone holds six periods and a Monday she said nothing happened on', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriodsAndAWrongMonday());
    });

    when('she opens that Monday', async () => {
      await sheOpens(`/day/${sheForgot}`);
      expect(theRevisionOf(sheForgot)).toBe(1);
    });

    and('she says her period came back that day', async () => {
      await shePresses(flowOptionTestID('heavy'));
    });

    then('that Monday is at revision 2', () => {
      expect(theRevisionOf(sheForgot)).toBe(2);
    });

    and('today holds nothing, because she edited a Monday and not today', () => {
      expect(whatWasRecordedOn(today)).toBeUndefined();
    });
  });

  test('SCREEN-4, a day that has not happened yet is refused', ({ given, when, then, and }) => {
    let app: OpenApp;

    given('her phone holds six periods and a Monday she said nothing happened on', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriodsAndAWrongMonday());
    });

    when('she opens a day two days ahead of today', async () => {
      app = await sheOpens(`/day/${aDayAhead}`);
    });

    then('she is told the day has not happened yet', () => {
      expect(screen.getByText(dayRefusedCopy['day-is-in-the-future'].line)).toBeTruthy();
    });

    and('there is nothing on that screen to pick a flow with', () => {
      expect(screen.queryByTestId(flowOptionTestID('heavy'))).toBeNull();
      expect(screen.queryByTestId(cycleRingTestID)).toBeNull();
    });

    and('pressing back leaves her on the home screen with nothing written', async () => {
      await shePresses(dayRefusedBackTestID);

      expect(app.pathname()).toBe('/');
      expect(whatWasRecordedOn(aDayAhead)).toBeUndefined();
    });
  });

  test('SCREEN-4, an address that is not a day in the calendar is refused', ({
    given,
    when,
    then,
    and,
  }) => {
    given('her phone holds six periods and a Monday she said nothing happened on', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriodsAndAWrongMonday());
    });

    when('she opens the thirtieth of February', async () => {
      await sheOpens(`/day/${notADayAtAll}`);
    });

    then('she is told that is not a day', () => {
      expect(screen.getByText(dayRefusedCopy['day-is-not-a-date'].line)).toBeTruthy();
    });

    and('there is nothing on that screen to pick a flow with', () => {
      expect(screen.queryByTestId(flowOptionTestID('heavy'))).toBeNull();
    });
  });

  test('BRAND-3, her own cycle sizes the four arcs', ({ given, when, then }) => {
    given('her phone holds six cycles of forty five days', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 45, periodDays: 6, dayOfCycle: 30 }),
      );
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then('the ring draws four arcs, each one sized by the days of that phase', () => {
      const arcs = theArcsOnTheRing();
      const forArcs = FULL_TURN_DEGREES - 4 * GAP_DEGREES;

      expect(arcs.map((arc) => arc.phase)).toEqual(['period', 'follicular', 'ovulation', 'luteal']);
      expect(arcs.map((arc) => Math.round(arc.sweepDegrees * 100) / 100)).toEqual(
        [6, 21, 7, 11].map((days) => Math.round(((forArcs * days) / 45) * 100) / 100),
      );
      expect(new Set(arcs.map((arc) => arc.sweepDegrees)).size).toBe(4);
    });
  });

  test('BRAND-3, the arcs and the ground between them cover the whole ring', ({
    given,
    when,
    then,
  }) => {
    given('her phone holds six cycles of forty five days', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 45, periodDays: 6, dayOfCycle: 30 }),
      );
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then('the arcs and the gaps between them come to a whole turn', () => {
      const arcs = theArcsOnTheRing();
      const ground = theGroundBetweenTheArcs();
      const drawn = arcs.reduce((total, arc) => total + arc.sweepDegrees, 0);

      expect(drawn + ground.reduce((total, gap) => total + gap, 0)).toBeCloseTo(
        FULL_TURN_DEGREES,
        6,
      );
    });
  });

  test('BRAND-3, a phase her cycle had no room for is not drawn', ({ given, when, then, and }) => {
    given('her phone holds six cycles of twenty one days', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 21, periodDays: 4, dayOfCycle: 3 }),
      );
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then('a phase of no days is not drawn at all', () => {
      expect(screen.queryByTestId(ringArcTestID('follicular', 'elapsed'))).toBeNull();
      expect(screen.queryByTestId(ringArcTestID('follicular', 'ahead'))).toBeNull();
      expect(theArcsOnTheRing().map((arc) => arc.phase)).not.toContain('follicular');
    });

    and('the arcs and the gaps between them come to a whole turn', () => {
      expect(theArcsOnTheRing()).toHaveLength(3);
      const arcs = theArcsOnTheRing();
      const ground = theGroundBetweenTheArcs();
      const drawn = arcs.reduce((total, arc) => total + arc.sweepDegrees, 0);

      expect(drawn + ground.reduce((total, gap) => total + gap, 0)).toBeCloseTo(
        FULL_TURN_DEGREES,
        6,
      );
    });
  });

  test('BRAND-3, the bead sits on the day she is on and never outside her cycle', ({
    given,
    when,
    then,
    and,
  }) => {
    let early = 0;

    given('her phone holds six cycles of forty five days', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 45, periodDays: 6, dayOfCycle: 3 }),
      );
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
      early = theBeadDegrees();
    });

    then('the bead sits on the day the ring says she is on', () => {
      expect(theRingSays()).toBe('Day 3 of 45, period');

      const period = theArcsOnTheRing().find((arc) => arc.phase === 'period') as DrawnArc;

      expect(early).toBeGreaterThanOrEqual(period.startDegrees);
      expect(early).toBeLessThanOrEqual(period.startDegrees + period.sweepDegrees);
    });

    and('the bead moves further round the ring on a later day', async () => {
      resetExpoSqlite();
      resetExpoSecureStore();
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 45, periodDays: 6, dayOfCycle: 30 }),
      );
      await sheOpens('/');

      const later = theBeadDegrees();
      const ovulation = theArcsOnTheRing().find((arc) => arc.phase === 'ovulation') as DrawnArc;

      expect(theRingSays()).toBe('Day 30 of 45, ovulation');
      expect(later).toBeGreaterThan(early);
      expect(later).toBeLessThanOrEqual(ovulation.startDegrees + ovulation.sweepDegrees);
    });
  });

  test('SEE-1, every boundary between two phases is a gap in the ring', ({ given, when, then }) => {
    given('her phone holds six cycles of forty five days', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 45, periodDays: 6, dayOfCycle: 30 }),
      );
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then('every boundary between two phases is a gap of ground and not a change of colour', () => {
      const ground = theGroundBetweenTheArcs();

      expect(ground.length).toBeGreaterThan(1);

      for (const gap of ground) {
        // Ground first, and the measured width second. A boundary of no degrees is a change of
        // colour and nothing else, and it agrees with the token that says how wide a gap is.
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeCloseTo(GAP_DEGREES, 2);
      }
    });
  });

  test('SEE-1, the ring names in words the phase she is in', ({ given, when, then, and }) => {
    given('her phone holds six cycles of her own', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 28, periodDays: 4, dayOfCycle: 2 }),
      );
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then('the phase she is in is written inside the ring in words', () => {
      // Inside the ring, because the round action under it carries the same word and the question
      // here is what the ring itself names.
      const insideTheRing = within(screen.getByTestId(cycleRingTestID));

      expect(insideTheRing.getByText(phaseLabel.period)).toBeTruthy();
      expect(insideTheRing.queryByText(phaseLabel.luteal)).toBeNull();
    });

    and('a screen reader is told the day and the phase in the same sentence', () => {
      expect(theRingSays()).toBe('Day 2 of 28, period');
    });
  });

  test('SEE-3, every control of the first run is at least 44 points on both axes, apart from a day square', ({
    given,
    when,
    and,
    then,
  }) => {
    const measured: string[][] = [];

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await shePresses(onboardingActionTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await shePresses(onboardingSkipTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await shePresses(onboardingSkipTestID);
      await shePresses(dayTestID(herPeriodStarted));
      await shePresses(onboardingActionTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await shePresses(onboardingSkipTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await shePresses(onboardingActionTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));
    });

    then(
      'every control on each screen of the first run is at least 44 points on both axes, apart from a day square of the month',
      () => {
        expect(measured).toEqual([[], [], [], [], [], []]);
        expect(screen.getByTestId(periodLengthTestID)).toBeTruthy();
      },
    );
  });

  test('SEE-3, a square of the calendar keeps its height and takes its width from the month', ({
    given,
    when,
    and,
    then,
  }) => {
    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    and('she reaches the question about her last period', async () => {
      await sheSkipsTheTour();
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
    });

    then('every square of the month is as high as a thumb needs', () => {
      for (const square of screen.getAllByTestId(/^day-\d/)) {
        expect(StyleSheet.flatten(square.props.style)).toMatchObject({
          minHeight: MINIMUM_TAP_TARGET,
        });
      }
    });

    and(
      'the seven squares of a week fill the width the calendar gives them on an iPhone 16',
      () => {
        const { row, cells } = aWeekOfTheMonth();

        expect(cells).toHaveLength(7);
        expect(theRow(row, cells, anIPhone16.width).rightEdge).toBe(
          theRow(row, cells, anIPhone16.width).width,
        );
      },
    );

    and('no square ends past the right edge of the calendar', () => {
      const { row, cells } = aWeekOfTheMonth();

      for (const phone of [anIPhone16, aSmallIPhone]) {
        const measured = theRow(row, cells, phone.width);

        expect(measured.rightEdge).toBeLessThanOrEqual(measured.width);
      }
    });

    and('the touch of every square reaches half the gap on each side', () => {
      const row = screen.getAllByTestId(weekTestID).at(-1);

      if (row === undefined) {
        throw new Error('the calendar drew no weeks, so there was no row to measure');
      }

      expect(daySquaresLeavingTheRowDead(row, within(row).getAllByTestId(/^day-\d/))).toEqual([]);
    });
  });

  test('SEE-3, a control below the floor is named with the size it was drawn at', ({
    given,
    when,
    then,
    and,
  }) => {
    let tooSmall: string[] = [];

    given('a control drawn at 40 points by 44', () => undefined);

    when('the controls on the screen are measured', () => {
      tooSmall = controlsTooSmallToPress([
        {
          props: {
            testID: 'a-control-nobody-measured',
            style: { minHeight: MINIMUM_TAP_TARGET, minWidth: MINIMUM_TAP_TARGET - 4 },
          },
        },
      ]);
    });

    then('the failure names that control and the size it was drawn at', () => {
      expect(tooSmall).toEqual(['a-control-nobody-measured is 40 by 44']);
    });

    and('a screen with nothing to press is refused rather than passed', () => {
      expect(() => controlsTooSmallToPress([])).toThrow('nothing to press');
    });
  });

  /**
   * Every movement the runner saw, less the ones that take no time.
   *
   * The tab navigator asks the same animation to carry a screen in, and the dock is set to move
   * nothing, so those arrive as transitions of zero milliseconds. They are not a movement she can
   * see, and reading them would make this a test of the navigator rather than of the ring.
   */
  function durationsOf(spy: jest.SpyInstance): number[] {
    return spy.mock.calls
      .map((call) => (call[1] as { duration?: number }).duration ?? 0)
      .filter((duration) => duration > 0);
  }

  test('SEE-4, the ring moves once when she opens it', ({ given, and, when, then }) => {
    let timing: jest.SpyInstance;

    given('her phone holds six cycles of her own', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 28, periodDays: 4, dayOfCycle: 2 }),
      );
    });

    and('her phone is not asking for less motion', () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
      timing = jest.spyOn(Animated, 'timing');
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then('the ring moves once, over six hundred milliseconds', async () => {
      await waitFor(() => expect(timing).toHaveBeenCalled());

      const moved = durationsOf(timing);

      expect(moved.length).toBeGreaterThan(0);
      for (const duration of moved) {
        expect(duration).toBe(RING_OPEN_MILLISECONDS);
      }
    });
  });

  test('SEE-4, the ring stays still when her phone asks for less motion', ({
    given,
    and,
    when,
    then,
  }) => {
    let timing: jest.SpyInstance;

    given('her phone holds six cycles of her own', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 28, periodDays: 4, dayOfCycle: 2 }),
      );
    });

    and('her phone is asking for less motion', () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      timing = jest.spyOn(Animated, 'timing');
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then('the ring does not move at all, and arrives open', async () => {
      await waitFor(() =>
        expect(styleOf(ringTrackTestID)).toMatchObject({ opacity: 1, transform: [{ scale: 1 }] }),
      );
      expect(durationsOf(timing)).toEqual([]);
    });
  });

  test('TABLE-1, her phone keeps the day she logged and raises its revision when she changes it', ({
    given,
    when,
    then,
    and,
  }) => {
    let table: Database;
    let first: { id: string; createdAt: string };

    given('a day log table with nothing in it', () => {
      table = aMigratedTable();
    });

    when('the fourteenth of September is written and then written again', () => {
      const written = insertDayLog(table, {
        day: septemberTheFourteenth,
        payload: anEnvelopeFor(septemberTheFourteenth, 'medium'),
        now: wroteAt,
      });

      first = { id: written.id, createdAt: written.createdAt };

      updateDayLog(table, {
        day: septemberTheFourteenth,
        payload: anEnvelopeFor(septemberTheFourteenth, 'light'),
        now: changedAt,
      });
    });

    then('the day is held once, at revision 2', () => {
      expect(table.all('SELECT day FROM day_log')).toEqual([{ day: septemberTheFourteenth }]);
      expect(readDayLog(table, septemberTheFourteenth)?.revision).toBe(2);
    });

    and('the row keeps the identifier and the creation time it started with', () => {
      const row = readDayLog(table, septemberTheFourteenth);

      expect(row?.id).toBe(first.id);
      expect(row?.createdAt).toBe(first.createdAt);
      expect(row?.updatedAt).toBe(changedAt.toISOString());
    });
  });

  test('TABLE-1, the same day is never held twice', ({ given, when, then }) => {
    let table: Database;
    let refusal: string;

    given('a day log table holding the fourteenth of September', () => {
      table = aMigratedTable();
      insertDayLog(table, {
        day: septemberTheFourteenth,
        payload: anEnvelopeFor(septemberTheFourteenth, 'medium'),
        now: wroteAt,
      });
    });

    when('the fourteenth of September is written a second time', () => {
      refusal = refusalOf(() =>
        insertDayLog(table, {
          day: septemberTheFourteenth,
          payload: anEnvelopeFor(septemberTheFourteenth, 'light'),
          now: changedAt,
        }),
      );
    });

    then('the write is refused, and the table still holds one row', () => {
      expect(refusal).toBe('day-already-written');
      expect(table.all('SELECT day FROM day_log')).toEqual([{ day: septemberTheFourteenth }]);
      expect(readDayLog(table, septemberTheFourteenth)?.revision).toBe(1);
    });
  });

  test('TABLE-1, a day that is not written as a year, a month and a day is refused', ({
    given,
    when,
    then,
    and,
  }) => {
    let table: Database;
    let refusal: string;

    given('a day log table with nothing in it', () => {
      table = aMigratedTable();
    });

    when('a day written as 14-09-2026 is offered to it', () => {
      refusal = refusalOf(() =>
        insertDayLog(table, {
          day: '14-09-2026',
          payload: anEnvelopeFor(septemberTheFourteenth, 'medium'),
          now: wroteAt,
        }),
      );
    });

    then('the write is refused, and the table holds nothing', () => {
      expect(refusal).toBe('day-is-not-a-date');
      expect(table.all('SELECT day FROM day_log')).toEqual([]);
    });

    and('the table itself refuses that day, whatever wrote it', () => {
      expect(() =>
        table.run(
          `INSERT INTO day_log (id, day, payload, revision, created_at, updated_at)
           VALUES (?, ?, ?, 1, ?, ?)`,
          [
            'written-around-the-repository',
            '14-09-2026',
            anEnvelopeFor(septemberTheFourteenth, 'medium'),
            wroteAt.toISOString(),
            wroteAt.toISOString(),
          ],
        ),
      ).toThrow(/CHECK/i);
    });
  });

  test('TABLE-1, a write that does not raise the revision is refused', ({ given, when, then }) => {
    let table: Database;
    let refused: () => unknown;

    given('a day log table holding the fourteenth of September', () => {
      table = aMigratedTable();
      insertDayLog(table, {
        day: septemberTheFourteenth,
        payload: anEnvelopeFor(septemberTheFourteenth, 'medium'),
        now: wroteAt,
      });
    });

    when('that day is changed without raising its revision', () => {
      refused = () =>
        table.run('UPDATE day_log SET payload = ?, revision = revision WHERE day = ?', [
          anEnvelopeFor(septemberTheFourteenth, 'light'),
          septemberTheFourteenth,
        ]);
    });

    then('the table refuses the write and says the revision must rise', () => {
      expect(refused).toThrow(/revision must rise/);
      expect(readDayLog(table, septemberTheFourteenth)?.revision).toBe(1);
    });
  });

  test('TABLE-1, bytes that are not an envelope are refused', ({ given, when, then }) => {
    let table: Database;
    let refusal: string;

    given('a day log table with nothing in it', () => {
      table = aMigratedTable();
    });

    when('a day carrying bytes that are not an envelope is offered to it', () => {
      refusal = refusalOf(() =>
        insertDayLog(table, {
          day: septemberTheFourteenth,
          payload: new Uint8Array([1, 2, 3, 4]),
          now: wroteAt,
        }),
      );
    });

    then('the write is refused, and the table holds nothing', () => {
      expect(refusal).toBe('payload-is-not-an-envelope');
      expect(table.all('SELECT day FROM day_log')).toEqual([]);
    });
  });

  test('TABLE-1, a write that leaves the update time behind the creation time is refused', ({
    given,
    when,
    then,
  }) => {
    let table: Database;
    let refused: () => unknown;

    given('a day log table with nothing in it', () => {
      table = aMigratedTable();
    });

    when('a row whose update time is behind its creation time is offered to it', () => {
      refused = () =>
        table.run(
          `INSERT INTO day_log (id, day, payload, revision, created_at, updated_at)
           VALUES (?, ?, ?, 1, ?, ?)`,
          [
            'written-around-the-repository',
            septemberTheFourteenth,
            anEnvelopeFor(septemberTheFourteenth, 'medium'),
            '2026-09-14T08:15:00.000Z',
            '2026-09-13T08:15:00.000Z',
          ],
        );
    });

    then('the table refuses the write and says so', () => {
      expect(refused).toThrow(/CHECK/i);
      expect(table.all('SELECT day FROM day_log')).toEqual([]);
    });
  });

  test('SCREEN-2, she reads her three cycle numbers beside the published figures', ({
    given,
    when,
    and,
    then,
  }) => {
    let herLastCycle: CycleRow;
    let herCycleLengthOnTheScreenSheOpened = '';
    let herPeriodLengthOnTheScreenSheOpened = '';

    given('her phone holds three cycles of her own', async () => {
      await herPhoneHolds(whenSheOpensIt, daysOfHerThreeCycles(today));
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
      herLastCycle = theLastCompleteCycleOnHerPhone();
    });

    then(
      'she reads how long her last cycle ran, how long her last period ran, and how much her cycles vary',
      () => {
        herCycleLengthOnTheScreenSheOpened = whatItSays(herNumberTestID('cycle-length'));
        herPeriodLengthOnTheScreenSheOpened = whatItSays(herNumberTestID('period-duration'));

        expect(herCycleLengthOnTheScreenSheOpened).toBe(`${herLastCycleRuns} days`);
        expect(herPeriodLengthOnTheScreenSheOpened).toBe(`${herLastPeriodRuns} days`);
        expect(whatItSays(herNumberTestID('cycle-length-variation'))).toBe(
          `${herCyclesVaryBy} days`,
        );
        // Her three numbers are her own days read back, and not three constants this file chose.
        expect([herLastCycle.lengthDays, herLastCycle.periodLengthDays]).toEqual([
          herLastCycleRuns,
          herLastPeriodRuns,
        ]);
      },
    );

    and('beside each of the three she reads the figure a published paper reports', () => {
      for (const figure of publishedFigures) {
        expect(whatItSays(publishedNumberTestID(figure.measures))).not.toBe('');
        expect(figure.citation.source.length).toBeGreaterThan(0);
      }

      expect(whatItSays(publishedNumberTestID('period-duration'))).toBe('up to 8 days');
      expect(whatItSays(publishedNumberTestID('cycle-length-variation'))).toBe('2.6 days');
    });

    and('the published figure beside her cycle length is 24 to 38 days', () => {
      expect(whatItSays(publishedNumberTestID('cycle-length'))).toBe('24 to 38 days');
    });

    and(
      'she is told the published figure is the one the paper reports and the paper is one press away',
      () => {
        expect(whatItSays(homeFiguresLineTestID)).toBe(
          'The published figure is the one the paper reports, and the paper is one press away.',
        );
      },
    );

    and('none of the three numbers is called normal, abnormal or irregular', () => {
      const said = whatItSays(homeNumbersTestID).toLowerCase();

      for (const word of ['normal', 'abnormal', 'irregular']) {
        expect(said).not.toContain(word);
      }
    });

    and(
      'the cycle length she reads here is the one the Insights screen gives that same cycle',
      async () => {
        // The section goes when she leaves it, so what she read is kept above and compared here.
        await shePresses(tabTestID('history'));

        expect(herCycleLengthOnTheScreenSheOpened).toContain(String(herLastCycle.lengthDays));
        expect(whatItSays(historyCycleTestID(herLastCycle.startedOn))).toContain(
          String(herLastCycle.lengthDays),
        );
      },
    );

    and(
      'the period length she reads here is the bleeding the Insights screen gives that same cycle',
      () => {
        expect(herPeriodLengthOnTheScreenSheOpened).toContain(
          String(herLastCycle.periodLengthDays),
        );
        expect(whatItSays(historyCycleTestID(herLastCycle.startedOn))).toContain(
          String(herLastCycle.periodLengthDays),
        );
        expect(herLastCycle.periodLengthDays).not.toBe(herLastCycle.lengthDays);
      },
    );
  });

  test('SCREEN-2, the screen she opens names Emi and greets her by the name she gave', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('her phone holds cycles of her own, and she gave the name Ada', async () => {
      await herPhoneHoldsHerDaysAnd(whenSheOpensIt, today, theNameSheGave);
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    then('the header is the first thing on the screen she opens', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(whatTheScreenSheOpensDrew()[0]).toBe(homeHeaderTestID);
    });

    and('it carries the mark, then the word Emi, then the greeting', () => {
      // The order comes off the drawing rather than off this file, so the three below are the
      // three the drawing places and not three somebody typed in an order that suited them.
      expect(theOrderTheDrawingPlacesThemIn()).toEqual(theHeaderCarries.map((part) => part.name));
      expect(partsMissing(theHeaderCarries, whatTheScreenSheOpensDrew())).toEqual([]);
      expect(whatItSays(homeHeaderWordTestID)).toBe('Emi');
    });

    and('the greeting reads Hi, Ada', () => {
      expect(whatItSays(homeGreetingTestID)).toBe('Hi, Ada');
      expect(whatItSays(homeGreetingTestID)).toBe(greeting(theNameSheGave));
    });

    and('the drawing of this screen puts that header first, and the screen answers for it', () => {
      expect(theHeaderOfTheDrawing().map((part) => part.name)).toEqual(['HomeHeader']);
      expect(partsMissing(theHeaderOfTheDrawing(), whatTheScreenSheOpensDrew())).toEqual([]);
    });

    and('a woman who gave no name reads the mark, the word, and hi on its own', async () => {
      await app.close();
      resetExpoSqlite();
      resetExpoSecureStore();
      await herPhoneHoldsHerDaysAnd(whenSheOpensIt, today);
      await sheOpens('/');

      expect(whatTheHeaderDrew()).toEqual([
        homeHeaderTestID,
        homeHeaderMarkTestID,
        homeHeaderWordTestID,
        homeGreetingTestID,
      ]);
      expect(whatItSays(homeGreetingTestID)).toBe('Hi');
    });
  });

  test('SCREEN-2, she reads the cycle day of every day of her week without pressing anything', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('her phone holds four recorded period days, the last of them today', async () => {
      jest.setSystemTime(whenSheOpensTheStrip);
      await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensTheStrip);
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    then('she reads her whole week, seven days, without pressing anything', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(weekStripTestID)).toBeTruthy();
      expect(theDaysTheStripDrew()).toEqual(theDaysOfHerWeek());
      expect(theDaysTheStripDrew()).toHaveLength(theDaysOfTheDrawingsStrip().length);
      expect(theDaysTheStripDrew()).toContain(theDaySheOpensIt);
    });

    and('above every date is the day of her cycle that date falls on', () => {
      // The cycle days come off the drawing rather than off this file, so the seven below are the
      // seven the drawing counts and not seven somebody typed in an order that suited them.
      expect(theStripSheReads().map((day) => day.cycleDay)).toEqual(
        theDaysOfTheDrawingsStrip().map((day) => day.cycleDay),
      );
    });

    and('every one of those is the day the ring says for that date', () => {
      const read = theStripSheReads().map((day) => day.cycleDay);

      expect(read).toEqual(theDaysOfHerWeek().map((day) => theDayTheRingSaysOn(day)));
      expect(read.filter((day) => Number.isInteger(day))).toHaveLength(
        theDaysOfTheDrawingsStrip().length,
      );
    });

    and('the three days behind today are filled, because she bled on them', () => {
      expect(
        theStripSheReads()
          .slice(0, 3)
          .map((day) => day.mark),
      ).toEqual(['bled', 'bled', 'bled']);
    });

    and('today is ringed', () => {
      expect(theMarkOnTheDate(theDaySheOpensIt)).toBe('today');
    });

    and('tomorrow is a dotted outline, because her period is expected to run into it', () => {
      expect(theMarkOnTheDate(addDays(theDaySheOpensIt, 1))).toBe('forecast');
    });

    and('the two days after that are plain', () => {
      expect(
        theStripSheReads()
          .slice(5)
          .map((day) => day.mark),
      ).toEqual(['plain', 'plain']);
    });
  });

  test('SCREEN-2, she reads her phase and her cycle day as words from across the room', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;
    /** What the whole glass held, kept so the words can be measured after she has moved on. */
    let theGlassOnHerPeriodDay: unknown;

    given('her phone holds four recorded period days, the last of them today', async () => {
      jest.setSystemTime(whenSheOpensTheStrip);
      await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensTheStrip);
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
      theGlassOnHerPeriodDay = screen.toJSON();
    });

    then(
      'under her week she reads the day of her cycle, in type large enough to read across a room',
      () => {
        expect(app.pathname()).toBe('/');
        // The parts and their order come off the drawing rather than off this file, so the line
        // sits where the drawing puts it and not where a test would accept it.
        expect(partsMissing(theTopOfTheDrawing('todayNext'), whatTheScreenSheOpensDrew())).toEqual(
          [],
        );
        expect(thePhaseLineSheReads().day).toBe(thePhaseLineOfTheDrawing('todayNext').day);
        expect(thePhaseLineSheReads().day).toBe(theDayTheRingSaysFor(theDaySheOpensIt));
      },
    );

    and('the phase she is in is written beside it, in words', () => {
      expect(thePhaseLineSheReads().phase.toLowerCase()).toContain('period');
    });

    and('the day of her cycle is drawn far larger than the phase beside it', () => {
      const read = thePhaseLineSheReads();

      expect(read.dayPoints).toBeGreaterThan(read.phasePoints ?? 0);
      expect(read.dayPoints).toBeGreaterThan(theLargestTheyMayBeDrawn * 2);
    });

    and(
      'the words period, bleeding, fertile and ovulation are still drawn at 14 points or less',
      () => {
        expect(theFourWordsDrawnTooLargeOn(theGlassOnHerPeriodDay)).toEqual([]);
        expect(theFourWordsDrawnOn(theGlassOnHerPeriodDay).length).toBeGreaterThan(0);
      },
    );

    and('the phase is written in the ink of that phase, and never on the colour of it', () => {
      expect(thePhaseLineSheReads().phaseColour).toBe(theInkOf('period'));
      expect(thePhaseLineSheReads().phaseColour).not.toBe(theFillOf('period'));
      // The strip above the line draws a date on the period fill, which is a figure rather than
      // a word, so the reading is of the line and it is of something.
      expect(textIn(thePhaseLineOnTheGlass()).length).toBeGreaterThan(0);
      expect(textDrawnOnAPhaseFill(thePhaseLineOnTheGlass())).toEqual([]);
    });

    and('the same screen three weeks later reads her luteal phase the same way', async () => {
      const onHerPeriodDay = thePhaseLineSheReads();

      await app.close();
      resetExpoSqlite();
      resetExpoSecureStore();
      const threeWeeksLater = new Date(`${theDaySheReachesHerLutealPhase}T12:00:00.000Z`);
      jest.setSystemTime(threeWeeksLater);
      await herPhoneHoldsFourRecordedPeriodDays(threeWeeksLater);
      await sheOpens('/');

      const inHerLutealPhase = thePhaseLineSheReads();

      expect(partsMissing(theTopOfTheDrawing('todayLuteal'), whatTheScreenSheOpensDrew())).toEqual(
        [],
      );
      expect(inHerLutealPhase.day).toBe(thePhaseLineOfTheDrawing('todayLuteal').day);
      expect(inHerLutealPhase.day).toBe(theDayTheRingSaysFor(theDaySheReachesHerLutealPhase));
      expect(inHerLutealPhase.phase.toLowerCase()).toContain('luteal');
      expect(inHerLutealPhase.phaseColour).toBe(theInkOf('luteal'));
      // The four words stay where they are whatever the phase, so the word she reads here is
      // drawn at the size the period day drew its own.
      expect(inHerLutealPhase.phasePoints).toBe(onHerPeriodDay.phasePoints);
      expect(inHerLutealPhase.dayPoints).toBe(onHerPeriodDay.dayPoints);
      expect(theFourWordsDrawnTooLargeOn(screen.toJSON())).toEqual([]);
    });
  });

  test('SCREEN-2, she starts a log from the screen she opens in one press', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('her phone holds four recorded period days, the last of them today', async () => {
      jest.setSystemTime(whenSheOpensTheStrip);
      await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensTheStrip);
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    then('under the ring she reads two round actions, in the order the drawing places them', () => {
      expect(app.pathname()).toBe('/');
      // The parts, their order and the count all come off the drawing, so a third action fails
      // here and the failure names the number the drawing places.
      expect(partsMissing(theScreenDownToTheRoundActions(), whatTheScreenSheOpensDrew())).toEqual(
        [],
      );
      expect(roundActionProblems()).toEqual([]);
      expect(theRoundActionsOnTheGlass()).toHaveLength(2);

      const drawn = whatTheScreenSheOpensDrew();

      for (const action of theRoundActionsOnTheGlass()) {
        expect(drawn.indexOf(action)).toBeGreaterThan(drawn.indexOf(cycleRingTestID));
        expect(drawn.indexOf(action)).toBeLessThan(drawn.indexOf(homeForecastTestID));
      }
    });

    and('each of them is at least 44 points on both axes', () => {
      expect(roundActionsTooSmallToPress()).toEqual([]);
      expect(MINIMUM_TAP_TARGET).toBe(44);
    });

    and(
      'there is no Log today button, and no link to the history, the export or the settings',
      () => {
        // The four are named as the strings they were drawn under rather than through a constant,
        // because the constants went with them and a way off an interface has to be tested too.
        for (const gone of ['home-log-today', 'home-history', 'home-export', 'home-settings']) {
          expect(screen.queryByTestId(gone)).toBeNull();
        }
      },
    );

    and('pressing the first one puts her on the log, at the flow picker', async () => {
      const [first] = theRoundActionsOnTheGlass();

      expect(first).toBe(roundActionTestID('period'));
      await shePresses(String(first));

      expect(app.pathname()).toBe('/log');
      expect(screen.getByTestId(flowPickerTestID)).toBeTruthy();
    });

    and('the dock still reaches the history and the privacy screen', async () => {
      await shePresses(tabTestID('history'));

      expect(app.pathname()).toBe('/history');

      await shePresses(tabTestID('settings/index'));

      expect(app.pathname()).toBe('/settings');
      expect(screen.getByTestId(settingsExportTestID)).toBeTruthy();
    });
  });

  test('SCREEN-2, the symptoms action opens the log on the groups and the dock still opens on the flows', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('her phone holds four recorded period days, the last of them today', async () => {
      jest.setSystemTime(whenSheOpensTheStrip);
      await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensTheStrip);
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she presses the symptoms action under the ring', async () => {
      const [, symptoms] = theRoundActionsOnTheGlass();

      expect(symptoms).toBe(roundActionTestID('symptoms'));
      await shePresses(String(symptoms));
    });

    then('she is on the log, and the first thing she can mark there is a symptom', () => {
      expect(app.pathname()).toBe('/log');
      expect(theLogProblems(theDrawingOfTheSymptoms)).toEqual([]);
      expect(app.searchParams()[opensOnParameter]).toBe(theSymptoms);
    });

    and('she passed no flow option on the way to it', () => {
      const drawn = whatTheLogDrew();
      const [firstGroup] = theGroupsTheLogDrew();

      expect(firstGroup).toBeDefined();
      expect(drawn.indexOf(String(firstGroup))).toBeLessThan(drawn.indexOf(flowPickerTestID));
    });

    and('every one of her symptom groups is offered', () => {
      expect(theGroupsTheLogDrew()).toHaveLength(symptomGroups.length);
    });

    and('she can still pick a flow on the same screen', () => {
      expect(theFlowPickerIsOnTheLog()).toBe(true);
    });

    and('the drawing of that screen places a symptom group, and places no flow picker', () => {
      expect(whatTheDrawingOpensOn(theDrawingOfTheSymptoms)).toBe('symptoms');
      expect(theDrawingPlaces(theDrawingOfTheSymptoms, 'symptoms')).toBe(true);
      expect(theDrawingPlaces(theDrawingOfTheSymptoms, 'flow')).toBe(false);
    });

    and('pressing the Log column of the dock opens the log on the flow options', async () => {
      await shePresses(tabTestID('log/index'));

      expect(app.pathname()).toBe('/log');
      expect(app.searchParams()[opensOnParameter]).toBeUndefined();
      expect(theLogProblems(theDrawingOfTheFlow)).toEqual([]);
    });

    and('that is the drawing of the log, which places the flow options before the groups', () => {
      expect(whatTheDrawingOpensOn(theDrawingOfTheFlow)).toBe('flow');
      expect(theDrawingPlaces(theDrawingOfTheFlow, 'symptoms')).toBe(true);
    });
  });

  test('SCREEN-2, she records a symptom and the screen she started on shows it', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given(
      'her phone holds the period days behind today, and nothing at all for today',
      async () => {
        jest.setSystemTime(whenSheOpensTheStrip);
        await herPhoneHoldsNothingForToday(whenSheOpensTheStrip);
      },
    );

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    then(
      'nothing on the screen reads back a log for today, and there is no empty row either',
      () => {
        expect(app.pathname()).toBe('/');
        expect(theRowIsOnTheScreen()).toBe(false);
      },
    );

    and('that is the drawing of the screen she opens, which places no such row', () => {
      expect(theDrawingPlacesTheRow(theDrawingBeforeSheLogged)).toBe(false);
      expect(
        partsMissing(
          theScreenDownToTheRing(theDrawingBeforeSheLogged),
          whatTheScreenSheOpensDrew(),
        ),
      ).toEqual([]);
    });

    when('she presses the symptoms action under the ring', async () => {
      await shePresses(roundActionTestID('symptoms'));

      expect(app.pathname()).toBe('/log');
    });

    and('she marks the two symptoms the drawing names', async () => {
      for (const slug of theSymptomsTheDrawingNames()) {
        await shePresses(symptomChipTestID(slug));
      }
    });

    and('she saves', async () => {
      await shePresses(logFlowDoneTestID);
    });

    then('she is back on the screen she started on', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    and('under the day of her cycle she reads that she logged today', () => {
      const drawn = whatTheScreenSheOpensDrew();

      expect(theRowIsOnTheScreen()).toBe(true);
      expect(theRowSheReads().lead).toBe(homeCopy.loggedToday.lead);
      expect(drawn.indexOf(loggedTodayTestID)).toBeGreaterThan(drawn.indexOf(phaseLineTestID));
      expect(drawn.indexOf(loggedTodayTestID)).toBeLessThan(drawn.indexOf(cycleRingTestID));
    });

    and('the line under it names both symptoms she marked, and no symptom she did not', () => {
      // The screen she is looking at and not the whole glass. The log tab stays mounted behind
      // this one, and contract SCREEN-2 holds the four words small on the home screen alone.
      const glass = screen.getByTestId(homeScreenTestID);

      expect(theSymptomsTheRowNames()).toEqual(theSymptomsTheDrawingNames());
      expect(theFourWordsDrawnTooLargeOn(glass)).toEqual([]);
      expect(theFourWordsDrawnOn(glass).length).toBeGreaterThan(0);
    });

    and('that is the drawing of the screen she comes back to, down to the ring', () => {
      expect(theDrawingPlacesTheRow(theDrawingAfterSheLogged)).toBe(true);
      expect(
        partsMissing(theScreenDownToTheRing(theDrawingAfterSheLogged), whatTheScreenSheOpensDrew()),
      ).toEqual([]);
    });

    and('pressing what she logged opens the log on the symptom groups again', async () => {
      await shePresses(loggedTodayTestID);

      expect(app.pathname()).toBe('/log');
      expect(app.searchParams()[opensOnParameter]).toBe(theSymptoms);
      expect(theLogProblems(theDrawingOfTheSymptoms)).toEqual([]);
    });
  });

  test('SCREEN-4, she opens a month and reads the cycle day of every day in it', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('her phone holds three recorded cycles', async () => {
      jest.setSystemTime(whenSheOpensTheMonth());
      await herPhoneHoldsThreeRecordedCycles(whenSheOpensTheMonth());
    });

    when('she opens the month', async () => {
      app = await sheOpens('/calendar');
    });

    then('she is reading the month the drawing names, in seven columns', () => {
      expect(app.pathname()).toBe('/calendar');
      expect(partsMissing(theHeaderAndTheMonthOfTheDrawing(), whatTheMonthScreenDrew())).toEqual(
        [],
      );
      expect(theMonthSheReads()).toBe(monthLabel(theMonthSheOpens));
      expect(theMonthSheReads()).toContain(theMonthTheDrawingNames());
      expect(theDatesTheMonthDrew()).toEqual(theDatesOfTheDrawing());
      expect(theEmptyBoxesTheMonthDrew()).toBe(theEmptyBoxesOfTheDrawing());
      expect(aWeekOfHerMonth().cells).toHaveLength(theColumnsOfTheDrawing().length);
    });

    and('above every date is the day of her cycle that date falls on', () => {
      // The cycle days come off the drawing rather than off this file, so the numbers below are the
      // ones the drawing counts and not thirty somebody typed in an order that suited them.
      expect(theMonthSheReadsBack().map((square) => square.cycleDay)).toEqual(
        theCycleDaysOfTheDrawing(),
      );
      expect(theSquaresCountingTheirCycleDayBelowTheDate()).toEqual([]);
    });

    and('every one of those is the day the ring says for that date', () => {
      const read = theMonthSheReadsBack().map((square) => square.cycleDay);

      expect(read).toEqual(theSquaresTheMonthDrew().map((day) => theDayTheRingSaysOn(day)));
      expect(read.filter((day) => Number.isInteger(day))).toHaveLength(
        theDatesOfTheDrawing().length,
      );
    });

    and('the days she bled are filled', () => {
      expect(theDaysTheDrawingFills().map((day) => theMarkOnTheSquare(day))).toEqual(
        theDaysTheDrawingFills().map(() => 'bled'),
      );
      expect(theDaysTheDrawingFills().length).toBeGreaterThan(1);
    });

    and('the day her next period is expected on is a dotted outline', () => {
      const mayStart = theRangeHerNextPeriodMayStartOn();

      expect(theMarkOnTheSquare(theDayTheDrawingOutlines())).toBe('forecast');
      expect(theMarkOnTheSquare(mayStart.from)).toBe('forecast');
      expect(theMarkOnTheSquare(addDays(mayStart.from, -1))).toBe('plain');
    });

    and('today is ringed', () => {
      expect(theMarkOnTheSquare(theDaySheOpensTheMonth())).toBe('today');
    });

    and('every square is as high as a thumb needs, and takes its width from the month', () => {
      const week = theWeekMeasuredOn(anIPhone16.width);

      expect(theSquaresTooShortForAThumb()).toEqual([]);
      expect(theSquaresTakingAWidthOfTheirOwn()).toEqual([]);
      expect(week.rightEdge).toBeLessThanOrEqual(week.width);
    });
  });

  test('SCREEN-4, she reaches a month from the screen she opens by pressing her week', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;
    let theDayShePressed: string;

    given('her phone holds three recorded cycles', async () => {
      jest.setSystemTime(whenSheOpensTheMonth());
      await herPhoneHoldsThreeRecordedCycles(whenSheOpensTheMonth());
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    then('every day of the week she is reading is at least 44 points on both axes', () => {
      expect(app.pathname()).toBe('/');
      expect(theDaysTheStripDrew()).toHaveLength(DAYS_IN_A_WEEK);
      expect(theDaysOfHerWeekTooSmallToPress()).toEqual([]);
      expect(MINIMUM_TAP_TARGET).toBe(44);
    });

    and('the seven of them fit across the narrowest phone Emi is built for', () => {
      const strip = theStripMeasuredOn(aSmallIPhone.width);

      expect(strip.theDaysNeed).toBeLessThanOrEqual(strip.room);
    });

    and('the dock still holds the four columns it held, and nothing else', () => {
      expect(theColumnsOfTheDock()).toEqual(tabs.map((tab) => tabTestID(tab.name)));
      expect(theColumnsOfTheDock()).toHaveLength(4);
    });

    when('she presses a day of that week', async () => {
      theDayShePressed = String(theDaysTheStripDrew()[0]);
      await shePresses(weekDayTestID(theDayShePressed));
    });

    then('she is reading the month that day falls in', () => {
      expect(app.pathname()).toBe('/calendar');
      expect(theMonthSheReads()).toBe(monthLabel(startOfMonth(theDayShePressed)));
    });

    and(
      'that is the month the drawing names, with the parts the drawing places in its order',
      () => {
        expect(partsMissing(theHeaderAndTheMonthOfTheDrawing(), whatTheMonthScreenDrew())).toEqual(
          [],
        );
        expect(theMonthSheReads()).toContain(theMonthTheDrawingNames());
        expect(theDatesTheMonthDrew()).toEqual(theDatesOfTheDrawing());
      },
    );

    when('she presses the way back', async () => {
      await shePresses(calendarBackTestID);
    });

    then('she is on the screen she opened, reading her week again', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(theDaysTheStripDrew()).toHaveLength(DAYS_IN_A_WEEK);
    });

    and('pressing a different day of the same week reaches the same month', async () => {
      const another = theDaysTheStripDrew().find((day) => day !== theDayShePressed);

      expect(another).toBeDefined();
      await shePresses(weekDayTestID(String(another)));

      expect(app.pathname()).toBe('/calendar');
      expect(startOfMonth(String(another))).toBe(startOfMonth(theDayShePressed));
      expect(theMonthSheReads()).toBe(monthLabel(startOfMonth(theDayShePressed)));
    });
  });

  test('SCREEN-4, she presses a day in the month and reads what she wrote that day', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;
    let theDaySheOpens: string;
    let theCycleDayBeforeSheChangedIt: number | undefined;

    given(
      'her phone holds three recorded cycles, and a symptom she marked on one day',
      async () => {
        jest.setSystemTime(whenSheOpensTheMonth());
        theDaySheOpens = theDayTheDrawingsSheetNames();
        await herPhoneHoldsThreeRecordedCycles(whenSheOpensTheMonth(), [
          {
            day: theDaySheOpens,
            symptoms: [theSymptomSheMarked.slug],
            recordedAt: `${theDaySheOpens}T09:00:00.000Z`,
          },
        ]);
      },
    );

    when('she opens the month', async () => {
      app = await sheOpens('/calendar');
    });

    then('nothing at the foot of it names a day, because she has pressed none', () => {
      expect(app.pathname()).toBe('/calendar');
      expect(theSheetSheReads()).toBeUndefined();
    });

    when('she presses the day the drawing names', async () => {
      theCycleDayBeforeSheChangedIt = theCycleDayOver(theDaySheOpens);
      await shePresses(dayTestID(theDaySheOpens));
    });

    then('a sheet at the foot names that date in words', () => {
      const sheet = theSheetSheReads();

      expect(sheet?.lead).toContain(ordinal(Number(theDaySheOpens.slice(8, 10))));
      expect(sheet?.lead).toContain(theMonthTheDrawingNames());
    });

    and('it names the day of her cycle that date falls on, and the phase she was in', () => {
      const said = String(theSheetSheReads()?.line).toLowerCase();
      const phase = thePhaseTheRingSaysOn(theDaySheOpens);

      expect(theCycleDayBeforeSheChangedIt).toBe(theDayTheRingSaysOn(theDaySheOpens));
      expect(said).toContain(String(theCycleDayBeforeSheChangedIt));
      expect(phase).toBeDefined();
      expect(said).toContain(phaseLabel[phase ?? 'period'].toLowerCase());
    });

    and('it names the symptom she marked that day', () => {
      expect(String(theSheetSheReads()?.line).toLowerCase()).toContain(
        theSymptomSheMarked.name.toLowerCase(),
      );
    });

    and('that is the month the drawing names, down to the sheet', () => {
      expect(partsMissing(theMonthAndItsSheetOfTheDrawing(), whatTheMonthScreenDrew())).toEqual([]);
      expect(theMonthSheReads()).toContain(theMonthTheDrawingNames());
      expect(theDatesTheMonthDrew()).toEqual(theDatesOfTheDrawing());
    });

    when('she presses the sheet', async () => {
      await shePresses(daySheetTestID);
    });

    then('she is looking at that day, and at no other', () => {
      expect(app.pathname()).toBe(`/day/${theDaySheOpens}`);
      expect(screen.getByTestId(flowPickerTestID)).toBeTruthy();
    });

    when('she says her period came that day', async () => {
      await shePresses(flowOptionTestID('medium'));

      expect(whatWasRecordedOn(theDaySheOpens)?.flow).toBe('medium');
    });

    and('she presses the way back', async () => {
      await shePresses(logFlowDoneTestID);
    });

    then('she is reading the month again, and the sheet names the flow she just picked', () => {
      const said = String(theSheetSheReads()?.line).toLowerCase();

      expect(app.pathname()).toBe('/calendar');
      expect(said).toContain(flowLabel.medium.toLowerCase());
      expect(said).toContain(theSymptomSheMarked.name.toLowerCase());
    });

    and('the day of her cycle over that date is the day the ring now says', () => {
      expect(theCycleDayOver(theDaySheOpens)).toBe(theDayTheRingSaysOn(theDaySheOpens));
      expect(theCycleDayOver(theDaySheOpens)).not.toBe(theCycleDayBeforeSheChangedIt);
      expect(String(theSheetSheReads()?.line)).toContain(String(theCycleDayOver(theDaySheOpens)));
    });

    and('pressing another day of the month names that day instead', async () => {
      const another = theDaysTheDrawingFills()[0];

      expect(another).toBeDefined();
      await shePresses(dayTestID(String(another)));

      const sheet = theSheetSheReads();

      expect(sheet?.lead).toContain(ordinal(Number(String(another).slice(8, 10))));
      expect(sheet?.lead).not.toContain(ordinal(Number(theDaySheOpens.slice(8, 10))));
    });
  });

  test('SCREEN-4, a day that has not happened yet is refused in the month and at its address', ({
    given,
    when,
    then,
    and,
  }) => {
    let app: OpenApp;
    const aheadOfHer = theDayAheadSheCannotOpen();

    given('her phone holds three recorded cycles', async () => {
      jest.setSystemTime(whenSheOpensTheMonth());
      await herPhoneHoldsThreeRecordedCycles(whenSheOpensTheMonth());
    });

    when('she opens the month', async () => {
      app = await sheOpens('/calendar');
    });

    and('she presses the square two days ahead of today', async () => {
      expect(screen.getByTestId(dayTestID(aheadOfHer))).toBeTruthy();
      await shePresses(dayTestID(aheadOfHer));
    });

    then('she is still reading the month, and nothing at the foot of it names that day', () => {
      expect(app.pathname()).toBe('/calendar');
      expect(theSheetSheReads()).toBeUndefined();
    });

    and('that square is faint, and somebody listening is told it takes no press', () => {
      const square = theSquareSheSees(aheadOfHer);

      expect(square.dimmed).toBe(true);
      expect(square.saidToTakeNoPress).toBe(true);
      expect(square.spoken).toContain(words('cycle.day.notYet'));
    });

    and('a day she already lived still takes a press and names itself at the foot', async () => {
      const behindHer = theDaysTheDrawingFills()[0];

      expect(behindHer).toBeDefined();
      expect(theSquareSheSees(String(behindHer)).saidToTakeNoPress).toBe(false);
      await shePresses(dayTestID(String(behindHer)));

      expect(theSheetSheReads()?.lead).toContain(ordinal(Number(String(behindHer).slice(8, 10))));
    });

    when('she opens that same day ahead of her by its address', async () => {
      // She puts the month down before she opens the address. Two applications left running at
      // once leave two routers, and the way back then reaches neither of them.
      await app.close();
      app = await sheOpens(`/day/${aheadOfHer}`);
    });

    then('she is told the day has not happened yet', () => {
      expect(screen.getByText(dayRefusedCopy['day-is-in-the-future'].title)).toBeTruthy();
      expect(screen.getByText(dayRefusedCopy['day-is-in-the-future'].line)).toBeTruthy();
    });

    and('that is the drawing of the day Emi refuses', () => {
      expect(partsMissing(thePartsOfTheDrawingOfARefusedDay(), whatTheRefusalDrew())).toEqual([]);
    });

    and('there is nothing on that screen to pick a flow with', () => {
      expect(screen.queryByTestId(flowPickerTestID)).toBeNull();
      expect(screen.queryByTestId(flowOptionTestID('heavy'))).toBeNull();
    });

    when('she presses the way back', async () => {
      await shePresses(dayRefusedBackTestID);
    });

    then('her phone holds nothing on that day', () => {
      expect(whatWasRecordedOn(aheadOfHer)).toBeUndefined();
    });
  });

  test('SCREEN-4, she swipes back two months and reads a day in that month', ({
    given,
    when,
    then,
    and,
  }) => {
    let app: OpenApp;
    const aDayOfTheMonthTwoBack = `${theMonthTwoBeforeSheOpens().slice(0, 8)}14`;

    given('her phone holds three recorded cycles', async () => {
      jest.setSystemTime(whenSheOpensTheMonth());
      await herPhoneHoldsThreeRecordedCycles(whenSheOpensTheMonth());
    });

    when('she opens the month', async () => {
      app = await sheOpens('/calendar');

      expect(theMonthSheReads()).toBe(monthLabel(theMonthSheOpens));
    });

    and('she presses the way to an earlier month', async () => {
      await shePresses(calendarEarlierTestID);
    });

    then('she is reading the month before, which is the month the drawing of it names', () => {
      expect(app.pathname()).toBe('/calendar');
      expect(theMonthSheReads()).toBe(monthLabel(theMonthBeforeSheOpens()));
      expect(theMonthSheReads()).toContain(theMonthTheEarlierDrawingNames());
    });

    and('that is the drawing of the month before, with the parts it places in its order', () => {
      expect(partsMissing(theEarlierMonthOfTheDrawing(), whatTheMonthScreenDrew())).toEqual([]);
    });

    and('no square of it is ringed, because today is in the month she opened', () => {
      expect(theMarkOnTheSquare(theDayTheEarlierDrawingOpens())).not.toBe('today');
    });

    when('she presses the way to an earlier month again', async () => {
      await shePresses(calendarEarlierTestID);
    });

    then('she is reading the month two behind the one she opened', () => {
      expect(theMonthSheReads()).toBe(monthLabel(theMonthTwoBeforeSheOpens()));
    });

    when('she presses a day of that month', async () => {
      await shePresses(dayTestID(aDayOfTheMonthTwoBack));

      expect(theSheetSheReads()?.lead).toContain(
        ordinal(Number(aDayOfTheMonthTwoBack.slice(8, 10))),
      );
    });

    and('she presses the sheet at the foot', async () => {
      await shePresses(daySheetTestID);
    });

    then('she is looking at that day, two months behind today', () => {
      expect(app.pathname()).toBe(`/day/${aDayOfTheMonthTwoBack}`);
      expect(startOfMonth(aDayOfTheMonthTwoBack)).toBe(theMonthTwoBeforeSheOpens());
      expect(screen.getByTestId(flowPickerTestID)).toBeTruthy();
    });

    when('she presses the way back', async () => {
      await shePresses(logFlowDoneTestID);
    });

    then('she is reading that same month again, and not the month she opened', () => {
      expect(app.pathname()).toBe('/calendar');
      expect(theMonthSheReads()).toBe(monthLabel(theMonthTwoBeforeSheOpens()));
      expect(theMonthSheReads()).not.toBe(monthLabel(theMonthSheOpens));
    });

    when('she presses the way to a later month twice', async () => {
      await shePresses(calendarLaterTestID);
      await shePresses(calendarLaterTestID);
    });

    then('she is reading the month she opened, with today ringed on it', () => {
      expect(theMonthSheReads()).toBe(monthLabel(theMonthSheOpens));
      expect(theMarkOnTheSquare(theDaySheOpensTheMonth())).toBe('today');
    });

    and('both ways to another month are at least 44 points on both axes', () => {
      const ways = [
        screen.getByTestId(calendarEarlierTestID),
        screen.getByTestId(calendarLaterTestID),
      ] as unknown as Control[];

      expect(controlsTooSmallToPress(ways)).toEqual([]);
    });
  });

  test('SCREEN-4, she corrects a whole period in one save and the ring redraws', ({
    given,
    when,
    then,
    and,
  }) => {
    let app: OpenApp;
    let theRingSaid = '';
    let herNextPeriodWasExpectedOn: string | undefined;
    const whatHerPhoneHeldBefore = new Map<string, HeldDay | undefined>();
    const theDaysEmiHeld = theDaysEmiHolds();
    const theDaysSheAdded = theDaysSheAdds();
    const theDaySheTookOff = theDaySheTakesOff();
    const theFirstDaySheAdds = String(theDaysSheAdded[0]);
    const theSecondDaySheAdds = String(theDaysSheAdded[1]);

    given('her phone holds a period of four days, and two complete cycles behind it', async () => {
      jest.setSystemTime(whenSheOpensEmi());
      await herPhoneHoldsAPeriodOfFourDays(whenSheOpensEmi());

      expect(theDaysEmiHeld).toHaveLength(4);
      expect(theDaysSheAdded).toHaveLength(2);
      expect(howManyDaysSheTakesOff()).toBe(1);
      expect(theCycleStartsHerPhoneHolds()).toEqual(herThreePeriodStarts());

      for (const day of [...theDaysEmiHeld, ...theDaysSheAdded]) {
        whatHerPhoneHeldBefore.set(day, whatHerPhoneHoldsOn(day));
      }
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');

      theRingSaid = theRingSays();
      herNextPeriodWasExpectedOn = theDayHerNextPeriodMayStartOn();
    });

    and('she presses a day of the week she is reading', async () => {
      await shePresses(weekDayTestID(theDaySheOpensEmi()));
    });

    then('she is reading the month that day falls in', () => {
      expect(app.pathname()).toBe('/calendar');
      expect(theMonthSheReads()).toBe(monthLabel(theMonthSheCorrects));
    });

    when('she presses the way to edit her period', async () => {
      await shePresses(theWayToEditHerPeriod);
    });

    then('she is looking at the period picker, and that is the drawing of it', () => {
      expect(app.pathname()).toBe('/calendar/period');
      expect(sheIsOnThePeriodPicker()).toBe(true);
      expect(partsMissing(thePartsOfTheRangePickerDrawing(), whatTheRangePickerDrew())).toEqual([]);
      expect(theLeadSheReads()).not.toBe('');
    });

    and('the four days Emi holds arrive as hers, and no other day of that month does', () => {
      expect(theDaysTickedOnThePicker()).toEqual(theDaysEmiHeld);
    });

    and('somebody listening is told each day is one she can turn on and off', () => {
      for (const day of theDaysEmiHeld) {
        expect(whatSomebodyListeningHearsOn(day)).toEqual({
          checked: true,
          disabled: false,
          role: 'checkbox',
        });
      }

      for (const day of theDaysSheAdded) {
        expect(whatSomebodyListeningHearsOn(day)).toEqual({
          checked: false,
          disabled: false,
          role: 'checkbox',
        });
      }
    });

    and('a day she has not lived yet takes no press here either', async () => {
      const aDayAheadOfHer = addDays(theDaySheOpensEmi(), 2);

      expect(whatSomebodyListeningHearsOn(aDayAheadOfHer).disabled).toBe(true);

      await shePresses(dayTestID(aDayAheadOfHer));

      expect(theDaysTickedOnThePicker()).toEqual(theDaysEmiHeld);
    });

    when('she presses the two days her period ran on after that', async () => {
      for (const day of theDaysSheAdded) {
        await shePresses(dayTestID(day));
      }

      expect(theDaysTickedOnThePicker()).toEqual([...theDaysEmiHeld, ...theDaysSheAdded].sort());
    });

    and('she presses the day her period did not start on', async () => {
      await shePresses(dayTestID(theDaySheTookOff));

      expect(theDaysTickedOnThePicker()).toEqual(theDaysSheIsLeftHolding());
    });

    then('the line under the month names the two days she added and the day she took off', () => {
      const line = theChangeLineSheReads();

      for (const day of [...theDaysSheAdded, theDaySheTookOff]) {
        expect(line).toContain(ordinal(Number(day.slice(8, 10))));
      }
    });

    when('she saves, once', async () => {
      await shePresses(editPeriodSaveTestID);
    });

    then('she is reading the month again, and the two days she added are filled on it', () => {
      expect(app.pathname()).toBe('/calendar');

      for (const day of theDaysSheAdded) {
        expect(theMarkOnTheSquare(day)).toBe('bled');
      }
    });

    and('the day she took off is not filled', () => {
      expect(theMarkOnTheSquare(theDaySheTookOff)).not.toBe('bled');
    });

    when('she reaches the screen she opens', async () => {
      await shePresses(calendarTodayTestID);
    });

    then('the ring says a different day of her cycle than it said before', () => {
      expect(app.pathname()).toBe('/');
      expect(theRingSaid).not.toBe('');
      expect(theRingSays()).not.toBe(theRingSaid);
    });

    and('the day her next period is expected to start on moved as well', () => {
      expect(herNextPeriodWasExpectedOn).toBeDefined();
      expect(theDayHerNextPeriodMayStartOn()).not.toBe(herNextPeriodWasExpectedOn);
    });

    and(
      'the first day she added was on her phone already, and it is at one revision higher now, under the identifier it had',
      () => {
        const before = whatHerPhoneHeldBefore.get(theFirstDaySheAdds);

        expect(theFirstDaySheAdds).toBe(theDaySheStopped());
        expect(before?.revision).toBe(1);
        expect(whatHerPhoneHoldsOn(theFirstDaySheAdds)).toEqual({
          id: String(before?.id),
          revision: 2,
        });
      },
    );

    and(
      'the second day she added was never on her phone, and it is there now at its first revision',
      () => {
        expect(whatHerPhoneHeldBefore.get(theSecondDaySheAdds)).toBeUndefined();
        expect(whatHerPhoneHoldsOn(theSecondDaySheAdds)?.revision).toBe(1);
      },
    );

    and('the day she took off is at one revision higher too, under the identifier it had', () => {
      const before = whatHerPhoneHeldBefore.get(theDaySheTookOff);

      expect(before?.revision).toBe(1);
      expect(whatHerPhoneHoldsOn(theDaySheTookOff)).toEqual({
        id: String(before?.id),
        revision: 2,
      });
    });

    and('no day of that month she pressed nothing on was written at all', () => {
      const sheChanged = new Set([...theDaysSheAdded, theDaySheTookOff]);

      for (const day of theDaysEmiHeld.filter((each) => !sheChanged.has(each))) {
        expect(whatHerPhoneHoldsOn(day)?.revision).toBe(1);
      }

      expect(theDaysHerPhoneHoldsIn(theMonthSheCorrects)).toEqual(
        [...new Set([...theDaysEmiHeld, ...theDaysSheAdded])].sort(),
      );
    });

    and(
      'every cycle on her phone comes from the days she recorded, and a cycle written by hand is refused',
      () => {
        expect(theCycleStartsHerPhoneHolds()).toEqual(theCycleStartsHerDayLogGives());
        expect(theCycleStartsHerPhoneHolds()).not.toEqual(herThreePeriodStarts());

        expect(() => {
          aCycleIsWrittenByHand();
        }).toThrow(/cache/);
      },
    );
  });

  test('SCREEN-2, she reaches the page that says where each published figure comes from', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;
    let herCycleLengthOnTheScreenSheOpened = '';

    given('her phone holds three cycles of her own', async () => {
      await herPhoneHolds(whenSheOpensIt, daysOfHerThreeCycles(today));
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
      herCycleLengthOnTheScreenSheOpened = whatItSays(herNumberTestID('cycle-length'));
    });

    and('she presses the way to where these figures come from', async () => {
      await shePresses(homeFiguresPressTestID);
    });

    then('she is reading one row for each published figure Emi puts beside her own numbers', () => {
      expect(app.pathname()).toBe(theFiguresPage);
      expect(theRowsSheReads()).toEqual(publishedFigures.map((figure) => figure.measures));
      expect(theRowsSheReads()).toHaveLength(3);
    });

    and(
      'each row quotes the figure, names the paper that reports it, and gives the identifier of that paper',
      () => {
        for (const figure of publishedFigures) {
          expect(whatItSays(citationFigureTestID(figure.measures))).not.toBe('');
          expect(whatItSays(citationPaperTestID(figure.measures))).toBe(figure.citation.source);
          expect(whatItSays(citationIdentifierTestID(figure.measures))).toContain(
            figure.citation.doi,
          );
        }

        expect(whatItSays(citationFigureTestID('cycle-length'))).toBe('24 to 38 days');
        expect(whatItSays(citationFigureTestID('period-duration'))).toBe('up to 8 days');
        expect(whatItSays(citationFigureTestID('cycle-length-variation'))).toBe('2.6 days');
      },
    );

    and(
      'the cycle length is credited to the International Federation of Gynecology and Obstetrics, and not to nobody',
      () => {
        expect(whatItSays(citationPaperTestID('cycle-length'))).toContain(
          'International Federation of Gynecology and Obstetrics',
        );
        expect(whatItSays(citationIdentifierTestID('cycle-length'))).toContain(
          '10.1002/ijgo.12666',
        );
        // What the drawing of this page wrote under the cycle length, before the arithmetic cited it.
        expect(whatItSays(figuresScreenTestID)).not.toContain('The code cites none');
      },
    );

    and('she is told every figure is quoted in the words the paper reports it in', () => {
      expect(whatItSays(figuresQuotedTestID)).toBe(
        "Each figure is quoted in the paper's own words, so you can check it for yourself.",
      );
    });

    when('the arithmetic is changed to cite another paper, reporting another range', async () => {
      await app.close();
      theArithmeticHolds([
        anotherPaperReportsTheCycleLength,
        ...theFiguresTheArithmeticShips.slice(1),
      ]);
    });

    and('she opens the page again', async () => {
      app = await sheOpens(theFiguresPage);
    });

    then(
      'she reads the new range and the new paper, because the page quotes the arithmetic and keeps no copy of it',
      () => {
        expect(whatItSays(citationFigureTestID('cycle-length'))).toBe('20 to 41 days');
        expect(whatItSays(citationPaperTestID('cycle-length'))).toBe(
          anotherPaperReportsTheCycleLength.citation.source,
        );
        expect(whatItSays(figuresScreenTestID)).not.toContain('24 to 38 days');
      },
    );

    when('the arithmetic is put back', async () => {
      await app.close();
      theArithmeticHolds(theFiguresTheArithmeticShips);

      expect(publishedFigures).toEqual(theFiguresTheArithmeticShips);
    });

    and('she opens Emi again', async () => {
      app = await sheOpens('/');
    });

    and('she presses the way to where these figures come from', async () => {
      await shePresses(homeFiguresPressTestID);
    });

    and('she presses the way back', async () => {
      await shePresses(figuresBackTestID);
    });

    then('she is on the screen she opened, reading her three numbers again', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(whatItSays(herNumberTestID('cycle-length'))).toBe(herCycleLengthOnTheScreenSheOpened);
      expect(screen.getByTestId(homeNumbersTestID)).toBeTruthy();
    });
  });

  test('SCREEN-2, she reaches a past cycle from the screen she opens and comes back to it', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;
    let theStripsSheRead: string[] = [];
    let theCycleShePressed = '';
    let whatTheStripSaidAboutIt = '';
    let theArcsTheStripDrew: number[] = [];

    given('her phone holds three cycles of her own', async () => {
      await herPhoneHolds(whenSheOpensIt, daysOfHerThreeCycles(today));
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
      theStripsSheRead = theStripsSheReads();
    });

    then(
      'she reads a strip for the cycle she is in, and one for each of the three cycles before it',
      () => {
        const hers = theCyclesHerPhoneHolds();

        expect(theStripsSheRead).toEqual(hers.map((cycle) => cycleStripTestID(cycle.startedOn)));
        expect(theStripsSheRead).toHaveLength(stripsSheReads);
        expect(hers[0]?.lengthDays).toBeNull();
      },
    );

    and(
      'each strip names the days that cycle covers, how long it ran, and how much of it she bled',
      () => {
        for (const cycle of theCyclesHerPhoneHolds()) {
          const said = whatItSays(cycleStripTestID(cycle.startedOn));

          expect(said).toContain(cycleSentence(cycle.startedOn, cycle.endedOn));
          expect(said).toContain(cycleLengthSentence(cycle.lengthDays, cycle.periodLengthDays));
        }
      },
    );

    and('the length on each strip is the length her phone holds for that cycle', () => {
      for (const cycle of theCyclesHerPhoneHolds().filter((row) => row.lengthDays !== null)) {
        expect(whatItSays(cycleStripLengthTestID(cycle.startedOn))).toContain(
          String(cycle.lengthDays),
        );
        expect(whatItSays(cycleStripLengthTestID(cycle.startedOn))).toBe(
          cycleLengthSentence(cycle.lengthDays, cycle.periodLengthDays),
        );
      }

      expect(theCyclesHerPhoneHolds().map((cycle) => cycle.lengthDays)).toEqual([null, 31, 30, 24]);
    });

    and('each strip draws the four phase fills, and not one word sits on a fill', () => {
      for (const cycle of theCyclesHerPhoneHolds()) {
        expect(thePhasesOfTheStrip(cycle.startedOn)).toEqual([...phaseNames]);
        expect(textIn(screen.getByTestId(cycleStripBarTestID(cycle.startedOn)))).toEqual([]);

        for (const phase of phaseNames) {
          expect(theDaysOfTheFill(cycle.startedOn, phase)).toBeGreaterThan(0);
          expect(textIn(screen.getByTestId(cycleStripFillTestID(cycle.startedOn, phase)))).toEqual(
            [],
          );
        }
      }
    });

    and('under the strips she is told what they are and that one of them opens', () => {
      expect(whatItSays(homeCyclesLineTestID)).not.toBe('');
    });

    when('she presses the strip of the cycle before the one she is in', async () => {
      const past = theCyclesHerPhoneHolds()[1] as CycleRow;

      theCycleShePressed = past.startedOn;
      whatTheStripSaidAboutIt = whatItSays(cycleStripLengthTestID(past.startedOn));
      theArcsTheStripDrew = phaseNames.map((phase) => theDaysOfTheFill(past.startedOn, phase));

      await shePresses(cycleStripTestID(past.startedOn));
    });

    then('she is reading Insights, with that cycle marked and no other cycle marked', () => {
      expect(screen.getByTestId(historyScreenTestID)).toBeTruthy();
      expect(theCyclesMarkedOnInsights()).toEqual([theCycleShePressed]);
    });

    and(
      'Insights gives that cycle the same length and the same four arcs the strip gave it',
      () => {
        expect(whatItSays(historyCycleTestID(theCycleShePressed))).toContain(
          whatTheStripSaidAboutIt,
        );
        expect(phaseNames.map((phase) => theDaysOfTheArc(theCycleShePressed, phase))).toEqual(
          theArcsTheStripDrew,
        );
      },
    );

    when('she presses the way back', async () => {
      await shePresses(historyBackTestID);
    });

    then('she is on the screen she opened, reading the same four strips', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(theStripsSheReads()).toEqual(theStripsSheRead);
      expect(theStripsSheReads()).toHaveLength(stripsSheReads);
    });
  });

  test('SCREEN-2, she reads the shape of her last six cycles against the published range', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;
    let thePointsSheRead: string[] = [];
    let theCountSheRead = '';

    given(
      'her phone holds six complete cycles, three of which ran outside the published range',
      async () => {
        await herPhoneHolds(whenSheOpensIt, daysOfHerSixCycles(today));
      },
    );

    when('she opens Emi', async () => {
      app = await sheOpens('/');
      thePointsSheRead = thePointsSheReads();
      theCountSheRead = whatItSays(homeTrendCountTestID);
    });

    then('she reads one point for each of her six complete cycles, oldest first', () => {
      const hers = theCompleteCyclesHerPhoneHolds();

      expect(thePointsSheRead).toEqual(hers.map((cycle) => trendPointTestID(cycle.startedOn)));
      expect(thePointsSheRead).toHaveLength(6);
      expect(hers.map((cycle) => cycle.lengthDays)).toEqual([...herCycleLengths]);
    });

    and('the published range of 24 to 38 days is shaded behind the points', () => {
      const band = theBandBehindThePoints();

      expect(theDaysAtTheHeight(band.top)).toBeCloseTo(CYCLE_LENGTH_HIGH_DAYS, 1);
      expect(theDaysAtTheHeight(band.bottom)).toBeCloseTo(CYCLE_LENGTH_LOW_DAYS, 1);
      expect([CYCLE_LENGTH_LOW_DAYS, CYCLE_LENGTH_HIGH_DAYS]).toEqual([24, 38]);
    });

    and('each point sits where that cycle length falls against the two numbers on the axis', () => {
      for (const cycle of theCompleteCyclesHerPhoneHolds()) {
        expect(theDaysAtTheHeight(theHeightOfThePoint(cycle.startedOn))).toBeCloseTo(
          cycle.lengthDays as number,
          1,
        );
      }
    });

    and('she is told three of her last six complete cycles ran outside the band', () => {
      expect(theCountSheRead).toBe(cyclesOutsideReads(3, 6));
      expect(theCountSheRead).toContain('3');
      expect(theCountSheRead).toContain('6');
    });

    and('three is the number she gets by counting the points drawn outside the band', () => {
      expect(thePointsDrawnOutsideTheBand()).toHaveLength(3);
      expect(herCyclesOutsideTheBand).toHaveLength(3);
    });

    and('nothing in that section calls her cycles normal, abnormal or irregular', () => {
      const said = [whatItSays(homeTrendTestID), theCountSheRead, whatItSays(homeTrendPressTestID)]
        .join(' ')
        .toLowerCase();

      for (const verdict of ['normal', 'abnormal', 'irregular']) {
        expect(said).not.toContain(verdict);
      }
    });

    when('she presses the way to the same cycles in full', async () => {
      await shePresses(homeTrendPressTestID);
    });

    then('she is reading Insights, listing those same six cycles', () => {
      expect(screen.getByTestId(historyScreenTestID)).toBeTruthy();

      for (const cycle of theCompleteCyclesHerPhoneHolds()) {
        expect(screen.getByTestId(historyCycleTestID(cycle.startedOn))).toBeTruthy();
      }
    });

    when('she presses the way back', async () => {
      await shePresses(historyBackTestID);
    });

    then('she is on the screen she opened, reading the same six points', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(thePointsSheReads()).toEqual(thePointsSheRead);
      expect(thePointsSheReads()).toHaveLength(6);
    });
  });

  test('SCREEN-2, she meets the symptom that comes back without going to look for it', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;
    let theCardsSheRead: string[] = [];
    const theOneThatCameBackMost =
      theSymptomsThatCameBack[0] as (typeof theSymptomsThatCameBack)[0];

    given(
      'her phone holds six cycles, one symptom in five of them and another in four',
      async () => {
        await herPhoneHolds(whenSheOpensIt, daysOfHerRepeatingSymptoms(today));
      },
    );

    and('she logged a third symptom in two of those cycles', () => {
      expect(theDaysSheLogged(theSymptomSheLoggedTwice)).toBe(2);
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
      theCardsSheRead = theCardsSheReads();
    });

    then('she reads one card for each symptom that came back, the most repeated first', () => {
      expect(theCardsSheRead).toEqual(
        theSymptomsThatCameBack.map((symptom) => patternCardTestID(symptom.slug)),
      );
      expect(theCardsSheRead).toHaveLength(2);
    });

    and('each card names the symptom and where in her cycle it keeps landing', () => {
      for (const symptom of theSymptomsThatCameBack) {
        const named = theSymptomCalled(symptom.slug).name;
        const said = whatItSays(patternCardWhenTestID(symptom.slug));

        expect(said).toContain(named);
        expect(said).toContain(String(symptom.day));
        expect(said).toBe(
          patternCardReads({ anchor: symptom.anchor, day: symptom.day, name: named }),
        );
      }
    });

    and('each card names how many of her cycles carried it, out of the six Emi read', () => {
      for (const symptom of theSymptomsThatCameBack) {
        const said = whatItSays(patternCardEvidenceTestID(symptom.slug));

        expect(said).toContain(String(symptom.cyclesWithIt));
        expect(said).toContain(String(theCyclesEmiReads));
        expect(said).toBe(patternEvidenceSentence(symptom.cyclesWithIt, theCyclesEmiReads));
      }
    });

    and('the symptom she logged in two cycles is named on no card', () => {
      expect(theCardsSheRead).not.toContain(patternCardTestID(theSymptomSheLoggedTwice));
      expect(screen.queryByTestId(patternCardTestID(theSymptomSheLoggedTwice))).toBeNull();
      expect(whatTheSectionSays()).not.toContain(theSymptomCalled(theSymptomSheLoggedTwice).name);
    });

    and('she is told a symptom logged once or twice is not a pattern', () => {
      expect(whatItSays(homePatternsLineTestID)).toBe(homeCopy.patterns.line);
    });

    and('every number in that section is one of her own counts', () => {
      const hers = new Set([
        theCyclesEmiReads,
        ...theSymptomsThatCameBack.flatMap((symptom) => [symptom.day, symptom.cyclesWithIt]),
      ]);

      expect(theNumbersTheSectionPrints().length).toBeGreaterThan(0);
      expect(theNumbersTheSectionPrints().filter((number) => !hers.has(number))).toEqual([]);
    });

    and('no word of it calls her normal, abnormal or irregular', () => {
      const said = whatTheSectionSays().toLowerCase();

      for (const verdict of ['normal', 'abnormal', 'irregular']) {
        expect(said).not.toContain(verdict);
      }
    });

    when('she presses the card of the symptom that came back most', async () => {
      await shePresses(patternCardTestID(theOneThatCameBackMost.slug));
    });

    then('she is reading Insights, with that symptom marked and no other marked', () => {
      expect(screen.getByTestId(historyScreenTestID)).toBeTruthy();
      expect(theSymptomsMarkedOnInsights()).toEqual([
        historyPatternTestID(theOneThatCameBackMost.slug),
      ]);
      expect(theSymptomsInsightsNames().length).toBeGreaterThan(1);
    });

    and(
      'Insights names it at the same point in her cycle, in the same count of her cycles, as the card did',
      () => {
        const said = whatItSays(historyPatternTestID(theOneThatCameBackMost.slug));
        const named = theSymptomCalled(theOneThatCameBackMost.slug).name;

        expect(said).toContain(named);
        expect(said.toLowerCase()).toContain(
          patternWhenReads(theOneThatCameBackMost.anchor, theOneThatCameBackMost.day).toLowerCase(),
        );
        expect(said).toContain(
          patternEvidenceSentence(theOneThatCameBackMost.cyclesWithIt, theCyclesEmiReads),
        );
      },
    );

    when('she presses the way back', async () => {
      await shePresses(historyBackTestID);
    });

    then('she is on the screen she opened, reading the same two cards', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(theCardsSheReads()).toEqual(theCardsSheRead);
      expect(theCardsSheReads()).toHaveLength(2);
    });
  });

  test('SCREEN-2, a section her data cannot fill carries one sentence and no chart', ({
    given,
    when,
    then,
    and,
  }) => {
    let said: WaitingDrawn[] = [];
    let aboutWhatComesBack = '';

    given('her phone holds her answers and not one day', async () => {
      await herPhoneHoldsTheseAnswers(whenSheOpensIt, {
        kind: 'profile',
        cycleLengthDays: sheSaysHerCycleRuns,
        recordedAt: whenSheOpensIt.toISOString(),
      });
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
      said = theWaitingSectionsOnTheGlass(waitingSections);
    });

    then(
      'where her cycles, her trend and what comes back would be, she reads a waiting section',
      () => {
        expect(said.map((each) => each.section)).toEqual([...waitingSections]);
      },
    );

    and('each one says what it needs before Emi can draw it', () => {
      // The drawing settles how many sections stand here. The sentences are the copy of
      // https://github.com/atlantic-blue/emi/issues/248, which was settled after it was drawn.
      expect(said).toHaveLength(
        theWaitingSectionsTheDrawingPlaces(theDrawingOfWhatArrivesLater).length,
      );
      expect(said.map((each) => each.needs)).toEqual(theThreeSectionsSayTheyNeed);
    });

    and('where a section counts her own cycles, it names the count her phone holds', () => {
      const complete = String(herCompleteCycles());
      const counting = said.filter((each) => whatAWaitingSectionSays(each).includes(complete));

      expect(counting.map((each) => each.section)).toEqual(['cycles', 'patterns']);
    });

    and('every number in the three is a count read off her phone or a threshold Emi states', () => {
      const hers = [
        String(herCompleteCycles()),
        String(cyclesBeforeATrend),
        String(cyclesBeforeAPattern),
      ];
      const numbers = said.flatMap((section) =>
        [...whatAWaitingSectionSays(section).matchAll(/\d+(?:\.\d+)?/g)].map(([found]) => found),
      );

      expect(numbers.filter((number) => !hers.includes(number))).toEqual([]);
      expect(numbers.length).toBeGreaterThan(0);
    });

    and('no chart, no strip, no row and no card is drawn in any of the three', () => {
      for (const part of [
        homeNumbersTestID,
        homeFiguresLineTestID,
        homeCyclesTestID,
        homeCyclesLineTestID,
        homeTrendTestID,
        homeTrendCountTestID,
        homePatternsTestID,
        homePatternsLineTestID,
      ]) {
        expect(screen.queryByTestId(part)).toBeNull();
      }
    });

    and('what comes back says here exactly what it says on Insights', async () => {
      aboutWhatComesBack = whatItSays(sectionWaitingTestID('patterns'));

      await shePresses(tabTestID('history'));

      expect(whatItSays(historyWaitingTestID)).toBe(aboutWhatComesBack);
      expect(aboutWhatComesBack).toContain(patternsWaitingSentence(herCompleteCycles()));
    });
  });

  test('SCREEN-2, day one says what the ring needs and the first period she logs draws it', ({
    given,
    when,
    then,
    and,
  }) => {
    let app: OpenApp;

    given('her phone holds her first run answers and not one recorded day', async () => {
      await herPhoneHolds(whenSheOpensIt, [], sheSaysHerCycleRuns);
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    then('there is no ring, and nothing at all is drawn in place of one', () => {
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(cycleRingTestID)).toBeNull();
      expect(thePartsTheDayOneDrawingNames().map((part) => part.name)).not.toContain('CycleRing');
    });

    and('a title says there is nothing to draw yet', () => {
      expect(textIn(screen.getByTestId(homeNoRingTitleTestID))).toEqual([cycleCopy.noRing.title]);
    });

    and('a line says the ring needs a period, and that a day she bled makes it appear', () => {
      expect(textIn(screen.getByTestId(homeNoRingLineTestID))).toEqual([cycleCopy.noRing.line]);
    });

    and(
      'the card counts the cycle length she gave at her first run, and no length Emi picked',
      () => {
        const said = textIn(screen.getByTestId(learningStatedLengthTestID)).join(' ');

        expect(said).toBe(statedLengthSentence(sheSaysHerCycleRuns));
        expect(said).not.toContain(String(defaultCycleLengthDays));
      },
    );

    and('one button offers to log today', () => {
      expect(textIn(screen.getByTestId(homeLogTodayTestID))).toEqual([homeCopy.logToday]);
      expect(screen.queryAllByTestId(homeLogTodayTestID)).toHaveLength(1);
    });

    and('that is the drawing of day one, part for part, in the order it places them', () => {
      expect(partsMissing(thePartsOfTheDayOneDrawing(), theIdentifiersDrawn())).toEqual([]);
      expect(thePartsTheDayOneDrawingNames().map((part) => part.name)).toEqual(
        thePartsOfTheDayOneDrawing().map((part) => part.name),
      );
    });

    when('she presses the button that offers to log today', async () => {
      await shePresses(homeLogTodayTestID);
    });

    then('she is on the log, at the flow options', () => {
      expect(app.pathname()).toBe('/log');
      expect(screen.getByTestId(flowPickerTestID)).toBeTruthy();
    });

    when('she says her period came today', async () => {
      await shePresses(flowOptionTestID('medium'));
    });

    and('she presses the way back', async () => {
      await shePresses(logFlowDoneTestID);
    });

    then('she is on the screen she opened, reading a ring drawn from the day she logged', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(cycleRingTestID)).toBeTruthy();
      expect(theCycleStartsHerPhoneHolds()).toEqual([today]);
    });

    and('the ring says she is on the first day of a cycle of the length she gave', () => {
      expect(theRingSays()).toBe(ringSpokenLabel(1, sheSaysHerCycleRuns, phaseLabel.period));
    });

    and('nothing offers to log today any more, and the two lines are gone', () => {
      for (const gone of [homeLogTodayTestID, homeNoRingTitleTestID, homeNoRingLineTestID]) {
        expect(screen.queryByTestId(gone)).toBeNull();
      }
    });
  });

  test('SCREEN-2, every section of the screen she opens is drawn from her own data or absent with a sentence', ({
    given,
    when,
    then,
    and,
  }) => {
    /** The screen at one state of her data, kept so every step reads one opening of it. */
    interface SheRead {
      readonly state: HerDataState;
      readonly measured: readonly Measured[];
      readonly unanswered: readonly string[];
      readonly drawn: readonly string[];
      readonly held: HerDays;
    }

    let herStates: HerDataState[] = [];
    const sheRead: SheRead[] = [];

    /** The states one section was drawn at, named, so a section that came early is named with it. */
    function whereItWasDrawn(name: string): string[] {
      return sheRead
        .filter((at) => at.measured.some((section) => section.section === name && section.hers))
        .map((at) => at.state.name);
    }

    given(
      'her answers, and her own days at four states: nothing recorded, one cycle, two cycles and six',
      () => {
        herStates = theStatesOfHerData(today);

        expect(herStates.map((state) => state.name)).toEqual([
          'nothing recorded',
          'one complete cycle',
          '2 complete cycles',
          '6 complete cycles',
        ]);
      },
    );

    when('she opens Emi at every one of those four states', async () => {
      for (const state of herStates) {
        resetExpoSqlite();
        resetExpoSecureStore();
        await herPhoneHoldsThisState(whenSheOpensIt, state);

        const app = await sheOpens('/');

        sheRead.push({
          drawn: theIdentifiersDrawn(),
          held: whatHerPhoneHolds(herDatabase(), today),
          measured: everySectionMeasured(state.name, state.holds),
          state,
          unanswered: partsNoSectionAnswersFor(),
        });

        // The router handles the deep links of the whole application, so a second one standing
        // beside the first reads its own address. One screen at a time, and the state goes with it.
        await app.close();
      }
    });

    then('everything she reads on it stands on days she recorded herself', () => {
      expect(sheRead).toHaveLength(herStates.length);
      expect(sheRead.map((at) => at.held.completeCycles)).toEqual([0, 1, 2, 6]);
      expect(sheRead.map((at) => ({ ...at.held, state: at.state.name }))).toEqual(
        herStates.map((state) => ({
          completeCycles: state.holds.completeCycles,
          dayOfHerCycle: state.holds.dayOfHerCycle,
          loggedToday: state.holds.loggedToday,
          recordedDays: state.holds.recordedDays,
          state: state.name,
        })),
      );
      expect(sheRead.flatMap((at) => sectionsBreakingTheRule(at.measured))).toEqual([]);
    });

    and(
      'a section her own days cannot fill is absent, with one sentence in its place where it owes her one',
      () => {
        const owed = sheRead.flatMap((at) =>
          at.measured.filter((section) => section.owesASentence && !section.hers),
        );

        expect(owed.filter((section) => section.instead.length === 0)).toEqual([]);
        expect(owed.filter((section) => section.drawn.length > 0)).toEqual([]);
        expect(owed.length).toBeGreaterThan(0);
      },
    );

    and('no chart, no strip, no row and no card is drawn from nothing, at any of the four', () => {
      const unearned = sheRead.flatMap((at) =>
        at.measured
          .filter((section) => !section.hers)
          .flatMap((section) => section.drawn.map((part) => `${at.state.name}: ${part}`)),
      );

      expect(unearned).toEqual([]);

      // Named one by one as well, because the four are the shapes a tracker fills a screen with
      // and a record that stopped claiming one of them would pass the sweep above in silence.
      const atDayOne = sheRead[0];

      expect(atDayOne?.state.name).toBe('nothing recorded');
      expect(
        [homeTrendTestID, homeCyclesTestID, homeNumbersTestID, homePatternsTestID].filter((part) =>
          (atDayOne?.drawn ?? []).includes(part),
        ),
      ).toEqual([]);
    });

    and(
      'a section arrives on the state her own days earn it, and never on the state before',
      () => {
        const everyState = herStates.map((state) => state.name);

        expect(whereItWasDrawn('the ring')).toEqual(everyState.slice(1));
        expect(whereItWasDrawn('her past cycles as strips')).toEqual(everyState.slice(1));
        expect(whereItWasDrawn('her three numbers beside the published figures')).toEqual(
          everyState.slice(2),
        );
        expect(whereItWasDrawn('her forecast')).toEqual(everyState.slice(2));
        expect(whereItWasDrawn('the shape of her last cycles')).toEqual(everyState.slice(2));
        expect(whereItWasDrawn('the symptoms that came back')).toEqual(everyState.slice(3));
        expect(whereItWasDrawn('the record for her doctor')).toEqual(everyState);
      },
    );

    and(
      'every part of the screen answers to a section, so one nobody accounted for cannot arrive unread',
      () => {
        expect(
          sheRead.flatMap((at) => at.unanswered.map((part) => `${at.state.name}: ${part}`)),
        ).toEqual([]);
        expect(sectionsClaimingTheSamePart(sheRead.flatMap((at) => at.drawn))).toEqual([]);
        expect(theSectionsOfTheScreenSheOpens.length).toBeGreaterThan(0);
        expect(sheRead.flatMap((at) => at.measured)).toHaveLength(
          theSectionsOfTheScreenSheOpens.length * herStates.length,
        );
      },
    );

    and(
      'no word Emi can say, in any of its three languages, calls anything on a screen a sample',
      () => {
        const repositoryRoot = join(__dirname, '..');
        const read = samplesUnder(repositoryRoot, catalogueFilesOf(repositoryRoot));

        expect(read.problems).toEqual([]);
        expect(read.cataloguesRead).toBe(3);
        expect(read.keysRead).toBeGreaterThan(300);
      },
    );
  });

  test('SCREEN-1, the way past the last period question passes the period before with it', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;
    const everyScreenSheReached: string[] = [];

    function whereSheIsNow(): void {
      everyScreenSheReached.push(app.pathname());
    }

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
      whereSheIsNow();
    });

    and(
      'she gives her name and the year she was born, and reaches the question about her last period',
      async () => {
        await shePresses(onboardingActionTestID);
        whereSheIsNow();
        await fireEvent.changeText(screen.getByTestId(nameFieldTestID), theNameSheGives);
        await shePresses(onboardingActionTestID);
        whereSheIsNow();
        await shePresses(yearTestID(theYearSheWasBornIn));
        await shePresses(onboardingActionTestID);
        whereSheIsNow();

        expect(app.pathname()).toBe('/onboarding/last-period');
      },
    );

    and('she says she does not remember', async () => {
      await shePresses(onboardingWayPastTestID);
      whereSheIsNow();
    });

    then('she is being asked how long her cycle runs', () => {
      expect(app.pathname()).toBe('/onboarding/cycle-length');
      expect(screen.getByTestId('onboarding-cycleLength')).toBeTruthy();
    });

    and('the counter reads step 6 of 12, the twelve steps the first run always had', () => {
      expect(screen.getByTestId(onboardingProgressTestID).props.accessibilityValue).toMatchObject({
        max: theStepsOfTheFirstRun,
        now: theCycleLengthIsStepSix,
      });
      // The total is counted off the list of screens, so the number written out here is what
      // catches a question quietly leaving the run.
      expect(firstRunScreenCount).toBe(theStepsOfTheFirstRun);
    });

    when('she answers the rest of the questions and presses and holds the ring', async () => {
      for (let pressed = defaultCycleLengthDays; pressed < sheSaysHerCycleRuns; pressed += 1) {
        await shePresses(longerTestID);
      }

      await shePresses(onboardingActionTestID);
      whereSheIsNow();

      for (let question = 0; question < theQuestionsLeftAfterTheCycleLength; question += 1) {
        await shePresses(onboardingSkipTestID);
        whereSheIsNow();
      }

      await shePresses(firstForecastActionTestID);
      whereSheIsNow();
      await shePresses(promiseActionTestID);
      whereSheIsNow();
      await shePresses(whatEmiDoesActionTestID);
      whereSheIsNow();
      await sheHoldsTheRing();
      whereSheIsNow();
    });

    then('she was never asked when the period before that started', () => {
      expect(everyScreenSheReached).not.toContain('/onboarding/period-before');
      expect(screen.queryByTestId('onboarding-periodBefore')).toBeNull();
      // A walk that pressed nothing reaches no period before question either, so the screens she
      // did reach are read as well.
      expect(everyScreenSheReached).toContain('/onboarding/cycle-length');
      expect(everyScreenSheReached).toContain('/onboarding/hold');
    });

    and('she is looking at the screen that says the ring needs a period', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(whatItSays(homeNoRingLineTestID)).toBe(cycleCopy.noRing.line);
      expect(screen.queryByTestId(cycleRingTestID)).toBeNull();
    });

    and(
      'her phone holds the name, the year and the length she gave, and no day at all',
      async () => {
        const sealed = readProfile(herDatabase(), await theProfileVaultOnHerPhone());

        expect(sealed?.name).toBe(theNameSheGives);
        expect(sealed?.birthYear).toBe(theYearSheWasBornIn);
        expect(sealed?.cycleLengthDays).toBe(sheSaysHerCycleRuns);
        expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBe(
          whenSheFinishesTheHold.toISOString(),
        );
        expect(listDayLogs(herDatabase())).toEqual([]);
        expect(listCycles(herDatabase())).toEqual([]);
      },
    );
  });

  test('SCREEN-1, the first run with no date ends on a forecast that says it is still learning', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
    });

    and('she reaches the question about when her last period started', async () => {
      await sheReachesTheLastPeriodQuestion();

      expect(screen.getByTestId('onboarding-lastPeriod')).toBeTruthy();
    });

    and('she says she does not remember', async () => {
      await shePresses(onboardingWayPastTestID);
    });

    and('she answers the rest of the questions', async () => {
      for (let pressed = defaultCycleLengthDays; pressed < sheSaysHerCycleRuns; pressed += 1) {
        await shePresses(longerTestID);
      }

      await shePresses(onboardingActionTestID);

      for (let question = 0; question < theQuestionsLeftAfterTheCycleLength; question += 1) {
        await shePresses(onboardingSkipTestID);
      }
    });

    then('she is reading her first forecast, and Emi says it has no date to count from', () => {
      expect(app.pathname()).toBe('/onboarding/first-forecast');
      expect(whatItSays(firstForecastTitleTestID)).toBe(firstRunCopy.firstForecast.noDate.title);
    });

    and('a line says the first period she logs starts everything', () => {
      expect(textIn(screen.getByTestId(firstForecastLinesTestID))).toContain(
        firstRunCopy.firstForecast.noDate.first,
      );
    });

    and('a line names the cycle length she gave, and no length Emi picked', () => {
      expect(textIn(screen.getByTestId(firstForecastLinesTestID))).toContain(
        statedLengthSentence(sheSaysHerCycleRuns),
      );
      expect(whatItSays(firstForecastLinesTestID)).toContain(String(sheSaysHerCycleRuns));
      expect(whatItSays(firstForecastLinesTestID)).not.toContain(String(defaultCycleLengthDays));
    });

    and('the card says Emi is still learning, and how many complete cycles it needs', () => {
      expect(textIn(screen.getByTestId(firstForecastStillLearningTestID))).toEqual([
        learningCopy.stillLearning,
        cyclesBeforeAForecastSentence(CYCLES_BEFORE_A_FORECAST),
      ]);
      // The number is the arithmetic's own, read off the answer CYCLE-3 gives her answers.
      const answer = forecastFromHerAnswers({ cycleLengthDays: sheSaysHerCycleRuns });

      expect(answer.kind === 'learning' ? answer.needsCycles : 0).toBe(CYCLES_BEFORE_A_FORECAST);
    });

    and('a line says Emi builds no forecast from a date it guessed', () => {
      expect(whatItSays(firstForecastNoGuessTestID)).toBe(firstRunCopy.firstForecast.noDate.guess);
    });

    and('no range and no date is written anywhere on that screen', () => {
      expect(screen.queryByTestId(firstForecastRangeTestID)).toBeNull();
      expect(daysNamedIn(whatItSays(firstForecastTestID))).toEqual([]);
      expect(listDayLogs(herDatabase())).toEqual([]);
    });

    and(
      'that is the drawing of the first forecast with no date, part for part, in its order',
      () => {
        expect(partsMissing(thePartsOfTheForecastWithNoDate(), theIdentifiersDrawn())).toEqual([]);
      },
    );

    and(
      'the screen offers the way on, and no way back to the question she could not answer',
      () => {
        expect(screen.getByTestId(firstForecastActionTestID)).toBeTruthy();
        expect(screen.queryByTestId(onboardingBackTestID)).toBeNull();
        expect(screen.queryByTestId(onboardingWayPastTestID)).toBeNull();
        expect(screen.queryByTestId('onboarding-lastPeriod')).toBeNull();
      },
    );

    when('she presses the way on', async () => {
      await shePresses(firstForecastActionTestID);
    });

    then('she is reading what Emi promises her', () => {
      expect(app.pathname()).toBe('/onboarding/the-promise');
      expect(screen.getByTestId(thePromiseTestID)).toBeTruthy();
    });
  });

  test('SCREEN-1, she completes the first run with no date, logs a period, and reads a ring', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
    });

    and(
      'she answers every question of the first run, and says she does not remember her last period',
      async () => {
        await sheAnswersEveryQuestionWithNoDate({ cycleLengthDays: sheSaysHerCycleRuns });

        expect(app.pathname()).toBe('/onboarding/hold');
      },
    );

    and('she presses and holds the ring', async () => {
      await sheHoldsTheRing();
    });

    then('she is looking at the screen that says what the ring needs', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(whatItSays(homeNoRingTitleTestID)).toBe(cycleCopy.noRing.title);
      expect(whatItSays(homeNoRingLineTestID)).toBe(cycleCopy.noRing.line);
    });

    and('there is no ring, and nothing at all is drawn in place of one', () => {
      expect(screen.queryByTestId(cycleRingTestID)).toBeNull();
      expect(thePartsTheDayOneDrawingNames().map((part) => part.name)).not.toContain('CycleRing');
    });

    and('the card counts the cycle length she gave, and no length Emi picked', () => {
      const said = whatItSays(learningStatedLengthTestID);

      expect(said).toBe(statedLengthSentence(sheSaysHerCycleRuns));
      expect(said).not.toContain(String(defaultCycleLengthDays));
    });

    and('her phone holds no day at all', () => {
      expect(listDayLogs(herDatabase())).toEqual([]);
      expect(listCycles(herDatabase())).toEqual([]);
    });

    and('that is the drawing of day one, part for part, in the order it places them', () => {
      expect(partsMissing(thePartsOfTheDayOneDrawing(), theIdentifiersDrawn())).toEqual([]);
      expect(thePartsTheDayOneDrawingNames().map((part) => part.name)).toEqual(
        thePartsOfTheDayOneDrawing().map((part) => part.name),
      );
    });

    when('she presses the button that offers to log today', async () => {
      await shePresses(homeLogTodayTestID);

      expect(app.pathname()).toBe('/log');
      expect(screen.getByTestId(flowPickerTestID)).toBeTruthy();
    });

    and('she says her period came today', async () => {
      await shePresses(flowOptionTestID('medium'));
    });

    and('she presses the way back', async () => {
      await shePresses(logFlowDoneTestID);
    });

    then('she is reading a ring drawn from the day she logged', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(cycleRingTestID)).toBeTruthy();
      expect(theCycleStartsHerPhoneHolds()).toEqual([today]);
    });

    and('the ring says she is on the first day of a cycle of the length she gave', () => {
      expect(theRingSays()).toBe(ringSpokenLabel(1, sheSaysHerCycleRuns, phaseLabel.period));
    });

    and('nothing offers to log today any more', () => {
      for (const gone of [homeLogTodayTestID, homeNoRingTitleTestID, homeNoRingLineTestID]) {
        expect(screen.queryByTestId(gone)).toBeNull();
      }
    });
  });

  // The dock is the one piece of chrome every screen she can reach carries, so its redesign is
  // read with the navigator under it. A bar that lost one of its four routes is a bar that broke
  // the product, and nothing drawn against the component alone would say so.
  test('SCREEN-2, the dock takes the redesign look and keeps its routes', ({
    given,
    when,
    then,
    and,
  }) => {
    const theFourColumns = [
      { label: 'Today', name: 'index', reaches: homeScreenTestID },
      { label: 'Log', name: 'log/index', reaches: logFlowTestID },
      { label: 'Insights', name: 'history', reaches: historyScreenTestID },
      { label: 'Privacy', name: 'settings/index', reaches: settingsScreenTestID },
    ];

    /** Points. The height the prototype gives a column of the bar. */
    const theColumnHeight = 52;

    /** The drawing and the word of one column, which is everything a column holds. */
    const theColumn = (
      name: string,
    ): { readonly drawing: Record<string, unknown>; readonly word: Record<string, unknown> } => {
      const [drawing, word] = screen.getByTestId(tabTestID(name)).children;
      const propsOf = (held: unknown): Record<string, unknown> =>
        (held as { props: Record<string, unknown> }).props;

      return { drawing: propsOf(drawing), word: propsOf(word) };
    };

    /**
     * The colour the drawing of a column is stroked in. The word beside it takes its colour from a
     * class, and this tier compiles no theme, so a class resolves to nothing here. The word's own
     * colour is read in `apps/mobile/tests/integration/22.7.test.tsx`, which compiles the theme.
     */
    const theDrawingColourOf = (name: string): unknown => theColumn(name).drawing['stroke'];

    given('her phone holds six cycles of her own', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 28, periodDays: 4, dayOfCycle: 2 }),
      );
    });

    when('she opens Emi and reads the dock across the foot of the screen', async () => {
      await sheOpens('/');

      expect(screen.getByTestId(bottomNavigationTestID)).toBeTruthy();
      expect(theColumnsOfTheDock()).toEqual(theFourColumns.map((column) => tabTestID(column.name)));
    });

    then('the dock is a white bar that reaches both edges of the glass, under one hairline', () => {
      const bar = flattenedStyleOf(bottomNavigationTestID);

      expect(bar).toMatchObject({
        backgroundColor: colour.card,
        borderTopColor: colour.line,
        borderTopWidth: stroke.hairline,
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
      });
      // A bar rather than a capsule standing over her screen, so there is no corner, no hairline
      // on the other three edges, and none of the one shadow the design system allows a panel.
      expect(bar['borderRadius']).toBeUndefined();
      expect(bar['borderWidth']).toBeUndefined();
      expect(bar['boxShadow']).toBeUndefined();
    });

    and(
      'each of the four columns takes an equal share of the width, with its word under its drawing',
      () => {
        for (const column of theFourColumns) {
          const drawn = flattenedStyleOf(tabTestID(column.name));

          expect(drawn).toMatchObject({ flex: 1, minHeight: theColumnHeight });
          expect(drawn['backgroundColor']).toBeUndefined();
          expect(theColumn(column.name).drawing['width']).toBe(ICON_SIZE);
          expect(theColumn(column.name).word['children']).toBe(column.label);
        }
      },
    );

    and(
      'the drawing in the column she is on is stroked in the accent, and the other three in the quiet dock colour',
      () => {
        expect(theDrawingColourOf('index')).toBe(colour.accent);

        for (const column of theFourColumns.slice(1)) {
          expect(theDrawingColourOf(column.name)).toBe(colour.dockQuiet);
        }
      },
    );

    and('the screen above the bar leaves exactly the room the bar draws', () => {
      // The room is the sum of what the bar draws on the phone that keeps the most glass for
      // itself, read off the bar rather than typed beside the code it describes. The runner hands
      // the screens no insets, so the room the phone keeps arrives from the token the dock pads
      // itself by, which `22.7` holds against the inset a phone with an island reports.
      const room =
        Number(flattenedStyleOf(dockPanelTestID)['paddingTop']) +
        Number(flattenedStyleOf(tabTestID('index'))['minHeight']) +
        deepestHomeIndicator;

      expect(dockRoom).toBe(room);
      expect(flattenedStyleOf(homeScreenTestID)['paddingBottom']).toBe(dockRoom);
    });

    and(
      'pressing each column opens the screen behind it and moves the accent onto it',
      async () => {
        for (const column of theFourColumns) {
          await shePresses(tabTestID(column.name));

          expect(screen.getByTestId(column.reaches)).toBeTruthy();
          expect(screen.getByTestId(bottomNavigationTestID)).toBeTruthy();
          expect(theDrawingColourOf(column.name)).toBe(colour.accent);

          for (const other of theFourColumns.filter((each) => each.name !== column.name)) {
            expect(theDrawingColourOf(other.name)).toBe(colour.dockQuiet);
          }
        }
      },
    );
  });

  // The palette the home screen is drawn in comes from the prototype, through the front matter of
  // the design document, into the token package. This is the first link of that chain, and the one
  // place a colour can enter without anything reading it.
  test('SCREEN-2, every colour in the redesign prototype has a name in the design document', ({
    given,
    when,
    and,
    then,
  }) => {
    const repositoryRoot = join(__dirname, '..');
    let painted: Screen[] = [];
    let described: Described;
    let named: ReadonlySet<string> = new Set();

    /** The same colour written as a function at the alpha given, so no value is typed here. */
    const atAlpha = (value: string, alpha: number): string =>
      `rgba(${[1, 3, 5].map((at) => Number.parseInt(value.slice(at, at + 2), 16)).join(',')},${alpha})`;

    given(
      'the fifty two screens of the redesign prototype, and the design document written from them',
      () => {
        painted = readdirSync(join(repositoryRoot, prototypeDirectory))
          .filter((file) => file.endsWith(screenSuffix))
          .sort()
          .map((file) => ({
            file,
            markup: readFileSync(join(repositoryRoot, prototypeDirectory, file), 'utf8'),
          }));
        described = describedIn(readFileSync(join(repositoryRoot, designSystemDocument), 'utf8'));

        expect(painted).toHaveLength(52);
        expect(Object.keys(described.colours).length).toBeGreaterThan(30);
      },
    );

    when('every colour the screens paint with is read against the names in that document', () => {
      named = namedValues(described);
      const mentions = painted.flatMap(({ markup }) => coloursDrawnIn(markup));

      expect(mentions).toHaveLength(2432);
      expect(new Set(mentions.map(opaqueBaseOf)).size).toBe(35);
      expect(named.size).toBeGreaterThanOrEqual(35);
    });

    then(
      'every one of them has a name, and every name in the document is painted by a screen',
      () => {
        expect(coloursWithNoName(named, painted)).toEqual([]);
        expect(namesDrawnNowhere(described, painted)).toEqual([]);
      },
    );

    and('a translucent colour is held to the opaque colour underneath it', () => {
      const card = String(described.colours['card']);
      const seventenths = atAlpha(card, 0.7);

      expect(opaqueBaseOf(seventenths)).toBe(card.toLowerCase());
      expect(
        coloursWithNoName(named, [
          { file: 'one', markup: `<div style="background:${seventenths}">` },
        ]),
      ).toEqual([]);
      expect(
        coloursWithNoName(named, [
          { file: 'one', markup: `<div style="background:${atAlpha(card, 0)}">` },
        ]),
      ).toEqual([]);
    });

    and(
      'a colour the prototype paints under the contrast floor records the value Emi builds instead',
      () => {
        const raised = Object.keys(described.raised).sort();

        expect(raised).toEqual(['accent-soft-ink', 'dock-quiet', 'picker-far', 'picker-near']);

        for (const name of raised) {
          const entry = described.raised[name];
          const ground = String(described.colours[String(entry?.on)]);

          expect(named.has(String(entry?.prototype).toLowerCase())).toBe(true);
          expect(contrastRatio(String(entry?.prototype), ground)).toBeLessThan(CONTRAST_FLOOR);
          expect(contrastRatio(String(described.colours[name]), ground)).toBeGreaterThanOrEqual(
            CONTRAST_FLOOR,
          );
        }
      },
    );

    and('the ink of each phase is readable on the ground the ring writes the phase name on', () => {
      const ground = String(described.colours['ground']);

      for (const phase of phaseNames) {
        const ink = String(described.colours[`${phase}-ink`]);

        expect(ink).not.toBe(described.colours[phase]);
        expect(contrastRatio(ink, ground)).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
      }
    });
  });

  // The wash is the quietest cue Emi has: colour across the top of the screen and not one word, so
  // a stranger at arm's length reads warmth and nothing else. It has to be the phase's own colours
  // rather than a decoration, and the colours have to be the ones the design document names, which
  // is the chain this walks from the document to what reaches the glass.
  test('SCREEN-2, the top wash takes the colours of the phase of today', ({
    given,
    when,
    and,
    then,
  }) => {
    const repositoryRoot = join(__dirname, '..');
    let named: Readonly<Record<string, readonly string[]>> = {};
    const drawn = new Map<string, string[]>();

    /** The colours one wash ran through on the glass, the two tints first, then the field. */
    const washOnTheGlass = async (phase?: PhaseName): Promise<string[]> => {
      const painted = await render(<Wash phase={phase} />);
      const tree = painted.toJSON();
      const tints = ([1, 2] as const).map((at) =>
        washColoursOf(stopsOf(gradientNamed(tree, washTintGradientID(at)))),
      );

      expect(paintedWith(tree, washFieldTestID)).toBe(washFieldGradientID);

      return [...tints.flat(), ...washColoursOf(stopsOf(gradientNamed(tree, washFieldGradientID)))];
    };

    given(
      'the four phases of a cycle, and the wash the design document names for each of them',
      () => {
        named = describedIn(readFileSync(join(repositoryRoot, designSystemDocument), 'utf8')).wash;

        expect(phaseNames).toHaveLength(4);
        expect(Object.keys(named).sort()).toEqual(['luteal', 'ovulation', 'period', 'soft']);
        for (const wash of Object.values(named)) {
          expect(wash).toHaveLength(4);
        }
      },
    );

    when('the wash at the top of the screen is drawn for the phase she is in', async () => {
      for (const phase of phaseNames) {
        drawn.set(phase, await washOnTheGlass(phase));
      }

      expect([...drawn.keys()]).toEqual([...phaseNames]);
    });

    then(
      'it runs through the colours that phase names, from its own tint down to the ground',
      () => {
        for (const phase of phaseNames) {
          const written = named[washOfPhase[phase]];

          expect(written).toBeDefined();
          expect(drawn.get(phase)?.map((value) => value.toLowerCase())).toEqual(
            (written ?? []).map((value) => value.toLowerCase()),
          );
          expect(drawn.get(phase)?.at(-1)?.toLowerCase()).toBe(
            String(named['soft']?.at(-1)).toLowerCase(),
          );
        }
      },
    );

    and('each tint fades to nothing, so no phase leaves an edge across the screen', async () => {
      for (const phase of phaseNames) {
        const painted = await render(<Wash phase={phase} />);

        for (const at of [1, 2] as const) {
          const stops = stopsOf(gradientNamed(painted.toJSON(), washTintGradientID(at)));
          const last = stops.at(-1);

          expect(stops).toHaveLength(2);
          expect(stops[0]?.opacity).toBe(1);
          expect(last?.opacity).toBe(0);
          expect(last?.colour).toBe(stops[0]?.colour);
        }
      }
    });

    and(
      'a screen that knows no phase yet draws the soft wash every other screen draws',
      async () => {
        const soft = (named['soft'] ?? []).map((value) => value.toLowerCase());

        expect((await washOnTheGlass(undefined)).map((value) => value.toLowerCase())).toEqual(soft);
        expect((await washOnTheGlass('follicular')).map((value) => value.toLowerCase())).toEqual(
          soft,
        );
      },
    );

    and('no colour of a wash is ever drawn as a word, because colour is all it carries', () => {
      const stops = washNames.flatMap((name) => washStops(washes[name]));

      expect(stops).toHaveLength(16);
      expect(stops.filter((stop) => hasRole(stop, 'text'))).toEqual([]);
      expect(stops.flatMap((stop) => colours[stop].textOn)).toEqual([]);
    });
  });

  // The redesign of the month, read as she reads it: the phases she never saw on this grid before,
  // the two words that say what the colours mean, and the panel that names the day she pressed.
  test('SCREEN-4, the month grid takes the redesign look', ({ given, when, and, then }) => {
    let app: OpenApp;
    let sheWasSentTo = '';

    given('her phone holds three recorded cycles', async () => {
      jest.setSystemTime(whenSheOpensTheMonth());
      await herPhoneHoldsThreeRecordedCycles(whenSheOpensTheMonth());
    });

    when('she opens the month', async () => {
      app = await sheOpens('/calendar');
    });

    then('every date sits in a disc of its own, with the day of her cycle above it', () => {
      expect(app.pathname()).toBe('/calendar');
      expect(theSquaresTheMonthDrew().length).toBeGreaterThan(theColumnsOfTheDrawing().length);
      expect(theSquaresCountingTheirCycleDayBelowTheDate()).toEqual([]);

      for (const day of theSquaresTheMonthDrew()) {
        expect(theDiscAroundTheDate(day).width).toBe(theDiscAroundTheDate(day).height);
        expect(theCycleDayOver(day)).toBe(theDayTheRingSaysOn(day));
      }
    });

    and('the days she bled are filled with the colour of her period', () => {
      expect(theDaysTheDrawingFills().length).toBeGreaterThan(1);

      for (const day of theDaysTheDrawingFills()) {
        expect(thePhaseGroundOn(day)).toBe(colour.period);
        expect(theDateInkOn(day)).toBe(colour.onAccent);
      }
    });

    and('every fertile day the ring counts is tinted', () => {
      const tinted = theFertileDaysTheRingCounts().filter(
        (day) => day !== theOvulationDayTheForecastNames(),
      );

      expect(tinted.length).toBeGreaterThan(0);

      for (const day of tinted) {
        expect(thePhaseGroundOn(day)).toBe(colour.washWarm);
        expect(theDateInkOn(day)).toBe(colour.ovulationInk);
      }
    });

    and('the one day the forecast names as the estimated ovulation is filled', () => {
      const ovulation = String(theOvulationDayTheForecastNames());

      expect(theOvulationDayTheForecastNames()).toBeDefined();
      expect(theFertileDaysTheRingCounts()).toContain(ovulation);
      expect(thePhaseGroundOn(ovulation)).toBe(colour.ovulation);
      expect(theDateInkOn(ovulation)).toBe(colour.text);
    });

    and('a legend above the grid names her period and her fertile days', () => {
      expect(theLegendSheReads()).toEqual({
        fertile: monthLegendCopy.fertile,
        period: monthLegendCopy.period,
      });
      expect(theLegendDots()).toEqual({ fertile: colour.ovulation, period: colour.period });
    });

    when('she presses the day the drawing names', async () => {
      sheWasSentTo = theDayTheDrawingsSheetNames();
      await shePresses(dayTestID(sheWasSentTo));
    });

    then('a panel at the foot names that day, over the way to her whole period', () => {
      const held = whatThePanelHolds();

      expect(theSheetSheReads()?.lead).toContain(String(Number(sheWasSentTo.slice(8, 10))));
      expect(held.indexOf(daySheetTestID)).toBeGreaterThanOrEqual(0);
      expect(held.indexOf(daySheetTestID)).toBeLessThan(held.indexOf(calendarEditPeriodTestID));
    });

    and('pressing that panel opens the day it names', async () => {
      await shePresses(daySheetTestID);

      expect(app.pathname()).toBe(`/day/${sheWasSentTo}`);
    });
  });

  // The ring and the week above it are the two drawings she reads before she reads a word, so
  // both are proved on the screen she actually opens rather than against either part on its own.
  //
  // It runs before the scenario below rather than after it, which is where the feature file reads
  // it. That one draws the four buttons on a page of its own, outside the provider the
  // application wraps them in, and the font loader never settles again in this file afterwards:
  // every later scenario that drives the router waits for a screen that never arrives.
  test('SCREEN-2, the ring and the week strip take the redesign look', ({
    given,
    when,
    then,
    and,
  }) => {
    const herCycle = { cycleLengthDays: 28, dayOfCycle: 2, periodDays: 4 };

    /** Her week, in the order the strip drew it, named by the day each column stands for. */
    const theColumnsOfHerWeek = (): string[] => {
      const named = weekDayTestID('');

      return screen
        .queryAllByTestId(new RegExp(`^${named}`))
        .map((column) => String(column.props.testID).slice(named.length));
    };

    /** What one column of the strip wrote in place of the letter of its weekday. */
    const theLetterOver = (day: string): string =>
      textIn(screen.getByTestId(weekLetterTestID(day))).join('');

    /** How the disc around one date is drawn, which is the whole of what that day says. */
    const theDiscOn = (day: string): Record<string, unknown> =>
      (StyleSheet.flatten(screen.getByTestId(weekDateTestID(day)).props.style) ?? {}) as Record<
        string,
        unknown
      >;

    given('her phone holds six cycles of her own', async () => {
      // The length of her period is one of her answers at the first run, so the arc ahead of her
      // covers the days she is expected to bleed on rather than only the days she already logged.
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays(herCycle),
        herCycle.cycleLengthDays,
        herCycle.periodDays,
      );
    });

    when('she opens Emi and reads the ring and the week above it', async () => {
      await sheOpens('/');

      expect(screen.getByTestId(cycleRingTestID)).toBeTruthy();
      expect(screen.getByTestId(weekStripTestID)).toBeTruthy();
      expect(theColumnsOfHerWeek()).toHaveLength(7);
    });

    then(
      'the middle of the ring names her phase, then the day she is on, then the length of her cycle',
      () => {
        expect(theMiddleOfTheRing()).toEqual([
          phaseLabel.period,
          String(herCycle.dayOfCycle),
          ringCycleLengthWords(herCycle.cycleLengthDays),
        ]);
      },
    );

    and(
      'every arc ends in a round end, and ground still shows at every boundary between two phases',
      () => {
        const ends = theEndsOfTheArcs();
        const ground = theGroundBetweenTheArcs();

        expect(ends.length).toBeGreaterThan(1);
        expect(ends.filter((end) => end !== 'round')).toEqual([]);

        // Ground first, and the measured width second, because a boundary of no degrees is a
        // change of colour and nothing else.
        expect(ground.length).toBeGreaterThan(1);
        for (const gap of ground) {
          expect(gap).toBeGreaterThan(0);
          expect(gap).toBeCloseTo(GAP_DEGREES, 2);
        }
      },
    );

    and('the bead on today is a white disc with a dark line around it', () => {
      expect(theBeadSheSees()).toEqual({ fill: colour.card, line: colour.text });
    });

    and(
      'the days she bled are filled discs, and the day her period is expected on is a dashed outline',
      () => {
        const filled = theColumnsOfHerWeek().filter(
          (day) => theDiscOn(day)['backgroundColor'] === colour.period,
        );
        const outlined = theColumnsOfHerWeek().filter(
          (day) => theDiscOn(day)['borderStyle'] === 'dashed',
        );

        expect(filled.length).toBeGreaterThan(0);
        expect(outlined.length).toBeGreaterThan(0);

        for (const day of outlined) {
          expect(theDiscOn(day)).toMatchObject({
            borderColor: colour.period,
            borderStyle: 'dashed',
          });
          expect(theDiscOn(day)['backgroundColor']).toBeUndefined();
        }
      },
    );

    and('the column she is on is named TODAY in place of its weekday letter', () => {
      const hers = theColumnsOfHerWeek().filter((day) => day === today);

      expect(hers).toEqual([today]);
      expect(theLetterOver(today)).toBe(weekTodayWord());
      expect(theLetterOver(today)).not.toBe(weekdayLetter(today));

      for (const day of theColumnsOfHerWeek().filter((column) => column !== today)) {
        expect(theLetterOver(day)).toBe(weekdayLetter(day));
      }
    });
  });

  test('SCREEN-1, the tour tells her the ring is her cycle', ({ given, when, then, and }) => {
    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then(
      'the first thing she reads says the ring is her cycle, the dot is today, and what the number inside it means',
      () => {
        expect(theCardOfTheTourSheIsOn()).toBe('ring');

        const card = within(screen.getByTestId(tourScreenTestID('ring')));

        expect(card.getByText(whatTheFirstCardSays.title)).toBeTruthy();
        expect(card.getByText(whatTheFirstCardSays.dot)).toBeTruthy();
        expect(card.getByText(whatTheFirstCardSays.colours)).toBeTruthy();
      },
    );

    and('the card speaks to her as you, and names Emi nowhere', () => {
      const said = [tourCopy.ring.title, ...tourCopy.ring.lines];

      for (const line of said) {
        expect({ line, toHer: /(?<!\p{Letter})(you|your)(?!\p{Letter})/iu.test(line) }).toEqual({
          line,
          toHer: true,
        });
        expect(line).not.toContain('Emi');
      }
    });

    and(
      'the four cards say what we do for her, in each of the three languages she can read them in',
      () => {
        for (const language of languages) {
          const said = theWordsOfTheTourIn(language);
          const read = said.join('\n');

          // A denial names Emi on purpose, so the two of them come out before the rest is read.
          expect({ language, aboutEmi: searchableText(read).includes('Emi') }).toEqual({
            language,
            aboutEmi: false,
          });
          expect({ language, toHerAsWe: howEachLanguageSaysWe[language].test(read) }).toEqual({
            language,
            toHerAsWe: true,
          });
          expect(said.length).toBeGreaterThan(12);
        }

        expect(languages.length).toBe(3);
      },
    );

    and(
      'the card that names a forecast still denies the two claims, and no card says a word a screen refuses',
      () => {
        const theFirstDenial = 'Emi is not a c';
        const theSecondDenial = 'Emi is not a m';
        const denial = (beginning: string): string => {
          const found = approvedDenials.find((each) => each.startsWith(beginning));

          if (found === undefined) {
            throw new Error(`no approved denial starts with "${beginning}"`);
          }

          return found;
        };

        const denying = tourCopy.range.lines.filter((line) =>
          line.includes(denial(theFirstDenial)),
        );

        expect(denying).toHaveLength(1);
        expect(denying[0]).toContain(denial(theSecondDenial));
        // The gate reads a denial as a claim unless a full stop comes before it.
        expect(denying[0]?.startsWith(denial(theFirstDenial))).toBe(false);

        for (const language of languages) {
          const claims = interfaceClaimsIn(
            `the tour in ${language}`,
            theWordsOfTheTourIn(language).join('\n'),
          );

          expect(claims.map(describeClaim)).toEqual([]);
        }
      },
    );
  });

  /**
   * The first run as a conversation. The name she typed comes back at the question after it, a
   * woman who gave none reads a clean question, and an answer she gives is answered where she
   * gave it.
   */
  test('SCREEN-1, the first run greets her by the name she gave', ({ given, when, then, and }) => {
    const theQuestionAfterHerName = `Nice to meet you, ${theNameSheGives}. What year were you born?`;
    const theSameQuestionWithNoName = 'What year were you born?';
    const theReplyToACycleThatMoves =
      "That's common. We'll start with a wider range and narrow it as we learn yours.";
    const theReplyToACycleSheIsNotSureOf = "That's fine. Your log will tell us soon enough.";

    /** The one line about who can read her answers, written out in each language she reads. */
    const onlyYouCanReadThis: Readonly<Record<Language, string>> = {
      en: 'Only you can read this.',
      es: 'Solo tú puedes leer esto.',
      ru: 'Это можете прочитать только вы.',
    };

    /** The one key behind that line, which is why five questions cannot drift apart saying it. */
    const theKeyOfThatLine = 'onboarding.onlyYou';

    let app: OpenApp;

    const theQuestionSheIsReading = (): string =>
      String(screen.getByTestId(onboardingTitleTestID).props.children);

    /** Her phone forgets her, so the next woman through the questions is a new one. */
    async function anotherWomanOpensEmi(): Promise<void> {
      await app.close();
      resetExpoSqlite();
      resetExpoSecureStore();
      app = await sheOpens('/');
      await sheSkipsTheTour();
    }

    /** Past the welcome and the six questions before it, standing on the one about her cycle. */
    async function sheReachesTheQuestionAboutARegularCycle(): Promise<void> {
      await sheReachesTheLastPeriodQuestion();
      await shePresses(dayTestID(herPeriodStarted));
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
    }

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi, skips the tour, and gives her name', async () => {
      app = await sheOpens('/');
      await sheSkipsTheTour();
      await shePresses(onboardingActionTestID);
      await fireEvent.changeText(screen.getByTestId(nameFieldTestID), theNameSheGives);
      await shePresses(onboardingActionTestID);
    });

    then('the question after it greets her by the name she gave', () => {
      expect(app.pathname()).toBe('/onboarding/year-of-birth');
      expect(theQuestionSheIsReading()).toBe(theQuestionAfterHerName);
      expect(screen.getByText(theQuestionAfterHerName)).toBeTruthy();
    });

    and(
      'a woman who gives no name reads the same question, with no gap where a name would be',
      async () => {
        await anotherWomanOpensEmi();
        await shePresses(onboardingActionTestID);
        await shePresses(onboardingSkipTestID);

        expect(app.pathname()).toBe('/onboarding/year-of-birth');
        expect(theQuestionSheIsReading()).toBe(theSameQuestionWithNoName);
        expect(screen.queryByText(theQuestionAfterHerName)).toBeNull();
      },
    );

    and(
      'picking that her cycle moves around answers her with the reply to that answer',
      async () => {
        await anotherWomanOpensEmi();
        await sheReachesTheQuestionAboutARegularCycle();

        expect(app.pathname()).toBe('/onboarding/regularity');
        expect(screen.queryByText(theReplyToACycleThatMoves)).toBeNull();

        await shePresses(regularityTestID('moves'));

        expect(screen.getByTestId(regularityReplyTestID)).toHaveTextContent(
          theReplyToACycleThatMoves,
        );
        expect(screen.queryByText(theReplyToACycleSheIsNotSureOf)).toBeNull();

        // She can change her mind, and then she is answered about the answer she holds now.
        await shePresses(regularityTestID('unknown'));

        expect(screen.getByTestId(regularityReplyTestID)).toHaveTextContent(
          theReplyToACycleSheIsNotSureOf,
        );
        expect(screen.queryByText(theReplyToACycleThatMoves)).toBeNull();
      },
    );

    and(
      'every question that keeps an answer tells her only she can read it, in all three languages',
      async () => {
        for (const language of languages) {
          const held: Readonly<Record<string, Words>> = Object.fromEntries(
            Object.entries(catalogueOf(language)),
          );

          expect({ language, said: held[theKeyOfThatLine] }).toEqual({
            language,
            said: onlyYouCanReadThis[language],
          });
        }

        expect(languages.length).toBe(3);

        // And she reads it on each of the five questions that keep an answer, which is the round
        // trip the catalogue above cannot prove on its own.
        await anotherWomanOpensEmi();
        await shePresses(onboardingActionTestID);

        expect(screen.getByText(onlyYouCanReadThis.en)).toBeTruthy();

        await shePresses(onboardingSkipTestID);

        expect(screen.getByText(onlyYouCanReadThis.en)).toBeTruthy();

        await shePresses(onboardingSkipTestID);

        expect(screen.getByText(onlyYouCanReadThis.en)).toBeTruthy();

        await shePresses(dayTestID(herPeriodStarted));
        await shePresses(onboardingActionTestID);
        await shePresses(onboardingSkipTestID);
        await shePresses(onboardingActionTestID);
        await shePresses(onboardingSkipTestID);
        await shePresses(onboardingSkipTestID);

        expect(app.pathname()).toBe('/onboarding/feeling');
        expect(screen.getByText(onlyYouCanReadThis.en)).toBeTruthy();

        await shePresses(onboardingSkipTestID);

        expect(app.pathname()).toBe('/onboarding/goals');
        expect(screen.getByText(onlyYouCanReadThis.en)).toBeTruthy();
      },
    );
  });
  /**
   * The forecast is the first thing Emi says back to her, so it says it to her: the name she
   * typed at the second question opens the sentence, and a woman who gave none reads a clean one.
   * The three screens between it and the hold talk to her as you.
   */
  test('SCREEN-1, her first forecast is addressed to her', ({ given, when, then, and }) => {
    const theTitleOfHerForecast = {
      named: `${theNameSheGives}, here's your next period`,
      plain: "Here's your next period",
    };
    const theTitleOfWhatWeWillDo = {
      named: `${theNameSheGives}, here's what we'll do with your answers`,
      plain: "Here's what we'll do with your answers",
    };
    const thePromiseStillSays = 'Only you can read your days.';
    const theHoldStillSays = 'Your cycle. Your data. Your key.';

    /** The keys of the four screens from the forecast to the hold, in every language. */
    const theseScreens: readonly string[] = [
      'onboarding.firstForecast.',
      'onboarding.promise.',
      'onboarding.whatEmiDoes.',
      'onboarding.hold.',
    ];

    let app: OpenApp;

    const theTitleSheIsReading = (testID: string): string[] => textIn(screen.getByTestId(testID));

    /** Her phone forgets her, so the next woman through the questions is a new one. */
    async function anotherWomanOpensEmi(): Promise<void> {
      await app.close();
      resetExpoSqlite();
      resetExpoSecureStore();
      app = await sheOpens('/');
      await sheSkipsTheTour();
    }

    /**
     * The welcome and the twelve questions, with her last period answered and the rest passed,
     * which leaves her standing on the forecast rather than on the hold.
     */
    async function sheAnswersEverythingAndReachesHerForecast(name?: string): Promise<void> {
      await shePresses(onboardingActionTestID);

      if (name === undefined) {
        await shePresses(onboardingSkipTestID);
      } else {
        await fireEvent.changeText(screen.getByTestId(nameFieldTestID), name);
        await shePresses(onboardingActionTestID);
      }

      await shePresses(onboardingSkipTestID);
      await shePresses(dayTestID(herPeriodStarted));
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingActionTestID);

      for (let question = 0; question < theQuestionsLeftAfterTheCycleLength; question += 1) {
        await shePresses(onboardingSkipTestID);
      }
    }

    /** Every word of the four screens in one language, out of that language's own catalogue. */
    function theWordsOfTheseScreensIn(language: Language): string[] {
      const catalogue = catalogueOf(language);

      return wordKeys
        .filter((key) => theseScreens.some((screen) => key.startsWith(screen)))
        .flatMap((key) => formsOf(catalogue[key]));
    }

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi, skips the tour, gives her name, and answers every question', async () => {
      app = await sheOpens('/');
      await sheSkipsTheTour();
      await sheAnswersEverythingAndReachesHerForecast(theNameSheGives);
    });

    then('the forecast she reads is addressed to her by the name she gave', () => {
      expect(app.pathname()).toBe('/onboarding/first-forecast');
      expect(theTitleSheIsReading(firstForecastTitleTestID)).toEqual([theTitleOfHerForecast.named]);
    });

    and(
      'a woman who gave no name reads the same forecast, with no gap where a name would be',
      async () => {
        await anotherWomanOpensEmi();
        await sheAnswersEverythingAndReachesHerForecast();

        expect(app.pathname()).toBe('/onboarding/first-forecast');
        expect(theTitleSheIsReading(firstForecastTitleTestID)).toEqual([
          theTitleOfHerForecast.plain,
        ]);
        expect(screen.queryByText(theTitleOfHerForecast.named)).toBeNull();
      },
    );

    and('the screen that reads her answers back is addressed to her too', async () => {
      await anotherWomanOpensEmi();
      await sheAnswersEverythingAndReachesHerForecast(theNameSheGives);
      await shePresses(firstForecastActionTestID);

      expect(app.pathname()).toBe('/onboarding/the-promise');
      expect(textIn(screen.getByTestId(thePromiseTestID))).toContain(thePromiseStillSays);

      await shePresses(promiseActionTestID);

      expect(app.pathname()).toBe('/onboarding/what-emi-does-with-it');
      expect(theTitleSheIsReading(whatEmiDoesTitleTestID)).toEqual([theTitleOfWhatWeWillDo.named]);

      // And the plain sentence for a woman Emi cannot greet, read on the same screen.
      await anotherWomanOpensEmi();
      await sheAnswersEverythingAndReachesHerForecast();
      await shePresses(firstForecastActionTestID);
      await shePresses(promiseActionTestID);

      expect(theTitleSheIsReading(whatEmiDoesTitleTestID)).toEqual([theTitleOfWhatWeWillDo.plain]);
    });

    and(
      'the promise and the hold talk to her as you, in each of the three languages she can read them in',
      async () => {
        for (const language of languages) {
          const read = theWordsOfTheseScreensIn(language).join('\n');

          expect({ language, asWe: howEachLanguageSaysWe[language].test(read) }).toEqual({
            language,
            asWe: true,
          });
          expect(
            interfaceClaimsIn(`the four screens in ${language}`, read).map(describeClaim),
          ).toEqual([]);
        }

        expect(languages.length).toBe(3);

        // And she reads the hold at the end of the walk, which is the round trip the catalogue
        // above cannot prove on its own.
        await shePresses(whatEmiDoesActionTestID);

        expect(app.pathname()).toBe('/onboarding/hold');
        expect(textIn(screen.getByTestId(holdScreenTestID))).toContain(theHoldStillSays);
      },
    );
  });

  // Every answer she can be asked to choose, on one page, each one held in both states. The answers
  // are the prototype's own, so the page reads as a question of Emi rather than as a measurement.
  test('SCREEN-2, the option rows and chips take the redesign look', ({
    given,
    when,
    and,
    then,
  }) => {
    const answers = ['Yes, most months', 'No, it moves', 'I do not know yet'];

    const styleOfPart = (testID: string): Record<string, unknown> =>
      (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as Record<string, unknown>;

    const styleOfTheWordsIn = (testID: string): Record<string, unknown> => {
      const [words] = screen.getByTestId(testID).children;

      return (StyleSheet.flatten(
        (words as unknown as { props: { style?: unknown } }).props.style,
      ) ?? {}) as Record<string, unknown>;
    };

    const drawingIn = (testID: string): string => String(screen.getByTestId(testID).props['xml']);

    const everythingPressable = (): Control[] =>
      [
        ...screen.queryAllByRole('button'),
        ...screen.queryAllByRole('radio'),
        ...screen.queryAllByRole('checkbox'),
      ] as unknown as Control[];

    const filledRows = (): string[] =>
      answers.filter((answer) => styleOfPart(answer)['backgroundColor'] === colours.accent.value);

    function AQuestionOfHers(): React.ReactNode {
      const [held, setHeld] = useState(answers[0]);

      return (
        <View>
          {answers.map((answer) => (
            <SingleChoiceRow
              isChosen={held === answer}
              key={answer}
              label={answer}
              onPress={() => {
                setHeld(answer);
              }}
              testID={answer}
            />
          ))}
          <MultiChoiceRow isChosen={false} label="Symptoms" onPress={nothing} testID="any" />
          <Chip isChosen={false} label="Anxious" onPress={nothing} testID="resting-word" />
          <Chip isChosen label="Low" onPress={nothing} testID="chosen-word" />
          <SelectableTile
            icon="mood"
            isChosen={false}
            onPress={nothing}
            testID="resting-tile"
            title="Mood"
          />
          <SelectableTile
            icon="sleep"
            isChosen
            onPress={nothing}
            testID="chosen-tile"
            title="Sleep"
          />
          <TextField label="Your name" onChange={nothing} testID="field" value="Maria" />
          <Stepper
            canGoDown
            canGoUp
            downLabel="Shorter"
            onDown={nothing}
            onUp={nothing}
            reading="28 days"
            testID="days"
            upLabel="Longer"
          />
        </View>
      );
    }

    given('a question carrying every answer Emi can ask her to choose', async () => {
      await render(<AQuestionOfHers />);
    });

    when('she looks at it without reading a word of it', () => {
      expect(screen.getByTestId(answers[0] ?? '')).toBeTruthy();
    });

    then('the answer she chose is the only filled row, and it carries a check', () => {
      expect(filledRows()).toEqual([answers[0]]);
      expect(styleOfTheWordsIn(answers[0] ?? '')).toMatchObject({
        color: colours.onAccent.value,
      });
      expect(styleOfPart(rowDiscTestID(answers[0] ?? ''))).toMatchObject({
        backgroundColor: colours.onAccent.value,
        borderRadius: radius.full,
      });
      expect(drawingIn(rowCheckTestID(answers[0] ?? ''))).toContain(colours.accent.value);
    });

    and(
      'the answers she did not choose keep the quiet ground and the words she reads everywhere',
      () => {
        for (const answer of answers.slice(1)) {
          expect(styleOfPart(answer)).toMatchObject({ backgroundColor: colours.field.value });
          expect(styleOfTheWordsIn(answer)).toMatchObject({ color: colours.text.value });
          expect(screen.queryByTestId(rowDiscTestID(answer))).toBeNull();
        }
      },
    );

    and('a question she may answer more than once leaves an empty ring beside each answer', () => {
      expect(styleOfPart(rowRingTestID('any'))).toMatchObject({
        borderColor: colours.disabledLabel.value,
        borderRadius: radius.full,
      });
      expect(styleOfPart(rowRingTestID('any'))['backgroundColor']).toBeUndefined();
    });

    and(
      'the word she turned on is the only filled pill, and the ones she left are outlined',
      () => {
        expect(styleOfPart('chosen-word')).toMatchObject({
          backgroundColor: colours.accent.value,
          borderColor: colours.accent.value,
          borderRadius: radius.full,
        });
        expect(styleOfTheWordsIn('chosen-word')).toMatchObject({ color: colours.onAccent.value });
        expect(styleOfPart('resting-word')).toMatchObject({
          backgroundColor: colours.card.value,
          borderColor: colours.line.value,
          borderRadius: radius.full,
        });
      },
    );

    and('the category she chose is tinted and carries a check in its corner', () => {
      expect(styleOfPart('chosen-tile')).toMatchObject({
        backgroundColor: colours.accentSoft.value,
        borderColor: colours.accent.value,
      });
      expect(styleOfPart(tileBeadTestID('chosen-tile'))).toMatchObject({
        backgroundColor: colours.accent.value,
        borderRadius: radius.full,
      });
      expect(drawingIn(tileCheckTestID('chosen-tile'))).toContain(colours.onAccent.value);
      expect(styleOfPart('resting-tile')).toMatchObject({
        backgroundColor: colours.card.value,
        borderColor: colours.line.value,
      });
      expect(screen.queryByTestId(tileBeadTestID('resting-tile'))).toBeNull();
    });

    and('the line she types into takes the colour that acts while she is in it', async () => {
      const resting = Number(styleOfPart('field')['borderWidth']);

      await act(async () => {
        fireEvent(screen.getByTestId('field'), 'focus');
      });

      expect(styleOfPart('field')).toMatchObject({
        borderColor: colours.accent.value,
        borderRadius: radius.md,
      });
      expect(Number(styleOfPart('field')['borderWidth'])).toBeGreaterThan(resting);
    });

    and('the number she is holding sits on a band of its own', () => {
      expect(styleOfPart('days')).toMatchObject({
        backgroundColor: colours.accentSoft.value,
        borderRadius: radius.lg,
      });
      expect(styleOfPart(stepperReadingTestID('days'))).toMatchObject({
        color: colours.text.value,
      });
    });

    and('her thumb reaches every one of them, because none is under forty four points', () => {
      expect(everythingPressable().length).toBeGreaterThanOrEqual(8);
      expect(controlsTooSmallToPress(everythingPressable())).toEqual([]);
      expect(Number(styleOfPart('field')['minHeight'])).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
    });

    when('she presses an answer she did not choose', async () => {
      await act(async () => {
        fireEvent.press(screen.getByTestId(answers[1] ?? ''));
      });
    });

    then(
      'that answer is hers, the answer she held before is not, and each one says so out loud',
      () => {
        expect(filledRows()).toEqual([answers[1]]);
        expect(screen.queryByTestId(rowDiscTestID(answers[1] ?? ''))).toBeTruthy();
        expect(screen.queryByTestId(rowDiscTestID(answers[0] ?? ''))).toBeNull();
        expect(screen.getByTestId(answers[1] ?? '').props['accessibilityState']).toMatchObject({
          checked: true,
        });
        expect(screen.getByTestId(answers[0] ?? '').props['accessibilityState']).toMatchObject({
          checked: false,
        });
      },
    );
  });

  // Every surface a section of a screen is raised onto, on one page, with the three small parts
  // that sit on them. The page is read without reading a word of it, the way she reads a screen
  // before she reads its words.
  test('SCREEN-2, the cards and rows take the redesign look', ({ given, when, and, then }) => {
    const theWordsOfTheRow = 'Your answers';
    const theLineUnderIt = 'What you told us when you started';
    const whatTheRowOpens = 'Your name, your year of birth and six answers';

    const styleOfPart = (testID: string): Record<string, unknown> =>
      (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as Record<string, unknown>;

    const styleOfWords = (words: string): Record<string, unknown> =>
      (StyleSheet.flatten(screen.getByText(words).props.style) ?? {}) as Record<string, unknown>;

    const drawingIn = (testID: string): string => String(screen.getByTestId(testID).props['xml']);

    const onTheDarkCard = StyleSheet.create({ words: { color: colours.onAccent.value } });

    function EverySurfaceSheReads(): React.ReactNode {
      const [isOpen, setIsOpen] = useState(false);

      return (
        <View>
          <Card testID="plain-surface">
            <Text>Her cycle, raised onto paper</Text>
          </Card>
          <Card layer="dark" testID="reversed-surface">
            <Text style={onTheDarkCard.words}>Only you can read your days</Text>
          </Card>
          <SettingsRow
            icon="note"
            label={theWordsOfTheRow}
            line={theLineUnderIt}
            onPress={() => {
              setIsOpen(true);
            }}
            testID="answers-row"
          />
          {isOpen ? (
            <Card testID="what-the-row-opened">
              <Text>{whatTheRowOpens}</Text>
            </Card>
          ) : null}
          {pillTones.map((tone) => (
            <StatusPill key={tone} label={tone} testID={tone} tone={tone} />
          ))}
          <LockLine testID="her-privacy" words="Only you can read this." />
        </View>
      );
    }

    given('a page carrying every surface Emi raises a section onto', async () => {
      await render(<EverySurfaceSheReads />);
    });

    when('she looks at it without reading a word of it', () => {
      expect(screen.getByTestId('plain-surface')).toBeTruthy();
    });

    then(
      'the plain surface is white, with no line around it, at the one corner a card takes',
      () => {
        expect(styleOfPart('plain-surface')).toMatchObject({
          backgroundColor: colours.card.value,
          borderRadius: radius.xl,
        });
        expect(styleOfPart('plain-surface')['borderWidth']).toBeUndefined();
        expect(styleOfPart('plain-surface')['borderColor']).toBeUndefined();
        expect(styleOfPart('plain-surface')['boxShadow']).toBeUndefined();
      },
    );

    and(
      'the one surface that reverses carries the dark ground, and the white it was measured with',
      () => {
        expect(styleOfPart('reversed-surface')).toMatchObject({
          backgroundColor: colours.darkCard.value,
          borderRadius: radius.xl,
        });
        expect(colours.onAccent.textOn).toContain('darkCard');
        expect(
          contrastRatio(colours.onAccent.value, colours.darkCard.value),
        ).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
      },
    );

    and(
      'a row she can press carries a drawing at one end, a word, and the mark that points the way on',
      () => {
        expect(styleOfPart(rowTileTestID('answers-row'))).toMatchObject({
          backgroundColor: colours.field.value,
          borderRadius: radius.DEFAULT,
        });
        expect(drawingIn(rowDrawingTestID('answers-row'))).toContain(colours.text.value);
        expect(styleOfWords(theWordsOfTheRow)).toMatchObject({ color: colours.text.value });
        expect(styleOfWords(theLineUnderIt)).toMatchObject({
          color: colours.secondaryText.value,
        });
        expect(drawingIn(rowChevronTestID('answers-row'))).toContain(colours.quietIcon.value);
      },
    );

    and(
      'a pill is small, round at both ends, and in the one pair of colours its tone was measured as',
      () => {
        for (const tone of pillTones) {
          expect(styleOfPart(tone)).toMatchObject({
            backgroundColor: colours[pillPalette[tone].ground].value,
            borderRadius: radius.full,
          });
          expect(styleOfWords(tone)).toMatchObject({
            color: colours[pillPalette[tone].ink].value,
            ...textStyle('label-sm'),
          });
          expect(styleOfPart(tone)['minHeight']).toBeUndefined();
        }

        expect(pillTones).toHaveLength(3);
      },
    );

    and('every pill tone is a pair the contrast test measures, over the floor it holds', () => {
      const unmeasured = pillTones.filter(
        (tone) => !colours[pillPalette[tone].ink].textOn.includes(pillPalette[tone].ground),
      );

      expect(unmeasured).toEqual([]);

      const under = pillTones.filter(
        (tone) =>
          contrastRatio(
            colours[pillPalette[tone].ink].value,
            colours[pillPalette[tone].ground].value,
          ) < CONTRAST_FLOOR,
      );

      expect(under).toEqual([]);
      expect(pillPalette.apricot).toEqual({ ground: 'washWarm', ink: 'ovulationInk' });
    });

    and('the line about her privacy carries the drawing of a lock beside its words', () => {
      expect(drawingIn(lockLineIconTestID('her-privacy'))).toContain(colours.secondaryText.value);
      expect(styleOfWords('Only you can read this.')).toMatchObject({
        color: colours.secondaryText.value,
      });
      expect(styleOfPart('her-privacy')).toMatchObject({ flexDirection: 'row' });
    });

    and('her thumb reaches every row, because none is under forty four points', () => {
      const rows = screen.queryAllByRole('button') as unknown as Control[];

      expect(rows).toHaveLength(1);
      expect(controlsTooSmallToPress(rows)).toEqual([]);
      expect(Number(styleOfPart('answers-row')['minHeight'])).toBeGreaterThanOrEqual(
        MINIMUM_TAP_TARGET,
      );
    });

    when('she presses the row that opens what she already told Emi', async () => {
      expect(screen.queryByText(whatTheRowOpens)).toBeNull();

      await act(async () => {
        fireEvent.press(screen.getByTestId('answers-row'));
      });
    });

    then('that row answers her, and it still says out loud what it opens', () => {
      // The press is only half of it. What she is left looking at is the thing the row opened,
      // with the row still above it saying where she came from.
      expect(screen.getByText(whatTheRowOpens)).toBeTruthy();
      expect(screen.getByTestId('what-the-row-opened')).toBeTruthy();
      expect(screen.getByLabelText(theWordsOfTheRow)).toBeTruthy();
      expect(drawingIn(rowChevronTestID('answers-row'))).toContain(colours.quietIcon.value);
    });
  });

  // The four parts she presses, measured off a page carrying all of them at once, and the one of
  // them a real screen already draws, measured on that screen.
  test('SCREEN-2, the home screen says hi to her by name', ({ given, when, and, then }) => {
    let app: OpenApp;

    given(
      'she gave the name Ada at her first run, and her phone holds the one period she logged',
      async () => {
        await herPhoneHoldsOnePeriodAnd(theNameSheGave);
      },
    );

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    then('the top of the screen says hi to her by the name she gave', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(whatItSays(homeGreetingTestID)).toBe(`Hi, ${theNameSheGave}`);
    });

    and(
      'the forecast that cannot say how sure it is tells her it is still getting to know her',
      () => {
        expect(textIn(screen.getByTestId(learningTestID))).toContain(
          theHomeScreenSaysInEnglish['forecast.stillLearning'],
        );
        expect(whatItSays(learningTestID)).not.toContain('confidence');
      },
    );

    and(
      'it asks for the cycles it still wants as we, and names the length she told them about',
      () => {
        expect(whatItSays(learningCyclesWantedTestID)).toBe(
          `We need ${CYCLES_BEFORE_A_FORECAST} more full cycles before we can say how sure we are.`,
        );
        expect(whatItSays(learningStatedLengthTestID)).toBe(
          `Until then, we're using the ${sheSaysHerCycleRuns} day cycle you told us about.`,
        );
      },
    );

    and(
      'a woman who gave no name reads hi on its own, with no gap where a name would be',
      async () => {
        await app.close();
        resetExpoSqlite();
        resetExpoSecureStore();
        await herPhoneHoldsOnePeriodAnd();
        await sheOpens('/');

        expect(whatItSays(homeGreetingTestID)).toBe('Hi');
        expect(whatItSays(homeGreetingTestID)).not.toContain(theNameSheGave);
        expect(whatItSays(homeGreetingTestID).trim()).toBe(whatItSays(homeGreetingTestID));
      },
    );

    and(
      'every word this screen says is in all three languages, and each one talks to her as you',
      () => {
        for (const [key, said] of Object.entries(theHomeScreenSaysInEnglish)) {
          expect({ key, said: theCatalogueOf('en')[key] }).toEqual({ key, said });
        }

        for (const [key, forms] of Object.entries(theHomeScreenCountsInEnglish)) {
          expect({ key, forms: theWordsOfTheScreenSheOpensIn('en', [key]) }).toEqual({
            key,
            forms: [...forms],
          });
        }

        for (const language of languages) {
          const missing = theKeysOfTheScreenSheOpens.filter(
            (key) => theWordsOfTheScreenSheOpensIn(language, [key]).join('').length === 0,
          );

          expect({ language, missing }).toEqual({ language, missing: [] });
          expect({
            language,
            asYou: howEachLanguageSaysYou[language].test(
              theWordsOfTheScreenSheOpensIn(language).join('\n'),
            ),
          }).toEqual({ language, asYou: true });
        }

        expect(languages.length).toBe(3);
      },
    );

    and(
      'the only two that name Emi are the fertile window denial and the line about sample data',
      () => {
        for (const language of languages) {
          const naming = theKeysOfTheScreenSheOpens.filter((key) =>
            theWordsOfTheScreenSheOpensIn(language, [key]).join('\n').includes('Emi'),
          );

          expect({ language, naming }).toEqual({ language, naming: [...theTwoLinesThatNameEmi] });
        }
      },
    );
  });

  test('SCREEN-4, she logs bleeding that is not her period in plain words', ({
    given,
    when,
    and,
    then,
  }) => {
    let theCyclesSheHadBefore: string[];

    given('she is in the middle of her month, with six cycles behind her', async () => {
      await herPhoneHolds(whenSheOpensIt, herRecordedDays(herMiddleOfTheMonth));
      theCyclesSheHadBefore = theCycleStartsOnHerPhone();

      expect(herCompleteCycles()).toBe(theCyclesBehindHer);
    });

    when('she opens the log and says the bleeding was light', async () => {
      await sheOpens('/log');
      await shePresses(flowOptionTestID('light'));
    });

    then('the line beside the flow asks her about bleeding that is not her period', () => {
      expect(whatItSays(unexpectedBleedingLineTestID)).toBe(
        theLogAndTheEditorSayInEnglish['log.unexpected.invitation'],
      );
    });

    and(
      'marking it tells her the day is in her record, and that no cycle starts from it',
      async () => {
        await shePresses(unexpectedBleedingMarkTestID);

        expect(whatItSays(unexpectedBleedingLineTestID)).toBe(
          theLogAndTheEditorSayInEnglish['log.unexpected.marked'],
        );
      },
    );

    and(
      'her phone holds that day with the mark on it, and counts the cycles it counted before',
      () => {
        expect(whatWasRecordedOn(today)).toMatchObject({
          bleedingIsUnexpected: true,
          day: today,
          flow: 'light',
        });
        expect(theCycleStartsOnHerPhone()).toEqual(theCyclesSheHadBefore);
        expect(herCompleteCycles()).toBe(theCyclesBehindHer);
      },
    );

    and(
      'the log and the period editor say all of this in each of the three languages, as you',
      () => {
        for (const [key, said] of Object.entries(theLogAndTheEditorSayInEnglish)) {
          expect({ key, said: theCatalogueOf('en')[key] }).toEqual({ key, said });
        }

        for (const [key, forms] of Object.entries(theEditorCountsInEnglish)) {
          expect({ key, forms: theWordsOfTheLogAndTheEditorIn('en', [key]) }).toEqual({
            key,
            forms: [...forms],
          });
        }

        for (const language of languages) {
          const missing = theKeysOfTheLogAndTheEditor.filter(
            (key) => theWordsOfTheLogAndTheEditorIn(language, [key]).join('').length === 0,
          );

          expect({ language, missing }).toEqual({ language, missing: [] });
          expect({
            language,
            asYou: howEachLanguageSaysYou[language].test(
              theWordsOfTheLogAndTheEditorIn(language).join('\n'),
            ),
          }).toEqual({ language, asYou: true });
        }

        expect(languages.length).toBe(3);
      },
    );

    and('none of those words gives her advice, raises an alarm, or names Emi', () => {
      for (const language of languages) {
        const naming = theKeysOfTheLogAndTheEditor.filter((key) =>
          theWordsOfTheLogAndTheEditorIn(language, [key]).join('\n').includes('Emi'),
        );

        expect({ language, naming }).toEqual({ language, naming: [] });
      }

      for (const line of theWordsOfTheLogAndTheEditorIn('en')) {
        for (const word of adviceAndAlarm) {
          expect({ line, holds: new RegExp(`\\b${word}`, 'i').test(line) }).toEqual({
            line,
            holds: false,
          });
        }
      }
    });
  });

  test('SCREEN-2, delete everything tells her it is gone in plain words', ({
    given,
    when,
    and,
    then,
  }) => {
    given('she has six cycles of her own on this phone', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriodsAndAWrongMonday());

      expect(listDayLogs(herDatabase()).length).toBeGreaterThan(0);
    });

    when('she opens Privacy and reads the row that would delete everything', async () => {
      await sheOpens('/settings');

      expect(whatItSays(settingsDeleteTestID)).toContain(
        thePrivacyScreensSayInEnglish['settings.settings.deleteLine'],
      );
    });

    and('she walks to the screen behind that row and reads what one press costs', async () => {
      await shePresses(settingsDeleteTestID);

      expect(whatItSays(deleteScreenTestID)).toContain(
        thePrivacyScreensSayInEnglish['settings.delete.line'],
      );
    });

    and('she presses delete everything', async () => {
      await shePresses(deleteActionTestID);
      await waitFor(() => expect(screen.getByTestId(deletedScreenTestID)).toBeTruthy());
    });

    then('she reads that it is gone, and that she can start fresh whenever she likes', () => {
      const said = whatItSays(deletedScreenTestID);

      expect(said).toContain(thePrivacyScreensSayInEnglish['settings.deleted.title']);
      expect(said).toContain(thePrivacyScreensSayInEnglish['settings.deleted.line']);
      expect(said).not.toContain('empty ring');
    });

    and('her phone holds none of her days and nothing in the keychain', () => {
      expect(listDayLogs(herDatabase())).toEqual([]);
      expect(itemsInTheKeychain()).toEqual({});
    });

    and('these screens say all of this in each of the three languages, as you and as we', () => {
      for (const [key, said] of Object.entries(thePrivacyScreensSayInEnglish)) {
        expect({ key, said: theCatalogueOf('en')[key] }).toEqual({ key, said });
      }

      for (const language of languages) {
        const missing = theKeysOfThePrivacyScreens.filter(
          (key) => theWordsOfThePrivacyScreensIn(language, [key]).join('').length === 0,
        );
        const read = theWordsOfThePrivacyScreensIn(language).join('\n');

        expect({ language, missing }).toEqual({ language, missing: [] });
        expect({
          language,
          asWe: howEachLanguageSaysWe[language].test(read),
          asYou: howEachLanguageSaysYou[language].test(read),
        }).toEqual({ language, asWe: true, asYou: true });
      }

      expect(languages.length).toBe(3);
    });

    and('the only two lines that name Emi are the claim about her days and the lock itself', () => {
      for (const language of languages) {
        const naming = theKeysOfThePrivacyScreens
          .filter((key) =>
            theWordsOfThePrivacyScreensIn(language, [key]).join('\n').includes('Emi'),
          )
          .sort();

        expect({ language, naming }).toEqual({
          language,
          naming: [...theTwoPrivacyLinesThatNameEmi].sort(),
        });
      }
    });
  });

  test('SCREEN-2, the buttons take the redesign shapes', ({ given, when, and, then }) => {
    const styleOfPart = (testID: string): Record<string, unknown> =>
      (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as Record<string, unknown>;

    const styleOfTheWordsIn = (testID: string): Record<string, unknown> => {
      const [words] = screen.getByTestId(testID).children;

      return (StyleSheet.flatten(
        (words as unknown as { props: { style?: unknown } }).props.style,
      ) ?? {}) as Record<string, unknown>;
    };

    const everythingPressable = (): { props: Record<string, unknown> }[] =>
      [...screen.queryAllByRole('button'), ...screen.queryAllByRole('link')] as unknown as {
        props: Record<string, unknown>;
      }[];

    given('a screen carrying every action Emi can ask her to take', async () => {
      await render(
        <View>
          <PrimaryButton label="Save" onPress={() => undefined} testID="writes" />
          <SecondaryButton label="Cancel" onPress={() => undefined} testID="beside" />
          <TextLink label="I do not remember" onPress={() => undefined} testID="quiet" />
          <RoundIconButton
            accessibilityLabel="Go back"
            icon="chevron"
            onPress={() => undefined}
            testID="round"
          />
        </View>,
      );
    });

    when('she reads it without reading a word of it', () => {
      expect(everythingPressable()).toHaveLength(4);
    });

    then(
      'the action that writes her data is the only filled pill, in the one colour that acts',
      () => {
        expect(styleOfPart('writes')).toMatchObject({
          backgroundColor: colours.accent.value,
          borderRadius: radius.full,
        });
        expect(styleOfTheWordsIn('writes')).toMatchObject({ color: colours.onAccent.value });

        const filled = ['writes', 'beside', 'quiet', 'round'].filter(
          (part) => styleOfPart(part)['backgroundColor'] === colours.accent.value,
        );

        expect(filled).toEqual(['writes']);
      },
    );

    and('the action beside it is a quieter pill with no fill of its own', () => {
      expect(styleOfPart('beside')).toMatchObject({
        backgroundColor: colours.field.value,
        borderRadius: radius.full,
      });
      expect(styleOfPart('beside')['borderWidth']).toBeUndefined();
    });

    and('the quiet action is words alone, with no ground and no rule under them', () => {
      expect(styleOfPart('quiet')['backgroundColor']).toBeUndefined();
      expect(styleOfPart('quiet')['borderWidth']).toBeUndefined();
      expect(styleOfTheWordsIn('quiet')).toMatchObject({ color: colours.accent.value });
      expect(screen.getByTestId('quiet').children).toHaveLength(1);
    });

    and('the round action is a disc carrying a drawing and no words', () => {
      expect(styleOfPart('round')).toMatchObject({
        borderRadius: radius.full,
        height: MINIMUM_TAP_TARGET,
        width: MINIMUM_TAP_TARGET,
      });
      expect(screen.getByLabelText('Go back')).toBeTruthy();
      expect(screen.getByTestId('round').children).toHaveLength(1);
    });

    and(
      'her thumb reaches every one of them, because none is under forty four points',
      async () => {
        expect(controlsTooSmallToPress(everythingPressable())).toEqual([]);

        // The page above is built for the measurement. This is the screen she actually opens first,
        // so the shape is proved where she meets it and not only where it is declared.
        screen.unmount();
        await render(
          <OnAPhone>
            <WhatEmiIs onContinue={() => undefined} />
          </OnAPhone>,
        );

        expect(styleOfPart(onboardingActionTestID)).toMatchObject({
          backgroundColor: colours.accent.value,
          borderRadius: radius.full,
        });
        expect(controlsTooSmallToPress(everythingPressable())).toEqual([]);
      },
    );
  });
});

interface Drawn {
  readonly type?: string;
  readonly props?: Record<string, unknown>;
  readonly children?: unknown;
}

/** Every field a rendered screen drew, so a field cannot hide inside anything else. */
function fieldsIn(node: unknown): Drawn[] {
  if (Array.isArray(node)) {
    return node.flatMap(fieldsIn);
  }
  if (node === null || typeof node !== 'object') {
    return [];
  }
  const element = node as Drawn;
  const below = fieldsIn(element.children ?? []);

  return element.type === 'TextInput' ? [element, ...below] : below;
}

/** The question above each field, which is the sentence a screen reader reads out for it. */
function fieldsDrawn(): string[] {
  return fieldsIn(screen.toJSON()).map((field) => String(field.props?.accessibilityLabel));
}

/** The glass she holds, in points, which is the phone the screens of Emi are drawn for. */
const thePhoneSheHolds: Phone = { height: 844, name: 'the phone she holds', width: 390 };

/**
 * The screen out of the tree the application drew. The router hangs boxes of its own above the
 * screen and none of them is anything she sees, so a measurement starts at the box the screen names.
 */
function theScreenSheIsLookingAt(): unknown {
  const named = (node: unknown): Drawn | null => {
    if (Array.isArray(node)) {
      for (const each of node) {
        const found = named(each);

        if (found !== null) {
          return found;
        }
      }

      return null;
    }

    if (node === null || typeof node !== 'object') {
      return null;
    }

    const element = node as Drawn;

    if (element.props?.testID === homeScreenTestID) {
      return element;
    }

    return named(element.children ?? []);
  };

  const found = named(screen.toJSON());

  if (found === null) {
    throw new Error('she is not looking at the home screen, so there is nothing to measure on it');
  }

  return JSON.parse(JSON.stringify(found));
}

/** Every style a node carries, flattened into the one the platform draws it from. */
function flattenedStyleOf(testID: string): Record<string, unknown> {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as Record<
    string,
    unknown
  >;
}

/** The value an animated style holds right now, which is what she is looking at. */
function styleOf(testID: string): Record<string, unknown> {
  const node = screen.getByTestId(testID);

  return JSON.parse(JSON.stringify(node.props.style ?? {})) as Record<string, unknown>;
}
