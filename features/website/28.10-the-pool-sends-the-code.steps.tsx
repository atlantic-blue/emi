import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import { bodyOf, configurationOf, listedIn, resolved } from '../../tools/pipeline/policy';

const feature = loadFeature(join(__dirname, '28.10-the-pool-sends-the-code.feature'));

const repositoryRoot = join(__dirname, '..', '..');
const vaultInfrastructure = join(repositoryRoot, 'infra');

defineFeature(feature, (test) => {
  let configuration = '';
  let pool = '';

  const readThePool = (): void => {
    configuration = configurationOf(vaultInfrastructure);
    pool = bodyOf(configuration, 'resource "aws_cognito_user_pool" "accounts"');

    expect(pool).toContain('user_pool_tier = "ESSENTIALS"');
  };

  /** One local of the root, read as the value the account will see. */
  const localValue = (name: string): string => {
    const found = new RegExp(`\\n\\s+${name}\\s+=\\s+"([^"]*)"`).exec(configuration);

    if (found?.[1] === undefined) {
      throw new Error(`the configuration has no ${name}`);
    }

    return resolved(configuration, found[1]);
  };

  test('the code is sent from Emi, through the account of Emi', ({ given, when, then, and }) => {
    let sending = '';

    given('the user pool she signs in to', readThePool);

    when('the way it sends is read', () => {
      sending = bodyOf(pool, 'email_configuration');
    });

    then('it calls the mail service in this account', () => {
      expect(sending).toContain('email_sending_account = "DEVELOPER"');
      expect(sending).not.toContain('COGNITO_DEFAULT');
    });

    and('it sends from the myemi.app identity', () => {
      expect(sending).toContain('source_arn            = aws_sesv2_email_identity.sender.arn');
      expect(bodyOf(configuration, 'resource "aws_sesv2_email_identity" "sender"')).toContain(
        'email_identity = var.domain_name',
      );
    });

    and('she reads Emi <no-reply@myemi.app> in the from line', () => {
      expect(sending).toContain('from_email_address    = local.sender_from');
      expect(`${localValue('sender_name')} <${localValue('sender_address')}>`).toBe(
        'Emi <no-reply@myemi.app>',
      );
      expect(sending).not.toContain('no-reply@verificationemail.com');
    });

    and('every message is counted on the configuration set of Emi', () => {
      expect(sending).toContain(
        'configuration_set     = aws_sesv2_configuration_set.sender.configuration_set_name',
      );
      expect(bodyOf(configuration, 'resource "aws_sesv2_configuration_set" "sender"')).toContain(
        'configuration_set_name = var.project_name',
      );
    });
  });

  test('the pool is never given a sender that does not exist yet', ({ given, when, then, and }) => {
    given('the user pool she signs in to', readThePool);

    when('the order of the apply is read', () => {
      expect(listedIn(pool, 'depends_on')).not.toEqual([]);
    });

    then('the pool is made after the identity it sends from', () => {
      expect(listedIn(pool, 'depends_on')).toEqual([
        'aws_iam_role_policy.apply',
        'aws_sesv2_email_identity.sender',
      ]);
    });

    and('it names that identity as a resource and never as a written address', () => {
      const sending = bodyOf(pool, 'email_configuration');

      expect(sending).toContain('aws_sesv2_email_identity.sender.arn');
      expect(sending).not.toContain('arn:aws:ses');
    });

    and('the readme says a rebuild from nothing takes a second apply', () => {
      const readme = readFileSync(join(vaultInfrastructure, 'README.md'), 'utf8');

      expect(readme).toContain('second apply');
      expect(readme).toContain('Existing is not the same as verified');
    });
  });
});
