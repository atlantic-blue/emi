/** The file the site serves the mark from. The site serves no mark yet. */
export const WORDMARK_FILE = '';

/** The size the drawing is made at. */
export const WORDMARK_UNITS = { width: 0, height: 0 } as const;

/** A thin band at the top of every page. It carries nothing yet. */
export function SiteHeader() {
  return <header />;
}
