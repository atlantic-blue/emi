import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  approvedDenials,
  claimsIn,
  describeClaim,
  forbiddenWording,
  interfaceOnlyWording,
  interfaceWording,
} from '../../../../tools/pipeline/forbiddenClaims';
import {
  interfaceClaimsIn,
  interfaceClaimsUnder,
  scannedInterfaceFiles,
  storeListingFiles,
  withoutModuleSpecifiers,
  writtenStoreListingFiles,
} from '../../../../tools/pipeline/interfaceClaims';

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');

const aScreen = 'apps/mobile/src/features/forecast/FertileWindow.tsx';
const aDocument = 'docs/privacy.md';
const theCatalogue = 'apps/mobile/src/language/english.ts';

// Every example below is taken from the lists themselves rather than written out, so this file
// holds no claim of its own and the repository wide scan can read it with everything else.
function theWordStartingWith(beginning: string, list: readonly string[]): string {
  const found = list.find((wording) => wording.startsWith(beginning));

  if (found === undefined) {
    throw new Error(`no wording on the list starts with "${beginning}"`);
  }

  return found;
}

const aWordOnlyAScreenRefuses = theWordStartingWith('saf', interfaceOnlyWording);
const aWordEveryFileRefuses = theWordStartingWith('contracept', forbiddenWording);
const theDenial = theWordStartingWith('Emi never says', approvedDenials);

describe('the words a screen may not use', () => {
  describe('the application as it stands today', () => {
    const scanned = scannedInterfaceFiles(repositoryRoot);

    it('uses none of them, and says how much it read', () => {
      expect(interfaceClaimsUnder(repositoryRoot, scanned).map(describeClaim)).toEqual([]);
      expect(scanned.length).toBeGreaterThan(20);
    });

    it('is read screen by screen, the forecast among them', () => {
      expect(scanned).toContain(aScreen);
      expect(scanned).toContain('apps/mobile/src/features/forecast/copy.ts');
      expect(scanned).toContain('apps/mobile/src/app/(tabs)/index.tsx');
    });

    // The words moved into the catalogue, so the scan reads them there or it reads nothing she
    // sees. Both files are named, because one holds the words and the other holds the lookup.
    it('reads the catalogue the words moved into', () => {
      expect(scanned).toContain(theCatalogue);
      expect(scanned).toContain('apps/mobile/src/language/words.ts');
    });

    it('reads the catalogue whole, and it carries most of the words in the product', () => {
      const held = readFileSync(join(repositoryRoot, theCatalogue), 'utf8');

      expect(interfaceClaimsIn(theCatalogue, held)).toEqual([]);
      expect(held.length).toBeGreaterThan(8000);
    });

    it('is read whole, and not only the words a screen renders', () => {
      const read = scanned
        .map((file) => readFileSync(join(repositoryRoot, file), 'utf8').length)
        .reduce((total, length) => total + length, 0);

      expect(read).toBeGreaterThan(20000);
    });
  });

  describe('a word the interface adds to the repository list', () => {
    it('is refused on a screen, and the file and the words are named', () => {
      const screen = `export const line = 'Today is a ${aWordOnlyAScreenRefuses} day for you';\n`;
      const [described] = interfaceClaimsIn(aScreen, screen).map(describeClaim);

      expect(described).toContain(aScreen);
      expect(described).toContain(aWordOnlyAScreenRefuses);
      expect(described).toContain('day for you');
    });

    it('is allowed in a document, which has room to explain itself', () => {
      const document = `A woman asks whether a day is ${aWordOnlyAScreenRefuses}, and it is a fair question.\n`;

      expect(claimsIn(aDocument, document)).toEqual([]);
      expect(interfaceClaimsIn(aScreen, document)).toHaveLength(1);
    });

    it('is refused wherever it sits, including a comment and a name', () => {
      const comment = `// nothing here calls a day ${aWordOnlyAScreenRefuses}\n`;
      const markup = `<Text>Today is ${aWordOnlyAScreenRefuses}</Text>\n`;

      expect(interfaceClaimsIn(aScreen, comment)).toHaveLength(1);
      expect(interfaceClaimsIn(aScreen, markup)).toHaveLength(1);
    });

    it('is read as a word and not as a run of letters, so a package name survives', () => {
      const importing = [
        "import { SafeAreaView } from 'react-native-safe-area-context';",
        'export const frame = SafeAreaView;',
        '',
      ].join('\n');

      expect(interfaceClaimsIn(aScreen, importing)).toEqual([]);
      expect(withoutModuleSpecifiers(importing)).toContain("from ''");
    });
  });

  describe('every word on either list', () => {
    it('is refused when a screen says it', () => {
      const saying = (wording: string): number =>
        interfaceClaimsIn(aScreen, `export const line = 'Emi gives you ${wording} here';\n`).length;
      const missed = interfaceWording.filter((wording) => saying(wording) === 0);

      expect(missed).toEqual([]);
      expect(interfaceWording).toHaveLength(forbiddenWording.length + interfaceOnlyWording.length);
    });

    it('is still refused where the words run across two lines', () => {
      const wrapped = `export const line = 'Emi gives you ${aWordEveryFileRefuses.replace(' ', '\n')} here';\n`;

      expect(interfaceClaimsIn(aScreen, wrapped)).toHaveLength(1);
    });
  });

  describe('the one sentence that may carry the words', () => {
    it('denies the claim, and passes', () => {
      const screen = `export const line = 'This is an estimate. ${theDenial}';\n`;

      expect(interfaceClaimsIn(aScreen, screen)).toEqual([]);
    });

    it('is refused where nothing puts a full stop in front of it', () => {
      const screen = `export const line = '${theDenial}';\n`;

      expect(interfaceClaimsIn(aScreen, screen)).toHaveLength(1);
    });

    it('is refused with the denial taken out of it', () => {
      const asserted = theDenial.replace(' never ', ' ');

      expect(asserted).not.toEqual(theDenial);
      expect(
        interfaceClaimsIn(aScreen, `export const line = 'Read this. ${asserted}';\n`),
      ).toHaveLength(1);
    });
  });

  describe('the store listing', () => {
    it('is named before it is written, so it joins the scan on the day it arrives', () => {
      expect(storeListingFiles).toContain('docs/store-listing.md');
      expect(writtenStoreListingFiles(repositoryRoot)).toEqual(
        storeListingFiles.filter((file) => scannedInterfaceFiles(repositoryRoot).includes(file)),
      );
    });

    it('is held to the same words as a screen', () => {
      const listing = `## What Emi does\n\nEmi tells you which days are ${aWordOnlyAScreenRefuses}.\n`;

      expect(interfaceClaimsIn('docs/store-listing.md', listing)).toHaveLength(1);
    });
  });
});
