import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import {
  type PolicyStatement,
  bodyOf,
  configurationOf,
  grantedOnEveryResource,
  resolved,
  statementTextIn,
  statementsIn,
  statementsReaching,
  valueOf,
} from '../../tools/pipeline/policy';
import { pairsIn, writtenSecretsIn } from '../../tools/pipeline/signIn';

const feature = loadFeature(join(__dirname, 'the-telegram-sign-in-may-read-its-keys.feature'));

const repositoryRoot = join(__dirname, '..', '..');
const vaultInfrastructure = join(repositoryRoot, 'infra');

const parameter = (name: string): string =>
  `arn:aws:ssm:eu-central-1:230345688874:parameter/emi/accounts/telegram/${name}`;

const theVaultTable = 'aws_dynamodb_table.vault.arn';
const theKeys = 'arn:aws:kms:eu-central-1:230345688874:key/*';
const theParameterStore = 'ssm.eu-central-1.amazonaws.com';
const everyFunctionOfEmi = 'arn:aws:lambda:*:230345688874:function:emi-*';
const everyRoleOfEmi = 'arn:aws:iam::230345688874:role/emi-*';
const everyPool = 'arn:aws:cognito-idp:*:230345688874:userpool/*';

const parameterWrites = ['ssm:PutParameter', 'ssm:DeleteParameter', 'ssm:DeleteParameters'];

/**
 * A picture and a typeface are left out by their kind. A value pasted into either is not text, and
 * decoding one as text invents matches nobody wrote.
 */
const binaryKinds = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'ttf', 'otf', 'woff', 'woff2'];

function trackedTextFiles(): string[] {
  const listed = spawnSync('git', ['ls-files', '--cached', '--exclude-standard'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });

  if (listed.status !== 0) {
    throw new Error(`git could not list the tracked files: ${listed.stderr}`);
  }

  return listed.stdout
    .split('\n')
    .filter((file) => file.length > 0)
    .filter((file) => !binaryKinds.includes(file.split('.').slice(-1)[0] ?? ''))
    .filter((file) => statSync(join(repositoryRoot, file)).isFile());
}

defineFeature(feature, (test) => {
  let configuration = '';
  let signIn: PolicyStatement[] = [];
  let challenge: PolicyStatement[] = [];
  let apply: PolicyStatement[] = [];
  let plan: PolicyStatement[] = [];
  let signInPolicy = '';
  let challengePolicy = '';

  const scopeOf = (statements: readonly PolicyStatement[], action: string): string[][] =>
    statementsReaching(statements, action).map((statement) =>
      statement.resources.map((resource) => resolved(configuration, resource)),
    );

  const readTheRoles = (): void => {
    configuration = configurationOf(vaultInfrastructure);
    signInPolicy = bodyOf(configuration, 'data "aws_iam_policy_document" "sign_in_telegram"');
    challengePolicy = bodyOf(configuration, 'data "aws_iam_policy_document" "sign_in_challenge"');
    signIn = statementsIn(signInPolicy);
    challenge = statementsIn(challengePolicy);
    apply = statementsIn(bodyOf(configuration, 'data "aws_iam_policy_document" "apply"'));
    plan = statementsIn(bodyOf(configuration, 'data "aws_iam_policy_document" "plan"'));
  };

  test('the function reads three values by name, and writes the salt and one item', ({
    given,
    when,
    then,
    and,
  }) => {
    given('the roles of the Telegram sign in', readTheRoles);

    when('the grants of the function that answers a code are read', () => {
      expect(signIn).not.toEqual([]);
    });

    then('it reads the bot identifier, the client secret and the salt, each named in full', () => {
      expect(scopeOf(signIn, 'ssm:GetParameter')).toEqual([
        [parameter('bot-id'), parameter('client-secret'), parameter('salt')],
      ]);
      expect(grantedOnEveryResource(signIn, 'ssm:GetParameter')).toBe(false);
    });

    // Feature 7 pays with Telegram Stars through the same bot, so the one credential that can act
    // as the bot stays off the sign in path. A prefix would reach it.
    and('it reads the bot token through no grant and no prefix', () => {
      expect(signInPolicy).not.toContain('bot-token');

      for (const named of scopeOf(signIn, 'ssm:GetParameter').flat()) {
        expect(named).not.toContain('*');
      }
    });

    and('it writes the salt and no other parameter', () => {
      expect(scopeOf(signIn, 'ssm:PutParameter')).toEqual([[parameter('salt')]]);
    });

    and('it writes one item to the vault table and reads nothing from it', () => {
      expect([...signIn.flatMap((statement) => statement.actions)].sort()).toEqual([
        'dynamodb:PutItem',
        'kms:Decrypt',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'ssm:GetParameter',
        'ssm:PutParameter',
      ]);
      expect(scopeOf(signIn, 'dynamodb:PutItem')).toEqual([[theVaultTable]]);
      expect(signInPolicy).not.toContain('/index/');
    });

    and('it decrypts a secure string only through a parameter store call', () => {
      const text = resolved(configuration, statementTextIn(signInPolicy, 'DecryptASecureString'));

      expect(scopeOf(signIn, 'kms:Decrypt')).toEqual([[theKeys]]);
      expect(text).toContain('StringEquals');
      expect(text).toContain('kms:ViaService');
      expect(text).toContain(theParameterStore);
    });
  });

  test('nothing may take the salt away, because the salt is permanent', ({
    given,
    when,
    then,
    and,
  }) => {
    given('the roles of the Telegram sign in', readTheRoles);

    when('the grants of the function that answers a code are read', () => {
      expect(signIn).not.toEqual([]);
    });

    then('no role of this account may delete a parameter', () => {
      for (const statements of [signIn, challenge, apply, plan]) {
        expect(scopeOf(statements, 'ssm:DeleteParameter')).toEqual([]);
        expect(scopeOf(statements, 'ssm:DeleteParameters')).toEqual([]);
      }
      expect(configuration).not.toContain('ssm:Delete');
    });

    and('Terraform reads the salt through no data source', () => {
      const read = [...configuration.matchAll(/data "aws_ssm_parameter" "([a-z_]+)"/g)]
        .flatMap((match) => (match[1] === undefined ? [] : [match[1]]))
        .map((name) =>
          valueOf(
            configuration,
            pairsIn(bodyOf(configuration, `data "aws_ssm_parameter" "${name}"`)).name ?? '',
          ),
        );

      expect(read).toEqual([
        '/emi/accounts/apple/services-id',
        '/emi/accounts/apple/team-id',
        '/emi/accounts/apple/key-id',
        '/emi/accounts/apple/private-key',
        '/emi/accounts/google/client-id',
        '/emi/accounts/google/client-secret',
      ]);
    });

    and('Terraform creates the salt through no resource', () => {
      expect(configuration).not.toContain('resource "aws_ssm_parameter"');
    });

    and('the readme says the salt is permanent', () => {
      const readme = readFileSync(join(vaultInfrastructure, 'README.md'), 'utf8');

      expect(readme).toContain('The salt is permanent');
      expect(readme).toContain('/emi/accounts/telegram/salt');
      expect(readme).toContain('BotFather');
    });
  });

  test('the three triggers reach the table and hold no secret', ({ given, when, then, and }) => {
    given('the roles of the Telegram sign in', readTheRoles);

    when('the grants of the three triggers are read', () => {
      expect(challenge).not.toEqual([]);
    });

    then('they spend a one time answer with a delete and nothing else', () => {
      expect([...challenge.flatMap((statement) => statement.actions)].sort()).toEqual([
        'dynamodb:DeleteItem',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ]);
      expect(scopeOf(challenge, 'dynamodb:DeleteItem')).toEqual([[theVaultTable]]);
    });

    and('they hold no parameter and no decrypt at all', () => {
      for (const action of ['ssm:GetParameter', ...parameterWrites, 'kms:Decrypt']) {
        expect(scopeOf(challenge, action)).toEqual([]);
      }
      expect(challengePolicy).not.toContain('/accounts/');
    });

    and('they reach the vault table and no other table', () => {
      expect(scopeOf(challenge, 'dynamodb:GetItem')).toEqual([]);
      expect(scopeOf(challenge, 'dynamodb:Query')).toEqual([]);
      expect(challengePolicy).not.toContain('aws_dynamodb_table.articles');
      expect(challengePolicy).not.toContain('/index/');
    });
  });

  test('no secret is written as a value anywhere in the repository', ({
    given,
    when,
    then,
    and,
  }) => {
    let files: string[] = [];
    let found: string[] = [];
    const aPrivateKey = `${'-'.repeat(5)}BEGIN PRIVATE KEY${'-'.repeat(5)}\n${'a'.repeat(64)}\n`;
    const aGoogleSecret = `GOCSPX-${'b'.repeat(28)}`;
    const aBotToken = `12345678:AA${'c'.repeat(33)}`;

    given('every tracked file a person reads as text', () => {
      files = trackedTextFiles();

      expect(files.length).toBeGreaterThan(500);
      expect(files).toContain('infra/lambda.tf');
    });

    when('each file is read for the shape of a secret', () => {
      found = files.flatMap((file) =>
        writtenSecretsIn(file, readFileSync(join(repositoryRoot, file), 'utf8')),
      );
    });

    then('no file holds a private key, a Google secret or a Telegram bot token', () => {
      expect(found).toEqual([]);
    });

    and('a value pasted into any one of them fails this scenario', () => {
      for (const written of [aPrivateKey, aGoogleSecret, aBotToken]) {
        expect(writtenSecretsIn('infra/lambda.tf', written)).toHaveLength(1);
      }
    });

    and('the sentence names the kind of secret and never the value', () => {
      const [said] = writtenSecretsIn('a/file.ts', aBotToken);

      expect(said).toContain('a Telegram bot token');
      expect(said).not.toContain('c'.repeat(33));
    });

    // A rule that refuses a written key has to name the header of one to refuse it, and so does
    // the test that proves the rule works.
    and('a rule that names the header of a key is left alone', () => {
      expect(
        writtenSecretsIn('a/test.ts', "expect(sent).not.toContain('BEGIN PRIVATE KEY');\n"),
      ).toEqual([]);
      expect(writtenSecretsIn('a/rule.ts', "const markers = ['GOCSPX'];\n")).toEqual([]);
    });
  });

  test('the apply role already reaches the roles and the functions that assume them', ({
    given,
    when,
    then,
    and,
  }) => {
    given('the roles of the Telegram sign in', readTheRoles);

    when('the grants a merge needs for this sign in are read', () => {
      expect(apply).not.toEqual([]);
      expect(plan).not.toEqual([]);
    });

    then('a merge makes a function of Emi and lets a principal invoke one', () => {
      for (const action of ['lambda:CreateFunction', 'lambda:AddPermission']) {
        expect(scopeOf(apply, action)).toEqual([[everyFunctionOfEmi]]);
        expect(grantedOnEveryResource(apply, action)).toBe(false);
      }
    });

    and('a merge makes a role of Emi and hands it to a function', () => {
      for (const action of ['iam:CreateRole', 'iam:PutRolePolicy', 'iam:PassRole']) {
        expect(scopeOf(apply, action)).toEqual([[everyRoleOfEmi]]);
        expect(grantedOnEveryResource(apply, action)).toBe(false);
      }
    });

    and('a merge sets the triggers on the pool', () => {
      expect(scopeOf(apply, 'cognito-idp:UpdateUserPool')).toEqual([[everyPool]]);
    });

    and('a pull request reads a function and a role and makes neither', () => {
      expect(statementsReaching(plan, 'lambda:GetFunction')).not.toEqual([]);
      expect(statementsReaching(plan, 'iam:GetRolePolicy')).not.toEqual([]);

      for (const action of ['lambda:CreateFunction', 'iam:CreateRole', 'iam:PutRolePolicy']) {
        expect(scopeOf(plan, action)).toEqual([]);
      }
    });
  });
});
