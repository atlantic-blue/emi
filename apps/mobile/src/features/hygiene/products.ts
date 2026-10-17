import { type WordKey, words } from '../../language';

/**
 * The hygiene products, from the hygieneProducts and hygieneCup boards (issue 304). Each one has a
 * page in the pattern of the cup: who it suits, its advantages, its disadvantages, and short steps.
 *
 * The cup text is the board's. The text of the other seven is draft text in the same pattern, plain
 * and factual, and none of it is medical advice.
 */

export type ProductSlug =
  | 'panty-liner'
  | 'pad'
  | 'reusable-cloth-pad'
  | 'tampon'
  | 'period-underwear'
  | 'menstrual-cup'
  | 'menstrual-disc'
  | 'sponge';

/** The products in the order the board draws them. */
export const productOrder: readonly ProductSlug[] = [
  'panty-liner',
  'pad',
  'reusable-cloth-pad',
  'tampon',
  'period-underwear',
  'menstrual-cup',
  'menstrual-disc',
  'sponge',
];

/**
 * The keys of the words of one product. Each list holds three lines and the guide five steps, as
 * the cup board does.
 */
interface ProductWords<Key extends string> {
  readonly name: Key;
  readonly summary: Key;
  readonly suits: readonly [Key, Key, Key];
  readonly advantages: readonly [Key, Key, Key];
  readonly disadvantages: readonly [Key, Key, Key];
  readonly steps: readonly [Key, Key, Key, Key, Key];
  readonly note: Key;
}

type ProductKey =
  'pantyLiner' | 'pad' | 'clothPad' | 'tampon' | 'periodUnderwear' | 'cup' | 'disc' | 'sponge';

const keyOf: Readonly<Record<ProductSlug, ProductKey>> = {
  'panty-liner': 'pantyLiner',
  pad: 'pad',
  'reusable-cloth-pad': 'clothPad',
  tampon: 'tampon',
  'period-underwear': 'periodUnderwear',
  'menstrual-cup': 'cup',
  'menstrual-disc': 'disc',
  sponge: 'sponge',
};

const productWords: Readonly<Record<ProductKey, ProductWords<WordKey>>> = {
  pantyLiner: {
    name: 'hygiene.pantyLiner.name',
    summary: 'hygiene.pantyLiner.summary',
    suits: [
      'hygiene.pantyLiner.suits.1',
      'hygiene.pantyLiner.suits.2',
      'hygiene.pantyLiner.suits.3',
    ],
    advantages: [
      'hygiene.pantyLiner.advantages.1',
      'hygiene.pantyLiner.advantages.2',
      'hygiene.pantyLiner.advantages.3',
    ],
    disadvantages: [
      'hygiene.pantyLiner.disadvantages.1',
      'hygiene.pantyLiner.disadvantages.2',
      'hygiene.pantyLiner.disadvantages.3',
    ],
    steps: [
      'hygiene.pantyLiner.steps.1',
      'hygiene.pantyLiner.steps.2',
      'hygiene.pantyLiner.steps.3',
      'hygiene.pantyLiner.steps.4',
      'hygiene.pantyLiner.steps.5',
    ],
    note: 'hygiene.pantyLiner.note',
  },
  pad: {
    name: 'hygiene.pad.name',
    summary: 'hygiene.pad.summary',
    suits: ['hygiene.pad.suits.1', 'hygiene.pad.suits.2', 'hygiene.pad.suits.3'],
    advantages: [
      'hygiene.pad.advantages.1',
      'hygiene.pad.advantages.2',
      'hygiene.pad.advantages.3',
    ],
    disadvantages: [
      'hygiene.pad.disadvantages.1',
      'hygiene.pad.disadvantages.2',
      'hygiene.pad.disadvantages.3',
    ],
    steps: [
      'hygiene.pad.steps.1',
      'hygiene.pad.steps.2',
      'hygiene.pad.steps.3',
      'hygiene.pad.steps.4',
      'hygiene.pad.steps.5',
    ],
    note: 'hygiene.pad.note',
  },
  clothPad: {
    name: 'hygiene.clothPad.name',
    summary: 'hygiene.clothPad.summary',
    suits: ['hygiene.clothPad.suits.1', 'hygiene.clothPad.suits.2', 'hygiene.clothPad.suits.3'],
    advantages: [
      'hygiene.clothPad.advantages.1',
      'hygiene.clothPad.advantages.2',
      'hygiene.clothPad.advantages.3',
    ],
    disadvantages: [
      'hygiene.clothPad.disadvantages.1',
      'hygiene.clothPad.disadvantages.2',
      'hygiene.clothPad.disadvantages.3',
    ],
    steps: [
      'hygiene.clothPad.steps.1',
      'hygiene.clothPad.steps.2',
      'hygiene.clothPad.steps.3',
      'hygiene.clothPad.steps.4',
      'hygiene.clothPad.steps.5',
    ],
    note: 'hygiene.clothPad.note',
  },
  tampon: {
    name: 'hygiene.tampon.name',
    summary: 'hygiene.tampon.summary',
    suits: ['hygiene.tampon.suits.1', 'hygiene.tampon.suits.2', 'hygiene.tampon.suits.3'],
    advantages: [
      'hygiene.tampon.advantages.1',
      'hygiene.tampon.advantages.2',
      'hygiene.tampon.advantages.3',
    ],
    disadvantages: [
      'hygiene.tampon.disadvantages.1',
      'hygiene.tampon.disadvantages.2',
      'hygiene.tampon.disadvantages.3',
    ],
    steps: [
      'hygiene.tampon.steps.1',
      'hygiene.tampon.steps.2',
      'hygiene.tampon.steps.3',
      'hygiene.tampon.steps.4',
      'hygiene.tampon.steps.5',
    ],
    note: 'hygiene.tampon.note',
  },
  periodUnderwear: {
    name: 'hygiene.periodUnderwear.name',
    summary: 'hygiene.periodUnderwear.summary',
    suits: [
      'hygiene.periodUnderwear.suits.1',
      'hygiene.periodUnderwear.suits.2',
      'hygiene.periodUnderwear.suits.3',
    ],
    advantages: [
      'hygiene.periodUnderwear.advantages.1',
      'hygiene.periodUnderwear.advantages.2',
      'hygiene.periodUnderwear.advantages.3',
    ],
    disadvantages: [
      'hygiene.periodUnderwear.disadvantages.1',
      'hygiene.periodUnderwear.disadvantages.2',
      'hygiene.periodUnderwear.disadvantages.3',
    ],
    steps: [
      'hygiene.periodUnderwear.steps.1',
      'hygiene.periodUnderwear.steps.2',
      'hygiene.periodUnderwear.steps.3',
      'hygiene.periodUnderwear.steps.4',
      'hygiene.periodUnderwear.steps.5',
    ],
    note: 'hygiene.periodUnderwear.note',
  },
  cup: {
    name: 'hygiene.cup.name',
    summary: 'hygiene.cup.summary',
    suits: ['hygiene.cup.suits.1', 'hygiene.cup.suits.2', 'hygiene.cup.suits.3'],
    advantages: [
      'hygiene.cup.advantages.1',
      'hygiene.cup.advantages.2',
      'hygiene.cup.advantages.3',
    ],
    disadvantages: [
      'hygiene.cup.disadvantages.1',
      'hygiene.cup.disadvantages.2',
      'hygiene.cup.disadvantages.3',
    ],
    steps: [
      'hygiene.cup.steps.1',
      'hygiene.cup.steps.2',
      'hygiene.cup.steps.3',
      'hygiene.cup.steps.4',
      'hygiene.cup.steps.5',
    ],
    note: 'hygiene.cup.note',
  },
  disc: {
    name: 'hygiene.disc.name',
    summary: 'hygiene.disc.summary',
    suits: ['hygiene.disc.suits.1', 'hygiene.disc.suits.2', 'hygiene.disc.suits.3'],
    advantages: [
      'hygiene.disc.advantages.1',
      'hygiene.disc.advantages.2',
      'hygiene.disc.advantages.3',
    ],
    disadvantages: [
      'hygiene.disc.disadvantages.1',
      'hygiene.disc.disadvantages.2',
      'hygiene.disc.disadvantages.3',
    ],
    steps: [
      'hygiene.disc.steps.1',
      'hygiene.disc.steps.2',
      'hygiene.disc.steps.3',
      'hygiene.disc.steps.4',
      'hygiene.disc.steps.5',
    ],
    note: 'hygiene.disc.note',
  },
  sponge: {
    name: 'hygiene.sponge.name',
    summary: 'hygiene.sponge.summary',
    suits: ['hygiene.sponge.suits.1', 'hygiene.sponge.suits.2', 'hygiene.sponge.suits.3'],
    advantages: [
      'hygiene.sponge.advantages.1',
      'hygiene.sponge.advantages.2',
      'hygiene.sponge.advantages.3',
    ],
    disadvantages: [
      'hygiene.sponge.disadvantages.1',
      'hygiene.sponge.disadvantages.2',
      'hygiene.sponge.disadvantages.3',
    ],
    steps: [
      'hygiene.sponge.steps.1',
      'hygiene.sponge.steps.2',
      'hygiene.sponge.steps.3',
      'hygiene.sponge.steps.4',
      'hygiene.sponge.steps.5',
    ],
    note: 'hygiene.sponge.note',
  },
};

export interface Product {
  readonly slug: ProductSlug;
  readonly name: string;
  readonly summary: string;
  readonly suits: readonly string[];
  readonly advantages: readonly string[];
  readonly disadvantages: readonly string[];
  readonly steps: readonly string[];
  /** The line under the steps, which sends her to the pack. */
  readonly note: string;
}

function read(keys: readonly WordKey[]): readonly string[] {
  return keys.map((key) => words(key));
}

/** One product, read in the language she reads now. */
export function productOf(slug: ProductSlug): Product {
  const keys = productWords[keyOf[slug]];

  return {
    slug,
    name: words(keys.name),
    summary: words(keys.summary),
    suits: read(keys.suits),
    advantages: read(keys.advantages),
    disadvantages: read(keys.disadvantages),
    steps: read(keys.steps),
    note: words(keys.note),
  };
}

/** The key of the one line summary of a product, for a screen that shows it under another name. */
export function productSummaryKey(slug: ProductSlug): WordKey {
  return productWords[keyOf[slug]].summary;
}

/** The product an address names, or nothing where it names none, because she can type one. */
export function productSlugFrom(text: string): ProductSlug | undefined {
  return productOrder.find((slug) => slug === text);
}

/** The address of the hygiene page, with the eight products. */
export const hygieneAddress = '/hygiene';

/** The address of "Find a product to try". */
export const quizAddress = `${hygieneAddress}/quiz`;

/** The address of the page of one product. */
export function productAddress(slug: ProductSlug): string {
  return `${hygieneAddress}/${slug}`;
}
