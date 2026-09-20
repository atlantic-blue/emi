import { Tabs } from 'expo-router/js-tabs';
import type { ReactNode } from 'react';

import { Dock } from '../../features/chrome/Dock';
import { tabs } from '../../features/chrome/tabs';

/**
 * The four screens the dock reaches, and the dock that reaches them.
 *
 * The group carries no segment of its own, so these screens keep the addresses they had: the ring
 * is still at `/`, the log sheet at `/log`. Everything the dock does not reach, the first run
 * among them, stays outside this group in the navigator above, which is what keeps a way back from
 * a day and from the delete screen.
 */
export default function TabsLayout(): ReactNode {
  return (
    <Tabs
      screenOptions={{ animation: 'none', headerShown: false }}
      tabBar={(props) => <Dock {...props} />}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}
