import { join } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import {
  type PolicyStatement,
  bodyOf,
  configurationOf,
  grantedOnEveryResource,
  resolved,
  statementsIn,
  statementsReaching,
} from '../../tools/pipeline/policy';

const feature = loadFeature(join(__dirname, '26.2-the-deploy-roles.feature'));

const myemiZone = 'arn:aws:route53:::hostedzone/Z06550332F4OHMRD78K';
const changeARecord = 'route53:ChangeResourceRecordSets';
const readTheZone = 'route53:GetHostedZone';

defineFeature(feature, (test) => {
  test('the record grant reaches only the myemi.app zone', ({ given, when, then, and }) => {
    let configuration = '';
    let apply: PolicyStatement[] = [];
    let plan: PolicyStatement[] = [];
    let granting: PolicyStatement[] = [];

    const addressesOf = (statements: readonly PolicyStatement[]): string[] =>
      statements.flatMap((statement) =>
        statement.resources.map((resource) => resolved(configuration, resource)),
      );

    given('the two roles the pipeline assumes', () => {
      configuration = configurationOf(join(__dirname, '..', '..', 'infra'));
      apply = statementsIn(bodyOf(configuration, 'data "aws_iam_policy_document" "apply"'));
      plan = statementsIn(bodyOf(configuration, 'data "aws_iam_policy_document" "plan"'));

      expect(apply.length).toBeGreaterThan(0);
      expect(plan.length).toBeGreaterThan(0);
    });

    when('the grant that changes a record is read', () => {
      granting = statementsReaching(apply, changeARecord);
    });

    then('it names the myemi.app zone and no other resource', () => {
      expect(addressesOf(granting)).toEqual([myemiZone]);
    });

    and('no grant that stands on every resource changes a record', () => {
      expect(grantedOnEveryResource(apply, changeARecord)).toBe(false);
    });

    and('the role a pull request assumes reads the zone and changes no record', () => {
      expect(addressesOf(statementsReaching(plan, readTheZone))).toEqual([myemiZone]);
      expect(statementsReaching(plan, changeARecord)).toEqual([]);
    });
  });
});
