#!/bin/bash

# Install specific pnpm version
npm install -g pnpm@9
# Ensure tsup is available in PATH for SDK build
npm install -g tsup

# Install all workspace dependencies and build the SDK so its dist/ exists
pnpm -w install
pnpm --filter @sapience/sdk install --include=dev
pnpm --filter @sapience/sdk run build:lib