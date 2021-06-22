module.exports = {
  ...require('gts/.prettierrc.json'),
  overrides: [
    {
      files: '*.{yml,yaml}',
      options: {
        proseWrap: 'always',
      },
    },
  ],
};
