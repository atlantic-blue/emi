import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { parse } from 'yaml';

import {
  type PolicyStatement,
  bodyOf as blockBodyOf,
  configurationOf,
  defaultOf as variableDefaultOf,
  grantedOnEveryResource,
  resolved,
  standsOnEveryResource,
  statementsIn,
  statementsReaching,
} from './policy.ts';

const repositoryRoot = resolve(__dirname, '..', '..');
const infrastructureDirectory = join(repositoryRoot, 'infra');

type Step = { name?: string; uses?: string; run?: string; if?: string };
type Job = { if?: string; env?: Record<string, string>; steps?: Step[] };
type Workflow = {
  on?: Record<string, { branches?: string[] }>;
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

  describe('the state', () => {
    it('sits in the shared bucket under a key of Emi own', () => {
      const backend = bodyOf('backend "s3"');

      expect(backend).toContain('bucket       = "abs-terraform"');
      expect(backend).toContain('key          = "emi/terraform.tfstate"');
    });
  });
});
