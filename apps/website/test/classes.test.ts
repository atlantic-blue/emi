import { colour, stroke, typeScale } from '@emi/tokens';

import { cn } from '../lib/utils';
import { declarationsOf, stylesheetFor } from './stylesheet';

/**
 * Tailwind writes a type size and a text colour with the same word, and a border width and a
 * border colour with the same word. The join that keeps the last class where two of them set the
 * same thing has to know which names Emi gave to what. Told nothing, it reads
 * `text-headline-lg text-text` as one setting and throws the size away, and the page then draws a
 * headline at the size it inherited with nobody the wiser.
 */

const longEnoughToCompile = 60_000;

describe('joining the classes a component was built with and the ones a page hands it', () => {
  it('keeps a type size and a text colour, because they are two settings', () => {
    expect(cn('text-headline-lg text-text')).toBe('text-headline-lg text-text');
  });

  it('keeps a border width and a border colour, for the same reason', () => {
    expect(cn('border-hairline border-line')).toBe('border-hairline border-line');
  });

  it('drops the earlier of two sizes, and of two colours', () => {
    expect(cn('text-body-lg', 'text-body-sm')).toBe('text-body-sm');
    expect(cn('text-text', 'text-secondaryText')).toBe('text-secondaryText');
  });

  it('drops the earlier of two border widths, and of two border colours', () => {
    expect(cn('border-hairline', 'border-icon')).toBe('border-icon');
    expect(cn('border-line', 'border-accent')).toBe('border-accent');
  });

  it('drops the earlier of two corners, and of two gaps', () => {
    expect(cn('rounded-xxl', 'rounded-sm')).toBe('rounded-sm');
    expect(cn('p-margin', 'p-spaceSm')).toBe('p-spaceSm');
  });

  it(
    'leaves a kept pair drawing both things, which is the whole point of keeping them',
    async () => {
      const kept = cn('text-headline-lg text-text border-hairline border-line');
      const stylesheet = await stylesheetFor(kept.split(' '));
      const drawn = kept
        .split(' ')
        .map((name) => declarationsOf(stylesheet, name))
        .join(' ');

      expect(drawn).toContain(`font-size: ${typeScale['headline-lg'].size}px`);
      expect(drawn).toContain(`color: ${colour.text}`);
      expect(drawn).toContain(`border-width: ${stroke.hairline}px`);
      expect(drawn).toContain(`border-color: ${colour.line}`);
    },
    longEnoughToCompile,
  );
});
