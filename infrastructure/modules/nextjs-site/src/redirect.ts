/**
 * The viewer request of myemi.app. CloudFront runs this on every request, at the edge, before the
 * request reaches either origin.
 *
 * Three things have to happen here and nowhere else.
 *
 * One address answers for the site. The distribution answers for the apex and for www, so without
 * this the same page lives at two addresses, and the privacy page the store review reads is not
 * the page on the record. The apex is read by taking `www.` off the host rather than from a name
 * written in here, because the distribution answers for no other host.
 *
 * The site has no page at the root. Every page sits under a language, which is SITE-3, so the root
 * moves to the default language rather than answering 404.
 *
 * The origin never sees the Host header. The origin request policy removes it, so the application
 * reads the address she typed from `x-forwarded-host` and would otherwise build every link from
 * the address of the Lambda function url.
 *
 * A Location always names https, because this runs after the distribution has already turned http
 * into https and a relative address would let a later reader think it does not.
 */

/** The default language of SITE-3, which is where the root sends a reader. */
const defaultLanguage = 'en';

export interface HeaderValue {
  readonly value: string;
}

/**
 * One key of the query string. A key asked for more than once carries every value it was asked
 * for in multiValue, and value alone is the first of them.
 */
export interface QueryValue {
  readonly value: string;
  readonly multiValue?: readonly HeaderValue[];
}

export interface ViewerRequest {
  uri: string;
  querystring: Record<string, QueryValue>;
  headers: Record<string, HeaderValue>;
}

export interface ViewerRequestEvent {
  readonly request: ViewerRequest;
}

export interface FunctionResponse {
  readonly statusCode: number;
  readonly statusDescription: string;
  readonly headers: Record<string, HeaderValue>;
}

export function handler(event: ViewerRequestEvent): ViewerRequest | FunctionResponse {
  const request = event.request;
  const host = request.headers.host ? request.headers.host.value : '';
  const query = queryOf(request.querystring);

  if (host.indexOf('www.') === 0) {
    return movedTo('https://' + host.slice(4) + request.uri + query);
  }

  if (request.uri === '/') {
    return movedTo('https://' + host + '/' + defaultLanguage + '/' + query);
  }

  request.headers['x-forwarded-host'] = { value: host };

  return request;
}

/**
 * The query string written back as a reader would type it.
 *
 * It arrives as an object and not as a string, so joining it onto an address wrote
 * "?[object Object]" and every link carrying a query lost what it carried. The values are passed
 * through as they arrived, because CloudFront hands them over encoded and encoding them again
 * would turn a space into %2520.
 *
 * The loops are written by index rather than with for...of, because this file is evaluated by the
 * CloudFront runtime and a parse error there takes the whole site down.
 */
function queryOf(querystring: Record<string, QueryValue>): string {
  const keys = Object.keys(querystring);
  const pairs: string[] = [];

  for (let at = 0; at < keys.length; at += 1) {
    const key = keys[at];

    if (key === undefined) {
      continue;
    }

    const asked = querystring[key];

    if (asked === undefined) {
      continue;
    }

    const many = asked.multiValue;

    if (many === undefined) {
      pairs.push(key + '=' + asked.value);
      continue;
    }

    for (let each = 0; each < many.length; each += 1) {
      const one = many[each];

      if (one !== undefined) {
        pairs.push(key + '=' + one.value);
      }
    }
  }

  return pairs.length === 0 ? '' : '?' + pairs.join('&');
}

function movedTo(address: string): FunctionResponse {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: address } },
  };
}
