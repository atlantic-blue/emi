import type { Metadata } from 'next';

/** The privacy policy. Nothing is built yet: the tests above it are. */
export async function generateMetadata(_asked: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  return {};
}

export default async function PrivacyPolicyPage(_asked: { params: Promise<{ lang: string }> }) {
  return <main />;
}
