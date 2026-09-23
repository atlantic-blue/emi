import { act, fireEvent, screen } from '@testing-library/react-native';

import { HOLD_MILLISECONDS, holdCoreTestID } from '../../src/features/onboarding/HoldToBegin';

/**
 * Her thumb on the ring for the whole hold, and the write it sets off, run to the end.
 *
 * The hold is the one moment the first run writes, so every walk that expects a row goes through
 * here. It needs the timers to be fake, because it waits the hold out rather than sleeping, and
 * it moves the clock forward by the length of the hold as her phone would.
 */
export async function sheHoldsTheRing(): Promise<void> {
  await act(async () => {
    fireEvent(screen.getByTestId(holdCoreTestID), 'pressIn');
  });
  await act(async () => {
    jest.advanceTimersByTime(HOLD_MILLISECONDS);
  });
  // The write reads the keychain, which answers as a promise, so the walk waits for it rather
  // than reading a database the write has not reached yet.
  await act(async () => {
    await Promise.resolve();
  });
}
