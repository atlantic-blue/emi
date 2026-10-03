import { type IconName, MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, SecondaryButton } from '../../components/Button';
import { LockLine } from '../../components/LockLine';
import { RoundIconButton } from '../../components/RoundIconButton';
import { Screen } from '../../components/Screen';
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

/** The header of the screen, which the drawing names as the part the title sits inside. */
export const exportHeaderTestID = 'export-header';

/** The title in that header. */
export const exportTitleTestID = 'export-title';

/** The line that says what the two files are. */
export const exportWhatTestID = 'export-what';

/** The card the two files are read back on, once she has asked for them. */
export const exportMadeTestID = 'export-made';

/** The line that says nothing is sent anywhere, with a lock beside it. */
export const exportLockLineTestID = 'export-lock-line';

/** The two files, as the two tiles the prototype draws above the card. */
export const theExportTiles = ['doctor', 'application'] as const;

export type ExportTile = (typeof theExportTiles)[number];

/** One of those tiles, named so a test can read the ground behind it and the words on it. */
export function exportTileTestID(tile: ExportTile): string {
  return `export-tile-${tile}`;
}

export function exportFileTestID(name: string): string {
  return `export-file-${name}`;
}

export function exportShareTestID(name: string): string {
  return `export-share-${name}`;
}

/** What each tile says and what it is drawn with: a page to read, and a file to hand over. */
const theTiles: Readonly<Record<ExportTile, { readonly icon: IconName; readonly label: string }>> =
  {
    doctor: { icon: 'note', label: exportCopy.forADoctor },
    application: { icon: 'export', label: exportCopy.forAnApplication },
  };

/** Points. The drawing on a tile, read larger than a row's, because a tile has room for it. */
const TILE_ICON = 30;

/** Points. The room the way back takes, kept on the other side so the title stays in the middle. */
const THE_ROOM_A_WAY_BACK_TAKES = 44;

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

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

function FileTile({ tile }: { readonly tile: ExportTile }): ReactNode {
  const { icon, label } = theTiles[tile];

  return (
    <View style={styles.tile} testID={exportTileTestID(tile)}>
      <Icon colour={colour.accent} name={icon} size={TILE_ICON} />
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

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
    <Screen drawsTheWash testID={exportScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header} testID={exportHeaderTestID}>
          <View style={styles.backMark}>
            <RoundIconButton
              accessibilityLabel={exportCopy.back}
              icon="chevron"
              onPress={onBack}
              testID={exportBackTestID}
            />
          </View>
          <Text accessibilityRole="header" style={styles.title} testID={exportTitleTestID}>
            {exportCopy.title}
          </Text>
          <View style={styles.evenUp} />
        </View>

        <Text style={styles.what} testID={exportWhatTestID}>
          {exportCopy.what}
        </Text>

        <View style={styles.tiles}>
          {theExportTiles.map((tile) => (
            <FileTile key={tile} tile={tile} />
          ))}
        </View>

        {state.at === 'failed' ? (
          <Text style={styles.failed} testID={exportFailedTestID}>
            {exportCopy.failed}
          </Text>
        ) : null}

        {made ? (
          <View style={styles.made} testID={exportMadeTestID}>
            <Text style={styles.held} testID={exportHeldTestID}>
              {heldSentence(made.days, made.cycles)}
            </Text>
            {made.files.map((file) => (
              <View key={file.name} style={styles.file} testID={exportFileTestID(file.name)}>
                <Text style={styles.fileName}>{file.name}</Text>
                {canShare ? (
                  <SecondaryButton
                    label={exportCopy.share}
                    onPress={() => {
                      void onShare(file);
                    }}
                    testID={exportShareTestID(file.name)}
                  />
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        <LockLine testID={exportLockLineTestID} words={exportCopy.where} />

        <View style={styles.foot}>
          <PrimaryButton
            isReady={state.at !== 'making'}
            label={
              state.at === 'making' ? exportCopy.making : made ? exportCopy.again : exportCopy.make
            }
            onPress={make}
            testID={exportActionTestID}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backMark: { transform: TURNED_AROUND },
  body: {
    flexGrow: 1,
    paddingBottom: space.spaceXl,
    paddingHorizontal: space.margin,
    paddingTop: space.spaceLg,
    rowGap: space.spaceLg,
  },
  evenUp: { width: THE_ROOM_A_WAY_BACK_TAKES },
  failed: {
    color: colour.accent,
    ...textStyle('body-sm'),
  },
  file: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: MINIMUM_TAP_TARGET,
  },
  fileName: {
    color: colour.text,
    flexShrink: 1,
    ...textStyle('body-sm'),
  },
  // The one thing at the foot of the screen, which the pill is held down to by the room above it.
  foot: { marginTop: 'auto' },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  held: {
    color: colour.text,
    ...textStyle('choice-lg'),
  },
  made: {
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    padding: space.spaceLg,
    rowGap: space.spaceMd,
  },
  tile: {
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    flexBasis: 0,
    flexGrow: 1,
    padding: space.spaceLg,
    rowGap: space.spaceMd,
  },
  tileLabel: {
    color: colour.text,
    ...textStyle('choice-lg'),
  },
  tiles: { columnGap: space.spaceMd, flexDirection: 'row' },
  title: {
    color: colour.text,
    textAlign: 'center',
    ...textStyle('headline-sm'),
  },
  what: {
    color: colour.text,
    ...textStyle('body-lg'),
  },
});
