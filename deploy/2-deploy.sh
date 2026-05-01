#!/bin/bash
# Run on every deployment to pull latest code and restart
# Usage: bash /var/www/backend/deploy/2-deploy.sh

set -e

APP_DIR="/var/www/backend"
cd "$APP_DIR"

# First invocation: pull latest code, then re-exec this script so bash
# reads the updated version instead of the buffered old one.
if [ "$1" != "--post-pull" ]; then
  echo "=== Pulling latest code ==="
  git pull origin main
  exec bash "$APP_DIR/deploy/2-deploy.sh" --post-pull
fi

echo "=== Installing dependencies ==="
npm install

echo "=== Generating Prisma client ==="
npx prisma generate

echo "=== Building TypeScript ==="
npm run build

echo "=== Running DB migrations ==="
npx prisma migrate deploy

echo "=== Restarting PM2 ==="
pm2 startOrReload "$APP_DIR/deploy/ecosystem.config.js" --env production

echo "=== Saving PM2 process list ==="
pm2 save

echo ""
echo "=== Deploy complete ==="
pm2 status
