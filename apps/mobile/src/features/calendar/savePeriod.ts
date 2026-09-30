/**
 * One save of a whole period. Not built yet.
 */

export interface TheDaysSheIsHolding {
  /** The days Emi holds as her period, which is what the picker opened with. */
  readonly held: readonly string[];
  /** The days she is holding now, after every press. */
  readonly ticked: readonly string[];
}

export interface WhatSheChanged {
  readonly added: readonly string[];
  readonly removed: readonly string[];
}

export function whatSheChanged(_holding: TheDaysSheIsHolding): WhatSheChanged {
  return { added: [], removed: [] };
}
