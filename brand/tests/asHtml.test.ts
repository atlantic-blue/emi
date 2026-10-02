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
      placeholderTextColor: colour.secondaryText,
      style: { color: colour.text, ...textStyle('body-lg') },
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
      expect(markupOf(field({ value: '36.8' }))).toContain(`color: ${colour.text}`);
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

      expect(drawn).toContain(`color: ${colour.secondaryText}`);
      expect(drawn.lastIndexOf(`color: ${colour.secondaryText}`)).toBeGreaterThan(
        drawn.indexOf(`color: ${colour.text}`),
      );
    });

    it('draws an empty box when there is no placeholder either', () => {
      expect(markupOf(field({}))).toContain('></div>');
    });
  });

  describe('a rounded box inside a drawing', () => {
    // The lock of the icon set is a rectangle and a path. Without a case for the rectangle the
    // drawing came out as the shackle alone, hanging over nothing, and the picture said the
    // application drew a lock with no body.
    const aRoundedBox = {
      type: 'RNSVGRect',
      props: { x: 4.5, y: 10.25, width: 15, height: 10.25, rx: 2 },
      children: [],
    };

    it('is drawn with its own geometry, and its corner', () => {
      const drawn = markupOf(aRoundedBox);

      expect(drawn).toContain('<rect');
      expect(drawn).toContain('x="4.5"');
      expect(drawn).toContain('width="15"');
      expect(drawn).toContain('height="10.25"');
      expect(drawn).toContain('rx="2"');
    });

    it('is left unfilled, so a stroked outline is not drawn as a blot', () => {
      expect(markupOf(aRoundedBox)).toContain('fill="none"');
    });
  });

  // Without these three cases the gradients fell through to a plain box, so a wash drew as nothing
  // at all and the picture said the application paints no colour at the top of the screen.
  describe('a gradient inside a drawing', () => {
    /** The wash of the period phase, as react-native-svg hands it down: packed, and flattened. */
    const theField = {
      type: 'RNSVGLinearGradient',
      props: {
        name: 'wash-field-gradient',
        x1: '0',
        y1: '0',
        x2: '0',
        y2: '1',
        gradient: [0, -8996, 1, -1805],
      },
      children: [],
    };

    const aTint = {
      type: 'RNSVGRadialGradient',
      props: {
        name: 'wash-tint-1-gradient',
        cx: '85%',
        cy: '0%',
        rx: '120%',
        ry: '70%',
        gradient: [0, -10566, 0.6, 16766650],
      },
      children: [],
    };

    it('writes a gradient under the name a shape can reach it by', () => {
      expect(markupOf(theField)).toContain('<linearGradient id="wash-field-gradient"');
      expect(markupOf(aTint)).toContain('<radialGradient id="wash-tint-1-gradient"');
    });

    it('unpacks each stop into its place, its colour and how much of it is there', () => {
      const drawn = markupOf(theField);

      expect(drawn).toContain('offset="0"');
      expect(drawn).toContain(`stop-color="${colour.accentSoft.toLowerCase()}"`);
      expect(drawn).toContain('offset="1"');
      expect(drawn).toContain(`stop-color="${colour.ground.toLowerCase()}"`);
      expect(drawn).toContain('stop-opacity="1"');
    });

    it('keeps a tint fading to nothing, rather than dropping the alpha and drawing a band', () => {
      const drawn = markupOf(aTint);

      expect(drawn).toContain('offset="0.6"');
      expect(drawn).toContain('stop-opacity="0"');
      expect(drawn.match(new RegExp(colour.washAmber.toLowerCase(), 'g'))).toHaveLength(2);
    });

    // A browser draws a circle where react-native-svg draws an ellipse, so the same ellipse is
    // written as the unit circle under a transform. Both radii have to survive that or the tint
    // comes out round.
    it('writes the ellipse as a transform, so both radii survive', () => {
      const drawn = markupOf(aTint);

      expect(drawn).toContain('gradientTransform="translate(0.85 0) scale(1.2 0.7)"');
      expect(drawn).toContain('r="1"');
      expect(drawn).not.toContain('rx=');
    });

    it('points a shape at the gradient it is painted with', () => {
      const painted = {
        type: 'RNSVGRect',
        props: {
          x: '0',
          y: '0',
          width: '100%',
          height: '100%',
          fill: { type: 1, brushRef: 'wash-field-gradient' },
          propList: ['fill'],
        },
        children: [],
      };

      expect(markupOf(painted)).toContain('fill="url(#wash-field-gradient)"');
      expect(markupOf(painted)).not.toContain('fill="none"');
    });

    it('keeps the gradients inside the definitions they were declared in', () => {
      const defs = { type: 'RNSVGDefs', props: {}, children: [theField, aTint] };
      const drawn = markupOf(defs);

      expect(drawn.startsWith('<defs>')).toBe(true);
      expect(drawn).toContain('<linearGradient');
      expect(drawn).toContain('<radialGradient');
    });
  });
  describe('a node the renderer has no case for', () => {
    it('still keeps its children on the page', () => {
      const unknown = { type: 'RCTSomethingElse', props: {}, children: ['a word'] };

      expect(markupOf(unknown)).toContain('a word');
    });
  });
});
