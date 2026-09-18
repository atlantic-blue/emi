import { createHash, createPublicKey, verify as nodeVerify } from 'node:crypto';

import { base64Of, bytesFromBase64 } from '../src/base64';
import {
  accountIdFor,
  accountIdLength,
  bodyHashOf,
  crockfordAlphabet,
  crockfordBase32,
  decoyPublicKey,
  deviceKeyLength,
  deviceKeyPairFrom,
  instantAt,
  instantIsFresh,
  instantWindowSeconds,
  newDeviceKeyPair,
  presentedSignatureIn,
  refusalMessages,
  signatureVerifies,
  signedHeaders,
  signingString,
  signRequest,
  SignatureError,
} from '../src/signature';
import vectors from './signatureVectors.json';

const pair = deviceKeyPairFrom(bytesFromBase64(vectors.privateKey));

const register = vectors.register;

const presentedFor = (signature: string, instant = register.instant) => ({
  accountId: vectors.accountId,
  instant,
  signature,
  bodyHash: register.bodyHash,
});

// Node signs and verifies Ed25519 itself, and it reads a raw public key only as a wrapped one. The
// twelve byte prefix is the wrapper every Ed25519 public key carries.
const nodeKeyOf = (publicKey: Uint8Array) =>
  createPublicKey({
    key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKey)]),
    format: 'der',
    type: 'spki',
  });

describe('a request carries a signature and nothing about her', () => {
  describe('the account identifier', () => {
    it('is twenty six characters of Crockford base 32', () => {
      const accountId = accountIdFor(pair.publicKey);

      expect(accountId).toHaveLength(accountIdLength);
      expect([...accountId].every((character) => crockfordAlphabet.includes(character))).toBe(true);
    });

    it('uses no letter a person reads as a digit', () => {
      expect(crockfordAlphabet).not.toMatch(/[ILOU]/);
    });

    it('is the digest of the public key, cut to sixteen bytes', () => {
      const digest = createHash('sha256').update(Buffer.from(pair.publicKey)).digest();

      expect(accountIdFor(pair.publicKey)).toBe(crockfordBase32(digest.subarray(0, 16)));
    });

    it('is the checked in identifier for the checked in key', () => {
      expect(accountIdFor(pair.publicKey)).toBe(vectors.accountId);
    });

    it('changes completely when one bit of the key changes', () => {
      const moved = Uint8Array.from(pair.publicKey);
      moved[0] = (moved[0] as number) ^ 1;

      expect(accountIdFor(moved)).not.toBe(vectors.accountId);
    });

    it('refuses a key that is not the length a key is', () => {
      expect(() => accountIdFor(new Uint8Array(deviceKeyLength - 1))).toThrow(SignatureError);
    });
  });

  describe('the key pair', () => {
    it('gives the public half of the checked in private half', () => {
      expect(base64Of(pair.publicKey)).toBe(vectors.publicKey);
    });

    it('takes its private key from the source it is given', () => {
      const made = newDeviceKeyPair(() => new Uint8Array(deviceKeyLength).fill(9));

      expect(base64Of(made.privateKey)).toBe(base64Of(new Uint8Array(deviceKeyLength).fill(9)));
    });

    it('refuses a random source that gives the wrong number of bytes', () => {
      expect(() => newDeviceKeyPair(() => new Uint8Array(16))).toThrow(SignatureError);
    });
  });

  describe('what is signed', () => {
    it('is the method, the path, the instant and the digest of the body', () => {
      expect(
        signingString({
          method: register.method,
          path: register.path,
          instant: register.instant,
          bodyHash: register.bodyHash,
        }),
      ).toBe(register.signingString);
    });

    it('writes the method in upper case whatever the caller passed', () => {
      expect(
        signingString({ method: 'post', path: '/x', instant: register.instant, bodyHash: 'a' }),
      ).toBe(
        signingString({ method: 'POST', path: '/x', instant: register.instant, bodyHash: 'a' }),
      );
    });

    it('carries the query string, so a cursor cannot be moved under a signature', () => {
      const withQuery = signingString({
        method: 'GET',
        path: '/v1/records?after=b',
        instant: register.instant,
        bodyHash: 'a',
      });

      expect(withQuery).toContain('?after=b');
      expect(withQuery).not.toBe(
        signingString({
          method: 'GET',
          path: '/v1/records?after=c',
          instant: register.instant,
          bodyHash: 'a',
        }),
      );
    });

    it('hashes the body the way the platform hashes it', () => {
      expect(bodyHashOf(register.body)).toBe(
        createHash('sha256').update(register.body).digest('hex'),
      );
      expect(bodyHashOf('')).toBe(vectors.emptyBodyHash);
    });
  });

  describe('the checked in vectors', () => {
    it('signs the registration byte for byte as it was signed before', () => {
      expect(
        signRequest(
          {
            method: register.method,
            path: register.path,
            instant: register.instant,
            bodyHash: register.bodyHash,
          },
          pair.privateKey,
        ),
      ).toBe(register.signature);
    });

    it('signs a pull byte for byte as it was signed before', () => {
      expect(
        signRequest(
          {
            method: vectors.pull.method,
            path: vectors.pull.path,
            instant: vectors.pull.instant,
            bodyHash: vectors.pull.bodyHash,
          },
          pair.privateKey,
        ),
      ).toBe(vectors.pull.signature);
    });

    it('is Ed25519 as the platform does it, and not a shape of this library alone', () => {
      expect(
        nodeVerify(
          null,
          Buffer.from(register.signingString),
          nodeKeyOf(pair.publicKey),
          Buffer.from(bytesFromBase64(register.signature)),
        ),
      ).toBe(true);
    });
  });

  describe('the four headers', () => {
    it('carry the account, the instant, the digest and the signature', () => {
      const headers = signedHeaders(pair, {
        method: register.method,
        path: register.path,
        instant: register.instant,
        bodyHash: register.bodyHash,
      });

      expect(headers).toEqual({
        'emi-account': vectors.accountId,
        'emi-instant': register.instant,
        'emi-body-sha256': register.bodyHash,
        'emi-signature': register.signature,
      });
    });

    it('are read back whatever case they arrive in', () => {
      const presented = presentedSignatureIn({
        'EMI-Account': vectors.accountId,
        'Emi-Instant': register.instant,
        'EMI-SIGNATURE': register.signature,
        'emi-body-sha256': register.bodyHash,
      });

      expect(presented?.accountId).toBe(vectors.accountId);
      expect(presented?.signature).toBe(register.signature);
    });

    it.each(['emi-account', 'emi-instant', 'emi-signature', 'emi-body-sha256'])(
      'reads nothing at all when %s is absent',
      (missing) => {
        const headers: Record<string, string> = {
          'emi-account': vectors.accountId,
          'emi-instant': register.instant,
          'emi-signature': register.signature,
          'emi-body-sha256': register.bodyHash,
        };
        delete headers[missing];

        expect(presentedSignatureIn(headers)).toBeNull();
      },
    );
  });

  describe('the instant', () => {
    const signedAt = new Date(register.instant);

    it('is read only in the one written form', () => {
      expect(instantAt(register.instant)).toBe(signedAt.getTime());
      expect(instantAt('2026-09-18T10:00:00Z')).toBeNull();
      expect(instantAt('the eighteenth')).toBeNull();
    });

    it('is fresh up to the edge of the window, in both directions', () => {
      const edge = instantWindowSeconds * 1000;

      expect(instantIsFresh(register.instant, new Date(signedAt.getTime() + edge))).toBe(true);
      expect(instantIsFresh(register.instant, new Date(signedAt.getTime() - edge))).toBe(true);
    });

    it('is stale one second past the window, in both directions', () => {
      const past = instantWindowSeconds * 1000 + 1000;

      expect(instantIsFresh(register.instant, new Date(signedAt.getTime() + past))).toBe(false);
      expect(instantIsFresh(register.instant, new Date(signedAt.getTime() - past))).toBe(false);
    });

    it('is five minutes, which is the window the design names', () => {
      expect(instantWindowSeconds).toBe(300);
    });
  });

  describe('verifying', () => {
    it('accepts the signature over exactly what was signed', () => {
      expect(
        signatureVerifies(
          presentedFor(register.signature),
          register.method,
          register.path,
          pair.publicKey,
        ),
      ).toBe(true);
    });

    it.each([
      ['a different method', 'PUT', register.path],
      ['a different path', register.method, '/v1/records'],
    ])('refuses %s', (_name, method, path) => {
      expect(
        signatureVerifies(presentedFor(register.signature), method, path, pair.publicKey),
      ).toBe(false);
    });

    it('refuses a different instant, so a captured signature cannot be re-dated', () => {
      expect(
        signatureVerifies(
          presentedFor(register.signature, '2026-09-18T10:00:01.000Z'),
          register.method,
          register.path,
          pair.publicKey,
        ),
      ).toBe(false);
    });

    it('refuses another key holder', () => {
      expect(
        signatureVerifies(
          presentedFor(register.signature),
          register.method,
          register.path,
          decoyPublicKey,
        ),
      ).toBe(false);
    });

    it('refuses a signature of the wrong length rather than throwing at the caller', () => {
      const short = base64Of(bytesFromBase64(register.signature).subarray(0, 63));

      expect(
        signatureVerifies(presentedFor(short), register.method, register.path, pair.publicKey),
      ).toBe(false);
    });

    it('refuses a signature that is not base 64 at all', () => {
      expect(
        signatureVerifies(
          presentedFor('not base 64'),
          register.method,
          register.path,
          pair.publicKey,
        ),
      ).toBe(false);
    });

    it('refuses every single flipped bit of the signature', () => {
      const signature = bytesFromBase64(register.signature);
      const accepted: number[] = [];

      for (let at = 0; at < signature.length; at += 1) {
        for (const bit of [0b1, 0b1000_0000]) {
          const moved = Uint8Array.from(signature);
          moved[at] = (moved[at] as number) ^ bit;

          if (
            signatureVerifies(
              presentedFor(base64Of(moved)),
              register.method,
              register.path,
              pair.publicKey,
            )
          ) {
            accepted.push(at);
          }
        }
      }

      expect(accepted).toEqual([]);
    });

    it('holds a decoy key nobody holds the other half of', () => {
      expect(decoyPublicKey).toHaveLength(deviceKeyLength);
      expect(base64Of(decoyPublicKey)).not.toBe(vectors.publicKey);
    });
  });

  describe('what a refused caller is told', () => {
    it('tells an unknown account what it tells a bad signature', () => {
      expect(refusalMessages['signature-does-not-verify']).toBe('the signature does not verify');
    });

    it('tells a replayed request the same thing again', () => {
      expect(refusalMessages['signature-was-used-before']).toBe(
        refusalMessages['signature-does-not-verify'],
      );
    });

    it('names no field, no account and no header in any message', () => {
      for (const message of Object.values(refusalMessages)) {
        expect(message).not.toContain(vectors.accountId);
        expect(message).not.toMatch(/emi-/);
      }
    });
  });
});
