module.exports = {
  compact: true,
  comments: false,
  presets: [
    [
      '@babel/env', {
        useBuiltIns: 'usage',
        targets: {
          node: 'current',
          browsers: [
            'last 2 versions'
          ]
        },
        corejs: 3
      }
    ]
  ],
  plugins: [
    [
      'module-resolver', {
        root: ['./src'],
        cwd: 'babelrc',
        'alias': {
          '~': '.'
        }
      }
    ]
  ]
}
