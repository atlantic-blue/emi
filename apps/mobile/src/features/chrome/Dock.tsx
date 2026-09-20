import { BottomNavigation } from '@emi/ui';
import type { ReactNode } from 'react';

import { tabs } from './tabs';

/**
 * The dock, wired to the navigator. This is the only place that knows both, so the component in
 * @emi/ui stays a drawing and the tab list stays a list.
 *
 * A route with no tab of its own draws no dock at all, which is how the first run keeps the screen
 * to itself.
 */

interface Route {
  readonly key: string;
  readonly name: string;
}

interface NavigatorState {
  readonly index: number;
  readonly routes: readonly Route[];
}

export interface DockProps {
  readonly state: NavigatorState;
  readonly navigation: { readonly navigate: (name: string) => void };
}

export function Dock({ state, navigation }: DockProps): ReactNode {
  const here = state.routes[state.index]?.name;
  const chosen = tabs.find((tab) => tab.name === here);

  if (chosen === undefined) {
    return null;
  }

  return (
    <BottomNavigation
      chosen={chosen.name}
      onChoose={(name) => {
        navigation.navigate(name);
      }}
      tabs={tabs}
    />
  );
}
