import os
import re
from datetime import datetime

config_file = r"C:\Program Files\PostgreSQL\17\data\postgresql-hyperv.conf"

print("=" * 60)
print("PostgreSQL Configuration Fixer")
print("=" * 60)
print()

if not os.path.exists(config_file):
    print(f"ERROR: Config file not found: {config_file}")
    exit(1)

print(f"Found config file: {config_file}")
print()

# Read the file
try:
    with open(config_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print("Current problematic settings:")
    print("-" * 60)
    
    # Find problematic lines
    for line in content.split('\n'):
        if 'maintenance_work_mem' in line and not line.strip().startswith('#'):
            print(f"  {line.strip()}")
        if 'effective_io_concurrency' in line and not line.strip().startswith('#'):
            print(f"  {line.strip()}")
    
    print()
    print("Fixing configuration...")
    print()
    
    # Backup original
    backup_file = f"{config_file}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    with open(backup_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Backup created: {backup_file}")
    
    # Fix maintenance_work_mem (2GB -> 1GB)
    # PostgreSQL uses human-readable format like "2GB"
    original_mem = None
    for line in content.split('\n'):
        if 'maintenance_work_mem' in line and not line.strip().startswith('#'):
            original_mem = line.strip()
            break
    
    # Replace 2GB with 1GB
    content = re.sub(
        r'(maintenance_work_mem\s*=\s*)2GB',
        r'\g<1>1GB',
        content,
        flags=re.IGNORECASE
    )
    print(f"✓ Fixed maintenance_work_mem: 2GB -> 1GB")
    
    # Fix effective_io_concurrency (Windows doesn't support posix_fadvise)
    # This is already set to 0, but make sure
    if 'effective_io_concurrency = 200' in content:
        content = re.sub(
            r'(effective_io_concurrency\s*=\s*)200',
            r'\g<1>0',
            content
        )
        print("✓ Fixed effective_io_concurrency: 200 -> 0 (Windows compatible)")
    else:
        print("✓ effective_io_concurrency already set to 0")
    
    # Write fixed content
    with open(config_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✓ Configuration file updated")
    print()
    print("=" * 60)
    print("SUCCESS: Configuration fixed!")
    print("=" * 60)
    print()
    
    # Show new settings
    print("New settings:")
    print("-" * 60)
    for line in content.split('\n'):
        if 'maintenance_work_mem' in line and not line.strip().startswith('#'):
            print(f"  {line.strip()}")
        if 'effective_io_concurrency' in line and not line.strip().startswith('#'):
            print(f"  {line.strip()}")
    
    print()
    print("Now attempting to start PostgreSQL...")
    print()
    
    # Try to start PostgreSQL
    import subprocess
    try:
        result = subprocess.run(
            [r'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe', 
             'start', '-D', r'C:\Program Files\PostgreSQL\17\data', '-w'],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("=" * 60)
            print("✅ PostgreSQL STARTED SUCCESSFULLY!")
            print("=" * 60)
            print()
        else:
            print("=" * 60)
            print("ERROR: Could not start PostgreSQL")
            print("=" * 60)
            print()
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            print()
            
    except Exception as e:
        print(f"Error starting PostgreSQL: {e}")
        print()
        print("Try starting manually via services.msc")
    
except PermissionError:
    print()
    print("=" * 60)
    print("ERROR: Permission Denied")
    print("=" * 60)
    print()
    print("Solution: Run this script as Administrator")
    print("  Right-click PowerShell -> Run as Administrator")
    print("  Then run: python fix-postgresql-config.py")
    print()
    exit(1)
    
except Exception as e:
    print(f"ERROR: {e}")
    exit(1)
