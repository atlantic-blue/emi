import {
  botMethodAddress,
  registerTheWebhook,
  theUpdatesPath,
  theUpdatesTheBotMaySend,
  theWebhookAddress,
  type AnsweredByTheBotApi,
} from './botWebhook.ts';

/**
 * The step of the deploy that tells the Emi bot where to send its updates.
 *
 * No call leaves this test. What is read here is the body the step sends, the one field it prints
 * and the refusal it raises, because the log of this repository is readable by anybody and the
 * token of the bot is part of the address of every call of that api.
 */

const theApiEndpoint = 'https://notanapi.execute-api.eu-central-1.amazonaws.com';
const theBotToken = 'the-token-botfather-gave-for-the-emi-bot';
const theSecretToken = 'the-secret-terraform-generated-for-this-bot';

interface ARegistration {
  readonly calls: { address: string; body: string }[];
  readonly reported: string[];
  run: (answers?: AnsweredByTheBotApi) => Promise<void>;
}

function aRegistration(
  held: {
    readonly apiEndpoint?: string;
    readonly botToken?: string;
    readonly secret?: string;
  } = {},
): ARegistration {
  const calls: { address: string; body: string }[] = [];
  const reported: string[] = [];

  return {
    calls,
    reported,
    run: (answers = { ok: true }) =>
      registerTheWebhook({
        apiEndpoint: held.apiEndpoint ?? theApiEndpoint,
        botToken: held.botToken ?? theBotToken,
        secretToken: held.secret ?? theSecretToken,
        tells: (which) => {
          calls.push({ ...which });

          return Promise.resolve(answers);
        },
        report: (line) => reported.push(line),
      }),
  };
}

describe('the deploy registers the webhook of the Emi bot', () => {
  describe('what it sends', () => {
    it('names the address of this api, the secret and the two updates the bot may send', async () => {
      const registration = aRegistration();

      await registration.run();

      expect(registration.calls).toHaveLength(1);

      const [call] = registration.calls;
      const sent = JSON.parse(call?.body ?? '{}') as Record<string, unknown>;

      expect(sent.url).toBe(`${theApiEndpoint}${theUpdatesPath}`);
      expect(sent.secret_token).toBe(theSecretToken);
      expect(sent.allowed_updates).toEqual(['message', 'pre_checkout_query']);
      expect(theUpdatesTheBotMaySend).toEqual(['message', 'pre_checkout_query']);
    });

    it('asks the method of the bot api, which carries the token in its address', async () => {
      const registration = aRegistration();

      await registration.run();

      expect(registration.calls[0]?.address).toBe(botMethodAddress(theBotToken, 'setWebhook'));
    });

    it('takes an api address with a trailing separator and writes one path', () => {
      expect(theWebhookAddress(`${theApiEndpoint}/`)).toBe(`${theApiEndpoint}${theUpdatesPath}`);
      expect(theWebhookAddress(theApiEndpoint)).toBe(`${theApiEndpoint}${theUpdatesPath}`);
    });
  });

  describe('what it prints', () => {
    it('says the answer was ok, and prints no address, no token and no secret', async () => {
      const registration = aRegistration();

      await registration.run();

      const printed = registration.reported.join('\n');

      expect(printed).toContain('ok');
      expect(printed).not.toContain(theBotToken);
      expect(printed).not.toContain(theSecretToken);
      expect(printed).not.toContain('api.telegram.org');
    });
  });

  describe('every way it stops the deploy', () => {
    it('raises when the bot api did not register it, naming the reason and no value', async () => {
      const registration = aRegistration();

      await expect(registration.run({ ok: false, because: 'Unauthorized' })).rejects.toThrow(
        /Unauthorized/,
      );
      expect(registration.reported).toEqual([]);
    });

    it('raises on a refusal that named nothing at all', async () => {
      await expect(aRegistration().run({ ok: false })).rejects.toThrow(/nothing/);
    });

    it('raises before it calls anything when the deploy gave it no api address', async () => {
      const registration = aRegistration({ apiEndpoint: '' });

      await expect(registration.run()).rejects.toThrow(/no api address/);
      expect(registration.calls).toEqual([]);
    });

    it('raises before it calls anything when a value of the parameter store is empty', async () => {
      for (const held of [{ botToken: '' }, { secret: '' }]) {
        const registration = aRegistration(held);

        await expect(registration.run()).rejects.toThrow(/no token or no secret/);
        expect(registration.calls).toEqual([]);
      }
    });
  });
});
