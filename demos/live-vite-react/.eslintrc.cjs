const path = require('path');

module.exports = {
  root: true,
  extends: [
    '@tencentcloud/eslint-config-hybrid/react',
  ],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ]
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
      alias: {
        map: [['@', path.resolve(__dirname, './src')]],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts'],
      },
    },
  },
};
