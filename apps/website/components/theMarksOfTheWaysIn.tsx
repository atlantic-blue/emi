import { websiteColour, websiteMarkColour } from '@emi/tokens';

/**
 * The mark of Apple and the mark of Google, each as the approved board draws it in
 * `docs/design/website/sign-in/boards/SignIn.dc.html`.
 *
 * Each company fixes its own mark and publishes how it may be drawn, so neither one is redrawn
 * here and neither one is painted in a colour of Emi. The outlines, the canvas and the sizes are
 * the board's, byte for byte, and the browser scenario holds each press against the board.
 *
 * They travel in the markup rather than as a file, for the reason the mark of Emi does: the
 * element Next.js offers for a picture writes a style on itself, and the content policy of this
 * site refuses a style written on an element.
 *
 * Neither mark is named for a reader's software. The words beside it say which press it is, and a
 * name on the mark would have her software read the company twice.
 */

/** Apple asks for its mark in white, which is the ground a card of this site sits on. */
export function TheMarkOfApple() {
  return (
    <svg aria-hidden height="20" viewBox="0 0 17 20" width="17">
      <path
        d="M14.1 10.6c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.8-4.1zM11.6 3.1c.7-.9 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"
        fill={websiteColour.siteCard}
      />
    </svg>
  );
}

/** Google's mark is four colours, and each of the four is Google's own value. */
export function TheMarkOfGoogle() {
  return (
    <svg aria-hidden height="20" viewBox="0 0 48 48" width="20">
      <path
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        fill={websiteMarkColour.markGoogleRed}
      />
      <path
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        fill={websiteMarkColour.markGoogleBlue}
      />
      <path
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        fill={websiteMarkColour.markGoogleYellow}
      />
      <path
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        fill={websiteMarkColour.markGoogleGreen}
      />
    </svg>
  );
}
