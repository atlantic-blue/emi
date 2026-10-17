import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback } from 'react';

import { HygieneProductsPage } from '../../features/hygiene/HygieneProductsPage';
import { productAddress, quizAddress } from '../../features/hygiene/products';

/** The Hygiene products page, with the eight products. */
export default function HygieneRoute(): ReactNode {
  const router = useRouter();

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  return (
    <HygieneProductsPage
      onBack={leave}
      onOpen={(slug) => router.push(productAddress(slug))}
      onQuiz={() => router.push(quizAddress)}
    />
  );
}
