/** A stub, so the command that reads a run report can run. What counts is the commit after this. */

export interface RunReport {
  readonly stats?: {
    readonly expected?: number;
    readonly unexpected?: number;
    readonly flaky?: number;
  };
}

export function scenariosRan(report: RunReport): number {
  return report.stats?.expected ?? 0;
}
