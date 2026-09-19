import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import OnboardingLayout from '../../src/app/onboarding/_layout';

/**
 * How the first run moves between its three screens. Jest cannot watch an animation, so this reads
 * the setting the navigator is given. That the walk still works is proved in the integration tier.
 */

interface StackOptions {
  readonly animation?: string;
  readonly headerShown?: boolean;
}

/** A jest factory reaches a variable of the file only when its name opens with mock. */
const mockStackOptions: StackOptions[] = [];

jest.mock('expo-router', () => ({
  Stack: ({ screenOptions }: { screenOptions?: StackOptions }): ReactNode => {
    mockStackOptions.push(screenOptions ?? {});

    return null;
  },
}));

describe('the first run moves between its screens the way the repository chose', () => {
  beforeEach(() => {
    mockStackOptions.length = 0;
  });

  describe('the onboarding navigator', () => {
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
});
