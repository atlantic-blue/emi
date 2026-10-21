import { act, fireEvent, screen } from '@testing-library/react-native';

import { saveButtonTestID } from '../../src/features/onboarding/SaveAndStart';

/**
 * One tap on Save and start, and the write it sets off, run to the end.
 *
 * The save is the one moment the first run writes, so every walk that expects a row goes through
 * here. No time passes on her phone between the tap and the write.
 */
export async function sheTapsSaveAndStart(): Promise<void> {
  await act(async () => {
    fireEvent.press(screen.getByTestId(saveButtonTestID));
  });
  // The write reads the keychain, which answers as a promise, so the walk waits for it rather
  // than reading a database the write has not reached yet.
  await act(async () => {
    await Promise.resolve();
  });
}
