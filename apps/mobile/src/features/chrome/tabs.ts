import type { NavigationTab } from '@emi/ui';

import { words } from '../../language';

/**
 * The four places the dock reaches, in the order it draws them. A tab has to lead to a screen that
 * exists, so this list is the whole of the navigation and adding the fifth the prototype draws,
 * partner sharing, is one entry here once that screen is built.
 *
 * `name` is the route as expo-router names it, which is the path of the file under `app/` without
 * its extension. The navigator matches on that name, so it is the tab's own identity and not a
 * label.
 */
export interface Tab extends NavigationTab {
  /** The route as the navigator names it, which is the file under `app/`. */
  readonly name: string;
}

export const tabs: readonly Tab[] = [
  { name: 'index', label: words('tab.today'), icon: 'sun' },
  { name: 'log/index', label: words('tab.log'), icon: 'edit' },
  { name: 'history', label: words('tab.insights'), icon: 'chart' },
  { name: 'settings/index', label: words('tab.privacy'), icon: 'shield' },
];

/** The names alone, for the navigator, which declares a screen for each of them. */
export const tabNames: readonly string[] = tabs.map((tab) => tab.name);
