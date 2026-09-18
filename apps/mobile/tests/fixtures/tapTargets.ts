import { MINIMUM_TAP_TARGET } from '@emi/tokens';
import { StyleSheet } from 'react-native';

/**
 * SEE-3, measured off what a screen actually rendered. A control is named with its own size when
 * it falls under the floor, because a failure that says only `false` sends the reader back to the
 * screen to work out which one.
 */

export interface Control {
  readonly props: {
    readonly testID?: unknown;
    readonly accessibilityLabel?: unknown;
    readonly style?: unknown;
  };
}

function sizeIn(style: Record<string, unknown>, keys: readonly string[]): number {
  for (const key of keys) {
    const held = style[key];
    if (typeof held === 'number') {
      return held;
    }
  }
  return 0;
}

/** A measurement of nothing is not a pass, so an empty list of controls is refused. */
export function controlsTooSmallToPress(controls: readonly Control[]): string[] {
  if (controls.length === 0) {
    throw new Error('a screen holding nothing to press was measured for tap targets');
  }

  return controls
    .map((control) => {
      const style = (StyleSheet.flatten(control.props.style) ?? {}) as Record<string, unknown>;

      return {
        name: String(control.props.testID ?? control.props.accessibilityLabel ?? 'unnamed'),
        width: sizeIn(style, ['width', 'minWidth']),
        height: sizeIn(style, ['height', 'minHeight']),
      };
    })
    .filter(({ width, height }) => width < MINIMUM_TAP_TARGET || height < MINIMUM_TAP_TARGET)
    .map(({ name, width, height }) => `${name} is ${width} by ${height}`);
}
