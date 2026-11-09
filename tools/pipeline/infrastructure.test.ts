import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

import { parse } from 'yaml';

import {
  type PolicyStatement,
  bodyOf as blockBodyOf,
  configurationOf,
  defaultOf as variableDefaultOf,
  grantedOnEveryResource,
  listedIn,
  regionOfAlias,
  resolved,
  standsOnEveryResource,
  statementTextIn,
  statementsIn,
  statementsReaching,
  valueOf,
} from './policy.ts';
import {
  credentialValuesIn,
  pairsIn,
  theSiteAddress,
  theWaysAClientOffers,
  websiteSignInProblems,
  writtenSecretsIn,
} from './signIn.ts';
import { deployedFunctions, uploadOrder } from '../deploy/functions.ts';
import { carriesTheAuthorizer, readTheRoutes, routesWithNoAuthorizer } from '../deploy/routes.ts';
import { SITE_ORIGIN } from '../../apps/website/lib/addresses.ts';
import { languages } from '../../apps/website/app/words/language.ts';

const repositoryRoot = resolve(__dirname, '..', '..');
const infrastructureDirectory = join(repositoryRoot, 'infra');

type Step = { name?: string; uses?: string; run?: string; if?: string };
type Job = {
  if?: string;
  env?: Record<string, string>;
  steps?: Step[];
  strategy?: { matrix?: Record<string, string[]> };
};
type Workflow = {
  on?: Record<string, { branches?: string[]; paths?: string[] }>;
  permissions?: Record<string, string>;
  jobs?: Record<string, Job>;
};

function read(file: string): string {
  return readFileSync(join(repositoryRoot, file), 'utf8');
}

const deployText = read('.github/workflows/deploy.yml');
const deploy = parse(deployText) as Workflow;
const job = (name: string): Job => {
  const found = deploy.jobs?.[name];
  if (!found) {
    throw new Error(`the deploy workflow has no ${name} job`);
  }
  return found;
};

const configuration = configurationOf(infrastructureDirectory);
const website = configurationOf(join(repositoryRoot, 'infrastructure', 'website'));
const certificateModule = configurationOf(
  join(repositoryRoot, 'infrastructure', 'modules', 'certificate'),
);

const bodyOf = (header: string): string => blockBodyOf(configuration, header);

/**
 * Every action one policy grants, read out of the action lists of its statements. A condition
 * names a key in the same shape an action is written in, so a search over the whole text reads
 * kms:ViaService as a grant.
 */
function actionsIn(policy: string): string[] {
  return statementsIn(policy).flatMap((statement) => statement.actions);
}

/**
 * An action that changes nothing. Almost every read is named Get, List or Describe, and two are
 * not. apigateway:GET is the one read of that service. kms:Decrypt returns the plaintext of a
 * ciphertext and changes no key, and the parameter store needs it to hand over a secure string.
 */
const aRead = /^(apigateway:GET|kms:Decrypt|[a-z0-9-]+:(Get|List|Describe)[A-Za-z]*)$/;

/** Every action of one policy that is not a read, which is what the plan role may not hold. */
function writesIn(policy: string): string[] {
  return actionsIn(policy).filter((action) => !aRead.test(action));
}

function firstStepOf(name: string): Step {
  const first = (job(name).steps ?? [])[0];
  if (!first) {
    throw new Error(`the ${name} job has no steps`);
  }
  return first;
}

const defaultOf = (variable: string): string => variableDefaultOf(configuration, variable);

/** The run script of one named step, so a rule reads the step it means and not the whole job. */
function scriptOf(jobName: string, stepName: string): string {
  const found = (job(jobName).steps ?? []).find((step) => step.name === stepName);

  if (found?.run === undefined) {
    throw new Error(`the ${jobName} job has no ${stepName} step that runs anything`);
  }

  return found.run;
}

/** The words a shell for loop walks, so a rule reads the list the step actually iterates. */
function forListIn(script: string, variable: string): string[] {
  const found = new RegExp(`for ${variable} in ([^;\\n]+)`).exec(script);

  return found?.[1]?.trim().split(/\s+/) ?? [];
}

/** The roots one job runs over, which is empty where the job runs over nothing. */
const matrixRootsOf = (jobName: string): string[] => job(jobName).strategy?.matrix?.root ?? [];

/**
 * Every Terraform root the repository holds, found by the backend each one declares. A directory
 * with no backend is a module, and a module is applied by whoever calls it. So the backend is what
 * makes a directory a root, and a root the pipeline does not name is a root somebody would apply
 * by hand.
 */
function terraformRoots(): string[] {
  const listed = spawnSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '*.tf'],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
    },
  );

  if (listed.status !== 0) {
    throw new Error(`git could not list the Terraform files: ${listed.stderr}`);
  }

  const roots = listed.stdout
    .split('\n')
    .filter((file) => file.length > 0)
    .filter((file) => read(file).includes('backend "s3"'))
    .map((file) => dirname(file));

  return [...new Set(roots)].sort();
}

/**
 * Every tracked file a person reads as text, which is what a rule about a written secret reads.
 * A picture and a typeface are left out by their kind: a value pasted into either is not text,
 * and decoding one as text invents matches nobody wrote.
 */
function trackedTextFiles(): string[] {
  const binaryKinds = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'ttf', 'otf', 'woff', 'woff2'];
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

/**
 * Every for_each expression of one configuration, each read to the blank line that closes it. A
 * key has to be known before the plan runs, so what a loop is driven from is a rule and not a
 * style.
 */
function loopsIn(configuration: string): string[] {
  return [...configuration.matchAll(/for_each\s*=\s*([\s\S]*?)\n\s*\n/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1].trim()],
  );
}

function expressionOf(name: string): string {
  const found = new RegExp(`\\n\\s+${name}\\s+=\\s+"([^"]*)"`).exec(configuration);
  if (!found?.[1]) {
    throw new Error(`the configuration has no ${name}`);
  }
  return found[1];
}

/**
 * A subject local with every variable reference replaced by that variable's default. A token is
 * matched against the finished string, so an assertion on the expression alone would pass while
 * the pieces composed into a subject the account refuses.
 */
function subjectOf(name: string): string {
  return expressionOf(name).replace(/\$\{var\.[a-z_]+\}/g, (reference) =>
    defaultOf(reference.slice('${var.'.length, -1)),
  );
}

/**
 * An action that acts on no single resource. The account evaluates each one against an account
 * level resource, which carries no name: the error a denial gives for the log groups names it as
 * `log-group::log-stream:`. A statement whose resource pattern requires a name can never match
 * that, so the action is denied however many resources the role owns.
 *
 * The list is knowledge about the services this account uses, and it is deliberately wider than
 * what the project reads with today, so the rule below meets a new one already written down.
 */
const collectionLevelActions: readonly string[] = [
  'acm:ListCertificates',
  'acm:RequestCertificate',
  'cloudfront:CreateCachePolicy',
  'cloudfront:CreateFunction',
  'cloudfront:CreateOriginAccessControl',
  'cloudfront:CreateResponseHeadersPolicy',
  'cloudfront:ListCachePolicies',
  'cloudfront:ListDistributions',
  'cloudfront:ListFunctions',
  'cloudfront:ListOriginAccessControls',
  'cloudfront:ListResponseHeadersPolicies',
  'cloudwatch:DescribeAlarms',
  'cognito-idp:CreateUserPool',
  'cognito-idp:DescribeUserPoolDomain',
  'cognito-idp:ListUserPools',
  'dynamodb:ListTables',
  'iam:ListOpenIDConnectProviders',
  'iam:ListRoles',
  'lambda:ListFunctions',
  'logs:DescribeLogGroups',
  'route53:GetChange',
  'route53:ListHostedZones',
  'route53:ListHostedZonesByName',
  's3:ListAllMyBuckets',
  'ses:ListConfigurationSets',
  'ses:ListEmailIdentities',
  'sns:ListTopics',
];

/** Each collection level action a statement names while standing on a named resource. */
function deniedByItsScope(statements: readonly PolicyStatement[], role: string): string[] {
  return statements
    .filter((statement) => !standsOnEveryResource(statement))
    .flatMap((statement) =>
      statement.actions
        .filter((action) => collectionLevelActions.includes(action))
        .map(
          (action) =>
            `the ${role} role names ${action} in the statement ${statement.sid}, which stands on ${statement.resources.join(' and ')}, and that action acts on no single resource`,
        ),
    );
}

const table = bodyOf('resource "aws_dynamodb_table" "vault"');
const planPolicy = bodyOf('data "aws_iam_policy_document" "plan"');
const applyPolicy = bodyOf('data "aws_iam_policy_document" "apply"');
const planTrust = bodyOf('data "aws_iam_policy_document" "plan_trust"');
const applyTrust = bodyOf('data "aws_iam_policy_document" "apply_trust"');
const authorizerPolicy = bodyOf('data "aws_iam_policy_document" "authorizer"');
const articlesPolicy = bodyOf('data "aws_iam_policy_document" "articles"');
const articlesTable = bodyOf('resource "aws_dynamodb_table" "articles"');
const articlesRoute = bodyOf('resource "aws_apigatewayv2_route" "read_articles"');
const articlesFunction = bodyOf('resource "aws_lambda_function" "articles"');
const logFormat = bodyOf('access_log_settings');

describe('the infrastructure is applied only by the pipeline', () => {
  describe('the merge is the only thing that applies', () => {
    it('runs the apply on a push to main and on nothing else', () => {
      expect(job('apply').if).toBe(
        "github.event_name == 'push' && github.ref == 'refs/heads/main'",
      );
    });

    it('gives a pull request a plan instead', () => {
      const planRuns = (job('plan').steps ?? []).map((step) => step.run ?? '').join('\n');

      expect(planRuns).toContain('terraform plan');
      expect(planRuns).not.toContain('terraform apply');
    });

    it('applies from no other job', () => {
      const elsewhere = Object.entries(deploy.jobs ?? {})
        .filter(([name]) => name !== 'apply')
        .filter(([, each]) =>
          (each.steps ?? []).some((step) => (step.run ?? '').includes('terraform apply')),
        )
        .map(([name]) => name);

      expect(elsewhere).toEqual([]);
    });

    it('applies from no other workflow and no package script', () => {
      const workflows = readdirSync(join(repositoryRoot, '.github/workflows'));
      const elsewhere = workflows
        .filter((file) => file !== 'deploy.yml')
        .filter((file) => read(`.github/workflows/${file}`).includes('terraform apply'));

      const scripts = JSON.parse(read('package.json')) as {
        scripts: Record<string, string>;
      };

      expect(elsewhere).toEqual([]);
      expect(Object.values(scripts.scripts).filter((s) => s.includes('terraform'))).toEqual([]);
    });
  });

  describe('a gate piped into a filter', () => {
    /** Every run script of the workflow, with the job that holds it. */
    const scripts = Object.entries(deploy.jobs ?? {}).flatMap(([name, each]) =>
      (each.steps ?? []).flatMap((step) =>
        step.run === undefined ? [] : [{ job: name, run: step.run }],
      ),
    );

    // A shell pipeline exits with the status of its last command, so terraform plan piped into tee
    // reports what tee did. GitHub documents the default shell as bash -e, and pipefail arrives
    // only when a step names its shell, so a refused plan reads as a green job.
    it('is read by its own status and not by the status of the filter', () => {
      const unguarded = scripts
        .filter((script) => /\|\s*(tee|head|tail|grep)\b/.test(script.run))
        .filter((script) => !script.run.includes('set -o pipefail'))
        .map(
          (script) =>
            `the ${script.job} job pipes a command into a filter and reads the status of the filter`,
        );

      expect(unguarded).toEqual([]);
    });

    it('is there to be found, so an empty list is not a pass by accident', () => {
      expect(scripts.filter((script) => /\|\s*tee\b/.test(script.run))).not.toEqual([]);
    });
  });

  describe('the pipeline carries no key of its own', () => {
    it('reads each role from a repository variable', () => {
      expect(job('plan').env?.ROLE).toBe('${{ vars.AWS_PLAN_ROLE_ARN }}');
      expect(job('apply').env?.ROLE).toBe('${{ vars.AWS_APPLY_ROLE_ARN }}');
    });

    it('asks for the token that assumes a role', () => {
      expect(deploy.permissions?.['id-token']).toBe('write');
    });

    it('names no static credential anywhere in a workflow', () => {
      const named = readdirSync(join(repositoryRoot, '.github/workflows')).filter((file) => {
        const text = read(`.github/workflows/${file}`);
        return text.includes('aws-access-key-id') || text.includes('AWS_SECRET_ACCESS_KEY');
      });

      expect(named).toEqual([]);
    });
  });

  describe('while the roles do not exist yet', () => {
    it.each(['plan', 'apply'])(
      'skips every step of the %s job that reaches the account',
      (name) => {
        const steps = job(name).steps ?? [];
        const unguarded = steps.slice(1).filter((step) => step.if !== "env.ROLE != ''");

        expect(steps.length).toBeGreaterThan(1);
        expect(unguarded).toEqual([]);
      },
    );

    it.each(['plan', 'apply'])('leaves the %s job one step that says what it waits for', (name) => {
      const first = firstStepOf(name);

      expect(first.if).toBeUndefined();
      expect(first.run).toContain('infra/README.md');
    });

    it('names the bootstrap as the one thing a person runs by hand', () => {
      const readme = read('infra/README.md');

      expect(readme).toContain('terraform -chdir=infra init && terraform -chdir=infra apply');
      expect(readme).toContain('AWS_PLAN_ROLE_ARN');
      expect(readme).toContain('AWS_APPLY_ROLE_ARN');
    });
  });

  describe('the two roles', () => {
    it('trusts the apply role for the main branch alone', () => {
      expect(applyTrust).toContain(
        'values   = [local.main_subject_by_name, local.main_subject_by_id]',
      );
      expect(subjectOf('main_subject_by_name')).toBe('repo:atlantic-blue/emi:ref:refs/heads/main');
      expect(subjectOf('main_subject_by_id')).toBe(
        'repo:atlantic-blue@140661232/emi@1374431048:ref:refs/heads/main',
      );
    });

    it('lets a pull request assume only the plan role', () => {
      expect(planTrust).toContain(
        'values   = [local.pull_request_subject_by_name, local.pull_request_subject_by_id]',
      );
      expect(subjectOf('pull_request_subject_by_name')).toBe('repo:atlantic-blue/emi:pull_request');
      expect(subjectOf('pull_request_subject_by_id')).toBe(
        'repo:atlantic-blue@140661232/emi@1374431048:pull_request',
      );
      expect(applyTrust).not.toContain('pull_request_subject');
    });

    it('matches every subject exactly, so a branch named after main cannot assume it', () => {
      expect(applyTrust).not.toContain('StringLike');
      expect(planTrust).not.toContain('StringLike');
    });

    it('builds the numeric spelling from variables, so no subject carries a written identifier', () => {
      for (const name of ['main_subject_by_id', 'pull_request_subject_by_id']) {
        expect(expressionOf(name)).toContain('${var.github_org_id}');
        expect(expressionOf(name)).toContain('${var.github_repo_id}');
        expect(expressionOf(name)).not.toMatch(/[0-9]/);
      }

      expect(defaultOf('github_org_id')).toBe('140661232');
      expect(defaultOf('github_repo_id')).toBe('1374431048');
    });

    it('gives the plan role nothing but reads', () => {
      expect(actionsIn(planPolicy).length).toBeGreaterThan(0);
      expect(writesIn(planPolicy)).toEqual([]);
    });
  });

  describe('the vault table, which is contract TABLE-4', () => {
    it('is keyed by the account and then the item', () => {
      expect(table).toContain('hash_key  = "pk"');
      expect(table).toContain('range_key = "sk"');
    });

    it('carries the byUpdated index, so a pull is one query', () => {
      const index = bodyOf('local_secondary_index');

      expect(index).toContain('name            = "byUpdated"');
      expect(index).toContain('range_key       = "updatedAt"');
      expect(index).toContain('projection_type = "ALL"');
    });

    it('bills per request, so an idle vault costs nothing', () => {
      expect(table).toContain('billing_mode = "PAY_PER_REQUEST"');
    });

    it('keeps point in time recovery and encryption on', () => {
      expect(bodyOf('point_in_time_recovery')).toContain('enabled = true');
      expect(bodyOf('server_side_encryption')).toContain('enabled = true');
    });
  });

  describe('what the account is not allowed to hold', () => {
    it.each([
      'aws_db_instance',
      'aws_rds_cluster',
      'aws_elasticache_cluster',
      'aws_opensearch_domain',
      'aws_nat_gateway',
      'aws_lb',
      'aws_instance',
    ])('declares no %s, because it would bill while nobody uses Emi', (kind) => {
      expect(configuration).not.toContain(`resource "${kind}"`);
    });
  });

  describe('nothing about her reaches a log', () => {
    it('logs a request identifier, a route template and a duration, and no header', () => {
      const format = bodyOf('access_log_settings');

      expect(format).toContain('$context.requestId');
      expect(format).toContain('$context.routeKey');
      expect(format).toContain('$context.responseLatency');
      expect(format).not.toContain('$context.identity');
      expect(format).not.toContain('$context.authorizer');
      expect(format).not.toContain('$context.path');
    });

    it('throws every line away after a month', () => {
      const groups = [...configuration.matchAll(/retention_in_days = ([^\n]+)/g)].flatMap(
        (match) => (match[1] ? [match[1]] : []),
      );

      expect(groups).toHaveLength(4);
      expect(new Set(groups)).toEqual(new Set(['var.log_retention_days']));
      expect(bodyOf('variable "log_retention_days"')).toContain('default     = 30');
    });
  });

  describe('the request signature, which is contract AUTH-1', () => {
    it('caches no answer, so a replayed signature cannot pass on a cache hit', () => {
      expect(bodyOf('resource "aws_apigatewayv2_authorizer" "signature"')).toContain(
        'authorizer_result_ttl_in_seconds = 0',
      );
    });

    it('reads the account and writes the signature down, and does nothing else to the table', () => {
      expect(actionsIn(authorizerPolicy).sort()).toEqual([
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ]);
    });

    it('reaches no other table, so one account cannot be read through another', () => {
      expect(authorizerPolicy).toContain('resources = [aws_dynamodb_table.vault.arn]');
      expect(authorizerPolicy).not.toContain('/index/');
    });
  });

  describe('the article catalogue, which is read by phase and never by reader', () => {
    it('takes no authorizer, so a request carries nothing that names an account', () => {
      expect(articlesRoute).toContain('authorization_type = "NONE"');
      expect(articlesRoute).not.toContain('authorizer_id');
    });

    it('reads the phase out of the path, so the route key the log writes is a template', () => {
      expect(articlesRoute).toContain('route_key          = "GET /v1/articles/{phase}"');
      expect(logFormat).toContain('$context.routeKey');
    });

    it('logs no variable that carries the filled path, so no line can say which phase was read', () => {
      const named = [...logFormat.matchAll(/\$context\.([A-Za-z]+)/g)].map((match) => match[1]);

      expect(named.sort()).toEqual([
        'httpMethod',
        'requestId',
        'responseLatency',
        'routeKey',
        'status',
      ]);
    });

    it('gives the function one action on one table, and no write', () => {
      expect(actionsIn(articlesPolicy).sort()).toEqual([
        'dynamodb:Query',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ]);
    });

    it('cannot reach the vault table, so a route with no authorizer cannot reach her partition', () => {
      expect(articlesPolicy).toContain('resources = [aws_dynamodb_table.articles.arn]');
      expect(articlesPolicy).not.toContain('aws_dynamodb_table.vault');
      expect(articlesFunction).toContain('role          = aws_iam_role.articles.arn');
      expect(articlesFunction).toContain('EMI_ARTICLES_TABLE');
      expect(articlesFunction).not.toContain('EMI_VAULT_TABLE');
    });

    it('bills per request and keeps its writing encrypted', () => {
      expect(articlesTable).toContain('billing_mode = "PAY_PER_REQUEST"');
      expect(articlesTable).toContain('hash_key  = "pk"');
      expect(articlesTable).toContain('range_key = "sk"');
    });
  });

  describe('an action that acts on no single resource, which is the deploy of 2026-09-19', () => {
    const planStatements = statementsIn(planPolicy);
    const applyStatements = statementsIn(applyPolicy);

    it('reads both policies, so the rules below stand on statements and not on a file', () => {
      expect(planStatements.map((statement) => statement.sid)).toEqual([
        'ReadTheState',
        'ReadTheStateObject',
        'DescribeWhatExists',
        'ReadTheWebsiteCertificate',
        'ReadTheDistribution',
        'ReadTheWebsiteBucket',
        'ReadTheMyemiZone',
        'ReadTheUserPool',
        'ReadTheIdentityProviders',
        'ReadTheUserPoolDomain',
        'ReadTheProviderKeys',
        'DecryptAProviderKey',
        'ReadTheSender',
        'ReadTheEmailEventTopic',
        'ReadTheEmailAlarmTags',
        'ReadEveryAlarm',
      ]);
      expect(applyStatements.length).toBeGreaterThan(5);
      expect(applyStatements.every((statement) => statement.actions.length > 0)).toBe(true);
    });

    it('names no such action in a statement that stands on a named resource', () => {
      expect([
        ...deniedByItsScope(planStatements, 'plan'),
        ...deniedByItsScope(applyStatements, 'apply'),
      ]).toEqual([]);
    });

    it('grants the apply role every such action the plan role reads the account with', () => {
      const read = collectionLevelActions.filter((action) =>
        grantedOnEveryResource(planStatements, action),
      );
      const denied = read.filter((action) => !grantedOnEveryResource(applyStatements, action));

      expect(read).toContain('logs:DescribeLogGroups');
      expect(
        denied.map(
          (action) =>
            `the apply role reads with ${action}, and grants it only where a resource is named`,
        ),
      ).toEqual([]);
    });

    it('refuses a statement that names one of them beside a resource pattern', () => {
      const written = `
  statement {
    sid       = "TheLogGroups"
    effect    = "Allow"
    actions   = ["logs:DescribeLogGroups", "logs:PutLogEvents"]
    resources = ["arn:aws:logs:*:1:log-group:/aws/*/emi-*"]
  }
`;
      const [said] = deniedByItsScope(statementsIn(written), 'apply');

      expect(said).toContain('logs:DescribeLogGroups');
      expect(said).toContain('TheLogGroups');
      expect(said).toContain('arn:aws:logs:*:1:log-group:/aws/*/emi-*');
    });

    it('accepts the same action once it stands on every resource', () => {
      const written = `
  statement {
    sid       = "ListTheLogGroups"
    effect    = "Allow"
    actions   = ["logs:DescribeLogGroups"]
    resources = ["*"]
  }
`;
      const statements = statementsIn(written);

      expect(deniedByItsScope(statements, 'apply')).toEqual([]);
      expect(grantedOnEveryResource(statements, 'logs:DescribeLogGroups')).toBe(true);
    });

    it('reads a wildcard on a named resource as no grant at all, because the name denies it', () => {
      const written = `
  statement {
    sid       = "TheLogGroups"
    effect    = "Allow"
    actions   = ["logs:*"]
    resources = ["arn:aws:logs:*:1:log-group:/aws/*/emi-*"]
  }
`;

      expect(grantedOnEveryResource(statementsIn(written), 'logs:DescribeLogGroups')).toBe(false);
    });

    it('reads a wildcard on every resource as a grant, because that is how the account reads it', () => {
      const written = `
  statement {
    sid       = "Everything"
    effect    = "Allow"
    actions   = ["logs:Describe*"]
    resources = ["*"]
  }
`;

      expect(grantedOnEveryResource(statementsIn(written), 'logs:DescribeLogGroups')).toBe(true);
    });

    it('reads a local as a named resource, so a state bucket does not stand for every bucket', () => {
      const written = `
  statement {
    sid       = "ListTheStateBucket"
    effect    = "Allow"
    actions   = ["s3:ListAllMyBuckets"]
    resources = [local.state_bucket_arn]
  }
`;

      expect(deniedByItsScope(statementsIn(written), 'apply')).toHaveLength(1);
    });
  });

  describe('the record grant reaches only the myemi.app zone', () => {
    const planStatements = statementsIn(planPolicy);
    const applyStatements = statementsIn(applyPolicy);
    const theZone = 'arn:aws:route53:::hostedzone/Z06550332F4OHMRD78K';
    const changeARecord = 'route53:ChangeResourceRecordSets';
    const zonelessActions = [
      'route53:GetChange',
      'route53:ListHostedZones',
      'route53:ListHostedZonesByName',
    ];

    /** Each resource a statement stands on, with every variable reference read as its value. */
    const resourcesOf = (statements: readonly PolicyStatement[]): string[] =>
      statements.flatMap((statement) =>
        statement.resources.map((resource) => resolved(configuration, resource)),
      );

    it('names one zone in the grant that changes a record, and no other resource', () => {
      const granting = statementsReaching(applyStatements, changeARecord);

      expect(granting.map((statement) => statement.sid)).toEqual(['TheMyemiZone']);
      expect(resourcesOf(granting)).toEqual([theZone]);
    });

    it('changes a record through no statement that stands on every resource', () => {
      expect(grantedOnEveryResource(applyStatements, changeARecord)).toBe(false);
      expect(grantedOnEveryResource(planStatements, changeARecord)).toBe(false);
    });

    it('lets a pull request read the one zone and change no record anywhere', () => {
      expect(resourcesOf(statementsReaching(planStatements, 'route53:GetHostedZone'))).toEqual([
        theZone,
      ]);
      expect(
        resourcesOf(statementsReaching(planStatements, 'route53:ListResourceRecordSets')),
      ).toEqual([theZone]);
      expect(statementsReaching(planStatements, changeARecord)).toEqual([]);
    });

    it.each(zonelessActions)('grants %s on every resource, which is where it acts', (action) => {
      expect(grantedOnEveryResource(applyStatements, action)).toBe(true);
      expect(grantedOnEveryResource(planStatements, action)).toBe(true);
    });

    // The website root looks the zone up with data "aws_route53_zone", and that read fills the
    // data source's tags, so the provider calls ListTagsForResource on the zone. Without the
    // action the plan is refused before it reaches a resource, so this is the grant the lookup
    // stands on rather than one the records need.
    it('reads the tags of that one zone, because the zone lookup reads them', () => {
      const readTheTags = 'route53:ListTagsForResource';

      for (const statements of [applyStatements, planStatements]) {
        expect(resourcesOf(statementsReaching(statements, readTheTags))).toEqual([theZone]);
        expect(grantedOnEveryResource(statements, readTheTags)).toBe(false);
      }
    });

    it('reads the certificate from us-east-1 alone, because CloudFront reads it from nowhere else', () => {
      const certificates = `arn:aws:acm:us-east-1:${defaultOf('account_id')}:certificate/*`;

      for (const statements of [applyStatements, planStatements]) {
        expect(resourcesOf(statementsReaching(statements, 'acm:DescribeCertificate'))).toEqual([
          certificates,
        ]);
      }

      expect(grantedOnEveryResource(applyStatements, 'acm:RequestCertificate')).toBe(true);
    });

    it('holds every CloudFront grant to the resources of this account', () => {
      const scoped = applyStatements.filter(
        (statement) =>
          statement.sid === 'TheDistribution' || statement.sid === 'ReadTheDistribution',
      );
      const account = defaultOf('account_id');

      expect(resourcesOf(scoped)).toEqual([
        `arn:aws:cloudfront::${account}:distribution/*`,
        `arn:aws:cloudfront::${account}:origin-access-control/*`,
        `arn:aws:cloudfront::${account}:function/*`,
        `arn:aws:cloudfront::${account}:response-headers-policy/*`,
        `arn:aws:cloudfront::${account}:cache-policy/*`,
      ]);
      expect(grantedOnEveryResource(applyStatements, 'cloudfront:CreateDistribution')).toBe(false);
    });

    it('writes in no bucket but the one the website is served from', () => {
      const bucket = applyStatements.filter((statement) => statement.sid === 'TheWebsiteBucket');

      expect(resourcesOf(bucket)).toEqual([
        'arn:aws:s3:::emi-website-*',
        'arn:aws:s3:::emi-website-*/*',
      ]);
      expect(grantedOnEveryResource(applyStatements, 's3:PutObject')).toBe(false);
      expect(grantedOnEveryResource(planStatements, 's3:GetObject')).toBe(false);
    });

    it('needs no new grant for the website state, because a star matches a slash as well', () => {
      const key = resolved(configuration, expressionOf('state_key_arn'));
      const covers = (object: string): boolean =>
        new RegExp(`^${key.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`).test(object);

      expect(key).toBe('arn:aws:s3:::abs-terraform/emi/*');
      expect(covers('arn:aws:s3:::abs-terraform/emi/website/terraform.tfstate')).toBe(true);
      expect(covers('arn:aws:s3:::abs-terraform/emi/website/terraform.tfstate.tflock')).toBe(true);
      expect(covers('arn:aws:s3:::abs-terraform/sava-mix/terraform.tfstate')).toBe(false);
    });

    it('gives the plan role the read of every grant the apply role writes with', () => {
      const reads = [
        'acm:DescribeCertificate',
        'cloudfront:GetDistribution',
        'cloudfront:GetOriginAccessControl',
        'cloudfront:GetResponseHeadersPolicy',
        'cloudfront:ListDistributions',
        'route53:GetHostedZone',
        's3:GetBucketPolicy',
      ];
      const missing = reads.filter(
        (action) => statementsReaching(planStatements, action).length === 0,
      );

      expect(missing).toEqual([]);
    });

    it('names each statement it adds, so a reviewer reads the scope without a plan', () => {
      const added = [
        'TheWebsiteCertificate',
        'AskForACertificate',
        'TheDistribution',
        'MakeADistributionPart',
        'TheWebsiteBucket',
        'TheMyemiZone',
        'ReadARecordChange',
      ];
      const sids = applyStatements.map((statement) => statement.sid);

      expect(added.filter((sid) => !sids.includes(sid))).toEqual([]);
    });
  });

  // Step 26.4 serves the site from a Lambda function behind the distribution, and the roles as
  // they stand refuse four calls that shape makes. Creating a distribution that carries tags is a
  // different action from creating one without them, and the website root tags everything. The
  // function url and three parts of the bucket are read by every plan once they exist, and a part
  // a plan cannot read refuses the plan rather than reporting a difference.
  describe('the grants the site on Lambda needs, which is step 26.4', () => {
    const planStatements = statementsIn(planPolicy);
    const applyStatements = statementsIn(applyPolicy);
    const theBucket = 'arn:aws:s3:::emi-website-*';
    const bucketParts = [
      's3:GetAccelerateConfiguration',
      's3:GetBucketNotification',
      's3:GetBucketOwnershipControls',
    ];

    /** Each resource a statement stands on, with every variable reference read as its value. */
    const resourcesOf = (statements: readonly PolicyStatement[]): string[] =>
      statements.flatMap((statement) =>
        statement.resources.map((resource) => resolved(configuration, resource)),
      );

    it('creates a distribution that carries tags, which is an action of its own', () => {
      const granting = statementsReaching(applyStatements, 'cloudfront:CreateDistributionWithTags');

      expect(granting.map((statement) => statement.sid)).toEqual(['TheDistribution']);
      expect(resourcesOf(granting)).toContain(
        `arn:aws:cloudfront::${defaultOf('account_id')}:distribution/*`,
      );
      expect(grantedOnEveryResource(applyStatements, 'cloudfront:CreateDistributionWithTags')).toBe(
        false,
      );
    });

    it('reads the function url, where the other reads of a function already stand', () => {
      const granting = statementsReaching(planStatements, 'lambda:GetFunctionUrlConfig');

      expect(granting.map((statement) => statement.sid)).toEqual(['DescribeWhatExists']);
      expect(statementsReaching(planStatements, 'lambda:GetFunction')[0]?.sid).toBe(
        'DescribeWhatExists',
      );
    });

    it.each(bucketParts)('reads %s on the site bucket and on no other bucket', (action) => {
      expect(resourcesOf(statementsReaching(planStatements, action))).toEqual([theBucket]);
      expect(grantedOnEveryResource(planStatements, action)).toBe(false);
    });

    it('leaves the plan role reading, so not one of the four grants writes', () => {
      const added = ['lambda:GetFunctionUrlConfig', ...bucketParts];
      const actions = actionsIn(planPolicy);

      expect(added.filter((action) => !actions.includes(action))).toEqual([]);
      expect(writesIn(planPolicy)).toEqual([]);
      expect(statementsReaching(planStatements, 'cloudfront:CreateDistributionWithTags')).toEqual(
        [],
      );
    });
  });
  describe('the state', () => {
    it('sits in the shared bucket under a key of Emi own', () => {
      const backend = bodyOf('backend "s3"');

      expect(backend).toContain('bucket       = "abs-terraform"');
      expect(backend).toContain('key          = "emi/terraform.tfstate"');
    });
  });
});

describe('the deployed functions carry the bundle the pipeline uploads', () => {
  const functionsJob = 'functions';
  const theGuard = "env.SHIPS == 'true' && env.ROLE != ''";

  /** Every run script of the workflow, with the job that holds it. */
  const everyScript = Object.entries(deploy.jobs ?? {}).flatMap(([name, each]) =>
    (each.steps ?? []).flatMap((step) =>
      step.run === undefined ? [] : [{ job: name, run: step.run }],
    ),
  );

  /**
   * Every command of one script, with a continuation line joined to the line it continues, so a
   * rule about one call reads the whole call rather than the line a flag happens to sit on.
   */
  function commandsIn(script: string): string[] {
    return script
      .replace(/\\\n\s*/g, ' ')
      .split(/[\n;]/)
      .map((command) => command.trim())
      .filter((command) => command.length > 0 && !command.startsWith('#'));
  }

  const uploads = everyScript.flatMap(({ job: name, run }) =>
    commandsIn(run)
      .filter((command) => command.includes('update-function-code'))
      .map((command) => ({ job: name, command })),
  );

  /** A step that reaches the account: it assumes a role, or it runs the tool that calls one. */
  function reachesTheAccount(step: Step): boolean {
    return (
      /(^|\s)(aws|terraform) /.test(step.run ?? '') ||
      (step.uses ?? '').startsWith('aws-actions/') ||
      (step.uses ?? '').startsWith('hashicorp/setup-terraform')
    );
  }

  const lambdaResources = [...configuration.matchAll(/resource "aws_lambda_function" "(\w+)"/g)]
    .flatMap((found) => (found[1] === undefined ? [] : [`aws_lambda_function.${found[1]}`]))
    .sort();

  describe('Terraform stops owning the code', () => {
    it.each(deployedFunctions.map((held) => [held.name, held.resource]))(
      'leaves the code of %s out of the comparison, so an apply cannot put the placeholder back',
      (_name, resource) => {
        expect(bodyOf(`resource "${resource.replace('.', '" "')}"`)).toContain(
          'ignore_changes = [filename, source_code_hash]',
        );
      },
    );

    it('creates each function from a placeholder, so a function with no upload yet answers 501', () => {
      for (const held of deployedFunctions) {
        const body = bodyOf(`resource "${held.resource.replace('.', '" "')}"`);

        expect(body).toContain('filename         = data.archive_file.');
        expect(body).toContain('source_code_hash = data.archive_file.');
      }
    });
  });

  describe('the list of functions and the Terraform cannot drift apart', () => {
    it('gives every function in the list a resource that creates it', () => {
      const missing = deployedFunctions
        .filter((held) => !lambdaResources.includes(held.resource))
        .map((held) => `${held.name} is in the list and ${held.resource} is in no Terraform file`);

      expect(deployedFunctions.length).toBeGreaterThan(0);
      expect(missing).toEqual([]);
    });

    it('gives every function the Terraform creates an entry in the list, so none ships unpackaged', () => {
      expect(lambdaResources).toEqual(deployedFunctions.map((held) => held.resource).sort());
    });

    it('uploads every function in the list, in the order the list names', () => {
      expect([...uploadOrder].sort()).toEqual(deployedFunctions.map((held) => held.name).sort());
      expect(
        forListIn(scriptOf(functionsJob, 'put the new code on each function'), 'name'),
      ).toEqual([...uploadOrder]);
    });

    it('uploads the authorizer first, because registration stands behind no authorizer', () => {
      expect(uploadOrder[0]).toBe('emi-authorizer');
      expect(uploadOrder[uploadOrder.length - 1]).toBe('emi-vault');
    });
  });

  describe('the functions job builds on both events and ships on a merge', () => {
    it('ships on a push to main and on nothing else', () => {
      expect(job(functionsJob).env?.SHIPS).toBe(
        "${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}",
      );
    });

    it('waits for the apply, and runs anyway on the event that skips it', () => {
      expect(job(functionsJob).if).toBe(job('website').if);
    });

    it('builds every bundle and loads each one before anything is uploaded', () => {
      const names = (job(functionsJob).steps ?? []).map((step) => step.name ?? step.uses ?? '');
      const built = names.indexOf('build one bundle for each function');
      const loaded = names.indexOf('load every bundle the way the platform loads it');
      const uploaded = names.indexOf('put the new code on each function');
      const read = names.indexOf('read the live api');

      expect(built).toBeGreaterThan(-1);
      expect(loaded).toBeGreaterThan(built);
      expect(uploaded).toBeGreaterThan(loaded);
      expect(read).toBe(names.length - 1);
    });

    it('proves every bundle on a pull request too, so neither build step waits on the role', () => {
      const steps = job(functionsJob).steps ?? [];
      const building = steps.filter((step) =>
        /npm run (build:functions|check:bundles)/.test(step.run ?? ''),
      );

      expect(building).toHaveLength(2);
      expect(building.map((step) => step.if)).toEqual([undefined, undefined]);
    });

    it('runs at all when a change touches the service, its packages or the deploy tools', () => {
      for (const event of ['pull_request', 'push']) {
        for (const named of [
          'services/vault/**',
          'packages/crypto/**',
          'packages/tokens/**',
          'tools/deploy/**',
        ]) {
          expect(deploy.on?.[event]?.paths).toContain(named);
        }
      }
    });
  });

  describe('while the apply role variable is empty', () => {
    it('skips every step of the functions job that reaches the account', () => {
      const reaching = (job(functionsJob).steps ?? []).filter(reachesTheAccount);
      const unguarded = reaching
        .filter((step) => step.if !== theGuard)
        .map((step) => `${step.name ?? step.uses} reaches the account without the guard`);

      expect(reaching.length).toBeGreaterThan(1);
      expect(unguarded).toEqual([]);
    });

    it('leaves the functions job one step that says what it waits for', () => {
      const first = firstStepOf(functionsJob);

      expect(first.if).toBeUndefined();
      expect(first.run).toContain('infra/README.md');
    });
  });

  describe('an upload prints the version and nothing else', () => {
    // The answer of update-function-code is the whole configuration of the function, and that
    // carries its environment variables. A log of a public repository is readable by anybody.
    it('leaves the answer of no upload open, in any job of this workflow', () => {
      const open = uploads
        .filter(({ command }) => !command.includes('> /dev/null') && !command.includes('--query'))
        .map(
          ({ job: name, command }) => `the ${name} job runs ${command} with its answer left open`,
        );

      expect(open).toEqual([]);
    });

    it('reads an upload out of more than one job, so an empty list is not a pass by accident', () => {
      expect(uploads.map(({ job: name }) => name)).toContain(functionsJob);
      expect(uploads.length).toBeGreaterThan(1);
    });

    it('waits for each function to report itself updated before the next one is uploaded', () => {
      const script = scriptOf(functionsJob, 'put the new code on each function');

      expect(script).toContain('aws lambda wait function-updated');
      expect(script.indexOf('update-function-code')).toBeLessThan(
        script.indexOf('aws lambda wait function-updated'),
      );
    });
  });

  describe('no route lets anybody through, which the deploy reads from the live api', () => {
    const routes = readTheRoutes(repositoryRoot);

    it('puts the authorizer in front of every route but the ones named here', () => {
      const open = routes
        .filter((route) => !carriesTheAuthorizer(route))
        .map((route) => route.resource);

      expect(routes.length).toBeGreaterThan(routesWithNoAuthorizer.length);
      expect(open.sort()).toEqual([...routesWithNoAuthorizer].sort());
    });

    it('names each route with no authorizer, so a new one fails here and not in the account', () => {
      for (const named of routesWithNoAuthorizer) {
        expect(routes.map((route) => route.resource)).toContain(named);
      }
    });

    it('reads the live api as the last step, and requires a refusal of every authorized route', () => {
      const script = scriptOf(functionsJob, 'read the live api');

      expect(script).toContain('terraform -chdir=infra output -raw api_endpoint');
      expect(script).toContain('npm run read:live-api');
    });
  });
});

describe('the website on myemi.app, which is feature 26', () => {
  const inWebsite = (header: string): string => blockBodyOf(website, header);
  const inModule = (header: string): string => blockBodyOf(certificateModule, header);
  const call = (): string => inWebsite('module "certificate"');

  describe('the state sits apart from the vault, so a site change cannot move her days', () => {
    it('writes its own key in the shared bucket, with native locking', () => {
      const backend = inWebsite('backend "s3"');

      expect(backend).toContain('bucket       = "abs-terraform"');
      expect(backend).toContain('key          = "emi/website/terraform.tfstate"');
      expect(backend).toContain('region       = "us-east-1"');
      expect(backend).toContain('encrypt      = true');
      expect(backend).toContain('use_lockfile = true');
    });

    it('takes a key the vault root does not write', () => {
      expect(inWebsite('backend "s3"')).not.toContain('"emi/terraform.tfstate"');
      expect(bodyOf('backend "s3"')).toContain('key          = "emi/terraform.tfstate"');
    });
  });

  describe('the zone the registration owns', () => {
    it('is read and never declared, because a second zone takes the domain off the air', () => {
      expect(website).toContain('data "aws_route53_zone" "site"');
      expect(website).not.toContain('resource "aws_route53_zone"');
      expect(certificateModule).not.toContain('resource "aws_route53_zone"');
    });

    it('is the one zone the pipeline may change a record in', () => {
      const lookup = inWebsite('data "aws_route53_zone" "site"');

      expect(valueOf(website, /zone_id\s*=\s*([^\n]+)/.exec(lookup)?.[1] ?? '')).toBe(
        'Z06550332F4OHMRD78K',
      );
      expect(applyPolicy).toContain('arn:aws:route53:::hostedzone/Z06550332F4OHMRD78K');
    });
  });

  describe('the certificate, which CloudFront reads from us-east-1 alone', () => {
    it('is asked for through the provider in that region', () => {
      expect(call()).toContain('aws = aws.us_east_1');
      expect(regionOfAlias(website, 'us_east_1')).toBe('us-east-1');
    });

    it('covers myemi.app and www.myemi.app and no other name', () => {
      const primary = /domain_name\s*=\s*([^\n]+)/.exec(call())?.[1] ?? '';
      const covered = [primary, ...listedIn(call(), 'other_names')].map((name) =>
        valueOf(website, name),
      );

      expect(covered).toEqual(['myemi.app', 'www.myemi.app']);
    });

    it('is validated through the Domain Name System, which needs nobody to read an email', () => {
      expect(inModule('resource "aws_acm_certificate" "site"')).toContain(
        'validation_method         = "DNS"',
      );
    });

    it('writes one validation record for each name into the zone it was handed', () => {
      const record = inModule('resource "aws_route53_record" "validation"');

      expect(certificateModule).toContain('aws_acm_certificate.site.domain_validation_options');
      expect(record).toContain('for_each = toset(concat([var.domain_name], var.other_names))');
      expect(record).toContain('zone_id = var.zone_id');
      expect(call()).toContain('zone_id     = data.aws_route53_zone.site.zone_id');
    });

    it('drives no loop from a value that is unknown until the certificate exists', () => {
      const loops = [...loopsIn(certificateModule), ...loopsIn(website)];

      expect(loops).not.toEqual([]);
      expect(loops.filter((loop) => loop.includes('domain_validation_options'))).toEqual([]);
      expect(loops).toContain('toset(concat([var.domain_name], var.other_names))');
    });

    it('hands on an address that exists only once it is issued', () => {
      expect(inModule('output "certificate_arn"')).toContain(
        'aws_acm_certificate_validation.site.certificate_arn',
      );
      expect(inWebsite('output "certificate_arn"')).toContain('module.certificate.certificate_arn');
    });

    it('carries the tags the vault root carries, on both providers', () => {
      const blocks = [...website.matchAll(/default_tags \{\s*tags = \{([^}]*)\}/g)].flatMap(
        (match) => (match[1] === undefined ? [] : [match[1]]),
      );

      expect(blocks).toHaveLength(2);
      for (const block of blocks) {
        expect(block).toContain('Project   = var.project_name');
        expect(block).toContain('ManagedBy = "terraform"');
      }
    });
  });

  describe('what the website is not allowed to hold', () => {
    it.each([
      'aws_db_instance',
      'aws_rds_cluster',
      'aws_elasticache_cluster',
      'aws_opensearch_domain',
      'aws_nat_gateway',
      'aws_lb',
      'aws_instance',
    ])('declares no %s, because it would bill while nobody uses Emi', (kind) => {
      expect(website).not.toContain(`resource "${kind}"`);
      expect(certificateModule).not.toContain(`resource "${kind}"`);
    });
  });

  describe('the pipeline reads both roots', () => {
    it('plans and applies every Terraform root the repository holds', () => {
      const roots = terraformRoots();

      expect(roots).toEqual(['infra', 'infrastructure/website']);
      expect(matrixRootsOf('plan')).toEqual(roots);
      expect(matrixRootsOf('apply')).toEqual(roots);
    });

    it('formats and validates them in the job no credential reaches', () => {
      expect(forListIn(scriptOf('check', 'format'), 'directory')).toEqual([
        'infra',
        'infrastructure',
      ]);
      expect(forListIn(scriptOf('check', 'validate'), 'root')).toEqual(terraformRoots());
    });

    it('runs at all when a change touches either directory', () => {
      for (const event of ['pull_request', 'push']) {
        expect(deploy.on?.[event]?.paths).toContain('infra/**');
        expect(deploy.on?.[event]?.paths).toContain('infrastructure/**');
      }
    });
  });
});
describe('the site on Lambda behind CloudFront, which is step 26.4', () => {
  /**
   * Read when a rule asks for it, so a module that is not written yet fails the rules that read it
   * and not the whole file, which would take the ninety rules above down with it.
   */
  const siteModule = (): string =>
    configurationOf(join(repositoryRoot, 'infrastructure', 'modules', 'nextjs-site'));

  const inSite = (header: string): string => blockBodyOf(siteModule(), header);

  /** How many times a line appears in the module, so a rule can say "on every behaviour". */
  const times = (line: string): number => siteModule().split(line).length - 1;

  /**
   * The address a browser asks for each file under `apps/website/public`, read down through the
   * subfolders. Next.js copies that folder into the assets of the build under these same names, so
   * a file here is a file in the bucket, and one the distribution never asks the bucket for is a
   * 404 on a page.
   */
  const addressesOfThePublicFolder = (): string[] => {
    const folder = join(repositoryRoot, 'apps', 'website', 'public');

    return readdirSync(folder, { encoding: 'utf8', recursive: true })
      .filter((entry) => statSync(join(folder, entry)).isFile())
      .map((entry) => `/${entry.split(sep).join('/')}`)
      .sort();
  };

  describe('the assets, in a bucket only the distribution reads, which is SITE-2', () => {
    it('blocks every way a bucket can be made public', () => {
      const block = inSite('resource "aws_s3_bucket_public_access_block" "assets"');

      expect(block).toContain('block_public_acls       = true');
      expect(block).toContain('block_public_policy     = true');
      expect(block).toContain('ignore_public_acls      = true');
      expect(block).toContain('restrict_public_buckets = true');
    });

    it('lets no access control list say who reads it', () => {
      expect(inSite('resource "aws_s3_bucket_ownership_controls" "assets"')).toContain(
        'object_ownership = "BucketOwnerEnforced"',
      );
    });

    it('writes every object encrypted', () => {
      expect(
        inSite('resource "aws_s3_bucket_server_side_encryption_configuration" "assets"'),
      ).toContain('sse_algorithm = "AES256"');
    });

    it('is read by this distribution and by no other principal', () => {
      const policy = inSite('data "aws_iam_policy_document" "assets"');
      const [statement] = statementsIn(policy);

      expect(statement?.actions).toEqual(['s3:GetObject']);
      expect(policy).toContain('identifiers = ["cloudfront.amazonaws.com"]');
      expect(policy).toContain('variable = "AWS:SourceArn"');
      expect(policy).toContain('values   = [aws_cloudfront_distribution.site.arn]');
    });

    it('turns on no website endpoint, so the bucket has no address of its own', () => {
      expect(siteModule()).not.toContain('aws_s3_bucket_website_configuration');
    });

    it('carries the account in its name, because a bucket name is global', () => {
      expect(inSite('locals')).toContain(
        'bucket_name   = "${var.project_name}-website-${var.account_id}"',
      );
    });
  });

  describe('the server function, reachable only through the distribution, which is SITE-2', () => {
    it('answers a function url that refuses a call nobody signed', () => {
      expect(inSite('resource "aws_lambda_function_url" "server"')).toContain(
        'authorization_type = "AWS_IAM"',
      );
    });

    it('is called by this distribution and by no other principal', () => {
      const permission = inSite('resource "aws_lambda_permission" "server"');

      expect(permission).toContain('action                 = "lambda:InvokeFunctionUrl"');
      expect(permission).toContain('principal              = "cloudfront.amazonaws.com"');
      expect(permission).toContain('source_arn             = aws_cloudfront_distribution.site.arn');
      expect(permission).toContain('function_url_auth_type = "AWS_IAM"');
    });

    // A function url behind an origin access control is authorised twice, once for the url and
    // once for the function underneath it. With only the url name granted, every signed request
    // from the distribution answered 403, pointing at function url authorization.
    it('is granted both names an invoke through a function url is checked against', () => {
      const named = [...siteModule().matchAll(/"aws_lambda_permission" "(\w+)"/g)].flatMap(
        (found) => (found[1] === undefined ? [] : [found[1]]),
      );
      const blockOf = (name: string): string =>
        inSite(`resource "aws_lambda_permission" "${name}"`);
      const actions = named.map((name) => /action\s+=\s+"([^"]+)"/.exec(blockOf(name))?.[1]);

      expect([...actions].sort()).toEqual(['lambda:InvokeFunction', 'lambda:InvokeFunctionUrl']);

      // Read as values rather than as lines, because the two blocks align their names to
      // different widths and the rule is about who may call, not about the formatting.
      const valueOf = (block: string, field: string): string | undefined =>
        new RegExp(`${field}\\s+=\\s+(\\S+)`).exec(block)?.[1];

      for (const name of named) {
        expect(valueOf(blockOf(name), 'principal')).toBe('"cloudfront.amazonaws.com"');
        expect(valueOf(blockOf(name), 'source_arn')).toBe('aws_cloudfront_distribution.site.arn');
      }
    });

    it('runs on the runtime, the size and the entry point the step names', () => {
      const server = inSite('resource "aws_lambda_function" "server"');

      expect(server).toContain('handler       = "index.handler"');
      expect(server).toContain('runtime       = "nodejs22.x"');
      expect(server).toContain('architectures = ["arm64"]');
      expect(server).toContain('memory_size   = 1024');
      expect(server).toContain('timeout       = 10');
    });

    it('keeps its log lines for a fortnight, because a page view needs no longer', () => {
      const group = inSite('resource "aws_cloudwatch_log_group" "server"');

      expect(group).toContain('name              = "/aws/lambda/${local.function_name}"');
      expect(group).toContain('retention_in_days = 14');
    });

    it('may write its own logs and nothing else, so a fault here cannot reach her days', () => {
      const [statement] = statementsIn(inSite('data "aws_iam_policy_document" "server"'));

      expect(statement?.actions).toEqual(['logs:CreateLogStream', 'logs:PutLogEvents']);
      expect(statement?.resources).toEqual(['${aws_cloudwatch_log_group.server.arn}:*']);
    });

    it('keeps the code a deploy puts there, so an apply cannot put the placeholder back', () => {
      expect(inSite('resource "aws_lambda_function" "server"')).toContain(
        'ignore_changes = [filename, source_code_hash, layers, publish]',
      );
    });

    it('starts from the artifact a Lambda runtime can resolve, which is not TypeScript', () => {
      expect(inSite('data "archive_file" "placeholder"')).toContain(
        'source_file = "${path.module}/code/index.mjs"',
      );
    });
  });

  describe('both origins are signed, so neither answers the address it has of its own', () => {
    it.each([
      ['assets', 's3'],
      ['server', 'lambda'],
    ])('signs every request CloudFront makes to the %s origin', (origin, kind) => {
      const control = inSite(`resource "aws_cloudfront_origin_access_control" "${origin}"`);

      expect(control).toContain(`origin_access_control_origin_type = "${kind}"`);
      expect(control).toContain('signing_behavior                  = "always"');
      expect(control).toContain('signing_protocol                  = "sigv4"');
      expect(inSite('resource "aws_cloudfront_distribution" "site"')).toContain(
        `origin_access_control_id = aws_cloudfront_origin_access_control.${origin}.id`,
      );
    });
  });

  describe('every response carries the six headers of SITE-6', () => {
    const policy = (): string => inSite('resource "aws_cloudfront_response_headers_policy" "site"');

    it('asks for https for two years, under every name under myemi.app', () => {
      expect(policy()).toContain('access_control_max_age_sec = 63072000');
      expect(policy()).toContain('include_subdomains         = true');
    });

    it('allows the origin of the site and nothing else', () => {
      expect(policy()).toContain(
        `content_security_policy = "default-src 'self'; frame-ancestors 'none'"`,
      );
    });

    it('refuses a frame and a guess at a content type', () => {
      expect(policy()).toContain('frame_option = "DENY"');
      expect(policy()).toContain('content_type_options {');
    });

    it('sends no path of hers to another site', () => {
      expect(policy()).toContain('referrer_policy = "strict-origin-when-cross-origin"');
    });

    it('refuses the camera, the microphone and her location, which is the sixth', () => {
      expect(policy()).toContain('header   = "Permissions-Policy"');
      expect(policy()).toContain('value    = "camera=(), microphone=(), geolocation=()"');
    });

    it('is set over whatever a page answered, except the policy a page sets for itself', () => {
      const overrides = [...policy().matchAll(/override\s*=\s*(\w+)/g)].map((found) => found[1]);
      const kept = [...policy().matchAll(/(\w+) \{\s*[^}]*override\s*=\s*false/g)].map(
        (found) => found[1],
      );

      expect(overrides).toHaveLength(6);
      // Five are the edge's to state, and nothing a page says may take them off. The sixth is the
      // content policy, and the page writes a secret into that one for each response, so the edge
      // keeps what the page sent and adds its own only where a page sent none, which is a file
      // from the bucket.
      expect(overrides.filter((value) => value !== 'true')).toEqual(['false']);
      expect(kept).toEqual(['content_security_policy']);
      expect(
        times('response_headers_policy_id = aws_cloudfront_response_headers_policy.site.id'),
      ).toBe(2);
    });
  });

  describe('the distribution, which is the only way in', () => {
    const distribution = (): string => inSite('resource "aws_cloudfront_distribution" "site"');

    it('turns http into https on every behaviour, which closes SITE-1', () => {
      expect(times('viewer_protocol_policy     = "redirect-to-https"')).toBe(2);
      expect(distribution()).not.toContain('allow-all');
    });

    it('answers for the apex and for www, with the certificate of step 26.3', () => {
      expect(distribution()).toContain(
        'aliases             = concat([var.domain_name], var.other_names)',
      );
      expect(distribution()).toContain('acm_certificate_arn      = var.certificate_arn');
      expect(distribution()).toContain('minimum_protocol_version = "TLSv1.2_2021"');
    });

    it('speaks the two newer versions of http', () => {
      expect(distribution()).toContain('http_version        = "http2and3"');
    });

    it('keeps a page for as long as the page says, and no longer', () => {
      const cache = inSite('resource "aws_cloudfront_cache_policy" "pages"');

      expect(cache).toContain('min_ttl     = 0');
      expect(cache).toContain('default_ttl = 0');
    });

    it('varies a cached page on the four headers the App Router answers differently for', () => {
      const cache = inSite('resource "aws_cloudfront_cache_policy" "pages"');

      expect(listedIn(blockBodyOf(cache, 'headers {'), 'items')).toEqual([
        'next-router-prefetch',
        'next-router-state-tree',
        'next-url',
        'rsc',
      ]);
    });

    it('forwards every viewer header except Host, which a function url refuses to answer for', () => {
      expect(distribution()).toContain('origin_request_policy_id   = local.all_viewer_except_host');
      expect(inSite('locals')).toContain(
        'all_viewer_except_host = "b689b0a8-53d0-40ab-baf2-68738e2966ac"',
      );
    });

    it('sends the built files to the bucket and every other address to the function', () => {
      const assets = blockBodyOf(distribution(), 'dynamic "ordered_cache_behavior"');

      expect(listedIn(inSite('locals'), 'asset_paths')).toContain('/_next/static/*');
      expect(assets).toContain('for_each = local.asset_paths');
      expect(assets).toContain('target_origin_id           = "assets"');
      expect(blockBodyOf(distribution(), 'default_cache_behavior')).toContain(
        'target_origin_id           = "server"',
      );
    });

    it('sends every file the site keeps beside its pages to the bucket as well', () => {
      const addresses = addressesOfThePublicFolder();
      const sentToTheBucket = listedIn(inSite('locals'), 'asset_paths');

      expect(addresses.length).toBeGreaterThan(0);
      expect(addresses.filter((address) => !sentToTheBucket.includes(address))).toEqual([]);
    });

    it('runs the redirect at the edge, before a request reaches either origin', () => {
      const behaviour = blockBodyOf(distribution(), 'default_cache_behavior');

      expect(behaviour).toContain('event_type   = "viewer-request"');
      expect(behaviour).toContain('function_arn = aws_cloudfront_function.redirect.arn');
      expect(inSite('resource "aws_cloudfront_function" "redirect"')).toContain(
        'code    = file("${path.module}/code/redirect.js")',
      );
    });

    it('bills the cheaper price class, because her readers are in Europe', () => {
      expect(distribution()).toContain('price_class = "PriceClass_100"');
    });
  });

  describe('the addresses that reach it, which closes SITE-1', () => {
    it('points both names at the distribution, over version four and version six', () => {
      const record = inSite('resource "aws_route53_record" "site"');

      expect(record).toContain('["A", "AAAA"]');
      expect(record).toContain(
        'name                   = aws_cloudfront_distribution.site.domain_name',
      );
      expect(record).toContain('zone_id                = "Z2FDTNDATAQYW2"');
      expect(inSite('resource "aws_cloudfront_distribution" "site"')).toContain(
        'is_ipv6_enabled     = true',
      );
    });

    it('writes them in the zone the registration owns, and declares no zone', () => {
      expect(inSite('resource "aws_route53_record" "site"')).toContain('zone_id = var.zone_id');
      expect(siteModule()).not.toContain('resource "aws_route53_zone"');
    });
  });

  describe('the root hands the module what it cannot read for itself', () => {
    const call = (): string => blockBodyOf(website, 'module "site"');

    it('passes the certificate of step 26.3, which exists only once it is issued', () => {
      expect(call()).toContain('source = "../modules/nextjs-site"');
      expect(call()).toContain('certificate_arn = module.certificate.certificate_arn');
    });

    it('passes the zone it looked up and the account the bucket is named after', () => {
      expect(call()).toContain('zone_id         = data.aws_route53_zone.site.zone_id');
      expect(call()).toContain('account_id      = var.account_id');
      expect(variableDefaultOf(website, 'account_id')).toBe(defaultOf('account_id'));
    });

    it('hands on what a deploy needs to name, and nothing else', () => {
      for (const output of ['bucket_name', 'function_name', 'distribution_id']) {
        expect(blockBodyOf(website, `output "${output}"`)).toContain(`module.site.${output}`);
      }
    });
  });

  describe('what the module is not allowed to hold', () => {
    it.each([
      'aws_db_instance',
      'aws_rds_cluster',
      'aws_elasticache_cluster',
      'aws_opensearch_domain',
      'aws_nat_gateway',
      'aws_lb',
      'aws_instance',
    ])('declares no %s, because it would bill while nobody uses Emi', (kind) => {
      expect(siteModule()).not.toContain(`resource "${kind}"`);
    });
  });
});

describe('the pool she signs in to, which is step 28.2', () => {
  const cognito = read('infra/cognito.tf');
  const readme = read('infra/README.md');
  const pool = bodyOf('resource "aws_cognito_user_pool" "accounts"');
  const clients = ['iphone', 'website'] as const;

  const inClient = (name: string): string =>
    bodyOf(`resource "aws_cognito_user_pool_client" "${name}"`);

  describe('the pool carries a sign in and nothing of her', () => {
    it('is on the tier that carries the email one time code, which Lite does not', () => {
      expect(pool).toContain('user_pool_tier = "ESSENTIALS"');
    });

    it('allows the email code as a first factor, beside the password the service insists on', () => {
      const policy = blockBodyOf(pool, 'sign_in_policy');

      expect(listedIn(policy, 'allowed_first_auth_factors')).toEqual(['PASSWORD', 'EMAIL_OTP']);
    });

    it('asks for no second factor, because a code cannot be a first factor beside one', () => {
      expect(pool).toContain('mfa_configuration = "OFF"');
    });

    it('keeps her address out of the username, so a hashed name fits the same pool', () => {
      expect(listedIn(pool, 'alias_attributes')).toEqual(['email']);
      expect(configuration).not.toContain('username_attributes');
    });

    it('verifies an address itself, because an alias signs her in only once it is verified', () => {
      expect(listedIn(pool, 'auto_verified_attributes')).toEqual(['email']);
    });

    it('offers no way to recover a password, because there is no password to recover', () => {
      const recovery = blockBodyOf(pool, 'recovery_mechanism');

      expect(recovery).toContain('name     = "admin_only"');
      expect(pool).not.toContain('verified_email');
    });

    it('declares no attribute, so it holds no account identifier and no count of her days', () => {
      expect(pool).not.toContain('schema {');
      expect(cognito).not.toContain('custom:');
    });

    it('cannot be removed by a configuration change alone, as the vault table cannot', () => {
      expect(pool).toContain('deletion_protection = "ACTIVE"');
    });

    it('is made after the role is allowed to make it, and after the sender it names', () => {
      expect(listedIn(pool, 'depends_on')).toEqual([
        'aws_iam_role_policy.apply',
        'aws_sesv2_email_identity.sender',
      ]);
    });
  });

  describe('the two clients, one on her phone and one on the site', () => {
    it.each(clients)('gives the %s client no secret, because neither one can keep one', (name) => {
      expect(inClient(name)).toContain('generate_secret = false');
    });

    it.each(clients)('lets the %s client start a code sign in and refresh, and no more', (name) => {
      expect(listedIn(inClient(name), 'explicit_auth_flows')).toEqual([
        'ALLOW_USER_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
      ]);
    });

    it.each(clients)('keeps the %s client signed in for thirty days, by the hour', (name) => {
      const client = inClient(name);
      const units = blockBodyOf(client, 'token_validity_units');

      expect(client).toContain('access_token_validity  = 1');
      expect(client).toContain('id_token_validity      = 1');
      expect(client).toContain('refresh_token_validity = 30');
      expect(units).toContain('access_token  = "hours"');
      expect(units).toContain('refresh_token = "days"');
    });

    it.each(clients)('ends the %s token when she signs out', (name) => {
      expect(inClient(name)).toContain('enable_token_revocation = true');
    });

    it.each(clients)('never tells the %s client whether an address has an account', (name) => {
      expect(inClient(name)).toContain('prevent_user_existence_errors = "ENABLED"');
    });

    it.each(clients)('reads her address through the %s client and no other attribute', (name) => {
      const client = inClient(name);

      expect(listedIn(client, 'read_attributes')).toEqual(['email', 'email_verified']);
      expect(listedIn(client, 'write_attributes')).toEqual(['email']);
    });

    it.each(clients)('gives the %s client fifteen minutes to carry a code', (name) => {
      expect(inClient(name)).toContain('auth_session_validity = 15');
    });

    it('hands the application the pool, its issuer and both client identifiers', () => {
      expect(blockBodyOf(cognito, 'output "user_pool_id"')).toContain(
        'aws_cognito_user_pool.accounts.id',
      );
      expect(blockBodyOf(cognito, 'output "user_pool_issuer"')).toContain(
        '"https://${aws_cognito_user_pool.accounts.endpoint}"',
      );
      expect(blockBodyOf(cognito, 'output "iphone_client_id"')).toContain(
        'aws_cognito_user_pool_client.iphone.id',
      );
      expect(blockBodyOf(cognito, 'output "website_client_id"')).toContain(
        'aws_cognito_user_pool_client.website.id',
      );
    });
  });

  describe('what the pool carries, and what it still leaves out', () => {
    // This rule read the other way while the keys were missing. The pool named no provider at all,
    // and the file said so.
    it('names Apple and Google, and leaves Telegram to the sign in that needs a function', () => {
      expect(cognito).toContain('resource "aws_cognito_identity_provider" "apple"');
      expect(cognito).toContain('resource "aws_cognito_identity_provider" "google"');
      expect(configuration).not.toContain('"Telegram"');
    });

    // This rule read the other way while no client listed a provider. The buttons on the sign in
    // page are the other half of this, and they arrive with the page that draws them.
    it('offers Apple, Google and the code of the pool through the website client', () => {
      expect(theWaysAClientOffers(configuration, 'website')).toEqual([
        'COGNITO',
        'SignInWithApple',
        'Google',
      ]);
    });

    it('offers each provider through the resource that makes it, so no apply offers one early', () => {
      const offered = listedIn(inClient('website'), 'supported_identity_providers');

      expect(offered.slice(1)).toEqual([
        'aws_cognito_identity_provider.apple.provider_name',
        'aws_cognito_identity_provider.google.provider_name',
      ]);
      expect(inClient('website')).not.toContain('"SignInWithApple"');
    });

    it('leaves the application on her phone offering the code alone', () => {
      const phone = inClient('iphone');

      expect(listedIn(phone, 'supported_identity_providers')).toEqual([]);
      expect(listedIn(phone, 'callback_urls')).toEqual([]);
      expect(listedIn(phone, 'allowed_oauth_flows')).toEqual([]);
    });

    it('hands the browser a code to exchange, and never a token in an address', () => {
      const site = inClient('website');

      expect(listedIn(site, 'allowed_oauth_flows')).toEqual(['code']);
      expect(site).toContain('allowed_oauth_flows_user_pool_client = true');
      expect(listedIn(site, 'allowed_oauth_flows')).not.toContain('implicit');
    });

    it('asks for the subject and the address, and refuses a wider scope', () => {
      expect(listedIn(inClient('website'), 'allowed_oauth_scopes')).toEqual(['openid', 'email']);
      expect(
        websiteSignInProblems(
          configuration.replace(
            'allowed_oauth_scopes = ["openid", "email"]',
            'allowed_oauth_scopes = ["openid", "email", "profile"]',
          ),
          languages,
        ),
      ).toEqual([
        'the site asks for the scopes "openid email profile", and it may ask for "openid email" alone',
      ]);
    });

    it('comes back to the page of each language the site serves, and signs out to each sign in page', () => {
      const site = inClient('website');
      const address = (written: string): string => valueOf(configuration, written);

      expect(listedIn(site, 'callback_urls').map(address)).toEqual([
        'https://myemi.app/en/sign-in/returning/',
        'https://myemi.app/ru/sign-in/returning/',
        'https://myemi.app/es/sign-in/returning/',
      ]);
      expect(listedIn(site, 'logout_urls').map(address)).toEqual([
        'https://myemi.app/en/sign-in/',
        'https://myemi.app/ru/sign-in/',
        'https://myemi.app/es/sign-in/',
      ]);
      expect(languages).toEqual(['en', 'ru', 'es']);
      // The rules of the pool write the host out, and the site holds its own. A second spelling
      // of a host is a sign in that works on one of the two and not on the other.
      expect(theSiteAddress).toBe(SITE_ORIGIN);
    });

    // The code sent to her address signs a woman in today, and it travels in this flow. A client
    // that lost it would lose a sign in that works, and the two new providers would not replace it.
    it('keeps the flow the code sent to her address travels in', () => {
      expect(listedIn(inClient('website'), 'explicit_auth_flows')).toContain('ALLOW_USER_AUTH');
      expect(
        websiteSignInProblems(
          configuration.replace(
            'explicit_auth_flows = ["ALLOW_USER_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]\n\n  # The three ways',
            'explicit_auth_flows = ["ALLOW_REFRESH_TOKEN_AUTH"]\n\n  # The three ways',
          ),
          languages,
        ),
      ).toEqual(['the site lost ALLOW_USER_AUTH, so the code sent to her address signs nobody in']);
    });

    it('meets every rule of the sign in of the site', () => {
      expect(websiteSignInProblems(configuration, languages)).toEqual([]);
    });

    it('holds no secret and no private key, because this repository is public', () => {
      expect(credentialValuesIn(cognito)).toEqual([]);
      expect(cognito).not.toContain('bot_token');
    });

    // This rule read the other way until step 28.10. The pool named no sender, because none was
    // verified, and the readme said the code could not be delivered. Both are the other way now.
    it('names the sender of Emi, which step 28.10 gave it', () => {
      expect(pool).toContain('email_configuration');
      expect(readme).toContain('Amazon Simple Email Service');
    });
  });

  describe('the grants, so a merge makes the pool and a pull request only reads it', () => {
    const planStatements = statementsIn(planPolicy);
    const applyStatements = statementsIn(applyPolicy);
    const everyPool = `arn:aws:cognito-idp:*:${defaultOf('account_id')}:userpool/*`;

    const scopeOf = (statements: readonly PolicyStatement[], action: string): string[][] =>
      statementsReaching(statements, action).map((statement) =>
        statement.resources.map((resource) => resolved(configuration, resource)),
      );

    it('makes a pool through a statement that stands on every resource', () => {
      expect(grantedOnEveryResource(applyStatements, 'cognito-idp:CreateUserPool')).toBe(true);
    });

    it('changes a pool through a statement that names one, and never through a wider one', () => {
      for (const action of [
        'cognito-idp:UpdateUserPool',
        'cognito-idp:CreateUserPoolClient',
        'cognito-idp:DeleteUserPool',
      ]) {
        expect(scopeOf(applyStatements, action)).toEqual([[everyPool]]);
      }
    });

    it('gives the plan role the same read at the same scope', () => {
      expect(scopeOf(planStatements, 'cognito-idp:DescribeUserPool')).toEqual([[everyPool]]);
      expect(scopeOf(planStatements, 'cognito-idp:DescribeUserPoolClient')).toEqual([[everyPool]]);
    });

    it('gives the plan role no write of the pool at all', () => {
      for (const action of [
        'cognito-idp:CreateUserPool',
        'cognito-idp:CreateUserPoolClient',
        'cognito-idp:UpdateUserPool',
        'cognito-idp:UpdateUserPoolClient',
        'cognito-idp:DeleteUserPool',
        'cognito-idp:DeleteUserPoolClient',
        'cognito-idp:SetUserPoolMfaConfig',
        'cognito-idp:TagResource',
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminDeleteUser',
        'cognito-idp:ListUsers',
      ]) {
        expect(scopeOf(planStatements, action)).toEqual([]);
      }
    });
  });
});

// Step 28.10 sets email_configuration on the pool, with an email sending account of DEVELOPER, the
// myemi.app identity as the source and the configuration set of Emi. Saving that setting makes a
// service linked role, with the credentials of whoever saved it, so the apply role needs the
// action that makes one. This step grants it on its own, so step 28.10 cannot race a policy change
// the way pull request 515 did.
//
// The documentation names one action and no other: "The IAM permissions of this session must
// include the iam:CreateServiceLinkedRole action." Read on 7 November 2026 at
// https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html. No Simple Email
// Service action belongs to the caller, because the role carries the send, and no iam:PassRole
// either, because no role of Emi is handed to the service.
describe('the grant the pool needs before it may send, which is step 28.9', () => {
  const planStatements = statementsIn(planPolicy);
  const applyStatements = statementsIn(applyPolicy);
  const theEmailService = 'email.cognito-idp.amazonaws.com';
  const theServiceRoles = `arn:aws:iam::${defaultOf('account_id')}:role/aws-service-role/${theEmailService}/*`;
  const makeTheRole = 'iam:CreateServiceLinkedRole';

  const scopeOf = (statements: readonly PolicyStatement[], action: string): string[][] =>
    statementsReaching(statements, action).map((statement) =>
      statement.resources.map((resource) => resolved(configuration, resource)),
    );

  describe('a merge may make the role the service sends through', () => {
    it('grants the one action the documentation names', () => {
      const granting = statementsReaching(applyStatements, makeTheRole);

      expect(granting.map((statement) => statement.sid)).toEqual(['MakeTheEmailServiceRole']);
      expect(granting[0]?.actions).toEqual([makeTheRole]);
    });

    it('makes a role under the path of that one service, and under no other path', () => {
      expect(scopeOf(applyStatements, makeTheRole)).toEqual([[theServiceRoles]]);
      expect(grantedOnEveryResource(applyStatements, makeTheRole)).toBe(false);
    });

    it('names the service again in a condition, which is the form the documentation writes', () => {
      const statement = statementTextIn(applyPolicy, 'MakeTheEmailServiceRole');

      expect(statement).toContain('test     = "StringEquals"');
      expect(statement).toContain('variable = "iam:AWSServiceName"');
      expect(listedIn(statement, 'values')).toEqual([theEmailService]);
    });

    it('reaches no role of Emi through the path of a service, and the other way round', () => {
      const projectRoles = scopeOf(applyStatements, 'iam:CreateRole');

      expect(projectRoles).toEqual([[`arn:aws:iam::${defaultOf('account_id')}:role/emi-*`]]);
      expect(projectRoles.flat()).not.toContain(theServiceRoles);
      expect(statementsReaching(applyStatements, 'iam:CreateRole').map((one) => one.sid)).toEqual([
        'TheProjectRoles',
      ]);
    });
  });

  describe('what this grant deliberately leaves out', () => {
    it('sends no message itself, because the service linked role carries the send', () => {
      for (const action of ['ses:SendEmail', 'ses:SendRawEmail', 'ses:SendBulkEmail']) {
        expect(scopeOf(applyStatements, action)).toEqual([]);
        expect(scopeOf(planStatements, action)).toEqual([]);
      }
    });

    it('hands no role to the service, because the documentation names no iam:PassRole here', () => {
      const passing = statementsReaching(applyStatements, 'iam:PassRole');

      expect(passing.map((statement) => statement.sid)).toEqual(['TheProjectRoles']);
      expect(scopeOf(applyStatements, 'iam:PassRole')).toEqual([
        [`arn:aws:iam::${defaultOf('account_id')}:role/emi-*`],
      ]);
    });

    it('writes no policy on a service linked role, and deletes none', () => {
      for (const action of [
        'iam:AttachRolePolicy',
        'iam:PutRolePolicy',
        'iam:DeleteServiceLinkedRole',
        'iam:UpdateRoleDescription',
      ]) {
        expect(scopeOf(applyStatements, action).flat()).not.toContain(theServiceRoles);
      }
    });

    it('adds nothing to the plan role, because a plan reads the setting through the pool', () => {
      expect(scopeOf(planStatements, makeTheRole)).toEqual([]);
      expect(actionsIn(planPolicy).filter((action) => action.startsWith('iam:Create'))).toEqual([]);
      expect(
        scopeOf(planStatements, 'cognito-idp:DescribeUserPool').map((resources) =>
          resources.map((resource) => resource.split(':').slice(-1)[0]),
        ),
      ).toEqual([['userpool/*']]);
    });
  });
});

// Step 28.7 grants the two roles what step 28.8 then uses, and it grants nothing else. The split
// exists because an apply reads a policy per request: pull request 515 changed the apply role and
// made the user pool in one apply, the create ran a second after the policy change, and the
// account refused it because the new permission was not active yet. So the permissions merge on
// their own, and the resources follow in the next merge.
describe('the grants the sender needs, which is step 28.7', () => {
  const planStatements = statementsIn(planPolicy);
  const applyStatements = statementsIn(applyPolicy);
  const account = defaultOf('account_id');
  const region = defaultOf('region');
  const project = defaultOf('project_name');
  const theIdentity = `arn:aws:ses:${region}:${account}:identity/${defaultOf('domain_name')}`;
  const theConfigurationSet = `arn:aws:ses:${region}:${account}:configuration-set/${project}`;
  const theSender = [theIdentity, theConfigurationSet];
  const theTopics = `arn:aws:sns:${region}:${account}:${project}-*`;
  const theAlarms = `arn:aws:cloudwatch:${region}:${account}:alarm:${project}-*`;
  const theZone = 'arn:aws:route53:::hostedzone/Z06550332F4OHMRD78K';

  /** Each resource a grant of one action stands on, with every variable read as its value. */
  const scopeOf = (statements: readonly PolicyStatement[], action: string): string[][] =>
    statementsReaching(statements, action).map((statement) =>
      statement.resources.map((resource) => resolved(configuration, resource)),
    );

  const identityWrites = [
    'ses:CreateEmailIdentity',
    'ses:DeleteEmailIdentity',
    'ses:PutEmailIdentityConfigurationSetAttributes',
    'ses:PutEmailIdentityDkimSigningAttributes',
    'ses:PutEmailIdentityMailFromAttributes',
  ];

  const configurationSetWrites = [
    'ses:CreateConfigurationSet',
    'ses:CreateConfigurationSetEventDestination',
    'ses:DeleteConfigurationSet',
    'ses:DeleteConfigurationSetEventDestination',
    'ses:PutConfigurationSetReputationOptions',
    'ses:UpdateConfigurationSetEventDestination',
  ];

  const topicWrites = ['sns:CreateTopic', 'sns:DeleteTopic', 'sns:SetTopicAttributes'];

  const alarmWrites = ['cloudwatch:DeleteAlarms', 'cloudwatch:PutMetricAlarm'];

  const senderReads = [
    'ses:GetConfigurationSet',
    'ses:GetConfigurationSetEventDestinations',
    'ses:GetEmailIdentity',
  ];

  describe('the merge may make the sender, in the resources of Emi and in no others', () => {
    it.each(identityWrites)('writes %s on the myemi.app identity alone', (action) => {
      expect(scopeOf(applyStatements, action)).toEqual([theSender]);
      expect(grantedOnEveryResource(applyStatements, action)).toBe(false);
    });

    it.each(configurationSetWrites)('writes %s on the configuration set of Emi alone', (action) => {
      expect(scopeOf(applyStatements, action)).toEqual([theSender]);
      expect(grantedOnEveryResource(applyStatements, action)).toBe(false);
    });

    it.each(topicWrites)('writes %s on a topic named for Emi alone', (action) => {
      expect(scopeOf(applyStatements, action)).toEqual([[theTopics]]);
      expect(grantedOnEveryResource(applyStatements, action)).toBe(false);
    });

    it.each(alarmWrites)('writes %s on an alarm named for Emi alone', (action) => {
      expect(scopeOf(applyStatements, action)).toEqual([[theAlarms]]);
      expect(grantedOnEveryResource(applyStatements, action)).toBe(false);
    });

    it('tags what it makes at the same scope, so a tag change needs no wider grant', () => {
      expect(scopeOf(applyStatements, 'ses:TagResource')).toEqual([theSender]);
      expect(scopeOf(applyStatements, 'sns:TagResource')).toEqual([[theTopics]]);
      expect(scopeOf(applyStatements, 'cloudwatch:TagResource')).toEqual([[theAlarms]]);
    });

    it('sends no message and reads no address, because this grant builds the sender', () => {
      for (const action of [
        'ses:SendEmail',
        'ses:SendBulkEmail',
        'ses:SendRawEmail',
        'ses:ListSuppressedDestinations',
        'ses:GetSuppressedDestination',
        'sns:Subscribe',
        'sns:Publish',
      ]) {
        expect(scopeOf(applyStatements, action)).toEqual([]);
        expect(scopeOf(planStatements, action)).toEqual([]);
      }
    });
  });

  describe('the record change still names the myemi.app zone and nothing else', () => {
    it('writes a record through one statement, which stands on that zone', () => {
      const granting = statementsReaching(applyStatements, 'route53:ChangeResourceRecordSets');

      expect(granting.map((statement) => statement.sid)).toEqual(['TheMyemiZone']);
      expect(scopeOf(applyStatements, 'route53:ChangeResourceRecordSets')).toEqual([[theZone]]);
    });

    it('writes a record through no statement that stands on every resource', () => {
      expect(grantedOnEveryResource(applyStatements, 'route53:ChangeResourceRecordSets')).toBe(
        false,
      );
    });

    it('leaves a pull request reading that zone and changing no record in it', () => {
      expect(scopeOf(planStatements, 'route53:ListResourceRecordSets')).toEqual([[theZone]]);
      expect(statementsReaching(planStatements, 'route53:ChangeResourceRecordSets')).toEqual([]);
    });
  });

  describe('a pull request reads the sender at the same scope and writes none of it', () => {
    it.each(senderReads)('reads %s on the sender of Emi alone', (action) => {
      expect(scopeOf(planStatements, action)).toEqual([theSender]);
      expect(grantedOnEveryResource(planStatements, action)).toBe(false);
    });

    it('reads the topic and the tags of an alarm at the scope the merge writes at', () => {
      expect(scopeOf(planStatements, 'sns:GetTopicAttributes')).toEqual([[theTopics]]);
      expect(scopeOf(planStatements, 'cloudwatch:ListTagsForResource')).toEqual([[theAlarms]]);
    });

    it.each([...identityWrites, ...configurationSetWrites, ...topicWrites, ...alarmWrites])(
      'gives a pull request no %s at any scope',
      (action) => {
        expect(scopeOf(planStatements, action)).toEqual([]);
      },
    );

    it('adds no action to the plan role that is not a read', () => {
      expect(writesIn(planPolicy)).toEqual([]);
    });
  });

  // An alarm is the one resource here whose read names no resource at all. The reference for
  // DescribeAlarms says the permission has to stand on every resource and that a narrower scope
  // returns nothing, which is the same shape as the log groups of 2026-09-19.
  describe('the one read that names no resource', () => {
    it('is named in the list of actions that act on no single resource', () => {
      expect(collectionLevelActions).toContain('cloudwatch:DescribeAlarms');
    });

    it('stands on every resource for both roles, because a narrower scope reads nothing', () => {
      for (const statements of [applyStatements, planStatements]) {
        expect(grantedOnEveryResource(statements, 'cloudwatch:DescribeAlarms')).toBe(true);
      }
    });

    it('is the only grant of the sender that stands on every resource', () => {
      const wide = [...applyStatements, ...planStatements]
        .filter(standsOnEveryResource)
        .flatMap((statement) => statement.actions)
        .filter((action) => /^(ses|sns|cloudwatch):/.test(action));

      expect([...new Set(wide)]).toEqual(['cloudwatch:DescribeAlarms']);
    });
  });

  it('names each statement it adds, so a reviewer reads the scope without a plan', () => {
    const added = [
      'TheSender',
      'TheEmailEventTopic',
      'TheEmailAlarms',
      'ReadEveryAlarm',
      'ReadTheSender',
      'ReadTheEmailEventTopic',
      'ReadTheEmailAlarmTags',
    ];
    const sids = [...applyStatements, ...planStatements].map((statement) => statement.sid);

    expect(added.filter((sid) => !sids.includes(sid))).toEqual([]);
  });

  it('holds the sender domain as a variable, so no statement spells the domain twice', () => {
    expect(defaultOf('domain_name')).toBe('myemi.app');
    expect(theIdentity).toBe('arn:aws:ses:eu-central-1:230345688874:identity/myemi.app');
  });
});

// Step 28.8 builds the sender. The grants it stands on merged in step 28.7, in a merge of their
// own, because an apply reads a policy per request.
describe('the sender of myemi.app, which is step 28.8', () => {
  const email = read('infra/email.tf');
  const readme = read('infra/README.md');
  const domain = defaultOf('domain_name');
  const region = defaultOf('region');
  const project = defaultOf('project_name');
  const envelopeSender = `mail.${domain}`;

  const identity = bodyOf('resource "aws_sesv2_email_identity" "sender"');
  const envelope = bodyOf('resource "aws_sesv2_email_identity_mail_from_attributes" "sender"');
  const set = bodyOf('resource "aws_sesv2_configuration_set" "sender"');
  const outcomes = bodyOf('resource "aws_sesv2_configuration_set_event_destination" "outcomes"');
  const topic = bodyOf('resource "aws_sns_topic" "email_outcomes"');
  const topicPolicy = bodyOf('data "aws_iam_policy_document" "email_outcomes"');

  const recordOf = (name: string): string => bodyOf(`resource "aws_route53_record" "${name}"`);
  const alarmOf = (name: string): string =>
    bodyOf(`resource "aws_cloudwatch_metric_alarm" "${name}"`);

  /**
   * One argument of a block, read as the value the account will see, through any local it names.
   * A rule about an address has to read the finished address rather than the expression that
   * composes it.
   */
  const argumentOf = (block: string, name: string): string => {
    const found = new RegExp(`\\n\\s+${name}\\s+=\\s+([^\\n]+)`).exec(block);

    if (found?.[1] === undefined) {
      throw new Error(`the block names no ${name}`);
    }

    const written = found[1].trim();
    const local = /^local\.([a-z_]+)$/.exec(written);

    return valueOf(configuration, local === null ? written : expressionOf(local[1] as string));
  };

  describe('the mail is signed, and the signature is the service own key', () => {
    it('turns signing on through the service, so no key of its own is held anywhere', () => {
      const signing = blockBodyOf(identity, 'dkim_signing_attributes');

      expect(signing).toContain('next_signing_key_length = "RSA_2048_BIT"');
      expect(signing).not.toContain('domain_signing_private_key');
      expect(email).not.toContain('BEGIN PRIVATE KEY');
      expect(email).not.toContain('domain_signing_selector');
    });

    it('publishes three names, which is what the service returns', () => {
      const record = recordOf('signing');

      expect(email).toContain('signing_record_count = 3');
      expect(record).toContain('count = local.signing_record_count');
      expect(record).toContain('type    = "CNAME"');
      expect(record).toContain('._domainkey.${var.domain_name}');
      expect(record).toContain('.dkim.amazonses.com');
    });

    it('drives no loop from a value that is unknown until the identity exists', () => {
      expect(loopsIn(email)).toEqual([]);
      expect(recordOf('signing')).toContain('tokens[count.index]');
    });
  });

  describe('the one address Emi writes from', () => {
    it('sends from an address under the domain the identity carries', () => {
      expect(email).toContain('sender_address = "no-reply@${var.domain_name}"');
      expect(valueOf(configuration, '"no-reply@${var.domain_name}"')).toBe(`no-reply@${domain}`);
    });

    it('is read in her inbox as Emi, with the address beside the name', () => {
      expect(email).toContain('sender_name    = "Emi"');
      expect(email).toContain('sender_from    = "${local.sender_name} <${local.sender_address}>"');
    });

    it('needs no identity of its own, because the domain identity covers it', () => {
      expect(email).not.toContain('email_identity = local.sender_address');
      expect([...email.matchAll(/resource "aws_sesv2_email_identity" "/g)]).toHaveLength(1);
    });

    it('hands the address and the from line on, because step 28.9 reads them', () => {
      expect(blockBodyOf(email, 'output "sender_address"')).toContain('local.sender_address');
      expect(blockBodyOf(email, 'output "sender_from"')).toContain('local.sender_from');
    });

    it('names that address in the readme, because Apple holds each address of its own', () => {
      expect(readme).toContain('no-reply@myemi.app');
      expect(readme).toContain('Add the address `no-reply@myemi.app`');
    });
  });

  describe('the envelope sender is Emi as well as the visible sender', () => {
    it('sends from a subdomain of the domain the identity carries', () => {
      expect(argumentOf(envelope, 'mail_from_domain')).toBe(envelopeSender);
      expect(argumentOf(envelope, 'email_identity')).toContain('aws_sesv2_email_identity.sender');
    });

    it('falls back to the service subdomain when the mail exchange record cannot be read', () => {
      expect(envelope).toContain('behavior_on_mx_failure = "USE_DEFAULT_VALUE"');
      expect(envelope).not.toContain('REJECT_MESSAGE');
    });

    it('returns a bounce to the regional address of the service', () => {
      const record = recordOf('envelope_sender');

      expect(argumentOf(record, 'name')).toBe(envelopeSender);
      expect(record).toContain('type    = "MX"');
      expect(listedIn(record, 'records').map((value) => resolved(configuration, value))).toEqual([
        `10 feedback-smtp.${region}.amazonses.com`,
      ]);
    });
  });

  describe('two policy records, because the envelope and the visible sender are both read', () => {
    it.each([
      ['envelope_sender_policy', `mail.${'${var.domain_name}'}`],
      ['sender_policy', '${var.domain_name}'],
    ])('names the service in the record at %s, and refuses softly', (name) => {
      const record = recordOf(name);

      expect(record).toContain('type    = "TXT"');
      expect(listedIn(record, 'records')).toEqual(['v=spf1 include:amazonses.com ~all']);
    });

    it('holds one such record at the domain itself, because a domain carries one', () => {
      const atTheDomain = ['envelope_sender_policy', 'sender_policy'].filter(
        (name) => argumentOf(recordOf(name), 'name') === domain,
      );

      expect(atTheDomain).toEqual(['sender_policy']);
    });

    it('asks a receiving server for nothing, because myemi.app receives no mail yet', () => {
      const record = recordOf('message_authentication');

      expect(argumentOf(record, 'name')).toBe(`_dmarc.${domain}`);
      expect(listedIn(record, 'records')).toEqual(['v=DMARC1; p=none;']);
      expect(record).not.toContain('rua=');
      expect(record).not.toContain('ruf=');
    });

    it('writes every record into the zone it read, and declares no zone', () => {
      const records = [
        'signing',
        'envelope_sender',
        'envelope_sender_policy',
        'sender_policy',
        'message_authentication',
      ];

      for (const name of records) {
        expect(recordOf(name)).toContain('zone_id = data.aws_route53_zone.sender.zone_id');
      }

      expect(email).toContain('data "aws_route53_zone" "sender"');
      expect(email).not.toContain('resource "aws_route53_zone"');
      expect(blockBodyOf(email, 'data "aws_route53_zone" "sender"')).toContain(
        'zone_id = var.zone_id',
      );
    });
  });

  describe('the rates of Emi are counted on a set of its own', () => {
    it('names the set for Emi and turns its reputation measurement on', () => {
      expect(argumentOf(set, 'configuration_set_name')).toBe(project);
      expect(blockBodyOf(set, 'reputation_options')).toContain('reputation_metrics_enabled = true');
    });

    it('makes that set the default of the identity, so a send cannot miss it', () => {
      expect(identity).toContain(
        'configuration_set_name = aws_sesv2_configuration_set.sender.configuration_set_name',
      );
    });

    it('asks for the bounce and the complaint, and for no open and no click', () => {
      // The resource names an event_destination_name beside the block, and the interpolation in
      // its value opens a brace of its own, so the header is read with its brace.
      const destination = blockBodyOf(outcomes, 'event_destination {');

      expect(listedIn(destination, 'matching_event_types')).toEqual(['BOUNCE', 'COMPLAINT']);
      expect(destination).toContain('enabled              = true');
      expect(blockBodyOf(destination, 'sns_destination')).toContain(
        'topic_arn = aws_sns_topic.email_outcomes.arn',
      );
    });

    it('subscribes nothing to the topic yet, because the function is a later step', () => {
      expect(configuration).not.toContain('resource "aws_sns_topic_subscription"');
      expect(topic).toContain(`name = "${'${var.project_name}'}-email-outcomes"`);
    });

    it('lets the mail service publish, and only for the set of Emi in this account', () => {
      expect(blockBodyOf(topicPolicy, 'principals')).toContain('"ses.amazonaws.com"');
      expect(listedIn(topicPolicy, 'actions')).toEqual(['sns:Publish']);
      expect(topicPolicy).toContain('variable = "AWS:SourceAccount"');
      expect(topicPolicy).toContain('variable = "AWS:SourceArn"');
      expect(topicPolicy).toContain('values   = [aws_sesv2_configuration_set.sender.arn]');
      expect(outcomes).toContain('depends_on = [aws_sns_topic_policy.email_outcomes]');
    });
  });

  describe('two alarms, each at half the rate that pauses an account', () => {
    it.each([
      ['bounce_rate', 'Reputation.BounceRate', '0.05'],
      ['complaint_rate', 'Reputation.ComplaintRate', '0.001'],
    ])('watches %s on the set of Emi', (name, metric, threshold) => {
      const alarm = alarmOf(name);

      expect(alarm).toContain('namespace   = "AWS/SES"');
      expect(alarm).toContain(`metric_name = "${metric}"`);
      expect(alarm).toContain(`threshold           = ${threshold}`);
      expect(alarm).toContain('comparison_operator = "GreaterThanOrEqualToThreshold"');
      expect(blockBodyOf(alarm, 'dimensions')).toContain(
        '"ses:configuration-set" = aws_sesv2_configuration_set.sender.configuration_set_name',
      );
    });

    it.each(['bounce_rate', 'complaint_rate'])(
      'reads no measurement as no failure for %s, because a quiet month publishes none',
      (name) => {
        expect(alarmOf(name)).toContain('treat_missing_data = "notBreaching"');
      },
    );

    it.each(['bounce_rate', 'complaint_rate'])('sends the %s alarm nowhere yet', (name) => {
      const alarm = alarmOf(name);

      expect(listedIn(alarm, 'alarm_actions')).toEqual([]);
      expect(listedIn(alarm, 'ok_actions')).toEqual([]);
      expect(alarm).toContain('alarm_actions = []');
    });

    it('says in the readme that neither alarm has anywhere to send to, and how to read it', () => {
      expect(readme).toContain('Neither alarm carries an action');
      expect(readme).toContain('aws cloudwatch describe-alarms --alarm-name-prefix emi-email');
    });
  });

  describe('what no test here can see', () => {
    it('names the Apple step in the readme, because a relay address refuses an unknown sender', () => {
      expect(readme).toContain('Certificates, Identifiers and Profiles');
      expect(readme).toContain('Sign in with Apple');
      expect(readme).toContain(domain);
    });

    it('names what the mail costs, which is nothing until a message is sent', () => {
      expect(email).toContain('0.10 United States dollars for each 1,000 messages');
    });
  });

  describe('what the sender is not allowed to hold', () => {
    it.each([
      'aws_db_instance',
      'aws_rds_cluster',
      'aws_elasticache_cluster',
      'aws_opensearch_domain',
      'aws_nat_gateway',
      'aws_lb',
      'aws_instance',
    ])('declares no %s, because it would bill while nobody uses Emi', (kind) => {
      expect(email).not.toContain(`resource "${kind}"`);
    });

    it('holds no key, no password and no address of hers', () => {
      expect(email).not.toContain('BEGIN PRIVATE KEY');
      expect(email).not.toContain('smtp_password');
      expect(email).not.toContain('@gmail');
      expect(email).not.toContain('privaterelay.appleid.com');
    });

    // The sender names no pool, and it stays that way: the pool reads the sender, never the
    // reverse. What changed in step 28.10 is the pool's own side of it.
    it('names the pool nowhere, because the pool reads the sender and not the reverse', () => {
      expect(email).not.toContain('aws_cognito');
      expect(bodyOf('resource "aws_cognito_user_pool" "accounts"')).toContain(
        'source_arn            = aws_sesv2_email_identity.sender.arn',
      );
    });
  });
});

// Step 28.10 points the pool at the sender of step 28.8, so the code she signs in with leaves from
// Emi. The grant it needs merged in step 28.9, in a merge of its own, because an apply reads a
// policy per request.
describe('the pool sends the code from Emi, which is step 28.10', () => {
  const cognito = read('infra/cognito.tf');
  const readme = read('infra/README.md');
  const pool = bodyOf('resource "aws_cognito_user_pool" "accounts"');
  const sending = blockBodyOf(pool, 'email_configuration');

  describe('the code leaves from the sender of Emi', () => {
    it('calls the mail service in this account, rather than lending the address of the pool', () => {
      expect(sending).toContain('email_sending_account = "DEVELOPER"');
      expect(sending).not.toContain('COGNITO_DEFAULT');
    });

    it('sends from the myemi.app identity, named as the resource and never as a string', () => {
      expect(sending).toContain('source_arn            = aws_sesv2_email_identity.sender.arn');
      expect(sending).not.toContain('arn:aws:ses');
    });

    it('is read in her inbox as Emi, from the one address the sender holds', () => {
      expect(sending).toContain('from_email_address    = local.sender_from');
      // The from line is composed of two locals, so the rule reads each one as its value and
      // puts them together the way the sender does.
      expect(expressionOf('sender_from')).toBe('${local.sender_name} <${local.sender_address}>');
      expect(
        `${resolved(configuration, expressionOf('sender_name'))} <${resolved(
          configuration,
          expressionOf('sender_address'),
        )}>`,
      ).toBe('Emi <no-reply@myemi.app>');
      expect(sending).not.toContain('no-reply@verificationemail.com');
    });

    it('counts the code on the set of Emi, so its bounces reach the alarms of step 28.8', () => {
      expect(sending).toContain(
        'configuration_set     = aws_sesv2_configuration_set.sender.configuration_set_name',
      );
    });

    it('asks for no reply address, because nothing receives mail at myemi.app', () => {
      expect(sending).not.toContain('reply_to_email_address');
    });
  });

  describe('the order, so an apply never names a sender that does not exist', () => {
    it('makes the pool after the identity, as well as after the grant', () => {
      expect(listedIn(pool, 'depends_on')).toEqual([
        'aws_iam_role_policy.apply',
        'aws_sesv2_email_identity.sender',
      ]);
    });

    it('reads the sender from the resource, so the order holds without the list too', () => {
      expect(sending).toContain('aws_sesv2_email_identity.sender');
      expect(sending).toContain('aws_sesv2_configuration_set.sender');
    });

    it('says in the readme that existing is not verified, and what that costs a rebuild', () => {
      expect(cognito).toContain('Existing is not the same as verified');
      expect(readme).toContain('second apply');
    });
  });

  describe('what the pool still does not hold', () => {
    it('holds no key and no secret, because this repository is public', () => {
      expect(credentialValuesIn(cognito)).toEqual([]);
      expect(cognito).not.toContain('smtp_password');
    });

    it('declares no attribute of hers, which step 28.2 settled and this step does not move', () => {
      expect(pool).not.toContain('schema {');
      expect(cognito).not.toContain('custom:');
    });
  });

  describe('the readme reads the other way round now', () => {
    it('says the code is delivered, and no longer that it cannot be', () => {
      expect(readme).not.toContain('cannot deliver one');
      expect(readme).not.toContain('one step away');
      expect(readme).toContain('Emi <no-reply@myemi.app>');
    });
  });
});

// Sign in with Telegram reads three values the parameter store holds and writes one of them. The
// two roles that reach them ship before anything assumes them: the account reads a policy per
// request, so a grant and the resource that needs it can fail together in one apply.
//
// The salt is the one value Terraform never creates, never holds and never reads. The sign in
// function makes it on the first sign in that finds it absent, which is why no data source names
// it and no resource writes it.
describe('the keys the Telegram sign in may read, and the two roles that reach them', () => {
  const readme = read('infra/README.md');
  const signInPolicy = bodyOf('data "aws_iam_policy_document" "sign_in_telegram"');
  const challengePolicy = bodyOf('data "aws_iam_policy_document" "sign_in_challenge"');
  const planStatements = statementsIn(planPolicy);
  const theVaultTable = 'aws_dynamodb_table.vault.arn';
  const everyFunctionOfEmi = `arn:aws:lambda:*:${defaultOf('account_id')}:function:${defaultOf('project_name')}-*`;
  const everyRoleOfEmi = `arn:aws:iam::${defaultOf('account_id')}:role/${defaultOf('project_name')}-*`;
  const everyPool = `arn:aws:cognito-idp:*:${defaultOf('account_id')}:userpool/*`;

  const parameter = (name: string): string =>
    `arn:aws:ssm:${defaultOf('region')}:${defaultOf('account_id')}:parameter/${defaultOf('project_name')}/accounts/telegram/${name}`;

  const scopeOf = (policy: string, action: string): string[][] =>
    statementsReaching(statementsIn(policy), action).map((statement) =>
      statement.resources.map((resource) => resolved(configuration, resource)),
    );

  /** Every parameter Terraform itself reads, which the salt is deliberately absent from. */
  const parametersTerraformReads = (): string[] =>
    [...configuration.matchAll(/data "aws_ssm_parameter" "([a-z_]+)"/g)]
      .flatMap((match) => (match[1] === undefined ? [] : [match[1]]))
      .map((name) =>
        valueOf(configuration, pairsIn(bodyOf(`data "aws_ssm_parameter" "${name}"`)).name ?? ''),
      );

  describe('the function that answers a Telegram code', () => {
    it('reads the bot identifier, the client secret and the salt, each named in full', () => {
      expect(scopeOf(signInPolicy, 'ssm:GetParameter')).toEqual([
        [parameter('bot-id'), parameter('client-secret'), parameter('salt')],
      ]);
    });

    it('reads the bot token nowhere, because the bot token can act as the bot', () => {
      expect(signInPolicy).not.toContain('bot-token');

      for (const named of scopeOf(signInPolicy, 'ssm:GetParameter').flat()) {
        expect(named).not.toContain('*');
      }
    });

    it('decrypts a secure string only through a parameter store call', () => {
      const statement = resolved(
        configuration,
        statementTextIn(signInPolicy, 'DecryptASecureString'),
      );

      expect(statement).toContain('variable = "kms:ViaService"');
      expect(statement).toContain(`"ssm.${defaultOf('region')}.amazonaws.com"`);
    });

    it('writes the salt, and no other parameter', () => {
      expect(scopeOf(signInPolicy, 'ssm:PutParameter')).toEqual([[parameter('salt')]]);
    });

    it('deletes no parameter, so nothing in the account can take the salt away', () => {
      expect(scopeOf(signInPolicy, 'ssm:DeleteParameter')).toEqual([]);
      expect(configuration).not.toContain('ssm:Delete');
    });

    it('writes the one time answer item, and reads and deletes nothing in the table', () => {
      expect(actionsIn(signInPolicy).sort()).toEqual([
        'dynamodb:PutItem',
        'kms:Decrypt',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'ssm:GetParameter',
        'ssm:PutParameter',
      ]);
      expect(scopeOf(signInPolicy, 'dynamodb:PutItem')).toEqual([[theVaultTable]]);
    });

    it('reaches no index of the table and no other table', () => {
      expect(signInPolicy).not.toContain('/index/');
      expect(signInPolicy).not.toContain('aws_dynamodb_table.articles');
    });
  });

  describe('the three triggers the pool calls', () => {
    it('spends the one time answer with a delete, which returns the item it removed', () => {
      expect(actionsIn(challengePolicy).sort()).toEqual([
        'dynamodb:DeleteItem',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ]);
      expect(scopeOf(challengePolicy, 'dynamodb:DeleteItem')).toEqual([[theVaultTable]]);
    });

    it('holds no parameter at all, so nothing the pool calls can read the salt', () => {
      expect(actionsIn(challengePolicy).filter((action) => action.startsWith('ssm:'))).toEqual([]);
      expect(challengePolicy).not.toContain('kms:');
      expect(challengePolicy).not.toContain('/accounts/');
    });

    it('reads nothing of the table, and reaches no index of it and no other table', () => {
      expect(scopeOf(challengePolicy, 'dynamodb:GetItem')).toEqual([]);
      expect(scopeOf(challengePolicy, 'dynamodb:Query')).toEqual([]);
      expect(challengePolicy).not.toContain('/index/');
      expect(challengePolicy).not.toContain('aws_dynamodb_table.articles');
    });

    it('is one role for the three of them, assumed by the runtime and by nothing else', () => {
      expect(bodyOf('resource "aws_iam_role" "sign_in_challenge"')).toContain(
        'assume_role_policy = data.aws_iam_policy_document.lambda_trust.json',
      );
      expect(bodyOf('data "aws_iam_policy_document" "lambda_trust"')).toContain(
        'identifiers = ["lambda.amazonaws.com"]',
      );
    });
  });

  describe('the salt, which the function makes and Terraform never holds', () => {
    it('is read by no data source, so no plan and no state carries its value', () => {
      expect(parametersTerraformReads()).toEqual([
        '/emi/accounts/apple/services-id',
        '/emi/accounts/apple/team-id',
        '/emi/accounts/apple/key-id',
        '/emi/accounts/apple/private-key',
        '/emi/accounts/google/client-id',
        '/emi/accounts/google/client-secret',
      ]);
    });

    it('is written by no resource, because a salt that changed would lock every Telegram user out', () => {
      expect(configuration).not.toContain('resource "aws_ssm_parameter"');
    });

    it('is named in the readme as permanent, beside what the operator did in BotFather', () => {
      expect(readme).toContain('/emi/accounts/telegram/client-secret');
      expect(readme).toContain('/emi/accounts/telegram/salt');
      expect(readme).toContain('BotFather');
      expect(readme).toContain('permanent');
    });
  });

  describe('the apply role already reaches both roles and the functions that assume them', () => {
    it('makes a function and lets a principal invoke one, in the functions of Emi alone', () => {
      expect(scopeOf(applyPolicy, 'lambda:CreateFunction')).toEqual([[everyFunctionOfEmi]]);
      expect(scopeOf(applyPolicy, 'lambda:AddPermission')).toEqual([[everyFunctionOfEmi]]);
    });

    it('makes a role of Emi, writes its policy, and hands it to a function', () => {
      for (const action of ['iam:CreateRole', 'iam:PutRolePolicy', 'iam:PassRole']) {
        expect(scopeOf(applyPolicy, action)).toEqual([[everyRoleOfEmi]]);
      }
    });

    it('sets the triggers on the pool through the statement that changes one pool', () => {
      expect(scopeOf(applyPolicy, 'cognito-idp:UpdateUserPool')).toEqual([[everyPool]]);
    });

    it('lets a pull request read a function and a role, and make neither', () => {
      expect(statementsReaching(planStatements, 'lambda:GetFunction')).not.toEqual([]);
      expect(statementsReaching(planStatements, 'iam:GetRolePolicy')).not.toEqual([]);
      expect(scopeOf(planPolicy, 'lambda:CreateFunction')).toEqual([]);
      expect(scopeOf(planPolicy, 'iam:PutRolePolicy')).toEqual([]);
    });
  });

  describe('no secret is written as a value anywhere in the repository', () => {
    const files = trackedTextFiles();
    const aPrivateKey = `${'-'.repeat(5)}BEGIN PRIVATE KEY${'-'.repeat(5)}\n${'a'.repeat(64)}\n`;
    const aGoogleSecret = `GOCSPX-${'b'.repeat(28)}`;
    const aBotToken = `12345678:AA${'c'.repeat(33)}`;

    it('finds none today, and says how many files it read', () => {
      expect(files.flatMap((file) => writtenSecretsIn(file, read(file)))).toEqual([]);
      expect(files.length).toBeGreaterThan(500);
      expect(files).toContain('infra/lambda.tf');
      expect(files).toContain('tools/pipeline/signIn.ts');
    });

    it('refuses a private key, a Google secret and a Telegram bot token', () => {
      expect(writtenSecretsIn('infra/lambda.tf', aPrivateKey)).toEqual([
        'infra/lambda.tf writes a private key as a value, and it belongs in the parameter store',
      ]);
      expect(writtenSecretsIn('infra/lambda.tf', aGoogleSecret)).toHaveLength(1);
      expect(writtenSecretsIn('infra/lambda.tf', aBotToken)).toHaveLength(1);
    });

    it('names the kind and never the value, because the pipeline log of this repository is public', () => {
      const [said] = writtenSecretsIn('a/file.ts', aBotToken);

      expect(said).toContain('a Telegram bot token');
      expect(said).not.toContain('c'.repeat(33));
    });

    it('leaves the word alone, because a rule that proves a key is absent has to name its header', () => {
      expect(
        writtenSecretsIn('a/test.ts', "expect(sent).not.toContain('BEGIN PRIVATE KEY');\n"),
      ).toEqual([]);
      expect(writtenSecretsIn('a/rule.ts', "const markers = ['GOCSPX'];\n")).toEqual([]);
      expect(writtenSecretsIn('infra/README.md', 'the bot identifier 9068004348\n')).toEqual([]);
    });
  });
});
