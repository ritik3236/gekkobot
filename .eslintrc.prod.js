module.exports = {
    env: {
        browser: false,
        es2021: true,
        node: true,
    },
    extends: [
        'plugin:react/recommended',
        'plugin:jsx-a11y/recommended',
        'plugin:tailwindcss/recommended',
        'plugin:@tanstack/query/recommended',
        'next/core-web-vitals',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    plugins: [
        'react',
        'unused-imports',
        'import',
        '@typescript-eslint',
        '@stylistic/eslint-plugin',
        'jsx-a11y',
        'tailwindcss',
    ],
    root: true,
    rules: {
        '@stylistic/arrow-parens': ['warn', 'always'],
        '@stylistic/indent': ['error', 4],
        '@stylistic/jsx-indent': [2, 4],
        '@stylistic/jsx-indent-props': [2, 4],
        '@stylistic/jsx-quotes': ['warn', 'prefer-double'],
        '@stylistic/member-delimiter-style': 'off',
        '@stylistic/object-curly-spacing': ['error', 'always'],
        '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
        '@stylistic/no-multi-spaces': 'warn',
        '@stylistic/eol-last': ['error', 'always'],
        '@stylistic/quotes': ['error', 'single'],
        '@stylistic/semi': ['error', 'always'],
        '@stylistic/comma-dangle': ['warn', {
            'arrays': 'always-multiline',
            'objects': 'always-multiline',
            'imports': 'always-multiline',
            'exports': 'never',
            'functions': 'never',
        }],

        '@next/next/no-img-element': 'off',
        // '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': [
            'warn',
            {
                'argsIgnorePattern': '^_',
                'varsIgnorePattern': '^_',
                'caughtErrorsIgnorePattern': '^_',
            },
        ],

        'react/display-name': 'off',
        'react/prop-types': 'off',
        'react/jsx-uses-react': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/self-closing-comp': 'warn',
        'react-hooks/exhaustive-deps': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react/jsx-sort-props': [
            'warn',
            {
                'callbacksLast': true,
                'shorthandFirst': true,
                'noSortAlphabetically': false,
                'reservedFirst': true,
            },
        ],

        'jsx-a11y/click-events-have-key-events': 'warn',
        'jsx-a11y/interactive-supports-focus': 'warn',

        'no-console': ['error', { allow: ['warn', 'error', 'info'] }],

        'unused-imports/no-unused-imports': 'error',

        'import/order': [
            'error',
            {
                'groups': ['builtin', 'external', ['internal'], ['parent', 'sibling', 'index'], ['object', 'type']],
                'pathGroupsExcludedImportTypes': ['builtin'],
                // define next-ui group that will appear separately after other main externals
                'pathGroups': [
                    { pattern: '@heroui/{**}', group: 'external', position: 'after' },
                    { pattern: 'react', group: 'external', position: 'before' },
                ],
                'newlines-between': 'always-and-inside-groups',
                'distinctGroup': false,
                'alphabetize': { order: 'asc', caseInsensitive: true },
            },
        ],

        'padding-line-between-statements': [
            'warn',
            { 'blankLine': 'always', 'prev': '*', 'next': 'return' },
            { 'blankLine': 'always', 'prev': ['const', 'let', 'var'], 'next': '*' },
            {
                'blankLine': 'any',
                'prev': ['const', 'let', 'var'],
                'next': ['const', 'let', 'var'],
            },
        ],
    },
    settings: {
        'react': {
            'version': 'detect',
        },
        'import/resolver': {
            'node': {
                'extensions': ['.js', '.jsx', '.ts', '.tsx'],
            },
        },
    },
};
