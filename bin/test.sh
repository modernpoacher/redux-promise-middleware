#!/bin/bash

execute()
{
  nyc mocha -b \
  --require @babel/register \
  config/mocha/setup.js config/mocha/index.js
}

NODE_ENV=test execute ${REPORTER}
