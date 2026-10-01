import { publishedFigures } from '@emi/cycle';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback } from 'react';

import { FiguresScreen } from '../../features/cycle/CitationRow';

/**
 * The page that says where each published figure comes from. The list arrives from the arithmetic
 * package, so a figure that changes there changes this page and nothing has to be typed twice.
 */
export default function FiguresRoute(): ReactNode {
  const router = useRouter();

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  return <FiguresScreen figures={publishedFigures} onBack={leave} />;
}
