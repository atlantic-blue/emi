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

export interface ViewerRequest {
  uri: string;
  querystring: string;
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
  const query = request.querystring === '' ? '' : '?' + request.querystring;

  if (host.indexOf('www.') === 0) {
    return movedTo('https://' + host.slice(4) + request.uri + query);
  }

  if (request.uri === '/') {
    return movedTo('https://' + host + '/' + defaultLanguage + '/' + query);
  }

  request.headers['x-forwarded-host'] = { value: host };

  return request;
}

function movedTo(address: string): FunctionResponse {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: address } },
  };
}
