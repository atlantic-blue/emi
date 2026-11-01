import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** The one control that acts. It is not drawn yet. */
export const buttonVariants = cva('', {
  variants: { tone: { accent: '', quiet: '' } },
  defaultVariants: { tone: 'accent' },
});

export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

export function Button({ className, tone, type = 'button', ...rest }: ButtonProps) {
  return <button className={cn(buttonVariants({ tone }), className)} type={type} {...rest} />;
}
