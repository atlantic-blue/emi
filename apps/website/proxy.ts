import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { POLICY_HEADER, aNonce, policyAllowing } from '@/lib/contentSecurityPolicy';

/**
 * Every page request passes through here on its way to the function that draws it, and the answer
 * passes back. Each one gets a policy of its own, carrying a nonce nothing else has.
 *
 * The policy is written twice. On the response, which is the copy her browser reads and enforces.
 * On the request headers going on to Next.js, which is where Next.js reads the nonce it puts on
 * the script tags it writes.
 *
 * Both hosts this site runs on happen to copy a response header of this function onto the request
 * as well, so today the second write changes nothing: Next.js under `next start` does it in
 * `resolve-routes`, and OpenNext does it in `requestHandler`. Neither documents that, and the
 * documented way to hand Next.js a nonce is the request header, so it is written rather than
 * inferred from what two hosts currently do.
 */
export default function proxy(request: NextRequest): NextResponse {
  const policy = policyAllowing(aNonce());
  const onward = new Headers(request.headers);

  onward.set(POLICY_HEADER, policy);

  const answer = NextResponse.next({ request: { headers: onward } });

  answer.headers.set(POLICY_HEADER, policy);

  return answer;
}

/**
 * The pages, and nothing else. The built files and the files the site keeps beside its pages come
 * from the bucket, where the policy of the edge covers them, and every address of a page of this
 * site ends in a slash and so carries no dot.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.).*)'],
};
