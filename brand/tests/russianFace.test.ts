import { applicationFontFiles, russianStandIns } from '@emi/tokens';

import { screenDocument } from '../screens/asHtml.ts';

/**
 * Figtree has no Cyrillic letters. In Russian the phone registers a Mulish cut under each Figtree
 * name, so a Russian picture must declare the same files under the same names, or the browser picks
 * a face of its own and the widths in the picture are not the widths on the phone.
 */

const size = { width: 375, height: 667 };

function declared(page: string): ReadonlyMap<string, string> {
  const faces = new Map<string, string>();

  for (const match of page.matchAll(/font-family: '([^']+)'; src: url\('([^']+)'\)/g)) {
    faces.set(match[1] ?? '', match[2] ?? '');
  }

  return faces;
}

describe('the faces a picture declares', () => {
  describe('in Russian', () => {
    const faces = declared(screenDocument([], '', { size, language: 'ru' }));

    it.each(Object.entries(russianStandIns))(
      'declares %s with the Mulish file the phone loads under that name',
      (name, file) => {
        expect(faces.get(name)).toBe(`../../apps/mobile/assets/fonts/${file.path}`);
      },
    );

    it('keeps the faces that have no stand in, so the recovery code is drawn as it ships', () => {
      const kept = applicationFontFiles.filter((file) => russianStandIns[file.name] === undefined);

      expect(kept.length).toBeGreaterThan(0);
      for (const file of kept) {
        expect(faces.get(file.name)).toBe(`../../apps/mobile/assets/fonts/${file.path}`);
      }
    });

    it('declares each registered name once', () => {
      expect([...faces.keys()]).toEqual(applicationFontFiles.map((file) => file.name));
    });
  });

  describe.each(['en', 'es'] as const)('in %s', (language) => {
    it('declares each name with its own file', () => {
      const faces = declared(screenDocument([], '', { size, language }));

      for (const file of applicationFontFiles) {
        expect(faces.get(file.name)).toBe(`../../apps/mobile/assets/fonts/${file.path}`);
      }
    });
  });

  it('declares the shipping files when no language is named', () => {
    const faces = declared(screenDocument([], '', { size }));

    expect(faces.get('Figtree-Regular')).toBe(
      '../../apps/mobile/assets/fonts/figtree/Figtree-Regular.ttf',
    );
  });
});
