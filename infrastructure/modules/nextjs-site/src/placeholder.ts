/**
 * The server function Terraform creates the site with, which answers until a deploy replaces the
 * code. The module tells Terraform to ignore the code after that, so this runs only between the
 * first apply and the first deploy.
 *
 * It answers 503 rather than 200 so a reader, a monitor and a store review all read the site as
 * not ready instead of reading an empty page as the product.
 */

export interface PlaceholderResponse {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
}

export function handler(): PlaceholderResponse {
  return {
    statusCode: 503,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': '3600',
    },
    body: 'The Emi website is not published yet.\n',
  };
}
