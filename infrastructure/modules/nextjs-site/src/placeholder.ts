/**
 * The server function Terraform creates the site with, which answers until a deploy replaces the
 * code.
 */

export interface PlaceholderResponse {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
}

export function handler(): PlaceholderResponse {
  return { statusCode: 200, headers: {}, body: '' };
}
