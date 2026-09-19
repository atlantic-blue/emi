import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

/**
 * The data model document is the source, and the code follows it. So an attribute the service
 * writes or reads, a table or a key the infrastructure declares, and an index it builds, all have
 * to be named in the document. A reader who trusts that document is then reading the table.
 *
 * The rules here are searches over text, and a search is only as good as what it reads. Each
 * reader below is a parameter of the check that uses it, so a test hands it a source of its own and
 * watches the rule fail.
 */

export const dataModelDocument = 'docs/design/data-model.md';

/** The service the rules are held against, which is the only code that reaches the table. */
export const serviceRoot = join('services', 'vault', 'src');

export const infrastructureRoot = 'infra';

export const scannedExtensions: readonly string[] = ['.ts', '.tsx'];

/**
 * The fewest attributes a healthy read finds. A reader that matched nothing would report a clean
 * run, and a clean run that read nothing is the one result that means nothing.
 */
export const attributeFloor = 8;

/** An attribute written into an item, as `name: { S: ... }` and its three other value shapes. */
const writtenAttribute = /\b([a-zA-Z][a-zA-Z0-9]*)\s*:\s*\{\s*(?:S|N|B|BOOL)\s*:/g;

/**
 * An attribute read back off an item. The reader knows one shape, `item.name`, because that is the
 * name the store reads an item into. Every attribute the service reads it also writes, and the
 * pattern above finds the write, so the narrow shape here costs nothing and matches no array method.
 */
const readAttribute = /\bitem\??\.([a-zA-Z][a-zA-Z0-9]*)\b/g;

/** Text inside a pair of backticks, which is how the document names a field. */
const backticked = /`([^`]+)`/g;

/**
 * The operation this model has no use for. The pattern is the operation name and not the word, so
 * a comment saying a pull is a query rather than a scan is left alone.
 */
export const scanShapes: readonly RegExp[] = [/\bScan\b/, /\.scan\s*\(/];

export interface Attribute {
  readonly name: string;
  readonly file: string;
  readonly context: string;
}

function found(pattern: RegExp, file: string, contents: string): Attribute[] {
  const lines = contents.split('\n');
  const seen = new Map<string, Attribute>();

  for (const line of lines) {
    for (const match of line.matchAll(pattern)) {
      const name = match[1] as string;

      if (!seen.has(name)) {
        seen.set(name, { name, file, context: line.trim() });
      }
    }
  }

  return [...seen.values()];
}

/** Every attribute one file writes into an item or reads back out of one. */
export function attributesIn(file: string, contents: string): Attribute[] {
  const all = new Map<string, Attribute>();

  for (const attribute of [
    ...found(writtenAttribute, file, contents),
    ...found(readAttribute, file, contents),
  ]) {
    if (!all.has(attribute.name)) {
      all.set(attribute.name, attribute);
    }
  }

  return [...all.values()].sort((one, other) => one.name.localeCompare(other.name));
}

/** Every file of the service, in one sorted list, with paths written from the repository root. */
export function serviceFilesOf(root: string, within: string = serviceRoot): string[] {
  const files: string[] = [];

  const walk = (directory: string): void => {
    for (const entry of readdirSync(join(root, directory)).sort()) {
      const path = join(directory, entry);

      if (statSync(join(root, path)).isDirectory()) {
        walk(path);
        continue;
      }

      if (scannedExtensions.includes(extname(entry))) {
        files.push(path);
      }
    }
  };

  walk(within);

  return files;
}

export function attributesUnder(root: string, files: readonly string[]): Attribute[] {
  const all = new Map<string, Attribute>();

  for (const file of files) {
    for (const attribute of attributesIn(file, readFileSync(join(root, file), 'utf8'))) {
      if (!all.has(attribute.name)) {
        all.set(attribute.name, attribute);
      }
    }
  }

  return [...all.values()].sort((one, other) => one.name.localeCompare(other.name));
}

/**
 * The document with every fenced block taken out. A fence opens with three backticks, so a reader
 * of backtick spans would otherwise read a whole diagram as one span and count every word in it.
 * A name that appears only inside a diagram is not a name the document explains.
 */
export function withoutFences(markdown: string): string {
  const kept: string[] = [];
  let fenced = false;

  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) {
      fenced = !fenced;
      continue;
    }

    if (!fenced) {
      kept.push(line);
    }
  }

  return kept.join('\n');
}

/** Everything the document writes inside backticks, which is how it names a field of the model. */
export function namesIn(markdown: string): Set<string> {
  const names = new Set<string>();

  for (const match of withoutFences(markdown).matchAll(backticked)) {
    const span = match[1] as string;

    names.add(span);

    for (const word of span.split(/[^a-zA-Z0-9]+/)) {
      if (word.length > 0) {
        names.add(word);
      }
    }
  }

  return names;
}

export function unnamedAttributes(attributes: readonly Attribute[], named: Set<string>): string[] {
  return attributes
    .filter((attribute) => !named.has(attribute.name))
    .map(
      (attribute) =>
        `${attribute.file} names the attribute "${attribute.name}" in: ${attribute.context}, and ${dataModelDocument} does not name it`,
    );
}

/**
 * The body of every DynamoDB table in the configuration. A name read anywhere in the files would
 * take a role or a function with it, so the reader walks the braces of the table resource and reads
 * nothing outside it.
 */
export function tableBodiesIn(configuration: string): string[] {
  const bodies: string[] = [];
  const header = /resource\s+"aws_dynamodb_table"\s+"[a-z_]+"/g;

  for (const match of configuration.matchAll(header)) {
    const opening = configuration.indexOf('{', match.index);
    let depth = 0;

    for (let at = opening; at < configuration.length; at += 1) {
      if (configuration[at] === '{') {
        depth += 1;
      }

      if (configuration[at] === '}') {
        depth -= 1;

        if (depth === 0) {
          bodies.push(configuration.slice(opening + 1, at));
          break;
        }
      }
    }
  }

  return bodies;
}

export interface Declaration {
  readonly kind: string;
  readonly value: string;
}

/**
 * The table, its two keys, the attributes it declares, the index and the time to live attribute,
 * read out of the configuration rather than out of a list somebody keeps by hand.
 */
export function declarationsIn(configuration: string): Declaration[] {
  const declarations: Declaration[] = [];

  for (const table of tableBodiesIn(configuration)) {
    for (const match of table.matchAll(/name\s+=\s+"\$\{var\.project_name\}-([a-z]+)"/g)) {
      declarations.push({ kind: 'table', value: `emi-${match[1] as string}` });
    }

    for (const match of table.matchAll(/(hash_key|range_key)\s+=\s+"([a-zA-Z]+)"/g)) {
      declarations.push({ kind: 'key', value: match[2] as string });
    }

    for (const match of table.matchAll(/local_secondary_index\s+\{\s+name\s+=\s+"([a-zA-Z]+)"/g)) {
      declarations.push({ kind: 'index', value: match[1] as string });
    }

    for (const match of table.matchAll(/attribute_name\s+=\s+"([a-zA-Z]+)"/g)) {
      declarations.push({ kind: 'attribute', value: match[1] as string });
    }
  }

  return declarations;
}

export function undeclaredInTheDocument(
  declarations: readonly Declaration[],
  named: Set<string>,
): string[] {
  const missing = new Map<string, string>();

  for (const declaration of declarations) {
    if (!named.has(declaration.value) && !missing.has(declaration.value)) {
      missing.set(
        declaration.value,
        `${infrastructureRoot} declares the ${declaration.kind} "${declaration.value}", and ${dataModelDocument} does not name it`,
      );
    }
  }

  return [...missing.values()];
}

export function configurationOf(root: string, within: string = infrastructureRoot): string {
  return readdirSync(join(root, within))
    .filter((file) => extname(file) === '.tf')
    .sort()
    .map((file) => readFileSync(join(root, within, file), 'utf8'))
    .join('\n');
}

export interface ScanUse {
  readonly file: string;
  readonly context: string;
}

export function scansIn(
  file: string,
  contents: string,
  shapes: readonly RegExp[] = scanShapes,
): ScanUse[] {
  return contents
    .split('\n')
    .filter((line) => shapes.some((shape) => shape.test(line)))
    .map((line) => ({ file, context: line.trim() }));
}

export function describeScan(use: ScanUse): string {
  return `${use.file} reaches for a scan in: ${use.context}`;
}

export function scansUnder(root: string, files: readonly string[]): ScanUse[] {
  return files.flatMap((file) => scansIn(file, readFileSync(join(root, file), 'utf8')));
}
