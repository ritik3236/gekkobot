module.exports = {
    env: {
        browser: false,
        es2021: true,
        node: true,
    },
    extends: [
        'plugin:react/recommended',
        'plugin:jsx-a11y/recommended',
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
    ],
    root: true,
    rules: {
        '@stylistic/arrow-parens': ['warn', 'always'],
        '@stylistic/eol-last': ['error', 'always'],
        '@stylistic/indent': ['error', 4],
        '@stylistic/jsx-indent': [2, 4],
        '@stylistic/jsx-indent-props': [2, 4],
        '@stylistic/jsx-quotes': ['warn', 'prefer-double'],
        '@stylistic/member-delimiter-style': 'off',
        '@stylistic/no-multi-spaces': 'warn',
        '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
        '@stylistic/object-curly-spacing': ['error', 'always'],
        '@stylistic/quotes': ['error', 'single'],
        '@stylistic/semi': ['error', 'always'],

        '@stylistic/comma-dangle': ['warn', {
            'arrays': 'always-multiline',
            'exports': 'never',
            'functions': 'never',
            'imports': 'always-multiline',
            'objects': 'always-multiline',
        }],

        '@next/next/no-img-element': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                'argsIgnorePattern': '^_',
                'caughtErrorsIgnorePattern': '^_',
                'varsIgnorePattern': '^_',
            },
        ],

        'react/display-name': 'off',
        'react/jsx-sort-props': [
            'warn',
            {
                'callbacksLast': true,
                'noSortAlphabetically': false,
                'reservedFirst': true,
                'shorthandFirst': true,
            },
        ],
        'react/jsx-uses-react': 'off',
        'react/prop-types': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/self-closing-comp': 'warn',

        'jsx-a11y/click-events-have-key-events': 'warn',
        'jsx-a11y/interactive-supports-focus': 'warn',

        // 'no-console': ['error', { allow: ['warn', 'error', 'info'] }],

        'sort-keys': ['warn', 'asc', { minKeys: 4, allowLineSeparatedGroups: true }],
        'unused-imports/no-unused-imports': 'error',

        'import/order': [
            'error',
            {
                'alphabetize': { order: 'asc', caseInsensitive: true },
                'distinctGroup': false,
                'groups': ['builtin', 'external', ['internal'], ['parent', 'sibling', 'index'], ['object', 'type']],
                'newlines-between': 'always-and-inside-groups',
                'pathGroupsExcludedImportTypes': ['builtin'],

                // define hero-ui group that will appear separately after other main externals
                'pathGroups': [
                    { group: 'external', pattern: '@heroui/{**}', position: 'after' },
                    { group: 'external', pattern: 'react', position: 'before' },
                ],
            },
        ],

        'padding-line-between-statements': [
            'warn',
            { 'blankLine': 'always', 'next': 'return', 'prev': '*' },
            { 'blankLine': 'always', 'next': '*', 'prev': ['const', 'let', 'var'] },
            {
                'blankLine': 'any',
                'next': ['const', 'let', 'var'],
                'prev': ['const', 'let', 'var'],
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
