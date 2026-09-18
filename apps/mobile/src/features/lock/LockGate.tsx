import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, StyleSheet, View } from 'react-native';

import { useDatabase } from '../../data/DatabaseProvider';
import { Cover } from './Cover';
import { LockScreen } from './LockScreen';
import { phoneLock } from './deviceLock';
import { lockOnReturnIsOn } from './lockSetting';

export const screensTestID = 'lock-screens';

/** Built once, and it reaches the phone only when Emi asks it something. */
const lock = phoneLock();

interface Props {
  readonly children: ReactNode;
}

/**
 * The lock, and the cover the lock is worth nothing without.
 *
 * Emi decides to lock on the way out rather than on the way back, because asking the phone what it
 * can do takes a turn of the event loop and a screen drawn during that turn is a screen a stranger
 * reads. So the moment Emi leaves the foreground it is already locked, and coming back is only the
 * question of getting past the phone.
 *
 * The screens stay mounted underneath and are given `display: none`, which takes them out of the
 * layout entirely rather than drawing something over them. What the operating system then puts in
 * its own switcher is the operating system's business, and step 8 of this feature measures it on a
 * phone.
 */
export function LockGate({ children }: Props): ReactNode {
  const database = useDatabase();
  const [covered, setCovered] = useState(false);
  const [locked, setLocked] = useState(false);
  const [wasRefused, setWasRefused] = useState(false);
  const isLocked = useRef(false);
  const isAsking = useRef(false);

  const unlock = useCallback(() => {
    isLocked.current = false;
    setLocked(false);
    setWasRefused(false);
  }, []);

  const askThePhone = useCallback(async (): Promise<void> => {
    if (isAsking.current) {
      return;
    }
    isAsking.current = true;

    try {
      // A phone with nothing enrolled cannot be asked, and a lock it cannot open is a woman shut
      // out of her own history by an application she trusted with it.
      if (!(await lock.canAsk())) {
        unlock();

        return;
      }
      if ((await lock.ask()) === 'unlocked') {
        unlock();

        return;
      }
      setWasRefused(true);
    } finally {
      isAsking.current = false;
    }
  }, [unlock]);

  useEffect(() => {
    const onChange = (next: AppStateStatus): void => {
      if (next === 'active') {
        setCovered(false);

        if (isLocked.current) {
          void askThePhone();
        }

        return;
      }

      // Android never reports inactive, so the cover goes on for anything that is not active and
      // not only for the state iOS sends on its way out.
      setCovered(true);

      if (next === 'background' && lockOnReturnIsOn(database)) {
        isLocked.current = true;
        setLocked(true);
        setWasRefused(false);
      }
    };

    const subscription = AppState.addEventListener('change', onChange);

    return () => subscription.remove();
  }, [askThePhone, database]);

  return (
    <View style={styles.gate}>
      <View
        accessibilityElementsHidden={covered || locked}
        importantForAccessibility={covered || locked ? 'no-hide-descendants' : 'auto'}
        style={covered || locked ? styles.away : styles.here}
        testID={screensTestID}
      >
        {children}
      </View>
      {covered ? <Cover /> : null}
      {!covered && locked ? (
        <LockScreen onUnlock={() => void askThePhone()} wasRefused={wasRefused} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  away: { display: 'none' },
  gate: { flex: 1 },
  here: { flex: 1 },
});
