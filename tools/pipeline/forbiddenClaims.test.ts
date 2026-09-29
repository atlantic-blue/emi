import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  envelopeVersion,
  headerLength,
  nonceLength,
  tagLength,
} from '../../packages/crypto/src/envelope';
import { diagramsIn, statusProblems } from './documentation';
import {
  approvedDenials,
  claimsIn,
  claimsUnder,
  describeClaim,
  forbiddenWording,
  scannableFilesOf,
  unscannedFiles,
} from './forbiddenClaims';
import {
  acceptedAttacks,
  articleRowHolds,
  articleRowNoLongerHolds,
  articleRowProblems,
  designKeys,
  keyHeading,
  keyProblems,
  openingUnder,
  plainHeading,
  plainValueProblems,
  plainValues,
  privacyDocument,
  refusalHeading,
  refusalProblems,
  subsectionsUnder,
} from './privacyDocument';

const repositoryRoot = resolve(__dirname, '..', '..');

function read(file: string): string {
  return readFileSync(join(repositoryRoot, file), 'utf8');
}

const privacy = read(privacyDocument);

// Every example below is taken from the lists themselves rather than written out, so this file
// holds no claim of its own and the repository wide scan can read it with everything else.
function anExampleStartingWith(beginning: string): string {
  const found = forbiddenWording.find((wording) => wording.startsWith(beginning));

  if (found === undefined) {
    throw new Error(`no forbidden wording starts with "${beginning}"`);
  }

  return found;
}

function theDenialStartingWith(beginning: string): string {
  const found = approvedDenials.find((sentence) => sentence.startsWith(beginning));

  if (found === undefined) {
    throw new Error(`no approved denial starts with "${beginning}"`);
  }

  return found;
}

function theFirst(list: readonly string[], what: string): string {
  const [item] = list;

  if (item === undefined) {
    throw new Error(`the design lists no ${what}`);
  }

  return item;
}

const aPregnancyClaim = anExampleStartingWith('contracept');
const aStandardNobodyAudited = anExampleStartingWith('iso');
const aBadgeClaim = anExampleStartingWith('certif');
const aSafeDayClaim = anExampleStartingWith('safe d');
const aDenial = theDenialStartingWith('Emi is not a');
const aKey = theFirst(designKeys, 'key');
const anAttack = theFirst(acceptedAttacks, 'attack');
const aPlainValue = theFirst(plainValues, 'plain value');

describe(`a ${aPregnancyClaim} claim anywhere in the repository fails the pipeline`, () => {
  const scanned = scannableFilesOf(repositoryRoot);

  it('finds no forbidden wording in the repository today, and says how much it read', () => {
    expect(claimsUnder(repositoryRoot, scanned).map(describeClaim)).toEqual([]);
    expect(scanned.length).toBeGreaterThan(30);
  });

  it('reads the documents, the application and the store listing copy alike', () => {
    expect(scanned).toContain(privacyDocument);
    expect(scanned).toContain('docs/architecture.md');
    expect(scanned).toContain('README.md');
    expect(scanned).toContain('apps/mobile/src/app/(tabs)/index.tsx');
    expect(scanned).toContain('apps/mobile/app.json');

    // The store listing copy is written in feature 7 and lands in docs as markdown, so it joins
    // the scan on the day it arrives rather than needing this list changed.
    expect(scanned.filter((file) => file.endsWith('.md')).length).toBeGreaterThan(2);
  });

  it('leaves out only the module that holds the wording, and the lock file', () => {
    expect(unscannedFiles).toEqual(['tools/pipeline/forbiddenClaims.ts', 'package-lock.json']);
    expect(scanned).toContain('tools/pipeline/forbiddenClaims.test.ts');
  });

  it('refuses the claim in a document, and names the file and the words', () => {
    const document = `# Emi\n\nEmi is a ${aPregnancyClaim} she can trust.\n`;
    const [described] = claimsIn(privacyDocument, document).map(describeClaim);

    expect(described).toContain(privacyDocument);
    expect(described).toContain(aPregnancyClaim);
    expect(described).toContain('she can trust');
  });

  it('accepts the same document once the claim comes out', () => {
    const document = '# Emi\n\nEmi records the days she gives it and predicts the next one.\n';

    expect(claimsIn(privacyDocument, document)).toEqual([]);
  });

  it('refuses a claim in a string in the application', () => {
    const screen = `export const title = 'Your ${aSafeDayClaim} this month';\n`;

    expect(claimsIn('apps/mobile/src/app/index.tsx', screen)).toHaveLength(1);
  });

  it('refuses a phrase a document wrapped across two lines', () => {
    const phrase = anExampleStartingWith('birth');
    const [first, second] = phrase.split(' ');
    const wrapped = `Emi is not a method of ${first}\n${second} and it never was.\n`;

    expect(claimsIn(privacyDocument, wrapped).map((claim) => claim.wording)).toEqual([phrase]);
  });

  it('refuses the name of a standard nobody has audited, whatever the case', () => {
    const boast = `Emi is ${aStandardNobodyAudited.toUpperCase()} and proud of it.\n`;

    expect(claimsIn(privacyDocument, boast)).toHaveLength(1);
  });

  it('refuses a badge nobody signed', () => {
    expect(claimsIn(privacyDocument, `Emi is ${aBadgeClaim}.\n`)).toHaveLength(1);
  });

  it('allows a sentence that denies the claim', () => {
    expect(claimsIn(privacyDocument, `${aDenial}\n`)).toEqual([]);
  });

  it('refuses the same sentence with the denial taken out of it', () => {
    const asserted = aDenial.replace(' not ', ' ');

    expect(asserted).not.toEqual(aDenial);
    expect(claimsIn(privacyDocument, `${asserted}\n`)).toHaveLength(1);
  });

  it('allows a denial where it starts a sentence, and refuses it wrapped in other words', () => {
    expect(claimsIn(privacyDocument, `Read this. ${aDenial}\n`)).toEqual([]);
    expect(claimsIn(privacyDocument, `Somebody said ${aDenial}\n`)).toHaveLength(1);
  });

  it('reports every different claim a file makes, not only the first', () => {
    const many = `Emi is ${aBadgeClaim}, ${aStandardNobodyAudited} and a ${aPregnancyClaim}.\n`;

    expect(claimsIn(privacyDocument, many).map((claim) => claim.wording)).toEqual([
      aPregnancyClaim,
      aBadgeClaim,
      aStandardNobodyAudited,
    ]);
  });

  // A sentence is only approved because it denies the claim its words would otherwise make, and it
  // denies it in the language it is written in. Spanish denies with nunca and with ninguno, and
  // Russian denies with не, where English denies with not and with no.
  const negating = [' not ', ' no ', ' nunca ', ' ningun', ' ningún', ' не '];

  it('carries no approved sentence that denies nothing, in either language', () => {
    const asserting = approvedDenials.filter(
      (sentence) => !negating.some((word) => sentence.toLowerCase().includes(word)),
    );

    expect(asserting).toEqual([]);
    expect(approvedDenials.filter((sentence) => sentence.startsWith('Emi no '))).toHaveLength(2);
  });
});

describe('the privacy document names a defence for every key the design has', () => {
  it('names every key of the design, and nothing the design does not have', () => {
    const named = subsectionsUnder(privacy, keyHeading).map((subsection) => subsection.title);

    expect(named).toEqual([...designKeys]);
  });

  it('says where each key lives and what defends it', () => {
    expect(keyProblems(privacy)).toEqual([]);
  });

  it('refuses a document that drops a key', () => {
    const short = [
      `## ${keyHeading}`,
      '',
      `### ${aKey}`,
      '',
      'Lives: the keychain on the phone, as one item.',
      '',
      'Defence: it is never transmitted anywhere.',
      '',
    ].join('\n');

    expect(keyProblems(short)).toEqual(
      designKeys.slice(1).map((key) => `${privacyDocument} has no "${key}" under "${keyHeading}"`),
    );
  });

  it('refuses a key whose defence line says nothing', () => {
    const thin = [
      `## ${keyHeading}`,
      '',
      `### ${aKey}`,
      '',
      'Lives: the keychain on the phone, as one item.',
      '',
      'Defence: none.',
      '',
    ].join('\n');

    expect(keyProblems(thin, [aKey])).toEqual([
      `${privacyDocument}: "${aKey}" carries no defence line that says anything`,
    ]);
  });

  it('refuses a key the design does not have', () => {
    const invented = [
      `## ${keyHeading}`,
      '',
      '### The spare key',
      '',
      'Lives: under the doormat, where anybody can find it.',
      '',
      'Defence: nobody looks under a doormat these days.',
      '',
    ].join('\n');

    expect(keyProblems(invented, [])).toEqual([
      `${privacyDocument} names "The spare key" under "${keyHeading}", and nothing asked for it`,
    ]);
  });

  it('does not read a heading inside a fenced block as a key', () => {
    const fenced = [`## ${keyHeading}`, '', '```', '### The spare key', '```', ''].join('\n');

    expect(subsectionsUnder(fenced, keyHeading)).toEqual([]);
  });

  it('names the four attacks it does not defend against, each with what she can do', () => {
    const named = subsectionsUnder(privacy, refusalHeading).map((subsection) => subsection.title);

    expect(named).toEqual([...acceptedAttacks]);
    expect(named).toHaveLength(4);
    expect(refusalProblems(privacy)).toEqual([]);
  });

  it('refuses a refusal that does not say what to do about it', () => {
    const silent = [
      `## ${refusalHeading}`,
      '',
      `### ${anAttack}`,
      '',
      'The days are gone and nobody can bring them back.',
      '',
    ].join('\n');

    expect(refusalProblems(silent, [anAttack])).toEqual([
      `${privacyDocument}: "${anAttack}" carries no what to do line that says anything`,
    ]);
  });

  it('marks every section built or designed, and draws the keys once', () => {
    expect(statusProblems(privacyDocument, privacy)).toEqual([]);
    expect(diagramsIn(privacy)).toHaveLength(1);
  });

  it('takes the envelope figures from the package rather than from a memory', () => {
    const version = envelopeVersion.toString(16).padStart(2, '0');

    expect(privacy).toContain(`the format version, \`0x${version}\``);
    expect(privacy).toContain(`${nonceLength} bytes, a random nonce`);
    expect(privacy).toContain(`its ${tagLength} byte authentication tag`);
    expect(privacy).toContain(`costs ${headerLength + tagLength} bytes on top of the`);
  });

  it('is named in the documents index', () => {
    expect(read('docs/README.md')).toContain('privacy.md');
  });
});

describe('the privacy document names every value the phone keeps in the clear', () => {
  it('carries the section, and names every plain value the check carries', () => {
    const named = subsectionsUnder(privacy, plainHeading).map((subsection) => subsection.title);

    expect(privacy).toContain(`## ${plainHeading}`);
    expect(named).toEqual([...plainValues]);
  });

  it('lists as many values as the check carries, and no seventh', () => {
    expect(subsectionsUnder(privacy, plainHeading)).toHaveLength(plainValues.length);
    expect(plainValues).toHaveLength(6);
  });

  it('says where each value lives and what a reader of the file learns from it', () => {
    expect(plainValueProblems(privacy)).toEqual([]);
  });

  it('says what that reader does not learn, which is anything she wrote on a day', () => {
    const [section] = subsectionsUnder(privacy, plainHeading);
    const opening = privacy.slice(
      privacy.indexOf(`## ${plainHeading}`),
      privacy.indexOf(`### ${section?.title ?? ''}`),
    );

    expect(opening).toContain('learns nothing she wrote on a day');
  });

  it('refuses a document that drops a value, and names the one it dropped', () => {
    const short = [
      `## ${plainHeading}`,
      '',
      `### ${aPlainValue}`,
      '',
      'Lives: the `day` column of `day_log`, as one date for each row.',
      '',
      'What a reader learns: which days she recorded something on, and nothing more.',
      '',
    ].join('\n');

    expect(plainValueProblems(short)).toEqual(
      plainValues
        .slice(1)
        .map((value) => `${privacyDocument} has no "${value}" under "${plainHeading}"`),
    );
  });

  it('refuses a value whose learns line says nothing', () => {
    const thin = [
      `## ${plainHeading}`,
      '',
      `### ${aPlainValue}`,
      '',
      'Lives: the `day` column of `day_log`, as one date for each row.',
      '',
      'What a reader learns: little.',
      '',
    ].join('\n');

    expect(plainValueProblems(thin, [aPlainValue])).toEqual([
      `${privacyDocument}: "${aPlainValue}" carries no what a reader learns line that says anything`,
    ]);
  });

  it('refuses a value the check does not carry', () => {
    const invented = [
      `## ${plainHeading}`,
      '',
      '### Her name',
      '',
      'Lives: the setting table, where nothing about her body may be written.',
      '',
      'What a reader learns: what she is called, which the phone has no reason to hold.',
      '',
    ].join('\n');

    expect(plainValueProblems(invented, [])).toEqual([
      `${privacyDocument} names "Her name" under "${plainHeading}", and nothing asked for it`,
    ]);
  });
});

describe('the privacy document says what the article row of the setting table holds', () => {
  it('says it holds the article identifier and the instant, and nothing else', () => {
    expect(articleRowProblems(privacy)).toEqual([]);
    expect(privacy).toContain(articleRowHolds);
  });

  it('no longer says that row records a cycle phase', () => {
    expect(privacy).not.toContain(articleRowNoLongerHolds);
  });

  it('refuses a document that still says the row records a phase, and names the sentence', () => {
    const stale = [
      `## ${plainHeading}`,
      '',
      `The sixth remembers which article she was last shown, and today it also ${articleRowNoLongerHolds} Emi placed her in.`,
      '',
      `### ${aPlainValue}`,
      '',
    ].join('\n');

    expect(articleRowProblems(stale)).toEqual([
      `${privacyDocument} does not say the article row holds it "${articleRowHolds}"`,
      `${privacyDocument} still says the article row "${articleRowNoLongerHolds}", and a launch takes it off`,
    ]);
  });

  it('reads the opening of the section and not the values under it', () => {
    expect(openingUnder(privacy, plainHeading)).not.toContain(`### ${aPlainValue}`);
    expect(openingUnder(privacy, 'a heading no document carries')).toBe('');
  });
});
