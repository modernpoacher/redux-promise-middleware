module.exports = {
  compact: true,
  comments: false,
  presets: [
    [
      '@babel/env', {
        useBuiltIns: 'entry',
        targets: {
          node: 'current',
          browsers: [
            'last 2 versions'
          ]
        },
        corejs: '3.0.1'
      }
    ],
    '@babel/react'
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
