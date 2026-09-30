import { space } from '@emi/tokens';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { HomeScreen, homeForecastTestID } from '../../src/features/home/HomeScreen';
import { homeCopy } from '../../src/features/home/copy';
import { everyScreenOfTheApplication } from '../fixtures/everyScreenOfTheApplication';
import type { AScreenOnTheGlass } from '../fixtures/theBodyOfTheScreen';
import {
  screensCentringTheirBody,
  theBodyOfTheScreen,
  theRoomAboveTheContent,
} from '../fixtures/theBodyOfTheScreen';
import type { PlacedBox } from '../fixtures/theHeightDownTheGlass';
import { placedOnTheGlass, theBoxNamed, theBoxSaying } from '../fixtures/theHeightDownTheGlass';
import { phasesFromCycle } from '../fixtures/ringPhases';
import { OnAPhone, aPhoneWithAnIsland, theScreenIn } from '../fixtures/theSafeArea';
import type { Phone } from '../fixtures/theWidthOfARow';

/**
 * She opens Emi and reads her cycle at the top of the screen, where her eye already is, instead of
 * in the middle of a screen with an empty top.
 *
 * The room a phone keeps for its clock and its island arrives from the provider, so every number
 * here is the room a phone reports plus the padding the screen itself reserves. Nothing was read off
 * a device.
 */

const thePhoneSheHolds: Phone = { height: 844, name: 'a phone with an island', width: 390 };

/** The same phone with more glass, which is how the spare room is shown to fall at the foot. */
const aTallerGlass: Phone = { height: 1244, name: 'a taller glass', width: 390 };

/** Where the body of the screen she opens lets its content begin, on a phone that keeps its island. */
const theTopOfTheGlass = aPhoneWithAnIsland.insets.top + space.spaceXl;

const nothing = (): void => undefined;

const stillLearning = { completeCycles: 0, kind: 'learning', needsCycles: 3 } as const;

/** Day eight of a cycle she said runs 31 days, which is the day the picture of this screen draws. */
const theCycleSheIsIn = { cycleLengthDays: 31, day: 8, phases: phasesFromCycle(31, 5) };

function theScreenSheOpens(ring: typeof theCycleSheIsIn | undefined): ReactElement {
  return (
    <HomeScreen
      cycleLengthDays={31}
      forecast={stillLearning}
      onExport={nothing}
      onLogPain={nothing}
      onPeriod={nothing}
      onSymptoms={nothing}
      ring={ring}
    />
  );
}

async function placedOn(glass: Phone, ring?: typeof theCycleSheIsIn): Promise<PlacedBox[]> {
  const view = await render(
    <OnAPhone metrics={aPhoneWithAnIsland}>{theScreenSheOpens(ring)}</OnAPhone>,
  );

  return placedOnTheGlass(theScreenIn(view), glass);
}

async function everyScreenPlacedOnTheGlass(): Promise<AScreenOnTheGlass[]> {
  const placed: AScreenOnTheGlass[] = [];

  for (const [name, screen] of everyScreenOfTheApplication) {
    const view = await render(<OnAPhone metrics={aPhoneWithAnIsland}>{screen()}</OnAPhone>);

    placed.push({ boxes: placedOnTheGlass(theScreenIn(view), thePhoneSheHolds), name });
  }

  return placed;
}

describe('the screen she opens begins at the top of the glass', () => {
  describe('the screen she opens', () => {
    it('says the first thing under the room the phone keeps, before she has logged anything', async () => {
      const boxes = await placedOn(thePhoneSheHolds);

      expect(theBoxSaying(boxes, homeCopy.wordmark).top).toBe(theTopOfTheGlass);
      expect(theRoomAboveTheContent(theBodyOfTheScreen(boxes))).toBe(0);
    });

    it('holds her cycle at that same place, and leaves the spare room at the foot', async () => {
      const onThePhone = await placedOn(thePhoneSheHolds, theCycleSheIsIn);
      const onATallerGlass = await placedOn(aTallerGlass, theCycleSheIsIn);

      expect(theBoxSaying(onThePhone, homeCopy.wordmark).top).toBe(theTopOfTheGlass);
      expect(theBoxSaying(onATallerGlass, homeCopy.wordmark).top).toBe(theTopOfTheGlass);
    });

    it('reads down the glass in the order the drawing gives: the ring, the way in, the forecast', async () => {
      const boxes = await placedOn(thePhoneSheHolds, theCycleSheIsIn);
      const forecast = theBoxNamed(boxes, homeForecastTestID);

      expect(theBoxSaying(boxes, homeCopy.wordmark).top).toBeLessThan(forecast.top);
      expect(theBoxSaying(boxes, homeCopy.roundAction.period).top).toBeLessThan(forecast.top);
      expect(theBoxSaying(boxes, homeCopy.roundAction.period).top).toBeGreaterThan(
        theBoxSaying(boxes, homeCopy.wordmark).top,
      );
    });
  });

  describe('every screen of the application', () => {
    it('holds no screen whose body asks for its content in the middle', async () => {
      const placed = await everyScreenPlacedOnTheGlass();

      expect(placed).toHaveLength(everyScreenOfTheApplication.length);
      expect(screensCentringTheirBody(placed)).toEqual([]);
    });

    it('refuses a run that placed no screen, because nothing measured is not a pass', () => {
      expect(() => screensCentringTheirBody([])).toThrow(/no screen was placed/);
    });
  });
});
