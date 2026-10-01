import { screen } from '@testing-library/react-native';

import {
  type WaitingSection,
  sectionWaitingHeadingTestID,
  sectionWaitingNeedsTestID,
  sectionWaitingReadTestID,
  sectionWaitingTestID,
} from '../../src/features/home/SectionWaiting';
import { textIn } from './renderedText';
import { theMarkupOfTheMockup } from './theMockupScreen';

/**
 * The sections her data cannot fill, read off the drawing and read off the glass, so the two can be
 * held against each other.
 *
 * This is the one comparison in the suite that reads the words of a drawing. Everywhere else the
 * words come from the catalogue in three languages and the drawing settles only the shape. Here the
 * sentence is the whole of what the section is: a section that drew the right shape and said the
 * wrong thing would have failed at the only thing it is for.
 */

/** One waiting section: the heading over it, the sentence under it, and the count it names. */
export interface WaitingSaid {
  readonly heading: string;
  readonly needs: string;
  /** Nothing at all where the sentence above carries the count inside it. */
  readonly read?: string;
}

/** A muted paragraph before a quoted block, which is how the drawing writes a waiting section. */
const theSectionsInTheMarkup =
  /<p class="eyebrow"[^>]*>([^<]*)<\/p><div class="quote" data-component="SectionWaiting">(.*?)<\/div>/g;

const theSpansInABlock = /<span[^>]*>([^<]*)<\/span>/g;

/** What the drawing says, in the order it places the sections. */
export function theWaitingSectionsTheDrawingPlaces(key: string): WaitingSaid[] {
  const markup = theMarkupOfTheMockup(key);
  const said: WaitingSaid[] = [];

  for (const [, heading, block] of markup.matchAll(theSectionsInTheMarkup)) {
    const lines = [...String(block).matchAll(theSpansInABlock)].map(([, line]) => String(line));
    const [needs, ...rest] = lines;

    if (needs === undefined) {
      throw new Error(`the drawing "${key}" writes a waiting section carrying no sentence`);
    }

    said.push({ heading: String(heading), needs, ...(rest.length === 0 ? {} : { read: rest[0] }) });
  }

  if (said.length === 0) {
    throw new Error(`the drawing "${key}" places no waiting section, so it can refuse nothing`);
  }

  return said;
}

/** One waiting section as the screen drew it, named by the section it stands for. */
export interface WaitingDrawn extends WaitingSaid {
  readonly section: WaitingSection;
}

/** What the screen on the glass says, for the sections it drew and no others. */
export function theWaitingSectionsOnTheGlass(sections: readonly WaitingSection[]): WaitingDrawn[] {
  return sections
    .filter((section) => screen.queryByTestId(sectionWaitingTestID(section)) !== null)
    .map((section) => {
      const read = screen.queryByTestId(sectionWaitingReadTestID(section));

      return {
        section,
        heading: said(sectionWaitingHeadingTestID(section)),
        needs: said(sectionWaitingNeedsTestID(section)),
        ...(read === null ? {} : { read: textIn(read).join(' ') }),
      };
    });
}

function said(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}
