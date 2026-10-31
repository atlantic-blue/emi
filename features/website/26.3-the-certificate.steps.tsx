import { join } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import { bodyOf, configurationOf, listedIn, valueOf } from '../../tools/pipeline/policy';

const feature = loadFeature(join(__dirname, '26.3-the-certificate.feature'));

const repositoryRoot = join(__dirname, '..', '..');

const domain = 'myemi.app';
const otherName = 'www.myemi.app';
const theZone = 'Z06550332F4OHMRD78K';

/** The region of one aliased provider, read from the block that declares the alias. */
function regionOfAlias(configuration: string, alias: string): string {
  const at = configuration.search(new RegExp(`alias\\s*=\\s*"${alias}"`));

  if (at < 0) {
    throw new Error(`the configuration declares no provider aliased ${alias}`);
  }

  const found = /region\s*=\s*"([^"]+)"/.exec(configuration.slice(at));

  if (!found?.[1]) {
    throw new Error(`the provider aliased ${alias} names no region`);
  }

  return found[1];
}

defineFeature(feature, (test) => {
  test('the certificate for myemi.app is issued', ({ given, when, then, and }) => {
    let root = '';
    let theModule = '';
    let call = '';
    let certificate = '';

    given('the website Emi is served from', () => {
      root = configurationOf(join(repositoryRoot, 'infrastructure', 'website'));
      theModule = configurationOf(join(repositoryRoot, 'infrastructure', 'modules', 'certificate'));
      call = bodyOf(root, 'module "certificate"');

      expect(call).toContain('source = "../modules/certificate"');
    });

    when('the certificate that makes it answer over https is read', () => {
      certificate = bodyOf(theModule, 'resource "aws_acm_certificate" "site"');
    });

    then('it covers myemi.app and www.myemi.app', () => {
      const primary = /domain_name\s*=\s*([^\n]+)/.exec(call)?.[1] ?? '';
      const covered = [primary, ...listedIn(call, 'other_names')].map((name) =>
        valueOf(root, name),
      );

      expect(covered).toEqual([domain, otherName]);
      expect(certificate).toContain('domain_name               = var.domain_name');
      expect(certificate).toContain('subject_alternative_names = var.other_names');
    });

    and('ownership is proven in the myemi.app zone, so the issue can finish on its own', () => {
      const record = bodyOf(theModule, 'resource "aws_route53_record" "validation"');
      const lookup = bodyOf(root, 'data "aws_route53_zone" "site"');

      expect(certificate).toContain('validation_method         = "DNS"');
      expect(record).toContain('aws_acm_certificate.site.domain_validation_options');
      expect(record).toContain('zone_id = var.zone_id');
      expect(call).toContain('zone_id     = data.aws_route53_zone.site.zone_id');
      expect(valueOf(root, /zone_id\s*=\s*([^\n]+)/.exec(lookup)?.[1] ?? '')).toBe(theZone);
    });

    and('nothing may hold the certificate until it is issued', () => {
      const wait = bodyOf(theModule, 'resource "aws_acm_certificate_validation" "site"');

      expect(wait).toContain('certificate_arn         = aws_acm_certificate.site.arn');
      expect(wait).toContain('validation_record_fqdns');
      expect(bodyOf(theModule, 'output "certificate_arn"')).toContain(
        'aws_acm_certificate_validation.site.certificate_arn',
      );
      expect(bodyOf(root, 'output "certificate_arn"')).toContain(
        'module.certificate.certificate_arn',
      );
    });

    and('it is asked for where CloudFront can read it', () => {
      expect(call).toContain('aws = aws.us_east_1');
      expect(regionOfAlias(root, 'us_east_1')).toBe('us-east-1');
    });

    and('the zone the registration owns is read and never created', () => {
      expect(root).toContain('data "aws_route53_zone" "site"');
      expect(root).not.toContain('resource "aws_route53_zone"');
      expect(theModule).not.toContain('resource "aws_route53_zone"');
    });
  });
});
