/** @jsxImportSource ../jsx */
import {
  FaceName,
  FontFile,
  TypeRoleName,
  colour,
  face,
  faceFamily,
  fontFile,
  fontFileFor,
  fontFiles,
  fonts,
  letterSpacingOf,
  typeRoleNames,
  typeScale,
} from '@emi/tokens';

import { Html, raw } from '../jsx/jsx-runtime';

/**
 * The page is a poster of a fixed size, so a picture of it is the whole page and never a viewport
 * that happens to cut the last face off.
 */
export const specimenPage = { width: 1240, height: 1960 } as const;

/** Every sentence is one Emi writes, because filler tells nobody how a face reads in the product. */
export const specimenSentences: Readonly<Record<TypeRoleName, string>> = {
  'display-lg': 'Between the 14th and the 17th.',
  'display-lg-mobile': 'Emi learns your cycle.',
  'headline-lg': 'You keep your data.',
  'headline-md': 'Nothing to draw yet.',
  'headline-sm': 'Your cycle is worked out on this phone.',
  'body-lg': 'Predicted on your phone. Encrypted at rest. Shared with nobody.',
  'body-md': 'Emi tells you what it actually knows.',
  'body-sm': 'The ring needs a period. Log a day you bled and it appears.',
  'label-md': 'DAY 14 / CYCLE 29 DAYS',
  'label-sm': 'STEP 1 OF 3',
  'data-lg': '14',
  'data-md': '36.7 °C  29 days  14:02',
  'data-sm': '2026-05-14',
};

/** What each face is asked to do, in the design system's own words. */
export const familyRoles: Readonly<Record<FaceName, string>> = {
  display: 'Every display role and every headline',
  text: 'Every sentence and every label',
  data: 'Every number and every measurement',
};

const stackedDigits = ['1111111111', '0000000000'];

/** A class per file rather than per weight, because three families share the same three weights. */
export function faceClass(file: FontFile): string {
  return `face-${file.name}`;
}

export function sizeClass(role: TypeRoleName): string {
  return `size-${role}`;
}

function fileFor(role: TypeRoleName): FontFile {
  return fontFileFor(typeScale[role].face, typeScale[role].weight);
}

function fontRules(fontsBase: string): string {
  return fontFiles
    .map((file) =>
      [
        '@font-face {',
        `  font-family: "${file.name}";`,
        `  src: url("${fontsBase}${file.path}") format("truetype");`,
        '}',
        `.${faceClass(file)} { font-family: "${file.name}"; }`,
      ].join('\n'),
    )
    .join('\n');
}

function sizeRules(): string {
  return typeRoleNames
    .map((role) => {
      const style = typeScale[role];
      const tracking = letterSpacingOf(style.size, style.letterSpacingEm);

      return `.${sizeClass(role)} { font-size: ${style.size}px; line-height: ${style.lineHeight}px; letter-spacing: ${tracking}px; }`;
    })
    .join('\n');
}

const interfaceFace = fontFile(faceFamily.text, 'regular');
const interfaceBold = fontFile(faceFamily.text, 'semiBold');

function styleSheet(fontsBase: string): string {
  return [
    fontRules(fontsBase),
    sizeRules(),
    `body {
  background: ${colour.surfaceContainerLowest};
  color: ${colour.onSurface};
  margin: 0;
  padding: 56px 64px;
  width: ${specimenPage.width - 128}px;
  height: ${specimenPage.height - 112}px;
  box-sizing: border-box;
}`,
    `.label {
  color: ${colour.onSurfaceVariant};
  width: 240px;
  flex: none;
}`,
    `.row {
  display: flex;
  align-items: baseline;
  gap: 24px;
  margin-bottom: 8px;
}`,
    `.section {
  border-top: 1px solid ${colour.outlineVariant};
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
  color: ${colour.onSurfaceVariant};
  margin-bottom: 18px;
}`,
    `.scale {
  color: ${colour.primary};
}`,
  ].join('\n');
}

function Sample({ role }: { role: TypeRoleName }): Html {
  const style = typeScale[role];
  const file = fileFor(role);

  return (
    <div class="row">
      <div class={`label ${faceClass(interfaceFace)} ${sizeClass('label-sm')}`}>
        {`${role} ${style.size}/${style.lineHeight} ${file.name}`}
        <span class="scale"> {`${style.weight}`}</span>
      </div>
      <div class={`${faceClass(file)} ${sizeClass(role)}`}>{specimenSentences[role]}</div>
    </div>
  );
}

function Title({ children }: { children: Html | string }): Html {
  return (
    <div class={`${faceClass(fontFile(faceFamily.display, 'medium'))} ${sizeClass('headline-md')}`}>
      {children}
    </div>
  );
}

function Family({ faceName }: { faceName: FaceName }): Html {
  const family = fonts[faceFamily[faceName]];
  const roles = typeRoleNames.filter((role) => typeScale[role].face === faceName);

  return (
    <div class="section">
      <div class="family">
        <Title>{family.family}</Title>
        <div class={`${faceClass(interfaceFace)} ${sizeClass('body-sm')}`}>
          {familyRoles[faceName]}
        </div>
      </div>
      <div class={`files ${faceClass(interfaceFace)} ${sizeClass('label-sm')}`}>
        {`${family.weights.map((weight) => fontFile(faceFamily[faceName], weight).path).join(' / ')} / ${family.licence}`}
      </div>
      {roles.map((role) => (
        <Sample role={role} />
      ))}
    </div>
  );
}

function Numbers(): Html {
  const figures = fontFile(faceFamily.data, 'regular');

  return (
    <div class="section">
      <div class="family">
        <Title>Numbers, stacked so a shifting digit shows</Title>
      </div>
      <div class="row">
        <div class={`label ${faceClass(interfaceFace)} ${sizeClass('label-sm')}`}>
          {fonts[faceFamily.data].family}
        </div>
        <div class={`${faceClass(figures)} ${sizeClass('body-lg')}`}>
          {stackedDigits.map((digits) => (
            <div>{digits}</div>
          ))}
        </div>
      </div>
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
      <body class={`${faceClass(interfaceFace)} ${sizeClass('body-lg')}`}>
        <div class={`${faceClass(interfaceBold)} ${sizeClass('display-lg-mobile')}`}>
          Emi type specimen
        </div>
        <div class={`${faceClass(interfaceFace)} ${sizeClass('body-sm')}`}>
          Three faces, thirteen roles, two weights each. Every sentence is one Emi writes. A point
          is drawn as a pixel, and the sizes are the ones in the token package.
        </div>
        {(Object.keys(face) as FaceName[]).map((faceName) => (
          <Family faceName={faceName} />
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
