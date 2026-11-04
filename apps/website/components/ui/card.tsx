import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * A section raised onto the plain surface. No border: the card is told apart from the warm paper
 * behind it by its own surface, which is how every card of the redesign is drawn.
 */
export function Card({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('rounded-xxl bg-card p-margin', className)} {...rest} />;
}

export function CardHeader({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-spaceSm', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: ComponentProps<'h1'>) {
  return <h1 className={cn('font-display text-headline-lg text-text', className)} {...rest} />;
}

export function CardDescription({ className, ...rest }: ComponentProps<'p'>) {
  return <p className={cn('font-text text-body-lg text-secondaryText', className)} {...rest} />;
}

export function CardContent({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-margin pt-margin', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('flex items-center gap-spaceMd pt-margin', className)} {...rest} />;
}
