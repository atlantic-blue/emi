import { createHmac } from 'node:crypto';

import {
  headerRefusalOf,
  signatureRefusalOf,
  signatureScheme,
  signatureWindowSeconds,
  signedPartsIn,
} from '../src/payments/stripeSignature';
import { signatureHeaderFor, theSigningSecret } from './fixtures/stripeDeliveries';

/**
 * The signature of one delivery, read on its own.
 *
 * Stripe signs the timestamp and the body together, so every case here signs the same way Stripe
 * does rather than against a value this file wrote down.
 */

const body = '{"id":"evt_000000000001","type":"invoice.paid"}';
const signedAt = new Date('2026-11-16T09:00:00.000Z');
const now = signedAt;

const header = (): string => signatureHeaderFor(body, theSigningSecret, signedAt);

describe('whether a delivery came from Stripe', () => {
  describe('the header, which is a list of pairs', () => {
    it('reads the timestamp and the signature out of it', () => {
      const parts = signedPartsIn(header());

      expect(parts.timestamp).toBe(String(Math.floor(signedAt.getTime() / 1000)));
      expect(parts.signatures).toHaveLength(1);
    });

    it('keeps every signature of this scheme, so a secret can be rolled without a refusal', () => {
      const parts = signedPartsIn(`t=1,${signatureScheme}=aa,${signatureScheme}=bb,v0=cc`);

      expect(parts.signatures).toEqual(['aa', 'bb']);
    });

    it('refuses a header with no timestamp, and one with no signature of this scheme', () => {
      expect(headerRefusalOf(`${signatureScheme}=aa`)).toBe('the-header-carries-no-timestamp');
      expect(headerRefusalOf('t=1,v0=aa')).toBe('the-header-carries-no-signature-of-this-scheme');
      expect(headerRefusalOf('t=not-a-number,v1=aa')).toBe('the-header-carries-no-timestamp');
      expect(headerRefusalOf(undefined)).toBe('no-signature-header');
      expect(headerRefusalOf('')).toBe('no-signature-header');
    });

    it('takes the header Stripe sends, so the shape check alone refuses nothing real', () => {
      expect(headerRefusalOf(header())).toBeNull();
    });
  });

  describe('the signature itself', () => {
    it('takes a delivery signed with the secret of this account', () => {
      expect(signatureRefusalOf(header(), body, theSigningSecret, now)).toBeNull();
    });

    it('refuses a delivery signed with another secret', () => {
      const other = signatureHeaderFor(body, 'another-signing-secret', signedAt);

      expect(signatureRefusalOf(other, body, theSigningSecret, now)).toBe(
        'the-signature-does-not-verify',
      );
    });

    it('refuses a body changed after it was signed, by one character', () => {
      expect(signatureRefusalOf(header(), `${body} `, theSigningSecret, now)).toBe(
        'the-signature-does-not-verify',
      );
    });

    it('refuses a signature that is not hexadecimal at all, rather than raising', () => {
      expect(
        signatureRefusalOf(`t=1,${signatureScheme}=not-hex`, body, theSigningSecret, now),
      ).toBe('the-signature-does-not-verify');
    });

    it('takes a delivery whose header carries the right signature beside a wrong one', () => {
      const signature = createHmac('sha256', theSigningSecret)
        .update(`${Math.floor(signedAt.getTime() / 1000)}.${body}`)
        .digest('hex');
      const rolling = `t=${Math.floor(signedAt.getTime() / 1000)},${signatureScheme}=${'0'.repeat(
        64,
      )},${signatureScheme}=${signature}`;

      expect(signatureRefusalOf(rolling, body, theSigningSecret, now)).toBeNull();
    });

    it('signs the timestamp with the body, so the same body at another instant does not verify', () => {
      const later = new Date(signedAt.getTime() + 1000);
      const moved = `t=${Math.floor(later.getTime() / 1000)},${
        signedPartsIn(header()).signatures[0] === undefined
          ? ''
          : `${signatureScheme}=${signedPartsIn(header()).signatures[0]}`
      }`;

      expect(signatureRefusalOf(moved, body, theSigningSecret, later)).toBe(
        'the-signature-does-not-verify',
      );
    });
  });

  describe('the window, which stops a delivery being replayed later', () => {
    it('takes a delivery signed inside the window', () => {
      const edge = new Date(signedAt.getTime() + signatureWindowSeconds * 1000);

      expect(signatureRefusalOf(header(), body, theSigningSecret, edge)).toBeNull();
    });

    it('refuses a delivery signed before it, in either direction', () => {
      const after = new Date(signedAt.getTime() + (signatureWindowSeconds + 1) * 1000);
      const before = new Date(signedAt.getTime() - (signatureWindowSeconds + 1) * 1000);

      for (const reading of [after, before]) {
        expect(signatureRefusalOf(header(), body, theSigningSecret, reading)).toBe(
          'the-delivery-is-not-from-now',
        );
      }
    });

    it('calls an unsigned delivery unsigned rather than old, because the timestamp is signed too', () => {
      const old = new Date(signedAt.getTime() - 86_400_000);
      const header = signatureHeaderFor(body, 'another-signing-secret', old);

      expect(signatureRefusalOf(header, body, theSigningSecret, now)).toBe(
        'the-signature-does-not-verify',
      );
    });
  });
});
