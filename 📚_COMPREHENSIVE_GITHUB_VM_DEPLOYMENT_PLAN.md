# 📚 COMPREHENSIVE K-WISE GITHUB → VM DEPLOYMENT PLAN

**Version:** 1.0  
**Date:** December 10, 2025  
**Author:** Gabriel Ludwig Rivera  
**Scenario:** Local Development → GitHub Repository → Hyper-V Virtual Machine

---

## 🎯 EXECUTIVE SUMMARY

This deployment plan covers:

1. **GitHub Repository Setup** - Initialize, configure, and push codebase
2. **VM Cloning & Setup** - Clone repository to Hyper-V VM
3. **Database Migration** - Export from local → Import to VM
4. **Dependencies Installation** - All backend, frontend, and AI dependencies
5. **Environment Configuration** - Secure credential management
6. **Branch Strategy** - Main (local) and production (VM) branches

**Deployment Timeline:** ~2-3 hours  
**Prerequisites:** GitHub account, Hyper-V VM with VS Code & PostgreSQL installed

---

## 📊 CODEBASE ANALYSIS SUMMARY

### Backend (`KWise-Backend/`)

- **Framework:** Node.js + Express
- **Database:** PostgreSQL (KWiseDB)
- **AI Integration:** Ollama DeepSeek R1-1.5b (local model)
- **Dependencies:** 53 production + 4 dev packages
- **Key Features:**
  - JWT Authentication
  - Real-time WebSocket (Socket.IO)
  - AI compatibility analysis
  - Queue management system
  - Email notifications (Gmail SMTP)

### Frontend (`K-Wise/`)

- **Framework:** React 18.2.0
- **UI Libraries:** Radix UI, Tailwind CSS, shadcn-ui
- **Routing:** React Router DOM v7
- **Build Tool:** React Scripts (Create React App)
- **Dependencies:** 23 production packages

### Database Schema

- **Main Tables:**
  - `users`, `pc_parts`, `orders`, `queue_management`
  - `compatibility_rules`, `reference_builds`
  - `cpu_specifications`, `gpu_compatibility`, `psu_compatibility`
  - `motherboard_compatibility`, `ram_compatibility`, `cooler_compatibility`
  - `case_compatibility`, `storage_compatibility`
- **Total SQL Files:** 60+ migration and schema files
- **Estimated Size:** ~500MB+ with data

### Environment Variables

- **Backend:** Database credentials, JWT secrets, Gmail app password, Ollama config
- **Frontend:** API URL auto-detection, backend port

---

## 🚀 PHASE 1: GITHUB REPOSITORY SETUP

### Step 1.1: Create .gitignore Files

**Backend .gitignore (KWise-Backend/.gitignore):**

```gitignore
# Environment Variables
.env
.env.local
.env.*.local

# Node Modules
node_modules/
npm-debug.log*
yarn-debug.log*

# Logs
logs/
*.log

# Database Backups
backups/
*.sql
*.dump

# Uploads
uploads/
public/uploads/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
*.test.js.snap

# Build
dist/
build/

# Temporary Files
temp/
tmp/
*.tmp
```

**Frontend .gitignore (K-Wise/.gitignore):**

```gitignore
# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build

# Environment Variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Misc
*.swp
*.swo
```

**Root .gitignore:**

```gitignore
# Shared
node_modules/
.env
*.log
*.sql
*.dump

# Documentation (optional - include these)
# *.md

# OS
.DS_Store
Thumbs.db
```

### Step 1.2: Initialize Git Repository

```powershell
# Navigate to project root
cd "c:\Users\Ludwig Rivera\Downloads\K-Wise Final 2"

# Initialize Git
git init

# Configure Git (if not already configured)
git config user.name "Gabriel Ludwig Rivera"
git config user.email "ludwig.rivera26@gmail.com"

# Check status
git status
```

### Step 1.3: Create README.md

Create a comprehensive README at the root:

```markdown
# K-Wise Admin System

PC parts e-commerce platform with AI-powered compatibility checking and admin management.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Ollama AI (for DeepSeek R1 model)

### Local Setup

1. Clone repository
2. Install dependencies
3. Configure environment variables
4. Import database
5. Start servers

See `📚_HYPER-V_DEPLOYMENT_GUIDE_COMPLETE.md` for detailed instructions.

## 📁 Project Structure

- `KWise-Backend/` - Node.js Express backend
- `K-Wise/` - React frontend
- `.github/` - GitHub workflows & instructions

## 🔧 Tech Stack

**Backend:** Node.js, Express, PostgreSQL, Socket.IO, Ollama AI  
**Frontend:** React, Tailwind CSS, shadcn-ui, Radix UI

## 📄 License

Private - All Rights Reserved
```

### Step 1.4: Create .env.example Files

**KWise-Backend/.env.example:**

```dotenv
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=KWiseDB
DB_USER=postgres
DB_PASSWORD=your_password_here

# Gmail Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password-here

# Application Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=change-this-to-secure-random-string
JWT_EXPIRES_IN=7d

# AI Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:1.5b
AI_ENABLED=true
```

**K-Wise/.env.example:**

```dotenv
HOST=0.0.0.0
PORT=3000
REACT_APP_BACKEND_PORT=5000
REACT_APP_API_URL=
REACT_APP_SERVER_URL=
REACT_APP_LOCAL_API_URL=http://localhost:5000/api
REACT_APP_LOCAL_SERVER_URL=http://localhost:5000
```

### Step 1.5: Stage and Commit

```powershell
# Add .gitignore files
git add .gitignore
git add KWise-Backend/.gitignore
git add K-Wise/.gitignore

# Add .env.example files (NOT .env)
git add KWise-Backend/.env.example
git add K-Wise/.env.example

# Add all source code
git add .

# Check what will be committed (should NOT include .env, node_modules, etc.)
git status

# Commit
git commit -m "Initial commit: K-Wise Admin System

- Backend: Node.js + Express + PostgreSQL + Ollama AI
- Frontend: React + Tailwind CSS + shadcn-ui
- Features: AI compatibility checking, queue management, real-time updates
- Database schema with 60+ migration files
- Comprehensive documentation included"
```

### Step 1.6: Create GitHub Repository

**Option A: Via GitHub Web Interface**

1. Go to https://github.com/new
2. Repository name: `k-wise-admin-system`
3. Description: "PC parts e-commerce platform with AI-powered compatibility checking"
4. **Private** repository (recommended)
5. Do NOT initialize with README, .gitignore, or license
6. Click "Create repository"

**Option B: Via GitHub CLI**

```powershell
# Install GitHub CLI first: winget install GitHub.cli

# Authenticate
gh auth login

# Create repository
gh repo create k-wise-admin-system --private --description "PC parts e-commerce platform with AI-powered compatibility checking"
```

### Step 1.7: Push to GitHub

```powershell
# Add remote
git remote add origin https://github.com/YOUR_USERNAME/k-wise-admin-system.git

# Push to main branch
git branch -M main
git push -u origin main
```

### Step 1.8: Create Production Branch

```powershell
# Create production branch for VM
git checkout -b production
git push -u origin production

# Return to main
git checkout main
```

---

## 💾 PHASE 2: DATABASE BACKUP & EXPORT

### Step 2.1: Export Database Schema

```powershell
# Export schema only (structure without data)
$env:PGPASSWORD = "humbleludwig13"
pg_dump -U postgres -d KWiseDB -h localhost -p 5432 --schema-only --no-owner --no-privileges -f "KWiseDB_schema_export.sql"

# Verify file
Get-Item "KWiseDB_schema_export.sql"
```

### Step 2.2: Export Database Data

```powershell
# Export data only
$env:PGPASSWORD = "humbleludwig13"
pg_dump -U postgres -d KWiseDB -h localhost -p 5432 --data-only --no-owner --no-privileges -f "KWiseDB_data_export.sql"

# Verify file
Get-Item "KWiseDB_data_export.sql"
```

### Step 2.3: Export Complete Database

```powershell
# Full backup (schema + data)
$env:PGPASSWORD = "humbleludwig13"
pg_dump -U postgres -d KWiseDB -h localhost -p 5432 --no-owner --no-privileges -f "KWiseDB_full_backup_$(Get-Date -Format 'yyyy-MM-dd').sql"

# Compress backup
Compress-Archive -Path "KWiseDB_full_backup_*.sql" -DestinationPath "KWiseDB_backup.zip"
```

### Step 2.4: Upload Database Backup

**Option 1: GitHub Releases (Recommended for large files)**

```powershell
# Create a release
gh release create v1.0.0-db-backup `
  --title "Database Backup - Dec 10, 2025" `
  --notes "Full database backup for VM deployment" `
  KWiseDB_backup.zip
```

**Option 2: Cloud Storage**

- Upload to Google Drive / OneDrive / Dropbox
- Share link in repository README
- Download directly to VM

**Option 3: Direct Transfer**

- Use SCP to transfer to VM
- Use shared folder in Hyper-V

---

## 🖥️ PHASE 3: VIRTUAL MACHINE SETUP

### Step 3.1: Verify VM Specifications

**Minimum VM Specs (Based on your higher-spec VM):**

- **CPU:** 12+ cores (recommended 16)
- **RAM:** 32GB+ (recommended 64GB for AI workload)
- **Storage:** 500GB+ NVMe SSD (recommended 1TB+)
- **GPU:** (Optional) For Ollama AI acceleration
- **Network:** Bridged adapter for ZeroTier

**Check VM Resources:**

```powershell
# On VM, check system info
systeminfo | findstr /C:"Processor" /C:"Total Physical Memory"
Get-PSDrive C | Select-Object Used,Free,@{Name='Total';Expression={$_.Used+$_.Free}}
```

### Step 3.2: Install Core Software

**1. Install Git**

```powershell
# Download and install Git for Windows
winget install Git.Git

# Verify installation
git --version
```

**2. Install Node.js 22.x LTS**

```powershell
# Install Node.js
winget install OpenJS.NodeJS.LTS

# Verify installation
node --version  # Should be v22.14.0+
npm --version   # Should be 10.x+
```

**3. Verify PostgreSQL**

```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# If not running, start it
Start-Service postgresql-x64-15

# Verify PostgreSQL version
psql --version
```

**4. Install VS Code Extensions**

- PostgreSQL (cweijan.vscode-postgresql-client2)
- GitLens (eamodio.gitlens)
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- React snippets (dsznajder.es7-react-js-snippets)

### Step 3.3: Configure Git on VM

```powershell
# Configure Git credentials
git config --global user.name "Gabriel Ludwig Rivera"
git config --global user.email "ludwig.rivera26@gmail.com"

# Configure credential helper (cache for 1 day)
git config --global credential.helper 'cache --timeout=86400'

# Or use Windows Credential Manager
git config --global credential.helper manager-core
```

---

## 📥 PHASE 4: CLONE REPOSITORY TO VM

### Step 4.1: Clone Repository

```powershell
# Navigate to desired location
cd C:\Projects  # Or your preferred directory
mkdir -p C:\Projects
cd C:\Projects

# Clone repository
git clone https://github.com/YOUR_USERNAME/k-wise-admin-system.git
cd k-wise-admin-system

# Verify clone
git status
git branch -a  # Should show main and production branches
```

### Step 4.2: Checkout Production Branch

```powershell
# Switch to production branch
git checkout production

# Pull latest changes
git pull origin production
```

### Step 4.3: Verify File Structure

```powershell
# Check directory structure
Get-ChildItem -Recurse -Directory | Select-Object FullName | Format-Table -AutoSize

# Check for critical files
Test-Path "KWise-Backend\package.json"
Test-Path "K-Wise\package.json"
Test-Path "KWise-Backend\.env.example"
```

---

## 🔧 PHASE 5: INSTALL DEPENDENCIES

### Step 5.1: Install Backend Dependencies

```powershell
# Navigate to backend
cd KWise-Backend

# Install dependencies
npm install

# Verify installation
npm list --depth=0

# Check for vulnerabilities (optional)
npm audit
```

**Expected Installation Time:** 5-10 minutes

**Key Backend Dependencies:**

- express (4.18.2)
- pg (8.14.1) - PostgreSQL client
- socket.io (4.8.1)
- bcrypt (5.1.1)
- jsonwebtoken (9.0.2)
- nodemailer (7.0.5)
- redis (5.8.2)
- winston (3.17.0)

### Step 5.2: Install Frontend Dependencies

```powershell
# Navigate to frontend
cd ..\K-Wise

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

**Expected Installation Time:** 3-5 minutes

**Key Frontend Dependencies:**

- react (18.2.0)
- react-router-dom (7.1.5)
- axios (1.11.0)
- tailwindcss (4.1.13)
- radix-ui components

### Step 5.3: Global Package Installation

```powershell
# Install PM2 for process management
npm install -g pm2

# Install Serve for production frontend
npm install -g serve

# Verify
pm2 --version
serve --version
```

---

## 🤖 PHASE 6: OLLAMA AI INSTALLATION

### Step 6.1: Install Ollama

```powershell
# Download and install Ollama for Windows
winget install Ollama.Ollama

# Or download manually from: https://ollama.ai/download/windows

# Verify installation
ollama --version
```

### Step 6.2: Pull DeepSeek R1 Model

```powershell
# Pull the 1.5B parameter model (recommended for 16GB VRAM)
ollama pull deepseek-r1:1.5b

# If VM has high-end GPU (24GB+ VRAM), use 7B model
# ollama pull deepseek-r1:7b

# Verify model installation
ollama list
```

**Model Download Size:**

- `deepseek-r1:1.5b` - ~1.2GB
- `deepseek-r1:7b` - ~4.7GB

**Expected Download Time:** 5-15 minutes (depending on internet speed)

### Step 6.3: Test Ollama Service

```powershell
# Start Ollama service
ollama serve

# In a new terminal, test the model
ollama run deepseek-r1:1.5b "What is PC compatibility?"

# Expected: AI response about PC component compatibility
```

### Step 6.4: Configure Ollama as Windows Service

**Create Ollama service script:**

```powershell
# Create startup script
$scriptPath = "C:\Projects\k-wise-admin-system\KWise-Backend\scripts\start-ollama.ps1"
@"
# Start Ollama service
Write-Host "Starting Ollama service..." -ForegroundColor Cyan
Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
Start-Sleep -Seconds 3
Write-Host "Ollama service started on http://localhost:11434" -ForegroundColor Green
"@ | Out-File -FilePath $scriptPath -Encoding UTF8

# Test script
powershell -ExecutionPolicy Bypass -File $scriptPath
```

---

## 💾 PHASE 7: DATABASE IMPORT

### Step 7.1: Create Database

```powershell
# Connect to PostgreSQL
$env:PGPASSWORD = "your_vm_postgres_password"
psql -U postgres -h localhost

# In psql:
CREATE DATABASE "KWiseDB";
\c KWiseDB
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
\q
```

### Step 7.2: Import Database Backup

**Option 1: Import from Full Backup**

```powershell
# Download backup from GitHub release
gh release download v1.0.0-db-backup --pattern "KWiseDB_backup.zip"

# Extract backup
Expand-Archive -Path "KWiseDB_backup.zip" -DestinationPath "."

# Import database
$env:PGPASSWORD = "your_vm_postgres_password"
psql -U postgres -d KWiseDB -h localhost -f "KWiseDB_full_backup_2025-12-10.sql"
```

**Option 2: Import Schema + Data Separately**

```powershell
# Import schema first
psql -U postgres -d KWiseDB -h localhost -f "KWiseDB_schema_export.sql"

# Then import data
psql -U postgres -d KWiseDB -h localhost -f "KWiseDB_data_export.sql"
```

### Step 7.3: Verify Database Import

```powershell
# Check tables
psql -U postgres -d KWiseDB -h localhost -c "\dt"

# Check row counts
psql -U postgres -d KWiseDB -h localhost -c "
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
"

# Test query
psql -U postgres -d KWiseDB -h localhost -c "SELECT COUNT(*) FROM pc_parts;"
```

### Step 7.4: Run Migrations (if needed)

```powershell
# Navigate to backend
cd C:\Projects\k-wise-admin-system\KWise-Backend

# Run any pending migrations
node migrations/run-all-migrations.js

# Verify
psql -U postgres -d KWiseDB -h localhost -c "SELECT * FROM migrations ORDER BY id;"
```

---

## 🔑 PHASE 8: ENVIRONMENT CONFIGURATION

### Step 8.1: Configure Backend Environment

```powershell
# Navigate to backend
cd C:\Projects\k-wise-admin-system\KWise-Backend

# Copy example file
Copy-Item .env.example .env

# Edit .env file
notepad .env
```

**Update .env with VM-specific values:**

```dotenv
# Database Configuration (VM PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=KWiseDB
DB_USER=postgres
DB_PASSWORD=your_vm_postgres_password_here

# Gmail Configuration (IMPORTANT: Use your actual credentials)
GMAIL_USER=ludwig.rivera26@gmail.com
GMAIL_APP_PASSWORD=cjkivieyfacqruyy

# Application Configuration
PORT=5000
NODE_ENV=production  # Changed from development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=generate-new-secure-random-string-here-min-32-chars
JWT_EXPIRES_IN=7d

# AI Configuration (VM Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:1.5b
AI_ENABLED=true
AI_FALLBACK_ENABLED=true
AI_DEBUG=false  # Changed from true for production
```

**Generate Secure JWT Secret:**

```powershell
# Generate random 64-character string
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)
Write-Host "JWT_SECRET=$secret"
```

### Step 8.2: Configure Frontend Environment

```powershell
# Navigate to frontend
cd ..\K-Wise

# Copy example file
Copy-Item .env.example .env

# Edit .env file
notepad .env
```

**Update .env:**

```dotenv
HOST=0.0.0.0
PORT=3000
REACT_APP_BACKEND_PORT=5000

# For VM local testing
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SERVER_URL=http://localhost:5000

# For network access (ZeroTier)
# REACT_APP_API_URL=http://YOUR_ZEROTIER_IP:5000/api
# REACT_APP_SERVER_URL=http://YOUR_ZEROTIER_IP:5000
```

### Step 8.3: Secure .env Files

```powershell
# Set file permissions (Windows)
icacls "C:\Projects\k-wise-admin-system\KWise-Backend\.env" /inheritance:r /grant:r "$env:USERNAME:(R,W)"
icacls "C:\Projects\k-wise-admin-system\K-Wise\.env" /inheritance:r /grant:r "$env:USERNAME:(R,W)"

# Verify .env is not tracked by Git
cd C:\Projects\k-wise-admin-system
git status  # .env should NOT appear
```

---

## 🚀 PHASE 9: BUILD & DEPLOY

### Step 9.1: Build Frontend

```powershell
# Navigate to frontend
cd C:\Projects\k-wise-admin-system\K-Wise

# Build production bundle
npm run build

# Verify build
Test-Path "build\index.html"
Test-Path "build\static\js\main.*.js"

# Check build size
Get-ChildItem -Path build -Recurse | Measure-Object -Property Length -Sum | Select-Object @{Name="Size(MB)";Expression={[math]::Round($_.Sum/1MB,2)}}
```

**Expected Build Time:** 2-5 minutes  
**Expected Build Size:** 5-10 MB

### Step 9.2: Test Backend

```powershell
# Navigate to backend
cd ..\KWise-Backend

# Start backend in development mode (for testing)
npm run dev

# In browser, check:
# http://localhost:5000/api/health
# http://localhost:5000/api/pc-parts

# Stop with Ctrl+C
```

### Step 9.3: Configure PM2 for Production

```powershell
# Create PM2 ecosystem file
cd C:\Projects\k-wise-admin-system

@"
module.exports = {
  apps: [
    {
      name: 'kwise-backend',
      script: 'KWise-Backend/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: 'logs/backend-error.log',
      out_file: 'logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'kwise-frontend',
      script: 'serve',
      args: '-s K-Wise/build -l 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'logs/frontend-error.log',
      out_file: 'logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
"@ | Out-File -FilePath ecosystem.config.js -Encoding UTF8
```

### Step 9.4: Start Services with PM2

```powershell
# Create logs directory
mkdir logs -Force

# Start applications
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Configure PM2 to start on boot
pm2 startup

# Follow the command PM2 outputs
```

### Step 9.5: Verify Deployment

```powershell
# Check PM2 status
pm2 status

# View logs
pm2 logs kwise-backend --lines 50
pm2 logs kwise-frontend --lines 50

# Monitor in real-time
pm2 monit

# Test endpoints
curl http://localhost:5000/api/health
curl http://localhost:3000
```

---

## 🌐 PHASE 10: ZEROTIER NETWORK SETUP (OPTIONAL)

### Step 10.1: Install ZeroTier on VM

```powershell
# Download and install ZeroTier
winget install ZeroTier.ZeroTierOne

# Or download from: https://www.zerotier.com/download/
```

### Step 10.2: Join Your Network

```powershell
# Join network (use the network ID from the screenshot: d3ecf5726d3cecb5)
zerotier-cli join d3ecf5726d3cecb5

# Check status
zerotier-cli listnetworks
```

### Step 10.3: Authorize Device in Web Dashboard

1. Go to https://my.zerotier.com/network/d3ecf5726d3cecb5
2. Find your VM in "Members" section
3. Check the "Auth?" checkbox
4. Note the assigned IP (e.g., 10.147.17.X)

### Step 10.4: Update Frontend for Remote Access

```powershell
# Edit frontend .env
cd C:\Projects\k-wise-admin-system\K-Wise
notepad .env
```

**Update with ZeroTier IP:**

```dotenv
REACT_APP_API_URL=http://10.147.17.X:5000/api
REACT_APP_SERVER_URL=http://10.147.17.X:5000
```

**Rebuild frontend:**

```powershell
npm run build
pm2 restart kwise-frontend
```

---

## 🔄 BRANCH WORKFLOW STRATEGY

### Main Branch (Local Development)

- **Purpose:** Active development on local machine
- **Usage:** Feature development, testing, debugging
- **Commits:** Frequent commits during development

### Production Branch (VM Deployment)

- **Purpose:** Stable production code running on VM
- **Usage:** Tested, stable code for production environment
- **Commits:** Only merge tested and verified code

### Workflow Example

**On Local Machine:**

```powershell
# Work on main branch
git checkout main

# Make changes
# ... code editing ...

# Commit changes
git add .
git commit -m "Add new feature: X"

# Push to GitHub
git push origin main

# When ready for production, merge to production
git checkout production
git merge main
git push origin production
```

**On VM:**

```powershell
# Pull latest production code
cd C:\Projects\k-wise-admin-system
git checkout production
git pull origin production

# Restart services
pm2 restart all

# Verify deployment
pm2 logs --lines 50
```

### Hotfix Workflow

**For urgent production fixes:**

```powershell
# On VM, create hotfix branch
git checkout production
git checkout -b hotfix/critical-bug-fix

# Make fixes
# ... code editing ...

# Commit and push
git add .
git commit -m "Hotfix: Critical bug in X"
git push origin hotfix/critical-bug-fix

# Merge to production
git checkout production
git merge hotfix/critical-bug-fix
git push origin production

# Also merge back to main
git checkout main
git merge hotfix/critical-bug-fix
git push origin main
```

---

## 📋 DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] Local codebase tested and working
- [ ] All .env files excluded from Git
- [ ] .gitignore files configured correctly
- [ ] Database backup created and tested
- [ ] GitHub repository created
- [ ] VM has sufficient resources
- [ ] VS Code and PostgreSQL installed on VM

### GitHub Setup

- [ ] .gitignore files created
- [ ] .env.example files created
- [ ] README.md created
- [ ] Initial commit made
- [ ] Repository created on GitHub
- [ ] Code pushed to main branch
- [ ] Production branch created

### Database Migration

- [ ] Database backup exported
- [ ] Backup uploaded to GitHub release or cloud
- [ ] KWiseDB database created on VM
- [ ] Extensions installed (uuid-ossp, pg_trgm, btree_gin)
- [ ] Schema imported successfully
- [ ] Data imported successfully
- [ ] Table counts verified
- [ ] Sample queries tested

### VM Installation

- [ ] Git installed and configured
- [ ] Node.js 22.x installed
- [ ] PostgreSQL verified running
- [ ] Repository cloned to VM
- [ ] Production branch checked out
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Global packages installed (PM2, serve)

### Ollama AI Setup

- [ ] Ollama installed on VM
- [ ] DeepSeek R1 model pulled
- [ ] Model tested successfully
- [ ] Ollama service configured to auto-start
- [ ] Backend AI integration tested

### Configuration

- [ ] Backend .env created from .env.example
- [ ] Database credentials updated in .env
- [ ] JWT secret generated and configured
- [ ] Gmail credentials configured
- [ ] Ollama settings configured
- [ ] Frontend .env created from .env.example
- [ ] API URLs configured
- [ ] .env file permissions secured

### Build & Deployment

- [ ] Frontend built successfully
- [ ] Build size verified
- [ ] Backend tested in dev mode
- [ ] PM2 ecosystem file created
- [ ] PM2 services started
- [ ] PM2 configured for auto-start
- [ ] All services running (pm2 status)
- [ ] Logs checked for errors
- [ ] Health endpoints tested
- [ ] Frontend accessible
- [ ] Backend API accessible

### Network Access (Optional)

- [ ] ZeroTier installed on VM
- [ ] Joined KWise Network
- [ ] Device authorized in dashboard
- [ ] ZeroTier IP assigned
- [ ] Frontend updated with ZeroTier IP
- [ ] Remote access tested

### Final Verification

- [ ] All PM2 services green
- [ ] No errors in logs
- [ ] Database queries working
- [ ] AI compatibility checking working
- [ ] User authentication working
- [ ] Real-time updates working
- [ ] Email notifications working
- [ ] Queue management working
- [ ] Image uploads working
- [ ] Admin functions working

---

## 🔧 TROUBLESHOOTING GUIDE

### Issue: Git Clone Fails

**Symptoms:**

```
fatal: Authentication failed
```

**Solutions:**

```powershell
# Option 1: Use HTTPS with token
# Generate token: https://github.com/settings/tokens
git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/k-wise-admin-system.git

# Option 2: Configure credential helper
git config --global credential.helper manager-core
git clone https://github.com/YOUR_USERNAME/k-wise-admin-system.git
```

### Issue: npm install Fails

**Symptoms:**

```
npm ERR! network timeout
npm ERR! permission denied
```

**Solutions:**

```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Reinstall
npm install

# If permission issues, run as Administrator
Start-Process powershell -Verb RunAs
```

### Issue: Database Import Fails

**Symptoms:**

```
psql: error: connection to server failed
ERROR: relation "table_name" already exists
```

**Solutions:**

```powershell
# Check PostgreSQL service
Get-Service postgresql*
Start-Service postgresql-x64-15

# Drop and recreate database if needed
psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS \"KWiseDB\";"
psql -U postgres -h localhost -c "CREATE DATABASE \"KWiseDB\";"

# Import again
psql -U postgres -d KWiseDB -h localhost -f "KWiseDB_full_backup.sql"
```

### Issue: Ollama Service Not Running

**Symptoms:**

```
Error: Failed to connect to Ollama service
```

**Solutions:**

```powershell
# Start Ollama manually
ollama serve

# Check if port 11434 is in use
netstat -ano | findstr :11434

# Kill process if needed
Stop-Process -Id PID_NUMBER -Force

# Restart Ollama
ollama serve
```

### Issue: Backend Won't Start

**Symptoms:**

```
Error: Cannot find module 'xyz'
Error: connect ECONNREFUSED ::1:5432
```

**Solutions:**

```powershell
# Reinstall dependencies
cd KWise-Backend
npm install

# Check .env file exists and is configured
Test-Path .env
Get-Content .env | Select-String "DB_HOST|DB_PASSWORD"

# Check PostgreSQL connection
psql -U postgres -d KWiseDB -h localhost -c "SELECT 1;"

# Check logs
Get-Content logs/error.log -Tail 50
```

### Issue: Frontend Build Fails

**Symptoms:**

```
FATAL ERROR: Reached heap limit
Error: ENOSPC: no space left on device
```

**Solutions:**

```powershell
# Increase Node memory limit
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build

# Clean build directory
Remove-Item -Recurse -Force build
npm run build

# Check disk space
Get-PSDrive C
```

### Issue: PM2 Services Keep Restarting

**Symptoms:**

```
pm2 status shows "errored" or constant restarts
```

**Solutions:**

```powershell
# Check logs
pm2 logs kwise-backend --err --lines 100

# Check for port conflicts
netstat -ano | findstr :5000
netstat -ano | findstr :3000

# Restart services
pm2 restart all

# Reset PM2
pm2 kill
pm2 start ecosystem.config.js
pm2 save
```

### Issue: Cannot Access via ZeroTier

**Symptoms:**

```
Connection timeout
ERR_CONNECTION_REFUSED
```

**Solutions:**

```powershell
# Check ZeroTier status
zerotier-cli listnetworks

# Check if device is authorized
# Go to: https://my.zerotier.com/network/d3ecf5726d3cecb5

# Check Windows Firewall
# Allow ports 5000, 3000, 9993 (ZeroTier)
New-NetFirewallRule -DisplayName "K-Wise Backend" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "K-Wise Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Restart ZeroTier service
Restart-Service ZeroTierOneService
```

---

## 📊 PERFORMANCE OPTIMIZATION

### PostgreSQL Optimization for VM

```powershell
# Edit PostgreSQL config
notepad "C:\Program Files\PostgreSQL\15\data\postgresql.conf"
```

**Recommended Settings for 32GB RAM:**

```ini
# Memory
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 256MB
maintenance_work_mem = 2GB

# Checkpoints
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9
wal_buffers = 16MB
min_wal_size = 2GB
max_wal_size = 8GB

# Query Planner
random_page_cost = 1.1
effective_io_concurrency = 200

# Connections
max_connections = 200
```

**Restart PostgreSQL:**

```powershell
Restart-Service postgresql-x64-15
```

### Node.js Optimization

```javascript
// Add to KWise-Backend/server.js at the top
process.env.UV_THREADPOOL_SIZE = 128;
```

### PM2 Cluster Mode (Optional)

```javascript
// Update ecosystem.config.js for multi-instance
{
  name: 'kwise-backend',
  script: 'KWise-Backend/server.js',
  instances: 4,  // Changed from 1
  exec_mode: 'cluster',  // Added
  // ... rest of config
}
```

---

## 🎯 SUCCESS CRITERIA

Your deployment is successful when:

### ✅ Backend Verification

- [ ] `http://localhost:5000/api/health` returns `{"status":"healthy"}`
- [ ] `http://localhost:5000/api/pc-parts` returns product data
- [ ] WebSocket connects (check browser console)
- [ ] AI compatibility check works
- [ ] User authentication works
- [ ] Database queries execute < 100ms

### ✅ Frontend Verification

- [ ] `http://localhost:3000` loads without errors
- [ ] All pages navigate correctly
- [ ] Product images display
- [ ] Cart functionality works
- [ ] Real-time queue updates work
- [ ] No console errors

### ✅ Integration Verification

- [ ] Login/logout works
- [ ] Product search works
- [ ] AI recommendations work
- [ ] Order creation works
- [ ] Queue management works
- [ ] Email notifications sent

### ✅ Production Verification

- [ ] PM2 shows all services online
- [ ] Services auto-restart after VM reboot
- [ ] No memory leaks (check with `pm2 monit`)
- [ ] Response times < 200ms
- [ ] Error logs clean
- [ ] Database connections stable

### ✅ Network Verification (if using ZeroTier)

- [ ] Can access from local machine
- [ ] Can access from mobile device
- [ ] Latency < 100ms
- [ ] All features work remotely

---

## 📚 ADDITIONAL RESOURCES

### Documentation Files

- `📚_HYPER-V_DEPLOYMENT_GUIDE_COMPLETE.md` - Original deployment guide
- `.github/copilot-instructions.md` - Development guidelines
- `README.md` - Project overview
- `KWise-Backend/README.md` - Backend documentation
- `K-Wise/README.md` - Frontend documentation

### Useful Commands

**Git:**

```powershell
git status                    # Check status
git log --oneline -10         # View commit history
git diff main production      # Compare branches
git pull origin production    # Update from GitHub
git push origin production    # Push to GitHub
```

**PM2:**

```powershell
pm2 status                    # Service status
pm2 logs                      # View all logs
pm2 monit                     # Real-time monitoring
pm2 restart all               # Restart all services
pm2 stop all                  # Stop all services
pm2 delete all                # Remove all services
pm2 save                      # Save current state
```

**PostgreSQL:**

```powershell
psql -U postgres -d KWiseDB   # Connect to database
\dt                           # List tables
\d table_name                 # Describe table
\q                            # Quit
```

**Node.js:**

```powershell
node --version                # Check Node version
npm list --depth=0            # List installed packages
npm outdated                  # Check for updates
npm audit                     # Security audit
```

### Support Contacts

- **Developer:** Gabriel Ludwig Rivera
- **Email:** ludwig.rivera26@gmail.com
- **GitHub:** https://github.com/YOUR_USERNAME/k-wise-admin-system

---

## 🎉 CONCLUSION

Congratulations! You now have:

- ✅ Codebase version-controlled on GitHub
- ✅ Production-ready VM deployment
- ✅ Branch strategy for development and production
- ✅ AI-powered compatibility system running
- ✅ Real-time admin system operational
- ✅ Secure remote access (optional via ZeroTier)

**Next Steps:**

1. Test all features thoroughly
2. Monitor performance and logs
3. Set up automated backups
4. Configure monitoring (e.g., Prometheus + Grafana)
5. Implement CI/CD pipelines (GitHub Actions)

**Estimated Total Deployment Time:** 2-3 hours

---

**Document Version:** 1.0  
**Last Updated:** December 10, 2025  
**Status:** ✅ Ready for Deployment
