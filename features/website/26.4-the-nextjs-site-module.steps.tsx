import { join } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import {
  cloudFrontAnswer,
  moduleDirectory,
} from '../../infrastructure/modules/nextjs-site/tests/runArtifact';
import { bodyOf, configurationOf, statementsIn } from '../../tools/pipeline/policy';

const feature = loadFeature(join(__dirname, '26.4-the-nextjs-site-module.feature'));

const repositoryRoot = join(__dirname, '..', '..');

interface Answer {
  readonly statusCode?: number;
  readonly headers: Record<string, { readonly value: string }>;
  readonly uri?: string;
}

/** One viewer request, as CloudFront hands it to the function at the edge. */
const asked = (host: string, uri: string): unknown => ({
  request: { uri, querystring: '', headers: { host: { value: host } } },
});

defineFeature(feature, (test) => {
  test('www.myemi.app redirects to myemi.app and the origins refuse a direct call', ({
    given,
    when,
    then,
    and,
  }) => {
    let site = '';
    let root = '';
    let underWww: Answer = { headers: {} };

    const inSite = (header: string): string => bodyOf(site, header);

    given('the site Emi is served from', () => {
      site = configurationOf(join(moduleDirectory));
      root = configurationOf(join(repositoryRoot, 'infrastructure', 'website'));

      expect(bodyOf(root, 'module "site"')).toContain('source = "../modules/nextjs-site"');
    });

    when('a reader asks for www.myemi.app', () => {
      underWww = cloudFrontAnswer(asked('www.myemi.app', '/en/privacy')) as Answer;
    });

    then('she is sent to the one address on the record, keeping the path she asked for', () => {
      expect(underWww.statusCode).toBe(301);
      expect(underWww.headers.location?.value).toBe('https://myemi.app/en/privacy');
    });

    and('the root sends her to a language, because no page lives above one', () => {
      const atTheRoot = cloudFrontAnswer(asked('myemi.app', '/')) as Answer;

      expect(atTheRoot.statusCode).toBe(301);
      expect(atTheRoot.headers.location?.value).toBe('https://myemi.app/en/');
    });

    and('a page reaches the origin, which is told the address she typed', () => {
      const page = cloudFrontAnswer(asked('myemi.app', '/en/privacy')) as Answer;

      expect(page.statusCode).toBeUndefined();
      expect(page.uri).toBe('/en/privacy');
      expect(page.headers['x-forwarded-host']).toEqual({ value: 'myemi.app' });
    });

    and('the bucket of built files answers nobody but this distribution', () => {
      const block = inSite('resource "aws_s3_bucket_public_access_block" "assets"');
      const policy = inSite('data "aws_iam_policy_document" "assets"');

      for (const flag of [
        'block_public_acls       = true',
        'block_public_policy     = true',
        'ignore_public_acls      = true',
        'restrict_public_buckets = true',
      ]) {
        expect(block).toContain(flag);
      }

      expect(statementsIn(policy)[0]?.actions).toEqual(['s3:GetObject']);
      expect(policy).toContain('identifiers = ["cloudfront.amazonaws.com"]');
      expect(policy).toContain('values   = [aws_cloudfront_distribution.site.arn]');
      expect(inSite('resource "aws_cloudfront_origin_access_control" "assets"')).toContain(
        'signing_behavior                  = "always"',
      );
    });

    and('the server function answers nobody but this distribution', () => {
      const permission = inSite('resource "aws_lambda_permission" "server"');

      expect(inSite('resource "aws_lambda_function_url" "server"')).toContain(
        'authorization_type = "AWS_IAM"',
      );
      expect(permission).toContain('principal              = "cloudfront.amazonaws.com"');
      expect(permission).toContain('source_arn             = aws_cloudfront_distribution.site.arn');
      expect(inSite('resource "aws_cloudfront_origin_access_control" "server"')).toContain(
        'origin_access_control_origin_type = "lambda"',
      );
    });

    and('every answer carries the six headers that keep the promise about the page', () => {
      const policy = inSite('resource "aws_cloudfront_response_headers_policy" "site"');

      expect(policy).toContain('access_control_max_age_sec = 63072000');
      expect(policy).toContain('include_subdomains         = true');
      expect(policy).toContain(
        `content_security_policy = "default-src 'self'; frame-ancestors 'none'"`,
      );
      expect(policy).toContain('content_type_options {');
      expect(policy).toContain('frame_option = "DENY"');
      expect(policy).toContain('referrer_policy = "strict-origin-when-cross-origin"');
      expect(policy).toContain('value    = "camera=(), microphone=(), geolocation=()"');
      expect(site).toContain('viewer_protocol_policy     = "redirect-to-https"');
    });
  });
});
