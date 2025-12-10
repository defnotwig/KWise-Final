# 🤖 Ollama Auto-Start Configuration for K-Wise Backend

This document explains how K-Wise backend automatically starts and manages the Ollama AI service.

## 📋 Overview

K-Wise uses **Ollama** with the **DeepSeek R1 1.5B** model for AI-powered features such as:

- PC build estimation
- Component compatibility analysis
- Upgrade recommendations
- Hardware diagnostics

## ✅ Automatic Startup (Current Implementation)

### When you run `npm run dev`:

1. **Pre-check Script** (`scripts/check-ollama.js`) runs automatically
2. **Detects** if Ollama is installed
3. **Checks** if Ollama service is running
4. **Auto-starts** Ollama if not running
5. **Verifies** DeepSeek R1 1.5B model is available
6. **Continues** with backend server startup

### What happens if Ollama is NOT installed:

- ⚠️ Warning message displayed
- 📥 Installation instructions shown
- ✅ Backend continues running (AI features disabled)
- No errors or crashes

## 🚀 Installation Guide

### Step 1: Install Ollama

**Download:**
https://ollama.com/download/windows

**Install:**

- Run the installer
- Follow the installation wizard
- Ollama will be installed to: `C:\Users\[YourName]\AppData\Local\Programs\Ollama`

### Step 2: Download DeepSeek R1 1.5B Model

Open **PowerShell** or **Command Prompt** and run:

```bash
ollama pull deepseek-r1:1.5b
```

**What this does:**

- Downloads the DeepSeek R1 1.5B model (~900MB)
- May take 5-10 minutes depending on your internet speed
- Model is stored locally for offline use

### Step 3: Verify Installation

```bash
ollama list
```

**Expected output:**

```
NAME                    ID              SIZE    MODIFIED
deepseek-r1:1.5b       xxxxxxxxxxxxx   900MB   X minutes ago
```

## 🔧 Manual Startup (if needed)

### Start Ollama Service Manually:

**Option 1: Using npm script**

```bash
npm run start-ollama
```

**Option 2: Using PowerShell script**

```powershell
.\scripts\start-ollama.ps1
```

**Option 3: Direct command**

```bash
ollama serve
```

### Check Ollama Status:

**Option 1: Using npm script**

```bash
npm run check-ollama
```

**Option 2: Test connection**

```powershell
Invoke-RestMethod -Uri "http://localhost:11434/api/tags"
```

## 📝 Available NPM Scripts

```json
{
  "dev": "node scripts/check-ollama.js && nodemon server.js",
  "dev:no-ollama": "nodemon server.js",
  "check-ollama": "node scripts/check-ollama.js",
  "start-ollama": "powershell -ExecutionPolicy Bypass -File scripts/start-ollama.ps1"
}
```

### Usage:

**Normal development (with Ollama auto-start):**

```bash
npm run dev
```

**Skip Ollama check:**

```bash
npm run dev:no-ollama
```

**Check Ollama status only:**

```bash
npm run check-ollama
```

**Start Ollama manually (with interactive prompts):**

```bash
npm run start-ollama
```

## 🎯 How Auto-Start Works

### 1. **Pre-check Script** (`scripts/check-ollama.js`)

**What it does:**

- Checks if Ollama process is running
- Tests connection to `http://localhost:11434`
- Verifies DeepSeek R1 1.5B model exists
- Automatically starts Ollama if needed

**Exit codes:**

- `0` = Success (Ollama running or AI disabled)
- `1` = Error (critical failure)

### 2. **OllamaService Auto-Start** (`ai/services/ollamaService.js`)

**Fallback mechanism:**
If pre-check missed Ollama, the service itself will:

1. Detect connection failure
2. Attempt to find Ollama executable
3. Start Ollama in background
4. Retry connection

**Key features:**

- Only attempts auto-start ONCE per session
- Runs in detached mode (background)
- No terminal windows popup
- Graceful failure (doesn't crash backend)

### 3. **PowerShell Script** (`scripts/start-ollama.ps1`)

**Interactive script for manual use:**

- Comprehensive status checking
- Model download prompt
- Colorful terminal output
- User-friendly error messages

## ⚙️ Configuration

### Environment Variables (`.env`):

```properties
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:1.5b
OLLAMA_TIMEOUT=30000
OLLAMA_MAX_RETRIES=3

# AI Features
AI_ENABLED=true
AI_FALLBACK_ENABLED=true
AI_DEBUG=true
```

### AI Config (`ai/config/aiConfig.js`):

```javascript
ollama: {
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'deepseek-r1:1.5b',
  timeout: parseInt(process.env.OLLAMA_TIMEOUT) || 8000,
  maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES) || 2,
  retryDelay: 1000
}
```

## 🔍 Troubleshooting

### Issue: "Ollama not found"

**Solution:**

1. Check installation: `where ollama`
2. Reinstall from: https://ollama.com/download/windows
3. Add to PATH if needed

### Issue: "DeepSeek model not found"

**Solution:**

```bash
ollama pull deepseek-r1:1.5b
```

### Issue: "Port 11434 already in use"

**Solution:**

```powershell
# Find process using port 11434
netstat -ano | findstr :11434

# Kill the process
taskkill /PID <process_id> /F
```

### Issue: "AI request timeout"

**Solutions:**

1. Increase timeout in `.env`: `OLLAMA_TIMEOUT=60000`
2. Check system resources (RAM, CPU)
3. Restart Ollama: `npm run start-ollama`

### Issue: "Ollama crashes on device restart"

**This is now FIXED!**

**What we did:**

1. Added auto-start check in `npm run dev`
2. Added fallback auto-start in OllamaService
3. Created manual start script
4. Added graceful failure handling

**Result:**

- Ollama starts automatically when you run backend
- No manual intervention needed
- AI features work immediately

## 📊 Status Indicators

### Console Output:

**✅ Ollama Running:**

```
🤖 K-Wise Ollama Health Check
==============================
✅ Ollama is already running
🔍 Checking for DeepSeek R1 1.5B model...
✅ DeepSeek R1 1.5B model is available
🎯 Ollama health check complete!
```

**🚀 Ollama Auto-Started:**

```
⚠️ Ollama is not running
✅ Ollama found at: C:\Users\...\Ollama\ollama.exe
🚀 Starting Ollama service...
✅ Ollama service started successfully
```

**❌ Ollama Not Installed:**

```
❌ Ollama executable not found

📥 To install Ollama:
   1. Download from: https://ollama.com/download/windows
   2. Install the application
   3. Run: ollama pull deepseek-r1:1.5b

⚠️ AI features will be DISABLED
```

## 🎯 Best Practices

### For Development:

1. **Always use `npm run dev`**

   - Ensures Ollama is checked and started
   - Provides clear status messages

2. **Monitor first startup**

   - Watch for Ollama status messages
   - Verify model is loaded

3. **Keep model updated**
   ```bash
   ollama pull deepseek-r1:1.5b
   ```

### For Production:

1. **Set up Ollama as Windows Service**

   ```powershell
   # Create service
   sc.exe create Ollama binPath="C:\Path\To\ollama.exe serve" start=auto
   ```

2. **Configure firewall rules** (if needed)

3. **Monitor health endpoint**
   - `GET /api/health`
   - Should show Ollama status

## 📚 Additional Resources

- **Ollama Documentation:** https://github.com/ollama/ollama
- **DeepSeek R1 Info:** https://ollama.com/library/deepseek-r1
- **K-Wise AI Docs:** See `AI_INTEGRATION_SUCCESS_REPORT.md`

## ✨ What's New

### Recent Improvements:

1. ✅ **Auto-start on `npm run dev`**

   - No manual Ollama startup needed
   - Automatic model verification

2. ✅ **Graceful degradation**

   - Backend runs even if Ollama fails
   - User-friendly error messages

3. ✅ **Multiple startup methods**

   - Pre-check script (primary)
   - Service fallback (secondary)
   - Manual scripts (backup)

4. ✅ **Enhanced logging**
   - Clear status indicators
   - Helpful troubleshooting info

## 🎊 Summary

**Before this fix:**

- Manual Ollama startup required after restart
- No auto-detection
- Confusing error messages

**After this fix:**

- ✅ Fully automatic startup
- ✅ Smart auto-detection
- ✅ Clear status messages
- ✅ Multiple fallback methods
- ✅ Production-ready

**Just run `npm run dev` and everything works! 🚀**

---

**Questions or issues?** Check the troubleshooting section or contact the K-Wise team.
