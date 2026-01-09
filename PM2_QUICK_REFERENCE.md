# ⚡ K-Wise PM2 Quick Reference

## 🚀 Quick Start (Windows Task Scheduler)

### One-Step Setup

```powershell
# Right-click and "Run as Administrator"
.\setup-task-scheduler.ps1
```

✅ Done! K-Wise will now start automatically on boot.

---

## 📋 Available Scripts

| Script                     | Purpose                       | Use Case          |
| -------------------------- | ----------------------------- | ----------------- |
| `start-pm2.cmd`            | Interactive start             | Manual testing    |
| `start-pm2-silent.cmd`     | Silent start with logs        | Task Scheduler ⭐ |
| `stop-pm2.cmd`             | Stop all processes            | Shutdown          |
| `restart-pm2.cmd`          | Restart all processes         | Updates/fixes     |
| `setup-task-scheduler.ps1` | Auto-configure Task Scheduler | Initial setup ⭐  |

---

## 🎯 Common Commands

### Task Scheduler

```cmd
# Test run now
schtasks /run /tn "K-Wise Startup"

# Check status
schtasks /query /tn "K-Wise Startup"

# Disable/Enable
schtasks /change /tn "K-Wise Startup" /disable
schtasks /change /tn "K-Wise Startup" /enable

# Delete
schtasks /delete /tn "K-Wise Startup" /f
```

### PM2 Management

```cmd
# View status
pm2 status

# View logs
pm2 logs

# Stop all
pm2 stop all

# Restart all
pm2 restart all

# View detailed info
pm2 info kwise-backend
pm2 info kwise-frontend

# Monitor resources
pm2 monit
```

---

## 📝 Log Locations

| Type          | Location                               |
| ------------- | -------------------------------------- |
| Startup logs  | `logs/pm2-startup-YYYYMMDD-HHMMSS.log` |
| Backend logs  | `KWise-Backend/logs/backend-*.log`     |
| Frontend logs | `KWise-Backend/logs/frontend-*.log`    |
| PM2 logs      | `pm2 logs`                             |

---

## 🔧 Troubleshooting

### Task doesn't start?

1. Check logs: `logs/pm2-startup-*.log`
2. Verify PM2 installed: `npm install -g pm2`
3. Check Task Scheduler: `taskschd.msc`
4. Ensure paths in `ecosystem.config.js` are correct

### PM2 not found?

```cmd
npm install -g pm2
```

### Processes already running?

```cmd
pm2 stop all
pm2 delete all
.\start-pm2.cmd
```

### Need to update paths?

Edit `ecosystem.config.js` with correct paths for your system.

---

## 📖 Full Documentation

See [PM2_SCRIPTS_README.md](PM2_SCRIPTS_README.md) for complete details.

---

## ✨ Features

✅ Automatic startup on system boot
✅ Automatic restart on failure (3 attempts)
✅ Comprehensive logging
✅ Silent background execution
✅ Works on battery power
✅ Network-aware (waits for network)
✅ Runs as SYSTEM with highest privileges
