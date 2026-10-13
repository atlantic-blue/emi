import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback } from 'react';

import { HighlightPage } from '../../features/highlight/HighlightPage';
import { highlightFor } from '../../features/highlight/highlights';

/** The page one highlight opens. An address that names no highlight goes back to Today. */
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

  if (highlight === undefined) {
    return <Redirect href="/" />;
  }

  return <HighlightPage highlight={highlight} onBack={leave} />;
}
