/**
 * How many scenarios a browser run carried out, read from the report the run writes.
 *
 * A Playwright run that finds no test prints a clean summary and the pipeline reads a pass. A
 * gherkin file that nobody generated, a steps glob that matches nothing, a project filter that
 * names a width that is not there: each one leaves a run with nothing to do, and nothing to do
 * looks exactly like everything done. So the count is read, and zero is refused.
 */

/** The part of the Playwright report this reads. Everything else in it is left alone. */
export interface RunReport {
  readonly stats?: {
    readonly expected?: number;
    readonly unexpected?: number;
    readonly flaky?: number;
  };
}

function count(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * A scenario that ran, at each width it ran at. A skipped scenario opened no page, so it is not
 * counted: a suite that skips everything proves as little as a suite that holds nothing.
 */
export function scenariosRan(report: RunReport): number {
  const stats = report.stats ?? {};

  return count(stats.expected) + count(stats.unexpected) + count(stats.flaky);
}

/** What to say when the run proved nothing, or null when it proved something. */
export function refusalFor(report: RunReport): string | null {
  const ran = scenariosRan(report);

  if (ran > 0) {
    return null;
  }

  return (
    'The browser suite carried out 0 scenarios, so it opened no page and proved nothing. ' +
    'A run with nothing to do is not a passing run.'
  );
}
