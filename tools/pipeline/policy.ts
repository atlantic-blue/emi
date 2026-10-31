import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The pipeline policy documents, read the way the account reads them: as statements, each with the
 * actions it grants and the resources it stands on.
 *
 * The source is Terraform text and not rendered JSON, because only the pipeline renders it. A rule
 * that waited for a plan would say nothing until after the merge, which is too late to refuse a
 * resource pattern that reaches somebody else's zone.
 */

export interface PolicyStatement {
  readonly sid: string;
  readonly actions: readonly string[];
  readonly resources: readonly string[];
}

/** Every Terraform file of one directory, joined, in the order a reader would list them. */
export function configurationOf(directory: string): string {
  return readdirSync(directory)
    .filter((file) => file.endsWith('.tf'))
    .map((file) => readFileSync(join(directory, file), 'utf8'))
    .join('\n');
}

/**
 * The body of one top level block, so an assertion reads inside the resource it names rather than
 * anywhere in the file. Interpolations balance their own braces, so counting them is enough.
 */
export function bodyOf(configuration: string, header: string): string {
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

export function listedIn(body: string, field: string): string[] {
  const found = new RegExp(`${field}\\s*=\\s*\\[([^\\]]*)\\]`).exec(body);

  if (found?.[1] === undefined) {
    return [];
  }

  return found[1]
    .split(',')
    .map((entry) => entry.trim().replace(/^"|"$/g, ''))
    .filter((entry) => entry.length > 0 && !entry.startsWith('#'));
}

/** Every statement of one policy document. */
export function statementsIn(policy: string): PolicyStatement[] {
  return policy
    .split(/\bstatement\s*\{/)
    .slice(1)
    .map((body) => ({
      sid: /sid\s*=\s*"([^"]*)"/.exec(body)?.[1] ?? '',
      actions: listedIn(body, 'actions'),
      resources: listedIn(body, 'resources'),
    }));
}

export function defaultOf(configuration: string, variable: string): string {
  const found = /default\s+=\s+"([^"]*)"/.exec(bodyOf(configuration, `variable "${variable}"`));

  if (!found?.[1]) {
    throw new Error(`the variable ${variable} has no text default`);
  }

  return found[1];
}

/**
 * One piece of Terraform text with every variable reference replaced by that variable's default, so
 * a rule reads the address the account will evaluate rather than the expression that composes it.
 */
export function resolved(configuration: string, text: string): string {
  return text.replace(/\$\{var\.([a-z_]+)\}/g, (_, variable: string) =>
    defaultOf(configuration, variable),
  );
}

/**
 * True where a statement stands on every resource. Anything else names one, whether it names it
 * as an address pattern or through a local, and naming one is what denies a collection.
 */
export function standsOnEveryResource(statement: PolicyStatement): boolean {
  return statement.resources.length === 1 && statement.resources[0] === '*';
}

/** True where a statement's actions reach the given one, by name or through a wildcard. */
export function reaches(statement: PolicyStatement, action: string): boolean {
  return statement.actions.some(
    (granted) =>
      granted === action ||
      granted === '*' ||
      (granted.endsWith('*') && action.startsWith(granted.slice(0, -1))),
  );
}

/** Every statement that grants one action, which is how a reader finds what a grant stands on. */
export function statementsReaching(
  statements: readonly PolicyStatement[],
  action: string,
): PolicyStatement[] {
  return statements.filter((statement) => reaches(statement, action));
}

export function grantedOnEveryResource(
  statements: readonly PolicyStatement[],
  action: string,
): boolean {
  return statements.filter(standsOnEveryResource).some((statement) => reaches(statement, action));
}
