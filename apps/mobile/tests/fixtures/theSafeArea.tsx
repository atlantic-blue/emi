import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import type { Metrics } from 'react-native-safe-area-context';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * A phone that keeps part of its glass for itself, handed to the provider the way the library
 * documents for a test: the numbers a real one reports arrive from the operating system, and
 * `initialMetrics` is how a run with no operating system under it supplies them instead.
 *
 * The runner draws at 390 by 844 points with nothing reserved, which is why a screen drawn under
 * the clock passed every test it had.
 *
 * These are the insets an iPhone with a dynamic island reports. Nothing here read them off a
 * device, so every case asserts the relationship between what the provider hands down and what the
 * screen reserves, and never the numbers themselves.
 */
export const aPhoneWithAnIsland: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { bottom: 34, left: 0, right: 0, top: 59 },
};

/** A phone that keeps none of its glass, which is what the runner reports when nothing supplies it. */
export const aPhoneWithNoIsland: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { bottom: 0, left: 0, right: 0, top: 0 },
};

export function OnAPhone({
  metrics = aPhoneWithAnIsland,
  children,
}: {
  readonly metrics?: Metrics;
  readonly children: ReactNode;
}): ReactNode {
  return <SafeAreaProvider initialMetrics={metrics}>{children}</SafeAreaProvider>;
}

export interface Framed {
  readonly props: {
    readonly testID?: unknown;
    readonly style?: unknown;
  };
}

interface Reserved {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

function reservedBy(root: Framed): Reserved {
  const style = (StyleSheet.flatten(root.props.style) ?? {}) as Record<string, unknown>;
  const held = (key: string): number => (typeof style[key] === 'number' ? style[key] : 0);

  return {
    bottom: held('paddingBottom'),
    left: held('paddingLeft'),
    right: held('paddingRight'),
    top: held('paddingTop'),
  };
}

/**
 * The screens that draw into the part of the glass the phone kept, named with what they reserved,
 * because a failure saying only `false` sends the reader back to the screen to work out which one.
 *
 * A measurement of nothing is not a pass, so an empty list of screens is refused.
 */
export function screensDrawingUnderTheIsland(
  roots: readonly Framed[],
  metrics: Metrics = aPhoneWithAnIsland,
): string[] {
  if (roots.length === 0) {
    throw new Error('no screen was rendered, so nothing was measured for the safe area');
  }

  return roots
    .map((root) => ({ name: String(root.props.testID ?? 'unnamed'), reserved: reservedBy(root) }))
    .filter(
      ({ reserved }) =>
        reserved.top < metrics.insets.top ||
        reserved.bottom < metrics.insets.bottom ||
        reserved.left < metrics.insets.left ||
        reserved.right < metrics.insets.right,
    )
    .map(
      ({ name, reserved }) =>
        `${name} reserves ${reserved.top} at the top and ${reserved.bottom} at the bottom, ` +
        `where the phone keeps ${metrics.insets.top} and ${metrics.insets.bottom}`,
    );
}

/**
 * The screen out of a tree that was drawn inside the provider. The provider is a view of its own,
 * and it belongs to the harness rather than to the screen, so a picture drawn from the tree would
 * otherwise carry a box nothing on a phone draws.
 */
export function theScreenIn(view: { readonly toJSON: () => unknown }): unknown {
  const tree: unknown = JSON.parse(JSON.stringify(view.toJSON()));

  if (tree === null || typeof tree !== 'object' || !('type' in tree)) {
    throw new Error('nothing was drawn, so there is no screen to take out of the tree');
  }

  const node = tree as { type: string; children?: unknown };

  if (node.type !== 'RNCSafeAreaProvider') {
    return tree;
  }

  const children = Array.isArray(node.children) ? node.children : [];

  if (children.length !== 1) {
    throw new Error(`the provider held ${children.length} screens, and a picture draws one`);
  }

  return children[0];
}
