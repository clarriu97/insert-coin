import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'public'] },
    js.configs.recommended,
    ...tseslint.configs.strict,
    reactHooks.configs.flat.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            globals: globals.browser
        },
        rules: {
            indent: ['error', 4],
            'linebreak-style': ['error', 'unix'],
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'no-console': 'warn'
        }
    }
,
    {
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            globals: globals.node
        },
        rules: {
            'no-console': 'off'
        }
    }
);
