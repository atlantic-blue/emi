import { defineConfig, globalIgnores } from 'eslint/config';
import expo from 'eslint-config-expo/flat.js';

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
