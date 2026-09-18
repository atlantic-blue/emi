import { MINIMUM_TAP_TARGET, colour, radius, space, typeScale } from '@emi/tokens';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { WrittenFile } from './destination';
import type { ExportOutcome } from './exportNow';
import { exportCopy, heldSentence } from './copy';

/**
 * Her way out. The screen says what the two files are before it makes them, and what it made after,
 * because a woman who is told her data is hers should be able to see the thing she is being given.
 *
 * Making the files and handing them over are two presses. The sheet that hands a file to another
 * application is the one moment anything she wrote leaves Emi, so she opens it herself.
 */

export const exportScreenTestID = 'export-screen';
export const exportBackTestID = 'export-back';
export const exportActionTestID = 'export-action';
export const exportHeldTestID = 'export-held';
export const exportFailedTestID = 'export-failed';

export function exportFileTestID(name: string): string {
  return `export-file-${name}`;
}

export function exportShareTestID(name: string): string {
  return `export-share-${name}`;
}

interface Props {
  readonly onBack: () => void;
  readonly onExport: () => Promise<ExportOutcome>;
  readonly onShare: (file: WrittenFile) => Promise<void>;
  /** A phone with nothing to share to gets the files and no button that leads nowhere. */
  readonly canShare: boolean;
}

type State =
  | { readonly at: 'waiting' }
  | { readonly at: 'making' }
  | { readonly at: 'made'; readonly outcome: ExportOutcome }
  | { readonly at: 'failed' };

export function ExportScreen({ onBack, onExport, onShare, canShare }: Props): ReactNode {
  const [state, setState] = useState<State>({ at: 'waiting' });

  const make = useCallback(() => {
    setState({ at: 'making' });

    onExport()
      .then((outcome) => setState({ at: 'made', outcome }))
      .catch(() => setState({ at: 'failed' }));
  }, [onExport]);

  const made = state.at === 'made' ? state.outcome : undefined;

  return (
    <View style={styles.screen} testID={exportScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={styles.back}
          testID={exportBackTestID}
        >
          <Text style={styles.backLabel}>{exportCopy.back}</Text>
        </Pressable>

        <Text accessibilityRole="header" style={styles.title}>
          {exportCopy.title}
        </Text>
        <Text style={styles.line}>{exportCopy.what}</Text>
        <Text style={styles.line}>{exportCopy.where}</Text>

        <Pressable
          accessibilityRole="button"
          disabled={state.at === 'making'}
          onPress={make}
          style={styles.action}
          testID={exportActionTestID}
        >
          <Text style={styles.actionLabel}>
            {state.at === 'making' ? exportCopy.making : made ? exportCopy.again : exportCopy.make}
          </Text>
        </Pressable>

        {state.at === 'failed' ? (
          <Text style={styles.failed} testID={exportFailedTestID}>
            {exportCopy.failed}
          </Text>
        ) : null}

        {made ? (
          <View style={styles.made}>
            <Text style={styles.held} testID={exportHeldTestID}>
              {heldSentence(made.days, made.cycles)}
            </Text>
            {made.files.map((file) => (
              <View key={file.name} style={styles.file} testID={exportFileTestID(file.name)}>
                <Text style={styles.fileName}>{file.name}</Text>
                {canShare ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void onShare(file);
                    }}
                    style={styles.share}
                    testID={exportShareTestID(file.name)}
                  >
                    <Text style={styles.shareLabel}>{exportCopy.share}</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: colour.ember,
    borderRadius: radius.chip,
    justifyContent: 'center',
    marginTop: space.base,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.base,
  },
  actionLabel: {
    color: colour.surface,
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
  },
  back: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  backLabel: {
    color: colour.body,
    fontSize: typeScale.small.size,
    lineHeight: typeScale.small.lineHeight,
  },
  body: { paddingBottom: space.roomy, paddingHorizontal: space.base, paddingTop: space.snug },
  failed: {
    color: colour.ember,
    fontSize: typeScale.small.size,
    lineHeight: typeScale.small.lineHeight,
    marginTop: space.snug,
  },
  file: {
    alignItems: 'center',
    backgroundColor: colour.surface,
    borderRadius: radius.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.tight,
    paddingHorizontal: space.snug,
    paddingVertical: space.tight,
  },
  fileName: {
    color: colour.ink,
    fontSize: typeScale.small.size,
    lineHeight: typeScale.small.lineHeight,
  },
  held: {
    color: colour.body,
    fontSize: typeScale.small.size,
    lineHeight: typeScale.small.lineHeight,
  },
  line: {
    color: colour.body,
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
    marginTop: space.tight,
  },
  made: { marginTop: space.base },
  screen: { backgroundColor: colour.stone, flex: 1 },
  share: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.tight,
  },
  shareLabel: {
    color: colour.ember,
    fontSize: typeScale.small.size,
    lineHeight: typeScale.small.lineHeight,
  },
  title: {
    color: colour.ink,
    fontSize: typeScale.title.size,
    letterSpacing: typeScale.title.letterSpacing,
    lineHeight: typeScale.title.lineHeight,
    marginTop: space.tight,
  },
});
