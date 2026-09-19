import { colour, textStyle } from '@emi/tokens';

import { markupOf } from '../screens/asHtml.ts';

/**
 * The renderer turns a rendered React Native tree into markup. A field is the part a picture used
 * to lose: the value and the placeholder are props rather than children, so a sheet full of fields
 * drew as a row of empty boxes and said she had typed nothing.
 */

interface Field {
  readonly value?: string;
  readonly placeholder?: string;
}

function field({ value, placeholder }: Field): unknown {
  return {
    type: 'TextInput',
    props: {
      value,
      placeholder,
      placeholderTextColor: colour.onSurfaceVariant,
      style: { color: colour.onSurface, ...textStyle('body-lg') },
    },
    children: null,
  };
}

describe('a picture of a screen draws what a field holds', () => {
  describe('a field she has typed into', () => {
    it('draws what she typed', () => {
      expect(markupOf(field({ value: '36.8', placeholder: '36.5' }))).toContain('>36.8<');
    });

    it('leaves the placeholder out, so the picture shows one number and not two', () => {
      expect(markupOf(field({ value: '36.8', placeholder: '36.5' }))).not.toContain('36.5');
    });

    it('keeps the colour the field names for text she typed', () => {
      expect(markupOf(field({ value: '36.8' }))).toContain(`color: ${colour.onSurface}`);
    });
  });

  describe('a field she has not typed into', () => {
    it('draws the placeholder instead', () => {
      expect(markupOf(field({ value: '', placeholder: 'Search symptoms' }))).toContain(
        '>Search symptoms<',
      );
    });

    it('draws the placeholder in the colour the field asks for, which is fainter', () => {
      const drawn = markupOf(field({ value: '', placeholder: 'Search symptoms' }));

      expect(drawn).toContain(`color: ${colour.onSurfaceVariant}`);
      expect(drawn.lastIndexOf(`color: ${colour.onSurfaceVariant}`)).toBeGreaterThan(
        drawn.indexOf(`color: ${colour.onSurface}`),
      );
    });

    it('draws an empty box when there is no placeholder either', () => {
      expect(markupOf(field({}))).toContain('></div>');
    });
  });

  describe('a node the renderer has no case for', () => {
    it('still keeps its children on the page', () => {
      const unknown = { type: 'RCTSomethingElse', props: {}, children: ['a word'] };

      expect(markupOf(unknown)).toContain('a word');
    });
  });
});
