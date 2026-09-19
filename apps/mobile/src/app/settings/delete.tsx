import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { DeleteEverything, type DeleteStage } from '../../features/settings/DeleteEverything';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { serverAccountDelete } from '../../services/sync/deleteAccount';
import { expoKeychain } from '../../services/vault/keychain';
import { useRenewVault } from '../../services/vault/VaultProvider';
import {
  deleteEverything,
  nothingIsLeft,
  theServerCopyWentToo,
  type WipeOutcome,
} from '../../services/vault/wipe';

/**
 * What the delete left her with, read from the storage rather than from the calls that ran. A
 * keychain that kept an item comes first, because that is the one she can do something about by
 * pressing again, and an unreached server is not: her key has gone with her days.
 */
function whatSheIsLeftWith(outcome: WipeOutcome): DeleteStage {
  if (!nothingIsLeft(outcome)) {
    return 'refused';
  }

  return theServerCopyWentToo(outcome) ? 'deleted' : 'deleted-without-the-server';
}

/**
 * One press takes the account off the server and empties the database and the keychain. Nothing is
 * queued, scheduled or held back for a grace period, so there is no state here between asking and
 * it being done other than the two waits, on the network and on the keychain.
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
    const keychain = expoKeychain();

    setStage('working');
    void deleteEverything(database, keychain, serverAccountDelete(keychain))
      .then((outcome) => setStage(whatSheIsLeftWith(outcome)))
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
