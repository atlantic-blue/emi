import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { SettingsScreen } from '../../../features/settings/SettingsScreen';

export default function SettingsRoute(): ReactNode {
  const router = useRouter();

  return (
    <SettingsScreen
      onAnswers={() => router.push('/settings/answers')}
      onBack={() => router.back()}
      onDelete={() => router.push('/settings/delete')}
      onExport={() => router.push('/export')}
    />
  );
}
