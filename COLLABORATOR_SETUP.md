# K-Wise Collaborator Setup Guide

**For:** New team members setting up the project on their local machine  
**Time:** ~15–20 minutes  
**Platform:** Windows 10/11

---

## Prerequisites

Before you start, make sure you have:
- **Git** installed → [Download Git](https://git-scm.com/download/win)
- **Node.js v18+** installed → [Download Node.js](https://nodejs.org/) (LTS recommended)
- **npm** comes bundled with Node.js

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/defnotwig/KWise-Final.git
cd KWise-Final
```

If you already cloned it, pull the latest changes:

```bash
git pull origin main
```

---

## Step 2: Install PostgreSQL

PostgreSQL is the database engine. **This is required.**

### Install PostgreSQL 17 on Windows

1. Download from: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
2. Run the installer — select **PostgreSQL 17** for Windows x86-64
3. During installation:
   - **Set the superuser password to:** `humbleludwig13`
   - **Port:** `5432` (default)
   - **Locale:** Default
4. Keep **pgAdmin** and **Command Line Tools** checked
5. Complete the installation

### Create the Database

Open **pgAdmin 4** (installed with PostgreSQL) or use the command line:

**Option A — Using pgAdmin:**
1. Open pgAdmin 4 from Start Menu
2. Connect to the local server (password: `humbleludwig13`)
3. Right-click **Databases** → **Create** → **Database**
4. Name: `KWiseDB`
5. Click **Save**

**Option B — Using Command Line (psql):**
```bash
# Open Command Prompt or PowerShell
psql -U postgres
# Enter password: humbleludwig13

CREATE DATABASE "KWiseDB";
\q
```

### Verify PostgreSQL is Running

```bash
# Check the service is running (PowerShell)
Get-Service postgresql*
```

If the service is stopped:
```bash
net start postgresql-x64-17
```

---

## Step 3: Install Ollama (Optional — For AI Features)

Ollama powers the AI features (compatibility analysis, recommendations). **The system works without it** — AI features will simply be unavailable.

### If You Want AI Features:

1. Download from: https://ollama.com/download
2. Install and run Ollama
3. Pull the required models:

```bash
ollama pull deepseek-r1:1.5b
ollama pull nomic-embed-text
```

4. Verify Ollama is running:
```bash
curl http://localhost:11434/api/tags
```

### If You Don't Want AI Features:

No action needed. Use `npm run dev:no-ollama` to start the backend (see Step 6).

---

## Step 4: Set Up Environment Files

### Backend (.env)

```bash
cd KWise-Backend
copy .env.example .env
```

Open the `.env` file and update:
- `DB_PASSWORD` — should be `humbleludwig13` (same as your PostgreSQL password)
- `GMAIL_USER` and `GMAIL_APP_PASSWORD` — ask the team lead for these values (only needed for email features)

All other values are pre-configured for local development.

### Frontend (.env)

```bash
cd ..\K-Wise
copy .env.example .env
```

The frontend `.env` is already configured with the correct values. No changes needed.

---

## Step 5: Install Dependencies

```bash
# From the project root (K-Wise Final 2)

# Install backend dependencies
cd KWise-Backend
npm install

# Install frontend dependencies
cd ..\K-Wise
npm install
```

---

## Step 6: Initialize the Database Schema

```bash
cd ..\KWise-Backend
node scripts/setup/setup-database.js
```

This creates all required tables, indexes, and default settings.

---

## Step 7: Start the System

### Start Backend

```bash
cd KWise-Backend

# With Ollama (AI features enabled)
npm run dev

# Without Ollama (AI features disabled)
npm run dev:no-ollama
```

You should see:
```
✅ Server running on port 5000
🌐 Health check: http://localhost:5000/api/health
```

### Start Frontend (separate terminal)

```bash
cd K-Wise
npm start
```

The frontend opens at http://localhost:3000

---

## Step 8: Verify Everything Works

1. Open http://localhost:5000/api/health — should show `"status": "success"`
2. Open http://localhost:3000 — should show the K-Wise login page
3. If you installed Ollama: http://localhost:5000/api/ai/status — should show `"healthy": true`

---

## Quick Reference

| Service | URL | Port |
|---------|-----|------|
| Frontend (React) | http://localhost:3000 | 3000 |
| Backend (Express) | http://localhost:5000 | 5000 |
| Backend Health | http://localhost:5000/api/health | 5000 |
| PostgreSQL | localhost | 5432 |
| Ollama (optional) | http://localhost:11434 | 11434 |

---

## Common Issues

### "password authentication failed for user postgres"
- Your PostgreSQL password doesn't match. Reset it:
  1. Edit `C:\Program Files\PostgreSQL\17\data\pg_hba.conf`
  2. Change `scram-sha-256` to `trust` for local connections
  3. Restart PostgreSQL: `net stop postgresql-x64-17 && net start postgresql-x64-17`
  4. Run: `psql -U postgres` → `ALTER USER postgres PASSWORD 'humbleludwig13';`
  5. Change `pg_hba.conf` back to `scram-sha-256` and restart

### "ECONNREFUSED 127.0.0.1:5432"
- PostgreSQL isn't running. Start the service:
  ```bash
  net start postgresql-x64-17
  ```

### "database KWiseDB does not exist"
- Create it: `psql -U postgres -c "CREATE DATABASE \"KWiseDB\""`

### "Cannot find module X"
- Run `npm install` in both `K-Wise/` and `KWise-Backend/`

### "nodemon is not recognized"
- Install globally: `npm install -g nodemon`

### "[nodemon] app crashed"
- Check the error above the crash message
- Usually a database connection issue — verify PostgreSQL is running

### Frontend shows blank page or connection error
- Make sure the backend is running on port 5000
- Check that `K-Wise/.env` has `REACT_APP_LOCAL_API_URL=http://localhost:5000/api`

---

## Need Help?

Contact the team lead (Gabriel Ludwig Rivera) for:
- Gmail credentials (for email features)
- Database dumps (if you need pre-populated data)
- Any setup issues not covered here
