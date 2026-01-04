const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

if (os.platform() !== 'win32') {
  console.error('This launcher is intended for Windows. Run services using existing start scripts on other OS.');
  process.exit(1);
}

// Determine workspace root: prefer location of the exe (when packaged), otherwise __dirname
const exeDir = path.dirname(process.execPath || process.argv[1]);
const cwdDir = process.cwd();
const root = fs.existsSync(path.join(exeDir, 'package.json')) ? exeDir : cwdDir;

function openWindow(title, targetDir, startCommand) {
  if (!fs.existsSync(targetDir)) {
    console.error(`Target directory not found for ${title}: ${targetDir}`);
    return;
  }
  // Create a temporary .cmd script to avoid quoting issues with start and complex commands
  try {
    const safeName = title.replace(/[^a-z0-9_-]/gi, '_');
    const scriptPath = path.join(os.tmpdir(), `kwise_launch_${safeName}_${Date.now()}.cmd`);
    const scriptLines = [];
    scriptLines.push('@echo off');
    scriptLines.push(`cd /d "${targetDir}"`);
    scriptLines.push('if not exist package.json (echo package.json not found & pause & exit /b 1)');
    scriptLines.push('if not exist node_modules (echo Installing dependencies... & npm install)');
    // append the provided startCommand; if it contains conditional syntax, run it via cmd /c
    scriptLines.push(startCommand);
    // On exit, kill all child processes (cleanup for backend port)
    scriptLines.push('');
    scriptLines.push(':: Cleanup: kill this cmd and all children on exit');
    scriptLines.push('for /f "tokens=2" %%i in (\'tasklist /FI "WINDOWTITLE eq %~0" /FO LIST ^| findstr "PID:"\') do taskkill /PID %%i /T /F >nul 2>&1');
    const content = scriptLines.join('\r\n');
    fs.writeFileSync(scriptPath, content, { encoding: 'utf8' });

    // Launch the script in a new window using start
    spawn('cmd.exe', ['/c', 'start', '""', scriptPath], { detached: true, stdio: 'ignore' }).unref();
    console.log(`${title} launched (dir: ${targetDir}) via ${scriptPath}`);

    // Optionally remove the script after a short delay
    setTimeout(() => {
      try { fs.unlinkSync(scriptPath); } catch (e) { /* ignore */ }
    }, 30 * 1000);
  } catch (err) {
    console.error(`Failed to launch ${title}:`, err);
  }
}

// Paths for projects relative to launcher location
let backendDir = path.join(root, 'KWise-Backend');
let frontendDir = path.join(root, 'K-Wise');

// Fallback: if those directories don't exist under root, try locating them next to the exe
if (!fs.existsSync(backendDir) && fs.existsSync(path.join(exeDir, 'KWise-Backend'))) {
  backendDir = path.join(exeDir, 'KWise-Backend');
}
if (!fs.existsSync(frontendDir) && fs.existsSync(path.join(exeDir, 'K-Wise'))) {
  frontendDir = path.join(exeDir, 'K-Wise');
}

// Synchronously kill all processes on a port using PowerShell and taskkill
function killProcessesOnPortSync(port) {
  try {
    console.log(`Checking port ${port}...`);
    // Use PowerShell to get PIDs
    const psCmd = `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"`;
    let pids = [];
    try {
      const out = execSync(psCmd, { encoding: 'utf8', timeout: 5000 });
      pids = out.split(/\r?\n/).map(s => s.trim()).filter(s => /^\d+$/.test(s));
    } catch (e) {
      // PowerShell failed, try netstat
      try {
        const netstatOut = execSync(`netstat -ano -p tcp | findstr ":${port}"`, { encoding: 'utf8', timeout: 5000 });
        const lines = netstatOut.split(/\r?\n/);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[parts.length - 1];
            if (/^\d+$/.test(pid) && !pids.includes(pid)) pids.push(pid);
          }
        }
      } catch (e2) {
        // Ignore
      }
    }
    
    if (pids.length === 0) {
      console.log(`No processes found on port ${port}`);
      return false;
    }
    
    console.log(`Found PIDs on port ${port}: ${pids.join(', ')}`);
    let killedAny = false;
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { timeout: 5000 });
        console.log(`Killed PID ${pid} (port ${port})`);
        killedAny = true;
      } catch (e) {
        console.warn(`Failed to kill PID ${pid}`);
      }
    }
    return killedAny;
  } catch (e) {
    console.warn(`Error checking/killing port ${port}:`, e.message);
    return false;
  }
}

// Start backend and frontend in separate windows
const backendStart = 'if exist package.json (set "FORCE_COLOR=1" && npm run dev) else (echo package.json not found && pause)';
const frontendStart = 'if exist package.json (npm start) else (echo package.json not found && pause)';

// Kill processes on both ports 5000 and 3000 synchronously before starting
console.log('Cleaning up ports 5000 and 3000...');
killProcessesOnPortSync(5000);
killProcessesOnPortSync(3000);

// Wait 3 seconds to ensure processes are fully terminated
console.log('Waiting for processes to terminate...');
const start = Date.now();
while (Date.now() - start < 3000) {
  // Busy wait
}

console.log('Starting backend and frontend...');
openWindow('KWise Backend', backendDir, backendStart);

// Delay before starting frontend
setTimeout(() => {
  openWindow('K-Wise Frontend', frontendDir, frontendStart);
  // Exit launcher after both windows started
  setTimeout(() => {
    console.log('Launcher exiting...');
    process.exit(0);
  }, 500);
}, 1000);
