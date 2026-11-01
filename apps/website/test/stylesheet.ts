import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { compile } from '@tailwindcss/node';

/**
 * The stylesheet the site serves, compiled the way the site compiles it: Tailwind itself reads
 * `app/globals.css`, the theme that stylesheet names, and the token package the theme reads.
 *
 * A class in a page proves nothing about what a woman sees. This is the step from the class to the
 * colour, the size and the face, so a test can say she reads the Emi palette rather than that the
 * markup carries a word.
 */

export const websiteWorkspace = resolve(__dirname, '..');

const stylesheetFile = join(websiteWorkspace, 'app', 'globals.css');

/** Every class in a piece of markup, which is what Tailwind calls a candidate. */
export function classesIn(markup: string): string[] {
  const found = new Set<string>();

  for (const [, list] of markup.matchAll(/class="([^"]*)"/g)) {
    for (const name of (list ?? '').split(/\s+/)) {
      if (name.length > 0) {
        found.add(name);
      }
    }
  }

  return [...found];
}

/** The rules the site serves for a set of classes, as one stylesheet. */
export async function stylesheetFor(classes: readonly string[]): Promise<string> {
  const compiler = await compile(readFileSync(stylesheetFile, 'utf8'), {
    base: join(websiteWorkspace, 'app'),
    onDependency: () => {},
  });

  return compiler.build([...classes]);
}

/** The selector Tailwind writes for a class, which escapes the colon a variant carries. */
function selectorOf(className: string): string {
  return `.${className.replace(/:/g, '\\:')}`;
}

function forARegularExpression(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * What one class sets, as the declarations between its braces, including the ones a variant such
 * as hover or disabled adds. A class the theme does not know draws nothing, and this answers with
 * nothing for it, which is the failure worth seeing.
 */
export function declarationsOf(stylesheet: string, className: string): string {
  const rules = new RegExp(
    `${forARegularExpression(selectorOf(className))}(?![\\w-])[^{}]*\\{([^}]*)\\}`,
    'g',
  );

  return [...stylesheet.matchAll(rules)]
    .map(([, declarations]) => (declarations ?? '').replace(/\s+/g, ' ').trim())
    .join(' ');
}

/** The declarations of every class in a piece of markup, by class. */
export async function whatTheMarkupDraws(
  markup: string,
): Promise<Readonly<Record<string, string>>> {
  const classes = classesIn(markup);
  const stylesheet = await stylesheetFor(classes);

  return Object.fromEntries(classes.map((name) => [name, declarationsOf(stylesheet, name)]));
}

/**
 * The order the stylesheet writes rules in, for the classes it knows out of the ones given. This
 * is where the one order of a class list comes from: a reader follows a word from the page to the
 * rule the browser obeys, and the rules arrive in one sequence.
 *
 * A class the theme does not know is absent from the answer, because the stylesheet writes no rule
 * for it.
 */
export async function orderOfTheStylesheet(classes: readonly string[]): Promise<string[]> {
  const stylesheet = await stylesheetFor(classes);
  const written: string[] = [];

  for (const [, selector] of stylesheet.matchAll(/\.((?:\\.|[\w-])+)(?![\w-])/g)) {
    const name = (selector ?? '').replace(/\\(.)/g, '$1');

    if (classes.includes(name) && !written.includes(name)) {
      written.push(name);
    }
  }

  return written;
}

/**
 * Every run of two or more words inside a quote. A class list is written as one, and so is a
 * sentence, so the caller decides which runs are class lists by asking the stylesheet which words
 * it knows. What a template puts in with its own expression is dropped, because the words around
 * it are the ones somebody ordered.
 */
export function quotedWordRuns(source: string): string[][] {
  const quoted = /'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g;

  return [...source.matchAll(quoted)]
    .map(([, single, double, template]) => single ?? double ?? template ?? '')
    .map((text) => text.replace(/\$\{[^}]*\}/g, ' '))
    .map((text) =>
      text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0),
    )
    .filter((words) => words.length > 1);
}
