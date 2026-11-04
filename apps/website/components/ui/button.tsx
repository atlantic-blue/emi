import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * The one control that acts, drawn as a capsule. `rounded-full` is the token the design system
 * names for a corner larger than any box Emi draws, which is how a capsule is made.
 *
 * The variants are exported on their own as well, because the way back from a page that does not
 * exist is a link and not a button, and a link that looks like a button is still a link.
 */
export const buttonVariants = cva(
  // A thumb is not a cursor, so the shortest side is the tap target contract SEE-3 names. The
  // colour moves under a pointer only where the reader has not asked for less motion, which is
  // contract SEE-4.
  'inline-flex min-h-marginLg items-center justify-center rounded-full px-marginMd py-spaceMd font-text text-button-lg motion-safe:transition-colors disabled:pointer-events-none disabled:text-disabledLabel',
  {
    variants: {
      tone: {
        accent: 'bg-accent text-onAccent hover:bg-accentPressed',
        quiet: 'bg-accentSoft text-accentSoftInk hover:bg-accentTile',
      },
    },
    defaultVariants: {
      tone: 'accent',
    },
  },
);

export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

export function Button({ className, tone, type = 'button', ...rest }: ButtonProps) {
  return <button className={cn(buttonVariants({ tone }), className)} type={type} {...rest} />;
}
