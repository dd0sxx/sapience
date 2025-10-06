#!/usr/bin/env bash
set -euo pipefail

# Ensure devDependencies are installed for the workspace and @sapience/sdk
export NPM_CONFIG_PRODUCTION=false
export NODE_ENV=development

# Install workspace dependencies including devDependencies
pnpm -w install --prod=false

# Ensure @sapience/sdk devDependencies are present
pnpm --filter @sapience/sdk install --prod=false

# Build the SDK library
pnpm --filter @sapience/sdk run build:lib


