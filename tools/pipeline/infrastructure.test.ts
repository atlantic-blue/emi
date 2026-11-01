import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { parse } from 'yaml';

import {
  type PolicyStatement,
  bodyOf as blockBodyOf,
  configurationOf,
  defaultOf as variableDefaultOf,
  grantedOnEveryResource,
  listedIn,
  resolved,
  standsOnEveryResource,
  statementsIn,
  statementsReaching,
  valueOf,
} from './policy.ts';

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

function actionsIn(policy: string): string[] {
  return [...policy.matchAll(/"([a-z0-9-]+:[A-Za-z*]+)"/g)].flatMap((match) =>
    match[1] ? [match[1]] : [],
  );
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
 * Every for_each expression of one configuration, each read to the blank line that closes it. A
 * key has to be known before the plan runs, so what a loop is driven from is a rule and not a
 * style.
 */
function loopsIn(configuration: string): string[] {
  return [...configuration.matchAll(/for_each\s*=\s*([\s\S]*?)\n\s*\n/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1].trim()],
  );
}

/** The region of one aliased provider, read from the block that declares the alias. */
function regionOfAlias(configuration: string, alias: string): string {
  const at = configuration.search(new RegExp(`alias\\s*=\\s*"${alias}"`));

  if (at < 0) {
    throw new Error(`the configuration declares no provider aliased ${alias}`);
  }

  const found = /region\s*=\s*"([^"]+)"/.exec(configuration.slice(at));

  if (!found?.[1]) {
    throw new Error(`the provider aliased ${alias} names no region`);
  }

  return found[1];
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
  'dynamodb:ListTables',
  'iam:ListOpenIDConnectProviders',
  'iam:ListRoles',
  'lambda:ListFunctions',
  'logs:DescribeLogGroups',
  'route53:GetChange',
  'route53:ListHostedZones',
  'route53:ListHostedZonesByName',
  's3:ListAllMyBuckets',
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
      const writes = actionsIn(planPolicy).filter(
        (action) => !/^(apigateway:GET|[a-z0-9]+:(Get|List|Describe)[A-Za-z]*)$/.test(action),
      );

      expect(actionsIn(planPolicy).length).toBeGreaterThan(0);
      expect(writes).toEqual([]);
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
      expect(
        actions.filter(
          (action) => !/^(apigateway:GET|[a-z0-9]+:(Get|List|Describe)[A-Za-z]*)$/.test(action),
        ),
      ).toEqual([]);
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

    it('is set over whatever a page answered, on every behaviour the site has', () => {
      const overrides = [...policy().matchAll(/override\s*=\s*(\w+)/g)].map((found) => found[1]);

      expect(overrides).toHaveLength(6);
      expect(overrides.filter((value) => value !== 'true')).toEqual([]);
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
