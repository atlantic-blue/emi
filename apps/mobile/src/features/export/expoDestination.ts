import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

import type { ExportDestination, WrittenFile } from './destination';
import type { ExportFile } from './files';

/**
 * The phone. The files go in the cache directory because they exist to be handed to somebody and
 * not to be kept: the operating system may clear it whenever it needs the room, and her record is
 * in the database either way.
 *
 * An export she takes twice in one day writes the same name twice, so the old file is replaced
 * rather than refused.
 */
export function expoDestination(): ExportDestination {
  return {
    write: async (file: ExportFile): Promise<WrittenFile> => {
      const written = new File(Paths.cache, file.name);

      if (written.exists) {
        written.delete();
      }

      written.create();
      written.write(file.text);

      return {
        name: file.name,
        mediaType: file.mediaType,
        uri: written.uri,
        characters: file.text.length,
      };
    },
    canShare: () => isAvailableAsync(),
    share: (file: WrittenFile) =>
      shareAsync(file.uri, { mimeType: file.mediaType, UTI: utiFor(file.mediaType) }),
  };
}

/**
 * What iOS calls the two kinds of file. Without it the sheet offers applications that cannot open
 * what she is sending.
 */
function utiFor(mediaType: string): string {
  return mediaType === 'application/json' ? 'public.json' : 'public.html';
}
