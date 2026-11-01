import localFont from 'next/font/local';

/**
 * The faces myemi.app serves, read from the files this repository already ships to the phone. No
 * font service is named here or anywhere else on the site: a face fetched from another company
 * tells that company a woman opened a page about periods.
 *
 * The display face and the text face are one family in `packages/tokens`, so one family is served
 * and the theme points both names at it. The data face is JetBrains Mono at 268 kilobytes, and no
 * page here draws a figure yet, so it is not served yet.
 *
 * Every value below is written out because the loader runs in the bundler and refuses anything it
 * cannot read as a literal, which is why the name of the custom property appears here as well as
 * in `lib/face.ts`. `test/theme.test.ts` reads the two against each other.
 */
export const servedFont = localFont({
  src: [
    {
      path: '../../mobile/assets/fonts/figtree/Figtree-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../mobile/assets/fonts/figtree/Figtree-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    { path: '../../mobile/assets/fonts/figtree/Figtree-Bold.ttf', weight: '700', style: 'normal' },
    {
      path: '../../mobile/assets/fonts/figtree/Figtree-ExtraBold.ttf',
      weight: '800',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-emi',
});
