#!/bin/bash
# Run this ONCE on a fresh Ubuntu 22.04 EC2 instance
# Usage: bash 1-setup-server.sh

set -e

echo "=== Updating system ==="
sudo apt-get update && sudo apt-get upgrade -y

echo "=== Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== Installing PM2 ==="
sudo npm install -g pm2

echo "=== Installing Nginx ==="
sudo apt-get install -y nginx

echo "=== Installing Certbot (SSL) ==="
sudo apt-get install -y certbot python3-certbot-nginx

echo "=== Installing Git ==="
sudo apt-get install -y git

echo ""
echo "=== Server setup complete ==="
echo "Next steps:"
echo "  1. Clone your repo: git clone <your-repo-url> ~/backend"
echo "  2. Copy .env:       cp ~/backend/deploy/.env.production.template ~/backend/.env.production && nano ~/backend/.env.production"
echo "  3. Copy nginx conf: sudo cp ~/backend/deploy/nginx.conf /etc/nginx/sites-available/backend"
echo "  4. Enable nginx:    sudo ln -s /etc/nginx/sites-available/backend /etc/nginx/sites-enabled/"
echo "  5. Run deploy:      bash ~/backend/deploy/2-deploy.sh"
echo "  6. Setup SSL:       sudo certbot --nginx -d api.yourdomain.com"
