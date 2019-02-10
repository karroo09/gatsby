#!/bin/sh

yarn

cd ..
yarn bootstrap

cd www
gatsby-dev --set-path-to-repo ..
gatsby-dev --scan-once --packages=gatbsy

# relay-compiler#2638
patch node_modules/relay-compiler/lib/GraphQLIRPrinter.js -i relay.patch

GATSBY_SCREENSHOT_PLACEHOLDER=true yarn develop
