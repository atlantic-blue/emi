import type { Language } from '@/app/words';

/** One price and one address, in every language the site serves. */

export const theOnePrice: Readonly<Record<Language, string>> = { en: '', ru: '', es: '' };

export const theOneAmount = '';

export const theOneHost = '';

export function whoseWordsAreIn(file: string): Language | null {
  return file.length === 0 ? null : null;
}

export function amountsOfMoneyIn(text: string): string[] {
  return text.length === 0 ? [] : [];
}

export function theAmountOf(said: string): string {
  return said;
}

export function hostsIn(text: string): string[] {
  return text.length === 0 ? [] : [];
}

export interface WhatOneFileSays {
  readonly file: string;
  readonly text: string;
}

export function problemsWithWhatItCosts(said: WhatOneFileSays): string[] {
  return said.text.length === 0 ? [] : [];
}

export function problemsWithTheAddress(said: WhatOneFileSays): string[] {
  return said.text.length === 0 ? [] : [];
}
