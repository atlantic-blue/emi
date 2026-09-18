import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import {
  ExportScreen,
  exportActionTestID,
  exportBackTestID,
  exportFailedTestID,
  exportFileTestID,
  exportHeldTestID,
  exportShareTestID,
} from '../../../src/features/export/ExportScreen';
import type { WrittenFile } from '../../../src/features/export/destination';
import { exportCopy, heldSentence } from '../../../src/features/export/copy';
import type { ExportOutcome } from '../../../src/features/export/exportNow';

/**
 * The screen on its own, driven to the two states the route cannot easily reach: a phone that
 * cannot write the files, and a phone with nothing to share to.
 */

const theDocument: WrittenFile = {
  name: 'emi-2026-05-15.html',
  mediaType: 'text/html',
  uri: 'file:///cache/emi-2026-05-15.html',
  characters: 4096,
};

const theDataFile: WrittenFile = {
  name: 'emi-2026-05-15.json',
  mediaType: 'application/json',
  uri: 'file:///cache/emi-2026-05-15.json',
  characters: 8192,
};

const made: ExportOutcome = { files: [theDocument, theDataFile], days: 30, cycles: 7 };

interface Driven {
  readonly shared: WrittenFile[];
}

async function theScreen(make: () => Promise<ExportOutcome>, canShare = true): Promise<Driven> {
  const shared: WrittenFile[] = [];

  await render(
    <ExportScreen
      canShare={canShare}
      onBack={() => undefined}
      onExport={make}
      onShare={async (file) => {
        shared.push(file);
      }}
    />,
  );

  return { shared };
}

describe('the export screen', () => {
  describe('before she presses anything', () => {
    it('says what the two files are and that nothing is sent anywhere', async () => {
      await theScreen(() => Promise.resolve(made));

      expect(screen.getByText(exportCopy.what)).toBeTruthy();
      expect(screen.getByText(exportCopy.where)).toBeTruthy();
      expect(screen.queryByTestId(exportHeldTestID)).toBeNull();
      expect(screen.getByTestId(exportBackTestID)).toBeTruthy();
    });
  });

  describe('when the files are made', () => {
    it('names both of them and says how much they hold', async () => {
      await theScreen(() => Promise.resolve(made));

      await fireEvent.press(screen.getByTestId(exportActionTestID));

      await waitFor(() => expect(screen.getByTestId(exportHeldTestID)).toBeTruthy());
      expect(screen.getByTestId(exportHeldTestID)).toHaveTextContent(heldSentence(30, 7));
      expect(screen.getByTestId(exportFileTestID(theDocument.name))).toBeTruthy();
      expect(screen.getByTestId(exportFileTestID(theDataFile.name))).toBeTruthy();
    });

    it('hands one file over for each press of share', async () => {
      const driven = await theScreen(() => Promise.resolve(made));

      await fireEvent.press(screen.getByTestId(exportActionTestID));
      await waitFor(() => expect(screen.getByTestId(exportHeldTestID)).toBeTruthy());

      expect(driven.shared).toEqual([]);

      await fireEvent.press(screen.getByTestId(exportShareTestID(theDataFile.name)));

      expect(driven.shared).toEqual([theDataFile]);
    });

    it('offers no share on a phone that cannot share', async () => {
      await theScreen(() => Promise.resolve(made), false);

      await fireEvent.press(screen.getByTestId(exportActionTestID));

      await waitFor(() => expect(screen.getByTestId(exportHeldTestID)).toBeTruthy());
      expect(screen.getByTestId(exportFileTestID(theDocument.name))).toBeTruthy();
      expect(screen.queryByTestId(exportShareTestID(theDocument.name))).toBeNull();
    });
  });

  describe('when the phone cannot write them', () => {
    it('says so, and leaves her able to try again', async () => {
      await theScreen(() => Promise.reject(new Error('no room left on the device')));

      await fireEvent.press(screen.getByTestId(exportActionTestID));

      await waitFor(() => expect(screen.getByTestId(exportFailedTestID)).toBeTruthy());
      expect(screen.getByTestId(exportFailedTestID)).toHaveTextContent(exportCopy.failed);
      expect(screen.getByTestId(exportActionTestID)).toBeEnabled();
      expect(screen.queryByTestId(exportHeldTestID)).toBeNull();
    });
  });
});
