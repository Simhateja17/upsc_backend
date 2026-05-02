#!/bin/bash
# Run on every deployment - code is already synced by GitHub Actions via rsync
# Usage: bash /var/www/backend/deploy/2-deploy.sh

set -e

APP_DIR="/var/www/backend"
cd "$APP_DIR"

echo "=== Checking Node.js version ==="
NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
NODE_MINOR=$(echo "$NODE_VERSION" | cut -d. -f2)
if [ "$NODE_MAJOR" -lt 20 ] || { [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -lt 19 ]; }; then
  echo "Node.js $NODE_VERSION is too old (pdf-to-img requires >= 20.19.0). Upgrading..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq nodejs
  echo "Node.js is now $(node -v)"
fi

echo "=== Installing dependencies ==="
npm install

echo "=== Generating Prisma client ==="
npx prisma generate

echo "=== Building TypeScript ==="
npm run build

echo "=== Restarting PM2 ==="
pm2 startOrReload "$APP_DIR/deploy/ecosystem.config.js" --env production

echo "=== Saving PM2 process list ==="
pm2 save

echo ""
echo "=== Deploy complete ==="
pm2 status
