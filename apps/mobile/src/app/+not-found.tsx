import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

/**
 * An address the application no longer holds, such as a link saved before a screen was removed,
 * goes to the index route. The index route then opens home, or the first run where she has not
 * finished it, so an old link never strands her on a page with no way on.
 */
export default function AnAddressEmiDoesNotHold(): ReactNode {
  return <Redirect href="/" />;
}
