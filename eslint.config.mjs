import { defineConfig, globalIgnores } from 'eslint/config';
import expo from 'eslint-config-expo/flat.js';

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
    '**/.expo/**',
    'coverage/**',
    'apps/mobile/expo-env.d.ts',
  ]),
  expo,
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
    // A brand page is markup, not React: the runtime in brand/jsx writes html, so `class` is the
    // attribute the browser reads and a list of children has nothing to reconcile.
    files: ['brand/**/*.tsx'],
    rules: {
      'react/jsx-key': 'off',
      'react/no-unknown-property': 'off',
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
