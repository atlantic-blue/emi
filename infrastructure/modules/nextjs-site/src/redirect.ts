/**
 * The viewer request of myemi.app. CloudFront runs this on every request, at the edge, before the
 * request reaches either origin.
 */

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
  return event.request;
}
