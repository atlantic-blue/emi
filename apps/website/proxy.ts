import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Every page request passes through here on its way to the function that draws it. */
export default function proxy(request: NextRequest): NextResponse {
  void request;

  return NextResponse.next();
}

/** The addresses it answers for. */
export const config: { matcher: readonly string[] } = { matcher: [] };
