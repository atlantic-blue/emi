/** @jsxImportSource ../jsx */
import {
  FaceName,
  FontWeightName,
  TypeSizeName,
  colour,
  faceNames,
  fontWeightNames,
  fonts,
  typeScale,
  typeSizeNames,
} from '@emi/tokens';

import { Html, raw } from '../jsx/jsx-runtime';

/**
 * The page is a poster of a fixed size, so a picture of it is the whole page and never a viewport
 * that happens to cut the last face off.
 */
export const specimenPage = { width: 1240, height: 1996 } as const;

/** Every sentence is one Emi writes, because filler tells nobody how a face reads in the product. */
export const specimenSentences: Readonly<Record<TypeSizeName, string>> = {
  display: 'Between the 14th and the 17th.',
  title: 'Emi learns your cycle.',
  heading: 'You keep your data.',
  body: 'Predicted on your phone. Encrypted at rest. Shared with nobody.',
  small: 'Emi tells you what it actually knows.',
  label: 'DAY 14 / CYCLE 29 DAYS / 36.8 C',
};

export const faceRoles: Readonly<Record<FaceName, string>> = {
  heading: 'Headings, and the wordmark',
  text: 'The interface and running text',
  numeric: 'Numbers, units and labels',
};

const weightLabels: Readonly<Record<FontWeightName, string>> = {
  regular: 'regular',
  semiBold: 'semi bold',
};

const stackedDigits = ['1111111111', '0000000000'];

export function faceClass(face: FaceName, weight: FontWeightName): string {
  return `face-${face}-${weight}`;
}

export function sizeClass(size: TypeSizeName): string {
  return `size-${size}`;
}

function fontRules(fontsBase: string): string {
  return faceNames
    .flatMap((face) =>
      fontWeightNames.map((weight) => {
        const file = fonts[face].files[weight];

        return [
          '@font-face {',
          `  font-family: "${file.name}";`,
          `  src: url("${fontsBase}${file.path}") format("truetype");`,
          '}',
          `.${faceClass(face, weight)} { font-family: "${file.name}"; }`,
        ].join('\n');
      }),
    )
    .join('\n');
}

function sizeRules(): string {
  return typeSizeNames
    .map((size) => {
      const style = typeScale[size];

      return `.${sizeClass(size)} { font-size: ${style.size}px; line-height: ${style.lineHeight}px; letter-spacing: ${style.letterSpacing}px; }`;
    })
    .join('\n');
}

function styleSheet(fontsBase: string): string {
  return [
    fontRules(fontsBase),
    sizeRules(),
    `body {
  background: ${colour.stone};
  color: ${colour.ink};
  margin: 0;
  padding: 56px 64px;
  width: ${specimenPage.width - 128}px;
  height: ${specimenPage.height - 112}px;
  box-sizing: border-box;
}`,
    `.label {
  color: ${colour.muted};
  width: 200px;
  flex: none;
}`,
    `.row {
  display: flex;
  align-items: baseline;
  gap: 24px;
  margin-bottom: 8px;
}`,
    `.section {
  border-top: 1px solid ${colour.hairline};
  padding-top: 20px;
  margin-top: 28px;
}`,
    `.family {
  display: flex;
  align-items: baseline;
  gap: 20px;
  margin-bottom: 4px;
}`,
    `.files {
  color: ${colour.muted};
  margin-bottom: 18px;
}`,
    `.scale {
  color: ${colour.ember};
}`,
  ].join('\n');
}

function Sample({
  face,
  weight,
  size,
}: {
  face: FaceName;
  weight: FontWeightName;
  size: TypeSizeName;
}): Html {
  const style = typeScale[size];
  const usedHere = style.face === face && weight === 'regular';

  return (
    <div class="row">
      <div class={`label ${faceClass('numeric', 'regular')} ${sizeClass('label')}`}>
        {`${style.size}/${style.lineHeight} ${weightLabels[weight]}`}
        {usedHere ? <span class="scale"> the scale</span> : null}
      </div>
      <div class={`${faceClass(face, weight)} ${sizeClass(size)}`}>{specimenSentences[size]}</div>
    </div>
  );
}

function Title({ children }: { children: Html | string }): Html {
  return <div class={`${faceClass('heading', 'semiBold')} ${sizeClass('title')}`}>{children}</div>;
}

function Face({ face }: { face: FaceName }): Html {
  const family = fonts[face];

  return (
    <div class="section">
      <div class="family">
        <Title>{family.family}</Title>
        <div class={`${faceClass('text', 'regular')} ${sizeClass('small')}`}>{faceRoles[face]}</div>
      </div>
      <div class={`files ${faceClass('numeric', 'regular')} ${sizeClass('label')}`}>
        {`${family.files.regular.path} / ${family.files.semiBold.path} / ${family.licence}`}
      </div>
      {typeSizeNames.flatMap((size) =>
        fontWeightNames.map((weight) => <Sample face={face} weight={weight} size={size} />),
      )}
    </div>
  );
}

function Numbers(): Html {
  return (
    <div class="section">
      <div class="family">
        <Title>Numbers, stacked so a shifting digit shows</Title>
      </div>
      {faceNames.map((face) => (
        <div class="row">
          <div class={`label ${faceClass('numeric', 'regular')} ${sizeClass('label')}`}>
            {fonts[face].family}
          </div>
          <div class={`${faceClass(face, 'regular')} ${sizeClass('body')}`}>
            {stackedDigits.map((digits) => (
              <div>{digits}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Specimen({ fontsBase }: { fontsBase: string }): Html {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Emi type specimen</title>
        <style>{raw(styleSheet(fontsBase))}</style>
      </head>
      <body class={`${faceClass('text', 'regular')} ${sizeClass('body')}`}>
        <div class={`${faceClass('heading', 'semiBold')} ${sizeClass('display')}`}>
          Emi type specimen
        </div>
        <div class={`${faceClass('text', 'regular')} ${sizeClass('small')}`}>
          Three faces, six sizes, two weights. Every sentence is one Emi writes. A point is drawn as
          a pixel, and the sizes are the ones in the token package.
        </div>
        {faceNames.map((face) => (
          <Face face={face} />
        ))}
        <Numbers />
      </body>
    </html>
  );
}

/** The whole document, ready for a browser to draw. */
export function specimenDocument(fontsBase: string): string {
  return `<!doctype html>${Specimen({ fontsBase }).html}`;
}
