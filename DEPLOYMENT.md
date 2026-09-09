# Project Deployment Guide

Complete guide for deploying Project X API and monitoring in production.

## Deployment Overview

Project X can be deployed to various platforms. This guide covers:
- [Render](#render-deployment) (Recommended for ease of use)
- [Railway](#railway-deployment)
- [Heroku](#heroku-deployment)
- [AWS](#aws-deployment)
- [Self-Hosted](#self-hosted-deployment)

## Pre-Deployment Checklist

- [ ] All tests passing: `npm run test`
- [ ] Linting passes: `npm run lint`
- [ ] Database schema validated: `npm run db:validate`
- [ ] Production .env configured securely
- [ ] All secrets stored in deployment platform
- [ ] Environment variables never committed to git
- [ ] Database backups configured
- [ ] SSL/TLS certificates configured
- [ ] Monitoring/logging configured
- [ ] Disaster recovery plan documented

## Render Deployment

Render provides simple deployment with zero-config PostgreSQL.

### 1. Connect Repository

1. Go to [render.com](https://render.com)
2. Sign up or log in
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Select the repository and branch

### 2. Configure Web Service

**Settings**:
- **Name**: `project-x-api`
- **Environment**: `Node`
- **Region**: Select closest to users
- **Branch**: `main`
- **Build Command**: `npm ci --include=dev && npm --workspace @project-x/api run prisma:generate && npm --workspace @project-x/api run build`
- **Start Command**: `npm --workspace @project-x/api run prisma:migrate:deploy && npm --workspace @project-x/api run start`

### 3. Set Environment Variables

In Render dashboard → Environment:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=<Supabase PostgreSQL connection string with sslmode=require>
JWT_ACCESS_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-secret>
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
LICENSE_PRIVATE_KEY_PEM_BASE64=<your-key>
LICENSE_PUBLIC_KEY_PEM=<your-key>
SMTP_HOST=<your-smtp>
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASS=<your-password>
```

### 4. Configure Supabase PostgreSQL

1. In Supabase, open the target project and copy its direct PostgreSQL connection string.
2. Set it as `DATABASE_URL` in the Render API service environment.
3. Ensure the connection string includes `sslmode=require`.
4. Use the direct Supabase connection for this service so migrations and the API use the same TLS-enabled database connection.

### 5. Run Migrations

The committed `render.yaml` runs `prisma migrate deploy` before the API starts.
Do not run `seed.ts` in production: it creates the documented development
administrator (`admin@test.com` / `password123`). Create production users through
the application onboarding flow instead.

### 6. Deploy

Click "Deploy" → Watch logs for success

**Expected output**:
```
> node dist/server.js
Server running on port 4000
✓ Database connected
✓ Ready for requests
```

### Monitoring in Render

- **Logs**: Real-time logs visible in dashboard
- **Metrics**: CPU, memory, restart count
- **Health Checks**: Configure in service settings
- **Alerts**: Set up email alerts for failures

## Railway Deployment

Railway offers simple full-stack deployment with built-in databases.

### 1. Connect Repository

1. Go to [railway.app](https://railway.app)
2. Create account or log in
3. Click "New Project" → "Deploy from GitHub"
4. Authorize and select repository

### 2. Configure Service

```yaml
# railway.toml (create in root)
[build]
builder = "nixpacks"

[deploy]
startCommand = "cd apps/api && npm start"
```

### 3. Add PostgreSQL Plugin

1. Click "Add" → search "Postgres"
2. Click "Postgres"
3. Railway automatically links DATABASE_URL

### 4. Set Environment Variables

Click on service → "Variables":

```
NODE_ENV=production
JWT_ACCESS_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-secret>
PAYSTACK_SECRET_KEY=sk_live_xxxxx
...
```

### 5. Deploy

Push to GitHub → Railway automatically deploys on push

## Heroku Deployment

### 1. Install Heroku CLI

```bash
npm install -g heroku
heroku login
```

### 2. Create Heroku App

```bash
heroku create project-x-api
```

### 3. Add PostgreSQL

```bash
heroku addons:create heroku-postgresql:standard-0 -a project-x-api
```

### 4. Set Environment Variables

```bash
heroku config:set NODE_ENV=production -a project-x-api
heroku config:set JWT_ACCESS_SECRET=<your-secret> -a project-x-api
heroku config:set PAYSTACK_SECRET_KEY=sk_live_xxxxx -a project-x-api
# ... set all other variables
```

### 5. Create Procfile

```
# Procfile (in root)
web: cd apps/api && npm start
release: cd apps/api && npx prisma migrate deploy
```

### 6. Deploy

```bash
git push heroku main
```

## AWS Deployment

### 1. Create EC2 Instance

```bash
# SSH into instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PostgreSQL client
sudo yum install -y postgresql

# Clone repository
git clone <repo-url>
cd project-x
npm install
```

### 2. Setup PostgreSQL RDS

1. AWS Console → RDS → Create Database
2. Engine: PostgreSQL
3. Note the endpoint URL
4. Create security group for EC2 access

### 3. Configure Environment

```bash
# Create .env in apps/api
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/project_x
NODE_ENV=production
# ... other variables
```

### 4. Setup Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/project-x.service

[Unit]
Description=Project X API
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/home/ec2-user/project-x/apps/api
ExecStart=/usr/bin/node dist/server.js
Restart=always
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable project-x
sudo systemctl start project-x
```

### 5. Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo yum install -y nginx

# Configure
sudo nano /etc/nginx/conf.d/project-x.conf

upstream project_x {
    server 127.0.0.1:4000;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://project_x;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable and start
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 6. Setup SSL (Let's Encrypt)

```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com
```

## Self-Hosted Deployment

For VPS or on-premises server:

### 1. Setup Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2
```

### 2. Configure PostgreSQL

```bash
sudo -u postgres psql

CREATE USER project_x WITH PASSWORD 'strong_password';
CREATE DATABASE project_x OWNER project_x;
GRANT ALL PRIVILEGES ON DATABASE project_x TO project_x;
\q
```

### 3. Setup Application

```bash
# Clone and setup
git clone <repo-url> /opt/project-x
cd /opt/project-x
npm install

# Configure environment
cp apps/api/.env.example apps/api/.env
# Edit .env with production values
sudo chown -R deploy:deploy /opt/project-x
```

### 4. Start with PM2

```bash
cd apps/api
pm2 start dist/server.js --name "project-x-api"
pm2 save
pm2 startup
```

### 5. Configure Nginx

```bash
# Create config
sudo tee /etc/nginx/sites-available/project-x > /dev/null <<EOF
upstream project_x {
    server 127.0.0.1:4000;
}

server {
    listen 80;
    server_name api.example.com;
    client_max_body_size 10M;

    location / {
        proxy_pass http://project_x;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/project-x /etc/nginx/sites-enabled/

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Setup SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com
```

## Database Backups

### Automated Backups (Render/Railway)
- Automatic daily backups included
- 30-day retention
- Restore via dashboard

### Manual PostgreSQL Backup

```bash
# Backup
pg_dump -U project_x project_x > backup-$(date +%Y%m%d).sql

# Restore
psql -U project_x project_x < backup.sql

# Compressed backup
pg_dump -U project_x project_x | gzip > backup-$(date +%Y%m%d).sql.gz
```

## Monitoring & Logging

### Application Logging

```typescript
// Use structured logging
logger.info('User authenticated', { 
  userId: user.id, 
  timestamp: new Date()
});

// In production, integrate with:
// - Sentry (error tracking)
// - LogRocket (session replay)
// - DataDog (metrics)
// - New Relic (APM)
```

### Health Checks

```bash
# Test endpoint
curl https://api.example.com/api/v1/health

# Expected response
{
  "status": "ok",
  "timestamp": "2026-06-14T12:00:00.000Z"
}
```

### Uptime Monitoring

Configure monitoring with:
- Uptime Robot
- Pingdom
- New Relic Synthetics
- CloudWatch

## Scaling

### Horizontal Scaling (Multiple Instances)

For high traffic:
1. Use load balancer (AWS ELB, Nginx)
2. Multiple application instances
3. Shared PostgreSQL database
4. Redis for session management

### Vertical Scaling

For increased load:
1. Increase instance size
2. Increase PostgreSQL resources
3. Add caching layer (Redis)
4. Optimize database indexes

## Troubleshooting

### Service Won't Start

```bash
# Check logs
journalctl -u project-x -f

# Check node process
ps aux | grep node

# Restart
sudo systemctl restart project-x
```

### Database Connection Fails

```bash
# Test connection
psql -h <host> -U <user> -d project_x

# Check connection string
echo $DATABASE_URL

# Verify credentials
# Check security groups (AWS)
```

### Out of Memory

```bash
# Increase Node.js heap
NODE_OPTIONS="--max-old-space-size=2048" npm start

# Check memory usage
free -h
top
```

## Production Checklist

- [ ] HTTPS/SSL configured
- [ ] Database backups automated
- [ ] Monitoring configured
- [ ] Error tracking (Sentry) setup
- [ ] Performance monitoring active
- [ ] Security headers configured (Helmet)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Secrets securely stored
- [ ] Firewall properly configured
- [ ] DDoS protection (if applicable)
- [ ] Regular dependency updates scheduled

---

**Last Updated**: June 2026
