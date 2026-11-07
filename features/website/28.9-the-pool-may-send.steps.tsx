import { join } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import {
  type PolicyStatement,
  bodyOf,
  configurationOf,
  grantedOnEveryResource,
  listedIn,
  resolved,
  statementTextIn,
  statementsIn,
  statementsReaching,
} from '../../tools/pipeline/policy';

const feature = loadFeature(join(__dirname, '28.9-the-pool-may-send.feature'));

const repositoryRoot = join(__dirname, '..', '..');
const vaultInfrastructure = join(repositoryRoot, 'infra');

const theEmailService = 'email.cognito-idp.amazonaws.com';
const theServiceRoles = `arn:aws:iam::230345688874:role/aws-service-role/${theEmailService}/*`;
const theRolesOfEmi = 'arn:aws:iam::230345688874:role/emi-*';
const makeTheRole = 'iam:CreateServiceLinkedRole';

defineFeature(feature, (test) => {
  let configuration = '';
  let applyPolicy = '';
  let plan: PolicyStatement[] = [];
  let apply: PolicyStatement[] = [];

  const readTheRoles = (): void => {
    configuration = configurationOf(vaultInfrastructure);
    applyPolicy = bodyOf(configuration, 'data "aws_iam_policy_document" "apply"');
    plan = statementsIn(bodyOf(configuration, 'data "aws_iam_policy_document" "plan"'));
    apply = statementsIn(applyPolicy);
  };

  /** Each resource a grant of one action stands on, with every variable read as its value. */
  const scopeOf = (statements: readonly PolicyStatement[], action: string): string[][] =>
    statementsReaching(statements, action).map((statement) =>
      statement.resources.map((resource) => resolved(configuration, resource)),
    );

  test('a merge may make the role the email service sends through', ({
    given,
    when,
    then,
    and,
  }) => {
    given('the two roles the pipeline assumes', readTheRoles);

    when('the grant the pool needs is read', () => {
      expect(statementsReaching(apply, makeTheRole)).not.toEqual([]);
    });

    then('a merge may make a service linked role for the email service', () => {
      const granting = statementsReaching(apply, makeTheRole);

      expect(granting.map((statement) => statement.sid)).toEqual(['MakeTheEmailServiceRole']);
      expect(granting[0]?.actions).toEqual([makeTheRole]);
    });

    and('it may make one under the path of that service and under no other path', () => {
      expect(scopeOf(apply, makeTheRole)).toEqual([[theServiceRoles]]);
      expect(grantedOnEveryResource(apply, makeTheRole)).toBe(false);
    });

    and('the condition names that service again', () => {
      const statement = statementTextIn(applyPolicy, 'MakeTheEmailServiceRole');

      expect(statement).toContain('test     = "StringEquals"');
      expect(statement).toContain('variable = "iam:AWSServiceName"');
      expect(listedIn(statement, 'values')).toEqual([theEmailService]);
    });

    and('the roles of Emi stay in a statement of their own', () => {
      expect(statementsReaching(apply, 'iam:CreateRole').map((one) => one.sid)).toEqual([
        'TheProjectRoles',
      ]);
      expect(scopeOf(apply, 'iam:CreateRole')).toEqual([[theRolesOfEmi]]);
    });
  });

  test('neither role may send a message, and a pull request gains nothing', ({
    given,
    when,
    then,
    and,
  }) => {
    given('the two roles the pipeline assumes', readTheRoles);

    when('the grant the pool needs is read', () => {
      expect(apply).not.toEqual([]);
    });

    then('neither role may send a message', () => {
      for (const action of ['ses:SendEmail', 'ses:SendRawEmail', 'ses:SendBulkEmail']) {
        expect(scopeOf(apply, action)).toEqual([]);
        expect(scopeOf(plan, action)).toEqual([]);
      }
    });

    and('neither role may write a policy on a service linked role', () => {
      for (const action of ['iam:AttachRolePolicy', 'iam:PutRolePolicy']) {
        expect(scopeOf(apply, action).flat()).not.toContain(theServiceRoles);
        expect(scopeOf(plan, action)).toEqual([]);
      }
    });

    and('a pull request may not make one at all', () => {
      expect(scopeOf(plan, makeTheRole)).toEqual([]);
    });
  });
});
