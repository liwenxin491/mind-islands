# Mind Islands: Own AWS Account Setup

This checklist is for deploying on your personal AWS account (independent from your professor's EC2 key).

## 1) Create your own EC2 key pair

In AWS Console:
1. `EC2` -> `Network & Security` -> `Key Pairs` -> `Create key pair`
2. Name it (example: `mind-islands-key`)
3. Type: `RSA`, format: `.pem`
4. Download and store locally (example: `~/Desktop/mind-islands-key.pem`)
5. Run:

```bash
chmod 400 ~/Desktop/mind-islands-key.pem
```

## 2) Create EC2 instance

Recommended:
- AMI: `Amazon Linux 2023`
- Instance type: `t3.small` (or `t3.micro` for early testing)
- Security group inbound:
  - `22` from your IP
  - `80` from `0.0.0.0/0`
  - `443` from `0.0.0.0/0`

## 3) Create PostgreSQL RDS

Recommended:
- Engine: PostgreSQL 16+
- Deployment: Single-AZ
- Public access: `No` (private DB)
- Create a DB security group:
  - Inbound `5432`
  - Source: EC2 security group (not `0.0.0.0/0`)

## 4) Required environment values on EC2

`/var/www/mind-islands-v0/.env.local` must include:

```bash
NODE_ENV=production
PORT=8787
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
DATABASE_URL=postgresql://<db_user>:<db_password>@<rds_endpoint>:5432/<db_name>
JWT_SECRET=<long_random_secret_32+chars>
```

## 5) Runtime checks

After deployment:

```bash
curl http://127.0.0.1:8787/api/health
curl http://127.0.0.1:8787/api/ready
```

Expected:
- `hasDb: true`
- `hasJwtSecret: true`
- `hasKey: true`
- `dbReachable: true`
- `/api/ready` returns `{"ok":true}`

## 6) What to provide me so I can finish deployment for you

Please send:
1. EC2 public DNS (or public IP)
2. Absolute path of your new `.pem` key on your Mac
3. AWS region (example: `us-west-2`)
4. RDS endpoint + DB name + DB username
5. Whether you want to paste DB password yourself (recommended) or provide it
6. Your domain name (optional, for HTTPS cert)

