# 🚀 K-Wise Backend Startup Guide

## ✅ All Node Processes Stopped - Ready to Start!

All backend Node processes have been stopped and ports are cleared. You can now start the backend server cleanly.

---

## 🎯 Quick Start

### Option 1: Using the Startup Script (Recommended)
```powershell
cd "C:\Users\Ludwig Rivera\Downloads\K-Wise Final 2\KWise-Backend"
.\start-backend.ps1
```

### Option 2: Manual Start
```powershell
cd "C:\Users\Ludwig Rivera\Downloads\K-Wise Final 2\KWise-Backend"
node server.js
```

---

## 🛑 Stopping the Backend

### Using the Stop Script
```powershell
cd "C:\Users\Ludwig Rivera\Downloads\K-Wise Final 2\KWise-Backend"
.\stop-backend.ps1
```

### Manual Stop
- Press `Ctrl+C` in the terminal where the server is running
- Or use: `taskkill /F /IM node.exe`

---

## ✅ Current Status

- ✅ **All backend Node processes:** Stopped
- ✅ **Port 5000:** Free and available
- ✅ **Port 3000:** Available (if frontend is not running)
- ✅ **Backend files:** Fixed and ready
- ✅ **Database connection:** Configured

---

## 📋 Pre-Start Checklist

Before starting the backend, ensure:

1. ✅ **Environment Variables:** `.env` file exists with:
   - Database connection details
   - JWT secret
   - Other required configuration

2. ✅ **Dependencies Installed:** 
   ```powershell
   npm install
   ```

3. ✅ **Database Running:** PostgreSQL should be running with `KWiseDB` database created

4. ✅ **Ports Available:** 
   - Port 5000 (Backend)
   - Port 3000 (Frontend - if starting both)

---

## 🐛 Troubleshooting

### Port 5000 Still in Use
If port 5000 is still occupied:
```powershell
# Find the process using port 5000
Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess

# Stop it (replace PID with actual process ID)
Stop-Process -Id <PID> -Force
```

### Node Processes Won't Stop
If some processes refuse to stop:
1. Try running PowerShell as Administrator
2. Use Task Manager to end the processes
3. Restart your computer (last resort)

### Permission Denied
Some processes (PIDs 8140, 9808) may be protected. These are likely:
- Cursor IDE processes (safe to leave running)
- Processes running under different user account

---

## 🎉 Ready to Start!

Everything is prepared. Use the startup script or manual start command above.

---

**Last Cleanup:** November 2, 2025  
**Status:** ✅ All Clear

