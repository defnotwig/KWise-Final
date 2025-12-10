# 🚀 K-Wise Backend Server - Backup & Recovery Guide

## 📁 Backup Files Created

### 1. `server-reference-backup.js`
- **Purpose**: Complete backup of the working server code
- **Use**: Restore server if `working-server.js` gets corrupted
- **Status**: ✅ WORKING with PostgreSQL Database
- **Last Updated**: 2025-08-24

### 2. `quick-start-server.bat`
- **Purpose**: Windows batch file to quickly start the server
- **Use**: Double-click to start server with instructions

### 3. `quick-start-server.ps1`
- **Purpose**: PowerShell script to start the server
- **Use**: Right-click → "Run with PowerShell"

## 🔄 How to Restore Server (if it crashes)

### Option 1: Quick Restore
```bash
# Copy backup to main file
copy server-reference-backup.js working-server.js

# Start server
node working-server.js
```

### Option 2: Use Quick Start Scripts
1. **Windows**: Double-click `quick-start-server.bat`
2. **PowerShell**: Right-click `quick-start-server.ps1` → "Run with PowerShell"

## 🎯 What's Working in the Backup

✅ **Database Integration**: Full PostgreSQL support
✅ **Authentication**: Login, forgot password, reset password
✅ **User Management**: Create, read, update, delete users
✅ **Password Security**: bcrypt hashing
✅ **Reset Tokens**: Database-stored with expiry
✅ **Reference Email Support**: Forgot password by reference email
✅ **CORS**: Frontend connection support
✅ **Error Handling**: Comprehensive error management

## 🗄️ Database Features

- **Users Table**: Full CRUD operations
- **Password Reset**: Secure token system
- **Role Management**: superadmin, admin, developer
- **Email Verification**: Token-based system
- **Audit Trail**: created_at, updated_at timestamps

## 🚨 Emergency Recovery Steps

If the server completely fails:

1. **Stop any running processes**:
   ```bash
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   ```

2. **Restore from backup**:
   ```bash
   copy server-reference-backup.js working-server.js
   ```

3. **Start server**:
   ```bash
   node working-server.js
   ```

4. **Verify it's working**:
   ```bash
   curl http://localhost:5000/api/health
   ```

## 📋 Server Status Commands

```bash
# Check if server is running
netstat -ano | findstr :5000

# Test server health
curl http://localhost:5000/api/health

# Test forgot password
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"ludwig.rivera26@gmail.com"}'
```

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process
taskkill /PID <PID> /F
```

### Database Connection Issues
- Check `.env` file configuration
- Verify PostgreSQL is running
- Check database credentials

### Server Won't Start
1. Check Node.js is installed: `node --version`
2. Check dependencies: `npm install`
3. Restore from backup: `copy server-reference-backup.js working-server.js`

## 📞 Quick Reference

- **Main Server File**: `working-server.js`
- **Backup File**: `server-reference-backup.js`
- **Quick Start**: `quick-start-server.bat` or `quick-start-server.ps1`
- **Port**: 5000
- **Health Check**: `http://localhost:5000/api/health`
- **Database**: PostgreSQL with full user management

---

**💡 Pro Tip**: Keep the backup file safe! It contains the working server code that you can always restore from.
