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

const feature = loadFeature(join(__dirname, '28.7-the-sender-permissions.feature'));

const repositoryRoot = join(__dirname, '..', '..');
const vaultInfrastructure = join(repositoryRoot, 'infra');

const theZone = 'arn:aws:route53:::hostedzone/Z06550332F4OHMRD78K';

const theIdentity = 'arn:aws:ses:eu-central-1:230345688874:identity/myemi.app';
const theConfigurationSet = 'arn:aws:ses:eu-central-1:230345688874:configuration-set/emi';
const theTopics = 'arn:aws:sns:eu-central-1:230345688874:emi-*';
const theAlarms = 'arn:aws:cloudwatch:eu-central-1:230345688874:alarm:emi-*';

const writes = {
  identity: 'ses:CreateEmailIdentity',
  mailFrom: 'ses:PutEmailIdentityMailFromAttributes',
  configurationSet: 'ses:CreateConfigurationSet',
  eventDestination: 'ses:CreateConfigurationSetEventDestination',
  topic: 'sns:CreateTopic',
  topicPolicy: 'sns:SetTopicAttributes',
  alarm: 'cloudwatch:PutMetricAlarm',
} as const;

const reads = {
  identity: 'ses:GetEmailIdentity',
  configurationSet: 'ses:GetConfigurationSet',
  eventDestination: 'ses:GetConfigurationSetEventDestinations',
  topic: 'sns:GetTopicAttributes',
} as const;

defineFeature(feature, (test) => {
  let configuration = '';
  let plan: PolicyStatement[] = [];
  let apply: PolicyStatement[] = [];

  /** Each resource a grant of one action stands on, with every variable read as its value. */
  const scopeOf = (statements: readonly PolicyStatement[], action: string): string[][] =>
    statementsReaching(statements, action).map((statement) =>
      statement.resources.map((resource) => resolved(configuration, resource)),
    );

  const readTheRoles = (): void => {
    configuration = configurationOf(vaultInfrastructure);
    plan = statementsIn(bodyOf(configuration, 'data "aws_iam_policy_document" "plan"'));
    apply = statementsIn(bodyOf(configuration, 'data "aws_iam_policy_document" "apply"'));
  };

  test('a merge may make the sender, and only in the resources of Emi', ({
    given,
    when,
    then,
    and,
  }) => {
    given('the two roles the pipeline assumes', readTheRoles);

    when('the grants the sender needs are read', () => {
      expect(apply).not.toEqual([]);
      expect(plan).not.toEqual([]);
    });

    then('a merge may make the identity, the configuration set, the topic and the alarms', () => {
      expect(scopeOf(apply, writes.identity)).toEqual([[theIdentity, theConfigurationSet]]);
      expect(scopeOf(apply, writes.mailFrom)).toEqual([[theIdentity, theConfigurationSet]]);
      expect(scopeOf(apply, writes.configurationSet)).toEqual([[theIdentity, theConfigurationSet]]);
      expect(scopeOf(apply, writes.eventDestination)).toEqual([[theIdentity, theConfigurationSet]]);
      expect(scopeOf(apply, writes.topic)).toEqual([[theTopics]]);
      expect(scopeOf(apply, writes.topicPolicy)).toEqual([[theTopics]]);
      expect(scopeOf(apply, writes.alarm)).toEqual([[theAlarms]]);
    });

    and('each of those grants names a resource of Emi and never every resource', () => {
      for (const action of Object.values(writes)) {
        expect(grantedOnEveryResource(apply, action)).toBe(false);
      }
    });

    and('a record change still names the myemi.app zone and no other zone', () => {
      const changeARecord = 'route53:ChangeResourceRecordSets';

      expect(statementsReaching(apply, changeARecord).map((statement) => statement.sid)).toEqual([
        'TheMyemiZone',
      ]);
      expect(scopeOf(apply, changeARecord)).toEqual([[theZone]]);
      expect(grantedOnEveryResource(apply, changeARecord)).toBe(false);
    });
  });

  test('a pull request reads the sender and writes none of it', ({ given, when, then, and }) => {
    given('the two roles the pipeline assumes', readTheRoles);

    when('the grants the sender needs are read', () => {
      expect(plan).not.toEqual([]);
    });

    then('a pull request reads the identity, the configuration set and the topic', () => {
      expect(scopeOf(plan, reads.identity)).toEqual([[theIdentity, theConfigurationSet]]);
      expect(scopeOf(plan, reads.configurationSet)).toEqual([[theIdentity, theConfigurationSet]]);
      expect(scopeOf(plan, reads.eventDestination)).toEqual([[theIdentity, theConfigurationSet]]);
      expect(scopeOf(plan, reads.topic)).toEqual([[theTopics]]);
      // An alarm is read through a grant that stands on every resource, because the reference for
      // DescribeAlarms says a narrower scope returns nothing. Its tags are read by address.
      expect(grantedOnEveryResource(plan, 'cloudwatch:DescribeAlarms')).toBe(true);
      expect(scopeOf(plan, 'cloudwatch:ListTagsForResource')).toEqual([[theAlarms]]);
    });

    and('it holds no write of any of them', () => {
      for (const action of Object.values(writes)) {
        expect(scopeOf(plan, action)).toEqual([]);
      }
    });

    and('neither role may send a message or read a suppressed address', () => {
      for (const action of [
        'ses:SendEmail',
        'ses:SendBulkEmail',
        'ses:SendRawEmail',
        'ses:GetSuppressedDestination',
        'ses:ListSuppressedDestinations',
        'sns:Publish',
        'sns:Subscribe',
      ]) {
        expect(scopeOf(plan, action)).toEqual([]);
        expect(scopeOf(apply, action)).toEqual([]);
      }
    });
  });
});
