import { colourNames, typeRoleNames } from '@emi/tokens';

/**
 * What Tailwind's class merge has to be told about Emi.
 *
 * gluestack merges the classes a caller passes with the ones a component carries, and the merge
 * drops the earlier of two classes it believes set the same property. It reads Tailwind's own
 * names to decide that, so `text-label-sm` and `text-primary` look like the same class to it: one
 * a text size and one a text colour, both spelled `text-`. Left alone it keeps the colour and
 * silently drops the size, and every word in the product draws at the browser default.
 *
 * So the eleven roles and the palette are named here, read from the token package. The shape is
 * the one tailwind-merge version 1 takes, which is the copy tailwind-variants carries.
 */

/** The design system names a role in camel case, and Tailwind names it with hyphens. */
function hyphenated(name: string): string {
  return name.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`);
}

export const emiClasses = {
  classGroups: {
    'font-size': [{ text: [...typeRoleNames] }],
    'text-color': [{ text: colourNames.map(hyphenated) }],
  },
};

/** The configuration a copied component hands to `tva`, so every one of them merges the same way. */
export const emiMerge = { twMergeConfig: emiClasses };
