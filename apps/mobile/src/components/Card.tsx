import { colour, radius, space } from '@emi/tokens';
import { floatingShadow } from '@emi/ui';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * The layers the design system names, as one component.
 *
 * A card is plain paper: a ground, a corner and nothing drawn around it, so a column of them reads
 * as a journal rather than as a column of boxes. Depth is a tonal step here. A floating sheet is
 * the same box as a card with the one ambient shadow the document allows, and that is the only
 * shadow anywhere in the product.
 */

/**
 * Layer 1 is a card, a recessed panel or the one surface that reverses. Layer 2 is a sheet that
 * floats over a screen.
 */
export type CardLayer = 'card' | 'recessed' | 'dark' | 'floating';

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
        layer === 'dark' && styles.dark,
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
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    padding: space.spaceLg,
  },
  // The one surface that reverses. Its words take the white the palette measured on it, which is
  // the same white the accent carries.
  dark: { backgroundColor: colour.darkCard },
  floating: { boxShadow: floatingShadow },
  recessed: { backgroundColor: colour.field },
});
