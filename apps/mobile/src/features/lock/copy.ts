/**
 * The words of the lock, in one place, so a test can read them without rendering a screen.
 *
 * The cover carries the wordmark and nothing else. A cover that named the screen underneath it,
 * even as a heading, would put a word about her body into the picture the operating system keeps.
 */
export const lockCopy = {
  cover: { wordmark: 'emi' },
  locked: {
    wordmark: 'emi',
    title: 'Emi is locked.',
    line: 'Unlock with your face, your fingerprint or your passcode.',
    action: 'Unlock',
    refused: 'Emi is still locked. Press Unlock to try again.',
  },
  /** What the platform prompt says. The platform draws it, so Emi writes only this line. */
  prompt: 'Unlock Emi',
  cancel: 'Cancel',
} as const;
