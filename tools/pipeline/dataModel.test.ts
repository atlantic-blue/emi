import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  attributeFloor,
  attributesIn,
  attributesUnder,
  configurationOf,
  dataModelDocument,
  declarationsIn,
  describeScan,
  namesIn,
  scansIn,
  scansUnder,
  serviceFilesOf,
  serviceRoot,
  tableBodiesIn,
  undeclaredInTheDocument,
  unnamedAttributes,
} from './dataModel';

const repositoryRoot = resolve(__dirname, '..', '..');
const theStore = join('services', 'vault', 'src', 'store', 'dynamo.ts');

const document = readFileSync(join(repositoryRoot, dataModelDocument), 'utf8');
const files = serviceFilesOf(repositoryRoot);
const attributes = attributesUnder(repositoryRoot, files);
const configuration = configurationOf(repositoryRoot);

function documentWithout(attribute: string): string {
  return document.split(`\`${attribute}\``).join('the field this sentence used to name');
}

describe('the data model document is the source, and the code follows it', () => {
  describe('every attribute the service touches is named in the document', () => {
    it('finds none the document leaves out, and says how much it read', () => {
      expect(unnamedAttributes(attributes, namesIn(document))).toEqual([]);
      expect(attributes.length).toBeGreaterThanOrEqual(attributeFloor);
      expect(files.length).toBeGreaterThan(5);
    });

    it('reads the service and nothing outside it', () => {
      expect(files).toContain(theStore);
      expect(files.every((file) => file.startsWith(serviceRoot))).toBe(true);
    });

    it('names the account, the record and the remembered signature', () => {
      expect(attributes.map((attribute) => attribute.name)).toEqual(
        expect.arrayContaining([
          'pk',
          'sk',
          'publicKey',
          'wrappedVaultKey',
          'recoverySalt',
          'createdAt',
          'recordCount',
          'payload',
          'revision',
          'updatedAt',
          'ttl',
        ]),
      );
    });

    it('refuses the document once one attribute is taken out of it, and names the line', () => {
      const said = unnamedAttributes(attributes, namesIn(documentWithout('wrappedVaultKey')));

      expect(said).toHaveLength(1);
      expect(said[0]).toContain('wrappedVaultKey');
      expect(said[0]).toContain(theStore);
      expect(said[0]).toContain(dataModelDocument);
    });

    it('refuses an attribute a new write adds while the document says nothing about it', () => {
      const source = 'const item = { ...key, lastSeenAt: { S: at } };\n';
      const added = attributesIn(theStore, source);

      expect(added.map((attribute) => attribute.name)).toEqual(['lastSeenAt']);
      expect(unnamedAttributes(added, namesIn(document))).toHaveLength(1);
    });

    it('reads an attribute back off an item as a use of it', () => {
      const source = 'const seen = textOf(item.lastSeenAt);\n';

      expect(attributesIn(theStore, source).map((attribute) => attribute.name)).toEqual([
        'lastSeenAt',
      ]);
    });

    it('takes a name written in a value expression for an attribute of the item', () => {
      const source = "const key = { ':after': { S: after } };\n";

      expect(attributesIn(theStore, source)).toEqual([]);
    });

    it('reads a name written only inside a diagram as unnamed, because a diagram explains nothing', () => {
      const drawn = '# The model\n\n```mermaid\nflowchart TD\n  A["META: lastSeenAt"]\n```\n';
      const added = attributesIn(theStore, 'const item = { lastSeenAt: { S: at } };\n');

      expect(namesIn(drawn).has('lastSeenAt')).toBe(false);
      expect(unnamedAttributes(added, namesIn(drawn))).toHaveLength(1);
    });

    it('takes an array method for nothing, because it is not an attribute', () => {
      const source = 'const left = held.filter((one) => one.sk).length;\n';

      expect(attributesIn(theStore, source)).toEqual([]);
    });
  });

  describe('every table, key and index the infrastructure declares is named in the document', () => {
    it('finds none the document leaves out, and reads one table', () => {
      expect(undeclaredInTheDocument(declarationsIn(configuration), namesIn(document))).toEqual([]);
      expect(tableBodiesIn(configuration)).toHaveLength(1);
    });

    it('reads the table, both keys, the index and the time to live attribute', () => {
      expect(declarationsIn(configuration)).toEqual([
        { kind: 'table', value: 'emi-vault' },
        { kind: 'key', value: 'pk' },
        { kind: 'key', value: 'sk' },
        { kind: 'key', value: 'updatedAt' },
        { kind: 'index', value: 'byUpdated' },
        { kind: 'attribute', value: 'ttl' },
      ]);
    });

    it('refuses a second table the document has never heard of', () => {
      const added = `${configuration}
resource "aws_dynamodb_table" "articles" {
  name      = "\${var.project_name}-leaderboard"
  hash_key  = "readerId"
}
`;
      const said = undeclaredInTheDocument(declarationsIn(added), namesIn(document));

      expect(said).toHaveLength(2);
      expect(said[0]).toContain('emi-leaderboard');
      expect(said[1]).toContain('readerId');
    });

    it('reads nothing outside the table, so a role named after the project is not a table', () => {
      const roles = `resource "aws_iam_role" "authorizer" {
  name = "\${var.project_name}-authorizer"
}
`;

      expect(declarationsIn(roles)).toEqual([]);
    });
  });

  describe('nothing in this model reads the whole table', () => {
    it('finds no scan in the service and none in the infrastructure', () => {
      expect(scansUnder(repositoryRoot, files).map(describeScan)).toEqual([]);
      expect(scansIn('infra', configuration)).toEqual([]);
    });

    it('refuses a call that scans, and names the file and the line', () => {
      const source = 'const everything = await table.scan({ TableName: tableName });\n';
      const [said] = scansIn(theStore, source).map(describeScan);

      expect(said).toContain(theStore);
      expect(said).toContain('table.scan');
    });

    it('refuses a policy that may scan', () => {
      const policy = '    actions = ["dynamodb:Query", "dynamodb:Scan"]\n';

      expect(scansIn('infra/lambda.tf', policy)).toHaveLength(1);
    });

    it('leaves a comment about not scanning alone, because it is the word and not the call', () => {
      const source = '// A pull is a query inside one partition, and never a scan of the table.\n';

      expect(scansIn(theStore, source)).toEqual([]);
    });
  });
});
