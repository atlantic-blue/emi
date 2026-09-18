/**
 * The words of the settings screens, in one place, so a test reads them without rendering.
 *
 * The delete screen says what goes and what it costs in the same breath, which is design section
 * 9.7, and it never asks twice. Reaching the screen is the deliberate act; a second confirmation,
 * a countdown or a window in which she could change her mind would each be a way of keeping her
 * data after she asked for it to go.
 */
export const settingsCopy = {
  settings: {
    title: 'Settings',
    back: 'Back',
    delete: 'Delete everything',
  },
  delete: {
    title: 'Delete everything',
    line: 'One press and it is gone. There is no undo, no waiting period, and nobody at Emi can bring it back, because nobody at Emi can read it.',
    goes: [
      'Every day you logged on this phone',
      'The cycles Emi worked out from them',
      'Your settings',
      'The key that opens any of it',
    ],
    action: 'Delete everything',
    back: 'Back',
    working: 'Deleting',
    refused:
      'Your days are gone. This phone would not let go of one thing Emi keeps in the keychain. Press again.',
  },
  deleted: {
    title: 'It is gone.',
    line: 'This phone holds nothing about you. Emi starts from an empty ring.',
    action: 'Start again',
  },
} as const;
