# ⚡ K-WISE QUICK START - VM DEPLOYMENT

**Status:** ✅ 95% Complete | 🔧 1 Manual Step Remaining | ⏱️ 10 Minutes to Launch

---

## 🎯 WHAT'S DONE

✅ Node.js v24.11.1 installed  
✅ Backend dependencies (245 packages)  
✅ Frontend dependencies (1495 packages)  
✅ Ollama AI v0.13.2 + DeepSeek R1 1.5b model  
✅ Frontend production build (512KB)  
✅ PM2 process manager installed  
✅ All environment files configured  
✅ All scripts created  

---

## 🚀 3 STEPS TO LAUNCH

### Step 1: Setup Database (5 minutes)

```powershell
powershell -File "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\scripts\setup-database.ps1"
```

**What it does:**
- Prompts for PostgreSQL password (secure)
- Creates KWiseDB database
- Imports 659MB backup file
- Updates .env with correct password
- Verifies 1000+ products imported

### Step 2: Start All Services (30 seconds)

```powershell
powershell -File "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\scripts\start-all.ps1"
```

**What it does:**
- Starts Ollama AI (background)
- Starts backend API (2 instances, port 5000)
- Starts frontend (port 3000)
- Shows service status

### Step 3: Access Application

**Open in browser:** http://localhost:3000

---

## 📊 VERIFY DEPLOYMENT

```powershell
# Check PM2 status
pm2 status

# Test backend health
Invoke-WebRequest http://localhost:5000/api/health

# View live logs
pm2 logs
```

**Expected:** 3 processes online (2 backend, 1 frontend)

---

## 🛑 STOP SERVICES

```powershell
powershell -File "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\scripts\stop-all.ps1"
```

---

## 📋 ACCESS POINTS

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:5000/api |
| **Health Check** | http://localhost:5000/api/health |
| **Ollama AI** | http://localhost:11434 |

---

## 🔧 TROUBLESHOOTING

**Problem:** Database connection error  
**Solution:** Run `scripts\setup-database.ps1` first

**Problem:** PM2 not recognized  
**Solution:** Refresh PATH: `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`

**Problem:** Ollama not working  
**Solution:** Verify model: `ollama list` (should show deepseek-r1:1.5b)

---

## 📚 FULL DOCUMENTATION

See `🎉_VM_DEPLOYMENT_COMPLETE.md` for comprehensive details:
- Installation analysis
- Error analysis
- Configuration details
- Security settings
- Performance metrics
- Post-deployment checklist

---

**⏱️ Total Time:** 10 minutes from now to full deployment  
**🎉 You're almost there!**
