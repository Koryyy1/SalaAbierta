// Revisión estática del código del backend (ESLint, configuración plana)
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    { ignores: ['node_modules/', '.data/'] },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            eqeqeq: ['error', 'always'],
            'prefer-const': 'error',
        },
    },
];
