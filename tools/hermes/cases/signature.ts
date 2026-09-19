import {
  accountIdFor,
  bodyHashOf,
  bytesFromBase64,
  deviceKeyPairFrom,
  instantIsFresh,
  presentedSignatureIn,
  signRequest,
  signatureVerifies,
  signedHeaders,
  signingString,
  accountHeader,
  signatureHeader,
} from '@emi/crypto';

import { check, isTrue, sameValue } from '../harness';
import vectors from '../../../packages/crypto/tests/signatureVectors.json';

/**
 * Signing is the whole of her account: no email address and no password, just a key pair on the
 * phone. It reaches elliptic curve arithmetic, which needs `BigInt`, and it reaches `TextEncoder`
 * for the string that gets signed. Both are worth proving on the engine rather than on Node.
 */
export function collectSignatureCases(): void {
  const privateKey = bytesFromBase64(vectors.privateKey);
  const keyPair = deviceKeyPairFrom(privateKey);

  check('derives the public key the frozen vector holds', () => {
    sameValue(
      Array.from(keyPair.publicKey).join(','),
      Array.from(bytesFromBase64(vectors.publicKey)).join(','),
      'the curve gives the same point on this engine',
    );
  });

  check('names her account the way the frozen vector names it', () => {
    sameValue(accountIdFor(keyPair.publicKey), vectors.accountId, 'the digest and the base 32');
  });

  check('digests an empty body to the frozen digest', () => {
    sameValue(bodyHashOf(''), vectors.emptyBodyHash, 'an empty body has a digest like any other');
  });

  for (const [name, vector] of [
    ['register', vectors.register],
    ['pull', vectors.pull],
  ] as const) {
    check(`signs the ${name} request to the frozen signature`, () => {
      const request = {
        method: vector.method,
        path: vector.path,
        instant: vector.instant,
        bodyHash: vector.bodyHash,
      };

      sameValue(
        signRequest(request, privateKey),
        vector.signature,
        'the same four lines give the same signature here',
      );
    });

    check(`verifies the ${name} request it just signed`, () => {
      const request = {
        method: vector.method,
        path: vector.path,
        instant: vector.instant,
        bodyHash: vector.bodyHash,
      };
      const headers = signedHeaders(keyPair, request);
      const presented = presentedSignatureIn(headers);

      isTrue(presented !== null, 'the four headers read back');
      isTrue(
        signatureVerifies(presented!, vector.method, vector.path, keyPair.publicKey),
        'the key that signed it is the key that verifies it',
      );
    });
  }

  check('digests the register body to the frozen digest', () => {
    sameValue(bodyHashOf(vectors.register.body), vectors.register.bodyHash, 'the body digest');
  });

  check('builds the signing string the frozen vector holds', () => {
    sameValue(
      signingString({
        method: vectors.register.method,
        path: vectors.register.path,
        instant: vectors.register.instant,
        bodyHash: vectors.register.bodyHash,
      }),
      vectors.register.signingString,
      'four lines, in one order',
    );
  });

  check('refuses a signature made over another path', () => {
    const request = {
      method: vectors.pull.method,
      path: vectors.pull.path,
      instant: vectors.pull.instant,
      bodyHash: vectors.pull.bodyHash,
    };
    const presented = presentedSignatureIn(signedHeaders(keyPair, request));

    isTrue(presented !== null, 'the headers read back');
    isTrue(
      !signatureVerifies(presented!, vectors.pull.method, '/v1/records', keyPair.publicKey),
      'a cursor a caller can change is a cursor nobody signed',
    );
  });

  check('names the account and the signature in the headers it hands the transport', () => {
    const headers = signedHeaders(keyPair, {
      method: vectors.pull.method,
      path: vectors.pull.path,
      instant: vectors.pull.instant,
      bodyHash: vectors.pull.bodyHash,
    });

    sameValue(headers[accountHeader], vectors.accountId, 'the account header');
    sameValue(headers[signatureHeader], vectors.pull.signature, 'the signature header');
  });

  check('reads an instant and closes the window on an old one', () => {
    const signedAt = new Date(Date.parse(vectors.register.instant));

    isTrue(
      instantIsFresh(vectors.register.instant, signedAt),
      'a request signed now is inside the window',
    );
    isTrue(
      !instantIsFresh(vectors.register.instant, new Date(signedAt.getTime() + 600_000)),
      'ten minutes later it is not',
    );
  });
}
