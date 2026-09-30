import { render, screen } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import * as TheReactTheApplicationShips from 'react';

import type { Language } from '../../src/language/language';
import { textIn } from './renderedText';
import { OnAPhone } from './theSafeArea';

/** The screen the focus question is drawn on, so a case reads it and not the stack behind it. */
export const focusScreenTestID = 'onboarding-focus';

/** The tag each language is asked for, as a phone reports it. */
const thePhoneOf: Readonly<Record<Language, string>> = {
  en: 'en-GB',
  es: 'es-ES',
  ru: 'ru-RU',
};

interface FocusProps {
  readonly chosen: readonly never[];
  readonly onBack: () => void;
  readonly onContinue: () => void;
  readonly onPress: () => void;
  readonly onSkip: () => void;
}

/**
 * The focus screen as a woman whose phone reads one language is shown it, drawn from a second load
 * of the screen and of the copy under it.
 *
 * The words of a screen are read once, when its copy is loaded, so the language is the phone's
 * answer at that moment. A file that uses this mocks `expo-localization`, because this sets the
 * phone through that mock before it loads the screen again.
 *
 * The React the application ships is handed to that load rather than left to resolve again. Two
 * copies of it in one render leave every hook reading a dispatcher nobody set, and the render dies
 * inside the first tile rather than saying which language it was drawing.
 */
export async function theFocusScreenIn(language: Language): Promise<void> {
  (getLocales as jest.MockedFunction<typeof getLocales>).mockReturnValue([
    { languageTag: thePhoneOf[language] } as ReturnType<typeof getLocales>[number],
  ]);

  let drawn: TheReactTheApplicationShips.ReactElement | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);

    const loaded = jest.requireActual('../../src/features/onboarding/Focus') as {
      Focus: TheReactTheApplicationShips.ComponentType<FocusProps>;
    };
    // The phone comes from the same load as the screen. A provider and the screen under it hold
    // the context of whichever copy of the library each was loaded from, and two copies share none.
    const phone = jest.requireActual('./theSafeArea') as { OnAPhone: typeof OnAPhone };

    drawn = TheReactTheApplicationShips.createElement(
      phone.OnAPhone,
      null,
      TheReactTheApplicationShips.createElement(loaded.Focus, {
        chosen: [],
        onBack: () => undefined,
        onContinue: () => undefined,
        onPress: () => undefined,
        onSkip: () => undefined,
      }),
    );
  });

  if (drawn === undefined) {
    throw new Error(`nothing drew the focus screen for a phone reading ${language}`);
  }

  await render(drawn);
}

/** Every word the focus screen puts in front of her, as one run of text to read a promise out of. */
export function everythingSheReadsOnTheFocus(): string {
  return textIn(screen.getByTestId(focusScreenTestID)).join(' ');
}
