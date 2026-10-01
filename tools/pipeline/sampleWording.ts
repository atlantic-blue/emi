import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

/**
 * The rule that no screen may label anything on it as a sample.
 *
 * The market leader fills a screen on day one by drawing somebody else's numbers and writing the
 * word sample in small type beside them. Emi holds no sample data, so it needs no word for one, and
 * a screen that arrived with such a word would be a screen drawing something she cannot check.
 *
 * Every word a woman reads comes from the catalogues under a key, which `screenWords.ts` already
 * enforces. So reading the catalogues reads every word any screen can draw, in every language, and
 * a word put back into a screen is caught there rather than here.
 *
 * The source is parsed rather than searched, so a word inside a comment is left alone and only the
 * words she actually reads are held to the rule.
 */

/** Where the words of each language live, one file for each. */
export const languageDirectory = join('apps', 'mobile', 'src', 'language');

/** One key, and every form of its words. A key whose words change with the number has several. */
export interface CatalogueKey {
  readonly key: string;
  readonly forms: readonly string[];
}

export interface Catalogue {
  /** The path as a reader would type it, from the root of the repository. */
  readonly file: string;
  readonly keys: readonly CatalogueKey[];
}

/**
 * The wording a sample carries, in the three languages Emi is written in.
 *
 * Each entry is matched as a whole word, and an entry of several words as a run of whole words.
 * That is not tidiness: the Russian word for approximately is примерно, which carries the Russian
 * word for example inside it, and four keys say approximately. A search for the stem would fail
 * those four. The cost is that a word run together with another is not found, and no sentence
 * anybody writes does that.
 *
 * The Spanish for shows is muestra, which is also the Spanish for a sample, so the sample is
 * refused as the two words a label would carry rather than as the one a sentence uses.
 */
export const sampleWording: readonly string[] = [
  // English.
  'sample',
  'samples',
  'example',
  'examples',
  'demo',
  'demonstration',
  'illustration',
  'illustrative',
  'placeholder',
  'placeholders',
  'fictional',
  'fictitious',
  // Spanish.
  'ejemplo',
  'ejemplos',
  'de muestra',
  'de muestras',
  'demostracion',
  'demostración',
  'ilustracion',
  'ilustración',
  'ilustrativo',
  'ilustrativa',
  'ficticio',
  'ficticia',
  'ficticios',
  'ficticias',
  'relleno',
  // Russian. A noun changes its ending with its case, so the forms a label would carry are
  // written out one by one rather than cut back to a stem, which the whole word rule forbids.
  'пример',
  'примеры',
  'примера',
  'примеров',
  'примере',
  'примерные данные',
  'примерных данных',
  'образец',
  'образцы',
  'образца',
  'образцов',
  'демо',
  'демонстрация',
  'демонстрации',
  'иллюстрация',
  'иллюстрации',
  'иллюстративный',
  'вымышленный',
  'вымышленные',
  'фиктивный',
  'фиктивные',
  'заполнитель',
];

/**
 * The only sentences that may carry the wording above, because each one denies that Emi holds any
 * sample data rather than labelling something as one. A sentence is taken out of the words before
 * the search runs, so anything else built from the same words is still found.
 *
 * Adding a line here is a deliberate act a reviewer sees.
 */
export const approvedDenials: readonly string[] = [
  'Emi draws nothing from nothing, and it holds no sample data.',
  // Spanish and Russian, word for word as the catalogues write them.
  'Emi no dibuja nada de nada, y no guarda datos de ejemplo.',
  'Emi ничего не рисует из ничего и не хранит примерных данных.',
];

export interface Sample {
  readonly file: string;
  readonly key: string;
  readonly wording: string;
  readonly words: string;
}

export function describeSample(sample: Sample): string {
  return `${sample.file} says "${sample.wording}" under ${sample.key}: ${sample.words}`;
}

function parsed(file: string, source: string): ts.SourceFile {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/** A catalogue names its keys as quoted strings, and every key of every catalogue carries a dot. */
function isACatalogue(held: ts.ObjectLiteralExpression): boolean {
  const named = held.properties.filter(ts.isPropertyAssignment);

  return (
    named.length > 0 &&
    named.every((property) => ts.isStringLiteral(property.name) && property.name.text.includes('.'))
  );
}

/** Every word under one key: the one string a key holds, or one for each plural form it carries. */
function formsOf(value: ts.Expression): string[] {
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
    return [value.text];
  }

  if (ts.isObjectLiteralExpression(value)) {
    return value.properties
      .filter(ts.isPropertyAssignment)
      .flatMap((property) => formsOf(property.initializer));
  }

  return [];
}

/**
 * The keys and the words of one catalogue file, or no keys at all where the file holds none. A file
 * of the language directory that is not a catalogue is then read and found empty rather than
 * guessed at by its name.
 */
export function catalogueIn(file: string, source: string): Catalogue {
  const tree = parsed(file, source);
  const keys: CatalogueKey[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node) && isACatalogue(node)) {
      for (const property of node.properties.filter(ts.isPropertyAssignment)) {
        if (ts.isStringLiteral(property.name)) {
          keys.push({ forms: formsOf(property.initializer), key: property.name.text });
        }
      }

      return;
    }

    node.forEachChild(visit);
  };

  visit(tree);

  return { file, keys };
}

/** Every file of the language directory that holds a catalogue, sorted, as a reader would type it. */
export function catalogueFilesOf(root: string): string[] {
  return readdirSync(join(root, languageDirectory))
    .filter((name) => name.endsWith('.ts'))
    .map((name) => join(languageDirectory, name))
    .filter((file) => catalogueIn(file, readFileSync(join(root, file), 'utf8')).keys.length > 0)
    .sort();
}

/** The words of a sentence, in order, lower case, with everything that is not a letter dropped. */
function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter((word) => word.length > 0);
}

function saysTheseWords(said: readonly string[], wording: readonly string[]): boolean {
  return said.some((_unused, at) => wording.every((word, where) => said[at + where] === word));
}

/**
 * One form of one key, with every approved denial taken out of it.
 *
 * A denial only counts where it begins a sentence. A sentence that wraps one in other words is not
 * the approved sentence, so it stays in the words and is read like anything else.
 */
function withoutDenials(form: string, denials: readonly string[]): string {
  let left = form;

  for (const denial of denials) {
    for (let at = left.indexOf(denial); at >= 0; at = left.indexOf(denial, at + 1)) {
      const before = left.slice(0, at).trimEnd().slice(-1);

      if (before === '' || before === '.' || before === '!' || before === '?') {
        left = left.slice(0, at) + ' ' + left.slice(at + denial.length);
      }
    }
  }

  return left;
}

export function samplesIn(
  catalogue: Catalogue,
  denials: readonly string[] = approvedDenials,
  searchFor: readonly string[] = sampleWording,
): Sample[] {
  const found: Sample[] = [];

  for (const held of catalogue.keys) {
    for (const form of held.forms) {
      const said = wordsOf(withoutDenials(form, denials));

      for (const wording of searchFor) {
        if (saysTheseWords(said, wordsOf(wording))) {
          found.push({ file: catalogue.file, key: held.key, wording, words: form });
        }
      }
    }
  }

  return found;
}

export interface Read {
  readonly problems: readonly string[];
  readonly cataloguesRead: number;
  readonly keysRead: number;
  /** How many words were read altogether, which a key whose words change by number adds several to. */
  readonly formsRead: number;
}

/**
 * Every catalogue of the repository, read for the wording a sample carries.
 *
 * The counts come back with the problems, because a run that read no catalogue and a run that read
 * every catalogue and found nothing wrong look exactly alike from the outside.
 */
export function samplesUnder(root: string, files: readonly string[]): Read {
  const catalogues = files.map((file) => catalogueIn(file, readFileSync(join(root, file), 'utf8')));

  return {
    cataloguesRead: catalogues.length,
    formsRead: catalogues.reduce(
      (total, catalogue) =>
        total + catalogue.keys.reduce((keys, held) => keys + held.forms.length, 0),
      0,
    ),
    keysRead: catalogues.reduce((total, catalogue) => total + catalogue.keys.length, 0),
    problems: catalogues.flatMap((catalogue) => samplesIn(catalogue).map(describeSample)),
  };
}
