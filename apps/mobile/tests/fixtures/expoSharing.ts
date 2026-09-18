/**
 * The sharing sheet, which is the one moment anything she wrote leaves Emi. There is no sheet off
 * a phone, so this records what the application asked to hand over and a test reads it back.
 */

export interface SharingRequest {
  readonly url: string;
  readonly options: unknown;
}

const asked: SharingRequest[] = [];

let available = true;

export async function isAvailableAsync(): Promise<boolean> {
  return await Promise.resolve(available);
}

export async function shareAsync(url: string, options: unknown = {}): Promise<void> {
  asked.push({ url, options });

  return await Promise.resolve();
}

/** Everything the application handed to the sheet, in the order it did. */
export function whatWasShared(): readonly SharingRequest[] {
  return [...asked];
}

/** A phone with nothing to share to, which is what the module reports on a simulator. */
export function thePhoneCannotShare(): void {
  available = false;
}

export function resetExpoSharing(): void {
  asked.length = 0;
  available = true;
}
