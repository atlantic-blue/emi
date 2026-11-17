import { createHmac } from 'node:crypto';

import type { HttpRequestEvent } from '../../src/api';
import { signatureHeader, signatureScheme } from '../../src/payments/stripeSignature';
import { webhookPath } from '../../src/payments/webhook';

/** Builders for one delivery of Stripe, so no test writes a signature header by hand. */

/** The signing secret the tests sign with. It is not the shape of a real one. */
export const theSigningSecret = 'the-signing-secret-the-operator-wrote';

/** The header Stripe sends, over the timestamp and the body together. */
export function signatureHeaderFor(body: string, secret: string, signedAt: Date): string {
  const timestamp = Math.floor(signedAt.getTime() / 1000);
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

  return `t=${timestamp},${signatureScheme}=${signature}`;
}

/** One delivery, signed, as the api gateway hands it to the function. */
export function aDelivery(
  body: unknown,
  options: { readonly signedAt: Date; readonly secret?: string; readonly header?: string } = {
    signedAt: new Date(),
  },
): HttpRequestEvent {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const header =
    options.header ??
    signatureHeaderFor(text, options.secret ?? theSigningSecret, options.signedAt);

  return {
    rawPath: webhookPath,
    headers: { [signatureHeader]: header },
    requestContext: { http: { method: 'POST' } },
    body: text,
  };
}

/** The envelope every event of this api arrives in. */
export function anEvent(
  type: string,
  object: unknown,
  createdAt: number,
): Readonly<Record<string, unknown>> {
  return {
    id: 'evt_000000000001',
    object: 'event',
    type,
    created: createdAt,
    livemode: false,
    data: { object },
  };
}

/** A subscription, with the period on its item, which is where this api carries it. */
export function aSubscription(options: {
  readonly customer: string;
  readonly periodEnd: number;
  readonly id?: string;
  readonly cancelAtPeriodEnd?: boolean;
}): Readonly<Record<string, unknown>> {
  return {
    id: options.id ?? 'sub_000000000001',
    object: 'subscription',
    customer: options.customer,
    status: 'active',
    cancel_at_period_end: options.cancelAtPeriodEnd ?? false,
    items: {
      object: 'list',
      data: [
        {
          id: 'si_000000000001',
          object: 'subscription_item',
          current_period_start: options.periodEnd - 31_536_000,
          current_period_end: options.periodEnd,
        },
      ],
    },
  };
}

/** An invoice, with the period on its line, which is where this api carries that one. */
export function anInvoice(options: {
  readonly customer: string;
  readonly periodEnd: number;
  readonly amountPaid?: number;
}): Readonly<Record<string, unknown>> {
  return {
    id: 'in_000000000001',
    object: 'invoice',
    customer: options.customer,
    status: 'paid',
    amount_paid: options.amountPaid ?? 3900,
    currency: 'eur',
    lines: {
      object: 'list',
      data: [
        {
          id: 'il_000000000001',
          object: 'line_item',
          period: { start: options.periodEnd - 31_536_000, end: options.periodEnd },
        },
      ],
    },
  };
}
