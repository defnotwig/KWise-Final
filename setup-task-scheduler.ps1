# K-Wise Task Scheduler Setup Script
# This PowerShell script creates a scheduled task for K-Wise automatic startup

param(
    [string]$TaskName = "K-Wise Startup",
    [string]$ScriptPath = "$PSScriptRoot\start-pm2-silent.cmd",
    [string]$WorkingDirectory = $PSScriptRoot,
    [switch]$RemoveExisting
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "K-Wise Task Scheduler Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Please right-click and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if script exists
if (-not (Test-Path $ScriptPath)) {
    Write-Host "ERROR: Script not found: $ScriptPath" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[OK] Running as Administrator" -ForegroundColor Green
Write-Host "[OK] Script found: $ScriptPath" -ForegroundColor Green
Write-Host ""

# Remove existing task if requested
if ($RemoveExisting) {
    Write-Host "Checking for existing task..." -ForegroundColor Yellow
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    
    if ($existingTask) {
        Write-Host "Removing existing task: $TaskName" -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "[OK] Existing task removed" -ForegroundColor Green
    }
}

Write-Host "Creating scheduled task: $TaskName" -ForegroundColor Cyan
Write-Host ""

# Create the scheduled task action
$action = New-ScheduledTaskAction `
    -Execute $ScriptPath `
    -WorkingDirectory $WorkingDirectory

# Create the trigger (at system startup with 1 minute delay)
$trigger = New-ScheduledTaskTrigger `
    -AtStartup `
    -RandomDelay (New-TimeSpan -Minutes 1)

# Create additional settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# Create the principal (run as SYSTEM with highest privileges)
$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

# Register the scheduled task
try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Automatically start the K-Wise application using PM2 on system startup" `
        -ErrorAction Stop
    
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "Task created successfully!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Name: $TaskName" -ForegroundColor Cyan
    Write-Host "Script: $ScriptPath" -ForegroundColor Cyan
    Write-Host "Trigger: At system startup (1 minute delay)" -ForegroundColor Cyan
    Write-Host "Run As: SYSTEM (Highest Privileges)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "The task will:" -ForegroundColor Yellow
    Write-Host "  - Start automatically when Windows boots" -ForegroundColor White
    Write-Host "  - Retry 3 times if it fails (1 minute intervals)" -ForegroundColor White
    Write-Host "  - Run even if on battery power" -ForegroundColor White
    Write-Host "  - Log output to: $WorkingDirectory\logs\" -ForegroundColor White
    Write-Host ""
    Write-Host "Management Commands:" -ForegroundColor Cyan
    Write-Host "  View in Task Scheduler: taskschd.msc" -ForegroundColor White
    Write-Host "  Test run now: schtasks /run /tn `"$TaskName`"" -ForegroundColor White
    Write-Host "  Disable: schtasks /change /tn `"$TaskName`" /disable" -ForegroundColor White
    Write-Host "  Enable: schtasks /change /tn `"$TaskName`" /enable" -ForegroundColor White
    Write-Host "  Delete: schtasks /delete /tn `"$TaskName`" /f" -ForegroundColor White
    Write-Host ""
    
    # Ask if user wants to test run
    $response = Read-Host "Would you like to test run the task now? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host ""
        Write-Host "Starting task..." -ForegroundColor Cyan
        Start-ScheduledTask -TaskName $TaskName
        Start-Sleep -Seconds 3
        
        $taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName
        Write-Host ""
        Write-Host "Last Run Time: $($taskInfo.LastRunTime)" -ForegroundColor Cyan
        Write-Host "Last Result: $($taskInfo.LastTaskResult)" -ForegroundColor Cyan
        Write-Host ""
        
        if ($taskInfo.LastTaskResult -eq 0) {
            Write-Host "[OK] Task ran successfully!" -ForegroundColor Green
            Write-Host "Check logs: $WorkingDirectory\logs\" -ForegroundColor Cyan
        } else {
            Write-Host "[WARNING] Task completed with code: $($taskInfo.LastTaskResult)" -ForegroundColor Yellow
            Write-Host "Check logs for details: $WorkingDirectory\logs\" -ForegroundColor Cyan
        }
    }
    
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to create scheduled task" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"
