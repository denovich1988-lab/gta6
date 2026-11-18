#!/bin/sh
# Adds gta6box.com to the existing server (run once as root). The first site keeps working unchanged.
set -e
DOMAIN=gta6box.com
NAME=gta6box
REPO=https://github.com/denovich1988-lab/gta6.git
mkdir -p /var/www/$NAME
cat > /usr/local/bin/$NAME-update <<U
#!/bin/sh
set -e
SRC=/opt/$NAME-site
if [ ! -d "\$SRC/.git" ]; then
  git clone -q --depth 1 --branch site "$REPO" "\$SRC"
else
  git -C "\$SRC" fetch -q --depth 1 origin site
  git -C "\$SRC" reset -q --hard origin/site
fi
rsync -a --delete --exclude .git "\$SRC/" /var/www/$NAME/
U
chmod 755 /usr/local/bin/$NAME-update
cat > /etc/systemd/system/$NAME-update.service <<U
[Unit]
Description=Pull the latest $DOMAIN build from GitHub
Wants=network-online.target
After=network-online.target
[Service]
Type=oneshot
ExecStart=/usr/local/bin/$NAME-update
U
cat > /etc/systemd/system/$NAME-update.timer <<U
[Unit]
Description=Update $DOMAIN every 5 minutes
[Timer]
OnBootSec=1min
OnUnitActiveSec=5min
[Install]
WantedBy=timers.target
U
cat > /etc/nginx/sites-available/$NAME <<N
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    root /var/www/$NAME;
    index index.html;
    gzip on;
    gzip_types text/css application/javascript application/json application/xml application/rss+xml image/svg+xml;
    location / { try_files \$uri \$uri/ =404; }
    location /assets/ { expires 30d; add_header Cache-Control "public"; }
    location ~ /\. { deny all; }
    error_page 404 /404.html;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
N
ln -sf /etc/nginx/sites-available/$NAME /etc/nginx/sites-enabled/$NAME
nginx -t
systemctl daemon-reload
systemctl enable --now $NAME-update.timer
systemctl start $NAME-update.service
systemctl reload nginx
echo "OK: $DOMAIN added, $(find /var/www/$NAME -name index.html | wc -l) pages"
