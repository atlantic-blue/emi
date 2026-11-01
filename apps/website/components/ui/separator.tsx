import * as SeparatorPrimitive from '@radix-ui/react-separator';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** The hairline between a part of a page and the part under it. It is not drawn yet. */
export function Separator({ className, ...rest }: ComponentProps<typeof SeparatorPrimitive.Root>) {
  return <SeparatorPrimitive.Root className={cn('', className)} {...rest} />;
}
