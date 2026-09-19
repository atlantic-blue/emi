import { canonicalBytes, canonicalJson, fromCanonicalBytes } from '@emi/crypto';

import { bytesFromHex, check, hexFromBytes, sameValue } from '../harness';

/**
 * Canonical json is what the cipher seals, so its bytes have to be the same on a phone and in the
 * service. It reaches `TextEncoder` and `TextDecoder`, and a bare engine has neither, which is why
 * `prelude.ts` puts them back.
 */
export function collectCanonicalCases(): void {
  check('sorts the keys of an object and writes no whitespace', () => {
    sameValue(
      canonicalJson({ day: '2026-03-14', bleedingIsUnexpected: true, energy: 3 }),
      '{"bleedingIsUnexpected":true,"day":"2026-03-14","energy":3}',
      'one record gives one text',
    );
  });

  check('reads its own bytes back to the value they came from', () => {
    const read = fromCanonicalBytes(canonicalBytes({ note: 'a quiet day', energy: 2 })) as {
      note: string;
      energy: number;
    };

    sameValue(read.note, 'a quiet day', 'the note survives');
    sameValue(read.energy, 2, 'the number survives');
  });

  /**
   * The encoder in `prelude.ts` stands in for the one Hermes provides at 0.17, so it is held to
   * known bytes rather than to itself. A round trip through one encoder and its own decoder would
   * pass with both halves wrong.
   */
  check('writes the bytes the encoding rules give, not the ones a round trip would hide', () => {
    sameValue(hexFromBytes(canonicalBytes('a')), '226122', 'plain text');
    sameValue(hexFromBytes(canonicalBytes('é')), '22c3a922', 'two bytes for an accented letter');
    sameValue(hexFromBytes(canonicalBytes('€')), '22e282ac22', 'three bytes for a currency sign');
    sameValue(
      hexFromBytes(canonicalBytes('🩸')),
      '22f09fa9b822',
      'four bytes outside the basic plane',
    );
  });

  check('reads those same bytes back as the text they stand for', () => {
    sameValue(fromCanonicalBytes(bytesFromHex('22f09fa9b822')), '🩸', 'a pair comes back as one');
    sameValue(fromCanonicalBytes(bytesFromHex('22c3a922')), 'é', 'an accented letter comes back');
  });

  check('refuses a value that json cannot carry', () => {
    let refused = '';

    try {
      canonicalJson({ recordedAt: new Date(0) } as never);
    } catch (thrown) {
      refused = (thrown as { refusal?: string }).refusal ?? '';
    }

    sameValue(refused, 'value-is-not-json', 'a date would be written as an empty object');
  });
}
