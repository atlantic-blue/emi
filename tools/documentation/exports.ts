import ts from 'typescript';

/**
 * A documentation comment is a block comment that opens with two stars, because that is the one an
 * editor shows at the call site. A line comment above a declaration is a note to whoever is reading
 * the file, and it never reaches anybody calling the symbol from another package.
 */
export const documentationCommentOpens = '/**';

export type ExportKind = 'const' | 'function' | 'class' | 'interface' | 'type' | 'enum';

export interface Documented {
  readonly name: string;
  readonly kind: ExportKind;
  /** The file the declaration sits in, as a path from the root of the repository. */
  readonly file: string;
  /** The line the declaration starts on, counted from one, so a failure can be opened. */
  readonly line: number;
  /** What the reference prints: the declaration with its body or its initialiser taken off. */
  readonly signature: string;
  /** The prose of the comment, its stars stripped. Null when the symbol carries none. */
  readonly comment: string | null;
}

function collapsed(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/,(\s*[}\])])/g, '$1')
    .replace(/\[ /g, '[')
    .replace(/ \]/g, ']')
    .trim();
}

function exported(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function withoutExport(text: string): string {
  return text.startsWith('export ') ? text.slice('export '.length) : text;
}

// A member with a body prints as its own first line and nothing else, so a class reads as the
// surface it offers rather than as the code behind it.
function memberSignature(member: ts.ClassElement): string | null {
  if (ts.isPropertyDeclaration(member)) {
    const written =
      member.type === undefined
        ? member.getText()
        : `${member.name.getText()}: ${member.type.getText()}`;
    const modifiers = (ts.getModifiers(member) ?? [])
      .map((modifier) => `${modifier.getText()} `)
      .join('');

    return `${modifiers}${collapsed(written.split('=')[0] ?? written)}`;
  }

  if (ts.isConstructorDeclaration(member)) {
    return `constructor(${member.parameters.map((parameter) => parameter.getText()).join(', ')})`;
  }

  if (ts.isMethodDeclaration(member)) {
    const returns = member.type === undefined ? '' : `: ${member.type.getText()}`;

    return `${member.name.getText()}(${member.parameters.map((parameter) => parameter.getText()).join(', ')})${returns}`;
  }

  return null;
}

function classSignature(node: ts.ClassDeclaration, name: string): string {
  const heritage = (node.heritageClauses ?? []).map((clause) => ` ${clause.getText()}`).join('');
  const members = node.members
    .map(memberSignature)
    .filter((member): member is string => member !== null)
    .map((member) => `  ${member};`);

  if (members.length === 0) {
    return `class ${name}${heritage}`;
  }

  return [`class ${name}${heritage} {`, ...members, '}'].join('\n');
}

function functionSignature(node: ts.FunctionDeclaration, name: string): string {
  const generics =
    node.typeParameters === undefined
      ? ''
      : `<${node.typeParameters.map((parameter) => parameter.getText()).join(', ')}>`;
  const parameters = node.parameters.map((parameter) => collapsed(parameter.getText())).join(', ');
  const returns = node.type === undefined ? '' : `: ${node.type.getText()}`;

  return `function ${name}${generics}(${parameters})${returns}`;
}

// An annotated constant prints its type, because the type is what the caller writes against. An
// unannotated one prints its value, because the value is the whole of what it says.
function variableSignature(declaration: ts.VariableDeclaration, keyword: string): string {
  const name = declaration.name.getText();

  if (declaration.type !== undefined) {
    return `${keyword} ${name}: ${collapsed(declaration.type.getText())}`;
  }

  if (declaration.initializer === undefined) {
    return `${keyword} ${name}`;
  }

  return `${keyword} ${name} = ${collapsed(declaration.initializer.getText())}`;
}

function keywordOf(node: ts.VariableStatement): string {
  if ((node.declarationList.flags & ts.NodeFlags.Const) !== 0) {
    return 'const';
  }

  return (node.declarationList.flags & ts.NodeFlags.Let) !== 0 ? 'let' : 'var';
}

const adjacent = (gap: string): boolean =>
  gap.trim().length === 0 && (gap.match(/\n/g) ?? []).length <= 1;

function commentOf(source: ts.SourceFile, node: ts.Node): string | null {
  const text = source.getFullText();
  const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [];
  const last = ranges[ranges.length - 1];

  if (last === undefined || !adjacent(text.slice(last.end, node.getStart(source)))) {
    return null;
  }

  const written = text.slice(last.pos, last.end);

  if (!written.startsWith(documentationCommentOpens)) {
    return null;
  }

  return prose(written);
}

/**
 * The stars come off and the line breaks stay on, so the reference wraps where the author wrapped
 * and a blank line between two paragraphs survives into the page.
 */
export function prose(comment: string): string {
  const inner = comment.slice(documentationCommentOpens.length, -'*/'.length);

  return inner
    .split('\n')
    .map((line) => line.replace(/^\s*\* ?/, '').trimEnd())
    .join('\n')
    .replace(/^\s*\n/, '')
    .trim();
}

interface Declared {
  readonly name: string;
  readonly kind: ExportKind;
  readonly signature: string;
}

// An interface, a type alias and an enum are already the text a caller reads, so each one prints as
// it was written with the export keyword taken off the front.
function declaredBy(statement: ts.Statement, source: ts.SourceFile): Declared | null {
  if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) {
    const name = statement.name.getText();

    return { name, kind: 'function', signature: functionSignature(statement, name) };
  }

  if (ts.isClassDeclaration(statement) && statement.name !== undefined) {
    const name = statement.name.getText();

    return { name, kind: 'class', signature: classSignature(statement, name) };
  }

  const written = withoutExport(statement.getText(source));

  if (ts.isInterfaceDeclaration(statement)) {
    return { name: statement.name.getText(), kind: 'interface', signature: written };
  }

  if (ts.isTypeAliasDeclaration(statement)) {
    return { name: statement.name.getText(), kind: 'type', signature: written };
  }

  if (ts.isEnumDeclaration(statement)) {
    return { name: statement.name.getText(), kind: 'enum', signature: written };
  }

  return null;
}

function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

/** Every top level export of one file, in the order a reader meets them. */
export function exportsIn(file: string, contents: string): Documented[] {
  const source = ts.createSourceFile(file, contents, ts.ScriptTarget.ES2023, true);
  const found: Documented[] = [];

  for (const statement of source.statements) {
    if (!exported(statement)) {
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      const keyword = keywordOf(statement);
      const declarations = statement.declarationList.declarations;

      for (const declaration of declarations) {
        found.push({
          name: declaration.name.getText(),
          kind: 'const',
          file,
          line: lineOf(source, declaration),
          signature: variableSignature(declaration, keyword),
          // One declaration takes the comment above the whole statement. Several share that
          // statement, so each one takes only what sits above itself.
          comment: commentOf(source, declarations.length === 1 ? statement : declaration),
        });
      }

      continue;
    }

    const declared = declaredBy(statement, source);

    if (declared !== null) {
      found.push({
        ...declared,
        file,
        line: lineOf(source, statement),
        comment: commentOf(source, statement),
      });
    }
  }

  return found;
}

/**
 * The files an index hands on with a star. A named re-export is refused rather than skipped: it
 * would take a symbol out of this reader's sight while leaving it on the package's surface.
 */
export function reExportsIn(file: string, contents: string): string[] {
  const source = ts.createSourceFile(file, contents, ts.ScriptTarget.ES2023, true);
  const files: string[] = [];

  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement)) {
      continue;
    }

    const specifier = statement.moduleSpecifier;

    if (specifier === undefined || !ts.isStringLiteral(specifier)) {
      throw new Error(
        `${file} re-exports in a shape this reader does not know: ${statement.getText(source)}`,
      );
    }

    if (statement.exportClause !== undefined) {
      throw new Error(
        `${file} names what it re-exports from ${specifier.text}, and the reference reads a star export`,
      );
    }

    files.push(specifier.text);
  }

  return files;
}
