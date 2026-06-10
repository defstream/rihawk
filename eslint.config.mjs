import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['dist/', 'build/', 'node_modules/']
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // Abstract method signatures keep unused parameters for documentation.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'none', varsIgnorePattern: '^_' }
      ]
    }
  },
  {
    files: ['test/**'],
    rules: {
      // Tests cast loosely around Riak's permissive payload shapes.
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
);
