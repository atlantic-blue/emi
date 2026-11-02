import localFont from 'next/font/local';

/**
 * The three faces myemi.app serves, read from the files beside this workspace. No font service is
 * named here or anywhere else on the site: a face fetched from another company tells that company a
 * woman opened a page about periods.
 *
 * The files are the ones the approved board names in its own styles, so a page of the site measures
 * the same as the design it was drawn from. `packages/tokens/src/website.ts` holds which cut belongs
 * to which role, and `test/theme.test.ts` reads that against what the loader is asked for below.
 *
 * Every value is written out because the loader runs in the bundler and refuses anything it cannot
 * read as a literal, which is why the name of each custom property appears here as well as in
 * `lib/face.ts`.
 */

export const displayFont = localFont({
  src: [
    { path: '../assets/fonts/Newsreader16pt-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../assets/fonts/Newsreader16pt-Medium.ttf', weight: '500', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-emi-display',
});

export const textFont = localFont({
  src: [
    { path: '../assets/fonts/PlusJakartaSans-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../assets/fonts/PlusJakartaSans-SemiBold.ttf', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-emi-text',
});

export const dataFont = localFont({
  src: [{ path: '../assets/fonts/JetBrainsMono-Medium.ttf', weight: '500', style: 'normal' }],
  display: 'swap',
  variable: '--font-emi-data',
});

/** The three, in the order the roles are read, so a document can declare them all in one place. */
export const servedFonts = [displayFont, textFont, dataFont] as const;
