#!/bin/bash

execute()
{
  nyc mocha -b \
  --compilers js:babel-core/register \
  config/mocha/setup.js config/mocha/index.js
}

NODE_ENV=test execute ${REPORTER}
