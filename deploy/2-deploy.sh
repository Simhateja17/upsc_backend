#!/bin/bash
# Run on every deployment to pull latest code and restart
# Usage: bash /var/www/backend/deploy/2-deploy.sh

set -e

APP_DIR="/var/www/backend"
cd "$APP_DIR"

# Pull first, then re-exec so bash always runs the latest version of this script
if [ "$1" != "post-update" ]; then
  echo "=== Pulling latest code ==="
  git pull origin main
  exec bash "$0" post-update
fi

echo "=== Installing dependencies ==="
npm ci --production=false

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
