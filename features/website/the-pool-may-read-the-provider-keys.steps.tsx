import { join } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import {
  type PolicyStatement,
  bodyOf,
  configurationOf,
  grantedOnEveryResource,
  resolved,
  standsOnEveryResource,
  statementTextIn,
  statementsIn,
  statementsReaching,
} from '../../tools/pipeline/policy';

const feature = loadFeature(join(__dirname, 'the-pool-may-read-the-provider-keys.feature'));

const repositoryRoot = join(__dirname, '..', '..');
const vaultInfrastructure = join(repositoryRoot, 'infra');

const theParameters = 'arn:aws:ssm:eu-central-1:230345688874:parameter/emi/accounts/*';
const theKeys = 'arn:aws:kms:eu-central-1:230345688874:key/*';
const everyPool = 'arn:aws:cognito-idp:*:230345688874:userpool/*';
const theCertificates = 'arn:aws:acm:us-east-1:230345688874:certificate/*';
const theZone = 'arn:aws:route53:::hostedzone/Z06550332F4OHMRD78K';

const theParameterStore = 'ssm.eu-central-1.amazonaws.com';

const providerWrites = [
  'cognito-idp:CreateIdentityProvider',
  'cognito-idp:UpdateIdentityProvider',
  'cognito-idp:DeleteIdentityProvider',
] as const;

const domainWrites = [
  'cognito-idp:CreateUserPoolDomain',
  'cognito-idp:UpdateUserPoolDomain',
  'cognito-idp:DeleteUserPoolDomain',
] as const;

const parameterWrites = ['ssm:PutParameter', 'ssm:DeleteParameter', 'ssm:DeleteParameters'];

const readADomain = 'cognito-idp:DescribeUserPoolDomain';
const readAProvider = 'cognito-idp:DescribeIdentityProvider';
const readAParameter = 'ssm:GetParameter';
const decrypt = 'kms:Decrypt';
const configureADistribution = 'cloudfront:UpdateDistribution';

/** The statements this step adds to the apply role, which is what the last scenario weighs. */
const addedToTheApplyRole = [
  'TheIdentityProviders',
  'TheUserPoolDomain',
  'ReadTheUserPoolDomain',
  'ConfigureTheDomainDistribution',
  'ReadTheProviderKeys',
  'DecryptAProviderKey',
];

defineFeature(feature, (test) => {
  let configuration = '';
  let planPolicy = '';
  let applyPolicy = '';
  let plan: PolicyStatement[] = [];
  let apply: PolicyStatement[] = [];

  /** Each resource a grant of one action stands on, with every variable read as its value. */
  const scopeOf = (statements: readonly PolicyStatement[], action: string): string[][] =>
    statementsReaching(statements, action).map((statement) =>
      statement.resources.map((resource) => resolved(configuration, resource)),
    );

  const readTheRoles = (): void => {
    configuration = configurationOf(vaultInfrastructure);
    planPolicy = bodyOf(configuration, 'data "aws_iam_policy_document" "plan"');
    applyPolicy = bodyOf(configuration, 'data "aws_iam_policy_document" "apply"');
    plan = statementsIn(planPolicy);
    apply = statementsIn(applyPolicy);
  };

  const bothRoles = (): { role: string; statements: PolicyStatement[]; policy: string }[] => [
    { role: 'plan', statements: plan, policy: planPolicy },
    { role: 'apply', statements: apply, policy: applyPolicy },
  ];

  test('a merge may read the six credentials and make the two ways in', ({
    given,
    when,
    then,
    and,
  }) => {
    given('the two roles the pipeline assumes', readTheRoles);

    when('the grants the sign in needs are read', () => {
      expect(apply).not.toEqual([]);
      expect(plan).not.toEqual([]);
    });

    then('a merge reads the parameters of Emi and no other parameter', () => {
      expect(scopeOf(apply, readAParameter)).toEqual([[theParameters]]);
      expect(grantedOnEveryResource(apply, readAParameter)).toBe(false);
    });

    and('it may make, change and remove an identity provider of the pool', () => {
      for (const action of [...providerWrites, readAProvider]) {
        expect(scopeOf(apply, action)).toEqual([[everyPool]]);
        expect(grantedOnEveryResource(apply, action)).toBe(false);
      }
    });

    and('it may make and remove the domain the pool answers on', () => {
      for (const action of domainWrites) {
        expect(scopeOf(apply, action)).toEqual([[everyPool]]);
        expect(grantedOnEveryResource(apply, action)).toBe(false);
      }
    });

    // The certificate of auth.myemi.app needs no grant of its own. Asking for a certificate acts
    // on no certificate, and every certificate of us-east-1 in this account is already named.
    and('it may ask for the certificate that address needs', () => {
      expect(grantedOnEveryResource(apply, 'acm:RequestCertificate')).toBe(true);
      expect(scopeOf(apply, 'acm:DescribeCertificate')).toEqual([[theCertificates]]);
    });

    and('it may write a record in the myemi.app zone and in no other zone', () => {
      const changeARecord = 'route53:ChangeResourceRecordSets';

      expect(statementsReaching(apply, changeARecord).map((statement) => statement.sid)).toEqual([
        'TheMyemiZone',
      ]);
      expect(scopeOf(apply, changeARecord)).toEqual([[theZone]]);
      expect(grantedOnEveryResource(apply, changeARecord)).toBe(false);
    });
  });

  test('a pull request reads the sign in and writes none of it', ({ given, when, then, and }) => {
    given('the two roles the pipeline assumes', readTheRoles);

    when('the grants the sign in needs are read', () => {
      expect(plan).not.toEqual([]);
    });

    then('a pull request reads the parameters, the provider and the domain', () => {
      expect(scopeOf(plan, readAParameter)).toEqual([[theParameters]]);
      expect(scopeOf(plan, readAProvider)).toEqual([[everyPool]]);
      expect(grantedOnEveryResource(plan, readADomain)).toBe(true);
    });

    and('it holds no write of a provider, of a domain or of a parameter', () => {
      for (const action of [...providerWrites, ...domainWrites, ...parameterWrites]) {
        expect(scopeOf(plan, action)).toEqual([]);
      }
      expect(scopeOf(plan, configureADistribution)).toEqual([]);
    });

    and('neither role may write a parameter or read one outside Emi', () => {
      for (const { statements } of bothRoles()) {
        for (const action of parameterWrites) {
          expect(scopeOf(statements, action)).toEqual([]);
        }

        const everyParameterGrant = statements
          .filter((statement) => statement.actions.some((action) => action.startsWith('ssm:')))
          .map((statement) =>
            statement.resources.map((resource) => resolved(configuration, resource)),
          );

        expect(everyParameterGrant).toEqual([[theParameters]]);
      }
    });
  });

  test('each role decrypts a secure string only through a parameter store call', ({
    given,
    when,
    then,
    and,
  }) => {
    given('the two roles the pipeline assumes', readTheRoles);

    when('the grant that decrypts is read', () => {
      for (const { statements } of bothRoles()) {
        expect(statementsReaching(statements, decrypt)).toHaveLength(1);
      }
    });

    then('each role names the key of this account and never every key', () => {
      for (const { statements } of bothRoles()) {
        expect(scopeOf(statements, decrypt)).toEqual([[theKeys]]);
        expect(grantedOnEveryResource(statements, decrypt)).toBe(false);
      }
    });

    and('each grant carries the condition that names the parameter store', () => {
      for (const { policy } of bothRoles()) {
        const text = resolved(configuration, statementTextIn(policy, 'DecryptAProviderKey'));

        expect(text).toContain('StringEquals');
        expect(text).toContain('kms:ViaService');
        expect(text).toContain(theParameterStore);
      }
    });

    // A second decrypt grant with no condition would open every secure string in the account, and
    // the grant above would still read as narrow beside it.
    and('neither role holds a decrypt that any other service may use', () => {
      for (const { statements, policy } of bothRoles()) {
        for (const statement of statementsReaching(statements, decrypt)) {
          const text = resolved(configuration, statementTextIn(policy, statement.sid));

          expect(text).toContain('kms:ViaService');
          expect(text).toContain(theParameterStore);
        }

        for (const action of ['kms:Encrypt', 'kms:GenerateDataKey', 'kms:CreateKey']) {
          expect(scopeOf(statements, action)).toEqual([]);
        }
      }
    });
  });

  test('the read of a domain stands on every resource, because it names no pool', ({
    given,
    when,
    then,
    and,
  }) => {
    given('the two roles the pipeline assumes', readTheRoles);

    when('the grant that reads a domain is read', () => {
      for (const { statements } of bothRoles()) {
        expect(statementsReaching(statements, readADomain).map((one) => one.sid)).toEqual([
          'ReadTheUserPoolDomain',
        ]);
      }
    });

    then('each role reads a domain through a statement that stands on every resource', () => {
      for (const { statements } of bothRoles()) {
        expect(statementsReaching(statements, readADomain).every(standsOnEveryResource)).toBe(true);
        expect(grantedOnEveryResource(statements, readADomain)).toBe(true);
      }
    });

    // Measured with `aws iam simulate-custom-policy` on 7 November 2026. The same policy answered
    // allowed on every resource and implicitDeny on the pool, for this one action.
    and('the same grant written against the pool is no grant at all', () => {
      const written = `
  statement {
    sid       = "ReadTheUserPoolDomain"
    effect    = "Allow"
    actions   = ["${readADomain}"]
    resources = ["${everyPool}"]
  }
`;

      expect(grantedOnEveryResource(statementsIn(written), readADomain)).toBe(false);
    });
  });

  test('the domain costs one grant that is wider than the rule of this repository', ({
    given,
    when,
    then,
    and,
  }) => {
    given('the two roles the pipeline assumes', readTheRoles);

    when('the grant the domain distribution needs is read', () => {
      expect(apply.map((statement) => statement.sid)).toEqual(
        expect.arrayContaining(addedToTheApplyRole),
      );
    });

    then('a merge may change the configuration of a distribution of any account', () => {
      expect(grantedOnEveryResource(apply, configureADistribution)).toBe(true);
    });

    and('that statement carries one action and no other', () => {
      const wide = apply.filter((statement) => statement.sid === 'ConfigureTheDomainDistribution');

      expect(wide).toHaveLength(1);
      expect(wide[0]?.actions).toEqual([configureADistribution]);
      expect(wide[0]?.resources).toEqual(['*']);
    });

    // The other wide statement this step adds is the read of a domain, which the scenario above
    // explains. Everything else it adds names a resource.
    and('it is the only wide write this step adds', () => {
      const wide = apply
        .filter((statement) => addedToTheApplyRole.includes(statement.sid))
        .filter(standsOnEveryResource)
        .map((statement) => statement.sid);

      expect(wide).toEqual(['ReadTheUserPoolDomain', 'ConfigureTheDomainDistribution']);
    });

    and('a pull request holds no part of it', () => {
      expect(scopeOf(plan, configureADistribution)).toEqual([]);
      expect(statementsReaching(plan, 'cloudfront:CreateDistribution')).toEqual([]);
    });
  });
});
