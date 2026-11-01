/** What she reads at the top of the page she did not mean to open. */
export const notFoundHeadline = 'This page does not exist';

/**
 * Next.js serves this for any address the site does not hold. The link is a plain anchor: this is
 * the one page a woman reaches by accident, so it is the one page that must work before anything
 * on it has loaded.
 */
export default function NotFound() {
  return (
    <main>
      <h1>{notFoundHeadline}</h1>
      <p>The address you opened is not part of this site.</p>
      <a href="/">Go to the Emi home page</a>
    </main>
  );
}
