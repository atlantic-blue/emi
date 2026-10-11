import { words } from '../../language';

/** The words of the one screen a phone shows when her days are held and the key to them is not. */
export const lostKeyCopy = {
  title: words('lostKey.title'),
  lines: [words('lostKey.line.days'), words('lostKey.line.nobody')],
  action: words('lostKey.action'),
  working: words('lostKey.working'),
  refused: words('lostKey.refused'),
} as const;
