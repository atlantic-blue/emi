import type { WebsiteFaceName } from '@emi/tokens';

/**
 * The custom property that carries each family the font loader builds from the files in
 * `apps/website/assets/fonts`. The loader names the family itself, so these are the names the theme
 * and the document both hold, and they are plumbing rather than design values.
 *
 * `test/theme.test.ts` reads these against what the loader was asked for, because the loader runs
 * in the bundler and refuses to be handed a value it cannot read as a literal.
 */
export const SERVED_FACE_VARIABLES: Readonly<Record<WebsiteFaceName, string>> = {
  display: '--font-emi-display',
  text: '--font-emi-text',
  data: '--font-emi-data',
};
