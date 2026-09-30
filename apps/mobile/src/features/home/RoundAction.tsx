import type { ReactNode } from 'react';

/** The round actions the drawing places under the ring, in the order it places them. */
export const roundActions = ['period', 'symptoms'] as const;

export type RoundActionName = (typeof roundActions)[number];

/** What every round action is drawn under, which is how a reader finds all of them at once. */
export const roundActionStem = 'home-round-action-';

export function roundActionTestID(name: RoundActionName): string {
  return `${roundActionStem}${name}`;
}

interface Props {
  readonly action: RoundActionName;
  readonly icon: string;
  readonly label: string;
  readonly onPress: () => void;
}

export function RoundAction(_props: Props): ReactNode {
  return null;
}
