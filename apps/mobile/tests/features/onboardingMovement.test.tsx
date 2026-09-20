import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import RootLayout from '../../src/app/_layout';
import OnboardingLayout from '../../src/app/onboarding/_layout';
import { OnAPhone } from '../fixtures/theSafeArea';

/**
 * How the first run moves: between its three screens, and at the two ends where it arrives and
 * leaves. Jest cannot watch an animation, so this reads the settings the navigators are given.
 * That the routes still choose the same destinations is proved in the integration tier.
 */

interface StackOptions {
  readonly animation?: string;
  readonly animationTypeForReplace?: string;
  readonly headerShown?: boolean;
}

interface NamedScreen {
  readonly name: string;
  readonly options: StackOptions;
}

/** A jest factory reaches a variable of the file only when its name opens with mock. */
const mockStackOptions: StackOptions[] = [];
const mockScreens: NamedScreen[] = [];

jest.mock('expo-router', () => {
  const Screen = ({ name, options }: NamedScreen): ReactNode => {
    mockScreens.push({ name, options: options ?? {} });

    return null;
  };
  const Stack = ({
    children,
    screenOptions,
  }: {
    children?: ReactNode;
    screenOptions?: StackOptions;
  }): ReactNode => {
    mockStackOptions.push(screenOptions ?? {});

    return children ?? null;
  };
  Stack.Screen = Screen;

  // The layout hands the navigator a ground of its own, built from the default theme. Neither the
  // ground nor the provider decides a movement, so both are stood up with the least that lets the
  // layout render. What the ground is set to is proved in the integration tier.
  return {
    DefaultTheme: { colors: {} },
    Stack,
    ThemeProvider: ({ children }: { children?: ReactNode }): ReactNode => children ?? null,
  };
});

// The providers reach a database, a keychain and a lock, and none of them decide a movement.
jest.mock('../../src/data/DatabaseProvider', () => ({
  DatabaseProvider: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('../../src/features/lock/LockGate', () => ({
  LockGate: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('../../src/services/vault/VaultProvider', () => ({
  VaultProvider: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('../../src/features/onboarding/FirstRunProvider', () => ({
  FirstRunProvider: ({ children }: { children: ReactNode }) => children,
}));

function optionsOf(name: string): StackOptions {
  const found = mockScreens.filter((screen) => screen.name === name);

  if (found.length !== 1) {
    throw new Error(`the root navigator names ${name} ${found.length} times`);
  }

  return found[0]?.options ?? {};
}

describe('the first run moves the way the repository chose, and not the way it inherited', () => {
  beforeEach(() => {
    mockStackOptions.length = 0;
    mockScreens.length = 0;
  });

  describe('between the three screens of the first run', () => {
    it('slides the next question in from the right', async () => {
      await render(<OnboardingLayout />);

      expect(mockStackOptions).toHaveLength(1);
      expect(mockStackOptions[0]?.animation).toBe('slide_from_right');
    });

    it('keeps the header hidden, so the first run grows no bar of its own', async () => {
      await render(<OnboardingLayout />);

      expect(mockStackOptions[0]?.headerShown).toBe(false);
    });
  });

  // The root layout stands its own safe area provider up, and a provider with no insets yet
  // draws nothing at all. A provider above it hands them down, so the navigator is reached.
  describe('at the two ends, where the root navigator replaces one screen with another', () => {
    it('brings the first question in as a step forward, and not as a swap', async () => {
      await render(
        <OnAPhone>
          <RootLayout />
        </OnAPhone>,
      );

      expect(optionsOf('onboarding').animationTypeForReplace).toBe('push');
    });

    it('brings her home as a step forward, so the finish does not read as a retreat', async () => {
      await render(
        <OnAPhone>
          <RootLayout />
        </OnAPhone>,
      );

      // Home is the first screen of the group the dock reaches. The group carries no segment of
      // its own, so the address she arrives at is still the index route.
      expect(optionsOf('(tabs)').animationTypeForReplace).toBe('push');
    });

    it('names those two screens and no others, so leaving a screen stays a step back', async () => {
      await render(
        <OnAPhone>
          <RootLayout />
        </OnAPhone>,
      );

      expect(mockScreens.map((screen) => screen.name).sort()).toEqual(['(tabs)', 'onboarding']);
    });
  });
});
