import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import { OPEN_FONT_LICENCE, fontFamilyNames, fontFiles, fonts, fontsRoot } from '@emi/tokens';

const applicationRoot = join(__dirname, '..', '..');
const repositoryRoot = join(applicationRoot, '..', '..');
const fontsDirectory = join(applicationRoot, 'assets', 'fonts');

function inApplication(path: string): string {
  return join(fontsDirectory, path);
}

describe('every shipped font carries its licence', () => {
  describe('the application holds the files the token package names', () => {
    it('keeps the fonts where the token package says they are', () => {
      expect(relative(repositoryRoot, fontsDirectory)).toBe(fontsRoot.split('/').join(sep));
    });

    it.each(fontFiles.map((file) => file.path))(
      'resolves %s the way the bundler resolves a font',
      (path) => {
        // Requiring the file is the same question the bundler asks, and the answer here is the
        // path it resolved rather than the asset itself: under this runner every asset comes back
        // as the same stub, so the stub proves nothing about which file was found.
        expect(require.resolve(`../../assets/fonts/${path}`)).toBe(inApplication(path));
      },
    );

    it('resolves each file to a file of its own, so two weights cannot collapse into one', () => {
      const resolved = fontFiles.map((file) => require.resolve(`../../assets/fonts/${file.path}`));

      expect(new Set(resolved).size).toBe(fontFiles.length);
    });

    it.each(fontFiles.map((file) => file.path))(
      'holds %s on disk inside the application',
      (path) => {
        expect(existsSync(inApplication(path))).toBe(true);
      },
    );
  });

  describe('the licence travels with the files the application bundles', () => {
    it.each(fontFamilyNames)(
      'keeps the licence for %s in the directory the fonts sit in',
      (name) => {
        const family = fonts[name];

        expect(dirname(family.licencePath)).toBe(dirname(family.files.regular.path));
        expect(readFileSync(inApplication(family.licencePath), 'utf8')).toContain(
          OPEN_FONT_LICENCE,
        );
      },
    );

    it('leaves no font directory without a licence in it', () => {
      const directories = readdirSync(fontsDirectory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
      const bare = directories.filter(
        (directory) => !existsSync(join(fontsDirectory, directory, 'OFL.txt')),
      );

      expect(directories).toHaveLength(fontFamilyNames.length);
      expect(bare).toEqual([]);
    });
  });
});
