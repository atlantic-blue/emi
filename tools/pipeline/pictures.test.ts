import { resolve } from 'node:path';

import {
  comparedIn,
  countProblems,
  drawingsIn,
  LEDGER_VARIABLE,
  pictureDirectory,
  pictureFilesOf,
  pictureProblems,
  pictureSuffix,
  uncomparedProblems,
} from './pictures';

const repositoryRoot = resolve(__dirname, '..', '..');

describe('every picture the repository holds is compared, and the count says how many', () => {
  const found = pictureFilesOf(repositoryRoot);
  const drawings = drawingsIn(repositoryRoot);

  describe('what is on disk', () => {
    it('finds a picture file for every picture, and says how many it read', () => {
      expect(found.length).toBeGreaterThan(5);
      expect(found.every((file) => file.endsWith(pictureSuffix))).toBe(true);
      expect(drawings.drawn).toHaveLength(found.length);
    });

    it('finds the markup beside every picture, so each one can be read back', () => {
      expect(uncomparedProblems(drawings)).toEqual([]);
      expect(drawings.markup).toEqual(drawings.drawn);
    });
  });

  describe('the count is the check', () => {
    it('refuses a run that compared fewer pictures than there are picture files', () => {
      const [said] = countProblems(['one.picture.tsx', 'two.picture.tsx'], ['one']);

      expect(said).toContain('compared 1 picture(s)');
      expect(said).toContain('2 picture file(s)');
      expect(said).toContain('1 of them drew without comparing');
      expect(said).toContain(pictureDirectory);
    });

    it('refuses a run that compared nothing, because a run that read nothing proves nothing', () => {
      const [said] = countProblems(['one.picture.tsx'], []);

      expect(said).toContain('compared no picture at all');
    });

    it('accepts a run that compared every one of them', () => {
      expect(countProblems(['one.picture.tsx', 'two.picture.tsx'], ['one', 'two'])).toEqual([]);
    });

    it('stops a thirteenth picture that nothing compares', () => {
      const twelve = Array.from({ length: 12 }, (_unused, at) => `${at}${pictureSuffix}`);
      const compared = twelve.slice(0, 12).map((_unused, at) => String(at));

      expect(countProblems(twelve, compared)).toEqual([]);
      expect(countProblems([...twelve, `thirteenth${pictureSuffix}`], compared)).toHaveLength(1);
    });
  });

  describe('a picture with no markup beside it', () => {
    it('is named, because nothing reads it back', () => {
      const [said] = uncomparedProblems({ drawn: ['history', 'welcome'], markup: ['welcome'] });

      expect(said).toContain('brand/screens/history.png');
      expect(said).toContain('brand/screens/history.html');
      expect(said).toContain('drawn and never read back');
    });

    it('names every one of them and not only the first', () => {
      const problems = uncomparedProblems({
        drawn: ['delete-everything', 'history', 'onboarding', 'welcome'],
        markup: ['welcome'],
      });

      expect(problems).toHaveLength(3);
    });
  });

  describe('the ledger, which is what a comparison leaves behind', () => {
    it('reads one name for each line, in order, and ignores the empty ones', () => {
      expect(comparedIn('welcome\nhistory\n\n  lock  \n')).toEqual(['history', 'lock', 'welcome']);
    });

    it('reads an unwritten ledger as no comparison at all', () => {
      expect(comparedIn('')).toEqual([]);
    });

    it('is asked for by name, so a run that sets nothing writes nothing', () => {
      expect(LEDGER_VARIABLE).toBe('EMI_PICTURE_LEDGER');
    });
  });

  describe('what the check says when it passes', () => {
    it('names the count it compared and the count it found', () => {
      const said = pictureProblems(['one.picture.tsx'], ['one'], {
        drawn: ['one'],
        markup: ['one'],
      }).said;

      expect(said).toContain('1 picture(s) compared against 1 picture file(s)');
      expect(said).toContain('every picture carries the markup it was drawn from');
    });

    it('says the counts and no promise when it fails', () => {
      const checked = pictureProblems(['one.picture.tsx', 'two.picture.tsx'], ['one'], {
        drawn: ['one', 'two'],
        markup: ['one'],
      });

      expect(checked.problems).toHaveLength(2);
      expect(checked.said).not.toContain('every picture carries');
    });
  });
});
