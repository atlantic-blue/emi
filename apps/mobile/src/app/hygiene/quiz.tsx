import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback } from 'react';

import { HygieneQuiz } from '../../features/hygiene/HygieneQuiz';
import { hygieneAddress, productAddress } from '../../features/hygiene/products';

/** "Find a product to try": four questions, then two products to read about. */
export default function QuizRoute(): ReactNode {
  const router = useRouter();

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(hygieneAddress);
  }, [router]);

  return <HygieneQuiz onClose={leave} onOpen={(slug) => router.push(productAddress(slug))} />;
}
