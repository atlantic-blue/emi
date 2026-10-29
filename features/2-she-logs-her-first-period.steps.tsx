import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { type DayRecord, ovulationSignValues, profileBytes } from '@emi/crypto';
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
  NAMED_RING_DIAMETER,
  NAMED_RING_RADIUS,
  type PhaseName,
  RING_OPEN_MILLISECONDS,
  colour,
  colours,
  contrastRatio,
  hasRole,
  phaseLabel,
  phaseNameInk,
  phaseNames,
  pointOnRing,
  radius,
  stroke,
  textStyle,
  washNames,
  washOfPhase,
  washStops,
  washes,
} from '@emi/tokens';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';
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
  namedArcFloors,
  ringArcTestID,
  ringArcsPressTestID,
  ringCentreDayTestID,
  ringCentreLengthTestID,
  ringCentrePhaseTestID,
  ringNameTestID,
  ringTrackTestID,
  ringWholeArcTestID,
} from '../apps/mobile/src/components/CycleRing';
import {
  ringArcPopoverDaysTestID,
  ringArcPopoverGuideTestID,
  ringArcPopoverNameTestID,
  ringArcPopoverOutsideTestID,
  ringArcPopoverTestID,
} from '../apps/mobile/src/features/home/RingOfToday';
import {
  cycleCopy,
  phaseFullName,
  ringAboutLengthWords,
  ringDayNumberWords,
  ringSpokenLabel,
} from '../apps/mobile/src/features/cycle/copy';
import {
  WhatEmiIs,
  welcomeWhoCanSeeTestID,
} from '../apps/mobile/src/features/onboarding/WhatEmiIs';
import {
  periodSexProductTestID,
  periodSexSuggestionEyebrowTestID,
  periodSexSuggestionNotNowTestID,
  periodSexSuggestionTestID,
} from '../apps/mobile/src/features/hygiene/PeriodSexSuggestion';
import { OnAPhone } from '../apps/mobile/tests/fixtures/theSafeArea';
import {
  type FirstRunDrawing,
  howManyPartsTheFirstRunIsHeldTo,
  sheIsLookingAt,
  theDifferencesTheStepKeeps,
  theFirstRunDrawings,
  theQuestionsTheBarCounts,
  theWashIsAtTheTop,
  theWidthOfTheSheet,
  whatTheScreenDoesNotAnswerFor,
} from '../apps/mobile/tests/fixtures/theFirstRunLook';
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
import {
  changeProfileAnswer,
  profileRow,
  readProfile,
  writeProfile,
} from '../apps/mobile/src/data/profileRepository';
import { readSetting, settingKeys } from '../apps/mobile/src/data/settingRepository';
import {
  calendarBackTestID,
  calendarEarlierTestID,
  calendarEditPeriodTestID,
  calendarLaterTestID,
  calendarTodayTestID,
} from '../apps/mobile/src/features/calendar/CalendarScreen';
import {
  daySheetLineTestID,
  daySheetOpenTestID,
  daySheetRecordSexTestID,
  daySheetRemovePeriodDayTestID,
  daySheetTestID,
} from '../apps/mobile/src/features/calendar/DaySheet';
import { sexMarkTestID } from '../apps/mobile/src/features/calendar/CycleMonth';
import {
  calendarCopy,
  editPeriodCopy,
  monthLegendCopy,
} from '../apps/mobile/src/features/calendar/copy';
import { dayParameter } from '../apps/mobile/src/features/calendar/askedMonth';
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
  historyTitleTestID,
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
  sectionWaitingNeedsTestID,
  sectionWaitingTestID,
  sectionWaitingTileTestID,
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
  homeCalendarTestID,
  homeGreetingTestID,
  homeHeaderAvatarTestID,
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
import {
  loggedTodayMarkTestID,
  loggedTodayTestID,
  loggedTodayTileTestID,
} from '../apps/mobile/src/features/home/LoggedToday';
import {
  roundActionDiscTestID,
  roundActionDrawingTestID,
} from '../apps/mobile/src/features/home/RoundAction';
import {
  lockDiscTestID,
  lockWordmarkTestID,
  unlockTestID,
} from '../apps/mobile/src/features/lock/LockScreen';
import {
  type TodayDrawing,
  howManyPartsTheTodayScreensAreHeldTo,
  sheIsLookingAtTheTodayScreen,
  theDifferencesTheTodayStepKeeps,
  theTodayDepartures,
  theTodayDrawings,
  theWashIsAtTheTopOfTheTodayScreen,
  whatTheTodayScreenDoesNotAnswerFor,
  whenSheOpens,
  whereTheScreenDrew,
  whyTheStripIsGone,
} from '../apps/mobile/tests/fixtures/theTodayLook';
import { phaseCardPressTestID, phaseCardTestID } from '../apps/mobile/src/features/home/PhaseCard';
import { guideAreas, phasePageCopy } from '../apps/mobile/src/features/phase/copy';
import { phaseDiaryNoteTestID } from '../apps/mobile/src/features/phase/PhaseDiary';
import {
  phaseGuideAreaTestID,
  phaseGuideCloseTestID,
  phaseGuideEveryoneTestID,
  phaseGuidePhaseTestID,
  phaseGuideTestID,
} from '../apps/mobile/src/features/phase/PhaseGuide';
import {
  phasePageGuideTestID,
  phasePageLeadTestID,
  phasePageTestID,
  phasePageTitleTestID,
} from '../apps/mobile/src/features/phase/PhasePage';
import {
  sexChipTestID,
  sexPageChooseDayTestID,
  sexPageDayTestID,
  sexPageDaysTestID,
  sexPageQuestionTestID,
  sexPageSaveTestID,
  sexPageTestID,
} from '../apps/mobile/src/features/sex/SexPage';
import { sexAddress } from '../apps/mobile/src/features/sex/sexAddress';
import { sexDayHeading } from '../apps/mobile/src/features/sex/copy';
import { periodDayLabel } from '../apps/mobile/src/features/period/copy';
import { sheOpensTheSymptomGroupsFromToday } from '../apps/mobile/tests/fixtures/theSymptomGroupsFromToday';
import {
  periodChipTestID,
  periodPageAnotherDayTestID,
  periodPageDayTestID,
  periodPageSaveTestID,
  periodPageTestID,
} from '../apps/mobile/src/features/period/PeriodPage';
import { periodAddress } from '../apps/mobile/src/features/period/periodAddress';
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
import {
  logFlowDoneTestID,
  logFlowFlowCardTestID,
  logFlowOtherDischargeTestID,
  logFlowPeriodRowTestID,
  logFlowPhaseTestID,
  logFlowSavedTestID,
  logFlowSexRowTestID,
  logFlowSpottingHintTestID,
  logFlowSymptomsCardTestID,
  logFlowTestID,
  logFlowTitleTestID,
  logFlowWhenTestID,
} from '../apps/mobile/src/features/log/LogFlow';
import { groupTileTestID, groupTilesTestID } from '../apps/mobile/src/features/log/GroupTiles';
import { logHeaderLeaveTestID } from '../apps/mobile/src/features/log/LogHeader';
import {
  logSymptomsCountTestID,
  logSymptomsSaveTestID,
  logSymptomsTestID,
} from '../apps/mobile/src/features/log/LogSymptoms';
import {
  symptomChipTestID,
  symptomGroupTestID,
} from '../apps/mobile/src/features/log/SymptomGroup';
import { symptomSearchTestID } from '../apps/mobile/src/features/log/SymptomSearchField';
import { theGroupsSheSeesFirst } from '../apps/mobile/src/features/log/herOrder';
import {
  herNumberTestID,
  homeNumbersTestID,
  measuredMeaningTestID,
  publishedNumberTestID,
} from '../apps/mobile/src/features/home/MeasuredRow';
import { cycleLengthDaysTestID } from '../apps/mobile/src/features/onboarding/CycleLength';
import { todayAllSymptomsTestID, todayTestID } from '../apps/mobile/src/features/onboarding/Today';
import {
  reminderPreviewWordsTestID,
  reminderTestID,
} from '../apps/mobile/src/features/onboarding/Reminder';
import {
  resetExpoNotifications,
  theRemindersOnThePhone,
  timesThePhoneAsked,
} from '../apps/mobile/tests/fixtures/expoNotifications';
import { nameFieldTestID } from '../apps/mobile/src/features/onboarding/HerName';
import { regularityTestID } from '../apps/mobile/src/features/onboarding/Regularity';
import { yearTestID } from '../apps/mobile/src/components/YearWheel';
import {
  periodLengthDaysTestID,
  periodLengthWheelTestID,
} from '../apps/mobile/src/features/onboarding/PeriodLength';
import {
  dayTestID,
  earlierMonthTestID,
  weekCellTestIDs,
  weekTestID,
} from '../apps/mobile/src/features/onboarding/Calendar';
import { goalTestID } from '../apps/mobile/src/features/onboarding/Goals';
import { saveScreenTestID } from '../apps/mobile/src/features/onboarding/SaveAndStart';
import {
  onboardingActionTestID,
  onboardingBackTestID,
  onboardingEmblemTestID,
  onboardingHeaderWordTestID,
  onboardingLinesTestID,
  onboardingProgressTestID,
  onboardingQuestionTestID,
  onboardingSheetTestID,
  onboardingSkipTestID,
  onboardingStepLabelTestID,
  onboardingTitleTestID,
  onboardingWayPastTestID,
} from '../apps/mobile/src/features/onboarding/OnboardingScreen';
import {
  tourScreenTestID,
  tourSkipTestID,
} from '../apps/mobile/src/features/onboarding/TourScreen';
import {
  settingsAssuranceTestID,
  settingsDeleteTestID,
  settingsExportTestID,
  settingsRowsTestID,
  settingsScreenTestID,
  settingsTitleTestID,
  settingsWhoCanSeeTestID,
} from '../apps/mobile/src/features/settings/SettingsScreen';
import {
  whoCanSeeBackTestID,
  whoCanSeeExampleTestID,
  whoCanSeePartTestID,
  whoCanSeeScreenTestID,
} from '../apps/mobile/src/features/settings/WhoCanSee';
import {
  deleteActionTestID,
  deleteDownloadTestID,
  deleteGoesTestID,
  deleteScreenTestID,
  deletedScreenTestID,
  goesMarkTestID,
} from '../apps/mobile/src/features/settings/DeleteEverything';
import {
  yourAnswerRowTestID,
  yourAnswersRowsTestID,
} from '../apps/mobile/src/features/settings/YourAnswers';
import { theAnswerSheGave, yourAnswerRows } from '../apps/mobile/src/features/settings/herAnswers';
import { settingsCopy } from '../apps/mobile/src/features/settings/copy';
import {
  exportLockLineTestID,
  exportScreenTestID,
  exportTileTestID,
  theExportTiles,
} from '../apps/mobile/src/features/export/ExportScreen';
import { rowGroupRuleTestID } from '../apps/mobile/src/components/RowGroup';
import { exportCopy } from '../apps/mobile/src/features/export/copy';
import {
  countsFromTheFirstPeriodSentence,
  cyclesBeforeAForecastSentence,
  firstRunCopy,
  firstRunScreenCount,
  stepLabel,
  tourCopy,
} from '../apps/mobile/src/features/onboarding/copy';
import { ordinal, statedLengthSentence } from '../apps/mobile/src/features/forecast/copy';
import {
  dateWords,
  monthLabel,
  startOfMonth,
  weekdayOf,
} from '../apps/mobile/src/features/onboarding/days';
import {
  defaultCycleLengthDays,
  defaultPeriodLengthDays,
  forecastFromHerAnswers,
  todaySymptoms,
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
  firstForecastDayTestID,
  firstForecastLateTestID,
  firstForecastLinesTestID,
  firstForecastNoGuessTestID,
  firstForecastRangeTestID,
  firstForecastStillLearningTestID,
  firstForecastTestID,
  firstForecastTitleTestID,
  firstForecastWhyTestID,
} from '../apps/mobile/src/features/onboarding/FirstForecast';
import {
  whatEmiDoesActionTestID,
  whatEmiDoesTestID,
  whatEmiDoesTitleTestID,
} from '../apps/mobile/src/features/onboarding/WhatEmiDoesWithIt';
import {
  sheAnswersEveryQuestion,
  sheAnswersEveryQuestionWithNoDate,
  sheReachesTheThreePeriodsStep,
  shePassesTheQuestion,
  sheReadsTheWelcome,
} from '../apps/mobile/tests/fixtures/theFirstRun';
import {
  thePartsOfTheDayOneDrawing,
  thePartsTheDayOneDrawingNames,
} from '../apps/mobile/tests/fixtures/theDrawingOfDayOne';
import { sheTapsSaveAndStart } from '../apps/mobile/tests/fixtures/theSave';
import {
  aWalkPeriodLengthDays,
  sheGivesAPeriod,
  sheGivesAPeriodStillGoing,
} from '../apps/mobile/tests/fixtures/thePastPeriods';
import {
  pastPeriodLengthTestID,
  pastPeriodPickerDoneTestID,
} from '../apps/mobile/src/features/pastPeriods/PastPeriodPicker';
import { pastPeriodRowTestID } from '../apps/mobile/src/features/pastPeriods/PastPeriodsList';
import { pastPeriodsSaveTestID } from '../apps/mobile/src/features/pastPeriods/PastPeriodsScreen';
import {
  forecastPopupActionTestID,
  forecastPopupNotNowTestID,
  forecastPopupTestID,
  forecastPopupTitleTestID,
} from '../apps/mobile/src/features/calendar/ForecastPopup';
import { readableIn, theFieldAndItsValue } from '../apps/mobile/tests/fixtures/whatIsReadable';
import {
  aBleedingDay,
  dayOf,
  herDatabase,
  herPhoneHolds,
  herPhoneHoldsTheseAnswers,
} from '../apps/mobile/tests/fixtures/herPhone';
import {
  herKey,
  herProfileVault,
  herVault,
  theProfileVaultOnHerPhone,
  theVaultOnHerPhone,
} from '../apps/mobile/tests/fixtures/herVault';
import {
  ovulationPopupSaveTestID,
  ovulationPopupTestID,
  ovulationPopupWindowTestID,
  ovulationSignTestID,
} from '../apps/mobile/src/features/ovulation/OvulationPopup';
import { theFertileWindowOn } from '../apps/mobile/src/features/calendar/herMonthPhases';
import { recordedDays } from '../apps/mobile/src/features/cycle/rebuild';
import {
  herPhoneHoldsHerDaysAnd,
  theHeaderCarries,
  theHeaderOfTheDrawing,
  theNameSheGave,
  theMarkTheHeaderNoLongerDraws,
  theOrderTheDrawingPlacesThemIn,
  whatTheHeaderDrew,
  whatTheScreenSheOpensDrew,
} from '../apps/mobile/tests/fixtures/theHeaderSheOpensWith';
import {
  aWeekOfHerMonth,
  herPhoneHoldsThreeRecordedCycles,
  theColumnsOfTheDrawing,
  theCycleDayOver,
  theCycleDaysAfterIssue270,
  theCyclesAheadOfHer,
  theDatesOfTheDrawing,
  theDayHerNextPeriodIsForecastOn,
  theDaysOfHerNextForecastPeriod,
  theMonthAfterSheOpens,
  theOvulationDayOfTheForecastCycle,
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
  theSquaresCountingTheirCycleDayBelowTheDate,
  theSquaresTakingAWidthOfTheirOwn,
  theSquaresTheMonthDrew,
  theSquaresTooShortForAThumb,
  thePhaseTheRingSaysOn,
  theDateInkOn,
  theDiscAroundTheDate,
  theFertileDaysTheForecastNames,
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
  theDaysTheListDrew,
  theTagOn,
  theWayToEditHerPeriod,
  whatHerPhoneHoldsOn,
  whatSomebodyListeningHearsOn,
  whatTheRangePickerDrew,
  whenSheOpensEmi,
} from '../apps/mobile/tests/fixtures/thePeriodSheCorrects';
import {
  editPeriodAddBeforeTestID,
  editPeriodChangeTestID,
  editPeriodListTestID,
  editPeriodRowTestID,
  editPeriodSaveTestID,
  editPeriodScreenTestID,
} from '../apps/mobile/src/features/calendar/EditPeriodScreen';
import {
  nextPeriodItStartedTestID,
  nextPeriodLateTestID,
  nextPeriodRangeTestID,
} from '../apps/mobile/src/features/forecast/NextPeriod';
import {
  herPhoneHoldsThreePeriodsAndNoLateOne,
  theDaySheIsLate,
  whenSheIsLate,
} from '../apps/mobile/tests/fixtures/theLateHome';
import {
  type LogOrCalendarDrawing,
  howManyDifferencesAreKeptFor,
  howManyPartsAreHeldTo,
  sheIsLookingAtTheLogOrCalendar,
  theLogAndCalendarDrawings,
  theScreenOf,
  theStyleOf,
  theWashIsAtTheTopOfTheLogOrCalendar,
  theTagsOnTheList,
  whatTheLogOrCalendarDoesNotAnswerFor,
  whenSheReads,
  whereTheLogOrCalendarDrew,
} from '../apps/mobile/tests/fixtures/theLogAndCalendarLook';
import {
  type InsightsDrawing,
  howManyPartsAreHeldTo as howManyInsightsPartsAreHeldTo,
  sheIsLookingAtHerNumbersOverCyclesOf,
  sheIsLookingAtTheInsights,
  theInsightsDrawings,
  thePartNamesTheStagePlaces,
  theScreenOf as theInsightsScreenOf,
  theStripsSheRead,
  theStyleOf as theStyleOnTheInsights,
  theWashIsAtTheTopOfTheInsights,
  theWordsOfThePillOn,
  whatTheDrawingAsksFor,
  whatTheInsightsDoNotAnswerFor,
  whenSheReadsHerCycles,
  whereTheInsightsDrew,
} from '../apps/mobile/tests/fixtures/theInsightsLook';
import {
  type PrivacyDrawing,
  herAnswers,
  privacyDrew,
  sheIsLookingAtPrivacy,
  thePartNamesTheStagePlaces as thePartNamesPrivacyPlaces,
  thePrivacyDrawings,
  theRowsOfHerAnswers,
  theRowsOfPrivacy,
  theRowsOnTheGlass,
  theScreenOf as thePrivacyScreenOf,
  theStyleOf as theStyleOnPrivacy,
  theWashIsAtTheTopOfPrivacy,
  whatPrivacyDoesNotAnswerFor,
  whatTheDrawingAsksFor as whatThePrivacyDrawingAsksFor,
  whenSheOpensPrivacy,
  wherePrivacyDrew,
} from '../apps/mobile/tests/fixtures/thePrivacyLook';
import { textDrawnOnAPhaseFill } from '../apps/mobile/tests/fixtures/phaseInk';
import {
  theDaySheReachesHerLutealPhase,
  theFirstLutealDayTheRuleGives,
  theLargestTheyMayBeDrawn,
  theWordsAStrangerWouldRead,
  theFillOf,
  theFourWordsDrawnOn,
  theFourWordsDrawnTooLargeOn,
  theInkOf,
  theIdentifiersOfTheLineThatIsGone,
  thePhaseCardOnTheGlass,
  thePhaseLineOfTheDrawing,
  thePhaseSheReads,
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
} from '../apps/mobile/tests/fixtures/theLogSheLandsOn';
import {
  herFourRecordedPeriodDays,
  herPhoneHoldsFourRecordedPeriodDays,
  theCalendarButton,
  theCalendarButtonTooSmallToPress,
  theDayTheRingCentreSays,
  theDayTheRingSaysFor,
  theDaySheOpensIt,
  whatIsLeftOfTheStrip,
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
import { describeClaim } from '../tools/pipeline/forbiddenClaims';
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
  forgetLanguage,
  languages,
  readingLanguage,
  wordKeys,
  words,
} from '../apps/mobile/src/language';
import { symptomName } from '../apps/mobile/src/features/log/symptomName';
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
import { locksDrawnIn } from '../apps/mobile/tests/fixtures/drawnLocks';
import { daysNamedIn, sizedTextIn, textIn } from '../apps/mobile/tests/fixtures/renderedText';
import {
  type DrawnArc,
  theArcsOnTheRing,
  thePointerDegrees,
  thePointerSheSees,
  theEndsOfTheArcs,
  theColourDrawn,
  theGroundBetweenTheArcs,
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
  patternCardTileTestID,
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
jest.mock('expo-notifications', () =>
  jest.requireActual('../apps/mobile/tests/fixtures/expoNotifications'),
);

const feature = loadFeature(join(__dirname, '2-she-logs-her-first-period.feature'));

/** A handler a measurement does not drive, where the part under it takes one all the same. */
const nothing = (): void => undefined;

const appDirectory = join(__dirname, '..', 'apps', 'mobile', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

/** The Thursday of the week the drawing shows, which the week strip scenario is read on. */
/**
 * What a comparison of the top of a drawing of Today says once the strip is gone: the todayPhases
 * board replaces the strip with the calendar button, and theTodayLook.tsx records the difference.
 */
const theStripTheCalendarReplaced = [
  'the drawing names WeekStrip, and nothing says which test identifier it is built under',
];

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
const theCycleLengthIsStepFive = 5;

/**
 * The questions between the cycle length and the three screens she reads rather than answers:
 * her period length, how steady her cycle is, how she feels, her goals, her focus, today and the
 * reminder.
 */
const theQuestionsLeftAfterTheCycleLength = 7;

/** When she taps Save and start, which is the instant everything she answered is written at. */
const whenSheSaves = whenSheOpensIt;

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

  return { slug: found.slug, name: symptomName(found.slug) };
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
  'forecast.confidence.sentence': 'Based on your last {cycles} cycles',
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
  'home.greeting': 'Hello, {name}',
  'home.greeting.noName': 'Hello',
  'home.painLine': 'You told us these days can be hard. Start with how much it hurts.',
  'home.patterns.line':
    "A symptom you logged once or twice isn't a pattern, so we won't call it one.",
  'home.trend.allInside': 'All of your last {cycles} were inside that range.',
  'home.trend.caption':
    'How long your last {cycles} lasted. The shaded band is the range a published study reports.',
  'home.trend.outside': '{outside} of your last {cycles} were outside that range.',
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
  'calendar.editPeriod.added': 'You added {days}.',
  'calendar.editPeriod.leadWithNoDay':
    'Press the days you bled. Emi holds no day of this period yet.',
  'calendar.editPeriod.noDayLeft': 'A period needs at least one day. Press a day you bled.',
  'calendar.editPeriod.removed': 'You took {days} off.',
  'log.day.notADay.line': "That date isn't in the calendar.",
  'log.day.notADay.title': "That's not a day",
  'log.day.notYet.line': 'That day has not happened. You can log today and any day behind it.',
  'log.day.notYet.title': 'Not yet',
  'log.energy.heading': "How's your energy?",
  'log.energy.name.3': 'Okay',
  'log.flow.saved': 'Saved on this phone.',
  'log.flow.title': 'Period',
  'log.sheet.noMatch': 'No symptoms match {query}',
  'log.temperature.hint': 'Take it before you get up.',
  'log.unexpected.invitation': "Not your period? Log it. It won't count as the start of a cycle.",
  'log.unexpected.marked': "Saved to your record. It won't count as the start of a cycle.",
  'log.weight.hint': 'Once a day is plenty.',
};

/** The one key of these two screens whose words change with the number, and both forms of it. */
const theEditorCountsInEnglish: Readonly<Record<string, readonly string[]>> = {
  'calendar.editPeriod.lead': [
    'Press the days you bled. Emi holds {count} day, from {date}.',
    'Press the days you bled. Emi holds {count} days, from {date}.',
  ],
};

/** The two lines of the editor the redesign board writes about what Emi holds. */
const theEditorLinesThatNameEmi: readonly string[] = [
  'calendar.editPeriod.lead',
  'calendar.editPeriod.leadWithNoDay',
];

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
    'Save a report for yourself or your doctor, and a file with all your records. Both files are made together, and you can share each one on its own.',
  'export.where':
    'The files are made on your phone. You choose where to save them and who to send them to.',
  'history.noCycles': 'No cycles yet. Log a day you bled and this fills in.',
  'history.nothingRepeats':
    'No symptom has come back at about the same point in 3 cycles yet. If one does, it will show here.',
  'history.patternsNeed':
    'Symptoms you log at about the same point in {needs} different cycles will show here.',
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
    'This removes every day, answer and setting from this phone. It cannot be undone.',
  'settings.delete.refused':
    'Your days are gone, but your phone held on to one thing in the keychain. Press again to finish.',
  'settings.deleted.line':
    'This phone holds nothing about you now. You can start fresh whenever you like.',
  'settings.deleted.title': "It's gone.",
  'settings.deleted.withoutTheServer':
    "We couldn't reach our server to remove your account. Nothing can open what's left there: the only key was on this phone, and it went with your days.",
  'settings.settings.answersLine': 'Your name and your answers from setup',
  'settings.settings.deleteLine': 'Delete your records and settings',
};

const theKeysOfThePrivacyScreens: readonly string[] = Object.keys(thePrivacyScreensSayInEnglish);

/**
 * The one line of these screens that names Emi on purpose: the lock, which names the application
 * it is holding shut. The delete screen says what goes from this phone, and that names nobody.
 */
const thePrivacyLinesThatNameEmi: readonly string[] = ['lock.locked.title'];

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
/**
 * The field and the value together, which is how the length she stated would read if her answers
 * were never sealed. The number alone is two digits, and two digits fall side by side in a payload
 * of random bytes about once in six hundred payloads.
 */
const theCycleLengthUnderItsField = theFieldAndItsValue('cycleLengthDays', sheSaysHerCycleRuns);

/** The one row her answers sit in, as the bytes on the disk, read through no repository. */
function theRowHerAnswersSitIn(): Uint8Array {
  const held = herDatabase().all<{ payload: Uint8Array }>('SELECT payload FROM profile')[0];

  if (held === undefined) {
    throw new Error('this phone holds no profile row, so her first run wrote nothing to read');
  }

  return held.payload;
}

/** The same answers as a plain payload: canonical json, which anybody holding the row could read. */
async function herAnswersInPlainWords(): Promise<Uint8Array> {
  const held = readProfile(herDatabase(), await theProfileVaultOnHerPhone());

  if (held === undefined) {
    throw new Error('this phone holds no profile, so there are no answers to write out plainly');
  }

  return profileBytes(held, { now: whenSheSaves });
}

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

/**
 * How each language writes the first person plural. The voice says Emi tells her what we do for
 * her, so each catalogue carries its own form of it rather than the English word.
 */
const howEachLanguageSaysWe: Readonly<Record<Language, RegExp>> = {
  en: /(?<!\p{Letter})(we|our)(?!\p{Letter})/iu,
  es: /(?<!\p{Letter})(nos|nuestro|nuestra)(?!\p{Letter})|mos(?!\p{Letter})/iu,
  ru: /(?<!\p{Letter})(мы|наш)/iu,
};

function formsOf(held: Words): string[] {
  return typeof held === 'string' ? [held] : Object.values(held);
}

/** Every word of the welcome and the tour in one language, out of that language's own catalogue. */
function theWordsOfTheFirstOpenIn(language: Language): string[] {
  const catalogue = catalogueOf(language);

  return wordKeys
    .filter((key) => key.startsWith('onboarding.tour.') || key.startsWith('onboarding.welcome.'))
    .flatMap((key) => formsOf(catalogue[key]));
}

/** The welcome, then the way out of the tour behind it, which leaves her on the first question. */
async function sheSkipsTheTour(): Promise<void> {
  await shePresses(onboardingActionTestID);
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
  'Symptoms you log at about the same point in 3 different cycles will show here.',
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
  // A scenario that read the phone in another language must not leave the next one reading it.
  forgetLanguage();
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

    and('she answers every question of the first run', async () => {
      await sheAnswersEveryQuestionOfTheFirstRun();
    });

    and('she taps Save and start', async () => {
      await sheTapsSaveAndStart();
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
        recordedAt: whenSheSaves.toISOString(),
      });
    });

    and('her phone holds the cycle length she gave', async () => {
      expect(readProfile(herDatabase(), await theProfileVaultOnHerPhone())?.cycleLengthDays).toBe(
        sheSaysHerCycleRuns,
      );
    });
  });

  test('SCREEN-1, her stated cycle length is not readable in the sealed profile', ({
    given,
    when,
    and,
    then,
  }) => {
    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    and('she answers every question of the first run', async () => {
      await sheAnswersEveryQuestionOfTheFirstRun();
    });

    and('she taps Save and start', async () => {
      await sheTapsSaveAndStart();
    });

    then('her phone holds the cycle length she gave', async () => {
      expect(readProfile(herDatabase(), await theProfileVaultOnHerPhone())?.cycleLengthDays).toBe(
        sheSaysHerCycleRuns,
      );
    });

    and('the row her answers sit in does not hold that number in plain words', () => {
      // The row as the bytes on the disk, read with no repository between it and the scenario,
      // and under the key her first run drew for itself rather than any key a test knows.
      expect(readableIn(theRowHerAnswersSitIn(), theCycleLengthUnderItsField)).toBe(false);
    });

    and('the row is not her answers in plain words, which do hold the number', async () => {
      const plain = await herAnswersInPlainWords();

      // The same search, held to finding the number, because a search that finds nothing passes
      // the step above it and proves nothing about the seal.
      expect(readableIn(plain, theCycleLengthUnderItsField)).toBe(true);
      expect(Buffer.from(theRowHerAnswersSitIn())).not.toEqual(Buffer.from(plain));
    });
  });

  test('SCREEN-1, she answers everything, leaves before she taps Save and start, and nothing is written', ({
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

    and('she answers every question of the first run', async () => {
      await sheAnswersEveryQuestionOfTheFirstRun();
      expect(app.pathname()).toBe('/onboarding/hold');
    });

    and('she closes Emi at the last screen, without tapping Save and start', async () => {
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

    and(
      'she answers every question, and presses Done a second time before the screen goes',
      async () => {
        await sheReadsTheWelcome();
        await shePresses(onboardingSkipTestID);
        await shePresses(onboardingSkipTestID);
        await sheGivesAPeriod(0, herPeriodStarted);
        await shePresses(onboardingActionTestID);

        await shePresses(cycleLengthDaysTestID(sheSaysHerCycleRuns));

        await shePresses(onboardingActionTestID);
        await shePresses(periodLengthDaysTestID(defaultPeriodLengthDays));

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
        await shePresses(onboardingSkipTestID);
        await shePresses(firstForecastActionTestID);
        await shePresses(whatEmiDoesActionTestID);
      },
    );

    and('she taps Save and start', async () => {
      await sheTapsSaveAndStart();
    });

    then('she is looking at the home screen', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    and('her phone holds one day, the day she said her period started', () => {
      expect(listDayLogs(herDatabase()).map((row) => row.day)).toEqual([herPeriodStarted]);
    });

    and(
      'her phone holds the time she tapped Save and start, and one instant on all three of her answers',
      async () => {
        const row = readDayLog(herDatabase(), herPeriodStarted);
        const vault = await theVaultOnHerPhone();

        expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBe(whenSheSaves.toISOString());
        expect(row && vault.open(row.payload).recordedAt).toBe(whenSheSaves.toISOString());
        expect(
          (await theProfileVaultOnHerPhone()) &&
            readProfile(herDatabase(), await theProfileVaultOnHerPhone())?.recordedAt,
        ).toBe(whenSheSaves.toISOString());
      },
    );
  });

  test('SCREEN-1, she picks a tile on her first day and then says she has nothing to add', ({
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

    and('she reaches the question about how she is today', async () => {
      await sheReadsTheWelcome();
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await sheGivesAPeriod(0, herPeriodStarted);
      await shePresses(onboardingActionTestID);
      await shePresses(cycleLengthDaysTestID(sheSaysHerCycleRuns));
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingWayPastTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);

      expect(app.pathname()).toBe('/onboarding/today');
    });

    then('Save today waits until she picks a tile', () => {
      expect(screen.getByTestId(onboardingActionTestID)).toHaveTextContent('Save today');
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
    });

    when('she picks cramps', async () => {
      await shePresses(todayTestID('cramps'));

      expect(screen.getByTestId(todayTestID('cramps'))).toBeSelected();
      expect(screen.getByTestId(onboardingActionTestID)).not.toBeDisabled();
    });

    and('she presses Nothing to add', async () => {
      expect(screen.getByTestId(onboardingWayPastTestID)).toHaveTextContent('Nothing to add');

      await shePresses(onboardingWayPastTestID);
    });

    then('she is asked whether Emi should remind her', () => {
      expect(app.pathname()).toBe('/onboarding/reminder');
      expect(listDayLogs(herDatabase())).toEqual([]);
    });

    when('she says Not now', async () => {
      expect(screen.getByTestId(onboardingWayPastTestID)).toHaveTextContent('Not now');

      await shePresses(onboardingWayPastTestID);
    });

    then('she is looking at her first forecast', () => {
      expect(app.pathname()).toBe('/onboarding/first-forecast');
      expect(listDayLogs(herDatabase())).toEqual([]);
    });

    when('she reads on and taps Save and start', async () => {
      await shePresses(firstForecastActionTestID);
      await shePresses(whatEmiDoesActionTestID);
      await sheTapsSaveAndStart();
    });

    then('her phone holds one day, the day she said her period started', () => {
      expect(listDayLogs(herDatabase()).map((row) => row.day)).toEqual([herPeriodStarted]);
    });
  });

  test('SCREEN-1, she picks breast tenderness and a symptom from All symptoms on her first day', ({
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

    and('she reaches the question about how she is today', async () => {
      await sheReachesTheReminder();
      await shePresses(onboardingBackTestID);

      expect(app.pathname()).toBe('/onboarding/today');
    });

    then(
      'the six tiles are cramps, headache, bloating, fatigue, breast tenderness and low mood',
      () => {
        expect(todaySymptoms).toEqual([
          'cramps',
          'headache',
          'bloating',
          'fatigue',
          'breast-tenderness',
          'low-mood',
        ]);
        expect(screen.getByTestId(todayTestID('breast-tenderness'))).toHaveTextContent(
          'Breast tenderness',
        );
        expect(screen.queryByTestId('today-calm')).toBeNull();
      },
    );

    when('she picks breast tenderness', async () => {
      await shePresses(todayTestID('breast-tenderness'));

      expect(screen.getByTestId(todayTestID('breast-tenderness'))).toBeSelected();
    });

    and('she presses All symptoms, marks irritable and saves', async () => {
      expect(screen.getByTestId(todayAllSymptomsTestID)).toHaveTextContent('All symptoms');

      await shePresses(todayAllSymptomsTestID);

      expect(app.pathname()).toBe('/onboarding/all-symptoms');
      expect(screen.getByTestId(symptomChipTestID('breast-tenderness'))).toBeChecked();

      await shePresses(symptomChipTestID('irritable'));
      await shePresses(logSymptomsSaveTestID);
    });

    then('she is back on the question about how she is today, and Save today is ready', () => {
      expect(app.pathname()).toBe('/onboarding/today');
      expect(screen.getByTestId(todayTestID('breast-tenderness'))).toBeSelected();
      expect(screen.getByTestId(onboardingActionTestID)).not.toBeDisabled();
    });

    and('her phone holds no day yet', () => {
      expect(listDayLogs(herDatabase())).toEqual([]);
    });

    when('she presses Save today and says Not now', async () => {
      await shePresses(onboardingActionTestID);

      expect(app.pathname()).toBe('/onboarding/reminder');

      await shePresses(onboardingWayPastTestID);
    });

    and('she reads on and taps Save and start', async () => {
      await sheReadsOnAndSaves();
    });

    then('today holds breast tenderness and irritable, in the order she picked them', async () => {
      const vault = await theVaultOnHerPhone();
      const row = listDayLogs(herDatabase()).find((each) => each.day === today);

      expect(row && vault.open(row.payload).symptoms).toEqual(['breast-tenderness', 'irritable']);
    });
  });

  /** Past every question and the first day she logs, which leaves her on the reminder. */
  async function sheReachesTheReminder(): Promise<void> {
    await sheReadsTheWelcome();
    await shePresses(onboardingSkipTestID);
    await shePresses(onboardingSkipTestID);
    await sheGivesAPeriod(0, herPeriodStarted);
    await shePresses(onboardingActionTestID);
    await shePresses(cycleLengthDaysTestID(sheSaysHerCycleRuns));
    await shePresses(onboardingActionTestID);
    await shePresses(onboardingWayPastTestID);
    await shePresses(onboardingSkipTestID);
    await shePresses(onboardingSkipTestID);
    await shePresses(onboardingSkipTestID);
    await shePresses(onboardingSkipTestID);
    await shePresses(onboardingSkipTestID);
  }

  /** The forecast, what Emi does with it, and the hold. */
  async function sheReadsOnAndSaves(): Promise<void> {
    await fireEvent.press(await screen.findByTestId(firstForecastActionTestID));
    await shePresses(whatEmiDoesActionTestID);
    await sheTapsSaveAndStart();
  }

  test('SCREEN-1, she asks Emi to remind her two days before the range starts', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('she has never opened Emi before', () => {
      resetExpoNotifications('allow');
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she reaches the reminder after the first day she logs', async () => {
      await sheReachesTheReminder();

      expect(app.pathname()).toBe('/onboarding/reminder');
    });

    then('Turn on reminders waits until she picks when', () => {
      expect(screen.getByTestId(onboardingActionTestID)).toHaveTextContent('Turn on reminders');
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
    });

    and('the sample lock screen says only that it is a reminder from Emi', () => {
      expect(screen.getByTestId(reminderPreviewWordsTestID)).toHaveTextContent(
        'A reminder from Emi',
      );
      expect(screen.getByTestId(reminderPreviewWordsTestID)).not.toHaveTextContent(/period/i);
    });

    when('she picks two days before', async () => {
      await shePresses(reminderTestID('twoDaysBefore'));

      expect(screen.getByTestId(reminderTestID('twoDaysBefore'))).toBeSelected();
      expect(timesThePhoneAsked()).toBe(0);
    });

    and('she presses Turn on reminders and her phone allows it', async () => {
      await shePresses(onboardingActionTestID);
      await screen.findByTestId(firstForecastActionTestID);
    });

    then('her phone asked her once, after she pressed', () => {
      expect(timesThePhoneAsked()).toBe(1);
    });

    and('she is looking at her first forecast', () => {
      expect(app.pathname()).toBe('/onboarding/first-forecast');
    });

    when('she reads on and taps Save and start', async () => {
      await sheReadsOnAndSaves();
    });

    then(
      'her phone holds one reminder from Emi, at nine in the morning two days before the range she was shown',
      async () => {
        const forecast = forecastFromHerAnswers({
          periods: [{ startedOn: herPeriodStarted, lengthDays: aWalkPeriodLengthDays }],
          cycleLengthDays: sheSaysHerCycleRuns,
        });
        const [year, month, day] = (forecast.start?.from ?? '').split('-').map(Number);

        expect(readSetting(herDatabase(), 'reminderLead')).toBe('twoDaysBefore');
        await waitFor(() => {
          expect(theRemindersOnThePhone().map((reminder) => reminder.at)).toEqual([
            new Date(year ?? 0, (month ?? 1) - 1, (day ?? 1) - 2, 9, 0, 0, 0),
          ]);
          expect(theRemindersOnThePhone().map((reminder) => reminder.body)).toEqual([
            'A reminder from Emi',
          ]);
        });
      },
    );
  });

  test('SCREEN-1, her phone refuses the reminder and the first run goes on', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('she has never opened Emi before', () => undefined);

    and('her phone will refuse notifications', () => {
      resetExpoNotifications('refuse');
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she reaches the reminder after the first day she logs', async () => {
      await sheReachesTheReminder();
    });

    and('she picks one day before and presses Turn on reminders', async () => {
      await shePresses(reminderTestID('oneDayBefore'));
      await shePresses(onboardingActionTestID);
      await screen.findByTestId(firstForecastActionTestID);
    });

    then('she is looking at her first forecast', () => {
      expect(app.pathname()).toBe('/onboarding/first-forecast');
      expect(timesThePhoneAsked()).toBe(1);
    });

    when('she reads on and taps Save and start', async () => {
      await sheReadsOnAndSaves();
    });

    then('her phone holds no reminder and no choice of one', () => {
      expect(readSetting(herDatabase(), 'reminderLead')).toBeUndefined();
      expect(theRemindersOnThePhone()).toEqual([]);
    });
  });

  test('SCREEN-1, the first run asks its questions and the save after them', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;
    const visited: string[] = [];
    const whatEachScreenSaid: string[] = [];
    const whatEachCounterRead: string[] = [];

    /** Where she stands, and what the step counter on that screen reads, or that it draws none. */
    function sheIsOn(): void {
      visited.push(app.pathname());

      const counter = screen.queryByTestId(onboardingProgressTestID);
      const read = counter?.props.accessibilityValue as { now: number; max: number } | undefined;

      whatEachCounterRead.push(read === undefined ? 'no counter' : `${read.now} of ${read.max}`);
    }

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she answers every question of the first run', async () => {
      sheIsOn();
      whatEachScreenSaid.push(screen.getByText(firstRunCopy.welcome.title).props.children);
      await sheReadsTheWelcome();
      sheIsOn();
      await shePresses(onboardingSkipTestID);
      sheIsOn();
      await shePresses(onboardingSkipTestID);
      sheIsOn();
      await sheGivesAPeriod(0, herPeriodStarted);
      await shePresses(onboardingActionTestID);
      sheIsOn();
      await shePresses(cycleLengthDaysTestID(defaultCycleLengthDays));
      await shePresses(onboardingActionTestID);
      sheIsOn();
      await shePresses(onboardingWayPastTestID);
      sheIsOn();
      await shePresses(onboardingSkipTestID);
      sheIsOn();
      await shePresses(onboardingSkipTestID);
      sheIsOn();
      await shePresses(onboardingSkipTestID);
      sheIsOn();
      await shePresses(onboardingSkipTestID);
      sheIsOn();
      await shePresses(onboardingSkipTestID);
      sheIsOn();
      await shePresses(onboardingSkipTestID);
      sheIsOn();
      await shePresses(firstForecastActionTestID);
      sheIsOn();
      await shePresses(whatEmiDoesActionTestID);
      sheIsOn();
    });

    and('she taps Save and start', async () => {
      await sheTapsSaveAndStart();
    });

    then(
      'she was asked what Emi is, her name, the year she was born, her last three periods, how long her cycle runs, how long her period lasts, how steady her cycle is, how she feels about it, and what she wants Emi to help with, and what changes with her cycle, and what she feels today, and whether Emi should remind her',
      () => {
        expect(visited).toEqual([
          '/onboarding/welcome',
          '/onboarding/name',
          '/onboarding/year-of-birth',
          '/onboarding/three-periods',
          '/onboarding/cycle-length',
          '/onboarding/period-length',
          '/onboarding/regularity',
          '/onboarding/feeling',
          '/onboarding/goals',
          '/onboarding/focus',
          '/onboarding/today',
          '/onboarding/reminder',
          '/onboarding/first-forecast',
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

    and(
      'the counter read its own step on every question, and no promise step stood before the hold',
      () => {
        // The welcome is step 1 and the first run log of today is step 11, and neither draws the
        // bar, so the counter reads the true number on every other question. The three screens
        // after the reminder ask her nothing and count nothing.
        expect(whatEachCounterRead).toEqual([
          'no counter',
          '2 of 12',
          '3 of 12',
          '4 of 12',
          '5 of 12',
          '6 of 12',
          '7 of 12',
          '8 of 12',
          '9 of 12',
          '10 of 12',
          'no counter',
          '12 of 12',
          'no counter',
          'no counter',
          'no counter',
        ]);
        expect(whatEachCounterRead).toHaveLength(visited.length);
        expect(visited).not.toContain('/onboarding/the-promise');
      },
    );
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

    and('she answers every question of the first run', async () => {
      await shePresses(onboardingActionTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(tourSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await sheGivesAPeriod(0, herPeriodStarted);
      await shePresses(onboardingActionTestID);
      everyFieldShePassed.push(...fieldsDrawn());

      await shePresses(cycleLengthDaysTestID(sheSaysHerCycleRuns));

      await shePresses(onboardingActionTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingWayPastTestID);
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
      await shePresses(whatEmiDoesActionTestID);
      everyFieldShePassed.push(...fieldsDrawn());
    });

    and('she taps Save and start', async () => {
      await sheTapsSaveAndStart();
    });

    then('the only thing she could type into was her name', () => {
      expect([...new Set(everyFieldShePassed)]).toEqual([firstRunCopy.name.label]);
      // She reached the home screen, so the run is finished, and the only two answers her
      // phone holds are the two the questions asked her for.
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(settingKeys.filter((key) => /account|email|password|sign.?in/i.test(key))).toEqual([]);
    });
  });

  test('SCREEN-1, she says she will log as she goes and the first run moves on', ({
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

    and('she reaches the step that asks for her last three periods', async () => {
      await sheReachesTheThreePeriodsStep();

      expect(screen.getByTestId('onboarding-threePeriods')).toBeTruthy();
    });

    and('she says she will log as she goes', async () => {
      expect(screen.getByTestId(onboardingWayPastTestID)).toHaveTextContent(
        'Skip, I will log as I go',
      );
      await shePresses(onboardingWayPastTestID);
    });

    then('she is being asked how long her cycle runs', () => {
      expect(app.pathname()).toBe('/onboarding/cycle-length');
      expect(screen.getByTestId('onboarding-cycleLength')).toBeTruthy();
    });

    and('the question she could not answer is behind her', () => {
      expect(screen.queryByTestId('onboarding-threePeriods')).toBeNull();
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
      // The day is read inside the ring rather than anywhere on the glass, so a number found loose
      // elsewhere on the screen cannot answer for it. The ring of Today writes it as Day 2.
      expect(within(screen.getByTestId(cycleRingTestID)).getByText('Day 2')).toBeTruthy();
      expect(
        within(screen.getByTestId(cycleRingTestID)).getByText(phaseFullName('period')),
      ).toBeTruthy();
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

    and('the ring says that Monday is day 1 of 28, in the period phase', () => {
      expect(theRingSays()).toBe('Day 1 of 28, period');
      expect(screen.getByTestId(logFlowPhaseTestID)).toHaveTextContent(phaseLabel.period);
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

    then(
      'the ring draws four arcs, each one sized by the days of that phase and none narrower than its name',
      () => {
        const arcs = theArcsOnTheRing();
        const forArcs = FULL_TURN_DEGREES - 4 * GAP_DEGREES;
        // Five days of forty five is narrower than "OVULATION", so that arc holds its name's width
        // and the other three share what is left by their days.
        const ovulation = namedArcFloors().ovulation;

        expect(arcs.map((arc) => arc.phase)).toEqual([
          'period',
          'follicular',
          'ovulation',
          'luteal',
        ]);
        expect(arcs.map((arc) => Math.round(arc.sweepDegrees * 100) / 100)).toEqual(
          [6, 24, 0, 10].map(
            (days) =>
              Math.round((days === 0 ? ovulation : ((forArcs - ovulation) * days) / 40) * 100) /
              100,
          ),
        );
        expect(new Set(arcs.map((arc) => arc.sweepDegrees)).size).toBe(4);
      },
    );
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
    given('her phone holds six cycles of twenty one days with a week of bleeding', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 21, periodDays: 7, dayOfCycle: 7 }),
      );
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then('a phase of no days is not drawn at all', () => {
      expect(screen.queryByTestId(ringArcTestID('follicular', 'elapsed'))).toBeNull();
      expect(screen.queryByTestId(ringArcTestID('follicular', 'ahead'))).toBeNull();
      expect(screen.queryByTestId(ringWholeArcTestID('follicular'))).toBeNull();
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

  test('BRAND-3, the pointer sits on the day she is on and never outside her cycle', ({
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
      early = thePointerDegrees();
    });

    then('the pointer sits on the day the ring says she is on', () => {
      expect(theRingSays()).toBe('Day 3 of 45, period');

      const period = theArcsOnTheRing().find((arc) => arc.phase === 'period') as DrawnArc;

      expect(early).toBeGreaterThanOrEqual(period.startDegrees);
      expect(early).toBeLessThanOrEqual(period.startDegrees + period.sweepDegrees);
    });

    and('the pointer moves further round the ring on a later day', async () => {
      resetExpoSqlite();
      resetExpoSecureStore();
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 45, periodDays: 6, dayOfCycle: 33 }),
      );
      await sheOpens('/');

      const later = thePointerDegrees();
      const ovulation = theArcsOnTheRing().find((arc) => arc.phase === 'ovulation') as DrawnArc;

      expect(theRingSays()).toBe('Day 33 of 45, ovulation');
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

      expect(insideTheRing.getByText(phaseFullName('period'))).toBeTruthy();
      expect(insideTheRing.queryByText(phaseFullName('luteal'))).toBeNull();
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

    and('she reads the welcome and skips the tour', async () => {
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await shePresses(onboardingActionTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await shePresses(tourSkipTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await shePresses(onboardingSkipTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await shePresses(onboardingSkipTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await sheGivesAPeriod(0, herPeriodStarted);
      await shePresses(onboardingActionTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await shePresses(cycleLengthDaysTestID(defaultCycleLengthDays));
      await shePresses(onboardingActionTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));
    });

    then(
      'every control on each screen of the first run is at least 44 points on both axes, apart from a day square of the month',
      () => {
        expect(measured).toEqual([[], [], [], [], [], [], []]);
        expect(screen.getByTestId(periodLengthWheelTestID)).toBeTruthy();
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

    and('she opens the first of her last three periods', async () => {
      await sheSkipsTheTour();
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(pastPeriodRowTestID(0));
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
      'under each of the three she reads one line that says what the number means for her',
      () => {
        expect(whatItSays(measuredMeaningTestID('cycle-length'))).toContain(
          'Your forecast is counted from these lengths.',
        );
        expect(whatItSays(measuredMeaningTestID('period-duration'))).toContain(
          'A day you did not log is not counted.',
        );
        expect(whatItSays(measuredMeaningTestID('cycle-length-variation'))).toContain(
          'The more they differ, the wider your forecast range.',
        );
      },
    );

    and(
      'she is told the figure beside each of hers comes from a published study, not from her records',
      () => {
        expect(whatItSays(homeFiguresLineTestID)).toBe(
          'The figure beside each of yours comes from a published study, not from your records.',
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

  test('SCREEN-2, the screen she opens names emi and greets her by the name she gave', ({
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

    and(
      'it carries her initial in a disc, then the word emi, then the greeting, then the calendar button',
      () => {
        // The order comes off the drawing rather than off this file. The drawing's mark is
        // answered by the avatar disc, which the todayPhases board puts in its place.
        expect(theOrderTheDrawingPlacesThemIn()).toEqual(theHeaderCarries.map((part) => part.name));
        expect(partsMissing(theHeaderCarries, whatTheScreenSheOpensDrew())).toEqual([]);
        expect(whatTheHeaderDrew()).toEqual([
          homeHeaderTestID,
          homeHeaderAvatarTestID,
          homeHeaderWordTestID,
          homeGreetingTestID,
          homeCalendarTestID,
        ]);
        expect(whatItSays(homeHeaderAvatarTestID)).toBe('A');
        expect(whatItSays(homeHeaderWordTestID)).toBe('emi');
      },
    );

    and('the greeting reads Hello, Ada', () => {
      expect(whatItSays(homeGreetingTestID)).toBe('Hello, Ada');
      expect(whatItSays(homeGreetingTestID)).toBe(greeting(theNameSheGave));
    });

    and('the ring mark the older header carried is gone', () => {
      expect(screen.queryByTestId(theMarkTheHeaderNoLongerDraws)).toBeNull();
    });

    and('the drawing of this screen puts that header first, and the screen answers for it', () => {
      expect(theHeaderOfTheDrawing().map((part) => part.name)).toEqual(['HomeHeader']);
      expect(partsMissing(theHeaderOfTheDrawing(), whatTheScreenSheOpensDrew())).toEqual([]);
    });

    and('a woman who gave no name reads the disc, the word, and hello on its own', async () => {
      await app.close();
      resetExpoSqlite();
      resetExpoSecureStore();
      await herPhoneHoldsHerDaysAnd(whenSheOpensIt, today);
      await sheOpens('/');

      expect(whatTheHeaderDrew()).toEqual([
        homeHeaderTestID,
        homeHeaderAvatarTestID,
        homeHeaderWordTestID,
        homeGreetingTestID,
        homeCalendarTestID,
      ]);
      expect(whatItSays(homeHeaderAvatarTestID)).toBe('');
      expect(whatItSays(homeGreetingTestID)).toBe('Hello');
    });
  });

  test('SCREEN-2, she reads the day of her cycle without pressing anything, and the week strip is gone', ({
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

    then(
      'she reads the day of her cycle in the middle of the ring without pressing anything',
      () => {
        expect(app.pathname()).toBe('/');
        expect(screen.getByTestId(ringCentreDayTestID)).toBeTruthy();
        expect(theDayTheRingCentreSays()).toBe(4);
      },
    );

    and('that is the day the ring says for today', () => {
      expect(theDayTheRingCentreSays()).toBe(theDayTheRingSaysFor(theDaySheOpensIt));
    });

    and('no part of the strip of seven days is drawn', () => {
      expect(whatIsLeftOfTheStrip()).toEqual([]);
    });

    and('the calendar button in the top bar stands above the ring, where the strip was', () => {
      const drawn = whatTheScreenSheOpensDrew();

      expect(drawn.indexOf(homeCalendarTestID)).toBeGreaterThan(drawn.indexOf(homeHeaderTestID));
      expect(drawn.indexOf(homeCalendarTestID)).toBeLessThan(drawn.indexOf(cycleRingTestID));
    });

    and('the strip is the one part of the top of the drawing the screen does not build', () => {
      expect(partsMissing(theTopOfTheDrawing('todayNext'), whatTheScreenSheOpensDrew())).toEqual(
        theStripTheCalendarReplaced,
      );
      expect(theTodayDepartures.filter((departure) => departure.drawing === 'todayNext')).toEqual([
        { drawing: 'todayNext', part: 'WeekStrip', reason: whyTheStripIsGone },
      ]);
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
      'in the middle of the ring she reads Day and the day of her cycle, in type large enough to read across a room',
      () => {
        expect(app.pathname()).toBe('/');
        expect(thePhaseSheReads().daySaid).toBe(
          `Day ${String(thePhaseLineOfTheDrawing('todayNext').day)}`,
        );
        expect(thePhaseSheReads().day).toBe(theDayTheRingSaysFor(theDaySheOpensIt));
      },
    );

    and('the phase she is in is written over it, in words', () => {
      expect(thePhaseSheReads().phase).toBe('Period phase');
    });

    and('the day of her cycle is drawn far larger than the phase over it', () => {
      const read = thePhaseSheReads();

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
      expect(thePhaseSheReads().phaseColour).toBe(theInkOf('period'));
      expect(thePhaseSheReads().phaseColour).not.toBe(theFillOf('period'));
      expect(textIn(thePhaseCardOnTheGlass()).length).toBeGreaterThan(0);
      expect(textDrawnOnAPhaseFill(thePhaseCardOnTheGlass())).toEqual([]);
    });

    and(
      'under the ring a card names the phase and its days, and the line under the ring is gone',
      () => {
        const drawn = whatTheScreenSheOpensDrew();

        expect(drawn.indexOf(phaseCardTestID)).toBeGreaterThan(drawn.indexOf(cycleRingTestID));
        expect(thePhaseSheReads().cardDays).toMatch(/^During your period, days? \d+/);
        expect(
          theIdentifiersDrawn().filter((identifier) =>
            theIdentifiersOfTheLineThatIsGone.includes(identifier),
          ),
        ).toEqual([]);
      },
    );

    and('the same screen three weeks later reads her luteal phase the same way', async () => {
      const onHerPeriodDay = thePhaseSheReads();

      await app.close();
      resetExpoSqlite();
      resetExpoSecureStore();
      const threeWeeksLater = new Date(`${theDaySheReachesHerLutealPhase}T12:00:00.000Z`);
      jest.setSystemTime(threeWeeksLater);
      await herPhoneHoldsFourRecordedPeriodDays(threeWeeksLater);
      await sheOpens('/');

      const inHerLutealPhase = thePhaseSheReads();

      expect(partsMissing(theTopOfTheDrawing('todayLuteal'), whatTheScreenSheOpensDrew())).toEqual(
        theStripTheCalendarReplaced,
      );
      expect(inHerLutealPhase.day).toBe(theFirstLutealDayTheRuleGives);
      expect(inHerLutealPhase.day).toBe(theDayTheRingSaysFor(theDaySheReachesHerLutealPhase));
      expect(inHerLutealPhase.phase).toBe('Luteal phase');
      expect(inHerLutealPhase.cardDays).toMatch(/^Before your period, days? \d+/);
      expect(inHerLutealPhase.phaseColour).toBe(theInkOf('luteal'));
      // The four words stay where they are whatever the phase, so the word she reads here is
      // drawn at the size the period day drew its own.
      expect(inHerLutealPhase.phasePoints).toBe(onHerPeriodDay.phasePoints);
      expect(inHerLutealPhase.dayPoints).toBe(onHerPeriodDay.dayPoints);
      expect(theFourWordsDrawnTooLargeOn(screen.toJSON())).toEqual([]);
    });
  });

  test('SCREEN-2, she opens the page of her phase from Today and records her diary there', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;
    const herChips = [
      'phase-diary-symptoms-cramps',
      'phase-diary-food-appetite-increase',
      'phase-diary-emotions-calm',
    ];
    const theDayOnHerPhone = (): DayRecord | undefined => {
      const held = readDayLog(herDatabase(), theDaySheOpensIt);

      return held === undefined ? undefined : herVault().open(held.payload);
    };

    given('her phone holds four recorded period days, the last of them today', async () => {
      jest.setSystemTime(whenSheOpensTheStrip);
      await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensTheStrip);
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she presses the phase card under the ring', async () => {
      await screen.findByTestId(phaseCardPressTestID);
      await shePresses(phaseCardPressTestID);
    });

    then('she is reading the page of the phase she is in, with its days in her cycle', () => {
      expect(app.pathname()).toBe('/phase');
      expect(screen.getByTestId(phasePageTitleTestID).props.children).toBe('Period phase');
      expect(screen.getByTestId(phasePageLeadTestID).props.children).toMatch(
        /^Days 1 to \d+\. These are the days you bleed\./,
      );
    });

    when('she presses Cramps, Hungry and Calm in the diary of today', async () => {
      for (const chip of herChips) {
        await shePresses(chip);
      }
    });

    and('she writes a note about today and leaves the box', async () => {
      await fireEvent.changeText(screen.getByTestId(phaseDiaryNoteTestID), 'Slept badly');
      await fireEvent(screen.getByTestId(phaseDiaryNoteTestID), 'endEditing');
    });

    then(
      'her phone holds those three answers and the note on today, sealed, beside the flow she logged',
      () => {
        const held = readDayLog(herDatabase(), theDaySheOpensIt);

        expect(new TextDecoder().decode(held?.payload)).not.toContain('Slept badly');
        expect(theDayOnHerPhone()).toMatchObject({
          flow: expect.any(String),
          symptoms: ['cramps', 'appetite-increase', 'calm'],
          note: 'Slept badly',
        });
      },
    );

    and('the three chips she pressed are filled', () => {
      for (const chip of herChips) {
        expect(screen.getByTestId(chip).props.accessibilityState).toEqual({ selected: true });
      }
    });

    when('she presses How you may feel and what may help', async () => {
      await shePresses(phasePageGuideTestID);
    });

    then(
      'a sheet gives her a short tip for Mood, Appetite, Body and Movement in that phase, and no designer note',
      () => {
        expect(screen.getByTestId(phaseGuideTestID)).toBeTruthy();
        expect(guideAreas).toEqual(['mood', 'food', 'body', 'training']);
        expect(guideAreas.map((area) => phasePageCopy.guide.areas[area])).toEqual([
          'Mood',
          'Appetite',
          'Body',
          'Movement',
        ]);
        for (const area of guideAreas) {
          expect(screen.getByTestId(phaseGuideAreaTestID(area))).toBeTruthy();
        }
        expect(screen.queryByText(/specialist/)).toBeNull();
      },
    );

    and('the sheet says that everyone is different', () => {
      expect(screen.getByTestId(phaseGuideEveryoneTestID)).toHaveTextContent(
        'Everyone is different. If symptoms get in the way of daily life, talk to a doctor.',
      );
    });

    when('she presses Close', async () => {
      await shePresses(phaseGuideCloseTestID);
    });

    then('the sheet is gone and she is on the page of her phase', () => {
      expect(screen.queryByTestId(phaseGuideTestID)).toBeNull();
      expect(screen.getByTestId(phasePageTestID)).toBeTruthy();
      expect(app.pathname()).toBe('/phase');
    });
  });

  test('SCREEN-2, she presses the period arc of the ring and reads its name and days', ({
    given,
    when,
    and,
    then,
  }) => {
    given('her phone holds four recorded period days, the last of them today', async () => {
      jest.setSystemTime(whenSheOpensTheStrip);
      await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensTheStrip);
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
      await screen.findByTestId(cycleRingTestID);
    });

    and('she presses the period arc of the ring', async () => {
      const centre = { x: NAMED_RING_DIAMETER / 2, y: NAMED_RING_DIAMETER / 2 };
      const onTheArc = pointOnRing(centre, NAMED_RING_RADIUS, namedArcFloors().period / 2);

      await fireEvent.press(screen.getByTestId(ringArcsPressTestID), {
        nativeEvent: { locationX: onTheArc.x, locationY: onTheArc.y },
      });
    });

    then('a small card over the ring names the period and its days in this cycle', () => {
      expect(screen.getByTestId(ringArcPopoverNameTestID)).toHaveTextContent('Period');
      expect(screen.getByTestId(ringArcPopoverDaysTestID)).toHaveTextContent(
        /^Days 1 to \d+ of this cycle$/,
      );
    });

    when('she presses How you may feel and what may help on the card', async () => {
      await shePresses(ringArcPopoverGuideTestID);
    });

    then('the card is gone and the guide of the period phase is open', () => {
      expect(screen.queryByTestId(ringArcPopoverTestID)).toBeNull();
      expect(screen.getByTestId(phaseGuidePhaseTestID)).toHaveTextContent('Period phase');
    });

    when(
      'she closes the guide, presses the period arc again, and presses outside the card',
      async () => {
        await shePresses(phaseGuideCloseTestID);
        const centre = { x: NAMED_RING_DIAMETER / 2, y: NAMED_RING_DIAMETER / 2 };
        const onTheArc = pointOnRing(centre, NAMED_RING_RADIUS, namedArcFloors().period / 2);
        await fireEvent.press(screen.getByTestId(ringArcsPressTestID), {
          nativeEvent: { locationX: onTheArc.x, locationY: onTheArc.y },
        });
        expect(screen.getByTestId(ringArcPopoverTestID)).toBeTruthy();
        await shePresses(ringArcPopoverOutsideTestID);
      },
    );

    then('the card is gone and she is on Today', () => {
      expect(screen.queryByTestId(ringArcPopoverTestID)).toBeNull();
      expect(screen.getByTestId(cycleRingTestID)).toBeTruthy();
    });
  });

  test('SCREEN-2, she records sex on a past day and removes it', ({ given, when, and, then }) => {
    const yesterday = addDays(theDaySheOpensIt, -1);
    const herAnswers = [
      sexChipTestID('sex', 'protected'),
      sexChipTestID('sexDrive', 'high'),
      sexChipTestID('orgasm', 'yes'),
    ];
    const thatDayOnHerPhone = (): DayRecord | undefined => {
      const held = readDayLog(herDatabase(), yesterday);

      return held === undefined ? undefined : herVault().open(held.payload);
    };
    let app: OpenApp;

    given('her phone holds four recorded period days, the last of them today', async () => {
      jest.setSystemTime(whenSheOpensTheStrip);
      await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensTheStrip);
    });

    when('she opens the Sex page of yesterday', async () => {
      app = await sheOpens(sexAddress(yesterday));
      await screen.findByTestId(sexPageTestID);
    });

    then('the page asks whether she had sex yesterday, under the date of that day', () => {
      expect(screen.getByTestId(sexPageQuestionTestID).props.children).toBe(
        'Did you have sex yesterday?',
      );
      expect(screen.getByTestId(sexPageDayTestID).props.children).toMatch(
        new RegExp(`, ${Number(yesterday.slice(8, 10))} [A-Z][a-z]+$`),
      );
    });

    when('she presses Protected, High and Yes, and saves', async () => {
      for (const answer of herAnswers) {
        await shePresses(answer);
      }
      await shePresses(sexPageSaveTestID);
    });

    then(
      'her phone holds those three answers on that day, sealed, beside the flow she logged',
      () => {
        const held = readDayLog(herDatabase(), yesterday);

        expect(new TextDecoder().decode(held?.payload)).not.toContain('protected');
        expect(thatDayOnHerPhone()).toMatchObject({
          flow: expect.any(String),
          sex: 'protected',
          sexDrive: 'high',
          orgasm: 'yes',
        });
      },
    );

    and('a sheet suggests a menstrual disc or a sponge for the third day of her period', () => {
      expect(screen.getByTestId(periodSexSuggestionTestID)).toBeTruthy();
      expect(screen.getByTestId(periodSexSuggestionEyebrowTestID).props.children).toBe(
        'Period, day 3',
      );
      expect(screen.getByTestId(periodSexProductTestID('menstrual-disc'))).toBeTruthy();
      expect(screen.getByTestId(periodSexProductTestID('sponge'))).toBeTruthy();
    });

    when('she closes the sheet with Not now', async () => {
      await shePresses(periodSexSuggestionNotNowTestID);
      expect(screen.queryByTestId(periodSexSuggestionTestID)).toBeNull();
    });

    and('she opens the Sex page of that day again', async () => {
      expect(app.pathname()).toBe('/');
      await act(() => router.push(sexAddress(yesterday)));
      await screen.findByTestId(sexPageTestID);
    });

    then('the three answers she saved are filled', () => {
      for (const answer of herAnswers) {
        expect(screen.getByTestId(answer).props.accessibilityState).toEqual({ selected: true });
      }
    });

    when('she presses each of them again, and saves', async () => {
      for (const answer of herAnswers) {
        await shePresses(answer);
      }
      await shePresses(sexPageSaveTestID);
    });

    then('that day holds no answer about sex, and keeps its flow', () => {
      const day = thatDayOnHerPhone();

      expect(day?.flow).toEqual(expect.any(String));
      expect(day).not.toHaveProperty('sex');
      expect(day).not.toHaveProperty('sexDrive');
      expect(day).not.toHaveProperty('orgasm');
    });
  });

  test('SCREEN-2, she chooses yesterday on the Sex page of today and records sex there', ({
    given,
    when,
    then,
  }) => {
    const yesterday = addDays(theDaySheOpensIt, -1);
    const theDayOnHerPhone = (day: string): DayRecord | undefined => {
      const held = readDayLog(herDatabase(), day);

      return held === undefined ? undefined : herVault().open(held.payload);
    };

    given('her phone holds four recorded period days, the last of them today', async () => {
      jest.setSystemTime(whenSheOpensTheStrip);
      await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensTheStrip);
    });

    when('she opens the Sex page of today and presses Choose another day', async () => {
      await sheOpens(sexAddress());
      await screen.findByTestId(sexPageTestID);
      expect(screen.getByTestId(sexPageQuestionTestID)).toHaveTextContent(
        'Did you have sex today?',
      );
      await shePresses(sexPageChooseDayTestID);
    });

    then('a month opens under the date, and a day ahead of her takes no press', async () => {
      expect(screen.getByTestId(sexPageDaysTestID)).toBeTruthy();
      expect(screen.getByTestId(dayTestID(addDays(theDaySheOpensIt, 1)))).toBeDisabled();
      await shePresses(dayTestID(addDays(theDaySheOpensIt, 1)));
      expect(screen.getByTestId(sexPageDayTestID)).toHaveTextContent(
        sexDayHeading(theDaySheOpensIt),
      );
    });

    when('she presses yesterday in that month', async () => {
      await shePresses(dayTestID(yesterday));
      await screen.findByText('Did you have sex yesterday?');
    });

    then('the page asks whether she had sex yesterday, under the date of that day', () => {
      expect(screen.getByTestId(sexPageQuestionTestID)).toHaveTextContent(
        'Did you have sex yesterday?',
      );
      expect(screen.getByTestId(sexPageDayTestID)).toHaveTextContent(sexDayHeading(yesterday));
      expect(screen.queryByTestId(sexPageDaysTestID)).toBeNull();
    });

    when('she presses Unprotected and saves', async () => {
      await shePresses(sexChipTestID('sex', 'unprotected'));
      await shePresses(sexPageSaveTestID);
    });

    then(
      'her phone holds that answer on yesterday, sealed, and today holds no answer about sex',
      () => {
        const held = readDayLog(herDatabase(), yesterday);

        expect(new TextDecoder().decode(held?.payload)).not.toContain('unprotected');
        expect(theDayOnHerPhone(yesterday)).toMatchObject({ sex: 'unprotected' });
        expect(theDayOnHerPhone(theDaySheOpensIt)).not.toHaveProperty('sex');
      },
    );
  });

  test('SCREEN-4, she records sex on a day she already lived from the calendar, and removes it', ({
    given,
    when,
    and,
    then,
  }) => {
    const thatDay = addDays(theDaySheOpensIt, -2);
    const theDayOnHerPhone = (): DayRecord | undefined => {
      const held = readDayLog(herDatabase(), thatDay);

      return held === undefined ? undefined : herVault().open(held.payload);
    };
    let flowSheLogged: string | undefined;

    given('her phone holds four recorded period days, the last of them today', async () => {
      jest.setSystemTime(whenSheOpensTheStrip);
      await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensTheStrip);
      flowSheLogged = theDayOnHerPhone()?.flow;
    });

    when('she opens the calendar and presses the day before yesterday', async () => {
      await sheOpens('/calendar');
      await screen.findByTestId(dayTestID(thatDay));
      await shePresses(dayTestID(thatDay));
    });

    and('she presses Record sex on the card of that day', async () => {
      expect(screen.getByTestId(daySheetRecordSexTestID)).toHaveTextContent('Record sex');
      await shePresses(daySheetRecordSexTestID);
      await screen.findByTestId(sexPageTestID);
    });

    then('the page asks whether she had sex that day, under the date of that day', () => {
      expect(screen.getByTestId(sexPageQuestionTestID)).toHaveTextContent(
        'Did you have sex that day?',
      );
      expect(screen.getByTestId(sexPageDayTestID)).toHaveTextContent(sexDayHeading(thatDay));
    });

    when('she presses Protected and saves', async () => {
      await shePresses(sexChipTestID('sex', 'protected'));
      await shePresses(sexPageSaveTestID);
    });

    then('the sheet of products for sex on a period day opens', async () => {
      await screen.findByTestId(periodSexSuggestionTestID);
    });

    when('she presses Not now on the sheet', async () => {
      await shePresses(periodSexSuggestionNotNowTestID);
      await screen.findByTestId(daySheetTestID);
      expect(screen.queryByTestId(periodSexSuggestionTestID)).toBeNull();
    });

    then('her phone holds that answer on that day, sealed, beside the flow she logged', () => {
      const held = readDayLog(herDatabase(), thatDay);

      expect(flowSheLogged).toEqual(expect.any(String));
      expect(new TextDecoder().decode(held?.payload)).not.toContain('protected');
      expect(theDayOnHerPhone()).toMatchObject({ flow: flowSheLogged, sex: 'protected' });
    });

    and('the card of that day names sex, and that day carries a heart in the month', () => {
      expect(screen.getByTestId(daySheetLineTestID)).toHaveTextContent(/\bsex\b/i);
      expect(screen.getByTestId(sexMarkTestID(thatDay))).toBeTruthy();
    });

    when(
      'she presses that day again, then Record sex, then Protected again, and saves',
      async () => {
        await shePresses(dayTestID(thatDay));
        await shePresses(daySheetRecordSexTestID);
        await screen.findByTestId(sexPageTestID);
        expect(screen.getByTestId(sexChipTestID('sex', 'protected'))).toBeSelected();
        await shePresses(sexChipTestID('sex', 'protected'));
        await shePresses(sexPageSaveTestID);
      },
    );

    then('that day holds no answer about sex, and keeps its flow', () => {
      expect(theDayOnHerPhone()?.flow).toBe(flowSheLogged);
      expect(theDayOnHerPhone()).not.toHaveProperty('sex');
    });

    and(
      'the card of that day no longer names sex, and the heart is gone from that day',
      async () => {
        await screen.findByTestId(daySheetTestID);
        expect(screen.getByTestId(daySheetLineTestID)).not.toHaveTextContent(/\bsex\b/i);
        expect(screen.queryByTestId(sexMarkTestID(thatDay))).toBeNull();
      },
    );
  });

  test('SCREEN-4, she removes a day of a past month she marked as a period by mistake, in one press', ({
    given,
    when,
    and,
    then,
  }) => {
    const theWrongDay = addDays(theDaySheOpensIt, -28);
    const theDayOnHerPhone = (): DayRecord | undefined => {
      const held = readDayLog(herDatabase(), theWrongDay);

      return held === undefined ? undefined : herVault().open(held.payload);
    };
    const herCycleStarts = (): string[] =>
      listCycles(herDatabase())
        .filter((cycle) => !cycle.isPredicted)
        .map((cycle) => cycle.startedOn);
    const whatTheSquareSays = (): string =>
      String(screen.getByTestId(dayTestID(theWrongDay)).props.accessibilityLabel);

    given('her phone holds four recorded period days, the last of them today', async () => {
      jest.setSystemTime(whenSheOpensTheStrip);
      await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensTheStrip);
    });

    when(
      'she opens last month in the calendar, opens a day she did not bleed on, and says her period came that day',
      async () => {
        await sheOpens(`/calendar?${dayParameter}=${theWrongDay}`);
        await screen.findByTestId(dayTestID(theWrongDay));
        await shePresses(dayTestID(theWrongDay));
        expect(screen.queryByTestId(daySheetRemovePeriodDayTestID)).toBeNull();
        await shePresses(daySheetOpenTestID);
        await screen.findByTestId(flowPickerTestID);
        await shePresses(flowOptionTestID('medium'));
        await shePresses(logFlowDoneTestID);
        await screen.findByTestId(daySheetTestID);
      },
    );

    then(
      'the month fills that day, a cycle starts on it, and its card carries Remove period day',
      () => {
        expect(whatTheSquareSays()).toContain('you bled');
        expect(herCycleStarts()).toContain(theWrongDay);
        expect(screen.getByTestId(daySheetRemovePeriodDayTestID)).toHaveTextContent(
          'Remove period day',
        );
      },
    );

    when('she presses Remove period day', async () => {
      await shePresses(daySheetRemovePeriodDayTestID);
    });

    then('that day holds no bleeding, and no cycle starts on it', () => {
      expect(theDayOnHerPhone()?.flow).toBe('none');
      expect(herCycleStarts()).not.toContain(theWrongDay);
    });

    and('the month no longer fills that day, and its card carries no Remove period day', () => {
      expect(whatTheSquareSays()).not.toContain('you bled');
      expect(screen.queryByTestId(daySheetRemovePeriodDayTestID)).toBeNull();
    });
  });

  test('SCREEN-4, a profile and a day saved while Digestion was one group read under Appetite and Digestive symptoms', ({
    given,
    when,
    and,
    then,
  }) => {
    const thatDay = addDays(theDaySheOpensIt, -2);
    const theDayOnHerPhone = (day: string): DayRecord | undefined => {
      const held = readDayLog(herDatabase(), day);

      return held === undefined ? undefined : herVault().open(held.payload);
    };

    given(
      'her profile was saved with Digestion as the group she watches, and the day before yesterday holds nausea and a food craving',
      async () => {
        jest.setSystemTime(whenSheOpensTheStrip);
        const days = herFourRecordedPeriodDays().map((record) =>
          record.day === thatDay ? { ...record, symptoms: ['nausea', 'food-craving'] } : record,
        );
        await herPhoneHoldsTheseAnswers(
          whenSheOpensTheStrip,
          { kind: 'profile', recordedAt: whenSheOpensTheStrip.toISOString() },
          days,
        );
        // An older Emi sealed `digestion`, which today's seal refuses, so the bytes are sealed here
        // the way that Emi sealed them.
        const plaintext = new TextEncoder().encode(
          `{"focus":["digestion"],"kind":"profile","recordedAt":"${whenSheOpensTheStrip.toISOString()}"}`,
        );
        const nonce = new Uint8Array(24).map((_, at) => at + 1);
        const sealed = xchacha20poly1305(herKey(), nonce).encrypt(plaintext);
        writeProfile(
          herDatabase(),
          { seal: () => new Uint8Array([1, ...nonce, ...sealed]), open: herProfileVault().open },
          {
            profile: { kind: 'profile', recordedAt: whenSheOpensTheStrip.toISOString() },
            now: whenSheOpensTheStrip,
          },
        );
      },
    );

    when('she opens the day before yesterday', async () => {
      await sheOpens(`/day/${thatDay}`);
    });

    then(
      'Appetite and Digestive symptoms are the first two tiles, and no tile reads Digestion',
      () => {
        const tiles = within(screen.getByTestId(groupTilesTestID))
          .getAllByRole('button')
          .map((tile) => String(tile.props.testID));

        expect(tiles.slice(0, 2)).toEqual([
          groupTileTestID('appetite'),
          groupTileTestID('digestive'),
        ]);
        expect(screen.getByTestId(groupTileTestID('appetite'))).toHaveTextContent('Appetite');
        expect(screen.getByTestId(groupTileTestID('digestive'))).toHaveTextContent(
          'Digestive symptoms',
        );
        expect(screen.queryByText('Digestion')).toBeNull();
      },
    );

    when('she presses the Appetite tile', async () => {
      await shePresses(groupTileTestID('appetite'));
    });

    then('Food craving is marked under Appetite, beside Sweet and Salty', () => {
      const appetite = screen.getByTestId(symptomGroupTestID('appetite'));

      expect(within(appetite).getByTestId(symptomChipTestID('food-craving'))).toBeChecked();
      expect(within(appetite).getByTestId(symptomChipTestID('sweet-craving'))).toHaveTextContent(
        'Sweet',
      );
      expect(within(appetite).getByTestId(symptomChipTestID('salty-craving'))).toHaveTextContent(
        'Salty',
      );
    });

    when('she marks Sweet and presses Save', async () => {
      await shePresses(symptomChipTestID('sweet-craving'));
      await shePresses(logSymptomsSaveTestID);
    });

    then('that day holds nausea, the food craving and sweet, sealed', () => {
      const held = readDayLog(herDatabase(), thatDay);

      expect(new TextDecoder().decode(held?.payload)).not.toContain('sweet-craving');
      expect([...(theDayOnHerPhone(thatDay)?.symptoms ?? [])].sort()).toEqual([
        'food-craving',
        'nausea',
        'sweet-craving',
      ]);
    });

    and(
      'her profile still opens with Appetite and Digestive symptoms when she changes another answer',
      () => {
        changeProfileAnswer(herDatabase(), herProfileVault(), {
          answer: { cycleLengthDays: 30 },
          now: whenSheOpensTheStrip,
        });

        expect(readProfile(herDatabase(), herProfileVault())).toMatchObject({
          cycleLengthDays: 30,
          focus: ['appetite', 'digestive'],
        });
      },
    );
  });

  test('SCREEN-4, she adds a symptom to a day she already lived and opens its Sex and Period pages', ({
    given,
    when,
    and,
    then,
  }) => {
    const thatDay = addDays(theDaySheOpensIt, -2);
    const theDayOnHerPhone = (day: string): DayRecord | undefined => {
      const held = readDayLog(herDatabase(), day);

      return held === undefined ? undefined : herVault().open(held.payload);
    };
    let flowSheLogged: string | undefined;

    given('her phone holds four recorded period days, the last of them today', async () => {
      jest.setSystemTime(whenSheOpensTheStrip);
      await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensTheStrip);
      flowSheLogged = theDayOnHerPhone(thatDay)?.flow;
    });

    when('she opens the day before yesterday', async () => {
      await sheOpens(`/day/${thatDay}`);
    });

    then('the screen names that date, and asks about her flow with no word for today', () => {
      expect(screen.getByTestId(logFlowWhenTestID)).toHaveTextContent(dateWords(thatDay));
      expect(screen.getByTestId(logFlowTitleTestID)).toHaveTextContent('Period');
      expect(screen.queryByText(/today/i)).toBeNull();
    });

    when('she presses the Digestive symptoms tile, marks Bloating and presses Save', async () => {
      await shePresses(groupTileTestID('digestive'));
      await shePresses(symptomChipTestID('bloating'));
      await shePresses(logSymptomsSaveTestID);
    });

    then(
      'that day holds Bloating, sealed, beside the flow she logged, and today holds no symptom',
      () => {
        const held = readDayLog(herDatabase(), thatDay);

        expect(flowSheLogged).toEqual(expect.any(String));
        expect(new TextDecoder().decode(held?.payload)).not.toContain('bloating');
        expect(theDayOnHerPhone(thatDay)).toMatchObject({
          flow: flowSheLogged,
          symptoms: ['bloating'],
        });
        expect(theDayOnHerPhone(theDaySheOpensIt)?.symptoms).toBeUndefined();
      },
    );

    and('the day shows Bloating as a symptom she can take off', () => {
      expect(screen.getByTestId(logFlowTestID)).toBeTruthy();
      expect(screen.getByTestId(symptomChipTestID('bloating'))).toBeChecked();
    });

    when('she presses Sex on that day', async () => {
      await shePresses(logFlowSexRowTestID);
    });

    then('she is on the Sex page of that day', () => {
      expect(screen.getByTestId(sexPageTestID)).toBeTruthy();
      expect(screen.getByTestId(sexPageDayTestID)).toHaveTextContent(sexDayHeading(thatDay));
    });

    when('she goes back to that day and presses Period', async () => {
      await act(() => router.back());
      await shePresses(logFlowPeriodRowTestID);
    });

    then('she is on the Period page of that day', () => {
      expect(screen.getByTestId(periodPageTestID)).toBeTruthy();
      expect(screen.getByTestId(periodPageDayTestID)).toHaveTextContent(periodDayLabel(thatDay));
    });
  });

  test('SCREEN-2, she reads what spotting means on the log and opens other discharge from it', ({
    given,
    when,
    then,
  }) => {
    let app: OpenApp;

    given('her phone holds four recorded period days, the last of them today', async () => {
      jest.setSystemTime(whenSheOpensTheStrip);
      await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensTheStrip);
    });

    when('she opens the log of today', async () => {
      app = await sheOpens('/log');
      await screen.findByTestId(logFlowTestID);
    });

    then('the flow section is called Period, and it says what spotting means', () => {
      expect(screen.getByTestId(logFlowTitleTestID)).toHaveTextContent('Period');
      expect(screen.getByTestId(logFlowSpottingHintTestID)).toHaveTextContent(
        'Spotting: Small traces of blood or brownish discharge',
      );
    });

    when('she presses Other discharge', async () => {
      await shePresses(logFlowOtherDischargeTestID);
      await screen.findByTestId(periodPageTestID);
    });

    then('she is on the Period page of today, where she can pick a discharge', () => {
      expect(app.pathname()).toBe('/period');
      expect(app.searchParams()).toEqual({});
      expect(screen.getByTestId(periodChipTestID('discharge', 'egg-white'))).toBeTruthy();
    });
  });

  test('SCREEN-2, she records discharge and a product on a day', ({ given, when, then }) => {
    const herAnswers = [
      periodChipTestID('discharge', 'egg-white'),
      periodChipTestID('products', 'tampon'),
      periodChipTestID('products', 'liner'),
    ];
    const todayOnHerPhone = (): DayRecord | undefined => {
      const held = readDayLog(herDatabase(), theDaySheOpensIt);

      return held === undefined ? undefined : herVault().open(held.payload);
    };
    let app: OpenApp;
    let flowSheLogged: string | undefined;

    given('her phone holds four recorded period days, the last of them today', async () => {
      jest.setSystemTime(whenSheOpensTheStrip);
      await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensTheStrip);
      flowSheLogged = todayOnHerPhone()?.flow;
    });

    when('she opens the Period page of today', async () => {
      app = await sheOpens(periodAddress());
      await screen.findByTestId(periodPageTestID);
    });

    then('the page shows the flow she logged today, under the date of today', () => {
      expect(flowSheLogged).toEqual(expect.any(String));
      expect(
        screen.getByTestId(periodChipTestID('flow', flowSheLogged ?? '')).props.accessibilityState,
      ).toEqual({ selected: true });
      expect(screen.getByTestId(periodPageDayTestID).props.children).toMatch(
        new RegExp(`, ${Number(theDaySheOpensIt.slice(8, 10))} [A-Z][a-z]+$`),
      );
    });

    when('she presses Egg white, Tampon and Liner, and saves', async () => {
      for (const answer of herAnswers) {
        await shePresses(answer);
      }
      await shePresses(periodPageSaveTestID);
    });

    then(
      'her phone holds that discharge and both products on today, sealed, beside the flow she logged',
      () => {
        const held = readDayLog(herDatabase(), theDaySheOpensIt);

        expect(new TextDecoder().decode(held?.payload)).not.toContain('egg-white');
        expect(todayOnHerPhone()).toMatchObject({
          flow: flowSheLogged,
          discharge: 'egg-white',
          products: ['tampon', 'liner'],
        });
      },
    );

    when('she opens the Period page of today again', async () => {
      expect(app.pathname()).toBe('/');
      await act(() => router.push(periodAddress()));
      await screen.findByTestId(periodPageTestID);
    });

    then('the discharge and the two products she saved are filled', () => {
      for (const answer of herAnswers) {
        expect(screen.getByTestId(answer).props.accessibilityState).toEqual({ selected: true });
      }
    });
  });

  test('SCREEN-2, she answers the signs of ovulation popup on a day inside her fertile window', ({
    given,
    when,
    then,
    and,
  }) => {
    const theDay = dayOf(whenSheOpensTheStrip);
    const herCycle = 28;
    // Today is day 12 of a 28 day cycle, the third period a cycle apart, so Emi has a forecast.
    const herStarts = [2, 1, 0].map((back) => addDays(theDay, -11 - back * herCycle));
    const herSigns = [
      ovulationSignTestID('egg-white-discharge'),
      ovulationSignTestID('higher-sex-drive'),
    ];

    given(
      'her phone holds three periods a cycle apart, and today is inside her forecast fertile window',
      async () => {
        jest.setSystemTime(whenSheOpensTheStrip);
        await herPhoneHolds(whenSheOpensTheStrip, herStarts.map(aBleedingDay), herCycle, 5);
      },
    );

    when('she opens Today', async () => {
      await sheOpens('/');
      await screen.findByTestId(homeScreenTestID);
    });

    then(
      'a sheet over Today asks whether she noticed any signs of ovulation, under the dates of her fertile window',
      () => {
        const window = theFertileWindowOn(
          {
            cycles: listCycles(herDatabase()),
            records: recordedDays(herDatabase(), herVault().open),
            today: theDay,
            statedCycleLengthDays: herCycle,
            statedPeriodLengthDays: 5,
          },
          theDay,
        );

        expect(window).toBeDefined();
        expect(theDay >= String(window?.from) && theDay <= String(window?.to)).toBe(true);
        expect(screen.getByTestId(ovulationPopupTestID)).toBeTruthy();
        expect(screen.getByText('Did you notice any signs of ovulation?')).toBeTruthy();
        expect(screen.getByTestId(ovulationPopupWindowTestID)).toHaveTextContent(
          new RegExp(`^Fertile window, ${Number(window?.from.slice(8, 10))} `),
        );
      },
    );

    and('Nothing yet is the first choice on the sheet', () => {
      const firstChoice = screen
        .getAllByTestId(/^ovulation-popup-/)
        .map((element) => String(element.props.testID))
        .find((testID) => ovulationSignValues.map(ovulationSignTestID).includes(testID));

      expect(firstChoice).toBe(ovulationSignTestID('nothing-yet'));
    });

    and('Save waits until she picks a sign', () => {
      expect(screen.getByTestId(ovulationPopupSaveTestID).props.accessibilityState).toMatchObject({
        disabled: true,
      });
    });

    when('she presses Egg white discharge and Higher sex drive, and saves', async () => {
      for (const sign of herSigns) {
        await shePresses(sign);
      }
      await shePresses(ovulationPopupSaveTestID);
    });

    then('her phone holds those two signs on today, sealed, with the popup marked answered', () => {
      const held = readDayLog(herDatabase(), theDay);

      expect(new TextDecoder().decode(held?.payload)).not.toContain('higher-sex-drive');
      expect(held === undefined ? undefined : herVault().open(held.payload)).toMatchObject({
        ovulationSigns: ['egg-white-discharge', 'higher-sex-drive'],
        ovulationPopup: 'answered',
      });
    });

    and('the sheet is gone and she is on Today', () => {
      expect(screen.queryByTestId(ovulationPopupTestID)).toBeNull();
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    when('she opens Today again the same day', async () => {
      await sheOpens('/');
      await screen.findByTestId(homeScreenTestID);
    });

    then('the sheet does not show again', () => {
      expect(screen.queryByTestId(ovulationPopupTestID)).toBeNull();
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

    then(
      'under the ring she reads three round actions, Sex, Period and Cycle phase, in the order the board places them',
      () => {
        expect(app.pathname()).toBe('/');
        // The order and the count come off the todayPhases board, so a fourth action fails here
        // and the failure names the number the board places.
        expect(partsMissing(theScreenDownToTheRoundActions(), whatTheScreenSheOpensDrew())).toEqual(
          theStripTheCalendarReplaced,
        );
        expect(roundActionProblems()).toEqual([]);
        expect(theRoundActionsOnTheGlass()).toEqual([
          roundActionTestID('sex'),
          roundActionTestID('period'),
          roundActionTestID('phase'),
        ]);
        expect(screen.getByText('Sex')).toBeTruthy();
        expect(screen.getByText('Cycle phase')).toBeTruthy();

        const drawn = whatTheScreenSheOpensDrew();

        for (const action of theRoundActionsOnTheGlass()) {
          expect(drawn.indexOf(action)).toBeGreaterThan(drawn.indexOf(cycleRingTestID));
          expect(drawn.indexOf(action)).toBeLessThan(drawn.indexOf(homeForecastTestID));
        }
      },
    );

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

    and('there is no Symptoms action under the ring', () => {
      // Named as the string it was drawn under, because the name left the product with it.
      expect(screen.queryByTestId('home-round-action-symptoms')).toBeNull();
      expect(screen.queryByText('Symptoms')).toBeNull();
    });

    and('pressing Sex puts her on the Sex page of today', async () => {
      await shePresses(roundActionTestID('sex'));

      expect(app.pathname()).toBe('/sex');
      expect(screen.getByTestId(sexPageTestID)).toBeTruthy();
      expect(screen.getByTestId(sexPageDayTestID)).toHaveTextContent(
        sexDayHeading(dayOf(whenSheOpensTheStrip)),
      );
      await act(() => router.back());
    });

    and('pressing Period puts her on the Period page of today', async () => {
      await shePresses(roundActionTestID('period'));

      expect(app.pathname()).toBe('/period');
      expect(screen.getByTestId(periodPageTestID)).toBeTruthy();
      expect(screen.getByTestId(periodPageDayTestID)).toHaveTextContent(
        periodDayLabel(dayOf(whenSheOpensTheStrip)),
      );
      expect(screen.queryByTestId(flowPickerTestID)).toBeNull();
      await act(() => router.back());
    });

    and('pressing Cycle phase puts her on the Cycle phase page', async () => {
      await shePresses(roundActionTestID('phase'));

      expect(app.pathname()).toBe('/phase');
      expect(screen.getByTestId(phasePageTestID)).toBeTruthy();
      await act(() => router.back());
    });

    and('the dock still reaches the history and the privacy screen', async () => {
      await shePresses(tabTestID('history'));

      expect(app.pathname()).toBe('/history');

      await shePresses(tabTestID('settings/index'));

      expect(app.pathname()).toBe('/settings');
      expect(screen.getByTestId(settingsExportTestID)).toBeTruthy();
    });
  });

  test('SCREEN-2, the Cycle phase page opens the log on the groups and the dock still opens on the flows', ({
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

    and('the log draws a tile for each symptom group, and lists no symptom', () => {
      for (const group of symptomGroups) {
        expect(screen.getByTestId(groupTileTestID(group))).toBeTruthy();
      }
      expect(screen.queryAllByTestId(/^symptom-chip-/)).toHaveLength(0);
    });

    when(
      'she goes back to Today, and presses Cycle phase, and then All symptoms in its diary',
      async () => {
        await shePresses(tabTestID('index'));
        await sheOpensTheSymptomGroupsFromToday();
      },
    );

    then('she is on the log, and the first thing she can mark there is a symptom', () => {
      expect(app.pathname()).toBe('/log');
      expect(theLogProblems(theDrawingOfTheSymptoms)).toEqual([]);
      expect(app.searchParams()[opensOnParameter]).toBe(theSymptoms);
    });

    and('the groups she sees first are open, and no other group', () => {
      expect(theGroupsTheLogDrew()).toEqual(theGroupsSheSeesFirst([]).map(symptomGroupTestID));
      expect(theGroupsTheLogDrew().length).toBeLessThan(symptomGroups.length);
    });

    and('the search finds a symptom of a group that is not open', async () => {
      await fireEvent.changeText(screen.getByTestId(symptomSearchTestID), 'insom');

      expect(screen.getByTestId(symptomChipTestID('insomnia'))).toBeTruthy();

      await fireEvent.changeText(screen.getByTestId(symptomSearchTestID), '');
    });

    and('the drawing of that screen places a symptom group, and places no flow picker', () => {
      expect(whatTheDrawingOpensOn(theDrawingOfTheSymptoms)).toBe('symptoms');
      expect(theDrawingPlaces(theDrawingOfTheSymptoms, 'symptoms')).toBe(true);
      expect(theDrawingPlaces(theDrawingOfTheSymptoms, 'flow')).toBe(false);
      expect(theFlowPickerIsOnTheLog()).toBe(false);
    });

    when('she closes the symptoms and presses the Log column of the dock', async () => {
      await shePresses(logHeaderLeaveTestID);
      await shePresses(tabTestID('log/index'));
    });

    then('the log opens on the flow options again', () => {
      expect(app.pathname()).toBe('/log');
      expect(screen.queryByTestId(logSymptomsTestID)).toBeNull();
      expect(theLogProblems(theDrawingOfTheFlow)).toEqual([]);
      expect(theFlowPickerIsOnTheLog()).toBe(true);
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
      ).toEqual(theStripTheCalendarReplaced);
    });

    when('she presses Cycle phase, and then All symptoms in its diary', async () => {
      await sheOpensTheSymptomGroupsFromToday();

      expect(app.pathname()).toBe('/log');
    });

    and('she marks the two symptoms the drawing names', async () => {
      for (const slug of theSymptomsTheDrawingNames()) {
        await shePresses(symptomChipTestID(slug));
      }
    });

    and('she presses Save, under the count of what she picked', async () => {
      expect(screen.getByTestId(logSymptomsCountTestID)).toBeTruthy();
      await shePresses(logSymptomsSaveTestID);
    });

    then('she is back on the screen she started on', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    and('under the day of her cycle she reads that she logged today', () => {
      const drawn = whatTheScreenSheOpensDrew();

      expect(theRowIsOnTheScreen()).toBe(true);
      expect(theRowSheReads().lead).toBe(homeCopy.loggedToday.lead);
      expect(drawn.indexOf(loggedTodayTestID)).toBeGreaterThan(drawn.indexOf(phaseCardTestID));
      expect(drawn.indexOf(loggedTodayTestID)).toBeGreaterThan(drawn.indexOf(cycleRingTestID));
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
      ).toEqual(theStripTheCalendarReplaced);
    });

    and('pressing what she logged opens the log on the symptom groups again', async () => {
      await shePresses(loggedTodayTestID);

      expect(app.pathname()).toBe('/log');
      expect(app.searchParams()[opensOnParameter]).toBe(theSymptoms);
      expect(theLogProblems(theDrawingOfTheSymptoms)).toEqual([]);
    });
  });

  test('SCREEN-2, she reads Emi in Russian, records fatigue, and the screen she started on names it in Russian', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given(
      'her phone reads Russian, and holds the period days behind today and nothing at all for today',
      async () => {
        const [phone] = Localization.getLocales();

        if (phone === undefined) {
          throw new Error('the phone names no language');
        }

        // The phone is asked once and the answer is kept, so one reading carries the scenario and
        // the hook after it forgets the answer.
        jest
          .spyOn(Localization, 'getLocales')
          .mockReturnValueOnce([{ ...phone, languageTag: 'ru-RU', languageCode: 'ru' }]);
        forgetLanguage();
        expect(readingLanguage()).toBe('ru');
        jest.setSystemTime(whenSheOpensTheStrip);
        await herPhoneHoldsNothingForToday(whenSheOpensTheStrip);
      },
    );

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she presses Cycle phase, and then All symptoms in its diary', async () => {
      await sheOpensTheSymptomGroupsFromToday();

      expect(app.pathname()).toBe('/log');
    });

    and('she marks fatigue', async () => {
      await shePresses(symptomChipTestID('fatigue'));
    });

    and('she presses Save, under the count of what she picked', async () => {
      expect(screen.getByTestId(logSymptomsCountTestID)).toBeTruthy();
      await shePresses(logSymptomsSaveTestID);
    });

    then('she is back on the screen she started on', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    and('the line under the day of her cycle names усталость, and no English name', () => {
      const line = theRowSheReads().line;

      expect(line).toBe('Усталость');
      expect(line).not.toMatch(/fatigue/i);
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
      // The cycle days come off the drawing rather than off this file, up to her next forecast
      // period, where issue 270 starts the count again at 1.
      expect(theMonthSheReadsBack().map((square) => square.cycleDay)).toEqual(
        theCycleDaysAfterIssue270(),
      );
      expect(theSquaresCountingTheirCycleDayBelowTheDate()).toEqual([]);
    });

    and(
      'every one of those before her next forecast period is the day the ring says for that date',
      () => {
        const before = theSquaresTheMonthDrew().filter(
          (day) => day < theDayHerNextPeriodIsForecastOn(),
        );

        expect(before.map((day) => theCycleDayOver(day))).toEqual(
          before.map((day) => theDayTheRingSaysOn(day)),
        );
        expect(before.length).toBeGreaterThan(7);
      },
    );

    and('the count starts again at 1 on the day the forecast puts her next period on', () => {
      const restart = theDayHerNextPeriodIsForecastOn();

      expect(theCycleDayOver(restart)).toBe(1);
      expect(theCycleDayOver(addDays(restart, 1))).toBe(2);
    });

    and('the days she bled are filled', () => {
      expect(theDaysTheDrawingFills().map((day) => theMarkOnTheSquare(day))).toEqual(
        theDaysTheDrawingFills().map(() => 'bled'),
      );
      expect(theDaysTheDrawingFills().length).toBeGreaterThan(1);
    });

    and('the days the forecast puts her next period on are dashed rings', () => {
      expect(theDaysOfHerNextForecastPeriod().map((day) => theMarkOnTheSquare(day))).toEqual(
        theDaysOfHerNextForecastPeriod().map(() => 'forecast'),
      );
      expect(theMarkOnTheSquare(addDays(theDayHerNextPeriodIsForecastOn(), -1))).toBe('plain');
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

  test('SCREEN-4, she reaches a month from the screen she opens by pressing the calendar button', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;
    let theMonthSheReached: string;

    given('her phone holds three recorded cycles', async () => {
      jest.setSystemTime(whenSheOpensTheMonth());
      await herPhoneHoldsThreeRecordedCycles(whenSheOpensTheMonth());
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    then('the calendar button in the top bar is at least 44 points on both axes', () => {
      expect(app.pathname()).toBe('/');
      expect(theCalendarButtonTooSmallToPress()).toEqual([]);
      expect(MINIMUM_TAP_TARGET).toBe(44);
    });

    and('it is named the calendar for somebody listening, as a button', () => {
      expect(theCalendarButton().props.accessibilityLabel).toBe(homeCopy.calendar);
      expect(screen.getByTestId(homeCalendarTestID).props.accessibilityRole).toBe('button');
    });

    and('the dock still holds the four columns it held, and nothing else', () => {
      expect(theColumnsOfTheDock()).toEqual(tabs.map((tab) => tabTestID(tab.name)));
      expect(theColumnsOfTheDock()).toHaveLength(4);
    });

    when('she presses the calendar button', async () => {
      await shePresses(homeCalendarTestID);
    });

    then('she is reading the month today falls in', () => {
      const today = dayOf(whenSheOpensTheMonth());

      expect(app.pathname()).toBe('/calendar');
      expect(app.searchParams()[dayParameter]).toBe(today);
      expect(theMonthSheReads()).toBe(monthLabel(startOfMonth(today)));
      theMonthSheReached = theMonthSheReads();
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

    then('she is on the screen she opened, and no strip of seven days is drawn on it', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(whatIsLeftOfTheStrip()).toEqual([]);
    });

    and('pressing the calendar button again reaches the same month', async () => {
      await shePresses(homeCalendarTestID);

      expect(app.pathname()).toBe('/calendar');
      expect(theMonthSheReads()).toBe(theMonthSheReached);
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

    then('the card at the foot names today, because she has pressed no day', () => {
      expect(app.pathname()).toBe('/calendar');
      expect(theSheetSheReads()?.lead).toContain(
        `${weekdayOf(theDaySheOpensTheMonth())}, ${Number(theDaySheOpensTheMonth().slice(8, 10))}`,
      );
    });

    when('she presses the day the drawing names', async () => {
      theCycleDayBeforeSheChangedIt = theCycleDayOver(theDaySheOpens);
      await shePresses(dayTestID(theDaySheOpens));
    });

    then('a card at the foot names that date in words', () => {
      const sheet = theSheetSheReads();

      expect(sheet?.lead).toContain(`, ${Number(theDaySheOpens.slice(8, 10))} `);
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

    and('that is the month the drawing names, down to the card', () => {
      expect(partsMissing(theMonthAndItsSheetOfTheDrawing(), whatTheMonthScreenDrew())).toEqual([]);
      expect(theMonthSheReads()).toContain(theMonthTheDrawingNames());
      expect(theDatesTheMonthDrew()).toEqual(theDatesOfTheDrawing());
    });

    when('she presses the open button on the card', async () => {
      await shePresses(daySheetOpenTestID);
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

    then('she is reading the month again, and the card names the flow she just picked', () => {
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

      expect(sheet?.lead).toContain(`, ${Number(String(another).slice(8, 10))} `);
      expect(sheet?.lead).not.toContain(`, ${Number(theDaySheOpens.slice(8, 10))} `);
    });
  });

  test('SCREEN-4, a day that has not happened yet is a forecast in the month and refused at its address', ({
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

    then(
      'she is still reading the month, and the card names that day with when her next period is likely to start',
      () => {
        expect(app.pathname()).toBe('/calendar');
        expect(theSheetSheReads()?.lead).toContain(`, ${Number(aheadOfHer.slice(8, 10))} `);
        expect(theSheetSheReads()?.line).toMatch(/^Your next period is likely to start between /);
      },
    );

    and('the card offers no way into that day, and the square is not faint', () => {
      const square = theSquareSheSees(aheadOfHer);

      expect(screen.queryByTestId(daySheetOpenTestID)).toBeNull();
      expect(square.dimmed).toBe(false);
      expect(square.saidToTakeNoPress).toBe(false);
      expect(square.spoken).not.toContain(words('cycle.day.notYet'));
    });

    and('a day she already lived still takes a press and names itself at the foot', async () => {
      const behindHer = theDaysTheDrawingFills()[0];

      expect(behindHer).toBeDefined();
      expect(theSquareSheSees(String(behindHer)).saidToTakeNoPress).toBe(false);
      await shePresses(dayTestID(String(behindHer)));

      expect(theSheetSheReads()?.lead).toContain(`, ${Number(String(behindHer).slice(8, 10))} `);
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

  test('SCREEN-4, she reads her forecast periods in the month ahead', ({
    given,
    when,
    then,
    and,
  }) => {
    let app: OpenApp;
    let theForecastPeriodStarts = '';

    given('her phone holds three recorded cycles', async () => {
      jest.setSystemTime(whenSheOpensTheMonth());
      await herPhoneHoldsThreeRecordedCycles(whenSheOpensTheMonth());
    });

    when('she opens the month', async () => {
      app = await sheOpens('/calendar');
    });

    and('she presses the way to a later month', async () => {
      await shePresses(calendarLaterTestID);

      expect(theMonthSheReads()).toBe(monthLabel(theMonthAfterSheOpens()));
    });

    then(
      'the forecast period in that month is drawn in dashed rings, and its cycle day starts at 1',
      () => {
        const inThatMonth = theCyclesAheadOfHer().find(
          (cycle) => startOfMonth(cycle.startsOn) === theMonthAfterSheOpens(),
        );

        expect(inThatMonth).toBeDefined();
        theForecastPeriodStarts = String(inThatMonth?.startsOn);

        expect(theCycleDayOver(theForecastPeriodStarts)).toBe(1);
        expect(theMarkOnTheSquare(theForecastPeriodStarts)).toBe('forecast');
        expect(theMarkOnTheSquare(addDays(theForecastPeriodStarts, -1))).toBe('plain');
      },
    );

    and(
      'the fertile window of that forecast cycle is tinted, with its ovulation day filled',
      () => {
        const days = theSquaresTheMonthDrew();
        const tinted = days.filter((day) => thePhaseGroundOn(day) === colour.washWarm);
        const filled = days.filter((day) => thePhaseGroundOn(day) === colour.ovulation);

        expect(tinted.length).toBeGreaterThan(0);
        expect(filled.length).toBeGreaterThan(0);
      },
    );

    when('she presses the first day of that forecast period', async () => {
      await shePresses(dayTestID(theForecastPeriodStarts));
    });

    then('the card says a later period is likely to start between that day and a later one', () => {
      const inThatMonth = theCyclesAheadOfHer().find(
        (cycle) => cycle.startsOn === theForecastPeriodStarts,
      );
      const range = inThatMonth?.mayStart;

      expect(app.pathname()).toBe('/calendar');
      expect(range).toBeDefined();
      expect(theSheetSheReads()?.line).toContain('A later period is likely to start between');
      expect(theSheetSheReads()?.line).toContain(String(Number(String(range?.from).slice(8, 10))));
      expect(range?.from).toBe(theForecastPeriodStarts);
      expect(String(range?.to) > theForecastPeriodStarts).toBe(true);
    });

    and('the card offers no way into that day', () => {
      expect(screen.queryByTestId(daySheetOpenTestID)).toBeNull();
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
        `, ${Number(aDayOfTheMonthTwoBack.slice(8, 10))} `,
      );
    });

    and('she presses the open button on the card', async () => {
      await shePresses(daySheetOpenTestID);
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

    and('she presses the calendar button in the top bar', async () => {
      await shePresses(homeCalendarTestID);
    });

    then('she is reading the month that day falls in', () => {
      expect(app.pathname()).toBe('/calendar');
      expect(theMonthSheReads()).toBe(monthLabel(theMonthSheCorrects));
    });

    when('she presses the first day of the period Emi holds', async () => {
      await shePresses(dayTestID(String(theDaysEmiHeld[0])));
    });

    and('she presses the way to edit her period', async () => {
      await shePresses(theWayToEditHerPeriod);
    });

    then('she is looking at the period picker, and that is the drawing of it', () => {
      expect(app.pathname()).toBe('/calendar/period');
      expect(sheIsOnThePeriodPicker()).toBe(true);
      expect(partsMissing(thePartsOfTheRangePickerDrawing(), whatTheRangePickerDrew())).toEqual([]);
      expect(theLeadSheReads()).not.toBe('');
    });

    and('the four days Emi holds arrive as hers, and no other listed day does', () => {
      expect(theDaysTickedOnThePicker()).toEqual(theDaysEmiHeld);
    });

    and('somebody listening is told each day is one she can turn on and off', () => {
      for (const day of theDaysEmiHeld) {
        expect(whatSomebodyListeningHearsOn(day)).toEqual({
          checked: true,
          disabled: undefined,
          role: 'checkbox',
        });
      }

      for (const day of theDaysSheAdded) {
        expect(whatSomebodyListeningHearsOn(day)).toEqual({
          checked: false,
          disabled: undefined,
          role: 'checkbox',
        });
      }
    });

    and('no day she has not lived yet is listed', () => {
      expect(theDaysTheListDrew().filter((day) => day > theDaySheOpensEmi())).toEqual([]);
      expect(theDaysTheListDrew().length).toBeGreaterThan(theDaysEmiHeld.length);
    });

    when('she presses the two days her period ran on after that', async () => {
      for (const day of theDaysSheAdded) {
        await shePresses(editPeriodRowTestID(day));
      }

      expect(theDaysTickedOnThePicker()).toEqual([...theDaysEmiHeld, ...theDaysSheAdded].sort());
    });

    and('she presses the day her period did not start on', async () => {
      await shePresses(editPeriodRowTestID(theDaySheTookOff));

      expect(theDaysTickedOnThePicker()).toEqual(theDaysSheIsLeftHolding());
    });

    then('each of those three rows carries its tag, Added or Taken off', () => {
      for (const day of theDaysSheAdded) {
        expect(theTagOn(day)).toBe(editPeriodCopy.added);
      }

      expect(theTagOn(theDaySheTookOff)).toBe(editPeriodCopy.takenOff);
    });

    and('the line under the list names the two days she added and the day she took off', () => {
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

  test('SCREEN-1, the way past the three periods step leaves no date', ({
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

    and(
      'she gives her name and the year she was born, and reaches the step that asks for her last three periods',
      async () => {
        whereSheIsNow();
        await sheReadsTheWelcome();
        whereSheIsNow();
        await fireEvent.changeText(screen.getByTestId(nameFieldTestID), theNameSheGives);
        await shePresses(onboardingActionTestID);
        whereSheIsNow();
        await shePresses(yearTestID(theYearSheWasBornIn));
        await shePresses(onboardingActionTestID);
        whereSheIsNow();

        expect(app.pathname()).toBe('/onboarding/three-periods');
      },
    );

    and('she says she will log as she goes', async () => {
      await shePresses(onboardingWayPastTestID);
      whereSheIsNow();
    });

    then('she is being asked how long her cycle runs', () => {
      expect(app.pathname()).toBe('/onboarding/cycle-length');
      expect(screen.getByTestId('onboarding-cycleLength')).toBeTruthy();
    });

    and('the counter reads step 5 of 12, one step for her last three periods', () => {
      expect(screen.getByTestId(onboardingProgressTestID).props.accessibilityValue).toMatchObject({
        max: theStepsOfTheFirstRun,
        now: theCycleLengthIsStepFive,
      });
      // The total is counted off the list of screens, so the number written out here is what
      // catches a question quietly leaving the run.
      expect(firstRunScreenCount).toBe(theStepsOfTheFirstRun);
    });

    when('she answers the rest of the questions and taps Save and start', async () => {
      await shePresses(cycleLengthDaysTestID(sheSaysHerCycleRuns));

      await shePresses(onboardingActionTestID);
      whereSheIsNow();

      for (let question = 0; question < theQuestionsLeftAfterTheCycleLength; question += 1) {
        await shePassesTheQuestion();
        whereSheIsNow();
      }

      await shePresses(firstForecastActionTestID);
      whereSheIsNow();
      await shePresses(whatEmiDoesActionTestID);
      whereSheIsNow();
      await sheTapsSaveAndStart();
      whereSheIsNow();
    });

    then('she was never asked for a period again, on a step of its own', () => {
      expect(everyScreenSheReached).not.toContain('/onboarding/last-period');
      expect(everyScreenSheReached).not.toContain('/onboarding/period-before');
      expect(
        everyScreenSheReached.filter((path) => path === '/onboarding/three-periods'),
      ).toHaveLength(1);
      // A walk that pressed nothing reaches no period question either, so the screens she did
      // reach are read as well.
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
        expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBe(whenSheSaves.toISOString());
        expect(listDayLogs(herDatabase())).toEqual([]);
        expect(listCycles(herDatabase())).toEqual([]);
      },
    );
  });

  test('SCREEN-1, her newest period is still going, and Emi writes the days up to today', ({
    given,
    when,
    and,
    then,
  }) => {
    const herNewestStarted = addDays(today, -3);
    const theOneBefore = addDays(herNewestStarted, -28);
    const theOneBeforeThat = addDays(herNewestStarted, -56);
    const eachLastedDays = 5;

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    and('she reaches the step that asks for her last three periods', async () => {
      await sheReachesTheThreePeriodsStep();
    });

    and('she gives her newest period, which started three days ago, as still going', async () => {
      await sheGivesAPeriodStillGoing(herNewestStarted);
    });

    then('the row of her newest period says it is still going', () => {
      expect(textIn(screen.getByTestId(pastPeriodRowTestID(0))).join(' ')).toContain('Still going');
    });

    when(
      'she gives the two periods before it, each with the day it started and the days it lasted',
      async () => {
        await sheGivesAPeriod(1, theOneBefore, eachLastedDays);
        await sheGivesAPeriod(2, theOneBeforeThat, eachLastedDays);
        await shePresses(onboardingActionTestID);
      },
    );

    and('she answers the rest of the questions and taps Save and start', async () => {
      await shePresses(cycleLengthDaysTestID(sheSaysHerCycleRuns));
      await shePresses(onboardingActionTestID);

      for (let question = 0; question < theQuestionsLeftAfterTheCycleLength; question += 1) {
        await shePassesTheQuestion();
      }

      await shePresses(firstForecastActionTestID);
      await shePresses(whatEmiDoesActionTestID);
      await sheTapsSaveAndStart();
    });

    then(
      'her phone holds every day from the start of her newest period to today, and the days of the two before it',
      () => {
        const theDaysBefore = [theOneBeforeThat, theOneBefore].flatMap((start) =>
          Array.from({ length: eachLastedDays }, (_unused, at) => addDays(start, at)),
        );
        const theDaysSoFar = [0, 1, 2, 3].map((at) => addDays(herNewestStarted, at));

        expect(
          listDayLogs(herDatabase())
            .map((log) => log.day)
            .sort(),
        ).toEqual([...theDaysBefore, ...theDaysSoFar].sort());
      },
    );

    and('the ring says she is on day 4 of her cycle', () => {
      expect(within(screen.getByTestId(cycleRingTestID)).getByText('Day 4')).toBeTruthy();
    });
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

    and('she reaches the step that asks for her last three periods', async () => {
      await sheReachesTheThreePeriodsStep();

      expect(screen.getByTestId('onboarding-threePeriods')).toBeTruthy();
    });

    and('she says she will log as she goes', async () => {
      expect(screen.getByTestId(onboardingWayPastTestID)).toHaveTextContent(
        'Skip, I will log as I go',
      );
      await shePresses(onboardingWayPastTestID);
    });

    and('she answers the rest of the questions', async () => {
      await shePresses(cycleLengthDaysTestID(sheSaysHerCycleRuns));

      await shePresses(onboardingActionTestID);

      for (let question = 0; question < theQuestionsLeftAfterTheCycleLength; question += 1) {
        await shePassesTheQuestion();
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
        countsFromTheFirstPeriodSentence(sheSaysHerCycleRuns),
      );
      expect(whatItSays(firstForecastLinesTestID)).toContain(String(sheSaysHerCycleRuns));
      expect(whatItSays(firstForecastLinesTestID)).not.toContain(String(defaultCycleLengthDays));
    });

    and(
      'the card says Emi is still learning, how many complete cycles it needs, and why it does not guess',
      () => {
        expect(textIn(screen.getByTestId(firstForecastStillLearningTestID))).toEqual([
          firstRunCopy.firstForecast.stillLearning,
          cyclesBeforeAForecastSentence(CYCLES_BEFORE_A_FORECAST),
          firstRunCopy.firstForecast.noDate.guess,
        ]);
        // The number is the arithmetic's own, read off the answer CYCLE-3 gives her answers.
        const answer = forecastFromHerAnswers({ cycleLengthDays: sheSaysHerCycleRuns });

        expect(answer.kind === 'learning' ? answer.needsCycles : 0).toBe(CYCLES_BEFORE_A_FORECAST);
      },
    );

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
        expect(screen.queryByTestId('onboarding-threePeriods')).toBeNull();
      },
    );

    when('she presses the way on', async () => {
      await shePresses(firstForecastActionTestID);
    });

    then(
      'she is reading what Emi does with what she told it, with no promise step before it',
      () => {
        expect(app.pathname()).toBe('/onboarding/what-emi-does-with-it');
        expect(screen.getByTestId(whatEmiDoesTestID)).toBeTruthy();
        expect(screen.queryByText('Only you can read your days.')).toBeNull();
      },
    );
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

    and(
      'she answers every question of the first run, and says she will log her periods as she goes',
      async () => {
        await sheAnswersEveryQuestionWithNoDate({ cycleLengthDays: sheSaysHerCycleRuns });

        expect(app.pathname()).toBe('/onboarding/hold');
      },
    );

    and('she taps Save and start', async () => {
      await sheTapsSaveAndStart();
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
      expect(theMonthSheReadsBack().map((square) => square.cycleDay)).toEqual(
        theCycleDaysAfterIssue270(),
      );

      for (const day of theSquaresTheMonthDrew()) {
        expect(theDiscAroundTheDate(day).width).toBe(theDiscAroundTheDate(day).height);
      }
    });

    and('the days she bled are filled with the colour of her period', () => {
      expect(theDaysTheDrawingFills().length).toBeGreaterThan(1);

      for (const day of theDaysTheDrawingFills()) {
        expect(thePhaseGroundOn(day)).toBe(colour.period);
        expect(theDateInkOn(day)).toBe(colour.onAccent);
      }
    });

    and('every day of the fertile window the forecast names is tinted', () => {
      // A day she bled is filled over the top of the tint, because what she recorded wins.
      const bled = new Set(theDaysTheDrawingFills());
      const tinted = theFertileDaysTheForecastNames().filter(
        (day) =>
          day !== theOvulationDayTheForecastNames() &&
          day !== theOvulationDayOfTheForecastCycle() &&
          !bled.has(day),
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
      expect(theFertileDaysTheForecastNames()).toContain(ovulation);
      expect(thePhaseGroundOn(ovulation)).toBe(colour.ovulation);
      expect(theDateInkOn(ovulation)).toBe(colour.text);
    });

    and('a legend above the grid names her period, the forecast and her fertile days', () => {
      expect(theLegendSheReads()).toEqual({
        fertile: monthLegendCopy.fertile,
        forecast: monthLegendCopy.forecast,
        period: monthLegendCopy.period,
      });
      expect(theLegendDots().period.fill).toBe(colour.period);
      expect(theLegendDots().forecast.lineStyle).toBe('dashed');
      expect(theLegendDots().fertile.fill).toBe(colour.washWarm);
    });

    when('she presses the day the drawing names', async () => {
      sheWasSentTo = theDayTheDrawingsSheetNames();
      await shePresses(dayTestID(sheWasSentTo));
    });

    then('a card at the foot names that day, over the way to her whole period', () => {
      const held = whatThePanelHolds();

      expect(theSheetSheReads()?.lead).toContain(String(Number(sheWasSentTo.slice(8, 10))));
      expect(held.indexOf(daySheetTestID)).toBeGreaterThanOrEqual(0);
      expect(held.indexOf(daySheetTestID)).toBeLessThan(held.indexOf(calendarEditPeriodTestID));
    });

    and('pressing the open button on that card opens the day it names', async () => {
      await shePresses(daySheetOpenTestID);

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
  test('SCREEN-2, the ring and the top bar take the todayPhases look', ({
    given,
    when,
    then,
    and,
  }) => {
    const herCycle = { cycleLengthDays: 28, dayOfCycle: 2, periodDays: 4 };

    /** What the middle of the ring of Today writes, top to bottom. */
    const theMiddleOfTheRingOfToday = (): string[] =>
      [ringCentrePhaseTestID, ringCentreDayTestID, ringCentreLengthTestID].map((testID) =>
        textIn(screen.getByTestId(testID)).join(''),
      );

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

    when('she opens Emi and reads the ring and the top bar above it', async () => {
      await sheOpens('/');

      expect(screen.getByTestId(cycleRingTestID)).toBeTruthy();
      expect(screen.getByTestId(homeHeaderTestID)).toBeTruthy();
    });

    then(
      'the middle of the ring names her phase, then Day and the day she is on, then about the length of her cycle',
      () => {
        expect(theMiddleOfTheRingOfToday()).toEqual([
          'Period phase',
          ringDayNumberWords(herCycle.dayOfCycle),
          ringAboutLengthWords(herCycle.cycleLengthDays),
        ]);
      },
    );

    and(
      'every arc is painted whole with a square end, and ground still shows at every boundary between two phases',
      () => {
        const ends = theEndsOfTheArcs();
        const ground = theGroundBetweenTheArcs();

        expect(ends.length).toBeGreaterThan(1);
        expect(ends.filter((end) => end !== 'butt')).toEqual([]);

        // Ground first, and the measured width second, because a boundary of no degrees is a
        // change of colour and nothing else.
        expect(ground.length).toBeGreaterThan(1);
        for (const gap of ground) {
          expect(gap).toBeGreaterThan(0);
          expect(gap).toBeCloseTo(GAP_DEGREES, 2);
        }
      },
    );

    and('each phase name is written along its own arc, in the colour measured on that arc', () => {
      const written = phaseNames.filter((phase) => screen.queryByTestId(ringNameTestID(phase)));

      expect(written.length).toBeGreaterThan(0);
      for (const phase of written) {
        expect(theColourDrawn(screen.getByTestId(ringNameTestID(phase)).props.fill)).toBe(
          colour[phaseNameInk[phase]],
        );
      }
    });

    and('the pointer on today has an accent head over a dark stem with a white core', () => {
      expect(thePointerSheSees()).toEqual({
        casing: colour.text,
        core: colour.card,
        head: colour.accent,
        headEdge: colour.card,
      });
    });

    and(
      'the strip of seven days is gone, and the calendar button closes the top bar on the right',
      () => {
        expect(whatIsLeftOfTheStrip()).toEqual([]);
        expect(whatTheHeaderDrew().at(-1)).toBe(homeCalendarTestID);
      },
    );
  });

  test('SCREEN-1, the welcome and the tour say what the redesign says', ({
    given,
    when,
    then,
    and,
  }) => {
    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then(
      'the first thing she reads is the welcome, saying her cycle and how she feels are in one place',
      () => {
        const welcome = within(screen.getByTestId('onboarding-welcome'));

        expect(welcome.getByText('Your cycle and how you feel, in one place.')).toBeTruthy();
        expect(screen.queryByTestId(tourScreenTestID)).toBeNull();
      },
    );

    and(
      'the welcome says what she can log, that there is no account, what Emi is not, and that her records can help at a doctor',
      () => {
        const welcome = within(screen.getByTestId('onboarding-welcome'));

        expect(
          welcome.getByText('Log your periods and how you feel, to understand your cycle better.'),
        ).toBeTruthy();
        expect(welcome.queryByText('Your cycle is worked out on this phone.')).toBeNull();
        expect(
          welcome.getByText(
            'There is no account. Emi never asks for your email address or a password.',
          ),
        ).toBeTruthy();
        expect(
          welcome.getByText(
            "Emi does not replace a doctor's advice. Emi is not a contraceptive. Emi is not a medical device. Emi does not make diagnoses, but your records can help when you see a doctor.",
          ),
        ).toBeTruthy();
      },
    );

    and(
      'the tour after it draws the ring with its legend, says what the ring is, and names the price',
      async () => {
        await shePresses(onboardingActionTestID);

        const tour = within(screen.getByTestId(tourScreenTestID));

        expect(tour.getByTestId(cycleRingTestID)).toBeTruthy();
        for (const word of ['Period', 'After it', 'Ovulation', 'Before the next']) {
          expect(tour.getByText(word)).toBeTruthy();
        }
        expect(tour.getByText('Your cycle, in one ring.')).toBeTruthy();
        for (const line of tourCopy.lines) {
          expect(tour.getByText(line)).toBeTruthy();
        }
        expect(tour.getByText('One month free, then 29.99 pounds a year.')).toBeTruthy();
      },
    );

    and(
      'the welcome and the tour are in her own language, and say no word a screen refuses',
      () => {
        const english = theWordsOfTheFirstOpenIn('en');

        for (const language of languages) {
          const said = theWordsOfTheFirstOpenIn(language);

          if (language !== 'en') {
            expect({ language, same: said.filter((line) => english.includes(line)) }).toEqual({
              language,
              same: [],
            });
          }

          const claims = interfaceClaimsIn(
            `the welcome and the tour in ${language}`,
            said.join('\n'),
          );

          expect(claims.map(describeClaim)).toEqual([]);
        }

        expect(languages.length).toBe(3);
      },
    );
  });

  /**
   * The first run as a conversation. The name she typed comes back at the question after it, a
   * woman who gave none reads a clean question, and an answer she gives is answered where she
   * gave it.
   */
  test('SCREEN-1, the first run asks her name and then the year she was born', ({
    given,
    when,
    then,
    and,
  }) => {
    const theQuestionAfterHerName = `Nice to meet you, ${theNameSheGives}. What year were you born?`;
    const theSameQuestionWithNoName = 'What year were you born?';
    const theOldReplyToACycleThatMoves =
      "That's common. We'll start with a wider range and narrow it as we learn yours.";

    /** The keys of the padlock lines the first run drew, which no language holds any more. */
    const theKeysOfTheOldPadlockLines: readonly string[] = [
      'onboarding.encryptedHere',
      'onboarding.encryptsIt',
      'onboarding.encryptsYourAnswers',
      'onboarding.reminder.promise',
    ];

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
      await sheReachesTheThreePeriodsStep();
      await sheGivesAPeriod(0, herPeriodStarted);
      await shePresses(onboardingActionTestID);
      await shePresses(cycleLengthDaysTestID(defaultCycleLengthDays));
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingWayPastTestID);
    }

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi, reads the welcome, skips the tour, and gives her name', async () => {
      app = await sheOpens('/');
      await sheSkipsTheTour();
      await fireEvent.changeText(screen.getByTestId(nameFieldTestID), theNameSheGives);
      await shePresses(onboardingActionTestID);
    });

    then('the question after it asks the year plainly, as the redesign draws it', () => {
      expect(app.pathname()).toBe('/onboarding/year-of-birth');
      expect(theQuestionSheIsReading()).toBe(theSameQuestionWithNoName);
      expect(screen.queryByText(theQuestionAfterHerName)).toBeNull();
    });

    and(
      'a woman who gives no name reads the same question, with no gap where a name would be',
      async () => {
        await anotherWomanOpensEmi();
        await shePresses(onboardingSkipTestID);

        expect(app.pathname()).toBe('/onboarding/year-of-birth');
        expect(theQuestionSheIsReading()).toBe(theSameQuestionWithNoName);
        expect(screen.queryByText(theQuestionAfterHerName)).toBeNull();
      },
    );

    and(
      'picking that her cycle moves around marks that answer and says nothing back, as the redesign draws it',
      async () => {
        await anotherWomanOpensEmi();
        await sheReachesTheQuestionAboutARegularCycle();

        expect(app.pathname()).toBe('/onboarding/regularity');

        await shePresses(regularityTestID('moves'));

        expect(screen.getByTestId(regularityTestID('moves'))).toBeChecked();
        expect(screen.queryByText(theOldReplyToACycleThatMoves)).toBeNull();
        expect(screen.getByText(firstRunCopy.regularity.lines[0] ?? '')).toBeTruthy();
      },
    );

    and(
      'no question of the first run draws a lock, and the sentences it drew are gone from all three languages',
      async () => {
        for (const language of languages) {
          const held = Object.keys(catalogueOf(language));

          expect({
            language,
            held: theKeysOfTheOldPadlockLines.filter((key) => held.includes(key)),
          }).toEqual({ language, held: [] });
        }

        expect(languages.length).toBe(3);

        // The round trip the catalogue cannot prove on its own: she walks the same five questions
        // that drew a padlock line, and none of them draws a lock now.
        await anotherWomanOpensEmi();

        expect(locksDrawnIn(screen.root)).toBe(0);

        await shePresses(onboardingSkipTestID);

        expect(locksDrawnIn(screen.root)).toBe(0);

        await shePresses(onboardingSkipTestID);

        expect(locksDrawnIn(screen.root)).toBe(0);

        await sheGivesAPeriod(0, herPeriodStarted);
        await shePresses(onboardingActionTestID);
        await shePresses(cycleLengthDaysTestID(defaultCycleLengthDays));
        await shePresses(onboardingActionTestID);
        await shePresses(onboardingWayPastTestID);
        await shePresses(onboardingSkipTestID);

        expect(app.pathname()).toBe('/onboarding/feeling');
        expect(locksDrawnIn(screen.root)).toBe(0);

        await shePresses(onboardingSkipTestID);

        expect(app.pathname()).toBe('/onboarding/goals');
        expect(locksDrawnIn(screen.root)).toBe(0);
      },
    );
  });
  test('SCREEN-1, a name she typed is kept when she presses Skip, and the home screen greets her by it', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('she has never opened Emi before', () => undefined);

    when(
      'she opens Emi, reads the welcome, skips the tour, types her name, and presses Skip',
      async () => {
        app = await sheOpens('/');
        await sheSkipsTheTour();
        await fireEvent.changeText(screen.getByTestId(nameFieldTestID), theNameSheGives);
        await shePresses(onboardingSkipTestID);
      },
    );

    and('she passes every other question she may pass, and taps Save and start', async () => {
      await shePresses(onboardingSkipTestID);
      await sheGivesAPeriod(0, herPeriodStarted);
      await shePresses(onboardingActionTestID);
      await shePresses(cycleLengthDaysTestID(defaultCycleLengthDays));
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingWayPastTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(firstForecastActionTestID);
      await shePresses(whatEmiDoesActionTestID);
      await sheTapsSaveAndStart();
    });

    then('the home screen greets her by the name she typed', () => {
      expect(app.pathname()).toBe('/');
      expect(whatItSays(homeGreetingTestID)).toBe(`Hello, ${theNameSheGives}`);
    });
  });

  /**
   * Three lines a woman asked for: why the year is asked, what a regular cycle is, and what the
   * ovulation goal does not promise. Each is written out here, so a reword fails the scenario.
   */
  test('SCREEN-1, the first run says why it asks her year, what a regular cycle is, and that ovulation dates are approximate', ({
    given,
    when,
    then,
    and,
  }) => {
    const theYearLine =
      'Emi does not use your year of birth for anything today. You can skip this question.';
    const theRegularHint = 'Your period starts after about the same number of days each time.';
    const theOvulationNote = 'Dates are approximate. Emi is not a contraceptive.';
    const theNoteInEachLanguage: Readonly<Record<Language, string>> = {
      en: theOvulationNote,
      es: 'Las fechas son aproximadas. Emi no es un anticonceptivo.',
      ru: 'Даты примерные. Emi не является средством контрацепции.',
    };

    let app: OpenApp;

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi, reads the welcome, skips the tour, and skips her name', async () => {
      app = await sheOpens('/');
      await sheSkipsTheTour();
      await shePresses(onboardingSkipTestID);
    });

    then(
      'the year question says Emi does not use her year of birth today, and that she can skip it',
      () => {
        expect(app.pathname()).toBe('/onboarding/year-of-birth');
        expect(screen.getByTestId(onboardingLinesTestID)).toHaveTextContent(theYearLine);
      },
    );

    and(
      'the question about a regular cycle says what regular means, and the first answer says it in the same words',
      async () => {
        await shePresses(onboardingSkipTestID);
        await sheGivesAPeriod(0, herPeriodStarted);
        await shePresses(onboardingActionTestID);
        await shePresses(cycleLengthDaysTestID(defaultCycleLengthDays));
        await shePresses(onboardingActionTestID);
        await shePresses(onboardingWayPastTestID);

        expect(app.pathname()).toBe('/onboarding/regularity');
        expect(screen.getByTestId(onboardingQuestionTestID)).toHaveTextContent(theRegularHint);
        expect(screen.getByTestId(regularityTestID('regular'))).toHaveTextContent(
          'Yes, after about the same number of days',
        );
        expect(screen.queryByText('Yes, most months')).toBeNull();
      },
    );

    and(
      'the question about her goals offers to track how she feels and to track ovulation, and carries the note that the dates are approximate',
      async () => {
        await shePresses(onboardingSkipTestID);
        await shePresses(onboardingSkipTestID);

        expect(app.pathname()).toBe('/onboarding/goals');
        expect(screen.getByTestId(goalTestID('symptoms'))).toHaveTextContent('Track how I feel');
        expect(screen.getByTestId(goalTestID('fertileWindow'))).toHaveTextContent(
          'Track ovulation',
        );
        expect(screen.getByTestId(onboardingLinesTestID)).toHaveTextContent(theOvulationNote);
        expect(screen.queryByText('See my fertile window, as an estimate')).toBeNull();
      },
    );

    and(
      'the three lines are written in all three languages, and each ovulation note keeps the approved denial',
      () => {
        for (const language of languages) {
          const held: Readonly<Record<string, unknown>> = Object.fromEntries(
            Object.entries(catalogueOf(language)),
          );

          for (const key of [
            'onboarding.birthYear.line.why',
            'onboarding.regularity.line.sameDays',
            'onboarding.goals.line.ovulation',
          ]) {
            expect({ language, key, written: String(held[key] ?? '').length > 0 }).toEqual({
              language,
              key,
              written: true,
            });
          }

          expect(String(held['onboarding.goals.line.ovulation'])).toBe(
            theNoteInEachLanguage[language],
          );
        }

        expect(languages.length).toBe(3);
      },
    );
  });
  /**
   * The forecast is the first thing Emi says back to her, so it says it to her: the name she
   * typed at the second question opens the sentence, and a woman who gave none reads a clean one.
   * The three screens between it and the hold speak in the name of Emi and never as we.
   */
  test('SCREEN-1, her first forecast reads the redesign label, and the screens after it speak in the name of Emi', ({
    given,
    when,
    then,
    and,
  }) => {
    const theTitleOfHerForecast = {
      theOldGreeting: `${theNameSheGives}, here's your next period`,
      plain: 'Your period may start',
    };
    const theTitleOfWhatEmiDoes = {
      now: 'Your settings in Emi',
      theOldGreeting: `${theNameSheGives}, here's what we'll do with your answers`,
    };
    const theSaveNowSays = 'Your cycle, your data, your key.';

    /** The keys of the three screens from the forecast to Save and start, in every language. */
    const theseScreens: readonly string[] = [
      'onboarding.firstForecast.',
      'onboarding.whatEmiDoes.',
      'onboarding.start.',
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
     * The twelve questions after the welcome, with her last period answered and the rest passed,
     * which leaves her standing on the forecast rather than on the hold.
     */
    async function sheAnswersEverythingAndReachesHerForecast(name?: string): Promise<void> {
      if (name === undefined) {
        await shePresses(onboardingSkipTestID);
      } else {
        await fireEvent.changeText(screen.getByTestId(nameFieldTestID), name);
        await shePresses(onboardingActionTestID);
      }

      await shePresses(onboardingSkipTestID);
      await sheGivesAPeriod(0, herPeriodStarted);
      await shePresses(onboardingActionTestID);
      await shePresses(cycleLengthDaysTestID(defaultCycleLengthDays));
      await shePresses(onboardingActionTestID);

      for (let question = 0; question < theQuestionsLeftAfterTheCycleLength; question += 1) {
        await shePassesTheQuestion();
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

    when(
      'she opens Emi, reads the welcome, skips the tour, gives her name, and answers every question',
      async () => {
        app = await sheOpens('/');
        await sheSkipsTheTour();
        await sheAnswersEverythingAndReachesHerForecast(theNameSheGives);
      },
    );

    then(
      'the forecast she reads is labelled Your period may start, so the dates read as when it may start, and no longer greets her by name',
      () => {
        expect(app.pathname()).toBe('/onboarding/first-forecast');
        expect(theTitleSheIsReading(firstForecastTitleTestID)).toEqual([
          theTitleOfHerForecast.plain,
        ]);
        expect(screen.queryByText(theTitleOfHerForecast.theOldGreeting)).toBeNull();
      },
    );

    and(
      'a woman who gave no name reads the same forecast, with no gap where a name would be',
      async () => {
        await anotherWomanOpensEmi();
        await sheAnswersEverythingAndReachesHerForecast();

        expect(app.pathname()).toBe('/onboarding/first-forecast');
        expect(theTitleSheIsReading(firstForecastTitleTestID)).toEqual([
          theTitleOfHerForecast.plain,
        ]);
        expect(screen.queryByText(theTitleOfHerForecast.theOldGreeting)).toBeNull();
      },
    );

    and(
      'the screen that reads her answers back is titled in the name of Emi, for a woman who gave her name and for one who did not',
      async () => {
        await anotherWomanOpensEmi();
        await sheAnswersEverythingAndReachesHerForecast(theNameSheGives);
        await shePresses(firstForecastActionTestID);

        expect(app.pathname()).toBe('/onboarding/what-emi-does-with-it');
        expect(theTitleSheIsReading(whatEmiDoesTitleTestID)).toEqual([theTitleOfWhatEmiDoes.now]);
        expect(screen.queryByText(theTitleOfWhatEmiDoes.theOldGreeting)).toBeNull();

        // And the same title for a woman Emi was never given a name for.
        await anotherWomanOpensEmi();
        await sheAnswersEverythingAndReachesHerForecast();
        await shePresses(firstForecastActionTestID);

        expect(theTitleSheIsReading(whatEmiDoesTitleTestID)).toEqual([theTitleOfWhatEmiDoes.now]);
      },
    );

    and(
      'the screens after the forecast never talk as we, in each of the three languages she can read them in',
      async () => {
        for (const language of languages) {
          const read = theWordsOfTheseScreensIn(language).join('\n');

          expect({ language, asWe: howEachLanguageSaysWe[language].test(read) }).toEqual({
            language,
            asWe: false,
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
        expect(textIn(screen.getByTestId(saveScreenTestID))).toContain(theSaveNowSays);
      },
    );
  });

  /**
   * The whole first run, read screen by screen against the drawing of each one. It renders the
   * screens rather than walking the router, because the comparison reads what one screen drew and
   * a walk would hold only the screens a walk happens to reach.
   *
   * It runs before the three scenarios that draw a page of parts, and after every scenario that
   * drives the application, so nothing here decides what another scenario can open.
   */
  test('SCREEN-1, the first run screens match the redesign prototype', ({
    given,
    when,
    and,
    then,
  }) => {
    const washedAtTheTop: FirstRunDrawing[] = [];
    const unanswered: Record<string, string[]> = {};

    const styleOfPart = (testID: string): Record<string, unknown> =>
      (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as Record<string, unknown>;

    given('she has never opened Emi before', () => undefined);

    when('she reads every screen of the first run, from the welcome to the hold', async () => {
      for (const drawing of theFirstRunDrawings) {
        await sheIsLookingAt(drawing);

        if (theWashIsAtTheTop()) {
          washedAtTheTop.push(drawing);
        }

        unanswered[drawing] = whatTheScreenDoesNotAnswerFor(drawing);
      }
    });

    then('each one carries the wash across the top of the glass', () => {
      expect(washedAtTheTop).toEqual([...theFirstRunDrawings]);
      expect(washedAtTheTop).toHaveLength(19);
    });

    and(
      'each question she answers stands on a white sheet that reaches both edges of that glass',
      async () => {
        for (const drawing of theQuestionsTheBarCounts) {
          await sheIsLookingAt(drawing);

          const sheet = styleOfPart(onboardingSheetTestID);

          expect({ drawing, ground: sheet['backgroundColor'] }).toEqual({
            drawing,
            ground: colour.card,
          });
          expect(theWidthOfTheSheet()).toBe(anIPhone16.width);
          expect(sheet['borderTopLeftRadius']).toBe(radius.xxl);
          expect(sheet['borderTopRightRadius']).toBe(radius.xxl);
        }
      },
    );

    and(
      'the drop stands over the sheet, and the bar sits between the way back and the way past',
      async () => {
        await sheIsLookingAt('name');

        const drawn = theIdentifiersDrawn();
        const emblem = styleOfPart(onboardingEmblemTestID);

        expect(emblem['width']).toBe(emblem['height']);
        expect(drawn.indexOf(onboardingEmblemTestID)).toBeLessThan(
          drawn.indexOf(onboardingSheetTestID),
        );
        expect(drawn.indexOf(onboardingBackTestID)).toBeLessThan(
          drawn.indexOf(onboardingProgressTestID),
        );
        expect(drawn.indexOf(onboardingProgressTestID)).toBeLessThan(
          drawn.indexOf(onboardingSkipTestID),
        );
      },
    );

    and(
      'the step she is on is written out, so she knows how much is left without counting',
      async () => {
        await sheIsLookingAt('feeling');

        expect(screen.getByTestId(onboardingStepLabelTestID)).toHaveTextContent(
          stepLabel('feeling'),
        );
      },
    );

    and('the welcome writes that step and draws no bar', async () => {
      await sheIsLookingAt('welcome');

      expect(screen.getByTestId(onboardingStepLabelTestID)).toHaveTextContent(stepLabel('welcome'));
      expect(screen.queryByTestId(onboardingProgressTestID)).toBeNull();
    });

    and(
      'the first run log names the day in the middle of its header and draws no bar',
      async () => {
        await sheIsLookingAt('todayFirstRun');

        expect(screen.getByTestId(onboardingHeaderWordTestID)).toHaveTextContent(
          firstRunCopy.today.header,
        );
        expect(screen.getByTestId(onboardingTitleTestID)).toHaveTextContent(
          firstRunCopy.today.title,
        );
        expect(screen.queryByTestId(onboardingProgressTestID)).toBeNull();
        expect(screen.queryByTestId(onboardingStepLabelTestID)).toBeNull();
      },
    );

    and('no screen of the first run draws a lock or the card about this phone', async () => {
      for (const drawing of theFirstRunDrawings) {
        await sheIsLookingAt(drawing);

        expect({ drawing, locks: locksDrawnIn(screen.root) }).toEqual({ drawing, locks: 0 });
      }
    });

    and(
      'each screen draws every part its own drawing names, in the order the drawing places them',
      () => {
        const differs = Object.entries(unanswered)
          .filter(([, missing]) => missing.length > 0)
          .map(([drawing, missing]) => `${drawing}: ${String(missing.length)}`)
          .sort();
        const kept = Object.entries(theDifferencesTheStepKeeps)
          .map(([drawing, missing]) => `${drawing}: ${String(missing ?? 0)}`)
          .sort();

        expect(Object.keys(unanswered)).toHaveLength(theFirstRunDrawings.length);
        expect(differs).toEqual(kept);
        expect(howManyPartsTheFirstRunIsHeldTo()).toBeGreaterThan(130);
      },
    );
  });

  /**
   * The screen she opens every day, read in each of its states against the drawing of that state.
   * It opens the real route, so the dock each drawing places under the screen is on the glass with
   * it, and the states that need days behind them get them written before the route opens.
   */
  test('SCREEN-2, the Today screens match the redesign prototype', ({ given, when, and, then }) => {
    const washedAtTheTop: TodayDrawing[] = [];
    const unanswered: Record<string, string[]> = {};

    const styleOfPart = (testID: string): Record<string, unknown> =>
      (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as Record<string, unknown>;

    const drawingIn = (testID: string): string => String(screen.getByTestId(testID).props['xml']);

    given('her phone holds the period she is in and the answers of her first run', () => {
      jest.useFakeTimers();
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    });

    when('she opens Emi and reads the screen she opens in each of its states', async () => {
      for (const drawing of theTodayDrawings) {
        resetExpoSqlite();
        jest.setSystemTime(whenSheOpens(drawing));
        await sheIsLookingAtTheTodayScreen(drawing);

        if (theWashIsAtTheTopOfTheTodayScreen()) {
          washedAtTheTop.push(drawing);
        }

        unanswered[drawing] = whatTheTodayScreenDoesNotAnswerFor(drawing);
      }
    });

    then('each state carries the wash across the top of the glass', () => {
      expect(washedAtTheTop).toEqual([...theTodayDrawings]);
      expect(washedAtTheTop.length).toBeGreaterThan(5);
    });

    and('the ring stands above the card that names the phase she is in', async () => {
      resetExpoSqlite();
      jest.setSystemTime(whenSheOpens('todayLuteal'));
      await sheIsLookingAtTheTodayScreen('todayLuteal');

      expect(whereTheScreenDrew(cycleRingTestID)).toBeGreaterThan(-1);
      expect(whereTheScreenDrew(cycleRingTestID)).toBeLessThan(whereTheScreenDrew(phaseCardTestID));
    });

    and(
      'the three round actions stand under that card, all three white on a day outside her period',
      () => {
        expect(whereTheScreenDrew(phaseCardTestID)).toBeLessThan(
          whereTheScreenDrew(roundActionTestID('sex')),
        );
        for (const white of ['sex', 'period', 'phase'] as const) {
          expect(styleOfPart(roundActionDiscTestID(white))['backgroundColor']).toBe(colour.card);
        }
        expect(drawingIn(roundActionDrawingTestID('period'))).toContain(colour.accent);
        expect(drawingIn(roundActionDrawingTestID('sex'))).toContain(colour.accent);
        expect(drawingIn(roundActionDrawingTestID('phase'))).toContain(colour.ovulationInk);
      },
    );

    and(
      'what she logged today stands under them, in a card with the mark that says Emi kept it',
      async () => {
        resetExpoSqlite();
        jest.setSystemTime(whenSheOpens('todayLogged'));
        await sheIsLookingAtTheTodayScreen('todayLogged');

        expect(whereTheScreenDrew(roundActionTestID('phase'))).toBeLessThan(
          whereTheScreenDrew(loggedTodayTestID),
        );
        expect(styleOfPart(loggedTodayTestID)['backgroundColor']).toBe(colour.card);
        expect(styleOfPart(loggedTodayTileTestID)['borderRadius']).toBe(radius.md);
        expect(drawingIn(loggedTodayMarkTestID)).toContain(colour.ovulationInk);
      },
    );

    and(
      'a section her days cannot fill yet is one card with one sentence, and it draws no chart',
      async () => {
        resetExpoSqlite();
        jest.setSystemTime(whenSheOpens('todayEmptyBody'));
        await sheIsLookingAtTheTodayScreen('todayEmptyBody');

        for (const section of waitingSections) {
          expect(screen.getByTestId(sectionWaitingTileTestID(section))).toBeTruthy();
          expect(screen.getByTestId(sectionWaitingNeedsTestID(section))).toBeTruthy();
        }

        expect(screen.queryByTestId(cycleRingTestID)).toBeNull();
      },
    );

    and(
      'the lock she comes back through carries the wordmark, the disc and the one button',
      async () => {
        await sheIsLookingAtTheTodayScreen('lock');

        expect(screen.getByTestId(lockWordmarkTestID)).toBeTruthy();
        expect(styleOfPart(lockDiscTestID)['backgroundColor']).toBe(colour.card);
        expect(styleOfPart(unlockTestID)['borderRadius']).toBe(radius.full);
      },
    );

    and(
      'each state draws every part its own drawing names in its order, but the parts it records as differences',
      () => {
        const differs = Object.entries(unanswered)
          .filter(([, missing]) => missing.length > 0)
          .map(([drawing, missing]) => `${drawing}: ${String(missing.length)}`)
          .sort();
        const kept = Object.entries(theDifferencesTheTodayStepKeeps)
          .map(([drawing, missing]) => `${drawing}: ${String(missing ?? 0)}`)
          .sort();

        expect(Object.keys(unanswered)).toHaveLength(theTodayDrawings.length);
        expect(differs).toEqual(kept);
        expect(howManyPartsTheTodayScreensAreHeldTo()).toBeGreaterThan(50);
      },
    );
  });

  test('SCREEN-2, the Period button is on only on a day of her period', ({
    given,
    when,
    then,
    and,
  }) => {
    /** Success criterion 1.4.11 of the Web Content Accessibility Guidelines, for a drawing. */
    const theContrastADrawingNeeds = 3;
    const groundsTheDropWasDrawnOn: { ground: string; ink: string }[] = [];

    const periodDisc = (): Record<string, unknown> =>
      (StyleSheet.flatten(screen.getByTestId(roundActionDiscTestID('period')).props.style) ??
        {}) as Record<string, unknown>;
    const sexDisc = (): Record<string, unknown> =>
      (StyleSheet.flatten(screen.getByTestId(roundActionDiscTestID('sex')).props.style) ??
        {}) as Record<string, unknown>;
    const theDrop = (): string =>
      String(screen.getByTestId(roundActionDrawingTestID('period')).props['xml']);
    const isHeardAsOn = (): unknown =>
      screen.getByTestId(roundActionTestID('period')).props.accessibilityState?.selected;

    given('her phone holds the period she is in and the answers of her first run', () => {
      jest.useFakeTimers();
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    });

    when('she opens Emi on a day of her period', async () => {
      resetExpoSqlite();
      jest.setSystemTime(whenSheOpens('todayNext'));
      await sheIsLookingAtTheTodayScreen('todayNext');
    });

    then('the Period button is filled with the accent, and a reader hears that it is on', () => {
      expect(periodDisc()['backgroundColor']).toBe(colour.accent);
      expect(theDrop()).toContain(colour.onAccent);
      expect(isHeardAsOn()).toBe(true);
      groundsTheDropWasDrawnOn.push({ ground: colour.accent, ink: colour.onAccent });
    });

    when('she opens Emi again on a day of her luteal phase', async () => {
      resetExpoSqlite();
      jest.setSystemTime(whenSheOpens('todayLuteal'));
      await sheIsLookingAtTheTodayScreen('todayLuteal');
    });

    then('the Period button is white with the drop in the accent, as the Sex button is', () => {
      expect(periodDisc()['backgroundColor']).toBe(colour.card);
      expect(periodDisc()).toEqual(sexDisc());
      expect(theDrop()).toContain(colour.accent);
      expect(theDrop()).not.toContain(colour.onAccent);
      groundsTheDropWasDrawnOn.push({ ground: colour.card, ink: colour.accent });
    });

    and('a reader does not hear that the Period button is on', () => {
      expect(isHeardAsOn()).toBe(false);
    });

    and('the drop is readable on the ground of each day', () => {
      expect(groundsTheDropWasDrawnOn).toHaveLength(2);
      for (const { ground, ink } of groundsTheDropWasDrawnOn) {
        expect(contrastRatio(ink, ground)).toBeGreaterThanOrEqual(theContrastADrawingNeeds);
      }
    });
  });

  /**
   * The screens she writes a day on and the screens she corrects one on, each read against the
   * drawing of it. Every one is opened through its own address, so what a case reads is the screen
   * she would reach, with the dock under it where a dock reaches it.
   */
  test('SCREEN-4, the Log and calendar screens match the redesign prototype', ({
    given,
    when,
    and,
    then,
  }) => {
    const washedAtTheTop: LogOrCalendarDrawing[] = [];
    const unanswered: Record<string, number> = {};

    given(
      'her phone holds the period she is in, the month behind it and the answers of her first run',
      () => {
        jest.useFakeTimers();
      },
    );

    when(
      'she opens the log, a day she lived, a day Emi refuses, her month and her whole period',
      async () => {
        for (const drawing of theLogAndCalendarDrawings) {
          resetExpoSqlite();
          jest.setSystemTime(whenSheReads(drawing));
          await sheIsLookingAtTheLogOrCalendar(drawing);

          if (theWashIsAtTheTopOfTheLogOrCalendar()) {
            washedAtTheTop.push(drawing);
          }

          unanswered[drawing] = whatTheLogOrCalendarDoesNotAnswerFor(drawing).length;
        }
      },
    );

    then('each of those screens carries the wash across the top of the glass', () => {
      expect(washedAtTheTop).toEqual([...theLogAndCalendarDrawings]);
      expect(washedAtTheTop.length).toBeGreaterThan(6);
    });

    and(
      'the log stands her flow in one card and her symptoms in a second one under it',
      async () => {
        resetExpoSqlite();
        jest.setSystemTime(whenSheReads('log'));
        await sheIsLookingAtTheLogOrCalendar('log');

        expect(theStyleOf(logFlowFlowCardTestID).backgroundColor).toBe(colour.card);
        expect(theStyleOf(logFlowSymptomsCardTestID).backgroundColor).toBe(colour.card);
        expect(whereTheLogOrCalendarDrew(logFlowFlowCardTestID)).toBeLessThan(
          whereTheLogOrCalendarDrew(logFlowSymptomsCardTestID),
        );
      },
    );

    and(
      'the line that says where the day is kept sits under her symptoms, and Done is a word at the top',
      () => {
        expect(whereTheLogOrCalendarDrew(logFlowSavedTestID)).toBeGreaterThan(
          whereTheLogOrCalendarDrew(logFlowSymptomsCardTestID),
        );
        expect(whereTheLogOrCalendarDrew(logFlowDoneTestID)).toBeLessThan(
          whereTheLogOrCalendarDrew(logFlowFlowCardTestID),
        );
        expect(screen.getByTestId(logFlowDoneTestID)).toHaveProp('accessibilityRole', 'link');
      },
    );

    and(
      'the way off a day Emi refuses is the quieter capsule, not a word among words',
      async () => {
        resetExpoSqlite();
        jest.setSystemTime(whenSheReads('dayRefused'));
        await sheIsLookingAtTheLogOrCalendar('dayRefused');

        expect(theStyleOf(dayRefusedBackTestID).backgroundColor).toBe(colour.field);
        expect(theStyleOf(dayRefusedBackTestID).borderRadius).toBe(radius.full);
        expect(Number(theStyleOf(dayRefusedBackTestID).minHeight)).toBeGreaterThanOrEqual(
          MINIMUM_TAP_TARGET,
        );
      },
    );

    and(
      'the way to her whole period sits under the day she pressed, as a link in the accent',
      async () => {
        resetExpoSqlite();
        jest.setSystemTime(whenSheReads('calendar'));
        await sheIsLookingAtTheLogOrCalendar('calendar');

        const from = theScreenOf('calendar');

        expect(whereTheLogOrCalendarDrew(daySheetTestID, from)).toBeLessThan(
          whereTheLogOrCalendarDrew(calendarEditPeriodTestID, from),
        );
        expect(theStyleOf(calendarEditPeriodTestID).backgroundColor).toBeUndefined();
        expect(
          StyleSheet.flatten(
            within(screen.getByTestId(calendarEditPeriodTestID)).getByText(calendarCopy.editPeriod)
              .props.style,
          ).color,
        ).toBe(colour.accent);
      },
    );

    and(
      'her whole period tags the days she added and the day she took off, in her own language',
      async () => {
        resetExpoSqlite();
        jest.setSystemTime(whenSheReads('editPeriod'));
        await sheIsLookingAtTheLogOrCalendar('editPeriod');

        const from = theScreenOf('editPeriod');

        expect(theTagsOnTheList().map((tag) => tag.said)).toEqual([
          editPeriodCopy.takenOff,
          editPeriodCopy.added,
          editPeriodCopy.added,
        ]);
        expect(whereTheLogOrCalendarDrew(editPeriodListTestID, from)).toBeLessThan(
          whereTheLogOrCalendarDrew(editPeriodChangeTestID, from),
        );
      },
    );

    and(
      'each screen draws every part its own drawing names, in the order the drawing places them',
      () => {
        const kept = Object.fromEntries(
          theLogAndCalendarDrawings.map((drawing) => [
            drawing,
            howManyDifferencesAreKeptFor(drawing),
          ]),
        );

        expect(Object.keys(unanswered)).toHaveLength(theLogAndCalendarDrawings.length);
        expect(unanswered).toEqual(kept);
        expect(howManyPartsAreHeldTo()).toBeGreaterThan(55);
      },
    );
  });

  // The payoff for a year of logging, in the shapes the approved redesign draws. A pill says where
  // one of her figures sits against a published one, and nothing on any of the six screens turns
  // arithmetic on her own days into a verdict about her body.
  test('SCREEN-2, the Insights screens match the redesign prototype', ({
    given,
    when,
    and,
    then,
  }) => {
    const washedAtTheTop: InsightsDrawing[] = [];
    const unanswered: Record<string, string[]> = {};

    given('her phone holds six cycles she bled through and the two symptoms that came back', () => {
      jest.useFakeTimers();
      jest.setSystemTime(whenSheReadsHerCycles);
    });

    when(
      'she reads her cycles back: Insights, her three numbers, where the figures come from, her cycles as strips, her trend and what comes back',
      async () => {
        for (const drawing of theInsightsDrawings) {
          resetExpoSqlite();
          await sheIsLookingAtTheInsights(drawing);

          if (theWashIsAtTheTopOfTheInsights()) {
            washedAtTheTop.push(drawing);
          }

          unanswered[drawing] = whatTheInsightsDoNotAnswerFor(drawing);
        }
      },
    );

    then('each of those screens carries the wash across the top of the glass', () => {
      expect(washedAtTheTop).toEqual([...theInsightsDrawings]);
      expect(washedAtTheTop.length).toBe(6);
    });

    and(
      'each of her three numbers says where it sits against the published figure, in her own words',
      async () => {
        resetExpoSqlite();
        await sheIsLookingAtTheInsights('todayNumbers');

        expect(theWordsOfThePillOn('cycle-length')).toBe(homeCopy.numbers.standing.within);
        expect(theWordsOfThePillOn('period-duration')).toBe(homeCopy.numbers.standing.within);
        expect(theWordsOfThePillOn('cycle-length-variation')).toBe(homeCopy.numbers.standing.wider);
      },
    );

    and(
      'a figure of hers that runs past what the paper reports reads wider, and no pill names her',
      async () => {
        resetExpoSqlite();
        await sheIsLookingAtHerNumbersOverCyclesOf([28, 29, 30, 28, 31, 40]);

        expect(theWordsOfThePillOn('cycle-length')).toBe(homeCopy.numbers.standing.wider);

        const said = [
          homeCopy.numbers.standing.within,
          homeCopy.numbers.standing.wider,
          homeCopy.numbers.standing.noFigure,
        ]
          .join(' ')
          .toLowerCase();

        for (const word of ['normal', 'abnormal', 'irregular']) {
          expect(said).not.toContain(word);
        }
      },
    );

    and(
      'her strips, her trend and every card of what comes back stand on the card ground',
      async () => {
        resetExpoSqlite();
        await sheIsLookingAtTheInsights('todayCycles');

        for (const strip of theStripsSheRead()) {
          expect(theStyleOnTheInsights(strip).backgroundColor).toBe(colour.card);
          expect(theStyleOnTheInsights(strip).borderRadius).toBe(radius.xl);
        }

        expect(theStyleOnTheInsights(homeTrendTestID).backgroundColor).toBe(colour.card);
        expect(theStyleOnTheInsights(homeTrendTestID).borderRadius).toBe(radius.xl);

        for (const symptom of theSymptomsThatCameBack) {
          expect(theStyleOnTheInsights(patternCardTestID(symptom.slug)).backgroundColor).toBe(
            colour.card,
          );
          expect(theStyleOnTheInsights(patternCardTestID(symptom.slug)).borderRadius).toBe(
            radius.xl,
          );
        }
      },
    );

    and('every card of what comes back carries its own round drawing', () => {
      for (const symptom of theSymptomsThatCameBack) {
        expect(theStyleOnTheInsights(patternCardTileTestID(symptom.slug)).borderRadius).toBe(
          radius.full,
        );
      }
    });

    and(
      'Insights offers the way back as the quieter capsule, under the rows she came to read',
      async () => {
        resetExpoSqlite();
        await sheIsLookingAtTheInsights('history');

        const from = theInsightsScreenOf('history');

        expect(theStyleOnTheInsights(historyBackTestID).backgroundColor).toBe(colour.field);
        expect(theStyleOnTheInsights(historyBackTestID).borderRadius).toBe(radius.full);
        expect(Number(theStyleOnTheInsights(historyBackTestID).minHeight)).toBeGreaterThanOrEqual(
          MINIMUM_TAP_TARGET,
        );
        expect(whereTheInsightsDrew(historyTitleTestID, from)).toBeLessThan(
          whereTheInsightsDrew(historyBackTestID, from),
        );
      },
    );

    and(
      'each screen draws every part its own drawing names, in the order the drawing places them',
      () => {
        expect(Object.keys(unanswered)).toHaveLength(theInsightsDrawings.length);

        for (const drawing of theInsightsDrawings) {
          expect(whatTheDrawingAsksFor(drawing).map((part) => part.name)).toEqual(
            thePartNamesTheStagePlaces(drawing),
          );
          expect(unanswered[drawing]).toEqual([]);
        }

        expect(howManyInsightsPartsAreHeldTo()).toBeGreaterThan(40);
      },
    );
  });

  // The five screens that carry the privacy promise, walked the way she walks them: out of the
  // dock into Privacy, into her answers, into one of them, and out to the two files and to the one
  // press that empties the phone.
  test('SCREEN-2, the Privacy screens match the redesign prototype', ({
    given,
    when,
    and,
    then,
  }) => {
    const washedAtTheTop: PrivacyDrawing[] = [];
    const unanswered: Record<string, string[]> = {};

    given('her phone holds the eight answers she gave and the three days she bled', () => {
      jest.setSystemTime(whenSheOpensPrivacy);
    });

    when(
      'she opens Privacy from the dock and walks it: her answers, her cycle length, the two files and delete everything',
      async () => {
        for (const drawing of thePrivacyDrawings) {
          await sheIsLookingAtPrivacy(drawing);

          if (theWashIsAtTheTopOfPrivacy()) {
            washedAtTheTop.push(drawing);
          }

          unanswered[drawing] = whatPrivacyDoesNotAnswerFor(drawing);
        }
      },
    );

    then('each of those screens carries the wash across the top of the glass', () => {
      expect(washedAtTheTop).toEqual([...thePrivacyDrawings]);
      expect(washedAtTheTop).toHaveLength(5);
    });

    and('Privacy tells her above the rows that only she can read her days', async () => {
      await sheIsLookingAtPrivacy('privacyNext');

      const from = thePrivacyScreenOf('privacyNext');
      const said = textIn(screen.getByTestId(settingsAssuranceTestID)).join(' ');

      expect(theStyleOnPrivacy(settingsAssuranceTestID).backgroundColor).toBe(colour.darkCard);
      expect(said).toContain(settingsCopy.settings.assurance.lead);
      expect(wherePrivacyDrew(settingsTitleTestID, from)).toBeLessThan(
        wherePrivacyDrew(settingsAssuranceTestID, from),
      );
      expect(wherePrivacyDrew(settingsAssuranceTestID, from)).toBeLessThan(
        wherePrivacyDrew(settingsRowsTestID, from),
      );
    });

    and(
      'every row of Privacy stands on one card, with its own drawing and the mark that points on',
      () => {
        expect(theStyleOnPrivacy(settingsRowsTestID).backgroundColor).toBe(colour.card);
        expect(theStyleOnPrivacy(settingsRowsTestID).borderRadius).toBe(radius.xl);
        expect(theRowsOnTheGlass(theRowsOfPrivacy)).toEqual([...theRowsOfPrivacy]);

        for (const row of theRowsOfPrivacy) {
          expect(theStyleOnPrivacy(rowTileTestID(row)).backgroundColor).toBe(colour.field);
        }

        for (let at = 1; at < theRowsOfPrivacy.length; at += 1) {
          expect(
            theStyleOnPrivacy(rowGroupRuleTestID(settingsRowsTestID, at)).backgroundColor,
          ).toBe(colour.line);
        }
      },
    );

    and(
      'her eight answers stand on one card, each one reading back the answer she gave',
      async () => {
        await sheIsLookingAtPrivacy('yourAnswers');

        expect(theStyleOnPrivacy(yourAnswersRowsTestID).backgroundColor).toBe(colour.card);
        expect(theRowsOnTheGlass(theRowsOfHerAnswers)).toEqual([...theRowsOfHerAnswers]);

        for (const row of yourAnswerRows) {
          const said = textIn(screen.getByTestId(yourAnswerRowTestID(row))).join(' ');

          expect(said).toContain(theAnswerSheGave(row, herAnswers));
          expect(privacyDrew(rowChevronTestID(yourAnswerRowTestID(row)))).toBe(true);
        }
      },
    );

    and('each of the two files she can take away is drawn as a tile of its own', async () => {
      await sheIsLookingAtPrivacy('export');

      expect(theExportTiles).toHaveLength(2);

      for (const tile of theExportTiles) {
        expect(theStyleOnPrivacy(exportTileTestID(tile)).backgroundColor).toBe(colour.card);
        expect(textIn(screen.getByTestId(exportTileTestID(tile))).join(' ').length).toBeGreaterThan(
          0,
        );
      }
    });

    and('the lock sits beside the line that says nothing is sent anywhere', () => {
      expect(privacyDrew(lockLineIconTestID(exportLockLineTestID))).toBe(true);
      expect(textIn(screen.getByTestId(exportLockLineTestID)).join(' ')).toBe(exportCopy.where);
    });

    and('delete everything names the four things that go, each one with its own mark', async () => {
      await sheIsLookingAtPrivacy('delete');

      expect(theStyleOnPrivacy(deleteGoesTestID).backgroundColor).toBe(colour.card);
      expect(settingsCopy.delete.goes).toHaveLength(4);

      for (let at = 0; at < settingsCopy.delete.goes.length; at += 1) {
        expect(privacyDrew(goesMarkTestID(at))).toBe(true);
      }
    });

    and(
      'each screen draws every part its own drawing names, in the order the drawing places them',
      () => {
        expect(Object.keys(unanswered)).toHaveLength(thePrivacyDrawings.length);

        for (const drawing of thePrivacyDrawings) {
          expect(whatThePrivacyDrawingAsksFor(drawing).map((part) => part.name)).toEqual(
            thePartNamesPrivacyPlaces(drawing),
          );
          expect(unanswered[drawing]).toEqual([]);
        }
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
    const theLineUnderIt = 'Your name and your answers from setup';
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
  test('SCREEN-2, the home screen says hello to her by name', ({ given, when, and, then }) => {
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

    then('the top of the screen says hello to her by the name she gave', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(whatItSays(homeGreetingTestID)).toBe(`Hello, ${theNameSheGave}`);
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
      'a woman who gave no name reads hello on its own, with no gap where a name would be',
      async () => {
        await app.close();
        resetExpoSqlite();
        resetExpoSecureStore();
        await herPhoneHoldsOnePeriodAnd();
        await sheOpens('/');

        expect(whatItSays(homeGreetingTestID)).toBe('Hello');
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

    and(
      'none of those words gives her advice or raises an alarm, and only the lines about what Emi holds name Emi',
      () => {
        for (const language of languages) {
          const naming = theKeysOfTheLogAndTheEditor.filter(
            (key) =>
              !theEditorLinesThatNameEmi.includes(key) &&
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
      },
    );
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

    and('the only line that names Emi is the lock itself', () => {
      for (const language of languages) {
        const naming = theKeysOfThePrivacyScreens
          .filter((key) =>
            theWordsOfThePrivacyScreensIn(language, [key]).join('\n').includes('Emi'),
          )
          .sort();

        expect({ language, naming }).toEqual({
          language,
          naming: [...thePrivacyLinesThatNameEmi].sort(),
        });
      }
    });
  });

  test('SCREEN-2, she downloads her data from the delete screen before she deletes it', ({
    given,
    when,
    and,
    then,
  }) => {
    let daysBefore = 0;

    given('she has six cycles of her own on this phone', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriodsAndAWrongMonday());
      daysBefore = listDayLogs(herDatabase()).length;

      expect(daysBefore).toBeGreaterThan(0);
    });

    when('she opens Privacy and walks to the screen that would delete her data', async () => {
      await sheOpens('/settings');
      await shePresses(settingsDeleteTestID);

      expect(screen.getByTestId(deleteScreenTestID)).toBeTruthy();
    });

    then('the screen names no account and no server, in each of the three languages', () => {
      const anAccountOrAServerIn: Readonly<Record<Language, RegExp>> = {
        en: /account|server/i,
        es: /cuenta|servidor/i,
        ru: /учётн|учетн|аккаунт|сервер/i,
      };

      expect(whatItSays(deleteScreenTestID)).not.toMatch(anAccountOrAServerIn.en);

      for (const language of languages) {
        const catalogue = theCatalogueOf(language);
        const said = Object.keys(catalogue)
          .filter((key) => key.startsWith('settings.delete.'))
          .flatMap((key) => formsOf(catalogue[key] ?? ''))
          .join('\n');

        expect({ language, names: said.match(anAccountOrAServerIn[language]) }).toEqual({
          language,
          names: null,
        });
      }
    });

    and('she presses Download data first', async () => {
      expect(whatItSays(deleteDownloadTestID)).toBe(settingsCopy.delete.download);

      await shePresses(deleteDownloadTestID);
    });

    then('Export opens, and every day she logged is still on her phone', () => {
      expect(screen.getByTestId(exportScreenTestID)).toBeTruthy();
      expect(listDayLogs(herDatabase())).toHaveLength(daysBefore);
    });
  });

  test('SCREEN-2, she reads who can see her records from Privacy and comes back', ({
    given,
    when,
    then,
    and,
  }) => {
    given('she has six cycles of her own on this phone', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriodsAndAWrongMonday());
    });

    when('she opens Privacy and presses Who can see my records?', async () => {
      await sheOpens('/settings');

      expect(whatItSays(settingsWhoCanSeeTestID)).toBe(settingsCopy.whoCanSee.title);

      await shePresses(settingsWhoCanSeeTestID);

      expect(screen.getByTestId(whoCanSeeScreenTestID)).toBeTruthy();
    });

    then(
      'she reads where her records are kept, who can read them and what happens when she sends a file',
      () => {
        for (const [at, part] of settingsCopy.whoCanSee.parts.entries()) {
          expect(whatItSays(whoCanSeePartTestID(at))).toContain(part.lead);
          expect(whatItSays(whoCanSeePartTestID(at))).toContain(part.line);
        }
      },
    );

    and('she reads one example of why it matters', () => {
      expect(whatItSays(whoCanSeeExampleTestID)).toBe(settingsCopy.whoCanSee.example);
    });

    and('she presses the way back and is on Privacy again', async () => {
      await shePresses(whoCanSeeBackTestID);

      expect(screen.queryByTestId(whoCanSeeScreenTestID)).toBeNull();
      expect(screen.getByTestId(settingsScreenTestID)).toBeTruthy();
    });
  });

  test('SCREEN-2, she reads who can see her records from the welcome and comes back', ({
    given,
    when,
    then,
    and,
  }) => {
    let app: OpenApp;

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi and presses Who can see my records? on the welcome', async () => {
      app = await sheOpens('/');

      expect(app.pathname()).toBe('/onboarding/welcome');
      expect(whatItSays(welcomeWhoCanSeeTestID)).toBe(settingsCopy.whoCanSee.title);

      await shePresses(welcomeWhoCanSeeTestID);

      expect(app.pathname()).toBe('/settings/who-can-see');
    });

    then(
      'she reads where her records are kept, who can read them and what happens when she sends a file',
      () => {
        for (const [at, part] of settingsCopy.whoCanSee.parts.entries()) {
          expect(whatItSays(whoCanSeePartTestID(at))).toContain(part.lead);
          expect(whatItSays(whoCanSeePartTestID(at))).toContain(part.line);
        }
      },
    );

    and('she presses the way back and is on the welcome again', async () => {
      await shePresses(whoCanSeeBackTestID);

      expect(screen.queryByTestId(whoCanSeeScreenTestID)).toBeNull();
      expect(app.pathname()).toBe('/onboarding/welcome');
    });
  });

  test('SCREEN-1, she gives her last three periods and her first forecast is ready', ({
    given,
    when,
    and,
    then,
  }) => {
    const theOneBefore = addDays(herPeriodStarted, -28);
    const theOneBeforeThat = addDays(herPeriodStarted, -56);
    const eachLastedDays = 5;
    let sheSawARange = false;
    let sheSawStillLearning = true;

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    and('she reaches the step that asks for her last three periods', async () => {
      await sheReachesTheThreePeriodsStep();
    });

    then('the step asks for three periods, and says the third can be skipped', () => {
      expect(screen.getByTestId(onboardingTitleTestID)).toHaveTextContent(
        'Your last three periods',
      );
      expect(screen.getByTestId(pastPeriodRowTestID(0))).toBeTruthy();
      expect(screen.getByTestId(pastPeriodRowTestID(1))).toBeTruthy();
      expect(textIn(screen.getByTestId(pastPeriodRowTestID(2))).join(' ')).toContain(
        'Skip this one if you do not remember',
      );
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
    });

    and(
      'the step says to start with the most recent, and names each row by its place, the most recent first',
      () => {
        expect(screen.getByText(/Start with the most recent\./)).toBeTruthy();
        expect(textIn(screen.getByTestId(pastPeriodRowTestID(0)))).toEqual([
          '1',
          'Most recent',
          'Add the start date',
        ]);
        expect(textIn(screen.getByTestId(pastPeriodRowTestID(1))).slice(0, 3)).toEqual([
          '2',
          'The one before',
          'Add the start date',
        ]);
        expect(textIn(screen.getByTestId(pastPeriodRowTestID(2))).slice(0, 3)).toEqual([
          '3',
          'The one before that',
          'Add the start date',
        ]);
      },
    );

    when(
      'she gives three periods, each with the day it started and the days it lasted',
      async () => {
        await sheGivesAPeriod(0, herPeriodStarted, eachLastedDays);
        await sheGivesAPeriod(1, theOneBefore, eachLastedDays);
        await sheGivesAPeriod(2, theOneBeforeThat, eachLastedDays);
        await shePresses(onboardingActionTestID);
      },
    );

    and('she answers the rest of the questions and taps Save and start', async () => {
      await shePresses(cycleLengthDaysTestID(sheSaysHerCycleRuns));
      await shePresses(onboardingActionTestID);

      for (let question = 0; question < theQuestionsLeftAfterTheCycleLength; question += 1) {
        await shePassesTheQuestion();
      }

      sheSawARange = screen.queryByTestId(firstForecastRangeTestID) !== null;
      sheSawStillLearning = screen.queryByTestId(firstForecastStillLearningTestID) !== null;

      await shePresses(firstForecastActionTestID);
      await shePresses(whatEmiDoesActionTestID);
      await sheTapsSaveAndStart();
    });

    then('her phone holds every bleeding day of the three periods, and no other day', () => {
      const theDaysSheBled = [theOneBeforeThat, theOneBefore, herPeriodStarted].flatMap((start) =>
        Array.from({ length: eachLastedDays }, (_unused, at) => addDays(start, at)),
      );

      expect(
        listDayLogs(herDatabase())
          .map((log) => log.day)
          .sort(),
      ).toEqual(theDaysSheBled.filter((day) => day <= today).sort());
    });

    and('her forecast is ready, and not still learning', () => {
      expect(sheSawARange).toBe(true);
      expect(sheSawStillLearning).toBe(false);
    });

    and('Insights reads the period length she gave', async () => {
      await shePresses(tabTestID('history'));

      expect(textIn(screen.getByTestId(historyCycleTestID(theOneBefore))).join(' ')).toContain(
        cycleLengthSentence(28, eachLastedDays),
      );
    });
  });

  test('SCREEN-1, she gives three periods and confirms the lengths Emi worked out from them', ({
    given,
    when,
    and,
    then,
  }) => {
    const theOneBefore = addDays(herPeriodStarted, -27);
    const theOneBeforeThat = addDays(herPeriodStarted, -54);

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    and('she reaches the step that asks for her last three periods', async () => {
      await sheReachesTheThreePeriodsStep();
    });

    and('she gives three periods, 27 days apart, that lasted 6, 6 and 4 days', async () => {
      await sheGivesAPeriod(0, herPeriodStarted, 6);
      await sheGivesAPeriod(1, theOneBefore, 6);
      await sheGivesAPeriod(2, theOneBeforeThat, 4);
      await shePresses(onboardingActionTestID);
    });

    then(
      'the cycle question says her records average 27 days, and the wheel stands on 27 with Done ready',
      () => {
        expect(screen.getByTestId(onboardingQuestionTestID)).toHaveTextContent(
          'Based on your records, your cycle averages 27 days. Does that look right?',
        );
        expect(screen.getByTestId(cycleLengthDaysTestID(27))).toBeSelected();
        expect(screen.getByTestId(onboardingActionTestID)).toBeEnabled();
      },
    );

    when('she presses Done without turning the wheel', async () => {
      await shePresses(onboardingActionTestID);
    });

    then(
      'the period question says her records average 6 days, and the wheel stands on 6 with Done ready',
      () => {
        expect(screen.getByTestId(onboardingQuestionTestID)).toHaveTextContent(
          'Based on your records, your period averages 6 days. Does that look right?',
        );
        expect(screen.getByTestId(periodLengthDaysTestID(6))).toBeSelected();
        expect(screen.getByTestId(onboardingActionTestID)).toBeEnabled();
      },
    );

    when('she presses Done without turning the wheel', async () => {
      await shePresses(onboardingActionTestID);
    });

    and('she answers the rest of the questions and taps Save and start', async () => {
      for (let question = 1; question < theQuestionsLeftAfterTheCycleLength; question += 1) {
        await shePassesTheQuestion();
      }

      await shePresses(firstForecastActionTestID);
      await shePresses(whatEmiDoesActionTestID);
      await sheTapsSaveAndStart();
    });

    then('her phone holds a cycle length of 27 days and a period length of 6 days', async () => {
      const held = readProfile(herDatabase(), await theProfileVaultOnHerPhone());

      expect(held?.cycleLengthDays).toBe(27);
      expect(held?.periodLengthDays).toBe(6);
    });
  });

  test('SCREEN-2, she starts a period yesterday from the Period page of today, and the ring says day 2', ({
    given,
    when,
    then,
    and,
  }) => {
    let app: OpenApp;
    const yesterday = addDays(today, -1);

    given('her phone holds her first run answers and not one recorded day', async () => {
      await herPhoneHolds(whenSheOpensIt, [], sheSaysHerCycleRuns);
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she presses Period under the ring', async () => {
      await shePresses(roundActionTestID('period'));

      expect(app.pathname()).toBe('/period');
      expect(screen.getByTestId(periodPageTestID)).toBeTruthy();
    });

    and('she presses Started on another day?', async () => {
      await shePresses(periodPageAnotherDayTestID);
    });

    then('she is looking at the period picker, and it lists today', () => {
      expect(app.pathname()).toBe('/calendar/period');
      expect(screen.getByTestId(editPeriodScreenTestID)).toBeTruthy();
      expect(screen.getByTestId(editPeriodRowTestID(today))).toBeTruthy();
    });

    when('she presses today, then Add the day before, and saves', async () => {
      await shePresses(editPeriodRowTestID(today));
      await shePresses(editPeriodAddBeforeTestID);
      await shePresses(editPeriodSaveTestID);
    });

    then('she is on the screen she opened, and no Period page is left under it', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.queryByTestId(periodPageTestID)).toBeNull();
    });

    and('her period started yesterday', () => {
      expect(theCycleStartsHerPhoneHolds()).toEqual([yesterday]);
    });

    and('the ring says she is on day 2 of a cycle of the length she gave', () => {
      expect(theRingSays()).toBe(ringSpokenLabel(2, sheSaysHerCycleRuns, phaseLabel.period));
    });
  });

  test('SCREEN-4, she adds her past periods from the sheet over a month Emi cannot forecast', ({
    given,
    when,
    then,
  }) => {
    let app: OpenApp;
    const theMonthAfterNext = addDays(startOfMonth(today), 62);

    function aForecastIsDrawn(): boolean {
      return theSquaresTheMonthDrew().some((day) => theMarkOnTheSquare(day) === 'forecast');
    }

    given('her phone holds one period and the cycle length she gave', async () => {
      await herPhoneHoldsTheseAnswers(
        whenSheOpensIt,
        {
          kind: 'profile',
          cycleLengthDays: sheSaysHerCycleRuns,
          recordedAt: whenSheOpensIt.toISOString(),
        },
        Array.from({ length: 5 }, (_unused, at) => aBleedingDay(addDays(herPeriodStarted, at))),
      );
    });

    when('she opens the month after next', async () => {
      app = await sheOpens(`/calendar?day=${theMonthAfterNext}`);
    });

    then(
      'a sheet asks her to add her last three periods, with Add past periods and Not now',
      () => {
        expect(screen.getByTestId(forecastPopupTitleTestID)).toHaveTextContent(
          'Add your last three periods',
        );
        expect(screen.getByTestId(forecastPopupActionTestID)).toHaveTextContent('Add past periods');
        expect(screen.getByTestId(forecastPopupNotNowTestID)).toHaveTextContent('Not now');
        expect(aForecastIsDrawn()).toBe(false);
      },
    );

    when('she presses Not now', async () => {
      await shePresses(forecastPopupNotNowTestID);
    });

    then('the sheet is gone, and it does not come back over that month today', async () => {
      expect(screen.queryByTestId(forecastPopupTestID)).toBeNull();

      await app.close();
      app = await sheOpens(`/calendar?day=${theMonthAfterNext}`);

      expect(screen.queryByTestId(forecastPopupTestID)).toBeNull();
    });

    when(
      'she opens the month after that, and the sheet asks again, and she presses Add past periods',
      async () => {
        await shePresses(calendarLaterTestID);

        expect(screen.getByTestId(forecastPopupTestID)).toBeTruthy();

        await shePresses(forecastPopupActionTestID);
      },
    );

    then('she reads the list of her last three periods, with the one her phone holds given', () => {
      expect(app.pathname()).toBe('/calendar/past-periods');
      expect(textIn(screen.getByTestId(pastPeriodRowTestID(0)))).toEqual(
        expect.arrayContaining(['9 May', '5 days']),
      );
    });

    when('she gives the two periods before it and saves', async () => {
      await sheGivesAPeriod(1, addDays(herPeriodStarted, -28), 5);
      await sheGivesAPeriod(2, addDays(herPeriodStarted, -56), 5);
      await shePresses(pastPeriodsSaveTestID);
    });

    then('the month she was reading draws a forecast, and the sheet is gone', () => {
      expect(app.pathname()).toBe('/calendar');
      expect(listDayLogs(herDatabase())).toHaveLength(15);
      expect(aForecastIsDrawn()).toBe(true);
      expect(screen.queryByTestId(forecastPopupTestID)).toBeNull();
    });
  });

  test('SCREEN-2, her period is late, and she logs the day it started', ({
    given,
    when,
    then,
    and,
  }) => {
    let app: OpenApp;
    const yesterday = addDays(theDaySheIsLate, -1);

    given(
      'her phone holds three periods 28 days apart, and the forecast window ended two days ago',
      async () => {
        jest.setSystemTime(whenSheIsLate);
        await herPhoneHoldsThreePeriodsAndNoLateOne();

        expect(listCycles(herDatabase()).map((cycle) => cycle.startedOn)).toEqual([
          '2026-07-24',
          '2026-08-21',
          '2026-09-18',
        ]);
      },
    );

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    then('the forecast says her period is 2 days late, and the range that passed is gone', () => {
      expect(app.pathname()).toBe('/');
      expect(whatItSays(nextPeriodLateTestID)).toBe('Your period is 2 days late');
      expect(screen.queryByTestId(nextPeriodRangeTestID)).toBeNull();
      expect(screen.queryByText('Between the 15th and the 17th of October')).toBeNull();
    });

    when('she presses It started', async () => {
      expect(whatItSays(nextPeriodItStartedTestID)).toBe('It started');
      await shePresses(nextPeriodItStartedTestID);
    });

    then('she is in the period editor, opened on today', () => {
      expect(app.pathname()).toBe('/calendar/period');
      expect(app.searchParams()).toEqual(
        expect.objectContaining({ [dayParameter]: theDaySheIsLate }),
      );
      expect(theDaysTheListDrew()).toEqual([theDaySheIsLate]);
      expect(theDaysTickedOnThePicker()).toEqual([]);
    });

    when('she adds yesterday and saves', async () => {
      await shePresses(editPeriodAddBeforeTestID);

      expect(theDaysTickedOnThePicker()).toEqual([yesterday]);

      await shePresses(editPeriodSaveTestID);
    });

    then('she is back on Today, and the forecast gives the range of her next period again', () => {
      expect(app.pathname()).toBe('/');
      expect(listCycles(herDatabase()).map((cycle) => cycle.startedOn)).toContain(yesterday);
      expect(whatItSays(nextPeriodRangeTestID)).toBe('Between the 14th and the 16th of November');
    });

    and('no line says her period is late', () => {
      expect(screen.queryByTestId(nextPeriodLateTestID)).toBeNull();
      expect(screen.queryByTestId(nextPeriodItStartedTestID)).toBeNull();
    });
  });

  test('SCREEN-1, the window her three periods forecast has passed, and her first forecast says her period is late', ({
    given,
    when,
    and,
    then,
  }) => {
    const eachLastedDays = 5;

    given(
      'today is two days after the window that three periods 28 days apart, the newest on the 18th of September, forecast',
      () => {
        jest.setSystemTime(whenSheIsLate);
      },
    );

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    and('she reaches the step that asks for her last three periods', async () => {
      await sheReachesTheThreePeriodsStep();
    });

    and('she gives those three periods, each 5 days long', async () => {
      await shePresses(pastPeriodRowTestID(0));
      await shePresses(earlierMonthTestID);
      await shePresses(dayTestID('2026-09-18'));
      await shePresses(pastPeriodLengthTestID(eachLastedDays));
      await shePresses(pastPeriodPickerDoneTestID);
      await sheGivesAPeriod(1, '2026-08-21', eachLastedDays);
      await sheGivesAPeriod(2, '2026-07-24', eachLastedDays);
      await shePresses(onboardingActionTestID);
    });

    and('she answers the rest of the questions', async () => {
      await shePresses(cycleLengthDaysTestID(28));
      await shePresses(onboardingActionTestID);

      for (let question = 0; question < theQuestionsLeftAfterTheCycleLength; question += 1) {
        await shePassesTheQuestion();
      }
    });

    then(
      'her first forecast says her period is 2 days late in place of the range, and the why card keeps the days that passed',
      () => {
        expect(screen.getByTestId(firstForecastTestID)).toBeTruthy();
        expect(whatItSays(firstForecastLateTestID)).toBe('Your period is 2 days late');
        expect(screen.queryByTestId(firstForecastRangeTestID)).toBeNull();
        expect(screen.queryByText('Between the 15th and the 17th of October')).toBeNull();
        expect(screen.getByTestId(firstForecastWhyTestID)).toBeTruthy();
        expect(
          ['2026-10-15', '2026-10-16', '2026-10-17'].map((day) =>
            screen.queryByTestId(firstForecastDayTestID(day), { includeHiddenElements: true }),
          ),
        ).not.toContain(null);
      },
    );

    when('she reads on and taps Save and start', async () => {
      await shePresses(firstForecastActionTestID);
      await shePresses(whatEmiDoesActionTestID);
      await sheTapsSaveAndStart();
    });

    then('the home screen says her period is 2 days late too', () => {
      expect(whatItSays(nextPeriodLateTestID)).toBe('Your period is 2 days late');
      expect(listCycles(herDatabase()).map((cycle) => cycle.startedOn)).toEqual([
        '2026-07-24',
        '2026-08-21',
        '2026-09-18',
      ]);
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
            <WhatEmiIs onContinue={() => undefined} onWhoCanSee={() => undefined} />
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
