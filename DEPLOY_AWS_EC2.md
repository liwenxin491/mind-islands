# Deploy Mind Islands to AWS EC2 (Amazon Linux)

This guide deploys your current app in production mode:
- React frontend (built files in `dist/`)
- Express API server (`server/index.js`)
- PostgreSQL user data + cloud state storage
- Nginx reverse proxy (public port 80/443)
- PM2 process manager (auto-restart)

## 0) Before you start

- EC2 OS: Amazon Linux (2023 preferred)
- Security Group inbound:
  - `22` (SSH) from your IP
  - `80` (HTTP) from `0.0.0.0/0`
  - `443` (HTTPS) from `0.0.0.0/0`
- RDS PostgreSQL created (recommended same VPC as EC2)
- RDS Security Group inbound:
  - `5432` source = your EC2 Security Group (not `0.0.0.0/0`)
- Local files ready:
  - project folder: `mind-islands-v0`
  - SSH key: `Wendy-Li-Key-Pair.pem`

## 1) SSH to EC2

```bash
chmod 400 ~/Desktop/Wendy-Li-Key-Pair.pem
ssh -i ~/Desktop/Wendy-Li-Key-Pair.pem ec2-user@<YOUR_EC2_PUBLIC_DNS>
```

## 2) Install Node, Nginx, PM2

```bash
sudo dnf update -y
sudo dnf install -y git nginx

curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

sudo npm install -g pm2
node -v
npm -v
```

## 3) Upload project to server

Run this command on your Mac (not inside EC2):

```bash
rsync -avz --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude .git \
  --exclude .DS_Store \
  -e "ssh -i ~/Desktop/Wendy-Li-Key-Pair.pem" \
  "/Users/liwenxin/Documents/New project/mind-islands-v0/" \
  ec2-user@<YOUR_EC2_PUBLIC_DNS>:/var/www/mind-islands-v0/
```

Then SSH in again and continue.

## 4) Configure environment and build

```bash
cd /var/www/mind-islands-v0
cp .env.example .env.local
nano .env.local
```

Set at least:

```bash
GEMINI_API_KEY=your_real_key
GEMINI_MODEL=gemini-2.5-flash
PORT=8787
NODE_ENV=production
DATABASE_URL=postgresql://<db_user>:<db_password>@<rds_endpoint>:5432/<db_name>
JWT_SECRET=<long_random_secret_32+chars>
```

Then install + build:

```bash
npm ci
npm run build
```

## 5) Start app with PM2

```bash
cd /var/www/mind-islands-v0
pm2 start ecosystem.config.cjs
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user
```

Check:

```bash
pm2 status
curl http://127.0.0.1:8787/api/health
```

You should see:
- `hasDb: true`
- `hasJwtSecret: true`

## 6) Configure Nginx

Create config:

```bash
sudo tee /etc/nginx/conf.d/mind-islands.conf > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

Start/reload:

```bash
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
```

Now open:

`http://<YOUR_EC2_PUBLIC_DNS>`

## 7) (Recommended) Add HTTPS with your domain

If you have a domain, point DNS `A` record to EC2 IP, then:

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 8) Update deployment (later)

On your Mac:

```bash
rsync -avz --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude .git \
  --exclude .DS_Store \
  -e "ssh -i ~/Desktop/Wendy-Li-Key-Pair.pem" \
  "/Users/liwenxin/Documents/New project/mind-islands-v0/" \
  ec2-user@<YOUR_EC2_PUBLIC_DNS>:/var/www/mind-islands-v0/
```

On EC2:

```bash
cd /var/www/mind-islands-v0
npm ci
npm run build
pm2 restart mind-islands
```

## 9) Security notes

- Never commit `.env.local`.
- Rotate API keys if they were shared in chat/screenshots.
- Keep Security Group minimal (only 22/80/443).
- Store secrets in AWS SSM/Secrets Manager when ready.
- Keep RDS private and only reachable from EC2 SG.
