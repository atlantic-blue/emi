import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

/**
 * The wording Emi may never use about itself, in every language it is written in. Each entry is
 * matched without regard to case, over text whose whitespace has been collapsed, so a phrase still
 * matches when a document wraps it across two lines.
 *
 * One list rather than one per language, because a claim is a claim wherever it is written and a
 * file is never asked which language it is in. A Spanish sentence is held to the Spanish entries
 * and to the English ones at the same time.
 */
export const forbiddenWording: readonly string[] = [
  'contraception',
  'contraceptive',
  'birth control',
  'prevent pregnancy',
  'prevents pregnancy',
  'preventing pregnancy',
  'achieve pregnancy',
  'safe day',
  'safe days',
  'certified',
  'certification',
  'medical device',
  'medically approved',
  'clinically proven',
  'doctor approved',
  'health insurance portability and accountability act',
  'hipaa',
  'iso 27001',
  'soc 2',
  'hitrust',
  'fda cleared',
  'fda approved',
  'ce marked',
  'gdpr compliant',
  // Spanish. A plural and a feminine ending are caught by the search, which matches a substring.
  'anticoncepcion',
  'anticoncepción',
  'anticonceptiv',
  'control de natalidad',
  'prevenir el embarazo',
  'previene el embarazo',
  'evitar el embarazo',
  'lograr el embarazo',
  'conseguir el embarazo',
  'dia seguro',
  'día seguro',
  'dias seguros',
  'días seguros',
  'certificad',
  'dispositivo medico',
  'dispositivo médico',
  'aprobado medicamente',
  'aprobado médicamente',
  'clinicamente probado',
  'clínicamente probado',
  'aprobado por un medico',
  'aprobado por un médico',
  // Russian. Every entry is a stem rather than a word, because a Russian noun changes its ending
  // with its case and a search for one ending would miss the other five. Cyrillic is matched here
  // rather than on the whole word list below, because a word boundary is written for the Latin
  // alphabet and asserts nothing between two Cyrillic letters.
  'контрацепт',
  'контрацепц',
  'противозачаточ',
  'предотвращает беременность',
  'предотвратить беременность',
  'наступление беременности',
  'безопасный день',
  'безопасные дни',
  'безопасных дней',
  'безопасный',
  'безопасная',
  'безопасное',
  'безопасные',
  'безопасных',
  'защищена',
  'защищён',
  'защищен',
  'защита',
  'сертифицирован',
  'сертификац',
  'медицинск',
  'издели',
  'одобрено врачом',
  'клинически доказан',
];

/**
 * The wording the interface may never use, on top of the list above. A document has room to explain
 * what a fertile window is and reaches for these words to do it. A screen has no room, so a woman
 * reads the word on its own and takes it as the claim Emi does not make. They are refused in the
 * application and in the store listing, and allowed in a document that argues.
 */
export const interfaceOnlyWording: readonly string[] = [
  'safe',
  'protected',
  'protection',
  // Spanish. Each ending is named, because these are matched as whole words rather than as a
  // substring, so that an ordinary name built around one survives.
  'segura',
  'seguras',
  'seguro',
  'seguros',
  'protegida',
  'protegidas',
  'protegido',
  'protegidos',
  'proteccion',
  'protección',
];

/** What a screen and a store listing are held to: the list above, and the three words beside it. */
export const interfaceWording: readonly string[] = [...forbiddenWording, ...interfaceOnlyWording];

/**
 * The only sentences that may carry the wording above, because each one denies the claim rather
 * than making it. A sentence is removed from the text before the search runs, so anything else
 * built from the same words is still found. Adding a line here is a deliberate act a reviewer sees.
 */
export const approvedDenials: readonly string[] = [
  'Emi is not a contraceptive.',
  'Emi is not a medical device.',
  'Emi makes no claim to prevent or achieve a pregnancy, and it carries no certification badge that an auditor did not sign.',
  'Emi never says a day is safe, because no day is.',
  'No auditor has looked at Emi, so no standard is named here and no certification badge appears anywhere in the product.',
  // Spanish, word for word as the catalogue writes them.
  'Emi no es un anticonceptivo.',
  'Emi no es un dispositivo médico.',
  'Emi nunca dice que un día es seguro, porque ninguno lo es.',
  // Russian, word for word as the catalogue writes them.
  'Emi не является средством контрацепции.',
  'Emi не является медицинским изделием.',
  'Emi никогда не говорит, что день безопасный, потому что безопасных дней нет.',
];

/** The files the scan reads. An extension nobody can read as text is left out. */
export const scannedExtensions: readonly string[] = [
  '.md',
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
  '.txt',
];

/**
 * The two files that hold the wording itself. Everything else in the repository is scanned,
 * including this module's own test, so the list cannot quietly grow.
 */
export const unscannedFiles: readonly string[] = [
  'tools/pipeline/forbiddenClaims.ts',
  'package-lock.json',
];

export interface Claim {
  readonly file: string;
  readonly wording: string;
  readonly context: string;
}

function collapsed(text: string): string {
  return text.replace(/\s+/g, ' ');
}

/**
 * A denial only counts where it begins a sentence. A quotation that wraps one in other words is not
 * the approved sentence, so it is left in the text and found like any other claim.
 */
function withoutDenials(text: string, denials: readonly string[]): string {
  let cleaned = text;

  for (const denial of denials) {
    const sentence = collapsed(denial);

    for (let at = cleaned.indexOf(sentence); at >= 0; at = cleaned.indexOf(sentence, at + 1)) {
      const previous = cleaned.slice(0, at).trimEnd().slice(-1);

      if (previous === '' || previous === '.' || previous === '!' || previous === '?') {
        cleaned = `${cleaned.slice(0, at)} ${cleaned.slice(at + sentence.length)}`;
      }
    }
  }

  return cleaned;
}

/**
 * The text a search runs over: one space between words, so a phrase still matches where a document
 * wrapped it across two lines, and every approved denial taken out.
 */
export function searchableText(
  contents: string,
  denials: readonly string[] = approvedDenials,
): string {
  return withoutDenials(collapsed(contents), denials);
}

export function claimsIn(
  file: string,
  contents: string,
  denials: readonly string[] = approvedDenials,
  searchFor: readonly string[] = forbiddenWording,
): Claim[] {
  const text = searchableText(contents, denials);
  const searchable = text.toLowerCase();
  const found: Claim[] = [];

  for (const wording of searchFor) {
    const at = searchable.indexOf(wording.toLowerCase());

    if (at < 0) {
      continue;
    }

    found.push({
      file,
      wording,
      context: text.slice(Math.max(0, at - 40), at + wording.length + 40).trim(),
    });
  }

  return found;
}

export function describeClaim(claim: Claim): string {
  return `${claim.file} says "${claim.wording}" in: ${claim.context}`;
}

export function scannableFilesOf(root: string): string[] {
  const listed = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
  });

  if (listed.status !== 0) {
    throw new Error(`git could not list the files in ${root}: ${listed.stderr}`);
  }

  return listed.stdout
    .split('\n')
    .filter((file) => file.length > 0)
    .filter((file) => scannedExtensions.includes(extname(file)))
    .filter((file) => !unscannedFiles.includes(file))
    .sort();
}

export function claimsUnder(root: string, files: string[]): Claim[] {
  return files.flatMap((file) => claimsIn(file, readFileSync(join(root, file), 'utf8')));
}
