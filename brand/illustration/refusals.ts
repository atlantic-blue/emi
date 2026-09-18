/**
 * The five subjects the illustration style refuses, and the scan that holds it to them.
 *
 * A picture of a body, a face, a flower, a droplet or blood tells a stranger at arm's length what
 * the application is. The whole design rests on that person learning nothing, so these five are
 * refused in the drawing and in the name of the file that carries it.
 *
 * This file names the words on purpose, so the scan below never reads it. Only a drawing is read.
 */

export interface RefusedSubject {
  /** The subject, as the design names it. */
  readonly subject: string;
  /** Why a drawing of it is refused, in one sentence. */
  readonly reason: string;
  /** Every word that carries the subject, in any case and in any joined form. */
  readonly words: readonly string[];
}

export const refusedSubjects: readonly RefusedSubject[] = [
  {
    subject: 'a body',
    reason: 'a torso or a belly on the screen names the subject to anybody standing behind her',
    words: [
      'body',
      'bodies',
      'torso',
      'belly',
      'abdomen',
      'waist',
      'hip',
      'hips',
      'pelvis',
      'womb',
      'uterus',
      'ovary',
      'ovaries',
      'silhouette',
      'nude',
    ],
  },
  {
    subject: 'a face',
    reason:
      'a face is read before anything else on a screen, and it reads as a mood she did not report',
    words: ['face', 'faces', 'facial', 'eye', 'eyes', 'mouth', 'smile', 'nose', 'portrait', 'head'],
  },
  {
    subject: 'a flower',
    reason: 'the category uses a flower as a stand in for the subject, which fools nobody',
    words: [
      'flower',
      'flowers',
      'floral',
      'petal',
      'petals',
      'blossom',
      'bloom',
      'leaf',
      'leaves',
      'vine',
      'stem',
    ],
  },
  {
    subject: 'a droplet',
    reason: 'a droplet is the clearest picture of the subject the category draws',
    words: ['droplet', 'droplets', 'drop', 'drops', 'teardrop', 'drip', 'dribble'],
  },
  {
    subject: 'blood',
    reason: 'the subject itself, drawn',
    words: ['blood', 'bloody', 'bleed', 'bleeds', 'bleeding', 'bled', 'menstrual', 'menstruation'],
  },
];

export interface Offence {
  /** The drawing the word was found in. */
  readonly file: string;
  /** The line it sits on, or `the file name` when the name itself carries it. */
  readonly where: string;
  readonly subject: string;
  readonly word: string;
}

const subjectOf: ReadonlyMap<string, string> = new Map(
  refusedSubjects.flatMap((refused) => refused.words.map((word) => [word, refused.subject])),
);

/**
 * The words in a piece of text, with a joined name taken apart: `bloodDrop`, `blood-drop` and
 * `blood_drop` all read as two words, because a layer name hides a subject in exactly that way.
 */
export function wordsIn(text: string): readonly string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter((word) => word.length > 0);
}

function offencesIn(file: string, where: string, text: string): readonly Offence[] {
  const found: Offence[] = [];
  for (const word of wordsIn(text)) {
    const subject = subjectOf.get(word);
    if (subject !== undefined) {
      found.push({ file, where, subject, word });
    }
  }
  return found;
}

/**
 * Every refused subject a drawing carries, in its name and in every line of its source. An empty
 * list is a drawing that may ship.
 */
export function refusalsIn(file: string, source: string): readonly Offence[] {
  return [
    ...offencesIn(file, 'the file name', file),
    ...source.split('\n').flatMap((line, index) => offencesIn(file, `line ${index + 1}`, line)),
  ];
}

/** What a refusal says out loud, so the failure names the drawing, the word and the reason. */
export function sentenceFor(offence: Offence): string {
  const refused = refusedSubjects.find((subject) => subject.subject === offence.subject);

  return (
    `${offence.file} carries ${offence.subject} as the word "${offence.word}" on ${offence.where}. ` +
    `Emi refuses ${offence.subject}, because ${refused?.reason ?? 'the design refuses it'}.`
  );
}
