import { colour } from '@emi/tokens';

/**
 * The mark of the product, drawn inside the page: the letters EMI inside the open ring, white on
 * the one colour that acts. The community chose it in issue 331.
 *
 * It is drawn here rather than asked for as a file because Next.js refuses a plain picture element
 * and the element it offers instead writes a style on itself, which the content security policy of
 * this site refuses. So the drawing travels in the markup, which also costs her browser one request
 * fewer.
 *
 * The two outlines, the canvas and the transform are the ones in
 * `apps/mobile/assets/icon/emi-icon.svg`, the file the application ships and the file the approved
 * board draws. The scenario of step 26.19 reads this copy against that file, so a redraw there says
 * this copy is behind.
 *
 * One picture with one name, so a reader whose software speaks the page aloud hears the product
 * named once rather than hearing three shapes described.
 *
 * The home page draws the mark a second time, beside the name of the person building Emi, and the
 * board gives that copy no name at all. There it is decoration standing next to the words it would
 * otherwise repeat, so it is drawn with nothing for a reader's software to read out.
 *
 * No namespace is declared on it. A browser reading this element inside a page already knows what
 * it is, and the site may name no other company, not even as the address of a specification.
 */
export function EmiIcon({
  className,
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <svg
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : 'Emi'}
      className={className}
      role={decorative ? undefined : 'img'}
      viewBox="0 0 1000 1000"
    >
      <rect fill={colour.accent} height="1000" width="1000" />
      <g transform="translate(0.3295 0.0856) scale(9.9934)">
        <path
          d="M76.81 72.5A35 35 0 1 1 85 50"
          fill="none"
          stroke={colour.onAccent}
          strokeWidth={7}
        />
        <path
          d="M40.54 59.5L28.56 59.5L28.56 41.3L40.41 41.3L40.41 45.15L32.74 45.15L32.74 48.48L39.17 48.48L39.17 52.19L32.74 52.19L32.74 55.65L40.54 55.65L40.54 59.5ZM48.51 59.5L44.32 59.5L44.32 41.3L48.92 41.3L53.76 48.48L58.62 41.3L63.22 41.3L63.22 59.5L59.04 59.5L59.04 47.8L53.78 55.5L48.51 47.8L48.51 59.5ZM71.44 59.5L67.26 59.5L67.26 41.3L71.44 41.3L71.44 59.5Z"
          fill={colour.onAccent}
        />
      </g>
    </svg>
  );
}
