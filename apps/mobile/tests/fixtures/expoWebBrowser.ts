import type { HowTheSessionEnded } from '../../src/services/signIn/theTelegramSignIn';

/**
 * The authentication session of the phone, stood in for. Nothing opens and nothing reaches
 * Telegram: a test says how the session ends, and reads every session that was opened.
 */

/** One session that was opened, with the address it opened and the address it ends on. */
export interface ASessionThatOpened {
  readonly address: string;
  readonly endsOn: string;
}

type HowTheSessionEnds = (address: string) => Promise<HowTheSessionEnded>;

const opened: ASessionThatOpened[] = [];

let howItEnds: HowTheSessionEnds = () => Promise.resolve({ type: 'cancel' });

export async function openAuthSessionAsync(
  address: string,
  endsOn?: string | null,
): Promise<HowTheSessionEnded> {
  opened.push({ address, endsOn: endsOn ?? '' });

  return howItEnds(address);
}

export function sessionsThatOpened(): readonly ASessionThatOpened[] {
  return opened;
}

export function theSessionEnds(how: HowTheSessionEnds): void {
  howItEnds = how;
}

export function resetExpoWebBrowser(): void {
  opened.length = 0;
  howItEnds = () => Promise.resolve({ type: 'cancel' });
}
