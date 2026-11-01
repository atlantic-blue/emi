import { defineConfig, globalIgnores } from 'eslint/config';
import expo from 'eslint-config-expo/flat.js';
import nextWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

/** The one workspace that is web code. Everything else here is a React Native application. */
const website = 'apps/website';

const websiteSources = `${website}/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}`;

// Expo and Next.js each define the plugins react, react-hooks and the TypeScript plugin, and
// ESLint refuses a second definition of a plugin name once both reach the same file. The expo
// configuration reads every file, so it is told to stop at the website. A block carrying nothing
// but `ignores` keeps its own list: that shape is a repository wide ignore, and adding the website
// to it would leave the site unread rather than read by the other configuration.
const expoAwayFromTheWebsite = expo.map((block) =>
  Object.keys(block).every((key) => key === 'ignores')
    ? block
    : { ...block, ignores: [...(block.ignores ?? []), `${website}/**`] },
);

/**
 * A configuration written for a repository that holds one Next.js application, applied to one
 * directory of a repository that holds four workspaces. Each block names its files relative to the
 * root it shipped for, so every pattern moves under the website, and a block that names no file
 * reads every source there. The ignores the two sets carry are dropped on purpose: the built output
 * is in the global list above, which is the one place this repository states it.
 */
function onlyInTheWebsite(blocks) {
  return blocks
    .filter((block) => Object.keys(block).some((key) => key !== 'ignores'))
    .map((block) => ({
      ...block,
      files:
        block.files === undefined
          ? [websiteSources]
          : block.files.map((pattern) => `${website}/${pattern}`),
    }));
}

// A hex colour written anywhere but the token package is a colour nobody measured, so the
// contrast test cannot see it and it drifts from the palette on its own.
const hexColourInSource = [
  {
    selector: String.raw`Literal[value=/#[0-9a-fA-F]{3,8}\b/]`,
    message:
      'A colour belongs in packages/tokens. Import it from @emi/tokens instead of writing a hex value here.',
  },
  {
    selector: String.raw`TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\b/]`,
    message:
      'A colour belongs in packages/tokens. Import it from @emi/tokens instead of writing a hex value here.',
  },
];

// A font size set with no face beside it draws in whatever the platform offers, which is how
// every heading and every paragraph came to ignore the six files the application ships. The
// size and the face travel together, out of textStyle in @emi/tokens.
const sizeWithoutAFace = [
  {
    selector:
      'ObjectExpression:has(> Property[key.name="fontSize"]):not(:has(> Property[key.name="fontFamily"]))',
    message:
      'A font size belongs with its face. Spread textStyle from @emi/tokens rather than setting a size on its own.',
  },
];

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/.open-next/**',
    // The Playwright tests playwright-bdd writes from the gherkin, and what a run leaves behind.
    '**/.features-gen/**',
    '**/test-results/**',
    'apps/website/next-env.d.ts',
    '**/.expo/**',
    'coverage/**',
    'apps/mobile/expo-env.d.ts',
  ]),
  ...expoAwayFromTheWebsite,
  // The site is read the way a browser reads it: the core web vitals set, the TypeScript set, the
  // React hooks rules, and the browser and node names declared as globals, all from Next.js itself.
  ...onlyInTheWebsite([...nextWebVitals, ...nextTypeScript]),
  {
    // The App Router keeps no `pages` directory, so this rule looks for one it will never find and
    // says so on every run. Next.js ships it on because most sites still hold that directory.
    files: [websiteSources],
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs', '**/*.cjs'],
    ignores: ['packages/tokens/**'],
    rules: {
      'no-restricted-syntax': ['error', ...hexColourInSource, ...sizeWithoutAFace],
    },
  },
  {
    files: ['apps/mobile/src/**/*.tsx', 'packages/ui/src/**/*.tsx'],
    ignores: ['packages/ui/src/CappedText.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['Text', 'TextInput'],
              message:
                'Import CappedText or CappedTextInput from @emi/ui, so the iOS text size cannot grow the text past its box.',
            },
          ],
        },
      ],
    },
  },
  {
    // A brand page is markup, not React: the runtime in brand/jsx writes html, so `class` is the
    // attribute the browser reads and a list of children has nothing to reconcile.
    files: ['brand/**/*.tsx'],
    rules: {
      'react/jsx-key': 'off',
      'react/no-unknown-property': 'off',
    },
  },
  {
    // CloudFront evaluates this artifact as a script and calls the global handler by name, so
    // nothing in the file refers to it and the rule reads an entry point as dead code.
    files: ['infrastructure/modules/nextjs-site/code/redirect.js'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
  {
    // The tools read their own configuration through CommonJS, so they see the Node globals.
    files: ['**/*.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        module: 'writable',
        process: 'readonly',
        require: 'readonly',
      },
    },
  },
]);
