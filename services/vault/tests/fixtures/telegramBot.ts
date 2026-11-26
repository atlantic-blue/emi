import type { AnsweredBy, AskedOf, ReachesTelegram } from '../../src/telegram/exchange';
import {
  answerPreCheckoutQueryMethod,
  botMethodAddress,
  createInvoiceLinkMethod,
} from '../../src/payments/stars';

/**
 * The bot api, as far as the Stars route reaches it: a double that answers what the bot api
 * answers, and records every call so a test reads the address and the body the function sent.
 *
 * It answers each method by address rather than in order, so a route that called them the wrong
 * way round fails here rather than passing against a double that shrugged.
 */

/** Not a real token. A value shaped like one would be read as a leak by the pipeline. */
export const theBotToken = 'the-token-botfather-gave-for-the-emi-bot';

/** The link the double answers an invoice call with. */
export const theInvoiceLink = 'https://t.me/$AABBCCDDEEFFGG';

/** One call, as it left the route. */
export interface OneBotCall {
  readonly address: string;
  readonly asked: AskedOf;
}

/** What a test drives the double with. */
export interface WhatTheBotAnswers {
  readonly invoiceLink?: string;
  /** A status and a body for the invoice call, where the test wants a refusal instead. */
  readonly refusesTheInvoice?: AnsweredBy;
  /** The same for the answer to a pre checkout query. */
  readonly refusesThePreCheckout?: AnsweredBy;
}

/** What the double offers a test: the port, and every call made through it. */
export interface FakeBot {
  readonly reaches: ReachesTelegram;
  calls(): OneBotCall[];
  /** The body of one call, read as the object the route sent. */
  bodyOf(method: string): Readonly<Record<string, unknown>> | undefined;
}

const answered = (body: unknown): AnsweredBy => ({
  status: 200,
  body: JSON.stringify({ ok: true, result: body }),
});

export function fakeBot(answers: WhatTheBotAnswers = {}): FakeBot {
  const calls: OneBotCall[] = [];

  const addressOf = (method: string): string => botMethodAddress(theBotToken, method);

  return {
    reaches: (address: string, asked: AskedOf): Promise<AnsweredBy> => {
      calls.push({ address, asked });

      if (address === addressOf(createInvoiceLinkMethod)) {
        return Promise.resolve(
          answers.refusesTheInvoice ?? answered(answers.invoiceLink ?? theInvoiceLink),
        );
      }

      if (address === addressOf(answerPreCheckoutQueryMethod)) {
        return Promise.resolve(answers.refusesThePreCheckout ?? answered(true));
      }

      return Promise.reject(
        new Error(`the bot api was asked for ${address}, which it does not answer`),
      );
    },

    calls: () => [...calls],

    bodyOf: (method: string) => {
      const call = calls.find((made) => made.address === addressOf(method));
      const body = call?.asked.body;

      return body === undefined
        ? undefined
        : (JSON.parse(body) as Readonly<Record<string, unknown>>);
    },
  };
}
