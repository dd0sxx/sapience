#!/bin/bash

# Install specific pnpm version
npm install -g pnpm@9

# Install all workspace dependencies and build the SDK so its dist/ exists
pnpm -w install --frozen-lockfile
pnpm --filter @sapience/sdk run build:lib