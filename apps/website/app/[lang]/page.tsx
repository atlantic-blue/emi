import type { ReactNode } from 'react';

/** The home page of myemi.app, which is not built yet. */
export const PLACEHOLDER_ADDRESS = '/';

export default async function HomePage(_asked: {
  params: Promise<{ lang: string }>;
}): Promise<ReactNode> {
  throw new Error('myemi.app has no home page yet');
}
