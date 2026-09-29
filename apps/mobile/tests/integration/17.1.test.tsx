import { render, screen } from '@testing-library/react-native';

import { tabs } from '../../src/features/chrome/tabs';
import { type Language, catalogueOf, languages } from '../../src/language';
import {
  SettingsScreen,
  settingsScreenTestID,
  settingsTitleTestID,
} from '../../src/features/settings/SettingsScreen';
import {
  type Part,
  partsMissing,
  theIdentifiersDrawn,
  thePartsOfTheMockup,
} from '../fixtures/theMockupScreen';
import { textIn } from '../fixtures/renderedText';
import { OnAPhone } from '../fixtures/theSafeArea';

/**
 * The route the fourth column of the dock carries, which is how the column that opens this screen
 * is found rather than counted to.
 */
const theColumnThatOpensIt = 'settings/index';

/** The key the heading is drawn from, and the key the column is drawn from. */
const theHeadingKey = 'settings.settings.title';
const theColumnKey = 'tab.privacy';

/**
 * The word, written out in each language rather than read off the catalogue this reads. A reword
 * of the heading and the column together still says the same word as each other, so the sameness
 * alone cannot hold the name the operator chose.
 */
const theName: Readonly<Record<Language, string>> = {
  en: 'Privacy',
  es: 'Privacidad',
  ru: 'Приватность',
};

/** The word the screen used to head itself with, which no language may put back. */
const theNameThatWent: Readonly<Record<Language, string>> = {
  en: 'Settings',
  es: 'Ajustes',
  ru: 'Настройки',
};

/**
 * The heading of the drawing, on its own. The drawing places ten parts and this step builds one of
 * them: the four rows, the line under them and the dock are step 2 and the steps after it.
 */
function theHeadingOfTheDrawing(): Part[] {
  return thePartsOfTheMockup('privacyNext').slice(0, 1);
}

function theColumnLabel(): string {
  const column = tabs.find((tab) => tab.name === theColumnThatOpensIt);

  if (column === undefined) {
    throw new Error(`no column of the dock carries the route ${theColumnThatOpensIt}`);
  }

  return column.label;
}

async function sheOpensIt(): Promise<void> {
  await render(
    <OnAPhone>
      <SettingsScreen
        onAnswers={() => undefined}
        onBack={() => undefined}
        onDelete={() => undefined}
        onExport={() => undefined}
      />
    </OnAPhone>,
  );
}

function theHeadingSheReads(): string {
  return textIn(screen.getByTestId(settingsTitleTestID)).join('');
}

function everythingSheReads(): string {
  return textIn(screen.getByTestId(settingsScreenTestID)).join(' ');
}

describe('the screen she reaches from the dock takes the name Privacy', () => {
  describe('the drawing the screen is held to', () => {
    it('places a heading first, and says what the built heading is drawn under', () => {
      const [heading] = theHeadingOfTheDrawing();

      expect(heading?.name).toBe('Text');
      // Every screen heads itself with the same drawn part, so the record carries one identifier
      // for each heading built. What this step needs is that its own is on the list.
      expect(heading?.builtUnder).toContain(settingsTitleTestID);
    });

    it('places more than the heading, and the rest of it is not this step', () => {
      expect(thePartsOfTheMockup('privacyNext').length).toBeGreaterThan(1);
    });
  });

  describe('the heading she reads', () => {
    beforeEach(async () => {
      await sheOpensIt();
    });

    it('answers for the heading the drawing places first', () => {
      expect(partsMissing(theHeadingOfTheDrawing(), theIdentifiersDrawn())).toEqual([]);
    });

    it('says the same word as the dock column that opens it', () => {
      expect(theHeadingSheReads()).toBe(theColumnLabel());
    });

    it('says Privacy, and says Settings nowhere on the screen', () => {
      expect(theHeadingSheReads()).toBe(theName.en);
      expect(everythingSheReads()).not.toContain(theNameThatWent.en);
    });
  });

  describe('the word, in each of the three languages', () => {
    it.each([...languages])('is the one the operator chose, in %s', (language) => {
      expect(catalogueOf(language)[theHeadingKey]).toBe(theName[language]);
    });

    it.each([...languages])('is the word the dock column carries, in %s', (language) => {
      expect(catalogueOf(language)[theHeadingKey]).toBe(catalogueOf(language)[theColumnKey]);
    });

    it.each([...languages])('is no longer the word the screen used to carry, in %s', (language) => {
      expect(catalogueOf(language)[theHeadingKey]).not.toBe(theNameThatWent[language]);
    });

    it('reads all three languages, and there are three of them', () => {
      expect([...languages]).toEqual(['en', 'es', 'ru']);
    });
  });
});
