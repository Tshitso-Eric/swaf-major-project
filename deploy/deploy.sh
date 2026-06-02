#!/bin/bash
# Run this once on a fresh Oracle Cloud Ubuntu VM
# Usage: bash deploy.sh

set -e

REPO_DIR="/home/ubuntu/swaf"
ORACLE_IP=$(curl -s ifconfig.me)

echo "=== Installing system packages ==="
sudo apt-get update -y
sudo apt-get install -y python3 python3-pip python3-venv nodejs npm nginx git

echo "=== Cloning repo ==="
if [ -d "$REPO_DIR" ]; then
  cd "$REPO_DIR" && git pull
else
  git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git "$REPO_DIR"
fi

echo "=== Backend setup ==="
cd "$REPO_DIR/Back-End"
python3 -m venv venv
venv/bin/pip install --upgrade pip
venv/bin/pip install -r requirements.txt

# Create .env if it doesn't exist
if [ ! -f .env ]; then
  cat > .env <<EOF
DB_HOST=mysql-1cac40e-swaf.l.aivencloud.com
DB_PORT=22360
DB_USER=avnadmin
DB_PASSWORD=REPLACE_WITH_YOUR_AIVEN_PASSWORD
DB_NAME=swaf
DB_USE_SSL=true
JWT_SECRET=REPLACE_WITH_A_STRONG_SECRET
TARGET_SERVER=http://localhost:8080
WAF_MODE=block
FRONTEND_URL=http://${ORACLE_IP}
EOF
  echo ""
  echo "IMPORTANT: Edit the .env file and fill in DB_PASSWORD and JWT_SECRET before continuing."
  echo "Run: nano /home/ubuntu/swaf/Back-End/.env"
  exit 1
fi

echo "=== Frontend build ==="
cd "$REPO_DIR/front-end"
# Point frontend at this server
echo "REACT_APP_API_URL=http://${ORACLE_IP}" > .env.production
npm install --legacy-peer-deps
npm run build

echo "=== Installing systemd service ==="
sudo cp "$REPO_DIR/deploy/swaf.service" /etc/systemd/system/swaf.service
sudo systemctl daemon-reload
sudo systemctl enable swaf
sudo systemctl restart swaf

echo "=== Configuring nginx ==="
sudo cp "$REPO_DIR/deploy/nginx.conf" /etc/nginx/sites-available/swaf
sudo ln -sf /etc/nginx/sites-available/swaf /etc/nginx/sites-enabled/swaf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo "=== Opening firewall ports (Oracle iptables) ==="
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true

echo ""
echo "=== Done ==="
echo "Dashboard: http://${ORACLE_IP}"
echo "Backend health: curl http://${ORACLE_IP}/api/settings (needs token)"
echo ""
echo "Login: admin / admin123"
echo "IMPORTANT: Change the JWT_SECRET and admin password in production."
