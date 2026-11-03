import type { Metadata } from 'next';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * What this page tells a search engine about addresses, which is nothing. Next.js reads the
 * metadata of the layouts and then of this file for an address no route holds, so the links the
 * layout gives every page are cleared here. An address kept for a page that is not there sends
 * the next reader to this page again.
 */
export const metadata: Metadata = { alternates: null };

/** What she reads at the top of the page she did not mean to open. */
export const notFoundHeadline = 'This page does not exist';

/**
 * Next.js serves this for any address the site does not hold. The way back is a plain anchor: this
 * is the one page a woman reaches by accident, so it is the one page that must work before
 * anything on it has loaded.
 *
 * The band at the top and the band at the foot come from the document this arrives in, so there is
 * nothing of them here. The card takes the room between the two on a page this short.
 */
export default function NotFound() {
  return (
    <main className="flex-1 px-margin py-marginMd">
      <Card>
        <CardHeader>
          <CardTitle>{notFoundHeadline}</CardTitle>
          <CardDescription>The address you opened is not part of this site.</CardDescription>
        </CardHeader>
        <CardFooter>
          <a className={buttonVariants()} href="/">
            Go to the Emi home page
          </a>
        </CardFooter>
      </Card>
    </main>
  );
}
