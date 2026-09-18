/**
 * The application asks the phone to hold a stranger out through expo-local-authentication, which
 * has no implementation off a phone. This stands in for it and answers what the module answers: an
 * enrolled level as a number, a result that is either a bare success or a success of false with a
 * named error, the module's own refusal of an empty prompt message, and its own defaults for the
 * two labels. A double that said yes where the phone says not_enrolled would make the suite green
 * over a woman shut out of her own history.
 */

/** The four levels the module exports. Emi reads only whether the level is NONE. */
export const SecurityLevel = {
  NONE: 0,
  SECRET: 1,
  BIOMETRIC_WEAK: 2,
  BIOMETRIC_STRONG: 3,
} as const;

export type LocalAuthenticationError =
  'not_enrolled' | 'user_cancel' | 'app_cancel' | 'lockout' | 'authentication_failed';

export type LocalAuthenticationResult = { success: true } | { success: false; error: string };

export interface LocalAuthenticationOptions {
  promptMessage?: string;
  cancelLabel?: string;
  disableDeviceFallback?: boolean;
}

/** The module's own words for a prompt message that is not a message. */
export const emptyPromptMessage =
  'LocalAuthentication.authenticateAsync : `options.promptMessage` must be a non-empty string.';

let enrolledLevel: number = SecurityLevel.BIOMETRIC_STRONG;
const answers: LocalAuthenticationResult[] = [];
const prompts: LocalAuthenticationOptions[] = [];

export async function getEnrolledLevelAsync(): Promise<number> {
  return await Promise.resolve(enrolledLevel);
}

export async function authenticateAsync(
  options: LocalAuthenticationOptions = {},
): Promise<LocalAuthenticationResult> {
  if (Object.prototype.hasOwnProperty.call(options, 'promptMessage')) {
    if (typeof options.promptMessage !== 'string' || options.promptMessage.length === 0) {
      throw new Error(emptyPromptMessage);
    }
  }

  prompts.push({
    ...options,
    promptMessage: options.promptMessage ?? 'Authenticate',
    cancelLabel: options.cancelLabel ?? 'Cancel',
  });

  // The phone refuses before it draws anything when there is nothing enrolled to ask for, whatever
  // the test queued after it.
  if (enrolledLevel === SecurityLevel.NONE) {
    return await Promise.resolve({ success: false, error: 'not_enrolled' });
  }

  const answer = answers.shift();

  if (answer === undefined) {
    throw new Error('the phone was asked to unlock and no test said what she does at the prompt');
  }

  return await Promise.resolve(answer);
}

/** A phone with a face or a fingerprint enrolled, which is the phone most women hold. */
export function thePhoneCanAsk(level: number = SecurityLevel.BIOMETRIC_STRONG): void {
  enrolledLevel = level;
}

/** A phone with no passcode, no fingerprint and no face. */
export function thePhoneHasNothingEnrolled(): void {
  enrolledLevel = SecurityLevel.NONE;
}

/** What she does at the prompt, in order, one for each time Emi asks. */
export function sheAnswersThePrompt(...given: readonly LocalAuthenticationResult[]): void {
  answers.push(...given);
}

export const unlocked: LocalAuthenticationResult = { success: true };
export const cancelled: LocalAuthenticationResult = { success: false, error: 'user_cancel' };

/** Every prompt Emi asked for, with the labels and the fallback it asked with. */
export function promptsAsked(): LocalAuthenticationOptions[] {
  return [...prompts];
}

/** A different phone: it has been asked nothing. */
export function resetExpoLocalAuthentication(): void {
  enrolledLevel = SecurityLevel.BIOMETRIC_STRONG;
  answers.length = 0;
  prompts.length = 0;
}
