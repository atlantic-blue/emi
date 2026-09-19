/**
 * Reads what a run on the engine said.
 *
 * The rule that matters is the count. A run that discovered nothing to do prints the same nothing
 * as a run where every case passed, so an absent count and a count of zero are both failures
 * here, and neither is a pass waiting to be interpreted kindly.
 */

/** A case that failed, with the line the engine wrote about it. */
export interface CaseFailure {
  readonly name: string;
  readonly reason: string;
}

export interface TierOutcome {
  readonly passed: boolean;
  /** How many cases the engine reported running, or null when it reported no count at all. */
  readonly ranCount: number | null;
  readonly failures: readonly CaseFailure[];
  /** Why the run is refused, one line each, empty when it passed. */
  readonly problems: readonly string[];
}

const failedLine = /^case failed ([^:]+): (.*)$/;
const countLine = /^cases ran (\d+)$/;

export function readTierOutcome(output: string, exitCode: number | null): TierOutcome {
  const lines = output.split('\n').map((line) => line.trim());

  const failures = lines.flatMap((line) => {
    const read = failedLine.exec(line);

    return read === null ? [] : [{ name: read[1] as string, reason: read[2] as string }];
  });

  const counts = lines.flatMap((line) => {
    const read = countLine.exec(line);

    return read === null ? [] : [Number(read[1])];
  });

  const ranCount = counts.length === 1 ? (counts[0] as number) : null;
  const problems: string[] = [];

  if (counts.length === 0) {
    problems.push(
      'the engine reported no count of cases, so nothing here says the tier ran at all',
    );
  } else if (counts.length > 1) {
    problems.push(`the engine reported ${counts.length} counts, and one run reports one count`);
  } else if (ranCount === 0) {
    problems.push('the engine discovered no case, and finding nothing to do is not a pass');
  }

  for (const failure of failures) {
    problems.push(`${failure.name}: ${failure.reason}`);
  }

  if (exitCode !== 0) {
    problems.push(`the engine exited with ${String(exitCode)}`);
  }

  return { passed: problems.length === 0, ranCount, failures, problems };
}

/** One line for a person, with the count in it, because the count is the evidence. */
export function describeTierOutcome(outcome: TierOutcome): string {
  if (outcome.passed) {
    return `hermes: ${String(outcome.ranCount)} cases ran on the engine and every one passed`;
  }

  const ran = outcome.ranCount === null ? 'no count reported' : `${String(outcome.ranCount)} ran`;

  return [`hermes: the tier failed, ${ran}`, ...outcome.problems.map((line) => `  ${line}`)].join(
    '\n',
  );
}
