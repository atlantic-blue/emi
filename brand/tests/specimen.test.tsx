/** @jsxImportSource ../jsx */
import {
  faceNames,
  fontFiles,
  fontWeightNames,
  fonts,
  typeScale,
  typeSizeNames,
} from '@emi/tokens';

import {
  faceClass,
  faceRoles,
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

  it.each(fontFiles.map((file) => [file.path, file] as const))(
    'loads %s from the directory the token package names',
    (_path, file) => {
      expect(page).toContain(`font-family: "${file.name}";`);
      expect(page).toContain(`src: url("${fontsBase}${file.path}") format("truetype");`);
    },
  );

  it('loads the six files and no seventh, so nothing is drawn in a face that does not ship', () => {
    expect(page.match(/@font-face/g)).toHaveLength(6);
  });

  it.each(faceNames)('names %s, its role, its files and its licence', (face) => {
    const family = fonts[face];

    expect(page).toContain(family.family);
    expect(page).toContain(faceRoles[face]);
    expect(page).toContain(family.files.regular.path);
    expect(page).toContain(family.files.semiBold.path);
    expect(page).toContain(family.licence);
  });

  it('sets each size to the size, the line height and the letter spacing the scale publishes', () => {
    const wrong = typeSizeNames
      .filter((size) => {
        const style = typeScale[size];

        return !page.includes(
          `.${sizeClass(size)} { font-size: ${style.size}px; line-height: ${style.lineHeight}px; letter-spacing: ${style.letterSpacing}px; }`,
        );
      })
      .map((size) => size);

    expect(wrong).toEqual([]);
  });

  it('draws every size in all three faces, at both weights', () => {
    const missing = faceNames.flatMap((face) =>
      typeSizeNames.flatMap((size) =>
        fontWeightNames
          .filter(
            (weight) => !page.includes(`class="${faceClass(face, weight)} ${sizeClass(size)}"`),
          )
          .map((weight) => `${face} ${size} ${weight}`),
      ),
    );

    expect(missing).toEqual([]);
    expect(faceNames).toHaveLength(3);
    expect(typeSizeNames).toHaveLength(6);
    expect(fontWeightNames).toHaveLength(2);
  });

  it('writes the size and the line height beside each sample, so the picture names what it shows', () => {
    const unlabelled = typeSizeNames
      .filter((size) => !page.includes(`${typeScale[size].size}/${typeScale[size].lineHeight}`))
      .map((size) => size);

    expect(unlabelled).toEqual([]);
  });

  it('marks the face the scale actually uses at each size, once for each size', () => {
    expect(page.match(/class="scale"/g)).toHaveLength(typeSizeNames.length);
  });

  it.each(typeSizeNames)('sets a sentence Emi writes at %s, and not filler', (size) => {
    const sentence = specimenSentences[size];

    expect(page).toContain(sentence);
    expect(sentence.split(' ').length).toBeGreaterThanOrEqual(4);
  });

  it('holds no filler anywhere', () => {
    expect(filler.filter((text) => page.includes(text))).toEqual([]);
  });

  it('stacks two lines of digits for each face, so a face whose numbers shift shows it', () => {
    expect(page.match(/1111111111/g)).toHaveLength(faceNames.length);
    expect(page.match(/0000000000/g)).toHaveLength(faceNames.length);
  });
});
