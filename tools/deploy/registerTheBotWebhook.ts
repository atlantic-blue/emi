import { type AnsweredByTheBotApi, registerTheWebhook } from './botWebhook.ts';

/** The pipeline command. It registers the live api as the webhook of the Emi bot. */

const given = (name: string): string => process.env[name] ?? '';

/**
 * One call of the bot api. It keeps the two fields the registration reads and no other part of the
 * answer, because a body of this api echoes what it was sent and this call sends the secret.
 */
async function tells(which: {
  readonly address: string;
  readonly body: string;
}): Promise<AnsweredByTheBotApi> {
  let answered: Response;

  try {
    answered = await fetch(which.address, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: which.body,
    });
  } catch {
    // The thrown error of a failed request carries the address, and the address carries the token.
    throw new Error('the bot api could not be reached');
  }

  const read = (await answered.json().catch(() => null)) as {
    ok?: unknown;
    description?: unknown;
  } | null;

  return {
    ok: read?.ok === true,
    ...(typeof read?.description === 'string' ? { because: read.description } : {}),
  };
}

try {
  await registerTheWebhook({
    apiEndpoint: process.argv.slice(2).find((argument) => !argument.startsWith('--')) ?? '',
    botToken: given('EMI_BOT_TOKEN'),
    secretToken: given('EMI_BOT_WEBHOOK_SECRET'),
    tells,
    report: (line) => process.stdout.write(`${line}\n`),
  });
} catch (thrown) {
  process.stderr.write(`${thrown instanceof Error ? thrown.message : String(thrown)}\n`);
  process.exit(1);
}
