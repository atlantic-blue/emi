import { MINIMUM_TAP_TARGET, colour, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RoundIconButton } from '../../components/RoundIconButton';
import { words } from '../../language';

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

interface Props {
  readonly onBack: () => void;
  readonly backTestID: string;
}

/** The head of the hygiene pages: the way back and the title, as both boards draw it. */
export function HygieneHeader({ onBack, backTestID }: Props): ReactNode {
  return (
    <View style={styles.header}>
      <View style={styles.backMark}>
        <RoundIconButton
          accessibilityLabel={words('highlight.back')}
          icon="chevron"
          onPress={onBack}
          testID={backTestID}
        />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {words('highlight.hygieneProducts.title')}
      </Text>
      <View style={styles.evenUp} />
    </View>
  );
}

const styles = StyleSheet.create({
  backMark: { transform: TURNED_AROUND },
  evenUp: { width: MINIMUM_TAP_TARGET },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colour.text, textAlign: 'center', ...textStyle('headline-sm') },
});
