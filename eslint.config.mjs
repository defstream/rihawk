import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['dist/', 'build/', 'node_modules/']
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      // Abstract method signatures keep unused parameters for documentation.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'none', varsIgnorePattern: '^_' }
      ],
      // node:test's describe/it return promises by design; awaiting them
      // at the top level of a test file is neither needed nor idiomatic.
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [
            { from: 'package', name: ['describe', 'it', 'test', 'suite'], package: 'node:test' }
          ]
        }
      ]
    }
  },
  {
    // Plain-JS files (config, ESM wrapper, ESM smoke test) are outside the
    // TypeScript program; type-aware rules cannot run on them.
    files: ['**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked]
  },
  {
    files: ['test/**'],
    rules: {
      // Tests cast loosely around Riak's permissive payload shapes, and
      // compare prototype methods by identity.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off'
    }
  }
);
