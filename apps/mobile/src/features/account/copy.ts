import type { WhatWentWrong } from '@emi/sign-in';

import { words } from '../../language';
import { fullDate } from '../export/copy';
import type { TheWaySheSignedIn } from '../../services/signIn/herSignIn';

export const accountGateCopy = {
  title: words('account.gate.title'),
  apple: words('account.gate.apple'),
  google: words('account.gate.google'),
  telegram: words('account.gate.telegram'),
  or: words('account.gate.or'),
  email: words('account.gate.email'),
  sendCode: words('account.gate.sendCode'),
} as const;

export const accountEmailCodeCopy = {
  back: words('account.code.back'),
  label: words('account.code.label'),
  lasts: words('account.code.lasts'),
  anotherCodeIsOnItsWay: words('account.code.anotherCodeIsOnItsWay'),
  sendANewCode: words('account.code.sendANewCode'),
  useAnotherAddress: words('account.code.useAnotherAddress'),
  signIn: words('account.code.signIn'),
} as const;

export const accountCopy = {
  title: words('account.account.title'),
  back: words('account.account.back'),
  signedInWith: words('account.account.signedInWith'),
  email: words('account.account.email'),
  since: words('account.account.since'),
} as const;

export function theCodeWentTo(address: string): string {
  return words('account.code.sentTo', undefined, { address });
}

/** What she reads when a sign in does not go through, one sentence for each cause. */
export type AccountProblem = WhatWentWrong | 'addressIsNotValid' | 'needsTheCode';

const theSentenceFor: Readonly<Record<AccountProblem, string>> = {
  theCodeIsWrong: words('account.problem.codeIsWrong'),
  theCodeHasExpired: words('account.problem.codeHasExpired'),
  tooManyTries: words('account.problem.tooManyTries'),
  sheSignsInWithGoogleOrApple: words('account.problem.signsInWithGoogleOrApple'),
  nothingReachedTheService: words('account.problem.nothingReached'),
  addressIsNotValid: words('account.problem.addressIsNotValid'),
  needsTheCode: words('account.problem.needsTheCode'),
};

export function theProblemSaid(problem: AccountProblem): string {
  return theSentenceFor[problem];
}

const theWaySaid: Readonly<Record<TheWaySheSignedIn, string>> = {
  email: words('account.way.email'),
};

export function theWaySheSignedInSaid(way: TheWaySheSignedIn): string {
  return theWaySaid[way];
}

export function theDaySheSignedInSaid(since: string): string {
  return fullDate(since);
}
