import { type ProfileRecord, type RandomSource, openProfile, sealProfile } from '@emi/crypto';

/**
 * The vault key, bound to the two things the application does with her profile. It is the sibling
 * of `DayVault` and not the same object: a day and a profile are different shapes with different
 * bounds, and one vault that sealed either would let a day reach the profile table.
 */
export interface ProfileVault {
  /** Her answers, as the envelope that goes in the payload column. */
  seal(profile: ProfileRecord): Uint8Array;
  /** The envelope in the payload column, as her answers. */
  open(payload: Uint8Array): ProfileRecord;
}

/**
 * The random source is a required argument for the reason `dayVault` states: Hermes has no
 * `globalThis.crypto`, so a vault built without a source seals in every test and refuses on her
 * phone, and a required argument makes the compiler name the call site that forgot it.
 */
export function profileVault(key: Uint8Array, random: RandomSource): ProfileVault {
  return {
    seal: (profile) => sealProfile(profile, key, { random }),
    open: (payload) => openProfile(payload, key),
  };
}
