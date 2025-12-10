# ⚡ K-WISE VM QUICK SETUP GUIDE

**Current Status:** Repository cloned to VM, PostgreSQL installed  
**Missing:** Database setup, Node modules, Ollama AI  
**Date:** December 10, 2025

---

## 🎯 CURRENT SITUATION

You have:
- ✅ Virtual Machine running
- ✅ Codebase cloned from GitHub
- ✅ PostgreSQL installed on VM
- ❌ Database (KWiseDB) not created yet
- ❌ Node modules not installed
- ❌ Ollama R1-7b model not installed

---

## 📋 STEP-BY-STEP SETUP

### STEP 1: VERIFY SYSTEM REQUIREMENTS

```powershell
# Check Node.js version (need 18+)
node --version

# Check npm version
npm --version

# Check PostgreSQL service
Get-Service postgresql*

# If Node.js not installed:
winget install OpenJS.NodeJS.LTS
```

---

### STEP 2: INSTALL BACKEND DEPENDENCIES

```powershell
# Navigate to backend folder
cd "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\KWise-Backend"

# Install all dependencies
npm install

# This will install:
# - express, pg, socket.io, bcrypt, jsonwebtoken
# - nodemailer, redis, winston, and 40+ more packages
# Expected time: 5-10 minutes
```

**Expected output:**
```
added 245 packages in 8m
```

---

### STEP 3: INSTALL FRONTEND DEPENDENCIES

```powershell
# Navigate to frontend folder
cd "..\K-Wise"

# Install all dependencies
npm install

# This will install:
# - react, react-router-dom, axios, tailwindcss
# - radix-ui components, and 20+ more packages
# Expected time: 3-5 minutes
```

**Expected output:**
```
added 1423 packages in 5m
```

---

### STEP 4: SET UP POSTGRESQL DATABASE

```powershell
# Open PostgreSQL command line
# Note: You'll need your PostgreSQL password

# Option 1: Using psql command line
psql -U postgres

# Once in psql, run these commands:
```

```sql
-- Create the database
CREATE DATABASE "KWiseDB";

-- Connect to the new database
\c KWiseDB

-- Create required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Verify extensions
\dx

-- Exit psql
\q
```

---

### STEP 5: IMPORT DATABASE SCHEMA

You need to get your database backup from your local machine. Here are your options:

#### Option A: Export from Local Machine (RECOMMENDED)

**On your LOCAL machine (where the working database is):**

```powershell
# Set password environment variable
$env:PGPASSWORD = "humbleludwig13"

# Export full database
pg_dump -U postgres -d KWiseDB -h localhost -p 5432 --no-owner --no-privileges -f "C:\Temp\KWiseDB_export.sql"

# Compress the file
Compress-Archive -Path "C:\Temp\KWiseDB_export.sql" -DestinationPath "C:\Temp\KWiseDB_export.zip"

# Copy to USB drive or cloud storage
# OR use GitHub release
# OR transfer via network
```

#### Option B: Use GitHub Release

**On local machine:**

```powershell
# Install GitHub CLI if not already installed
winget install GitHub.cli

# Login to GitHub
gh auth login

# Create release with database backup
cd "c:\Users\Ludwig Rivera\Downloads\K-Wise Final 2"
gh release create v1.0.0-database `
  --title "Database Backup - Dec 10, 2025" `
  --notes "Full database export for VM deployment" `
  "C:\Temp\KWiseDB_export.zip"
```

**On VM:**

```powershell
# Download the backup
cd "c:\Users\PCWISE\Documents\KWise Final\KWise-Final"
gh release download v1.0.0-database --pattern "KWiseDB_export.zip"

# Extract the backup
Expand-Archive -Path "KWiseDB_export.zip" -DestinationPath "."

# Import into PostgreSQL
$env:PGPASSWORD = "your_vm_postgres_password"
psql -U postgres -d KWiseDB -h localhost -f "KWiseDB_export.sql"
```

#### Option C: Direct Network Transfer

If both machines are on same network:

```powershell
# On LOCAL machine - share the backup file
# Then on VM - copy from network share

Copy-Item "\\LOCAL_PC_IP\ShareFolder\KWiseDB_export.sql" -Destination "C:\Temp\"

# Import
psql -U postgres -d KWiseDB -h localhost -f "C:\Temp\KWiseDB_export.sql"
```

---

### STEP 6: VERIFY DATABASE IMPORT

```powershell
# Connect to database
psql -U postgres -d KWiseDB

# Check tables exist
\dt

# Expected output should show tables like:
# - users
# - pc_parts
# - orders
# - compatibility_rules
# - queue_management
# etc.

# Check some data
SELECT COUNT(*) FROM pc_parts;
SELECT COUNT(*) FROM compatibility_rules;
SELECT COUNT(*) FROM users;

# Exit
\q
```

---

### STEP 7: INSTALL OLLAMA AI SERVICE

```powershell
# Download and install Ollama for Windows
winget install Ollama.Ollama

# OR download manually from:
# https://ollama.ai/download/windows

# Verify installation
ollama --version
```

---

### STEP 8: PULL DEEPSEEK R1-7B MODEL

```powershell
# Pull the model (this will download ~4.7GB)
ollama pull deepseek-r1:7b

# Expected output:
# pulling manifest
# pulling layers...
# [████████████████] 100%
# success

# Verify model is installed
ollama list

# Test the model
ollama run deepseek-r1:7b "What is PC compatibility?"
```

**Note:** Download time depends on internet speed (10-30 minutes for 4.7GB)

---

### STEP 9: CONFIGURE ENVIRONMENT VARIABLES

#### Backend .env Configuration

```powershell
# Navigate to backend
cd "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\KWise-Backend"

# Create .env file from example
Copy-Item .env.example .env

# Edit the .env file
notepad .env
```

**Update these values in .env:**

```ini
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=KWiseDB
DB_USER=postgres
DB_PASSWORD=your_vm_postgres_password_here

# Gmail Configuration (use your actual credentials)
GMAIL_USER=ludwig.rivera26@gmail.com
GMAIL_APP_PASSWORD=cjkivieyfacqruyy

# Application Configuration
PORT=5000
NODE_ENV=production
FRONTEND_URL=http://localhost:3000
JWT_SECRET=GENERATE_SECURE_32_CHAR_STRING_HERE
JWT_EXPIRES_IN=7d

# AI Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:7b
AI_ENABLED=true
AI_FALLBACK_ENABLED=true
AI_DEBUG=false
```

**Generate secure JWT secret:**

```powershell
# Run this to generate a secure secret
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)
Write-Host "Use this for JWT_SECRET: $secret"
```

#### Frontend .env Configuration

```powershell
# Navigate to frontend
cd "..\K-Wise"

# Create .env file
Copy-Item .env.example .env

# Edit the .env file
notepad .env
```

**Update .env:**

```ini
HOST=0.0.0.0
PORT=3000
REACT_APP_BACKEND_PORT=5000
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SERVER_URL=http://localhost:5000
```

---

### STEP 10: START OLLAMA SERVICE

```powershell
# Start Ollama in background
Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden

# Wait a few seconds
Start-Sleep -Seconds 3

# Verify it's running
Invoke-WebRequest -Uri "http://localhost:11434" -Method Get
```

---

### STEP 11: TEST BACKEND

```powershell
# Navigate to backend
cd "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\KWise-Backend"

# Start backend in development mode
npm run dev

# Expected output:
# Server running on port 5000
# Connected to database: KWiseDB
# Ollama AI initialized
```

**In another terminal, test the API:**

```powershell
# Test health endpoint
Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method Get

# Test products endpoint
Invoke-WebRequest -Uri "http://localhost:5000/api/pc-parts" -Method Get
```

---

### STEP 12: BUILD AND START FRONTEND

```powershell
# Navigate to frontend
cd "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\K-Wise"

# Build production version
npm run build

# Expected output:
# Creating an optimized production build...
# Compiled successfully!
# File sizes after gzip:
#   200 KB  build/static/js/main.[hash].js

# Serve the build
npx serve -s build -l 3000
```

---

### STEP 13: VERIFY EVERYTHING WORKS

**Open browser and test:**

1. **Frontend:** http://localhost:3000
   - Should load without errors
   - Check browser console for errors

2. **Backend API:** http://localhost:5000/api/health
   - Should return: `{"status":"healthy"}`

3. **Test Login:**
   - Go to http://localhost:3000/login
   - Try logging in with admin credentials

4. **Test AI Features:**
   - Go to admin panel
   - Test compatibility checker
   - Should work with Ollama AI

---

### STEP 14: INSTALL PM2 FOR PRODUCTION (OPTIONAL)

```powershell
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cd "c:\Users\PCWISE\Documents\KWise Final\KWise-Final"
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'kwise-backend',
      cwd: 'c:\\Users\\PCWISE\\Documents\\KWise Final\\KWise-Final\\KWise-Backend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: 'logs/backend-error.log',
      out_file: 'logs/backend-out.log'
    },
    {
      name: 'kwise-frontend',
      cwd: 'c:\\Users\\PCWISE\\Documents\\KWise Final\\KWise-Final\\K-Wise',
      script: 'npx',
      args: 'serve -s build -l 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      error_file: 'logs/frontend-error.log',
      out_file: 'logs/frontend-out.log'
    }
  ]
};
```

**Start with PM2:**

```powershell
# Create logs directory
mkdir logs

# Start applications
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs

# Save configuration
pm2 save

# Setup to start on boot
pm2 startup
```

---

## 🔧 TROUBLESHOOTING

### Issue: "pg_dump: command not found"

**Solution:**
```powershell
# Add PostgreSQL to PATH
$env:Path += ";C:\Program Files\PostgreSQL\15\bin"

# Or find your PostgreSQL installation
Get-ChildItem "C:\Program Files" -Filter "pg_dump.exe" -Recurse
```

### Issue: "npm install fails with permission errors"

**Solution:**
```powershell
# Run PowerShell as Administrator
Start-Process powershell -Verb RunAs

# Clear npm cache
npm cache clean --force

# Try install again
npm install
```

### Issue: "Cannot connect to PostgreSQL"

**Solution:**
```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# Start if not running
Start-Service postgresql-x64-15

# Test connection
psql -U postgres -c "SELECT version();"
```

### Issue: "Ollama model not found"

**Solution:**
```powershell
# Check installed models
ollama list

# Pull model again if missing
ollama pull deepseek-r1:7b

# Verify Ollama service is running
Test-NetConnection -ComputerName localhost -Port 11434
```

### Issue: "Frontend shows API errors"

**Solution:**
```powershell
# Check backend is running
Invoke-WebRequest -Uri "http://localhost:5000/api/health"

# Check CORS settings in backend
# Make sure FRONTEND_URL in .env matches frontend URL

# Check browser console for specific errors
```

---

## 📋 QUICK REFERENCE COMMANDS

### Start Everything

```powershell
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start Backend
cd "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\KWise-Backend"
npm run dev

# Terminal 3: Start Frontend
cd "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\K-Wise"
npx serve -s build -l 3000
```

### Stop Everything

```powershell
# Press Ctrl+C in each terminal

# Or kill processes
Get-Process -Name "node" | Stop-Process -Force
Get-Process -Name "ollama" | Stop-Process -Force
```

### Check Status

```powershell
# Check if services are running
Get-Process -Name "node" -ErrorAction SilentlyContinue
Get-Process -Name "ollama" -ErrorAction SilentlyContinue

# Test endpoints
Invoke-WebRequest -Uri "http://localhost:5000/api/health"
Invoke-WebRequest -Uri "http://localhost:3000"
Invoke-WebRequest -Uri "http://localhost:11434"
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Node.js installed (v18+)
- [ ] PostgreSQL installed and running
- [ ] Backend node_modules installed
- [ ] Frontend node_modules installed
- [ ] KWiseDB database created
- [ ] Database extensions installed
- [ ] Database schema imported
- [ ] Database data verified
- [ ] Ollama installed
- [ ] DeepSeek R1-7b model pulled
- [ ] Backend .env configured
- [ ] Frontend .env configured
- [ ] Ollama service running
- [ ] Backend starts without errors
- [ ] Frontend builds successfully
- [ ] All services accessible
- [ ] Login works
- [ ] AI features work

---

## 🎯 SUCCESS CRITERIA

Your VM is ready when:

✅ `http://localhost:5000/api/health` returns `{"status":"healthy"}`  
✅ `http://localhost:3000` loads the frontend  
✅ Can login to admin panel  
✅ Database queries work (products load)  
✅ AI compatibility checker works  
✅ No errors in browser console  
✅ No errors in backend logs

---

## 📞 NEXT STEPS

After successful setup:

1. **Test all features thoroughly**
2. **Set up automated backups**
3. **Configure Windows Firewall rules**
4. **Set up ZeroTier for remote access** (optional)
5. **Create system restore point**

---

**Document Version:** 1.0  
**Last Updated:** December 10, 2025  
**Status:** ✅ Ready for Use
