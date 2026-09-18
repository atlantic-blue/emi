import type { ExportFile } from './files';

/**
 * Where a made file goes. The application writes into the phone's own storage and hands the file
 * to the sharing sheet; a test writes into a directory of its own and reads the bytes back. Both
 * satisfy this, so the words and the walk above are proved against real files either way.
 */

export interface WrittenFile {
  readonly name: string;
  readonly mediaType: string;
  /** Where it landed, as the platform addresses it. */
  readonly uri: string;
  /** How much was written, so the screen can say something was rather than that nothing failed. */
  readonly characters: number;
}

export interface ExportDestination {
  write(file: ExportFile): Promise<WrittenFile>;
  /** Whether this phone can hand a file to another application at all. */
  canShare(): Promise<boolean>;
  share(file: WrittenFile): Promise<void>;
}
