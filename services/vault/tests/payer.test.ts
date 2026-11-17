import { createHash } from 'node:crypto';

import { crockfordBase32, payerDigestFor } from '@emi/crypto';

import { saltBytes } from '../src/telegram/parameters';
import { poolUserNameFor } from '../src/telegram/userName';

const userPoolId = 'eu-central-1_NOTAPOOL';
const subject = '482910384';
const anotherSubject = '913847563';
const theSalt = new Uint8Array(saltBytes).map((_, at) => (at * 11 + 3) % 256);

// Checked in. It is the digest of the pool and the `tg_` name the salt and this subject make, so
// a change to either rule orphans a Stars payment and goes red here first.
const theDigest = '5T469GSZKVJE0YMF2XAF5JK758';

/** The bot, which holds the subject and the salt and may find no user of the pool at all. */
const asTheBot = (held: string): string =>
  payerDigestFor(userPoolId, poolUserNameFor(held, theSalt));

/** The site, which holds the name the pool gave back and never the salt. */
const asTheSite = (userName: string): string => payerDigestFor(userPoolId, userName);

describe('a Telegram subject reaches one payer digest from either side', () => {
  it('is one digest, whether the bot works the name out or the site reads it off the pool', () => {
    expect(asTheSite(poolUserNameFor(subject, theSalt))).toBe(asTheBot(subject));
  });

  it('is the checked in digest for the checked in subject and salt', () => {
    expect(asTheBot(subject)).toBe(theDigest);
  });

  it('is the digest of the pool, a newline and the pool user name', () => {
    const name = poolUserNameFor(subject, theSalt);
    const digest = createHash('sha256')
      .update(Buffer.from(`${userPoolId}\n${name}`, 'utf8'))
      .digest();

    expect(asTheBot(subject)).toBe(crockfordBase32(digest.subarray(0, 16)));
  });

  it('moves when the subject moves, so two women never share a payment', () => {
    expect(asTheBot(anotherSubject)).not.toBe(theDigest);
  });

  it('carries no part of the subject, which is written nowhere', () => {
    expect(asTheBot(subject)).not.toContain(subject);
  });
});
