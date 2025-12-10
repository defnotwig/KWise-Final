# 🎯 K-WISE VM QUICK REFERENCE CARD

**Date:** December 10, 2025  
**Environment:** Virtual Machine (VM)

---

## ✅ ENVIRONMENT FILES CONFIGURED

### Backend `.env` Location
```
c:\Users\PCWISE\Documents\KWise Final\KWise-Final\KWise-Backend\.env
```

**Configured with:**
- ✅ Database: `KWiseDB` on `localhost:5432`
- ✅ User: `postgres` / Password: `humbleludwig13`
- ✅ Gmail: `ludwig.rivera26@gmail.com` (with app password)
- ✅ AI Model: `deepseek-r1:1.5b` (default, lower VRAM)
- ✅ JWT Secret: Configured
- ✅ Redis: Enabled on `localhost:6379`

### Frontend `.env` Location
```
c:\Users\PCWISE\Documents\KWise Final\KWise-Final\K-Wise\.env
```

**Configured with:**
- ✅ Backend API: `http://localhost:5000/api`
- ✅ Server URL: `http://localhost:5000`
- ✅ Port: `3000`

---

## 🚀 ONE-COMMAND COMPLETE SETUP

Run this single command to set up everything:

```powershell
powershell -ExecutionPolicy Bypass -File "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\scripts\complete-vm-setup.ps1"
```

**This will:**
1. ✅ Install all npm dependencies (backend + frontend)
2. ✅ Create PostgreSQL database (KWiseDB)
3. ✅ Import database backup (if found)
4. ✅ Install Ollama AI service
5. ✅ Download DeepSeek R1 models (1.5b AND 7b)
6. ✅ Build frontend for production
7. ✅ Create PM2 configuration
8. ✅ Generate startup scripts

**Setup Time:** ~20-45 minutes (depending on internet speed)

---

## 📦 DATABASE BACKUP LOCATION

The script will automatically look for your database backup:

```
c:\Users\PCWISE\Documents\KWise Final\KWise-Final\KWiseDB_full_backup_2025-12-10.sql
```

**If not found**, place your backup file there, or the script will prompt you for the location.

---

## 🤖 AI MODELS INCLUDED

The setup script downloads **BOTH** models:

### DeepSeek R1 1.5b (Recommended)
- **Size:** ~1.2GB
- **VRAM:** 4GB+ required
- **Speed:** Faster responses
- **Default model** in `.env`

### DeepSeek R1 7b (High Performance)
- **Size:** ~4.7GB
- **VRAM:** 16GB+ required
- **Speed:** Slower but more accurate
- **Switch to this** by editing `.env` if you have enough VRAM

**To switch models**, edit backend `.env`:
```ini
AI_MODEL=deepseek-r1:7b
OLLAMA_MODEL=deepseek-r1:7b
```

---

## 🎮 QUICK START COMMANDS

### Start All Services
```powershell
powershell -File "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\scripts\start-all.ps1"
```

### Stop All Services
```powershell
powershell -File "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\scripts\stop-all.ps1"
```

### Start Ollama Only
```powershell
powershell -File "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\scripts\start-ollama.ps1"
```

---

## 🔍 VERIFY DEPLOYMENT

### Test Backend API
```powershell
Invoke-WebRequest http://localhost:5000/api/health
```
**Expected:** `{"status":"healthy"}`

### Test Frontend
```powershell
Start-Process http://localhost:3000
```
**Expected:** K-Wise homepage loads

### Test Ollama AI
```powershell
ollama run deepseek-r1:1.5b "Hello"
```
**Expected:** AI response

### Check PM2 Status
```powershell
pm2 status
```
**Expected:**
```
│ kwise-backend  │ online │
│ kwise-frontend │ online │
```

### View Logs
```powershell
pm2 logs
```

---

## 📊 SERVICE ENDPOINTS

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main application |
| **Backend API** | http://localhost:5000/api | REST API |
| **Health Check** | http://localhost:5000/api/health | Backend status |
| **Ollama AI** | http://localhost:11434 | AI service |
| **PostgreSQL** | localhost:5432 | Database |
| **Redis** | localhost:6379 | Cache |

---

## 🛠️ PM2 MANAGEMENT

### View Status
```powershell
pm2 status
```

### View Logs (All)
```powershell
pm2 logs
```

### View Backend Logs Only
```powershell
pm2 logs kwise-backend
```

### View Frontend Logs Only
```powershell
pm2 logs kwise-frontend
```

### Restart All Services
```powershell
pm2 restart all
```

### Restart Backend Only
```powershell
pm2 restart kwise-backend
```

### Monitor in Real-Time
```powershell
pm2 monit
```

### Save PM2 Configuration
```powershell
pm2 save
```

### Configure Auto-Start on Boot
```powershell
pm2 startup
# Then run the command PM2 outputs
```

---

## 🗄️ DATABASE COMMANDS

### Connect to Database
```powershell
psql -U postgres -d KWiseDB
```

### List Tables
```sql
\dt
```

### Check Product Count
```sql
SELECT COUNT(*) FROM pc_parts;
```

### Check User Count
```sql
SELECT COUNT(*) FROM users;
```

### Exit psql
```sql
\q
```

### Import Database Backup
```powershell
$env:PGPASSWORD = "humbleludwig13"
psql -U postgres -d KWiseDB -h localhost -f "path\to\backup.sql"
```

---

## 🤖 OLLAMA COMMANDS

### List Installed Models
```powershell
ollama list
```

### Pull/Download Model
```powershell
ollama pull deepseek-r1:1.5b
ollama pull deepseek-r1:7b
```

### Test Model
```powershell
ollama run deepseek-r1:1.5b "What is PC compatibility?"
```

### Remove Model
```powershell
ollama rm deepseek-r1:7b
```

### Check Ollama Version
```powershell
ollama --version
```

---

## 🔧 TROUBLESHOOTING

### Backend Won't Start

**Check logs:**
```powershell
pm2 logs kwise-backend --lines 50
```

**Common fixes:**
```powershell
# Restart PostgreSQL
Restart-Service postgresql-x64-15

# Restart backend
pm2 restart kwise-backend

# Check .env file
notepad "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\KWise-Backend\.env"
```

### Frontend Shows API Errors

**Check backend is running:**
```powershell
pm2 status
Invoke-WebRequest http://localhost:5000/api/health
```

**Rebuild frontend:**
```powershell
cd "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\K-Wise"
npm run build
pm2 restart kwise-frontend
```

### Ollama Not Working

**Start Ollama:**
```powershell
powershell -File "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\scripts\start-ollama.ps1"
```

**Verify running:**
```powershell
Invoke-WebRequest http://localhost:11434
```

**Check model:**
```powershell
ollama list
```

### Database Connection Failed

**Check PostgreSQL service:**
```powershell
Get-Service postgresql*
Start-Service postgresql-x64-15
```

**Test connection:**
```powershell
psql -U postgres -d KWiseDB -c "SELECT 1;"
```

### Port Already in Use

**Find process using port 5000:**
```powershell
netstat -ano | findstr :5000
```

**Kill process:**
```powershell
Stop-Process -Id <PID> -Force
```

---

## 📁 IMPORTANT FILE LOCATIONS

### Configuration Files
- Backend .env: `KWise-Backend\.env`
- Frontend .env: `K-Wise\.env`
- PM2 config: `ecosystem.config.js`

### Scripts
- Complete setup: `scripts\complete-vm-setup.ps1`
- Start all: `scripts\start-all.ps1`
- Stop all: `scripts\stop-all.ps1`
- Start Ollama: `scripts\start-ollama.ps1`

### Logs
- Backend logs: `KWise-Backend\logs\backend-*.log`
- Frontend logs: `KWise-Backend\logs\frontend-*.log`
- PM2 logs: `~\.pm2\logs\`

### Build Output
- Frontend build: `K-Wise\build\`
- Node modules (backend): `KWise-Backend\node_modules\`
- Node modules (frontend): `K-Wise\node_modules\`

---

## 🎯 DEFAULT LOGIN CREDENTIALS

After database import, use these credentials:

**Admin Login:**
- Email: `admin@pcwise.com`
- Password: (check your database)

**Or create new admin via psql:**
```sql
INSERT INTO users (email, password, role) 
VALUES ('admin@kwise.com', '$2b$10$...', 'admin');
```

---

## 📚 DOCUMENTATION

- **Quick Setup:** `⚡_VM_QUICK_SETUP_GUIDE.md`
- **Full Guide:** `📚_COMPREHENSIVE_GITHUB_VM_DEPLOYMENT_PLAN.md`
- **This Card:** `📋_QUICK_REFERENCE_CARD.md`

---

## ✅ SUCCESS CHECKLIST

- [ ] Run `complete-vm-setup.ps1`
- [ ] Database imported successfully
- [ ] Both Ollama models downloaded
- [ ] Frontend built without errors
- [ ] PM2 services started
- [ ] Backend health check returns `{"status":"healthy"}`
- [ ] Frontend loads at http://localhost:3000
- [ ] Can login to admin panel
- [ ] AI compatibility checker works

---

**Last Updated:** December 10, 2025  
**Status:** ✅ Ready for Deployment
