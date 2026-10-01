import type { HerData } from './theStatesOfHerData';

/**
 * Every section of the screen she opens, and the rule that says when her own data fills it.
 * Nothing is built yet, so the record below is empty and it answers for no part of any screen.
 */

/** Which identifiers a part draws: the ones it draws once, and the ones it draws one of each. */
export interface Draws {
  readonly named?: readonly string[];
  readonly prefixed?: readonly string[];
}

export interface Section {
  readonly name: string;
  readonly draws: Draws;
  readonly insteadDraws?: Draws;
  readonly simplyGoes?: string;
  readonly fills: (hers: HerData) => boolean;
}

export function identifiersOf(_section: Section, _identifier: string): boolean {
  return false;
}

export const theSectionsOfTheScreenSheOpens: readonly Section[] = [];

export const theFrameOfTheScreenSheOpens: Draws = {};

/** One section as it stood at one state of her data. */
export interface Measured {
  readonly section: string;
  readonly state: string;
  readonly hers: boolean;
  readonly drawn: readonly string[];
  readonly instead: readonly string[];
  readonly owesASentence: boolean;
}

export function everySectionMeasured(_state: string, _hers: HerData): Measured[] {
  return [];
}

export function sectionsBreakingTheRule(_measured: readonly Measured[]): string[] {
  return [];
}

export function partsNoSectionAnswersFor(): string[] {
  return [];
}

export function sectionsClaimingTheSamePart(_drawn: readonly string[]): string[] {
  return [];
}
