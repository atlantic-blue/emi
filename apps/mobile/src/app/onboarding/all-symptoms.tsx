import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { theGroupsSheSeesFirst } from '../../features/log/herOrder';
import { LogSymptoms } from '../../features/log/LogSymptoms';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { firstRunCopy } from '../../features/onboarding/copy';

/**
 * Every symptom Emi knows, opened from the link under the six tiles of the last question. It is
 * the log's own screen, so she reads the same groups and names she will read on every day after.
 *
 * Nothing is written here. What she picks replaces her list for today in memory, and the hold
 * writes it with every other answer, so the first run still writes nothing before the hold.
 */
export default function AllSymptomsRoute(): ReactNode {
  const router = useRouter();
  const { symptoms, focus, chooseSymptoms } = useFirstRun();

  return (
    <LogSymptoms
      asked={{ groups: theGroupsSheSeesFirst(focus), opensOn: 'groups' }}
      focus={focus}
      held={symptoms}
      leave="back"
      onLeave={() => router.back()}
      onSave={(picked) => {
        chooseSymptoms(picked);
        router.back();
      }}
      title={firstRunCopy.today.header}
    />
  );
}
