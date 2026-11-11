import { join } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import { bodyOf, configurationOf, listedIn, valueOf } from '../../tools/pipeline/policy';
import {
  theAddressesASignOutLeavesHerOn,
  theAddressesSheComesBackTo,
  theCodeSignInFlow,
  theFlowTheSiteUses,
  thePhoneClient,
  thePoolsOwnWay,
  theScopesTheSiteAsksFor,
  theWaysAClientOffers,
  theWebsiteClient,
  websiteSignInProblems,
} from '../../tools/pipeline/signIn';
import { languages } from '../../apps/website/app/words/language';

const feature = loadFeature(join(__dirname, 'the-website-may-use-apple-and-google.feature'));

const vaultInfrastructure = join(__dirname, '..', '..', 'infra');

defineFeature(feature, (test) => {
  let configuration = '';
  let client = '';

  const readTheSignIn = (): void => {
    configuration = configurationOf(vaultInfrastructure);
    expect(configuration).not.toEqual('');
  };

  const clientBody = (name: string): string =>
    bodyOf(configuration, `resource "aws_cognito_user_pool_client" "${name}"`);

  /** The configuration with one piece rewritten, which is how a refusal is shown. */
  const changed = (from: string, to: string): string => {
    expect(configuration).toContain(from);

    return configuration.replace(from, to);
  };

  const addressesIn = (field: string): string[] =>
    listedIn(client, field).map((address) => valueOf(configuration, address));

  test('the site offers Apple, Google and the code sent to her address', ({
    given,
    when,
    then,
    and,
  }) => {
    given('the sign in the pool offers', readTheSignIn);

    when('the client the site signs her in with is read', () => {
      client = clientBody(theWebsiteClient);
    });

    then('it offers Apple, Google and the way in the pool holds itself', () => {
      expect(theWaysAClientOffers(configuration, theWebsiteClient)).toEqual([
        thePoolsOwnWay,
        'SignInWithApple',
        'Google',
      ]);
    });

    and('it offers each provider through the resource that makes it', () => {
      expect(listedIn(client, 'supported_identity_providers').slice(1)).toEqual([
        'aws_cognito_identity_provider.apple.provider_name',
        'aws_cognito_identity_provider.google.provider_name',
      ]);
    });

    and('it keeps the flow the code sent to her address travels in', () => {
      expect(listedIn(client, 'explicit_auth_flows')).toEqual([
        theCodeSignInFlow,
        'ALLOW_REFRESH_TOKEN_AUTH',
        'ALLOW_CUSTOM_AUTH',
      ]);
    });
  });

  test('the browser is handed a code, and the pool is asked for an address and a subject', ({
    given,
    when,
    then,
    and,
  }) => {
    given('the sign in the pool offers', readTheSignIn);

    when('the client the site signs her in with is read', () => {
      client = clientBody(theWebsiteClient);
    });

    then('it allows the authorization code flow alone', () => {
      expect(listedIn(client, 'allowed_oauth_flows')).toEqual([theFlowTheSiteUses]);
    });

    and('it asks for the subject and the email address alone', () => {
      expect(listedIn(client, 'allowed_oauth_scopes')).toEqual([...theScopesTheSiteAsksFor]);
    });

    and('it may use the flows of the pool', () => {
      expect(client).toContain('allowed_oauth_flows_user_pool_client = true');
    });
  });

  test('she comes back to the page of the language she was reading', ({
    given,
    when,
    then,
    and,
  }) => {
    given('the sign in the pool offers', readTheSignIn);

    when('the addresses of the site are read', () => {
      client = clientBody(theWebsiteClient);
      expect(languages).toEqual(['en', 'ru', 'es']);
    });

    then('one return address names each language the site serves', () => {
      expect(addressesIn('callback_urls')).toEqual(theAddressesSheComesBackTo(languages));
    });

    and('one sign out address names the sign in page of each language', () => {
      expect(addressesIn('logout_urls')).toEqual(theAddressesASignOutLeavesHerOn(languages));
    });

    and('every rule of the sign in of the site is met', () => {
      expect(websiteSignInProblems(configuration, languages)).toEqual([]);
    });
  });

  test('the application on her phone signs in with the code alone', ({
    given,
    when,
    then,
    and,
  }) => {
    given('the sign in the pool offers', readTheSignIn);

    when('the client her phone signs her in with is read', () => {
      client = clientBody(thePhoneClient);
    });

    then('it offers no provider and names no return address', () => {
      expect(listedIn(client, 'supported_identity_providers')).toEqual([]);
      expect(listedIn(client, 'callback_urls')).toEqual([]);
      expect(listedIn(client, 'allowed_oauth_scopes')).toEqual([]);
    });

    and('it allows the code flow, the refresh and the custom flow', () => {
      expect(listedIn(client, 'explicit_auth_flows')).toEqual([
        theCodeSignInFlow,
        'ALLOW_REFRESH_TOKEN_AUTH',
        'ALLOW_CUSTOM_AUTH',
      ]);
    });
  });

  test('a scope outside the subject and the address is refused', ({ given, when, then, and }) => {
    let said: string[] = [];

    given('the sign in the pool offers', readTheSignIn);

    when('the site asks the pool for her profile', () => {
      said = websiteSignInProblems(
        changed(
          'allowed_oauth_scopes = ["openid", "email"]',
          'allowed_oauth_scopes = ["openid", "email", "profile"]',
        ),
        languages,
      );
    });

    then('the rule names the scopes it asked for', () => {
      expect(said).toHaveLength(1);
      expect(said[0]).toContain('"openid email profile"');
    });

    and('it names the scopes the site may ask for', () => {
      expect(said[0]).toContain('it may ask for "openid email" alone');
    });
  });

  test('a return address the site does not serve is refused', ({ given, when, then, and }) => {
    let said: string[] = [];

    given('the sign in the pool offers', readTheSignIn);

    when('the site comes back to the page of a language it does not serve', () => {
      said = websiteSignInProblems(
        changed(
          '"https://${var.domain_name}/ru/sign-in/returning/"',
          '"https://${var.domain_name}/pl/sign-in/returning/"',
        ),
        languages,
      );
    });

    then('the rule names the address nothing comes back to', () => {
      expect(said).toContain(
        'no language of the site comes back to https://myemi.app/ru/sign-in/returning/',
      );
    });

    and('it names the address of no page of the site', () => {
      expect(said).toContain(
        'the site comes back to https://myemi.app/pl/sign-in/returning/, which is the page of no language it serves',
      );
      expect(said).toHaveLength(2);
    });
  });

  test('losing the flow of the code sent to her address is refused', ({ given, when, then }) => {
    let said: string[] = [];

    given('the sign in the pool offers', readTheSignIn);

    when('the client loses the flow the code travels in', () => {
      said = websiteSignInProblems(
        changed(
          `explicit_auth_flows = ["${theCodeSignInFlow}", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_CUSTOM_AUTH"]\n\n  # The three ways`,
          'explicit_auth_flows = ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_CUSTOM_AUTH"]\n\n  # The three ways',
        ),
        languages,
      );
    });

    then('the rule says the code signs nobody in', () => {
      expect(said).toEqual([
        `the site lost ${theCodeSignInFlow}, so the code sent to her address signs nobody in`,
      ]);
    });
  });

  test('a provider named as text is refused', ({ given, when, then }) => {
    let said: string[] = [];

    given('the sign in the pool offers', readTheSignIn);

    when('the site names a provider as text rather than as the resource', () => {
      said = websiteSignInProblems(
        changed('aws_cognito_identity_provider.apple.provider_name,', '"SignInWithApple",'),
        languages,
      );
    });

    then('the rule says a client offers a provider through the resource that makes it', () => {
      expect(said).toEqual([
        'the site offers SignInWithApple as text, and a client offers a provider only through the resource that makes it',
      ]);
    });
  });
});
