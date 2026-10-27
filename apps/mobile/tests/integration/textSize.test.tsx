import { join } from 'node:path';

import { MAXIMUM_TEXT_GROWTH, typeScale } from '@emi/tokens';
import { CappedText, CappedTextInput, TAB_LABEL_MINIMUM_SCALE, tabTestID } from '@emi/ui';
import { render } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet, type TextStyle } from 'react-native';

import { LABEL_SCALES } from '../../src/components/WholeWordsText';
import { tabs } from '../../src/features/chrome/tabs';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHolds } from '../fixtures/herPhone';
import { theThemeIsLoaded } from '../fixtures/theTheme';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ru-RU' }] }));
jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

interface HostText {
  readonly type: unknown;
  readonly props: {
    readonly children?: unknown;
    readonly maxFontSizeMultiplier?: number;
    readonly style?: unknown;
  };
}

function textsUnder(node: unknown): HostText[] {
  if (node === null || typeof node !== 'object' || !('children' in node)) {
    return [];
  }
  const drawn = node as unknown as HostText & { readonly children: unknown[] };
  const own = drawn.type === 'Text' ? [drawn] : [];

  return [...own, ...drawn.children.flatMap(textsUnder)];
}

/** Every size the type scale allows, and each of them at every step a label may shrink to. */
const sizesOnTheScale = Object.values(typeScale).flatMap((role) =>
  LABEL_SCALES.map((scale) => Number((role.size * scale).toFixed(4))),
);

function sizeOf(text: HostText): number | undefined {
  const size = (StyleSheet.flatten(text.props.style as TextStyle) ?? {}).fontSize;

  return size === undefined ? undefined : Number(size.toFixed(4));
}

async function sheOpensInRussian(url: string): Promise<void> {
  await herPhoneHolds(new Date('2026-05-01T09:00:00.000Z'), [
    aBleedingDay(dayOf(new Date('2026-05-09T08:00:00.000Z'))),
    aBleedingDay(dayOf(new Date('2026-05-10T08:00:00.000Z'))),
    aBleedingDay(dayOf(new Date('2026-05-11T08:00:00.000Z'))),
  ]);
  await renderRouter(appDirectory, { initialUrl: url });
}

describe('the iOS text size grows the text no further than the boxes allow', () => {
  it('should hold the growth limit the operator approved, 1.3 times', () => {
    expect(MAXIMUM_TEXT_GROWTH).toBe(1.3);
  });

  it('should give a text and a text field the limit, and keep a limit the caller names', async () => {
    await render(
      <>
        <CappedText testID="text">Привет</CappedText>
        <CappedText maxFontSizeMultiplier={1} testID="fixed">
          Привет
        </CappedText>
        <CappedTextInput testID="field" />
      </>,
    );

    expect(screen.getByTestId('text').props.maxFontSizeMultiplier).toBe(MAXIMUM_TEXT_GROWTH);
    expect(screen.getByTestId('fixed').props.maxFontSizeMultiplier).toBe(1);
    expect(screen.getByTestId('field').props.maxFontSizeMultiplier).toBe(MAXIMUM_TEXT_GROWTH);
  });
});

describe('Home and the day entry in Russian draw every text on one type scale, with the limit', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
    theThemeIsLoaded();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each([
    ['Home', '/'],
    ['the day entry', '/log'],
  ])('should cap and size every text on %s from the tokens', async (_screen, url) => {
    await sheOpensInRussian(url);
    const texts = textsUnder(screen.root);

    expect(texts.length).toBeGreaterThan(10);
    for (const text of texts) {
      expect(text.props.maxFontSizeMultiplier).toBe(MAXIMUM_TEXT_GROWTH);
      const size = sizeOf(text);
      if (size !== undefined) {
        expect(sizesOnTheScale).toContain(size);
      }
    }
  });

  it('should keep each tab label on one line, Приватность too, shrinking it rather than cutting it', async () => {
    await sheOpensInRussian('/');

    const labels = tabs.map((tab) => {
      const [, label] = screen.getByTestId(tabTestID(tab.name)).children;
      return label as unknown as HostText & {
        props: {
          numberOfLines?: number;
          adjustsFontSizeToFit?: boolean;
          minimumFontScale?: number;
        };
      };
    });

    expect(labels.map((label) => label.props.children)).toContain('Приватность');
    for (const label of labels) {
      expect(label.props.numberOfLines).toBe(1);
      expect(label.props.adjustsFontSizeToFit).toBe(true);
      expect(label.props.minimumFontScale).toBe(TAB_LABEL_MINIMUM_SCALE);
    }
  });
});
