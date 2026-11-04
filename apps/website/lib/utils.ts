import { radiusNames, spaceNames, stroke, typeRoleNames } from '@emi/tokens';
import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Tailwind writes a type size and a text colour with the same `text-` word, and a border width and
 * a border colour with the same `border-` word. Each pair is told apart by the value, so
 * `text-body-lg` is a size and `text-text` is a colour. The join below keeps the last class where
 * two of them set the same thing, and it has to be told which names Emi gave to a size, to a
 * stroke, to a corner and to a gap. Told nothing, it reads a pair as one setting and throws half
 * of it away, and it leaves two corners or two gaps both standing.
 *
 * A colour needs no entry of its own: a name that is not one of these is read as a colour, which
 * is what every one of them is. The lists come from `packages/tokens`, so a name added there is
 * understood here without a second list to keep.
 */
const merge = extendTailwindMerge({
  override: {
    classGroups: {
      'font-size': [{ text: [...typeRoleNames] }],
      'border-w': [{ border: Object.keys(stroke) }],
      rounded: [{ rounded: radiusNames.map((name) => (name === 'DEFAULT' ? '' : name)) }],
      p: [{ p: [...spaceNames] }],
    },
  },
});

/**
 * Joins the classes a component was built with and the classes a page hands it. A page can move a
 * component without the component holding a list of what a page might override.
 */
export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
