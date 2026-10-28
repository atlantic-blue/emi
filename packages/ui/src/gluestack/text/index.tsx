import React from 'react';

import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';

import { CappedText } from '../../CappedText';
import { textStyle } from './styles';

/**
 * Copied in from gluestack-ui, with two changes: the size is not defaulted, and the text is drawn
 * through CappedText.
 *
 * gluestack defaults it to `md`, which is its own `text-base` at sixteen points, and that sits on
 * top of whatever role the design system asked for. Emi has eleven text roles of its own and no
 * screen wants a twelfth, so a size arrives only when a caller names one.
 */

type ITextProps = React.ComponentProps<typeof CappedText> & VariantProps<typeof textStyle>;

const Text = React.forwardRef<React.ComponentRef<typeof CappedText>, ITextProps>(function Text(
  {
    className,
    isTruncated,
    bold,
    underline,
    strikeThrough,
    size,
    sub,
    italic,
    highlight,
    ...props
  },
  ref,
) {
  return (
    <CappedText
      className={textStyle({
        isTruncated: isTruncated as boolean,
        bold: bold as boolean,
        underline: underline as boolean,
        strikeThrough: strikeThrough as boolean,
        size,
        sub: sub as boolean,
        italic: italic as boolean,
        highlight: highlight as boolean,
        class: className,
      })}
      {...props}
      ref={ref}
    />
  );
});

Text.displayName = 'Text';

export { Text };
