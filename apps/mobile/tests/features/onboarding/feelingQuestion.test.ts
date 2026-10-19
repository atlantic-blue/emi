import { firstRunCopy } from '../../../src/features/onboarding/copy';
import { english } from '../../../src/language/english';
import { russian } from '../../../src/language/russian';
import { spanish } from '../../../src/language/spanish';

/**
 * Issue 326: the feeling question names her period, and its line says what the answer changes.
 * Only "It is hard" changes anything: the home screen reads it on her period days and offers the
 * pain log first (painLine.ts). The other two answers change nothing, so the line names only that one.
 */

const theQuestion = 'onboarding.feeling.title';
const theLine = 'onboarding.feeling.line.hard';

describe('the feeling question', () => {
  it.each([
    [
      'English',
      english,
      'How do you usually feel during your period?',
      'If it is hard, Emi puts pain first on your period days.',
    ],
    [
      'Spanish',
      spanish,
      '¿Cómo te sientes normalmente durante tu periodo?',
      'Si es difícil, Emi pone el dolor primero en los días de tu periodo.',
    ],
    [
      'Russian',
      russian,
      'Как вы обычно себя чувствуете во время месячных?',
      'Если тяжело, в дни месячных Emi начнёт с боли.',
    ],
  ] as const)(
    'should ask about her period in %s and say what It is hard changes',
    (_language, catalogue, question, line) => {
      expect(catalogue[theQuestion]).toBe(question);
      expect(catalogue[theLine]).toBe(line);
    },
  );

  it.each([
    [
      'English',
      english,
      'How you feel about it',
      'This changes how Emi talks to you, and nothing else.',
    ],
    ['Spanish', spanish, 'Cómo te sientes con ello', 'Esto cambia cómo te habla Emi, y nada más.'],
    [
      'Russian',
      russian,
      'Как вы к этому относитесь',
      'Это меняет только то, как Emi с вами говорит.',
    ],
  ] as const)(
    'should no longer carry the old question or the old line in %s',
    (_language, catalogue, oldQuestion, oldLine) => {
      expect('onboarding.feeling.line.talks' in catalogue).toBe(false);
      expect(catalogue[theQuestion]).not.toBe(oldQuestion);
      expect(Object.values(catalogue)).not.toContain(oldLine);
    },
  );

  it('should draw the new line under the question, before the privacy note', () => {
    expect(firstRunCopy.feeling.title).toBe(english[theQuestion]);
    expect(firstRunCopy.feeling.lines[0]).toBe(english[theLine]);
  });
});
