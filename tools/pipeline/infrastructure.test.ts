import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { parse } from 'yaml';

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

const configurationFiles = readdirSync(infrastructureDirectory).filter((file) =>
  file.endsWith('.tf'),
);
const configuration = configurationFiles
  .map((file) => readFileSync(join(infrastructureDirectory, file), 'utf8'))
  .join('\n');

/**
 * The body of one top level block, so an assertion reads inside the resource it names rather than
 * anywhere in the file. Interpolations balance their own braces, so counting them is enough.
 */
function bodyOf(header: string): string {
  const start = configuration.indexOf(header);
  if (start < 0) {
    throw new Error(`the configuration has no ${header}`);
  }

  const opening = configuration.indexOf('{', start);
  let depth = 0;

  for (let at = opening; at < configuration.length; at += 1) {
    if (configuration[at] === '{') {
      depth += 1;
    }
    if (configuration[at] === '}') {
      depth -= 1;
      if (depth === 0) {
        return configuration.slice(opening + 1, at);
      }
    }
  }

  throw new Error(`${header} is never closed`);
}

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

const table = bodyOf('resource "aws_dynamodb_table" "vault"');
const planPolicy = bodyOf('data "aws_iam_policy_document" "plan"');
const planTrust = bodyOf('data "aws_iam_policy_document" "plan_trust"');
const applyTrust = bodyOf('data "aws_iam_policy_document" "apply_trust"');
const authorizerPolicy = bodyOf('data "aws_iam_policy_document" "authorizer"');

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
      expect(applyTrust).toContain('values   = [local.main_subject]');
      expect(configuration).toContain(
        'main_subject         = "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/main"',
      );
    });

    it('matches that subject exactly, so a branch named after main cannot assume it', () => {
      expect(applyTrust).not.toContain('StringLike');
      expect(planTrust).not.toContain('StringLike');
    });

    it('lets a pull request assume only the plan role', () => {
      expect(planTrust).toContain('values   = [local.pull_request_subject]');
      expect(applyTrust).not.toContain('pull_request_subject');
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

      expect(groups).toHaveLength(3);
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

  describe('the state', () => {
    it('sits in the shared bucket under a key of Emi own', () => {
      const backend = bodyOf('backend "s3"');

      expect(backend).toContain('bucket       = "abs-terraform"');
      expect(backend).toContain('key          = "emi/terraform.tfstate"');
    });
  });
});
