import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback } from 'react';

import { ProductPage } from '../../features/hygiene/ProductPage';
import { hygieneAddress, productOf, productSlugFrom } from '../../features/hygiene/products';

/** The page of one product. An address that names no product goes to the Hygiene products page. */
export default function ProductRoute(): ReactNode {
  const router = useRouter();
  const { product } = useLocalSearchParams<{ product: string }>();
  const slug = productSlugFrom(String(product ?? ''));

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(hygieneAddress);
  }, [router]);

  if (slug === undefined) {
    return <Redirect href={hygieneAddress} />;
  }

  return <ProductPage onBack={leave} product={productOf(slug)} />;
}
