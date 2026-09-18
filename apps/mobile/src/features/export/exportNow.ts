import type { Database } from '../../data/database';
import type { DayVault } from '../../services/vault/dayVault';
import type { ExportDestination, WrittenFile } from './destination';
import { type Everything, everythingIn, rowCount } from './everything';
import { bothFiles } from './files';
import { cycleTable, dayLogTable } from './readableDocument';

/**
 * The whole export, from the database to two files on the phone. It runs on her own device and
 * touches no network, which is the promise the feature exists to keep.
 */

export interface ExportOutcome {
  readonly files: readonly WrittenFile[];
  readonly days: number;
  readonly cycles: number;
}

export async function exportEverything(
  database: Database,
  vault: DayVault,
  destination: ExportDestination,
  now: Date,
): Promise<ExportOutcome> {
  const everything: Everything = everythingIn(database, vault, now);
  const files: WrittenFile[] = [];

  for (const file of bothFiles(everything, now)) {
    files.push(await destination.write(file));
  }

  return {
    files,
    days: rowCount(everything, dayLogTable),
    cycles: rowCount(everything, cycleTable),
  };
}
