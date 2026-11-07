import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import { bodyOf, configurationOf, listedIn, resolved, valueOf } from '../../tools/pipeline/policy';

const feature = loadFeature(join(__dirname, '28.8-the-sender.feature'));

const repositoryRoot = join(__dirname, '..', '..');
const vaultInfrastructure = join(repositoryRoot, 'infra');

defineFeature(feature, (test) => {
  let configuration = '';
  let email = '';

  const readTheSender = (): void => {
    configuration = configurationOf(vaultInfrastructure);
    email = readFileSync(join(vaultInfrastructure, 'email.tf'), 'utf8');

    expect(email).toContain('resource "aws_sesv2_email_identity" "sender"');
  };

  const block = (header: string): string => bodyOf(configuration, header);
  const record = (name: string): string => block(`resource "aws_route53_record" "${name}"`);
  const alarm = (name: string): string => block(`resource "aws_cloudwatch_metric_alarm" "${name}"`);
  const valuesIn = (body: string): string[] =>
    listedIn(body, 'records').map((value) => resolved(configuration, value));

  test('mail from Emi is signed, and it comes back to Emi', ({ given, when, then, and }) => {
    let identity = '';

    given('the sender of myemi.app', readTheSender);

    when('the way a message is signed is read', () => {
      identity = block('resource "aws_sesv2_email_identity" "sender"');

      expect(valueOf(configuration, /email_identity = ([^\n]+)/.exec(identity)?.[1] ?? '')).toBe(
        'myemi.app',
      );
    });

    then('the service holds the signing key, and no key is written here', () => {
      expect(bodyOf(identity, 'dkim_signing_attributes')).toContain(
        'next_signing_key_length = "RSA_2048_BIT"',
      );
      expect(email).not.toContain('domain_signing_private_key');
      expect(email).not.toContain('BEGIN PRIVATE KEY');
    });

    and('three names in the zone carry the signature', () => {
      const signing = record('signing');

      expect(email).toContain('signing_record_count = 3');
      expect(signing).toContain('count = local.signing_record_count');
      expect(signing).toContain('type    = "CNAME"');
      expect(signing).toContain('._domainkey.${var.domain_name}');
      expect(signing).toContain('.dkim.amazonses.com');
      expect(signing).toContain('zone_id = data.aws_route53_zone.sender.zone_id');
    });

    and('it is sent from no-reply@myemi.app, and read in her inbox as Emi', () => {
      expect(email).toContain('sender_address = "no-reply@${var.domain_name}"');
      expect(email).toContain('sender_name    = "Emi"');
      expect(email).toContain('sender_from    = "${local.sender_name} <${local.sender_address}>"');
      // The domain identity covers every address under it, so the address declares none.
      expect([...email.matchAll(/resource "aws_sesv2_email_identity" "/g)]).toHaveLength(1);
    });

    and('the envelope sender is a subdomain of myemi.app', () => {
      const envelope = block('resource "aws_sesv2_email_identity_mail_from_attributes" "sender"');

      expect(envelope).toContain('mail_from_domain       = local.envelope_sender_domain');
      expect(email).toContain('envelope_sender_domain = "mail.${var.domain_name}"');
      expect(valuesIn(record('envelope_sender'))).toEqual([
        '10 feedback-smtp.eu-central-1.amazonses.com',
      ]);
      expect(valuesIn(record('envelope_sender_policy'))).toEqual([
        'v=spf1 include:amazonses.com ~all',
      ]);
    });

    and('a server that cannot read the mail exchange record still gets the message', () => {
      const envelope = block('resource "aws_sesv2_email_identity_mail_from_attributes" "sender"');

      expect(envelope).toContain('behavior_on_mx_failure = "USE_DEFAULT_VALUE"');
      expect(envelope).not.toContain('REJECT_MESSAGE');
    });
  });

  test('the bounces of Emi are counted apart, and watched at half the rate that hurts', ({
    given,
    when,
    then,
    and,
  }) => {
    let set = '';

    given('the sender of myemi.app', readTheSender);

    when('what counts a bounce is read', () => {
      set = block('resource "aws_sesv2_configuration_set" "sender"');
    });

    then('every message is counted on a configuration set named for Emi', () => {
      expect(valueOf(configuration, /configuration_set_name = ([^\n]+)/.exec(set)?.[1] ?? '')).toBe(
        'emi',
      );
      expect(bodyOf(set, 'reputation_options')).toContain('reputation_metrics_enabled = true');
      expect(block('resource "aws_sesv2_email_identity" "sender"')).toContain(
        'configuration_set_name = aws_sesv2_configuration_set.sender.configuration_set_name',
      );
    });

    and('a bounce and a complaint reach a topic of Emi', () => {
      const outcomes = block('resource "aws_sesv2_configuration_set_event_destination" "outcomes"');
      const destination = bodyOf(outcomes, 'event_destination {');

      expect(listedIn(destination, 'matching_event_types')).toEqual(['BOUNCE', 'COMPLAINT']);
      expect(bodyOf(destination, 'sns_destination')).toContain(
        'topic_arn = aws_sns_topic.email_outcomes.arn',
      );
      expect(block('resource "aws_sns_topic" "email_outcomes"')).toContain(
        'name = "${var.project_name}-email-outcomes"',
      );
    });

    and('the bounce rate is watched at 5 percent and the complaint rate at 0.1 percent', () => {
      expect(alarm('bounce_rate')).toContain('metric_name = "Reputation.BounceRate"');
      expect(alarm('bounce_rate')).toContain('threshold           = 0.05');
      expect(alarm('complaint_rate')).toContain('metric_name = "Reputation.ComplaintRate"');
      expect(alarm('complaint_rate')).toContain('threshold           = 0.001');

      for (const name of ['bounce_rate', 'complaint_rate']) {
        expect(alarm(name)).toContain('namespace   = "AWS/SES"');
        expect(bodyOf(alarm(name), 'dimensions')).toContain(
          '"ses:configuration-set" = aws_sesv2_configuration_set.sender.configuration_set_name',
        );
      }
    });

    and('neither alarm sends anywhere, because there is nowhere to send to yet', () => {
      const readme = readFileSync(join(vaultInfrastructure, 'README.md'), 'utf8');

      for (const name of ['bounce_rate', 'complaint_rate']) {
        expect(listedIn(alarm(name), 'alarm_actions')).toEqual([]);
        expect(listedIn(alarm(name), 'ok_actions')).toEqual([]);
      }

      expect(configuration).not.toContain('resource "aws_sns_topic_subscription"');
      expect(readme).toContain('Neither alarm carries an action');
    });
  });

  test('the sender holds an address and nothing of her days', ({ given, when, then, and }) => {
    given('the sender of myemi.app', readTheSender);

    when('what the sender holds is read', () => {
      expect(email).toContain('resource "aws_sesv2_configuration_set" "sender"');
    });

    then('it declares no key and no password', () => {
      expect(email).not.toContain('BEGIN PRIVATE KEY');
      expect(email).not.toContain('smtp_password');
      expect(email).not.toContain('secret');
    });

    and('it asks for no open and no click', () => {
      const destination = bodyOf(
        block('resource "aws_sesv2_configuration_set_event_destination" "outcomes"'),
        'event_destination {',
      );

      expect(listedIn(destination, 'matching_event_types')).toEqual(['BOUNCE', 'COMPLAINT']);
      expect(email).not.toContain('OPEN');
      expect(email).not.toContain('CLICK');
      expect(email).not.toContain('tracking_options');
    });

    and('the records ask a receiving server for nothing yet', () => {
      const authentication = record('message_authentication');

      expect(valuesIn(authentication)).toEqual(['v=DMARC1; p=none;']);
      expect(authentication).not.toContain('rua=');
      expect(authentication).not.toContain('ruf=');
      expect(valuesIn(record('sender_policy'))).toEqual(['v=spf1 include:amazonses.com ~all']);
    });

    and('the pool reads the sender, and the sender names no pool', () => {
      expect(block('resource "aws_cognito_user_pool" "accounts"')).toContain(
        'source_arn            = aws_sesv2_email_identity.sender.arn',
      );
      expect(email).not.toContain('aws_cognito');
    });
  });
});
