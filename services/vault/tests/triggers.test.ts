import { base64Of } from '@emi/crypto';

import {
  answerDigestFor,
  answerWindowSeconds,
  oneTimeAnswerBytes,
  type OneTimeAnswerStore,
} from '../src/store/answers';
import { answerPartitionFor, answerSortKey, dynamoStore } from '../src/store/dynamo';
import {
  createAuthChallenge,
  telegramChallengeMetadata,
} from '../src/triggers/createAuthChallenge';
import {
  type ChallengeResult,
  customChallengeName,
  defineAuthChallenge,
  type DefineAuthChallengeEvent,
} from '../src/triggers/defineAuthChallenge';
import { verifyAuthChallenge } from '../src/triggers/verifyAuthChallengeResponse';
import { fakeTable, type FakeTable, tableName } from './fixtures/dynamoTable';

/**
 * The three triggers of the custom sign in, and the item they spend. Nothing in a user pool issues
 * a token for a user it did not authenticate itself, and Emi authenticates her against Telegram,
 * so these three are what turn one answer of the sign in function into tokens of the pool.
 *
 * Every case drives the real store over the table double, so the condition on the delete is the
 * condition the deployed table would enforce.
 */

const userName = `tg_${'ABCDEFGHJKMNPQRSTVWXYZ0123'}`;
const otherUserName = `tg_${'0123ABCDEFGHJKMNPQRSTVWXYZ'}`;

const issuedAt = new Date('2026-11-08T11:00:00.000Z');
const atOnce = new Date('2026-11-08T11:00:01.000Z');
const tooLate = new Date(issuedAt.getTime() + (answerWindowSeconds + 1) * 1000);
const atTheEdge = new Date(issuedAt.getTime() + answerWindowSeconds * 1000);

interface Issued {
  readonly table: FakeTable;
  readonly store: OneTimeAnswerStore;
  /** The answer as the caller presents it to the pool, which is the 32 bytes in base 64. */
  readonly presented: string;
}

/** What the sign in function leaves behind: one item, and the answer it handed to her surface. */
async function anAnswerFor(to: string = userName, filling = 11): Promise<Issued> {
  const table = fakeTable();
  const store = dynamoStore(table, tableName);
  const answer = new Uint8Array(oneTimeAnswerBytes).fill(filling);

  await store.writeAnswer({
    answerDigest: answerDigestFor(answer),
    userName: to,
    issuedAt: issuedAt.toISOString(),
  });

  return { table, store, presented: base64Of(answer) };
}

const anEmptyEvent: DefineAuthChallengeEvent = { request: {}, response: {} };

function aSessionOf(...answered: readonly ChallengeResult[]): DefineAuthChallengeEvent {
  return { request: { session: answered }, response: {} };
}

interface Walked {
  readonly challenge: string | undefined;
  readonly asked: Readonly<Record<string, string>> | undefined;
  readonly answerCorrect: boolean | undefined;
  readonly issueTokens: boolean | undefined;
  readonly failAuthentication: boolean | undefined;
}

/**
 * One sign in, from the first call of the define trigger to the last. The answer the verify
 * trigger gives is fed back as the session the pool builds, so the end of the walk is the decision
 * she is left with rather than the call a trigger made.
 */
async function theWholeWalk(
  issued: Issued,
  presented: string,
  now: Date,
  as: string = userName,
): Promise<Walked> {
  const first = defineAuthChallenge(anEmptyEvent);
  const created = createAuthChallenge({
    request: { challengeName: first.response.challengeName },
    response: {},
  });
  const verified = await verifyAuthChallenge(
    issued.store,
    () => now,
  )({
    userName: as,
    request: { challengeAnswer: presented },
    response: {},
  });
  const last = defineAuthChallenge(
    aSessionOf({
      challengeName: first.response.challengeName as string,
      challengeResult: verified.response.answerCorrect as boolean,
      challengeMetadata: created.response.challengeMetadata,
    }),
  );

  return {
    challenge: first.response.challengeName,
    asked: created.response.publicChallengeParameters,
    answerCorrect: verified.response.answerCorrect,
    issueTokens: last.response.issueTokens,
    failAuthentication: last.response.failAuthentication,
  };
}

describe('the three triggers of the custom sign in', () => {
  describe('one sign in, from the press to the tokens', () => {
    it('issues the tokens for the answer the sign in function wrote down', async () => {
      const issued = await anAnswerFor();

      const walked = await theWholeWalk(issued, issued.presented, atOnce);

      expect(walked.challenge).toBe(customChallengeName);
      expect(walked.asked).toEqual({});
      expect(walked.answerCorrect).toBe(true);
      expect(walked.issueTokens).toBe(true);
      expect(walked.failAuthentication).toBe(false);
    });

    it('leaves nothing in the table once the sign in is done', async () => {
      const issued = await anAnswerFor();

      await theWholeWalk(issued, issued.presented, atOnce);

      expect(issued.table.items()).toEqual([]);
    });

    it('refuses the same press a second time, and names no reason for it', async () => {
      const issued = await anAnswerFor();

      await theWholeWalk(issued, issued.presented, atOnce);
      const again = await theWholeWalk(issued, issued.presented, atOnce);

      expect(again.challenge).toBe(customChallengeName);
      expect(again.answerCorrect).toBe(false);
      expect(again.issueTokens).toBe(false);
      expect(again.failAuthentication).toBe(true);
    });

    it('gives a user name the pool does not hold the challenge, and then refuses it', async () => {
      const issued = await anAnswerFor();

      const first = defineAuthChallenge(anEmptyEvent);
      const verified = await verifyAuthChallenge(
        issued.store,
        () => atOnce,
      )({
        userName,
        request: { challengeAnswer: issued.presented, userNotFound: true },
        response: {},
      });
      const last = defineAuthChallenge(
        aSessionOf({
          challengeName: customChallengeName,
          challengeResult: verified.response.answerCorrect as boolean,
        }),
      );

      expect(first.response.challengeName).toBe(customChallengeName);
      expect(verified.response.answerCorrect).toBe(false);
      expect(last.response.failAuthentication).toBe(true);
    });
  });

  describe('the define trigger decides from the session', () => {
    it('asks for the custom challenge on the first call', () => {
      const decided = defineAuthChallenge(anEmptyEvent);

      expect(decided.response).toEqual({
        challengeName: customChallengeName,
        issueTokens: false,
        failAuthentication: false,
      });
    });

    it('issues the tokens once the verify trigger accepted the one custom challenge', () => {
      const decided = defineAuthChallenge(
        aSessionOf({ challengeName: customChallengeName, challengeResult: true }),
      );

      expect(decided.response).toEqual({ issueTokens: true, failAuthentication: false });
    });

    it('fails the sign in once the verify trigger refused it', () => {
      const decided = defineAuthChallenge(
        aSessionOf({ challengeName: customChallengeName, challengeResult: false }),
      );

      expect(decided.response).toEqual({ issueTokens: false, failAuthentication: true });
    });

    it('hands back a session carrying the sign in with a code untouched', () => {
      const event = aSessionOf({ challengeName: 'EMAIL_OTP', challengeResult: true });

      const decided = defineAuthChallenge(event);

      expect(decided).toBe(event);
      expect(decided.response).toEqual({});
    });

    it('hands back a session of two challenges untouched', () => {
      const event = aSessionOf(
        { challengeName: customChallengeName, challengeResult: true },
        { challengeName: customChallengeName, challengeResult: true },
      );

      const decided = defineAuthChallenge(event);

      expect(decided).toBe(event);
    });
  });

  describe('the create trigger asks her nothing', () => {
    it('issues a challenge with no question in it, and marks the session as Telegram', () => {
      const created = createAuthChallenge({
        request: { challengeName: customChallengeName },
        response: {},
      });

      expect(created.response).toEqual({
        publicChallengeParameters: {},
        privateChallengeParameters: {},
        challengeMetadata: telegramChallengeMetadata,
      });
    });

    it('asks a user name the pool does not hold the same nothing', () => {
      const held = createAuthChallenge({
        request: { challengeName: customChallengeName },
        response: {},
      });
      const absent = createAuthChallenge({
        request: { challengeName: customChallengeName, userNotFound: true },
        response: {},
      });

      expect(absent.response).toEqual(held.response);
    });
  });

  describe('the verify trigger spends the answer once', () => {
    it('refuses the second answer, because the delete took the item away', async () => {
      const issued = await anAnswerFor();
      const verify = verifyAuthChallenge(issued.store, () => atOnce);
      const event = { userName, request: { challengeAnswer: issued.presented }, response: {} };

      expect((await verify(event)).response.answerCorrect).toBe(true);
      expect((await verify(event)).response.answerCorrect).toBe(false);
    });

    it('refuses an answer issued longer ago than the window, with the item still in the table', async () => {
      const issued = await anAnswerFor();

      expect(issued.table.items()).toHaveLength(1);

      const verified = await verifyAuthChallenge(
        issued.store,
        () => tooLate,
      )({
        userName,
        request: { challengeAnswer: issued.presented },
        response: {},
      });

      expect(verified.response.answerCorrect).toBe(false);
      expect(issued.table.items()).toEqual([]);
    });

    it('accepts an answer at the far edge of the window', async () => {
      const issued = await anAnswerFor();

      const verified = await verifyAuthChallenge(
        issued.store,
        () => atTheEdge,
      )({
        userName,
        request: { challengeAnswer: issued.presented },
        response: {},
      });

      expect(verified.response.answerCorrect).toBe(true);
    });

    it('refuses an answer that belongs to another user name', async () => {
      const issued = await anAnswerFor(otherUserName);

      const verified = await verifyAuthChallenge(
        issued.store,
        () => atOnce,
      )({
        userName,
        request: { challengeAnswer: issued.presented },
        response: {},
      });

      expect(verified.response.answerCorrect).toBe(false);
    });

    it('refuses an answer nobody issued, and leaves the one that was issued alone', async () => {
      const issued = await anAnswerFor();
      const other = new Uint8Array(oneTimeAnswerBytes).fill(12);

      const verified = await verifyAuthChallenge(
        issued.store,
        () => atOnce,
      )({
        userName,
        request: { challengeAnswer: base64Of(other) },
        response: {},
      });

      expect(verified.response.answerCorrect).toBe(false);
      expect(issued.table.items()).toHaveLength(1);
    });

    it('refuses text that is not base 64, and reaches the table not at all', async () => {
      const issued = await anAnswerFor();

      const verified = await verifyAuthChallenge(
        issued.store,
        () => atOnce,
      )({
        userName,
        request: { challengeAnswer: 'this is not an answer' },
        response: {},
      });

      expect(verified.response.answerCorrect).toBe(false);
      expect(issued.table.calls().deleteItem).toBe(0);
    });

    it('refuses an answer of the wrong length', async () => {
      const issued = await anAnswerFor();

      const verified = await verifyAuthChallenge(
        issued.store,
        () => atOnce,
      )({
        userName,
        request: { challengeAnswer: base64Of(new Uint8Array(16).fill(11)) },
        response: {},
      });

      expect(verified.response.answerCorrect).toBe(false);
      expect(issued.table.calls().deleteItem).toBe(0);
    });

    it('reads the table through one delete, and through no read of any kind', async () => {
      const issued = await anAnswerFor();

      await verifyAuthChallenge(
        issued.store,
        () => atOnce,
      )({
        userName,
        request: { challengeAnswer: issued.presented },
        response: {},
      });

      expect(issued.table.calls()).toEqual({
        putItem: 1,
        getItem: 0,
        updateItem: 0,
        deleteItem: 1,
        query: 0,
      });
    });
  });

  describe('the item the table holds for one answer', () => {
    it('names the answer by its digest, and carries the user name and the instant', async () => {
      const issued = await anAnswerFor();
      const answer = new Uint8Array(oneTimeAnswerBytes).fill(11);

      expect(issued.table.items()).toEqual([
        {
          pk: { S: answerPartitionFor(answerDigestFor(answer)) },
          sk: { S: answerSortKey },
          userName: { S: userName },
          issuedAt: { S: issuedAt.toISOString() },
          ttl: { N: String(Math.floor(issuedAt.getTime() / 1000) + answerWindowSeconds) },
        },
      ]);
    });

    it('holds no part of the answer she presents, in any attribute of it', async () => {
      const issued = await anAnswerFor();
      const written = JSON.stringify(issued.table.items());

      expect(written).not.toContain(issued.presented);
      expect(written).not.toContain(issued.presented.slice(0, 8));
    });

    it('refuses to be written at an instant that is not the one written form', async () => {
      const table = fakeTable();
      const store = dynamoStore(table, tableName);

      await expect(
        store.writeAnswer({ answerDigest: 'A'.repeat(26), userName, issuedAt: '8 November 2026' }),
      ).rejects.toThrow('one written instant');
      expect(table.items()).toEqual([]);
    });
  });
});
