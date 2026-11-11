import type { Language } from '../app/words';

import { WHAT_SHE_STARTED_ENTRY, whereAPressTakesHer } from '../lib/theProviderSignIn';
import {
  THE_SESSION_ENTRY,
  holdTheSession,
  letTheSessionGo,
  theSessionHeld,
  whenTheSessionChanges,
} from '../lib/theSessionSheHolds';
import {
  theEntryFor,
  whereAPressTakesHer as whereAPressOnTelegramTakesHer,
} from '../lib/theTelegramSignIn';

/**
 * Where a signed in woman's tokens are kept, and what every tab of her browser reads.
 *
 * The session is one entry in `localStorage`, so a second tab reads the session the first tab
 * wrote and a woman who closes the tab and comes back is still signed in. The values a sign in
 * keeps while it waits for a provider stay in the store of the one tab that started it, and the
 * last case below holds them there.
 *
 * These cases run where the cryptography of the platform is, because a press on a provider makes a
 * digest and a document standing in for a browser offers none. That leaves the run without a
 * window and without either store, so both are stood in here, with the five things a browser's own
 * store answers.
 */

function aStoreOfItsOwn(): Storage {
  const held = new Map<string, string>();

  return {
    get length() {
      return held.size;
    },
    clear: () => held.clear(),
    getItem: (name: string) => held.get(name) ?? null,
    key: (at: number) => [...held.keys()][at] ?? null,
    removeItem: (name: string) => held.delete(name) as unknown as void,
    setItem: (name: string, value: string) => held.set(name, value) as unknown as void,
  };
}

/** Every tab of one browser reads one `localStorage`, so one store stands in for all of them. */
const acrossTabs = aStoreOfItsOwn();

/** The store of the one tab, which is where a sign in keeps what it is waiting on. */
const inTheTab = aStoreOfItsOwn();

/**
 * What a browser tells a page when another tab writes a store. The listeners are kept here so a
 * case can say what the other tab did and the page can read it, which is what a browser does.
 */
const theListeners = new Set<(said: StorageEvent) => void>();

function anotherTabChanged(said: { key: string | null; newValue: string | null }): void {
  for (const listener of [...theListeners]) {
    listener(said as StorageEvent);
  }
}

globalThis.sessionStorage = inTheTab;
globalThis.window = {
  localStorage: acrossTabs,
  sessionStorage: inTheTab,
  addEventListener: (named: string, listener: (said: StorageEvent) => void) => {
    if (named === 'storage') {
      theListeners.add(listener);
    }
  },
  removeEventListener: (named: string, listener: (said: StorageEvent) => void) => {
    if (named === 'storage') {
      theListeners.delete(listener);
    }
  },
} as unknown as Window & typeof globalThis;

const THE_ORIGIN = 'https://myemi.app';

const theTokens = {
  idToken: 'an-id-token',
  accessToken: 'an-access-token',
  refreshToken: 'a-refresh-token',
};

describe('the session a woman holds while she reads the site', () => {
  beforeEach(() => {
    acrossTabs.clear();
    inTheTab.clear();
    theListeners.clear();
  });

  describe('where a sign in leaves her tokens', () => {
    it('writes one entry every tab of her browser reads, and no entry the tab takes with it', () => {
      holdTheSession(theTokens);

      expect(JSON.parse(acrossTabs.getItem(THE_SESSION_ENTRY) ?? 'null')).toEqual(theTokens);
      expect(inTheTab.getItem(THE_SESSION_ENTRY)).toBeNull();
      expect(acrossTabs.length).toBe(1);
    });

    it('reads back what a sign in in another tab wrote, because the store is the browser', () => {
      acrossTabs.setItem(THE_SESSION_ENTRY, JSON.stringify(theTokens));

      expect(theSessionHeld()).toEqual(theTokens);
    });

    it('signs her out by removing that one entry, and the tokens are gone from the browser', () => {
      holdTheSession(theTokens);
      letTheSessionGo();

      expect(theSessionHeld()).toBeNull();
      expect(acrossTabs.getItem(THE_SESSION_ENTRY)).toBeNull();
      expect(acrossTabs.length).toBe(0);
    });
  });

  describe('a woman who signed in before the session moved', () => {
    it('stays signed in: the first read moves her entry to the store every tab reads', () => {
      inTheTab.setItem(THE_SESSION_ENTRY, JSON.stringify(theTokens));

      expect(theSessionHeld()).toEqual(theTokens);
      expect(JSON.parse(acrossTabs.getItem(THE_SESSION_ENTRY) ?? 'null')).toEqual(theTokens);
      expect(inTheTab.getItem(THE_SESSION_ENTRY)).toBeNull();
    });

    it('leaves nothing behind for a second read, so a sign out cannot be undone by the old place', () => {
      inTheTab.setItem(THE_SESSION_ENTRY, JSON.stringify(theTokens));

      expect(theSessionHeld()).toEqual(theTokens);

      letTheSessionGo();

      expect(theSessionHeld()).toBeNull();
      expect(inTheTab.length).toBe(0);
    });

    it('reads nothing where neither store holds the entry', () => {
      expect(theSessionHeld()).toBeNull();
      expect(acrossTabs.length).toBe(0);
      expect(inTheTab.length).toBe(0);
    });
  });

  describe('what another tab tells this one', () => {
    it('reports a sign out, and the page then reads her as signed out', () => {
      const told: ('signed in' | 'signed out')[] = [];
      const stop = whenTheSessionChanges(() => {
        told.push(theSessionHeld() === null ? 'signed out' : 'signed in');
      });

      holdTheSession(theTokens);
      acrossTabs.removeItem(THE_SESSION_ENTRY);
      anotherTabChanged({ key: THE_SESSION_ENTRY, newValue: null });

      expect(told).toEqual(['signed out']);

      stop();
    });

    it('reports a sign in, and the page then reads her as signed in', () => {
      const told: ('signed in' | 'signed out')[] = [];
      const stop = whenTheSessionChanges(() => {
        told.push(theSessionHeld() === null ? 'signed out' : 'signed in');
      });

      acrossTabs.setItem(THE_SESSION_ENTRY, JSON.stringify(theTokens));
      anotherTabChanged({ key: THE_SESSION_ENTRY, newValue: JSON.stringify(theTokens) });

      expect(told).toEqual(['signed in']);

      stop();
    });

    it('says nothing about another entry of the same browser', () => {
      let told = 0;
      const stop = whenTheSessionChanges(() => {
        told += 1;
      });

      anotherTabChanged({ key: 'emi.something-else', newValue: 'a value' });

      expect(told).toBe(0);

      stop();
    });

    it('counts a browser emptying its storage, which names nothing and takes the session', () => {
      let told = 0;
      const stop = whenTheSessionChanges(() => {
        told += 1;
      });

      anotherTabChanged({ key: null, newValue: null });

      expect(told).toBe(1);

      stop();
    });

    it('stops reporting once the page lets go, so a page nobody reads is told nothing', () => {
      let told = 0;
      const stop = whenTheSessionChanges(() => {
        told += 1;
      });

      stop();
      anotherTabChanged({ key: THE_SESSION_ENTRY, newValue: null });

      expect(told).toBe(0);
      expect(theListeners.size).toBe(0);
    });
  });

  describe('what a sign in keeps while it waits for a provider', () => {
    it('keeps the verifier, the state and the nonce in the one tab that started it', async () => {
      const languages: readonly Language[] = ['en', 'ru', 'es'];

      await whereAPressTakesHer('SignInWithApple', 'en', THE_ORIGIN);

      for (const language of languages) {
        await whereAPressOnTelegramTakesHer(language, THE_ORIGIN);
      }

      const theEntriesOfOneTab = [
        WHAT_SHE_STARTED_ENTRY,
        ...languages.map((language) => theEntryFor(language)),
      ];

      for (const entry of theEntriesOfOneTab) {
        const kept = JSON.parse(inTheTab.getItem(entry) ?? 'null') as {
          verifier?: string;
          state?: string;
          nonce?: string;
        } | null;

        expect({ entry, kept: kept === null }).toEqual({ entry, kept: false });
        expect(typeof kept?.verifier).toBe('string');
        expect(typeof kept?.state).toBe('string');
        expect(acrossTabs.getItem(entry)).toBeNull();
      }

      // The nonce travels with a Telegram press and not with the other two, so it is read on the
      // entry that carries it rather than on all four.
      const telegram = JSON.parse(inTheTab.getItem(theEntryFor('en')) ?? 'null') as {
        nonce?: string;
      };

      expect(typeof telegram.nonce).toBe('string');
      // The session is the one thing the store every tab reads holds, and the four kept values
      // are the only thing the store of this tab holds.
      expect(inTheTab.length).toBe(theEntriesOfOneTab.length);
      expect(acrossTabs.length).toBe(0);
    });
  });
});
