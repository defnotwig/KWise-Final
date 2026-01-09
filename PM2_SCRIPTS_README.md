# K-Wise PM2 Executable Scripts

This directory contains executable scripts to manage the K-Wise application using PM2. These scripts can be used with Windows Task Scheduler, cron jobs, or other automation tools.

## Available Scripts

### Windows Scripts (.cmd)

- **start-pm2.cmd** - Start the K-Wise application (interactive)
- **start-pm2-silent.cmd** - Start the K-Wise application (silent, with logging - recommended for Task Scheduler)
- **stop-pm2.cmd** - Stop the K-Wise application
- **restart-pm2.cmd** - Restart the K-Wise application

### Task Scheduler Setup Files

- **setup-task-scheduler.ps1** - PowerShell script to automatically configure Windows Task Scheduler
- **kwise-task-scheduler.xml** - XML template for manual Task Scheduler import

### Linux/Unix Scripts (.sh)

- **start-pm2.sh** - Start the K-Wise application
- **stop-pm2.sh** - Stop the K-Wise application
- **restart-pm2.sh** - Restart the K-Wise application

## Prerequisites

1. **PM2 must be installed globally:**
   ```bash
   npm install -g pm2
   ```

2. **For Linux/Unix, make scripts executable:**
   ```bash
   chmod +x start-pm2.sh stop-pm2.sh restart-pm2.sh
   ```

## Usage

### Windows

Simply double-click the `.cmd` files or run from Command Prompt:
```cmd
start-pm2.cmd
stop-pm2.cmd
restart-pm2.cmd
```

### Linux/Unix

Run from terminal:
```bash
./start-pm2.sh
./stop-pm2.sh
./restart-pm2.sh
```

## Windows Task Scheduler Setup

### ⭐ Method 1: Automated Setup (RECOMMENDED)

**Easiest and most reliable method!**

1. **Right-click** on `setup-task-scheduler.ps1`
2. Select **"Run with PowerShell as Administrator"**
3. Follow the prompts
4. Test run when asked

The script will:
- ✅ Create a scheduled task with optimal settings
- ✅ Configure automatic startup with 1-minute delay
- ✅ Set up retry logic (3 attempts)
- ✅ Enable logging to `logs/` directory
- ✅ Run as SYSTEM with highest privileges

**Or run from PowerShell (as Administrator):**
```powershell
cd "C:\Users\Ludwig Rivera\Downloads\K-Wise Final 2"
.\setup-task-scheduler.ps1
```

To remove and recreate:
```powershell
.\setup-task-scheduler.ps1 -RemoveExisting
```

### Method 2: Import XML Template

1. Open Task Scheduler (`taskschd.msc`)
2. Right-click "Task Scheduler Library"
3. Select "Import Task"
4. Browse to `kwise-task-scheduler.xml`
5. **Important:** Edit the paths in the XML to match your installation before importing

### Method 3: Manual GUI Setup

1. Open Task Scheduler (`taskschd.msc`)
2. Click "Create Basic Task"
3. Name it "K-Wise Startup"
4. Choose trigger: "When the computer starts"
5. Action: "Start a program"
6. Program/script: Browse to `start-pm2-silent.cmd`
7. Start in: Browse to the K-Wise root directory
8. **Important:** Check "Run with highest privileges"
9. Finish

### Method 4: PowerShell Command

```powershell
# Run as Administrator
$action = New-ScheduledTaskAction -Execute "C:\Users\Ludwig Rivera\Downloads\K-Wise Final 2\start-pm2-silent.cmd" -WorkingDirectory "C:\Users\Ludwig Rivera\Downloads\K-Wise Final 2"
$trigger = New-ScheduledTaskTrigger -AtStartup -RandomDelay (New-TimeSpan -Minutes 1)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "K-Wise Startup" -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Start K-Wise application using PM2"
```

### Method 5: Command Line (Basic)

```cmd
schtasks /create /tn "K-Wise Startup" /tr "C:\Users\Ludwig Rivera\Downloads\K-Wise Final 2\start-pm2-silent.cmd" /sc onstart /ru SYSTEM /rl HIGHEST
```

## Linux/Unix Cron Setup

### Start on System Boot

1. Edit root crontab:
   ```bash
   sudo crontab -e
   ```

2. Add this line:
   ```
   @reboot /path/to/K-Wise-Final-2/start-pm2.sh
   ```

### Scheduled Restart (e.g., daily at 3 AM)

```
0 3 * * * /path/to/K-Wise-Final-2/restart-pm2.sh
```

## Systemd Service (Linux)

For more robust Linux startup, create a systemd service:

1. Create service file:
   ```bash
   sudo nano /etc/systemd/system/kwise.service
   ```

2. Add this content:
   ```ini
   [Unit]
   Description=K-Wise Application
   After=network.target postgresql.service

   [Service]
   Type=forking
   User=youruser
   WorkingDirectory=/path/to/K-Wise-Final-2
   ExecStart=/path/to/K-Wise-Final-2/start-pm2.sh
   ExecStop=/path/to/K-Wise-Final-2/stop-pm2.sh
   ExecReload=/path/to/K-Wise-Final-2/restart-pm2.sh
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

3. Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable kwise.service
   sudo systemctl start kwise.service
   ```

## PM2 Startup Integration

PM2 has built-in startup script generation:

### Windows

```cmd
pm2 startup
pm2 save
```

### Linux/Unix

```bash
pm2 startup
# Run the command it outputs
pm2 save
```

This will automatically configure PM2 to start on system boot.

## Troubleshooting

### Script doesn't run in Task Scheduler

- Use `start-pm2-silent.cmd` instead of `start-pm2.cmd` for Task Scheduler
- Ensure the "Start in" directory is set correctly
- Run with highest privileges (SYSTEM account recommended)
- Check logs in `logs/` directory for detailed output
- Check Windows Event Viewer for errors (Event Viewer → Windows Logs → Application)

### Permission denied (Linux)

```bash
chmod +x *.sh
```

### PM2 not found

- Install PM2 globally: `npm install -g pm2`
- Add npm global path to system PATH
- On Windows, use full path to PM2: `C:\Users\[Username]\AppData\Roaming\npm\pm2.cmd`

### Scripts run but app doesn't start

- Check that ecosystem.config.js paths are correct
- Verify Node.js and npm are installed
- Check PM2 logs: `pm2 logs`

## Monitoring

After starting with these scripts:

```bash
# View status
pm2 status

# View logs
pm2 logs

# View detailed info
pm2 info kwise-backend
pm2 info kwise-frontend

# Monitor resources
pm2 monit
```Quick Start Guide

### For Task Scheduler (Windows)

1. **Install PM2 globally** (if not already installed):
   ```cmd
   npm install -g pm2
   ```

2. **Run the automated setup**:
   - Right-click `setup-task-scheduler.ps1`
   - Select "Run with PowerShell as Administrator"
   - Follow prompts

3. **Verify**:
   ```cmd
   schtasks /query /tn "K-Wise Startup"
   ```

4. **Check logs**:
   - Logs are saved in `logs/` directory
   - Each startup creates a timestamped log file

### For Manual Testing

Double-click `start-pm2.cmd` to test the startup process interactively.

## Task Scheduler Management

### View Task Status
```cmd
schtasks /query /tn "K-Wise Startup" /v /fo list
```

### Run Task Manually
```cmd
schtasks /run /tn "K-Wise Startup"
```

### Disable Task
```cmd
schtasks /change /tn "K-Wise Startup" /disable
```

### Enable Task
```cmd
schtasks /change /tn "K-Wise Startup" /enable
```

### Delete Task
```cmd
schtasks /delete /tn "K-Wise Startup" /f
```

### View Task in GUI
```cmd
taskschd.msc
```
Then navigate to: Task Scheduler Library → K-Wise Startup

## Notes

- `start-pm2-silent.cmd` creates timestamped logs in `logs/` directory
- Interactive scripts (`start-pm2.cmd`) display output and pause at the end
- All scripts automatically save the PM2 process list
- Scripts validate PM2 installation before running
- All scripts set the working directory automatically
- Silent script checks if processes are already running and restarts them if needed
- Scripts validate PM2 installation before running
- All scripts set the working directory automatically

## Support

For issues or questions, refer to:
- PM2 Documentation: https://pm2.keymetrics.io/
- K-Wise Project Documentation
