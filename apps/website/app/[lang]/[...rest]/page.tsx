import { notFound } from 'next/navigation';

/**
 * Every address under a language that the site does not hold. Next.js serves its own page for an
 * address no route matches, and that page carries none of Emi, so this route matches them all and
 * answers with the Emi page that says the address is not here.
 */
export default function NoSuchPage(): never {
  notFound();
}
