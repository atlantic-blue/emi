import { words } from '../../language';

/** The words of the lock, read from the catalogue so a test reads them without rendering a screen. */
export const lockCopy = {
  cover: { wordmark: words('lock.cover.wordmark') },
  locked: {
    wordmark: words('lock.locked.wordmark'),
    title: words('lock.locked.title'),
    line: words('lock.locked.line'),
    action: words('lock.locked.action'),
    refused: words('lock.locked.refused'),
  },
  prompt: words('lock.prompt'),
  cancel: words('lock.cancel'),
} as const;
