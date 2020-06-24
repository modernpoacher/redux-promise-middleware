const debug = require('debug')

const log = debug('zashiki-promise-middleware')

const {
  env: {
    NODE_ENV = 'development'
  }
} = process

log('`zashiki-promise-middleware` is awake')

function env () {
  log({ NODE_ENV })

  return (
    NODE_ENV === 'production'
  )
}

const presets = [
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
]

const plugins = [
  [
    'module-resolver', {
      root: ['./src'],
      cwd: 'babelrc',
      alias: {
        '~': '.'
      }
    }
  ]
]

module.exports = (api) => {
  if (api) api.cache.using(env)

  return {
    compact: true,
    comments: false,
    presets,
    plugins
  }
}
