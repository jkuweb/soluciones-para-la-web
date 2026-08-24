import tseslint from 'typescript-eslint'

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...tseslint.configs.recommended,
  {
    name: 'agencia/base',
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    name: 'agencia/ignores',
    ignores: ['.next/', 'src/payload-types.ts', 'src/payload-generated-schema.ts'],
  },
  {
    name: 'agencia/tests',
    // Tests de integración y E2E usan `as any` intencionalmente para sortear
    // el tipo estricto de Payload en casos como `user: { id, roles, tenants }`
    // (no son instancias completas de User, solo campos suficientes para
    // los access checks que queremos verificar). E2E tests también seedan
    // datos vía Local API con tipos parciales.
    files: ['tests/int/**/*.int.spec.ts', 'tests/e2e/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]

export default eslintConfig
