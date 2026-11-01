import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';
import { parse } from 'yaml';

import { asPlaywrightReadsIt } from '../../apps/website/test/theConfiguration';

const feature = loadFeature(join(__dirname, '26.14-the-deploy.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');

const websiteWorkspace = join(repositoryRoot, 'apps', 'website');

const read = (file: string): string => readFileSync(join(repositoryRoot, file), 'utf8');

/** The address the deploy reads once it has shipped, which is the address she types. */
const theLiveHost = 'https://myemi.app';

interface Step {
  readonly name?: string;
  readonly uses?: string;
  readonly run?: string;
  readonly if?: string;
  readonly env?: Record<string, string>;
  readonly 'working-directory'?: string;
  readonly 'continue-on-error'?: boolean;
}

interface Job {
  readonly needs?: string | readonly string[];
  readonly if?: string;
  readonly env?: Record<string, string>;
  readonly steps?: readonly Step[];
}

interface Trigger {
  readonly branches?: readonly string[];
  readonly paths?: readonly string[];
}

interface Workflow {
  readonly on?: Record<string, Trigger>;
  readonly jobs?: Record<string, Job>;
}

const deployFile = '.github/workflows/deploy.yml';

const deployText = read(deployFile);

const deploy = parse(deployText) as Workflow;

/**
 * The job that ships the site, found by the build it runs rather than by a name, so renaming the
 * job does not quietly leave this scenario reading nothing. More than one job building the site
 * is refused too: two jobs shipping the same thing race each other onto the same function.
 */
function theJobThatShipsTheSite(): Job {
  const found = Object.entries(deploy.jobs ?? {}).filter(([, job]) =>
    (job.steps ?? []).some((step) => (step.run ?? '').includes('build:lambda')),
  );

  if (found.length !== 1) {
    throw new Error(
      `${found.length} job(s) of ${deployFile} build the site, and exactly one must ship it`,
    );
  }

  return (found[0] as [string, Job])[1];
}

/** Every step of the job as one line each, which is how a rule reads what the job runs. */
const runsOf = (job: Job): string[] => (job.steps ?? []).map((step) => step.run ?? '');

/** Where in the job the step that runs this fragment sits, so one move can be read after another. */
function whereItRuns(job: Job, fragment: string): number {
  const at = runsOf(job).findIndex((run) => run.includes(fragment));

  if (at < 0) {
    throw new Error(`no step of the shipping job runs "${fragment}"`);
  }

  return at;
}

const stepThatRuns = (job: Job, fragment: string): Step =>
  (job.steps as readonly Step[])[whereItRuns(job, fragment)] as Step;

/** A step reaches the account when it talks to it, or when it picks up the credential to do so. */
const reachesTheAccount = (step: Step): boolean =>
  /(^|\s|\()aws\s|terraform\s/.test(step.run ?? '') ||
  (step.uses ?? '').includes('configure-aws-credentials');

/** Every sentence of every feature file the pattern covers, read as one page of gherkin. */
function sentencesUnder(pattern: string): string {
  const directory = join(websiteWorkspace, dirname(pattern));

  return readdirSync(directory)
    .filter((name) => name.endsWith('.feature'))
    .sort()
    .map((name) => readFileSync(join(directory, name), 'utf8'))
    .join('\n');
}

const asOneList = (value: string | readonly string[] | undefined): string[] =>
  value === undefined ? [] : [value].flat();

defineFeature(feature, (test) => {
  test('myemi.app serves the Next.js site from the deploy', ({ given, then, and }) => {
    let job: Job;

    given('the pipeline that ships myemi.app', () => {
      job = theJobThatShipsTheSite();
    });

    then('a merge into main builds the site and puts it where a reader reaches it', () => {
      expect(deploy.on?.push?.branches).toEqual(['main']);

      for (const event of ['pull_request', 'push']) {
        expect(deploy.on?.[event]?.paths).toContain('apps/website/**');
        expect(deploy.on?.[event]?.paths).toContain('packages/tokens/**');
      }

      const build = stepThatRuns(job, 'build:lambda');

      expect(build['working-directory']).toBe('apps/website');
      expect(build.env?.NEXT_TELEMETRY_DISABLED).toBe('1');

      // The three names come from the infrastructure that made them. A name written in here would
      // be a second place the account is described, and the two would drift.
      const names = stepThatRuns(job, 'terraform output');

      expect(names['working-directory']).toBe('infrastructure/website');
      expect(names.run).toContain('bucket_name');
      expect(names.run).toContain('function_name');
      expect(names.run).toContain('distribution_id');

      const code = stepThatRuns(job, 'update-function-code');

      expect(code.run).toContain('.open-next/server-functions/default');
      expect(code.run).toContain('aws lambda wait function-updated');

      const files = stepThatRuns(job, 'aws s3 sync');

      expect(files.run).toContain('.open-next/assets');
      expect(files.run).toContain('--delete');
      // A year and immutable on the files whose name carries their content, and minutes on the
      // rest, so a page she opens after a merge is never the page from before it.
      expect(files.run).toContain('_next/static');
      expect(files.run).toContain('max-age=31536000, immutable');
      expect(files.run).toMatch(/max-age=[1-9]\d{0,3}[,'"]/);
    });

    and('the cache is cleared, so what she opens is what was just built', () => {
      const cache = stepThatRuns(job, 'create-invalidation');

      expect(cache.run).toContain("--paths '/*'");
      expect(cache.run).toContain('aws cloudfront wait invalidation-completed');

      expect(whereItRuns(job, 'create-invalidation')).toBeGreaterThan(
        whereItRuns(job, 'update-function-code'),
      );
      expect(whereItRuns(job, 'create-invalidation')).toBeGreaterThan(
        whereItRuns(job, 'aws s3 sync'),
      );
    });

    and('the deploy then reads the live site, and a site that answers wrongly fails it', () => {
      const live = stepThatRuns(job, 'test:e2e:run');

      expect(live.env?.BASE_URL).toBe(theLiveHost);
      expect(whereItRuns(job, 'test:e2e:run')).toBeGreaterThan(
        whereItRuns(job, 'create-invalidation'),
      );

      // A step that is allowed to fail reports a deploy as done while the site answers wrongly,
      // and the browser run is the only thing in the job that reads what she gets.
      expect((job.steps ?? []).filter((step) => step['continue-on-error'] === true)).toEqual([]);

      // The live read must not build the site or start one of its own. It reads the host that
      // was just shipped to, and a local site would answer every one of those sentences wrongly.
      expect(live.run).not.toContain('run test:e2e ');
      expect(live.run).not.toContain('next start');
    });

    and(
      'what it reads today is the page nobody meant to open, the headers, and the one address',
      () => {
        const here = asPlaywrightReadsIt();
        const there = asPlaywrightReadsIt(theLiveHost);

        // Pointed at a host it reads two sets of sentences, and pointed at itself only the ones a
        // local site can answer. The others are about the edge, which no local site has.
        expect(asOneList(here.gherkin[0]?.features)).toEqual(['e2e/features/*.feature']);
        expect(asOneList(there.gherkin[0]?.features)).toEqual([
          'e2e/features/*.feature',
          'e2e/live/*.feature',
        ]);
        expect(there.baseURL).toBe(theLiveHost);
        expect(there.startsAServer).toBe(false);

        const sentences = asOneList(there.gherkin[0]?.features).map(sentencesUnder).join('\n');

        expect(sentences).toContain('which this site does not have');
        expect(sentences).toContain('there is no such page');

        expect(sentences).toContain('come back over https for two years');
        expect(sentences).toContain('puts the page in no frame');
        expect(sentences).toContain('refuses a guessed type');
        expect(sentences).toContain('neither the camera, nor the microphone, nor her location');

        expect(sentences).toContain('| http://myemi.app/         | https://myemi.app/     |');
        expect(sentences).toContain('| http://www.myemi.app/     | https://www.myemi.app/ |');
        expect(sentences).toContain('| https://www.myemi.app/en/ | https://myemi.app/en/  |');
        expect(sentences).toContain('| https://myemi.app/        | https://myemi.app/en/  |');
        expect(sentences).toContain('she lands on');
      },
    );

    and('a pull request builds the site and changes nothing a reader can see', () => {
      expect(job.env?.SHIPS).toBe(
        "${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}",
      );

      const unguarded = (job.steps ?? [])
        .filter(reachesTheAccount)
        .filter((step) => step.if !== "env.SHIPS == 'true' && env.ROLE != ''")
        .map((step) => step.name ?? step.uses ?? step.run ?? 'a step with no name');

      expect((job.steps ?? []).filter(reachesTheAccount).length).toBeGreaterThan(3);
      expect(unguarded).toEqual([]);

      // The live read is part of shipping, not part of reviewing. A pull request that read the
      // live site would report on the merge before it, and would go red for somebody else's work.
      expect(stepThatRuns(job, 'test:e2e:run').if).toBe("env.SHIPS == 'true' && env.ROLE != ''");

      // The build itself is not guarded, which is what a pull request gets out of this job.
      expect(stepThatRuns(job, 'build:lambda').if).toBeUndefined();
    });

    and(
      'nothing reaches the account from a machine, and the pipeline holds no key of its own',
      () => {
        expect(job.env?.ROLE).toBe('${{ vars.AWS_APPLY_ROLE_ARN }}');
        expect(deployText).not.toContain('secrets.');
        expect(deployText).not.toContain('aws-access-key-id');
        expect(deployText).not.toContain('AWS_SECRET_ACCESS_KEY');

        // While the variable is empty the job says so and ships nothing, rather than turning main
        // red on every merge for a role that is not there.
        const first = (job.steps ?? [])[0] as Step;

        expect(first.if).toBeUndefined();
        expect(first.run).toContain('AWS_APPLY_ROLE_ARN');

        const scripts = ['package.json', 'apps/website/package.json'].flatMap((file) =>
          Object.values(
            (JSON.parse(read(file)) as { scripts?: Record<string, string> }).scripts ?? {},
          ),
        );

        expect(scripts.filter((script) => /(^|\s)aws\s/.test(script))).toEqual([]);

        const elsewhere = readdirSync(join(repositoryRoot, '.github', 'workflows'))
          .filter((file) => file !== 'deploy.yml')
          .filter((file) => read(`.github/workflows/${file}`).includes('update-function-code'));

        expect(elsewhere).toEqual([]);
      },
    );

    and(
      'the site ships after the infrastructure, and the directory says so in words she can read',
      () => {
        expect(asOneList(job.needs)).toEqual(['check', 'apply']);

        // A job that needs a skipped job is skipped with it, and the apply is skipped on a pull
        // request, so the result is read rather than waited for. Without this the build would never
        // run on a pull request at all.
        expect(job.if).toContain('always()');
        expect(job.if).toContain("needs.apply.result == 'success'");
        expect(job.if).toContain("needs.apply.result == 'skipped'");

        const readme = read('infrastructure/README.md');

        expect(readme).toContain('AWS_APPLY_ROLE_ARN');
        expect(readme).toContain('before the first deploy');
      },
    );
  });
});
