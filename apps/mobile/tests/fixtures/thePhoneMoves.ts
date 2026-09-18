import { act } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * The phone leaving the foreground and coming back to it.
 *
 * React Native's AppState is a jest mock here, so the states arrive through the listener the
 * application itself registered rather than through a listener a test invented. The orders below
 * are the orders the two platforms send: iOS reports inactive on its way out and again on its way
 * back in, and Android reports neither.
 */

type Change = (status: AppStateStatus) => void;

function theListeners(): Change[] {
  const added = AppState.addEventListener as unknown as jest.Mock;
  const found = added.mock.calls
    .filter(([event]) => event === 'change')
    .map(([, listener]) => listener as Change);

  if (found.length === 0) {
    throw new Error('nothing in the application is listening for the phone leaving the foreground');
  }

  return found;
}

/** How many listeners the application holds, so a subscription it never drops is seen. */
export function listenersOnTheAppState(): number {
  return theListeners().length;
}

async function thePhoneReports(status: AppStateStatus): Promise<void> {
  await act(async () => {
    for (const listener of theListeners()) {
      listener(status);
    }
    // Asking the phone is two awaits deep, and nothing on the screen changes until both land.
    for (let turn = 0; turn < 10; turn += 1) {
      await Promise.resolve();
    }
  });
}

/** The switcher on iOS: inactive first, and the picture of the application is taken after it. */
export async function sheOpensTheSwitcher(): Promise<void> {
  await thePhoneReports('inactive');
}

/** She leaves Emi for something else, on a phone that reports inactive on the way out. */
export async function sheLeavesEmi(): Promise<void> {
  await thePhoneReports('inactive');
  await thePhoneReports('background');
}

/** The same move on a phone that has no inactive state at all. */
export async function sheLeavesEmiWithNoInactiveState(): Promise<void> {
  await thePhoneReports('background');
}

export async function sheComesBackToEmi(): Promise<void> {
  await thePhoneReports('inactive');
  await thePhoneReports('active');
}

/** A phone nobody has moved yet. The listeners of a render that is gone are forgotten here. */
export function resetTheAppState(): void {
  (AppState.addEventListener as unknown as jest.Mock).mockClear();
}
