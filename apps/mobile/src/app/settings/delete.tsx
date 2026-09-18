import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { DeleteEverything, type DeleteStage } from '../../features/settings/DeleteEverything';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { expoKeychain } from '../../services/vault/keychain';
import { useRenewVault } from '../../services/vault/VaultProvider';
import { deleteEverything, nothingIsLeft } from '../../services/vault/wipe';

/**
 * One press empties the database and the keychain. Nothing is queued, scheduled or held back for a
 * grace period, so there is no state here between asking and it being done other than the wait on
 * the keychain, which is the only asynchronous part.
 *
 * What it says afterwards is read back off the storage rather than taken from the call returning,
 * because the application reporting that it deleted something is not evidence that it did.
 *
 * Starting again reads the keychain for a key and finds none, so one is made, and the first run
 * asks her the two questions it asked the first time.
 */
export default function DeleteRoute(): ReactNode {
  const database = useDatabase();
  const renewVault = useRenewVault();
  const { reread } = useFirstRun();
  const router = useRouter();
  const [stage, setStage] = useState<DeleteStage>('ready');

  const onDelete = (): void => {
    setStage('working');
    void deleteEverything(database, expoKeychain())
      .then((outcome) => setStage(nothingIsLeft(outcome) ? 'deleted' : 'refused'))
      // A delete that raised is a delete that did not finish, and a screen still reading Deleting
      // would leave her with no way to tell and nothing to press.
      .catch(() => setStage('refused'));
  };

  const onStartAgain = (): void => {
    void renewVault().then(() => {
      reread();
      router.replace('/');
    });
  };

  return (
    <DeleteEverything
      onBack={() => router.back()}
      onDelete={onDelete}
      onStartAgain={onStartAgain}
      stage={stage}
    />
  );
}
