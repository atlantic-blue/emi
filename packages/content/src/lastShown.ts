/**
 * The one thing the phone remembers about her reading: which article she was last shown, by its
 * slug, and the instant she was shown it.
 *
 * The row is plain text on the phone, so what it holds is what a reader of that file learns. It
 * names a piece of general writing anybody can fetch. It carries no cycle phase, because a phase
 * is a statement about her body, and no title and no body, because the words she read are not a
 * thing the file has to hold.
 *
 * The row does not stand in for the article. A screen is handed what the reader fetched, which is
 * held in this process and not on the disk.
 */

/** One row on the phone, and the only thing it records about her reading. */
export interface LastShownArticle {
  /** The slug, which is stable across a rewording, so a reworded piece is not shown to her twice. */
  readonly id: string;
  /** When she was shown it, as an instant in the format the rest of Emi writes instants in. */
  readonly readAt: string;
}

/** Where that row lives. The application supplies one built on its own storage. */
export interface LastShownStore {
  read(): Promise<LastShownArticle | null>;
  write(shown: LastShownArticle): Promise<void>;
}

/** The row as it is written, which is one line of json holding an identifier and an instant. */
export function writtenLastShown(shown: LastShownArticle): string {
  return JSON.stringify({ id: shown.id, readAt: shown.readAt });
}

/**
 * The row read back, or nothing. Storage is read as untrusted: a line that is not json, or that
 * holds something other than the two fields written above, answers nothing rather than throwing on
 * the draw that reads it.
 *
 * A row written before the phase came out of it carries no identifier, so it reads back as nothing
 * too, and the article is fetched again.
 */
export function readLastShown(written: string): LastShownArticle | null {
  let held: unknown = null;

  try {
    held = JSON.parse(written);
  } catch {
    return null;
  }

  if (held === null || typeof held !== 'object' || Array.isArray(held)) {
    return null;
  }

  const fields = held as Record<string, unknown>;

  if (!readable(fields.id) || !readable(fields.readAt)) {
    return null;
  }

  return { id: fields.id, readAt: fields.readAt };
}

function readable(given: unknown): given is string {
  return typeof given === 'string' && given.trim().length > 0;
}
