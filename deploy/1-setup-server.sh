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

echo "=== Creating app directory ==="
sudo mkdir -p /var/www/backend
sudo chown -R $USER:$USER /var/www/backend

echo ""
echo "=== Server setup complete ==="
echo "Next steps:"
echo "  1. Clone your repo: git clone <your-repo-url> /var/www/backend"
echo "  2. Copy .env:       cp /var/www/backend/.env.example /var/www/backend/.env && nano /var/www/backend/.env"
echo "  3. Copy nginx conf: sudo cp /var/www/backend/deploy/nginx.conf /etc/nginx/sites-available/backend"
echo "  4. Enable nginx:    sudo ln -s /etc/nginx/sites-available/backend /etc/nginx/sites-enabled/"
echo "  5. Run deploy:      bash /var/www/backend/deploy/2-deploy.sh"
echo "  6. Setup SSL:       sudo certbot --nginx -d api.yourdomain.com"
