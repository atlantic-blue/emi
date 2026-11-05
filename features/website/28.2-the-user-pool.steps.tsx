import { join } from 'node:path';
import { readFileSync } from 'node:fs';

import { defineFeature, loadFeature } from 'jest-cucumber';

import { bodyOf, configurationOf, listedIn } from '../../tools/pipeline/policy';

const feature = loadFeature(join(__dirname, '28.2-the-user-pool.feature'));

const repositoryRoot = join(__dirname, '..', '..');
const vaultInfrastructure = join(repositoryRoot, 'infra');

const clients = ['iphone', 'website'] as const;

defineFeature(feature, (test) => {
  test('a code signs her in and no password can', ({ given, when, then, and }) => {
    let configuration = '';
    let pool = '';
    let factors: string[] = [];

    given('the user pool she signs in to', () => {
      configuration = configurationOf(vaultInfrastructure);
      pool = bodyOf(configuration, 'resource "aws_cognito_user_pool" "accounts"');

      expect(pool).toContain('user_pool_tier = "ESSENTIALS"');
    });

    when('the ways a sign in may start are read', () => {
      factors = listedIn(bodyOf(pool, 'sign_in_policy'), 'allowed_first_auth_factors');
    });

    then('the email one time code is one of them', () => {
      expect(factors).toContain('EMAIL_OTP');
    });

    and('the password the service insists on has nothing to accept', () => {
      expect(factors).toContain('PASSWORD');
      expect(pool).not.toContain('temporary_password_validity_days');
      expect(pool).not.toContain('password_policy');
    });

    and('neither client allows a password flow', () => {
      for (const name of clients) {
        const flows = listedIn(
          bodyOf(configuration, `resource "aws_cognito_user_pool_client" "${name}"`),
          'explicit_auth_flows',
        );

        expect(flows).toEqual(['ALLOW_USER_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH']);
        expect(flows.join(' ')).not.toContain('PASSWORD');
      }
    });

    and('no one can ask for a password by saying they lost theirs', () => {
      expect(bodyOf(pool, 'recovery_mechanism')).toContain('name     = "admin_only"');
    });
  });

  test('the pool holds an address and a subject, and nothing else of hers', ({
    given,
    when,
    then,
    and,
  }) => {
    let configuration = '';
    let pool = '';
    let cognito = '';

    given('the user pool she signs in to', () => {
      configuration = configurationOf(vaultInfrastructure);
      pool = bodyOf(configuration, 'resource "aws_cognito_user_pool" "accounts"');
    });

    when('what the pool may hold is read', () => {
      cognito = readFileSync(join(vaultInfrastructure, 'cognito.tf'), 'utf8');
    });

    then('it declares no attribute of its own', () => {
      expect(pool).not.toContain('schema {');
      expect(cognito).not.toContain('custom:');
    });

    and('each client reads her address and no other attribute', () => {
      for (const name of clients) {
        const client = bodyOf(configuration, `resource "aws_cognito_user_pool_client" "${name}"`);

        expect(listedIn(client, 'read_attributes')).toEqual(['email', 'email_verified']);
        expect(listedIn(client, 'write_attributes')).toEqual(['email']);
      }
    });

    and('the pool names no sender, no secret and no key', () => {
      expect(pool).not.toContain('email_configuration');
      expect(cognito).not.toContain('client_secret');
      expect(cognito).not.toContain('BEGIN PRIVATE KEY');
      expect(cognito).toContain('generate_secret = false');
    });

    and('it cannot be deleted by a configuration change alone', () => {
      expect(pool).toContain('deletion_protection = "ACTIVE"');
    });
  });
});
