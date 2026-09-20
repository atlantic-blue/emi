/** @jsxImportSource ../jsx */
import {
  DRAWN_FAMILY,
  FontWeightName,
  TypeRoleName,
  colour,
  fontFile,
  fontWeightNames,
  fonts,
  weightFiles,
  letterSpacingOf,
  typeRoleNames,
  typeScale,
} from '@emi/tokens';

import { Html, raw } from '../jsx/jsx-runtime';

/**
 * The page is a poster of a fixed size, so a picture of it is the whole page and never a viewport
 * that happens to cut the last face off.
 */
export const specimenPage = { width: 1240, height: 1420 } as const;

/** Every sentence is one Emi writes, because filler tells nobody how a face reads in the product. */
export const specimenSentences: Readonly<Record<TypeRoleName, string>> = {
  'headline-xl': 'Between the 14th and the 17th.',
  'headline-xl-mobile': 'Emi learns your cycle.',
  'headline-lg': 'You keep your data.',
  'headline-md': 'Nothing to draw yet.',
  'headline-sm': 'Your cycle is worked out on this phone.',
  'body-lg': 'Predicted on your phone. Encrypted at rest. Shared with nobody.',
  'body-md': 'Emi tells you what it actually knows.',
  'body-sm': 'The ring needs a period. Log a day you bled and it appears.',
  'label-lg': 'LOG TODAY',
  'label-md': 'DAY 14 / CYCLE 29 DAYS',
  'label-sm': 'STEP 1 OF 3',
};

/** What the one family is asked to do, which is everything. */
export const familyRole = 'Every heading, every sentence, every label and every number';

const weightLabels: Readonly<Record<FontWeightName, string>> = {
  regular: 'regular',
  medium: 'medium',
  semiBold: 'semi bold',
  bold: 'bold',
};

const stackedDigits = ['1111111111', '0000000000'];

export function faceClass(weight: FontWeightName): string {
  return `face-${weight}`;
}

export function sizeClass(role: TypeRoleName): string {
  return `size-${role}`;
}

function fontRules(fontsBase: string): string {
  return fontWeightNames
    .map((weight) => {
      const file = fontFile(DRAWN_FAMILY, weight);

      return [
        '@font-face {',
        `  font-family: "${file.name}";`,
        `  src: url("${fontsBase}${file.path}") format("truetype");`,
        '}',
        `.${faceClass(weight)} { font-family: "${file.name}"; }`,
      ].join('\n');
    })
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
  const weight: FontWeightName = weightFiles[style.weight];

  return (
    <div class="row">
      <div class={`label ${faceClass('regular')} ${sizeClass('label-sm')}`}>
        {`${role} ${style.size}/${style.lineHeight} ${weightLabels[weight]}`}
        <span class="scale"> {`${style.weight}`}</span>
      </div>
      <div class={`${faceClass(weight)} ${sizeClass(role)}`}>{specimenSentences[role]}</div>
    </div>
  );
}

function Title({ children }: { children: Html | string }): Html {
  return <div class={`${faceClass('semiBold')} ${sizeClass('headline-lg')}`}>{children}</div>;
}

function Family(): Html {
  const family = fonts[DRAWN_FAMILY];

  return (
    <div class="section">
      <div class="family">
        <Title>{family.family}</Title>
        <div class={`${faceClass('regular')} ${sizeClass('body-sm')}`}>{familyRole}</div>
      </div>
      <div class={`files ${faceClass('regular')} ${sizeClass('label-sm')}`}>
        {`${family.weights.map((weight) => fontFile(DRAWN_FAMILY, weight).path).join(' / ')} / ${family.licence}`}
      </div>
      {typeRoleNames.map((role) => (
        <Sample role={role} />
      ))}
    </div>
  );
}

function Numbers(): Html {
  return (
    <div class="section">
      <div class="family">
        <Title>Numbers, stacked so a shifting digit shows</Title>
      </div>
      <div class="row">
        <div class={`label ${faceClass('regular')} ${sizeClass('label-sm')}`}>
          {fonts[DRAWN_FAMILY].family}
        </div>
        <div class={`${faceClass('regular')} ${sizeClass('body-lg')}`}>
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
      <body class={`${faceClass('regular')} ${sizeClass('body-lg')}`}>
        <div class={`${faceClass('semiBold')} ${sizeClass('headline-xl')}`}>Emi type specimen</div>
        <div class={`${faceClass('regular')} ${sizeClass('body-sm')}`}>
          One face, eleven roles, four weights. Every sentence is one Emi writes. A point is drawn
          as a pixel, and the sizes are the ones in the token package.
        </div>
        <Family />
        <Numbers />
      </body>
    </html>
  );
}

/** The whole document, ready for a browser to draw. */
export function specimenDocument(fontsBase: string): string {
  return `<!doctype html>${Specimen({ fontsBase }).html}`;
}
