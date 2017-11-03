#!/bin/bash

PASS="\x1B[0;32m\x20\x20✔\x1B[0m" # GREEN
FAIL="\x1B[0;31m\x20\x20✕\x1B[0m" # RED
MODULE="\x1B[0;90m(zashiki-promise-middleware)\x1B[0m" # GREY

if [[ $? -eq 0 ]]; then

  cd ../zashiki-promise-middleware
  rm -rf lib
  npm install

  echo -e "\x15" # CR
  echo -e $PASS $MODULE

  echo -e "\x15" # CR

  npm link
  npm run lint:fix

  # NO CR
  echo -e $PASS $MODULE
  # echo -e "\x15" # EXIT CR

fi

exit $?
