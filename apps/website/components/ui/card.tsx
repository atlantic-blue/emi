import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** A section raised onto the page. It is not drawn yet. */
export function Card({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('', className)} {...rest} />;
}

export function CardHeader({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: ComponentProps<'h1'>) {
  return <h1 className={cn('', className)} {...rest} />;
}

export function CardDescription({ className, ...rest }: ComponentProps<'p'>) {
  return <p className={cn('', className)} {...rest} />;
}

export function CardContent({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('', className)} {...rest} />;
}
