import * as SeparatorPrimitive from '@radix-ui/react-separator';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * The hairline between a part of a page and the part under it. It is drawn as a filled box of the
 * stroke the design system names, so the line and its thickness are both tokens.
 */
export function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...rest
}: ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      className={cn(
        'bg-line shrink-0',
        orientation === 'horizontal' ? 'h-hairline w-full' : 'h-full w-hairline',
        className,
      )}
      decorative={decorative}
      orientation={orientation}
      {...rest}
    />
  );
}
