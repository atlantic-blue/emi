import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  type Catalogue,
  approvedDenials,
  catalogueFilesOf,
  catalogueIn,
  describeSample,
  languageDirectory,
  sampleWording,
  samplesIn,
  samplesUnder,
} from './sampleWording';

const repositoryRoot = resolve(__dirname, '..', '..');

const theEnglishCatalogue = join(languageDirectory, 'english.ts');
const theSpanishCatalogue = join(languageDirectory, 'spanish.ts');
const theRussianCatalogue = join(languageDirectory, 'russian.ts');

/** How many languages Emi is written in, which is how many catalogues the scan must find. */
const theLanguagesEmiIsWrittenIn = 3;

/** Every catalogue holds the same keys, and there are more of them than anybody would list. */
const theKeysACatalogueHolds = 100;

function read(file: string): string {
  return readFileSync(join(repositoryRoot, file), 'utf8');
}

// Every example below is taken from the lists themselves rather than written out, so a reader can
// see that the wording refused is the wording the module holds and not a second copy of it.
function theWording(beginning: string): string {
  const found = sampleWording.find((wording) => wording.startsWith(beginning));

  if (found === undefined) {
    throw new Error(`no sample wording starts with "${beginning}"`);
  }

  return found;
}

function theDenialSaying(beginning: string): string {
  const found = approvedDenials.find((sentence) => sentence.startsWith(beginning));

  if (found === undefined) {
    throw new Error(`no approved denial starts with "${beginning}"`);
  }

  return found;
}

const theEnglishForASample = theWording('sample');
const theSpanishForAnExample = theWording('ejemplo');
const theRussianForAnExample = theWording('пример');
const theEnglishDenial = theDenialSaying('Emi draws nothing');

function aCatalogueSaying(forms: readonly string[]): Catalogue {
  return { file: theEnglishCatalogue, keys: [{ forms, key: 'home.trend.caption' }] };
}

describe('no screen labels anything on it as a sample', () => {
  describe('the catalogues as they stand today', () => {
    const files = catalogueFilesOf(repositoryRoot);
    const found = samplesUnder(repositoryRoot, files);

    it('label nothing as a sample, and say how many keys were read', () => {
      expect(found.problems).toEqual([]);
      expect(found.cataloguesRead).toBe(theLanguagesEmiIsWrittenIn);
      expect(found.keysRead).toBeGreaterThan(theKeysACatalogueHolds * theLanguagesEmiIsWrittenIn);
    });

    it('are found by reading the directory, so a fourth language joins the scan on its own', () => {
      expect(files).toEqual([theEnglishCatalogue, theRussianCatalogue, theSpanishCatalogue]);
    });

    it('leave the lookup and the language reader out, because neither holds a word she reads', () => {
      expect(files).not.toContain(join(languageDirectory, 'words.ts'));
      expect(files).not.toContain(join(languageDirectory, 'language.ts'));
      expect(files).not.toContain(join(languageDirectory, 'index.ts'));
    });

    it('hold the same keys in all three, and every form of a key whose words change by number', () => {
      const keys = files.map((file) => catalogueIn(file, read(file)).keys.length);

      expect(keys).toEqual([keys[0], keys[0], keys[0]]);
      expect(found.formsRead).toBeGreaterThan(found.keysRead);
    });
  });

  describe('a word put into a catalogue', () => {
    it('is refused in English, and the file, the key and the words are named', () => {
      const said = `These are ${theEnglishForASample} cycles.`;
      const [described] = samplesIn(aCatalogueSaying([said])).map(describeSample);

      expect(described).toContain(theEnglishCatalogue);
      expect(described).toContain('home.trend.caption');
      expect(described).toContain(theEnglishForASample);
      expect(described).toContain(said);
    });

    it('is refused in Spanish and in Russian too, because a label is a label in any language', () => {
      expect(samplesIn(aCatalogueSaying([`Datos de ${theSpanishForAnExample}`]))).toHaveLength(1);
      expect(samplesIn(aCatalogueSaying([`${theRussianForAnExample} цикла`]))).toHaveLength(1);
    });

    it('is refused inside one form of a key whose words change with the number', () => {
      expect(
        samplesIn(aCatalogueSaying(['1 cycle', `${theEnglishForASample} cycles`])),
      ).toHaveLength(1);
    });
  });

  describe('what is not a label', () => {
    it('leaves the Russian word for approximately alone, which carries example inside it', () => {
      const approximately = 'Менструация, день 2 из примерно 29';

      expect(samplesIn(aCatalogueSaying([approximately]))).toEqual([]);
      expect(read(theRussianCatalogue)).toContain('примерно');
    });

    it('leaves the Spanish word for shows alone, which is also the Spanish for a sample', () => {
      const shows = 'Emi te muestra lo que dicen tus propios registros.';

      expect(samplesIn(aCatalogueSaying([shows]))).toEqual([]);
      expect(samplesIn(aCatalogueSaying(['Datos de muestra']))).toHaveLength(1);
    });
  });

  describe('the sentences that deny it', () => {
    it('are allowed, because each one says Emi holds no such data rather than labelling any', () => {
      expect(samplesIn(aCatalogueSaying([theEnglishDenial]))).toEqual([]);
    });

    it('are each a sentence a catalogue actually says, so a stale one cannot sit on the list', () => {
      const everyWord = catalogueFilesOf(repositoryRoot)
        .flatMap((file) => catalogueIn(file, read(file)).keys)
        .flatMap((held) => held.forms);

      for (const denial of approvedDenials) {
        expect(everyWord).toContain(denial);
      }

      expect(approvedDenials).toHaveLength(theLanguagesEmiIsWrittenIn);
    });

    it('are each needed, so the catalogues fail once for every language when the list goes', () => {
      const files = catalogueFilesOf(repositoryRoot);
      const without = files.flatMap((file) => samplesIn(catalogueIn(file, read(file)), []));

      expect(without).toHaveLength(theLanguagesEmiIsWrittenIn);
      expect(without.map((sample) => sample.key)).toEqual([
        'home.waiting.trend.read',
        'home.waiting.trend.read',
        'home.waiting.trend.read',
      ]);
    });

    it('count only where one opens a sentence, so a quotation of one is read like any other', () => {
      const quoted = `Remember that ${theEnglishDenial}`;

      expect(samplesIn(aCatalogueSaying([quoted]))).toHaveLength(1);
      expect(samplesIn(aCatalogueSaying([`Your cycles. ${theEnglishDenial}`]))).toEqual([]);
    });
  });

  describe('the trap this check is written against', () => {
    it('refuses a run that read no catalogue, because reading nothing finds nothing', () => {
      const nothing = samplesUnder(repositoryRoot, []);

      expect(nothing.problems).toEqual([]);
      expect(nothing.cataloguesRead).toBe(0);
      expect(nothing.keysRead).toBe(0);
    });

    it('reads no key out of a file of the language directory that holds no catalogue', () => {
      expect(catalogueIn('words.ts', read(join(languageDirectory, 'words.ts'))).keys).toEqual([]);
    });
  });
});
