# Production deployment (Ubuntu)

Single-origin stack: host Nginx (HTTPS) → `127.0.0.1:3001` (frontend container) → backend API and Socket.IO on the internal Docker network.

## Prerequisites

- Ubuntu 22.04 or 24.04
- Domain DNS pointing at the server
- Docker Engine + Compose plugin

## 1. Server setup

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
sudo apt install -y docker-compose-plugin
sudo ufw default deny incoming
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 2. Application

```bash
sudo mkdir -p /opt/icas && sudo chown $USER:$USER /opt/icas
cd /opt/icas
git clone https://github.com/<org>/iCAS-CMU-HUB.git .
cp .env.example .env
nano .env
chmod 600 .env
```

Required in `.env`: strong `POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CHAT_ENCRYPTION_KEY`, `CORS_ORIGIN=https://your-domain` (exact match, no trailing slash). Do not set `VITE_API_URL`.

## 3. Build and start

```bash
docker compose --env-file .env build --no-cache
docker compose --env-file .env up -d
docker compose ps
```

## 4. Host Nginx + TLS

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example --redirect --agree-tos -m admin@example.com
```

Example `/etc/nginx/sites-available/icas` (proxy everything to the frontend container):

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.example;

    ssl_certificate /etc/letsencrypt/live/your-domain.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.example/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/icas /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Verification

```bash
curl -fsS https://your-domain.example/health
curl -fsS https://your-domain.example/api/health
docker compose logs backend --tail=50
docker compose logs frontend --tail=50
```

Browser: login, confirm `access_token` / `refresh_token` cookies are `Secure` and `HttpOnly`; confirm WebSocket connects to `/socket.io/`.

## 6. Operations

```bash
cd /opt/icas && git pull
docker compose --env-file .env build && docker compose --env-file .env up -d
docker exec icas-database pg_dump -U icas_user icas_cmu_hub | gzip > backup-$(date +%F).sql.gz
sudo certbot renew --dry-run
```
