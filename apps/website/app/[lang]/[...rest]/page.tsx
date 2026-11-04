import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * The links of the layout, cleared for an address the site does not hold. The document the server
 * draws takes its metadata from `not-found.tsx`, and the browser resolves this route's own
 * metadata again once the page arrives, so both say the same thing only if both clear the links.
 */
export const metadata: Metadata = { alternates: null };

/**
 * Every address under a language that the site does not hold. Next.js serves its own page for an
 * address no route matches, and that page carries none of Emi, so this route matches them all and
 * answers with the Emi page that says the address is not here.
 */
export default function NoSuchPage(): never {
  notFound();
}
