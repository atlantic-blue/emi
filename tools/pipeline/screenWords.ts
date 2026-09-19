import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import { interfaceFilesOf } from './singleDayForecast';

/**
 * Two readings of the same rule: every word she reads comes from the catalogue under a key.
 *
 * The first reads a screen and fails a word written inside a `Text` element, because a word written
 * there can never be said in another language. The second reads every call and every key, so a key
 * nobody reads and a key nobody wrote both fail rather than sit there.
 *
 * The source is parsed rather than searched, so a word inside a comment, a name or a style is left
 * alone and only what a woman actually reads is held to the rule.
 */

/** A word a screen writes into its own markup instead of naming a key for it. */
export interface ScreenWord {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

export function describeScreenWord(word: ScreenWord): string {
  return `${word.file}:${word.line} writes "${word.text}" into a Text element instead of naming a key`;
}

function parsed(file: string, source: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function tagNameOf(opening: ts.JsxOpeningLikeElement, source: ts.SourceFile): string {
  return opening.tagName.getText(source);
}

/**
 * A sign carries no letters, so it says the same thing in every language and is not a word. The
 * plus and the minus on the cycle length stepper are the two this exists for.
 */
function isAWord(text: string): boolean {
  return /\p{Letter}/u.test(text);
}

/** Every word written inside a `Text` element, whether as markup or as a string in an expression. */
export function wordsInTextElements(file: string, source: string): ScreenWord[] {
  const tree = parsed(file, source);
  const found: ScreenWord[] = [];

  const at = (node: ts.Node): number =>
    tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;

  const visit = (node: ts.Node, insideText: boolean): void => {
    let within = insideText;

    if (ts.isJsxElement(node) && /(^|\.)Text$/.test(tagNameOf(node.openingElement, tree))) {
      within = true;
    }

    if (within && ts.isJsxText(node) && isAWord(node.text) && node.text.trim().length > 0) {
      found.push({ file, line: at(node), text: node.text.trim() });
    }

    if (
      within &&
      ts.isStringLiteral(node) &&
      ts.isJsxExpression(node.parent) &&
      isAWord(node.text) &&
      node.text.trim().length > 0
    ) {
      found.push({ file, line: at(node), text: node.text.trim() });
    }

    node.forEachChild((child) => visit(child, within));
  };

  visit(tree, false);

  return found;
}

/** Every `.tsx` file the application draws from. */
export function screenFilesOf(root: string): string[] {
  return interfaceFilesOf(root).filter((file) => file.endsWith('.tsx'));
}

export function wordsInScreensUnder(root: string, files: readonly string[]): ScreenWord[] {
  return files.flatMap((file) => wordsInTextElements(file, readFileSync(join(root, file), 'utf8')));
}

/** The name of the lookup, and the type that marks a value as holding keys rather than words. */
const lookupName = 'words';
const keyTypeName = 'WordKey';

/**
 * Every key the source names: the first argument of each lookup, and every key inside a value the
 * type says holds keys, whether that is a list a screen walks or a table it looks a key up in.
 * Nothing else counts, so a key inside a comment or a sentence is not mistaken for one that is read.
 */
export function keysReadIn(file: string, source: string): string[] {
  const tree = parsed(file, source);
  const found: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(tree) === lookupName &&
      node.arguments.length > 0
    ) {
      const [first] = node.arguments;

      if (first !== undefined && ts.isStringLiteral(first)) {
        found.push(first.text);
      }
    }

    if (
      ts.isVariableDeclaration(node) &&
      node.type !== undefined &&
      new RegExp(`\\b${keyTypeName}\\b`).test(node.type.getText(tree)) &&
      node.initializer !== undefined
    ) {
      node.initializer.forEachChild(function inside(held: ts.Node): void {
        if (ts.isStringLiteral(held)) {
          found.push(held.text);
        }

        held.forEachChild(inside);
      });
    }

    node.forEachChild(visit);
  };

  visit(tree);

  return found;
}

export function keysReadUnder(root: string, files: readonly string[]): string[] {
  return files.flatMap((file) => keysReadIn(file, readFileSync(join(root, file), 'utf8')));
}
