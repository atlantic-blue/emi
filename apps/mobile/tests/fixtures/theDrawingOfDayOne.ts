import { tabTestID } from '@emi/ui';

import { learningTestID } from '../../src/features/forecast/Learning';
import { tabs } from '../../src/features/chrome/tabs';
import { homeHeaderTestID } from '../../src/features/home/HomeHeader';
import {
  homeLogTodayTestID,
  homeNoRingLineTestID,
  homeNoRingTitleTestID,
} from '../../src/features/home/HomeScreen';
import { type Part, thePartsOfTheMockup } from './theMockupScreen';

/**
 * The drawing of the screen she opens on day one, before she recorded anything at all, which the
 * mockups stage calls `todayEmpty`.
 *
 * Three readers hold a screen to it: the step that built the screen, the walk through the first
 * run that reaches the screen, and the scenario of each. The list lives here so the three read one
 * list, because a second copy of it drifts and the comparison still passes.
 */

/**
 * What each part of that drawing is built under, in the order the drawing places them.
 *
 * Every part of it is built, so nothing here is owed to a step that has not run yet, unlike the
 * drawing of the sections underneath it.
 */
export function thePartsOfTheDayOneDrawing(): Part[] {
  return [
    { builtUnder: [homeHeaderTestID], name: 'HomeHeader' },
    { builtUnder: [homeNoRingTitleTestID], name: 'Text' },
    { builtUnder: [homeNoRingLineTestID], name: 'Text' },
    { builtUnder: [learningTestID], name: 'Learning' },
    { builtUnder: [homeLogTodayTestID], name: 'PrimaryButton' },
    ...tabs.map((tab) => ({ builtUnder: [tabTestID(tab.name)], name: 'BottomNavigation' })),
  ];
}

/**
 * The parts the drawing itself names, in its order, which the list above is held against.
 *
 * The key is written out at the call. The check on the mockups stage reads the literal there, so a
 * key handed in as a name is a drawing nobody can tell is missing.
 */
export function thePartsTheDayOneDrawingNames(): Part[] {
  return thePartsOfTheMockup('todayEmpty');
}
