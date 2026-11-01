import { SiteFooter } from '@/components/siteFooter';
import { SiteHeader } from '@/components/siteHeader';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

/** What she reads at the top of the page she did not mean to open. */
export const notFoundHeadline = 'This page does not exist';

/**
 * Next.js serves this for any address the site does not hold. The way back is a plain anchor: this
 * is the one page a woman reaches by accident, so it is the one page that must work before
 * anything on it has loaded.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
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
      <SiteFooter />
    </div>
  );
}
