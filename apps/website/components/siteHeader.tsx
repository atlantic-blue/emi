import Image from 'next/image';

/**
 * The file the site serves the mark from. It is the drawing in `brand/logo/emi-wordmark.svg`, and
 * `test/wordmark.test.ts` reads the two files against each other, so the one a browser asks for
 * cannot drift from the one the brand generates.
 */
export const WORDMARK_FILE = '/emi-wordmark.svg';

/** The size the drawing is made at. The same test reads these two against its own canvas. */
export const WORDMARK_UNITS = { width: 3002, height: 1879 } as const;

/**
 * A thin band at the top of every page, carrying the mark and nothing else. The mark is served by
 * this site, so a browser asks no other company for it, and it is not passed through the image
 * server: a drawing has no pixels to resize.
 */
export function SiteHeader() {
  return (
    <header className="bg-ground px-margin py-spaceMd">
      <a className="inline-flex items-center" href="/">
        <Image
          alt="Emi"
          className="h-spaceXl w-auto"
          height={WORDMARK_UNITS.height}
          priority
          src={WORDMARK_FILE}
          unoptimized
          width={WORDMARK_UNITS.width}
        />
      </a>
    </header>
  );
}
