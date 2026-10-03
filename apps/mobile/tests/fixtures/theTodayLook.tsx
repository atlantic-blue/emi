import type { DayRecord, ProfileRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { tabTestID, washTestID } from '@emi/ui';
import { render, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { join } from 'node:path';

import { cycleRingTestID } from '../../src/components/CycleRing';
import { tabs } from '../../src/features/chrome/tabs';
import { learningTestID } from '../../src/features/forecast/Learning';
import { nextPeriodTestID } from '../../src/features/forecast/NextPeriod';
import { homeHeaderTestID } from '../../src/features/home/HomeHeader';
import {
  homeLogTodayTestID,
  homeNoRingLineTestID,
  homeNoRingTitleTestID,
  homeScreenTestID,
} from '../../src/features/home/HomeScreen';
import { loggedTodayTestID } from '../../src/features/home/LoggedToday';
import { phaseLineTestID } from '../../src/features/home/PhaseLine';
import { roundActionTestID } from '../../src/features/home/RoundAction';
import {
  sectionWaitingHeadingTestID,
  sectionWaitingTestID,
  waitingSections,
} from '../../src/features/home/SectionWaiting';
import { weekStripTestID } from '../../src/features/home/WeekStrip';
import {
  LockScreen,
  lockLineTestID,
  lockTitleTestID,
  lockWordmarkTestID,
  unlockTestID,
} from '../../src/features/lock/LockScreen';

import { herPhoneHoldsTheseAnswers } from './herPhone';
import { OnAPhone } from './theSafeArea';
import {
  type Part,
  type PartIdentifiers,
  partsMissing,
  theIdentifiersDrawn,
  thePartsOfTheMockup,
} from './theMockupScreen';

/**
 * The Today screens, each one held against the drawing of it in the mockups stage.
 *
 * One file for all of them, because the redesign reaches the whole of Today at once and a part
 * named in one place is a part every state that draws it is held to. Nothing here presses
 * anything: it puts her phone in one state, opens the screen, and reads what the screen drew.
 *
 * A drawing names a part by a component name and a built screen answers by a test identifier, so
 * the record below joins the two. A part the record does not carry fails the comparison and the
 * failure names it, which is how a part nobody moved goes red rather than passing quietly.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** The week the drawings were worked out from: her period started on the Monday, she runs 31 days. */
export const herPeriodStartedOn = '2026-09-14';
export const sheSaidHerCycleRuns = 31;
export const sheSaidHerPeriodRunsFor = 5;

/** The day each state of the screen is read on, counted off the day her period started. */
export const theDayOfHerPeriodPhase = addDays(herPeriodStartedOn, 3);
export const theDayOfHerLutealPhase = addDays(herPeriodStartedOn, 20);

/** The day a woman who has recorded nothing opens Emi on, which draws no ring. */
export const theDayWithNothingRecorded = '2026-05-14';

/**
 * Every drawing of Today this step holds a screen to, in the order she meets them.
 *
 * `todayEmptyBody` is the foot of the screen `todayEmpty` is the head of, so day one is one screen
 * drawn two ways, and `lock` is the screen a gate over the whole navigator draws.
 */
export const theTodayDrawings = [
  'todayNext',
  'todayLuteal',
  'todayLogged',
  'todayEmpty',
  'todayEmptyBody',
  'lock',
] as const;

export type TodayDrawing = (typeof theTodayDrawings)[number];

/**
 * The drawing of the same route the prototype carries a second design of. Nothing is held to it:
 * it draws the forecast above a grid of four presses where `Main.dc.html`, the drawing every dock
 * in the prototype marks the current page, draws two presses above the forecast. A screen cannot
 * answer both orders, so the stage carries this one and the operator decides.
 */
export const theSecondDesignOfTheRoute = 'today';

/** The drawing of the reminder. The reminder is a feature of its own and nothing is built for it. */
export const theDrawingNothingIsBuiltFor = 'notification';

/** Where the dock draws each of its four columns, in the order the drawing places them. */
const theDock: readonly string[] = tabs.map((tab) => tabTestID(tab.name));

/**
 * What each part of each drawing is built under.
 *
 * The dock carries one identifier for each column and the walk matches them in turn, so the four
 * `BottomNavigation` parts of a drawing are answered by the four columns in the drawn order.
 */
const theIdentifiersOf: Readonly<Record<TodayDrawing, PartIdentifiers>> = {
  lock: {
    PrimaryButton: [unlockTestID],
    Text: [lockWordmarkTestID, lockTitleTestID, lockLineTestID],
  },
  todayEmpty: {
    BottomNavigation: theDock,
    HomeHeader: [homeHeaderTestID],
    Learning: [learningTestID],
    PrimaryButton: [homeLogTodayTestID],
    Text: [homeNoRingTitleTestID, homeNoRingLineTestID],
  },
  // The drawing of the sections she has not earned is a pushed screen with a header and two ways
  // off it. The built screen draws those sections down the body of the screen she opens, so the
  // three parts of that header are owed to feature 15 and stay in the record of differences.
  todayEmptyBody: {
    BottomNavigation: theDock,
    PrimaryButton: [homeLogTodayTestID],
    SectionWaiting: waitingSections.map(sectionWaitingTestID),
    Text: waitingSections.map(sectionWaitingHeadingTestID),
  },
  todayLogged: {
    BottomNavigation: theDock,
    CycleRing: [cycleRingTestID],
    HomeHeader: [homeHeaderTestID],
    LoggedToday: [loggedTodayTestID],
    PhaseLine: [phaseLineTestID],
    RoundAction: theRoundActions(),
    WeekStrip: [weekStripTestID],
  },
  todayLuteal: {
    BottomNavigation: theDock,
    CycleRing: [cycleRingTestID],
    HomeHeader: [homeHeaderTestID],
    NextPeriod: [nextPeriodTestID],
    PhaseLine: [phaseLineTestID],
    RoundAction: theRoundActions(),
    WeekStrip: [weekStripTestID],
  },
  todayNext: {
    BottomNavigation: theDock,
    CycleRing: [cycleRingTestID],
    HomeHeader: [homeHeaderTestID],
    NextPeriod: [nextPeriodTestID],
    PhaseLine: [phaseLineTestID],
    RoundAction: theRoundActions(),
    WeekStrip: [weekStripTestID],
  },
};

/** Both round actions, in the order the drawing places them, so the walk matches each in turn. */
function theRoundActions(): string[] {
  return [roundActionTestID('period'), roundActionTestID('symptoms')];
}

/**
 * Where a screen draws a part somewhere other than where its drawing places it, and why.
 *
 * Every drawing answers its own in order, so the record is empty. A difference would be written
 * out here rather than left out, because a comparison that quietly skipped a part would read
 * exactly like a comparison the screen answered.
 */
export const theDifferencesTheTodayStepKeeps: Readonly<Partial<Record<TodayDrawing, number>>> = {};

/**
 * How many parts of the drawing of the sections she has not earned belong to another feature.
 *
 * That drawing is a pushed screen: a header, a way back, and the word Today in it. The built
 * screen draws those sections down the body of the screen she opens, so there is no pushed screen
 * to put a header on, and feature 15 owns all three. Test 19.1 records them, so the comparison
 * here starts under them rather than counting them twice.
 */
export const thePushedHeaderBelongsToAnotherFeature = 3;

/** The parts of that header, so a case can read what this step passed over and why. */
export function thePushedHeaderOfDayOne(): Part[] {
  return thePartsOfTheMockup('todayEmptyBody', theIdentifiersOf.todayEmptyBody).slice(
    0,
    thePushedHeaderBelongsToAnotherFeature,
  );
}

/** The three answers of her first run, which every state of the screen is read against. */
function herProfile(firstRunFinishedAt: Date): ProfileRecord {
  return {
    kind: 'profile',
    cycleLengthDays: sheSaidHerCycleRuns,
    periodLengthDays: sheSaidHerPeriodRunsFor,
    recordedAt: firstRunFinishedAt.toISOString(),
  };
}

/** A day she bled, at the middle value, which is the value her first run writes for her too. */
function aBleedingDay(day: string): DayRecord {
  return { day, flow: 'medium', recordedAt: `${day}T08:00:00.000Z` };
}

/**
 * How many complete cycles stand behind the one she is in.
 *
 * The drawings name a settled forecast, and a forecast is settled by her own complete cycles
 * rather than by the length she gave, so the phone has to hold enough of them. Six is the number
 * the forecast takes its median over, which is what the drawing's own pill says it read.
 */
export const herCyclesBehindToday = 6;

/** The periods behind the one she is in, each one four days long, oldest first. */
function herCyclesBefore(): DayRecord[] {
  const days: DayRecord[] = [];

  for (let back = herCyclesBehindToday; back >= 1; back -= 1) {
    const started = addDays(herPeriodStartedOn, -back * sheSaidHerCycleRuns);

    for (let day = 0; day < 4; day += 1) {
      days.push(aBleedingDay(addDays(started, day)));
    }
  }

  return days;
}

/** Her six cycles, and the four days of the period she is in, today being the fourth. */
export function herFourRecordedPeriodDays(): DayRecord[] {
  return [
    ...herCyclesBefore(),
    ...Array.from({ length: 4 }, (_unused, index) =>
      aBleedingDay(addDays(herPeriodStartedOn, index)),
    ),
  ];
}

/** The same days, with the two symptoms the drawing of the screen she comes back to names. */
export function herDaysWithTodayMarked(): DayRecord[] {
  const today = addDays(herPeriodStartedOn, 3);

  return [
    ...herFourRecordedPeriodDays().slice(0, -1),
    { day: today, symptoms: ['cramps', 'low-mood'], recordedAt: `${today}T19:00:00.000Z` },
  ];
}

/** The day each drawing of the screen she opens is read on. */
export function theDaySheReads(drawing: TodayDrawing): string {
  if (drawing === 'todayLuteal') {
    return theDayOfHerLutealPhase;
  }

  return drawing === 'todayEmpty' || drawing === 'todayEmptyBody'
    ? theDayWithNothingRecorded
    : theDayOfHerPeriodPhase;
}

/** The days her phone holds for each drawing, which is what every number on the screen is read from. */
function herDaysFor(drawing: TodayDrawing): readonly DayRecord[] {
  if (drawing === 'todayEmpty' || drawing === 'todayEmptyBody') {
    return [];
  }

  return drawing === 'todayLogged' ? herDaysWithTodayMarked() : herFourRecordedPeriodDays();
}

/** Midday on the day of that drawing, well away from any change of the clocks. */
export function whenSheOpens(drawing: TodayDrawing): Date {
  return new Date(`${theDaySheReads(drawing)}T12:00:00.000Z`);
}

/**
 * The screen she is looking at. Every state but the lock is opened through the route she opens it
 * by, so the dock the drawings place under each one is on the glass with it.
 */
export async function sheIsLookingAtTheTodayScreen(drawing: TodayDrawing): Promise<void> {
  if (drawing === 'lock') {
    await render(
      <OnAPhone>
        <LockScreen onUnlock={() => undefined} wasRefused={false} />
      </OnAPhone>,
    );

    return;
  }

  const opened = whenSheOpens(drawing);

  await herPhoneHoldsTheseAnswers(opened, herProfile(opened), herDaysFor(drawing));
  await renderRouter(appDirectory, { initialUrl: '/' });
}

/** Every part the drawing places, in its order, each one carrying what it is built under. */
export function whatTheTodayDrawingAsksFor(drawing: TodayDrawing): Part[] {
  switch (drawing) {
    case 'todayNext':
      return thePartsOfTheMockup('todayNext', theIdentifiersOf.todayNext);
    case 'todayLuteal':
      return thePartsOfTheMockup('todayLuteal', theIdentifiersOf.todayLuteal);
    case 'todayLogged':
      return thePartsOfTheMockup('todayLogged', theIdentifiersOf.todayLogged);
    case 'todayEmpty':
      return thePartsOfTheMockup('todayEmpty', theIdentifiersOf.todayEmpty);
    case 'todayEmptyBody':
      return thePartsOfTheMockup('todayEmptyBody', theIdentifiersOf.todayEmptyBody).slice(
        thePushedHeaderBelongsToAnotherFeature,
      );
    default:
      return thePartsOfTheMockup('lock', theIdentifiersOf.lock);
  }
}

/** What the rendered screen does not answer for, given the drawing of that name. */
export function whatTheTodayScreenDoesNotAnswerFor(drawing: TodayDrawing): string[] {
  return partsMissing(whatTheTodayDrawingAsksFor(drawing), theIdentifiersDrawn());
}

/** Every part of every drawing of Today, counted, so a shrinking comparison is visible. */
export function howManyPartsTheTodayScreensAreHeldTo(): number {
  return theTodayDrawings.reduce(
    (held, drawing) => held + whatTheTodayDrawingAsksFor(drawing).length,
    0,
  );
}

/** Whether the wash is drawn at the top of the screen she is looking at. */
export function theWashIsAtTheTopOfTheTodayScreen(): boolean {
  return screen.queryByTestId(washTestID) !== null;
}

/**
 * The parts the second design of the same route places, which nothing is held to.
 *
 * The key is written out at the call rather than read off the constant above. The gate over the
 * mockups stage reads the literal there, so a key handed in as a name is a drawing nobody can tell
 * is missing. A case holds the constant to the same word.
 */
export function thePartsOfTheSecondDesign(): string[] {
  return thePartsOfTheMockup('today').map((part) => part.name);
}

/** The parts the drawing of the reminder places, which nothing is built for. */
export function thePartsOfTheReminderDrawing(): Part[] {
  return thePartsOfTheMockup('notification');
}

/** Where the screen she opens drew one part, counted from the screen itself downwards. */
export function whereTheScreenDrew(testID: string): number {
  const drawn = theIdentifiersDrawn();
  const screenAt = drawn.indexOf(homeScreenTestID);

  if (screenAt < 0) {
    throw new Error('the screen she opens was not on the glass');
  }

  return drawn.indexOf(testID, screenAt);
}
