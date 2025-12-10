# 🚀 QUICK START DEPLOYMENT GUIDE

**For:** Gabriel Ludwig Rivera  
**Scenario:** Local Dev → GitHub → Hyper-V VM  
**Time:** ~2-3 hours

---

## ⚡ PHASE 1: GITHUB SETUP (30 minutes)

### Step 1: Create .gitignore Files

**Root .gitignore:**

```bash
node_modules/
.env
*.log
*.sql
backups/
uploads/
.DS_Store
Thumbs.db
```

**Run:**

```powershell
cd "c:\Users\Ludwig Rivera\Downloads\K-Wise Final 2"

# Create .gitignore
@"
node_modules/
.env
*.log
*.sql
backups/
uploads/
.DS_Store
Thumbs.db
"@ | Out-File -FilePath .gitignore -Encoding UTF8

# Verify .env is NOT tracked
git init
git status  # .env should be ABSENT
```

### Step 2: Push to GitHub

```powershell
# Configure Git
git config user.name "Gabriel Ludwig Rivera"
git config user.email "ludwig.rivera26@gmail.com"

# Initial commit
git add .
git commit -m "Initial commit: K-Wise Admin System"

# Create GitHub repo (via web interface)
# Repository name: k-wise-admin-system
# Private repository
# Do NOT initialize with README

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/k-wise-admin-system.git
git branch -M main
git push -u origin main

# Create production branch
git checkout -b production
git push -u origin production
git checkout main
```

---

## 💾 PHASE 2: DATABASE BACKUP (15 minutes)

```powershell
# Export full database
$env:PGPASSWORD = "humbleludwig13"
pg_dump -U postgres -d KWiseDB -h localhost -p 5432 --no-owner --no-privileges -f "KWiseDB_backup_$(Get-Date -Format 'yyyy-MM-dd').sql"

# Compress
Compress-Archive -Path "KWiseDB_backup_*.sql" -DestinationPath "KWiseDB_backup.zip"

# Upload to GitHub Release
gh release create v1.0.0-db --title "Database Backup" --notes "Full backup for VM" KWiseDB_backup.zip

# OR upload to Google Drive/OneDrive
```

---

## 🖥️ PHASE 3: VM SETUP (45 minutes)

### Step 1: Install Software on VM

```powershell
# Install Git
winget install Git.Git

# Install Node.js 22.x
winget install OpenJS.NodeJS.LTS

# Install Ollama
winget install Ollama.Ollama

# Install PM2 globally
npm install -g pm2 serve

# Verify PostgreSQL is running
Get-Service postgresql*
Start-Service postgresql-x64-15
```

### Step 2: Clone Repository

```powershell
cd C:\Projects
git clone https://github.com/YOUR_USERNAME/k-wise-admin-system.git
cd k-wise-admin-system
git checkout production
```

### Step 3: Install Dependencies

```powershell
# Backend
cd KWise-Backend
npm install

# Frontend
cd ..\K-Wise
npm install
```

---

## 🤖 PHASE 4: AI SETUP (20 minutes)

```powershell
# Pull DeepSeek model
ollama pull deepseek-r1:1.5b

# Test model
ollama run deepseek-r1:1.5b "Test PC compatibility"

# Start Ollama service (keep running)
ollama serve
```

---

## 💾 PHASE 5: DATABASE IMPORT (15 minutes)

```powershell
# Download backup
gh release download v1.0.0-db --pattern "KWiseDB_backup.zip"
Expand-Archive KWiseDB_backup.zip -DestinationPath .

# Create database
$env:PGPASSWORD = "your_vm_password"
psql -U postgres -h localhost -c "CREATE DATABASE \"KWiseDB\";"
psql -U postgres -d KWiseDB -h localhost -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql -U postgres -d KWiseDB -h localhost -c "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";"
psql -U postgres -d KWiseDB -h localhost -c "CREATE EXTENSION IF NOT EXISTS \"btree_gin\";"

# Import data
psql -U postgres -d KWiseDB -h localhost -f KWiseDB_backup_2025-12-10.sql

# Verify
psql -U postgres -d KWiseDB -h localhost -c "SELECT COUNT(*) FROM pc_parts;"
```

---

## 🔑 PHASE 6: CONFIGURE ENVIRONMENT (10 minutes)

### Backend .env

```powershell
cd C:\Projects\k-wise-admin-system\KWise-Backend
Copy-Item .env.example .env
notepad .env
```

**Update:**

```dotenv
DB_PASSWORD=your_vm_postgres_password
GMAIL_USER=ludwig.rivera26@gmail.com
GMAIL_APP_PASSWORD=cjkivieyfacqruyy
NODE_ENV=production
JWT_SECRET=generate-new-64-char-secret-here
```

**Generate JWT Secret:**

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
Write-Host "JWT_SECRET=$([Convert]::ToBase64String($bytes))"
```

### Frontend .env

```powershell
cd ..\K-Wise
Copy-Item .env.example .env
notepad .env
```

**Update:**

```dotenv
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SERVER_URL=http://localhost:5000
```

---

## 🚀 PHASE 7: BUILD & DEPLOY (15 minutes)

### Build Frontend

```powershell
cd C:\Projects\k-wise-admin-system\K-Wise
npm run build
```

### Create PM2 Config

```powershell
cd ..
@"
module.exports = {
  apps: [
    {
      name: 'kwise-backend',
      script: 'KWise-Backend/server.js',
      env: { NODE_ENV: 'production' },
      error_file: 'logs/backend-error.log',
      out_file: 'logs/backend-out.log'
    },
    {
      name: 'kwise-frontend',
      script: 'serve',
      args: '-s K-Wise/build -l 3000',
      error_file: 'logs/frontend-error.log',
      out_file: 'logs/frontend-out.log'
    }
  ]
};
"@ | Out-File -FilePath ecosystem.config.js -Encoding UTF8
```

### Start Services

```powershell
# Create logs directory
mkdir logs

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Monitor
pm2 status
pm2 logs
```

---

## ✅ VERIFICATION CHECKLIST

```powershell
# Test Backend
curl http://localhost:5000/api/health

# Test Frontend
Start-Process "http://localhost:3000"

# Check PM2
pm2 status  # All should be "online"

# Check logs for errors
pm2 logs --lines 50 --err
```

**Expected Results:**

- ✅ Backend returns `{"status":"healthy"}`
- ✅ Frontend loads without errors
- ✅ Login works
- ✅ Products display
- ✅ AI compatibility works
- ✅ PM2 shows all green

---

## 🌐 OPTIONAL: ZEROTIER ACCESS

```powershell
# Install ZeroTier
winget install ZeroTier.ZeroTierOne

# Join network
zerotier-cli join d3ecf5726d3cecb5

# Authorize at: https://my.zerotier.com/network/d3ecf5726d3cecb5

# Update frontend .env with ZeroTier IP
# REACT_APP_API_URL=http://10.147.17.X:5000/api

# Rebuild and restart
cd K-Wise
npm run build
pm2 restart all
```

---

## 🔄 BRANCH WORKFLOW

**Local Development:**

```powershell
# Make changes on local machine
git add .
git commit -m "New feature"
git push origin main

# Merge to production when ready
git checkout production
git merge main
git push origin production
```

**VM Deployment:**

```powershell
# Pull latest production code
cd C:\Projects\k-wise-admin-system
git checkout production
git pull origin production

# Restart services
pm2 restart all
```

---

## 🆘 COMMON ISSUES

### Backend won't start

```powershell
# Check .env exists
Test-Path KWise-Backend\.env

# Check PostgreSQL
Get-Service postgresql*

# Check logs
pm2 logs kwise-backend --err
```

### Frontend build fails

```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build
```

### Database import fails

```powershell
# Drop and recreate
psql -U postgres -c "DROP DATABASE \"KWiseDB\";"
psql -U postgres -c "CREATE DATABASE \"KWiseDB\";"
# Import again
```

---

## 📊 SUCCESS METRICS

Your deployment is complete when:

- ✅ `pm2 status` shows all services online
- ✅ No errors in `pm2 logs`
- ✅ http://localhost:3000 loads
- ✅ http://localhost:5000/api/health returns healthy
- ✅ Login works
- ✅ AI compatibility works
- ✅ Database queries execute

**Total Time:** ~2-3 hours  
**Status:** 🎉 PRODUCTION READY

---

**For detailed explanations, see:** `📚_COMPREHENSIVE_GITHUB_VM_DEPLOYMENT_PLAN.md`
