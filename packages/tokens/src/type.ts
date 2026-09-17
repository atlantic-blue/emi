export type FaceName = 'heading' | 'text' | 'numeric';

export const face: Readonly<Record<FaceName, string>> = {
  heading: 'Fraunces',
  text: 'Plus Jakarta Sans',
  numeric: 'IBM Plex Mono',
};

export type TypeSizeName = 'display' | 'title' | 'heading' | 'body' | 'small' | 'label';

export interface TypeStyle {
  readonly size: number;
  readonly lineHeight: number;
  readonly face: FaceName;
  readonly letterSpacing: number;
}

export const typeScale: Readonly<Record<TypeSizeName, TypeStyle>> = {
  display: { size: 34, lineHeight: 41, face: 'heading', letterSpacing: 0 },
  title: { size: 26, lineHeight: 32, face: 'heading', letterSpacing: 0 },
  heading: { size: 20, lineHeight: 26, face: 'heading', letterSpacing: 0 },
  body: { size: 16, lineHeight: 24, face: 'text', letterSpacing: 0 },
  small: { size: 14, lineHeight: 20, face: 'text', letterSpacing: 0 },
  label: { size: 12, lineHeight: 16, face: 'numeric', letterSpacing: 0.48 },
};

export const typeSizeNames: readonly TypeSizeName[] = [
  'display',
  'title',
  'heading',
  'body',
  'small',
  'label',
];

export const LINE_HEIGHT_FLOOR = 1.2;
