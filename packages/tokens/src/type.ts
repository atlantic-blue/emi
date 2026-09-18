/**
 * Three faces, each with a job: the serif carries a heading, the humanist sans carries running
 * text, and the monospaced face carries a number so a digit does not shift as it changes.
 */
export type FaceName = 'heading' | 'text' | 'numeric';

/**
 * The family the design names. The cut that ships can be a narrower one, and `fonts` carries that
 * name, so the two are not the same string.
 */
export const face: Readonly<Record<FaceName, string>> = {
  heading: 'Fraunces',
  text: 'Plus Jakarta Sans',
  numeric: 'IBM Plex Mono',
};

/** Six sizes. A screen that wants a seventh is saying something one of the six already says. */
export type TypeSizeName = 'display' | 'title' | 'heading' | 'body' | 'small' | 'label';

/**
 * A size never travels without its line height and its face, because a line height chosen at the
 * call site is the one that drifts.
 */
export interface TypeStyle {
  readonly size: number;
  readonly lineHeight: number;
  readonly face: FaceName;
  readonly letterSpacing: number;
}

/**
 * Points. Every line height is at least `LINE_HEIGHT_FLOOR` times its size, and a test holds it
 * there.
 */
export const typeScale: Readonly<Record<TypeSizeName, TypeStyle>> = {
  display: { size: 34, lineHeight: 41, face: 'heading', letterSpacing: 0 },
  title: { size: 26, lineHeight: 32, face: 'heading', letterSpacing: 0 },
  heading: { size: 20, lineHeight: 26, face: 'heading', letterSpacing: 0 },
  body: { size: 16, lineHeight: 24, face: 'text', letterSpacing: 0 },
  small: { size: 14, lineHeight: 20, face: 'text', letterSpacing: 0 },
  label: { size: 12, lineHeight: 16, face: 'numeric', letterSpacing: 0.48 },
};

/** The scale as data, from the largest size to the smallest. */
export const typeSizeNames: readonly TypeSizeName[] = [
  'display',
  'title',
  'heading',
  'body',
  'small',
  'label',
];

/**
 * A multiple of the size. Under this a line sits too close to the one beneath it, and the running
 * text is where it is felt first.
 */
export const LINE_HEIGHT_FLOOR = 1.2;
