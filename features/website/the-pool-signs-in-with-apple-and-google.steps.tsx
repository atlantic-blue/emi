import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import {
  bodyOf,
  configurationOf,
  defaultOf,
  regionOfAlias,
  valueOf,
} from '../../tools/pipeline/policy';
import {
  type SignInProvider,
  addressOf,
  credentialPath,
  pairsIn,
  parameterBehind,
  signInAddress,
  signInProblems,
  signInProviders,
  writtenCredentialMarkers,
} from '../../tools/pipeline/signIn';

const feature = loadFeature(join(__dirname, 'the-pool-signs-in-with-apple-and-google.feature'));

const repositoryRoot = join(__dirname, '..', '..');
const vaultInfrastructure = join(repositoryRoot, 'infra');

const theZone = 'Z06550332F4OHMRD78K';

const providerCalled = (name: string): SignInProvider => {
  const found = signInProviders.find((provider) => provider.name === name);

  if (found === undefined) {
    throw new Error(`no way in is called ${name}`);
  }

  return found;
};

defineFeature(feature, (test) => {
  let configuration = '';

  const readTheSignIn = (): void => {
    configuration = configurationOf(vaultInfrastructure);
    expect(configuration).not.toEqual('');
  };

  /** One provider, read as the fields the resource itself carries. */
  const providerBody = (name: string): Record<string, string> =>
    pairsIn(bodyOf(configuration, `resource "aws_cognito_identity_provider" "${name}"`));

  /** One provider, read as the details it signs in with. */
  const detailsOf = (name: string): Record<string, string> =>
    pairsIn(
      bodyOf(
        bodyOf(configuration, `resource "aws_cognito_identity_provider" "${name}"`),
        'provider_details',
      ),
    );

  const mappingOf = (name: string): Record<string, string> =>
    pairsIn(
      bodyOf(
        bodyOf(configuration, `resource "aws_cognito_identity_provider" "${name}"`),
        'attribute_mapping',
      ),
    );

  /** The configuration with one piece rewritten, which is how a refusal is shown. */
  const changed = (from: string, to: string): string => {
    expect(configuration).toContain(from);

    return configuration.replace(from, to);
  };

  test('Apple hands over an address and a subject', ({ given, when, then, and }) => {
    let details: Record<string, string> = {};

    given('the sign in the pool offers', readTheSignIn);

    when('the way in through Apple is read', () => {
      details = detailsOf('apple');
      expect(valueOf(configuration, providerBody('apple').provider_name ?? '')).toBe(
        'SignInWithApple',
      );
    });

    then('it asks Apple for the email address alone', () => {
      expect(valueOf(configuration, details.authorize_scopes ?? '')).toBe('email');
    });

    and('it writes her address and her subject onto the account', () => {
      expect(mappingOf('apple')).toEqual({ email: '"email"', username: '"sub"' });
    });

    and(
      'it reads the key, the team, the services name and the key name from the parameter store',
      () => {
        const read = providerCalled('apple').credentials.map((credential) =>
          parameterBehind(configuration, details[credential] ?? ''),
        );

        expect(read).toEqual([
          `${credentialPath}apple/services-id`,
          `${credentialPath}apple/team-id`,
          `${credentialPath}apple/key-id`,
          `${credentialPath}apple/private-key`,
        ]);
      },
    );

    and('it never asks Apple for her name', () => {
      expect(valueOf(configuration, details.authorize_scopes ?? '')).not.toContain('name');
      expect(Object.keys(mappingOf('apple'))).not.toContain('name');
    });
  });

  test('Google hands over an address and whether it is verified', ({ given, when, then, and }) => {
    let details: Record<string, string> = {};

    given('the sign in the pool offers', readTheSignIn);

    when('the way in through Google is read', () => {
      details = detailsOf('google');
      expect(valueOf(configuration, providerBody('google').provider_name ?? '')).toBe('Google');
    });

    then('it asks Google for the subject and the email address alone', () => {
      expect(valueOf(configuration, details.authorize_scopes ?? '')).toBe('openid email');
    });

    and('it writes her address, its verification and her subject onto the account', () => {
      expect(mappingOf('google')).toEqual({
        email: '"email"',
        email_verified: '"email_verified"',
        username: '"sub"',
      });
    });

    and('it reads the client name and the secret from the parameter store', () => {
      const read = providerCalled('google').credentials.map((credential) =>
        parameterBehind(configuration, details[credential] ?? ''),
      );

      expect(read).toEqual([
        `${credentialPath}google/client-id`,
        `${credentialPath}google/client-secret`,
      ]);
    });

    and('it never asks Google for her profile', () => {
      expect(valueOf(configuration, details.authorize_scopes ?? '')).not.toContain('profile');
      expect(Object.keys(mappingOf('google'))).not.toContain('picture');
    });
  });

  test('the pool answers on the one address Apple and Google return to', ({
    given,
    when,
    then,
    and,
  }) => {
    let domain: Record<string, string> = {};

    given('the sign in the pool offers', readTheSignIn);

    when('the address of the pool is read', () => {
      domain = pairsIn(bodyOf(configuration, 'resource "aws_cognito_user_pool_domain" "sign_in"'));
    });

    then('the pool answers on auth.myemi.app', () => {
      expect(signInAddress).toBe('auth.myemi.app');
      expect(addressOf(configuration)).toBe(signInAddress);
      expect(domain.domain).toBe('local.sign_in_domain');
    });

    and('the certificate is for that name, asked for in us-east-1', () => {
      const certificate = bodyOf(configuration, 'module "sign_in_certificate"');

      expect(domain.certificate_arn).toBe('module.sign_in_certificate.certificate_arn');
      expect(pairsIn(certificate).domain_name).toBe('local.sign_in_domain');
      expect(pairsIn(bodyOf(certificate, 'providers')).aws).toBe('aws.us_east_1');
      expect(regionOfAlias(configuration, 'us_east_1')).toBe('us-east-1');
      expect(bodyOf(configuration, 'provider "aws"')).not.toContain('us-east-1');
    });

    and('a record in the myemi.app zone points at the distribution of the pool', () => {
      const record = bodyOf(configuration, 'resource "aws_route53_record" "sign_in"');
      const alias = pairsIn(bodyOf(record, 'alias'));

      expect(pairsIn(record).type).toBe('"A"');
      expect(pairsIn(record).name).toBe('local.sign_in_domain');
      expect(pairsIn(record).zone_id ?? '').toContain('aws_route53_zone');
      expect(defaultOf(configuration, 'zone_id')).toBe(theZone);
      expect(alias.name).toBe('aws_cognito_user_pool_domain.sign_in.cloudfront_distribution');
      expect(alias.zone_id).toBe(
        'aws_cognito_user_pool_domain.sign_in.cloudfront_distribution_zone_id',
      );
    });

    and('every rule of the sign in is met', () => {
      expect(signInProblems(configuration)).toEqual([]);
    });
  });

  test('nothing in the repository holds a credential', ({ given, when, then, and }) => {
    given('the sign in the pool offers', readTheSignIn);

    when('each credential is read', () => {
      expect(signInProviders.flatMap((provider) => provider.credentials)).not.toEqual([]);
    });

    then('each one is a parameter of Emi and never a value', () => {
      for (const provider of signInProviders) {
        const details = detailsOf(provider.name);

        for (const credential of provider.credentials) {
          const parameter = parameterBehind(configuration, details[credential] ?? '');

          expect(parameter).not.toBeNull();
          expect(parameter).toContain(credentialPath);
        }
      }
    });

    // A rule has to name what it refuses, so the words a written credential begins with appear in
    // the rules and in the scenarios. Anywhere else, those words are a credential in a public
    // repository.
    and('a credential is named nowhere but in the rules that refuse one', () => {
      for (const marker of writtenCredentialMarkers) {
        const found = spawnSync(
          'git',
          ['grep', '--untracked', '--files-with-matches', '--fixed-strings', marker],
          { cwd: repositoryRoot, encoding: 'utf8' },
        );
        const files = found.stdout.split('\n').filter((line) => line.length > 0);

        expect(files).not.toEqual([]);
        expect(
          files.filter(
            (file) => !file.startsWith('features/') && !file.startsWith('tools/pipeline/'),
          ),
        ).toEqual([]);
      }
    });
  });

  test('a scope outside the set a provider may ask for is refused', ({
    given,
    when,
    then,
    and,
  }) => {
    let said: string[] = [];

    given('the sign in the pool offers', readTheSignIn);

    when('a provider asks Google for her profile', () => {
      said = signInProblems(
        changed('authorize_scopes = "openid email"', 'authorize_scopes = "openid email profile"'),
      );
    });

    then('the rule names the scope it asked for', () => {
      expect(said).toHaveLength(1);
      expect(said[0]).toContain('openid email profile');
    });

    and('it names the scopes that provider may ask for', () => {
      expect(said[0]).toContain('it may ask for "openid email" alone');
      expect(
        signInProblems(changed('authorize_scopes = "email"', 'authorize_scopes = "email name"'))[0],
      ).toContain('it may ask for "email" alone');
    });
  });

  test('a credential that is not read from the parameter store is refused', ({
    given,
    when,
    then,
    and,
  }) => {
    let said: string[] = [];

    given('the sign in the pool offers', readTheSignIn);

    when('a secret is written into the configuration', () => {
      said = signInProblems(
        changed(
          'client_secret    = data.aws_ssm_parameter.google_client_secret.value',
          'client_secret    = "a secret somebody typed"',
        ),
      );
    });

    then('the rule says that credential reads no parameter', () => {
      expect(said).toHaveLength(1);
      expect(said[0]).toContain('sets client_secret');
      expect(said[0]).toContain('rather than reading a parameter');
    });

    and('a parameter outside the path of Emi is refused as well', () => {
      const elsewhere = signInProblems(
        changed(
          'name = "/${var.project_name}/accounts/google/client-secret"',
          'name = "/somebody-else/google/client-secret"',
        ),
      );

      expect(elsewhere).toHaveLength(1);
      expect(elsewhere[0]).toContain(`which is outside ${credentialPath}`);
    });
  });

  test('an address other than auth.myemi.app is refused', ({ given, when, then, and }) => {
    let said: string[] = [];

    given('the sign in the pool offers', readTheSignIn);

    when('the pool is given another address', () => {
      said = signInProblems(
        changed(
          'sign_in_domain = "auth.${var.domain_name}"',
          'sign_in_domain = "login.${var.domain_name}"',
        ),
      );
    });

    then('the rule names the address it was given', () => {
      expect(said.join(' ')).toContain('login.myemi.app');
    });

    and('it names the address Apple and Google return to', () => {
      expect(said.join(' ')).toContain(signInAddress);
    });
  });
});
