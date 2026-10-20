import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { WhoCanSee } from '../../features/settings/WhoCanSee';

export default function WhoCanSeeRoute(): ReactNode {
  const router = useRouter();

  return <WhoCanSee onBack={() => router.back()} />;
}
