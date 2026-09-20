/** @jsxImportSource ../jsx */
import {
  DRAWN_FAMILY,
  applicationFontFiles,
  fontFile,
  fontWeightNames,
  fonts,
  weightFiles,
  letterSpacingOf,
  typeRoleNames,
  typeScale,
} from '@emi/tokens';

import {
  faceClass,
  familyRole,
  sizeClass,
  specimenDocument,
  specimenPage,
  specimenSentences,
} from '../specimen/specimen.tsx';

const fontsBase = 'file:///emi/apps/mobile/assets/fonts/';
const page = specimenDocument(fontsBase);

const filler = ['Lorem ipsum', 'quick brown fox', 'Hamburgefonstiv', 'Aa Bb Cc'];

describe('the type specimen a person looks at', () => {
  it('is one document a browser can draw on its own', () => {
    expect(page.startsWith('<!doctype html>')).toBe(true);
    expect(page).toContain('<title>Emi type specimen</title>');
    expect(page.endsWith('</html>')).toBe(true);
  });

  it('declares the page it is drawn at, so a picture of it is the whole page', () => {
    expect(specimenPage.width).toBeGreaterThan(0);
    expect(specimenPage.height).toBeGreaterThan(specimenPage.width);
    expect(page).toContain(`width: ${specimenPage.width - 128}px`);
    expect(page).toContain(`height: ${specimenPage.height - 112}px`);
  });

  it.each(applicationFontFiles.map((file) => [file.path, file] as const))(
    'loads %s from the directory the token package names',
    (_path, file) => {
      expect(page).toContain(`font-family: "${file.name}";`);
      expect(page).toContain(`src: url("${fontsBase}${file.path}") format("truetype");`);
    },
  );

  it('loads the four files the application draws in, and no second family', () => {
    expect(page.match(/@font-face/g)).toHaveLength(4);
    expect(page).not.toContain('Fraunces');
    expect(page).not.toContain('IBMPlexMono');
  });

  it('names the family, what it carries, its files and its licence', () => {
    const family = fonts[DRAWN_FAMILY];

    expect(page).toContain(family.family);
    expect(page).toContain(familyRole);
    for (const weight of family.weights) {
      expect(page).toContain(fontFile(DRAWN_FAMILY, weight).path);
    }
    expect(page).toContain(family.licence);
  });

  it('sets each role to the size, the line height and the tracking the scale publishes', () => {
    const wrong = typeRoleNames
      .filter((role) => {
        const style = typeScale[role];
        const tracking = letterSpacingOf(style.size, style.letterSpacingEm);

        return !page.includes(
          `.${sizeClass(role)} { font-size: ${style.size}px; line-height: ${style.lineHeight}px; letter-spacing: ${tracking}px; }`,
        );
      })
      .map((role) => role);

    expect(wrong).toEqual([]);
  });

  it('draws every role at the weight the design system asks for', () => {
    const missing = typeRoleNames
      .filter((role) => {
        const weight = weightFiles[typeScale[role].weight];

        return !page.includes(`class="${faceClass(weight)} ${sizeClass(role)}"`);
      })
      .map((role) => role);

    expect(missing).toEqual([]);
    expect(typeRoleNames).toHaveLength(11);
    expect(fontWeightNames).toHaveLength(4);
  });

  it('writes the size and the line height beside each sample, so the picture names what it shows', () => {
    const unlabelled = typeRoleNames
      .filter((role) => !page.includes(`${typeScale[role].size}/${typeScale[role].lineHeight}`))
      .map((role) => role);

    expect(unlabelled).toEqual([]);
  });

  it('writes the weight the design system asks for beside each sample', () => {
    expect(page.match(/class="scale"/g)).toHaveLength(typeRoleNames.length);
  });

  it.each(typeRoleNames)('sets a sentence Emi writes at %s, and not filler', (role) => {
    const sentence = specimenSentences[role];

    expect(page).toContain(sentence);
    expect(sentence.length).toBeGreaterThan(8);
  });

  it('holds no filler anywhere', () => {
    expect(filler.filter((text) => page.includes(text))).toEqual([]);
  });

  it('stacks two lines of digits, so a face whose numbers shift shows it', () => {
    expect(page.match(/1111111111/g)).toHaveLength(1);
    expect(page.match(/0000000000/g)).toHaveLength(1);
  });
});
