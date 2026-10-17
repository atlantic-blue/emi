import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback } from 'react';

import { HighlightPage } from '../../features/highlight/HighlightPage';
import { highlightAddress, highlightFor } from '../../features/highlight/highlights';

/**
 * The page one highlight opens. Hygiene products has a page of its own, so its old address goes
 * there. An address that names no highlight goes back to Today.
 */
export default function HighlightRoute(): ReactNode {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const highlight = highlightFor(String(slug ?? ''));

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  if (slug === 'hygiene-products') {
    return <Redirect href={highlightAddress('hygiene-products')} />;
  }

  if (highlight === undefined) {
    return <Redirect href="/" />;
  }

  return <HighlightPage highlight={highlight} onBack={leave} />;
}
