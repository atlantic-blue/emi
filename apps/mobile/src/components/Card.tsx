import { colour, radius, space, stroke } from '@emi/tokens';
import { floatingShadow } from '@emi/ui';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * The three layers the design system names, as one component.
 *
 * Depth is a tonal step and a hairline here. A floating sheet is the same box as a card with the
 * one ambient shadow the document allows, and that is the only shadow anywhere in the product.
 */

/** Layer 1 is a card or a recessed panel. Layer 2 is a sheet that floats over a screen. */
export type CardLayer = 'card' | 'recessed' | 'floating';

interface Props {
  readonly layer?: CardLayer;
  readonly testID?: string;
  readonly children: ReactNode;
}

export function Card({ layer = 'card', testID, children }: Props): ReactNode {
  return (
    <View
      style={[
        styles.card,
        layer === 'recessed' && styles.recessed,
        layer === 'floating' && styles.floating,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colour.surfaceContainerLowest,
    borderColor: colour.outlineVariant,
    borderRadius: radius.xl,
    borderWidth: stroke.hairline,
    padding: space.spaceLg,
  },
  floating: { boxShadow: floatingShadow },
  recessed: { backgroundColor: colour.surfaceContainer },
});
