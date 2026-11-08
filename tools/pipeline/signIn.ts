import { bodyOf, listedIn, regionOfAlias, valueOf } from './policy.ts';

/**
 * The ways into the pool that an external provider holds the keys to, read as rules rather than as
 * text. A scope, a mapped attribute and a credential each decide what the provider learns about
 * her and what the account keeps, so each one is a rule and not a preference.
 *
 * The source is Terraform text, because only the pipeline renders a plan. A rule that waited for
 * one would say nothing until after the merge, which is too late to refuse a scope that hands over
 * her name.
 */

export interface SignInProvider {
  /** The name the configuration gives the resource. */
  readonly name: string;
  /** The name the service fixes, which the sign in address carries. */
  readonly providerName: string;
  /** The one value authorize_scopes may carry. */
  readonly scopes: string;
  /** Every pool attribute the provider may write, and no other. */
  readonly mapping: readonly string[];
  /** Every credential it needs, each one read from a parameter and never written down. */
  readonly credentials: readonly string[];
}

export const signInProviders: readonly SignInProvider[] = [
  {
    name: 'apple',
    providerName: 'SignInWithApple',
    scopes: 'email',
    mapping: ['email', 'username'],
    credentials: ['client_id', 'team_id', 'key_id', 'private_key'],
  },
  {
    name: 'google',
    providerName: 'Google',
    scopes: 'openid email',
    mapping: ['email', 'email_verified'],
    credentials: ['client_id', 'client_secret'],
  },
];

/**
 * What a credential looks like when somebody writes one down: the header of a key, and the prefix
 * of a Google secret. The strings live here and nowhere else, so a rule that searches the
 * repository for them finds this file alone.
 */
export const writtenCredentialMarkers: readonly string[] = ['BEGIN PRIVATE KEY', 'GOCSPX'];

/** The one place a credential of a sign in is read from. */
export const credentialPath = '/emi/accounts/';

/** The one address the pool answers on, which Apple and Google were both set up against. */
export const signInAddress = 'auth.myemi.app';

/** The one region a certificate of a distribution is read from. */
export const certificateRegion = 'us-east-1';

/**
 * Each `key = value` pair one block writes itself, and none that a block inside it writes. A flat
 * read would let a nested block shadow the outer one: the alias of a record carries a name, and so
 * does the record, so the reader would answer with the wrong one.
 */
export function pairsIn(block: string): Record<string, string> {
  const pairs: Record<string, string> = {};
  let depth = 0;

  for (const line of block.split('\n')) {
    const found = /^\s*([a-z_]+)\s*=\s*(.+?)\s*$/.exec(line);

    if (
      depth === 0 &&
      found?.[1] !== undefined &&
      found[2] !== undefined &&
      !line.trimStart().startsWith('#')
    ) {
      pairs[found[1]] = found[2];
    }

    // An interpolation balances its own braces inside one line, so counting them leaves the depth
    // where it was and only a block opener or closer moves it.
    depth += [...line].filter((character) => character === '{').length;
    depth -= [...line].filter((character) => character === '}').length;
  }

  return pairs;
}

/**
 * Each credential of a sign in that is written as a value rather than read from the parameter
 * store. The names of the credentials appear in the configuration either way, so a rule that
 * refused the word private_key would refuse the reference along with the value. What this refuses
 * is a value: the header of a key, the prefix of a Google secret, and any assignment of one of
 * these names to something other than a parameter.
 */
export function credentialValuesIn(configuration: string): string[] {
  const said: string[] = [];

  for (const marker of writtenCredentialMarkers) {
    if (configuration.includes(marker)) {
      said.push(`a credential is written in the configuration, beginning ${marker}`);
    }
  }

  for (const name of ['private_key', 'client_secret', 'client_id', 'team_id', 'key_id']) {
    const assignments = configuration.matchAll(new RegExp(`\\n\\s+${name}\\s+=\\s+(.+)`, 'g'));

    for (const [, value] of assignments) {
      if (value !== undefined && !value.includes('data.aws_ssm_parameter')) {
        said.push(`${name} is set to ${value.trim()} and not to a parameter`);
      }
    }
  }

  return said;
}

/** The parameter one expression reads, or null where the expression is not a parameter at all. */
export function parameterBehind(configuration: string, expression: string): string | null {
  const found = /^data\.aws_ssm_parameter\.([a-z_]+)\.value$/.exec(expression.trim());

  if (found?.[1] === undefined) {
    return null;
  }

  try {
    return valueOf(
      configuration,
      pairsIn(bodyOf(configuration, `data "aws_ssm_parameter" "${found[1]}"`)).name ?? '',
    );
  } catch {
    return null;
  }
}

function providerProblems(configuration: string, provider: SignInProvider): string[] {
  const problems: string[] = [];
  let body = '';

  try {
    body = bodyOf(configuration, `resource "aws_cognito_identity_provider" "${provider.name}"`);
  } catch {
    return [`the pool has no ${provider.providerName}`];
  }

  const named = pairsIn(body);

  for (const field of ['provider_name', 'provider_type']) {
    if (valueOf(configuration, named[field] ?? '') !== provider.providerName) {
      problems.push(
        `${provider.name} carries the ${field} ${named[field] ?? 'nothing'}, and the service knows it as ${provider.providerName}`,
      );
    }
  }

  const details = pairsIn(bodyOf(body, 'provider_details'));
  const scopes = valueOf(configuration, details.authorize_scopes ?? '');

  if (scopes !== provider.scopes) {
    problems.push(
      `${provider.name} asks for the scopes "${scopes}", and it may ask for "${provider.scopes}" alone`,
    );
  }

  for (const credential of provider.credentials) {
    const expression = details[credential];

    if (expression === undefined) {
      problems.push(`${provider.name} names no ${credential}`);
      continue;
    }

    const parameter = parameterBehind(configuration, expression);

    if (parameter === null) {
      problems.push(
        `${provider.name} sets ${credential} to ${expression} rather than reading a parameter`,
      );
      continue;
    }

    if (!parameter.startsWith(credentialPath)) {
      problems.push(
        `${provider.name} reads ${credential} from ${parameter}, which is outside ${credentialPath}`,
      );
    }
  }

  const mapped = Object.keys(pairsIn(bodyOf(body, 'attribute_mapping'))).sort();

  if (mapped.join(' ') !== [...provider.mapping].sort().join(' ')) {
    problems.push(
      `${provider.name} writes ${mapped.join(', ') || 'nothing'} onto her account, and it may write ${[...provider.mapping].sort().join(', ')}`,
    );
  }

  return problems;
}

/** The address the pool answers on, read through the local the configuration names. */
export function addressOf(configuration: string): string {
  const domain = bodyOf(configuration, 'resource "aws_cognito_user_pool_domain" "sign_in"');

  return valueOf(configuration, local(configuration, pairsIn(domain).domain ?? ''));
}

function addressProblems(configuration: string): string[] {
  const problems: string[] = [];
  let domain = '';

  try {
    domain = bodyOf(configuration, 'resource "aws_cognito_user_pool_domain" "sign_in"');
  } catch {
    return ['the pool answers on no address of its own'];
  }

  const named = pairsIn(domain);
  const address = addressOf(configuration);

  if (address !== signInAddress) {
    problems.push(
      `the pool answers on ${address}, and Apple and Google return to ${signInAddress}`,
    );
  }

  if (!(named.certificate_arn ?? '').includes('module.sign_in_certificate')) {
    problems.push(
      `the address carries the certificate ${named.certificate_arn ?? 'nothing'}, and it carries the one this root asks for`,
    );
  }

  const certificate = pairsIn(bodyOf(configuration, 'module "sign_in_certificate"'));
  const certificateAddress = valueOf(
    configuration,
    local(configuration, certificate.domain_name ?? ''),
  );

  if (certificateAddress !== address) {
    problems.push(`the certificate is for ${certificateAddress}, and the address is ${address}`);
  }

  // The provider is read as the whole value and the alias is then read for its region. A grant
  // that only looked for the name would accept an alias called us_east_1_something.
  const through = pairsIn(
    bodyOf(bodyOf(configuration, 'module "sign_in_certificate"'), 'providers'),
  ).aws;

  if (
    through !== 'aws.us_east_1' ||
    regionOfAlias(configuration, 'us_east_1') !== certificateRegion
  ) {
    problems.push(
      `the certificate is asked for through ${through ?? 'nothing'}, and not in ${certificateRegion}`,
    );
  }

  return problems;
}

/** One expression read through a local of the root, so a rule sees the finished value. */
function local(configuration: string, expression: string): string {
  const found = /^local\.([a-z_]+)$/.exec(expression.trim());

  if (found?.[1] === undefined) {
    return expression;
  }

  const named = new RegExp(`\\n\\s+${found[1]}\\s+=\\s+(.+)`).exec(configuration);

  return named?.[1] ?? expression;
}

/** Every rule the sign in breaks, each one written as the sentence a reader needs. */
export function signInProblems(configuration: string): string[] {
  return [
    ...signInProviders.flatMap((provider) => providerProblems(configuration, provider)),
    ...addressProblems(configuration),
  ];
}

// ── The ways the site offers her, which the website client lists ─────────────

/** The way in the pool holds itself, which is the code sent to her email address. */
export const thePoolsOwnWay = 'COGNITO';

/** The one flow the website client may use, which hands the browser a code to exchange. */
export const theFlowTheSiteUses = 'code';

/** Every scope the website client may ask the pool for, and no other. */
export const theScopesTheSiteAsksFor: readonly string[] = ['openid', 'email'];

/**
 * The flow the code sent to her address travels in. The site signs a woman in that way today, so a
 * client that lost this flow would lose a sign in that works.
 */
export const theCodeSignInFlow = 'ALLOW_USER_AUTH';

/** The host the site answers on, which every address a provider returns to begins with. */
export const theSiteAddress = 'https://myemi.app';

/** The page a provider sends her back to, under each language the site serves. */
export const theReturnPage = 'sign-in/returning/';

/** The page a sign out leaves her on, under each language the site serves. */
export const thePageASignOutLeavesHerOn = 'sign-in/';

/** The client the site signs her in with, and the client her phone signs her in with. */
export const theWebsiteClient = 'website';
export const thePhoneClient = 'iphone';

/** Every address a provider may send her back to, one for each language the site serves. */
export function theAddressesSheComesBackTo(languages: readonly string[]): string[] {
  return languages.map((language) => `${theSiteAddress}/${language}/${theReturnPage}`);
}

/** Every address a sign out may leave her on, one for each language the site serves. */
export function theAddressesASignOutLeavesHerOn(languages: readonly string[]): string[] {
  return languages.map((language) => `${theSiteAddress}/${language}/${thePageASignOutLeavesHerOn}`);
}

/**
 * The provider behind one expression, or null where the expression names no provider of this root.
 *
 * A client lists a way in by the name the service fixes, and that name is also what the resource
 * carries. So the list is read through the resource, which is what makes Terraform create the
 * provider before it offers one.
 */
export function providerNameBehind(configuration: string, expression: string): string | null {
  const found = /^aws_cognito_identity_provider\.([a-z_]+)\.provider_name$/.exec(expression.trim());

  if (found?.[1] === undefined) {
    return null;
  }

  try {
    return valueOf(
      configuration,
      pairsIn(bodyOf(configuration, `resource "aws_cognito_identity_provider" "${found[1]}"`))
        .provider_name ?? '',
    );
  } catch {
    return null;
  }
}

/** One client of the pool, read as the text the resource holds. */
function clientBody(configuration: string, client: string): string {
  return bodyOf(configuration, `resource "aws_cognito_user_pool_client" "${client}"`);
}

/**
 * Every way in one client offers, read as the names the service answers to. The pool's own way is
 * a name and nothing else, and each provider arrives through the resource that makes it, so an
 * entry that is neither of those reads back as the text somebody wrote.
 */
export function theWaysAClientOffers(configuration: string, client: string): string[] {
  return listedIn(clientBody(configuration, client), 'supported_identity_providers').map((entry) =>
    entry === thePoolsOwnWay ? entry : (providerNameBehind(configuration, entry) ?? entry),
  );
}

/**
 * Every rule the sign in of the site breaks, each one written as the sentence a reader needs.
 *
 * The languages are handed in rather than read here, because the site decides how many it serves
 * and this file decides nothing. A language the site gains and the pool does not know is a woman
 * who presses Apple and comes back to an address the service refuses.
 */
export function websiteSignInProblems(
  configuration: string,
  languages: readonly string[],
): string[] {
  const problems: string[] = [];
  let client = '';

  try {
    client = clientBody(configuration, theWebsiteClient);
  } catch {
    return ['the site signs her in through no client of the pool'];
  }

  const named = pairsIn(client);
  const offered = listedIn(client, 'supported_identity_providers');

  for (const entry of offered) {
    if (entry !== thePoolsOwnWay && providerNameBehind(configuration, entry) === null) {
      problems.push(
        `the site offers ${entry} as text, and a client offers a provider only through the resource that makes it`,
      );
    }
  }

  const ways = theWaysAClientOffers(configuration, theWebsiteClient);
  const everyWay = [thePoolsOwnWay, ...signInProviders.map((provider) => provider.providerName)];

  if ([...ways].sort().join(' ') !== [...everyWay].sort().join(' ')) {
    problems.push(
      `the site offers ${ways.join(', ') || 'nothing'}, and it offers ${everyWay.join(', ')}`,
    );
  }

  const flows = listedIn(client, 'allowed_oauth_flows');

  if (flows.join(' ') !== theFlowTheSiteUses) {
    problems.push(
      `the site allows the flows ${flows.join(', ') || 'nothing'}, and it may allow "${theFlowTheSiteUses}" alone`,
    );
  }

  if (named.allowed_oauth_flows_user_pool_client !== 'true') {
    problems.push('the client may not use the flows of the pool, so no press can reach a provider');
  }

  const scopes = listedIn(client, 'allowed_oauth_scopes');

  if (scopes.join(' ') !== theScopesTheSiteAsksFor.join(' ')) {
    problems.push(
      `the site asks for the scopes "${scopes.join(' ')}", and it may ask for "${theScopesTheSiteAsksFor.join(' ')}" alone`,
    );
  }

  if (!listedIn(client, 'explicit_auth_flows').includes(theCodeSignInFlow)) {
    problems.push(
      `the site lost ${theCodeSignInFlow}, so the code sent to her address signs nobody in`,
    );
  }

  const addresses: readonly [string, string[], string[]][] = [
    [
      'comes back to',
      listedIn(client, 'callback_urls').map((address) => valueOf(configuration, address)),
      theAddressesSheComesBackTo(languages),
    ],
    [
      'signs out to',
      listedIn(client, 'logout_urls').map((address) => valueOf(configuration, address)),
      theAddressesASignOutLeavesHerOn(languages),
    ],
  ];

  for (const [what, written, expected] of addresses) {
    for (const address of expected.filter((each) => !written.includes(each))) {
      problems.push(`no language of the site ${what} ${address}`);
    }

    for (const address of written.filter((each) => !expected.includes(each))) {
      problems.push(`the site ${what} ${address}, which is the page of no language it serves`);
    }
  }

  // The application on her phone signs in with the code alone. A provider on that client would
  // offer a press no screen of the application draws, and a callback address there would name a
  // page of the site rather than a screen of the application.
  try {
    const phone = clientBody(configuration, thePhoneClient);

    if (listedIn(phone, 'supported_identity_providers').length > 0) {
      problems.push(
        `the application on her phone offers ${theWaysAClientOffers(configuration, thePhoneClient).join(', ')}, and it offers the code alone`,
      );
    }

    if (listedIn(phone, 'callback_urls').length > 0) {
      problems.push('the application on her phone names a callback address, and it needs none');
    }
  } catch {
    problems.push('her phone signs her in through no client of the pool');
  }

  return problems;
}
