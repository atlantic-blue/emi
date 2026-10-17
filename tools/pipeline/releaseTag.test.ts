import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { parse } from 'yaml';

import { appVersion, releaseTagProblem } from './releaseTag';

const repositoryRoot = resolve(__dirname, '..', '..');

interface Step {
  name?: string;
  run?: string;
  env?: Record<string, string>;
}

interface Workflow {
  on: { push?: { tags?: string[] }; workflow_dispatch?: { inputs?: Record<string, unknown> } };
  jobs: Record<string, { steps: Step[] }>;
}

const workflow = parse(
  readFileSync(join(repositoryRoot, '.github/workflows/release.yml'), 'utf8'),
) as Workflow;
const steps = Object.values(workflow.jobs).flatMap((job) => job.steps);

function indexOfStepRunning(text: string): number {
  return steps.findIndex((step) => step.run?.includes(text) ?? false);
}

describe('a release tag names the version the app is built at', () => {
  it('releases a tag that is v and the version', () => {
    expect(releaseTagProblem('v0.1.0', '0.1.0')).toBeUndefined();
  });

  it('refuses a tag that names another version', () => {
    expect(releaseTagProblem('v0.2.0', '0.1.0')).toBe(
      'the tag v0.2.0 is not the version 0.1.0 in apps/mobile/app.json',
    );
  });

  it('refuses a tag with no v in front', () => {
    expect(releaseTagProblem('0.1.0', '0.1.0')).toBe('the tag 0.1.0 does not start with v');
  });

  it('reads the version from app.json', () => {
    expect(appVersion(repositoryRoot)).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('the release workflow', () => {
  it('starts on a pushed version tag, and by hand with a tag', () => {
    expect(workflow.on.push?.tags).toEqual(['v*']);
    expect(workflow.on.workflow_dispatch?.inputs).toHaveProperty('tag');
  });

  it('checks the tag before it builds anything', () => {
    const check = indexOfStepRunning('tools/pipeline/checkReleaseTag.ts');
    const build = indexOfStepRunning('eas-cli');

    expect(check).toBeGreaterThanOrEqual(0);
    expect(build).toBeGreaterThan(check);
  });

  it('reads the version from the tree of the tag, not from its own commit', () => {
    const check = steps[indexOfStepRunning('tools/pipeline/checkReleaseTag.ts')]?.run ?? '';
    const build = steps[indexOfStepRunning('eas-cli')] as Step & { 'working-directory'?: string };
    const tagged = steps.find(
      (step) => (step as { with?: { ref?: string } }).with?.ref === 'refs/tags/${{ env.TAG }}',
    ) as { with?: { path?: string } } | undefined;

    expect(tagged?.with?.path).toBe('release');
    expect(check).toMatch(/checkReleaseTag\.ts "\$TAG" release$/);
    expect(build['working-directory']).toBe('release/apps/mobile');
  });

  it('builds the production profile for iOS and hands it to TestFlight', () => {
    const build = steps[indexOfStepRunning('eas-cli')]?.run ?? '';

    expect(build).toMatch(/eas-cli@\d+\.\d+\.\d+ build/);
    expect(build).toContain('--platform ios');
    expect(build).toContain('--profile production');
    expect(build).toContain('--auto-submit');
    expect(build).toContain('--non-interactive');
  });

  it('reads the Expo token from a secret', () => {
    const build = steps[indexOfStepRunning('eas-cli')];

    expect(build?.env?.EXPO_TOKEN).toBe('${{ secrets.EXPO_TOKEN }}');
  });
});
