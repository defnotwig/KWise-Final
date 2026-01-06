# 🎬 K-Wise Admin System - Video Showcase Script (REVISED)

**Duration:** 6 minutes MAX  
**Structure:** 2/3 code (4 minutes) → 1/3 demo (2 minutes)

---

## 🎯 NEW APPROACH - FOCUSED & CONCISE

**Key Changes from Feedback:**

- ✅ Total runtime: 6 minutes (not 22 minutes)
- ✅ 4 minutes on CODE, 2 minutes on demo
- ✅ Focus on 1-2 features only (not entire app)
- ✅ Show architecture → code → demo (no technical talk during demo)
- ✅ Team assesses ability in first 1-2 minutes

---

## 📋 Quick Setup Checklist

### Before Recording:

- [ ] Backend running: `cd KWise-Backend && node server.js`
- [ ] Frontend running: `cd K-Wise && npm start`
- [ ] Browser at `localhost:3000` with DevTools docked RIGHT
- [ ] VS Code open with file explorer visible
- [ ] Clear Network tab before demo
- [ ] Have test login credentials ready
- [ ] Timer visible to keep under 6 minutes

### Files to Open (Pre-load in VS Code tabs):

**Backend (in order):**

1. `KWise-Backend/server.js` (lines 1-120)
2. `KWise-Backend/middleware/auth.js` (lines 1-60)
3. `KWise-Backend/routes/auths.js` (lines 1-20)
4. `KWise-Backend/routes/orders.js` (lines 60-240)
5. `KWise-Backend/controllers/ordersController.js` (lines 1-130)

**Frontend (in order):** 6. `K-Wise/src/api/adminAPI.js` (lines 1-80) 7. `K-Wise/src/pages/Orders/History.js` (lines 1-150)

**Layout tip:** Use split editor in VS Code - backend files on left, frontend files on right

---

## 🎬 TIGHT 6-MINUTE SCRIPT

### **[0:00 - 0:30] Quick Introduction (30 seconds)**

**Say:**

> "Hi, I'm Gabriel Ludwig. This is K-Wise Admin System - a full-stack JavaScript app I built for PC parts management. Tech stack: React frontend, Node.js Express backend, PostgreSQL database. I'll show you the architecture, walk through one complete feature in the code, then demo it live. I used AI for debugging and boilerplate, but I designed the architecture, database schema, and all business logic myself."

**Show:**

- VS Code with project folders visible (K-Wise, KWise-Backend)
- Quick pan of folder structure (3 seconds)

---

### **[0:30 - 1:00] Architecture Overview (30 seconds)**

**Say:**

> "The backend follows MVC - routes define endpoints, controllers handle business logic, models query PostgreSQL. Middleware handles JWT authentication and role-based access. Frontend is React with centralized API calls, Context for auth state, and protected routes. Everything is database-driven, no mock data. Let me show you one feature end-to-end: the Orders API."

**Show:**

- Quick scroll through backend folders: routes/, controllers/, models/, middleware/
- Quick scroll through frontend: src/api/, src/pages/, src/contexts/
- **Keep it FAST** - 2-3 seconds per folder

---

### **[1:00 - 4:00] CODE WALKTHROUGH - Orders Feature (3 MINUTES)**

**This is 2/3 of the video - focus here!**

#### **Part 1: Backend Entry & Middleware (45 seconds)**

**Say:**

> "Starting at server.js - the entry point. Here I configure Express with CORS for security, JSON parsing, and most importantly, this authentication middleware that protects all routes.
>
> Here's the auth middleware - it extracts the JWT from the Authorization header, verifies it with our secret, and attaches the decoded user to the request object. If verification fails, it returns 401. This runs on every protected endpoint."

**Show:**

1. **server.js** (15 seconds)

   - **Show lines 52, 61, 64, 108-109**
   - Point to: `const express = require('express')` (line 52)
   - Point to: `const cors = require('cors')` (line 61)
   - Point to: `app.use(helmet(...))` (line 100)
   - Point to: `const { protect } = require('./middleware/auth')` (line 109)
   - Point to route mounting with protect middleware

2. **middleware/auth.js** (30 seconds)
   - **Show lines 10-60 (the protect function)**
   - Point to JWT verification code:
     - Line 27-28: Token extraction from Authorization header
     - Line 39: `jwt.verify(token, config.jwt.secret)`
     - Line 47-56: Database query to validate user still exists
     - Line 88: Setting `req.user = currentUser`
   - Point out: "Runs on every protected endpoint automatically"

---

#### **Part 2: Routes → Controller → Model (90 seconds)**

**Say:**

> "Now the Orders route - clean RESTful design. GET for fetching orders, POST for creating, DELETE protected with admin-only middleware.
>
> The controller is where business logic lives. Here's createOrder - I validate the input, call the model to insert into database, log the action for audit trail, and return a consistent response format. Notice try-catch for error handling.
>
> The model handles database interaction. This is the createOrder query - using parameterized queries with $1, $2, $3 to prevent SQL injection. I'm inserting into the orders table with user ID, items, total, and returning the new order. Connection pooling is handled here for performance."

**Show:**

1. **routes/auths.js + routes/orders.js** (20 seconds)

   - **auths.js line 13:** Show `router.post('/login', authController.login)`
   - **orders.js lines 237-244:** Show transactions endpoint:

   ```javascript
   router.get('/transactions',
     restrictTo('admin', 'superadmin', 'developer'),
     async (req, res) => { ... }
   )
   ```

   - Point out: "RESTful design, protected by restrictTo middleware for role-based access"

2. **controllers/ordersController.js** (40 seconds)

   - **Show lines 8-60 (getAllOrders function)**
   - Point to key elements:
     - Lines 12-23: Query filters and validation
     - Lines 26-30: Database query with pagination
     - Lines 35-44: Audit logging for security
     - Lines 46-52: Response structure `{ orders, pagination }`
     - Lines 54-58: try-catch error handling
   - Point out: "Business logic here, not in routes - proper MVC separation"

3. **models/Order.js OR PostgreSQL query from routes** (30 seconds)
   - **Show routes/orders.js lines 84-150** (the SQL query builder):
   ```javascript
   const query = `
     SELECT t.*, u.name as assisted_by_name
     FROM transactions t
     LEFT JOIN users u ON t.assisted_by = u.id
     WHERE ${filters}
     ORDER BY t.created_at DESC
     LIMIT $1 OFFSET $2
   `;
   const result = await db.query(sql, [limitNum, offset]);
   ```
   - Point out: "Parameterized queries with $1, $2 prevent SQL injection, LEFT JOIN for user data"

---

#### **Part 3: Frontend API Integration (45 seconds)**

**Say:**

> "Frontend side - this is the centralized API module. Every backend call goes through here. I'm using axios with interceptors - this automatically adds the JWT token to every request from localStorage, and this response interceptor catches 401 errors globally to redirect to login.
>
> Here's a React component - the Transaction History page. On mount, I fetch transaction data using useEffect. Notice the API call with query parameters for filtering - status, date range, pagination. Results are stored in state with useState, then rendered. This pattern is consistent across all my components."

**Show:**

1. **src/api/adminAPI.js** (25 seconds)

   - Show lines 1-42:
   - Axios instance creation with baseURL (`const API_BASE_URL = 'http://localhost:5000/api'`)
   - Request interceptor (lines 19-30): Adds Authorization header with Bearer token
   - Response interceptor (lines 33-42): Catches 401 errors and redirects to login
   - Point out: "This runs on EVERY API request automatically"

2. **src/pages/Orders/History.js** (20 seconds)
   - Show lines 1-116:
   - useState hooks (lines 15-32): `transactions`, `isDataLoading`, `currentPage`, etc.
   - useEffect (lines 70-72): Triggers `fetchTransactionHistory` when filters change
   - fetchTransactionHistory function (lines 96-116): Builds query params, calls `ordersAPI.getTransactionHistory(params)`
   - Point out: "Clean separation - component handles UI, API module handles requests"

---

### **[4:00 - 5:30] Live Demo (90 seconds - NO TECHNICAL TALK)**

**Say:**

> "Now let me show this running. Watch the Network tab - you'll see the exact API calls we just walked through."

**Then demonstrate with MINIMAL narration:**

1. **Login Flow** (25 seconds)

   - **Action:** Clear Network tab, enter credentials, click Login
   - **Point to:** POST request to `http://localhost:5000/api/auth/login` (line 13 from auths.js)
   - **Expand response:** Show JSON with `token` field containing JWT
   - **Switch to Application tab:** Show token stored in `localStorage` → key: `token`
   - **Quick say:** "JWT now stored - automatically attached to all future requests"

2. **Navigate to Transaction History** (20 seconds)

   - **Action:** Click "Orders" → "Transaction History" menu
   - **Point to:** GET request to `http://localhost:5000/api/orders/transactions?page=1&limit=20`
   - **Show:** Status code 200 OK
   - **Expand response:** Show JSON structure:
     ```json
     {
       "success": true,
       "data": {
         "transactions": [...],
         "pagination": { "total": 150, "page": 1, "pages": 8 }
       }
     }
     ```
   - **Quick say:** "Real-time data from PostgreSQL"

3. **Apply Filters (Demonstrate Query Parameters)** (25 seconds)

   - **Action:** Select status filter "Completed", pick date range
   - **Point to:** New GET request with query params:
     `http://localhost:5000/api/orders/transactions?page=1&limit=20&status=completed&from=2025-12-01&to=2025-12-31`
   - **Show payload:** Request Headers → Authorization: `Bearer eyJhbGc...` (JWT token)
   - **Expand response:** Show filtered results
   - **Quick say:** "Frontend sends filters, backend returns exactly what's needed"

4. **Check Console (No Errors)** (10 seconds)

   - **Action:** Switch to Console tab
   - **Show:** Clean console or info logs only (no red error messages)
   - **Quick say:** "No errors - proper error handling throughout"

5. **Verify Code in Sources** (10 seconds)
   - **Action:** Switch to Sources tab → navigate to `adminAPI.js`
   - **Show:** Live code in browser matching VS Code
   - **Quick say:** "Same code, running live"

**Keep this section VISUAL - let the Network tab do the talking!**

---

### **[5:30 - 6:00] Wrap Up (30 seconds)**

**Say:**

> "So that's the complete flow - React makes API call through axios, Express route validates auth with JWT middleware, controller handles business logic, model executes parameterized SQL query against PostgreSQL, response goes back through the stack to the frontend.
>
> This demonstrates my full-stack JavaScript skills: React with hooks, Node.js with Express, PostgreSQL, JWT authentication, RESTful API design, and clean MVC architecture.
>
> Regarding my development process - I used GitHub Copilot as my primary AI assistant. For architectural planning and system design, I used Claude Opus 4.5. For implementing features and writing code, Claude Sonnet 4.5. For debugging complex issues and performance optimization, GPT Codex 5.1 Max and GPT 5.2 - sometimes one model solves what the other can't. For UI inspiration, I used Gemini 3 Pro, though I'm still biased toward Claude. I designed the actual UI in Figma and I'm actively learning more modern tools like Stitch Beta, v0.app, and Dribbble.
>
> But here's the key - AI was my pair programming partner, not my replacement. Every architectural decision, database schema, security implementation, and business logic was mine. I can explain every line of code in this project. Thanks for watching."

**Show:**

- Split screen: VS Code on left, running app on right
- Quick final pan of project structure showing clean organization

---

## 🎯 KEY PRINCIPLES

### DO:

✅ **Keep under 6 minutes** - practice with timer  
✅ **Spend 4 minutes on CODE** (66% of video)  
✅ **Focus on ONE feature** (Orders CRUD with auth)  
✅ **Show complete stack flow** (frontend → API → database)  
✅ **Point to specific lines** while explaining  
✅ **Demo quickly and silently** - let Network tab speak  
✅ **Be confident** - "I designed", "I implemented"

### DON'T:

❌ **Don't explain entire app** - just one feature  
❌ **Don't repeat technical details in demo** - you already covered it  
❌ **Don't spend too long on any single file** - keep moving  
❌ **Don't go over 6 minutes** - team is busy  
❌ **Don't show face** (per original requirements)  
❌ **Don't edit the video** - one take is fine

---

## 🎬 Recording Strategy

### Time Management

- **0:30** - Intro (must be quick!)
- **0:30** - Architecture overview (rapid fire)
- **3:00** - Code walkthrough (this is your showcase)
- **1:30** - Demo (quick and visual)
- **0:30** - Wrap up

### Pacing Tips

1. **Talk faster than normal** - but stay clear
2. **Practice 2-3 times** to get timing right
3. **Use a visible timer** during recording
4. **If you hit 5:00 and still in code**, wrap up immediately
5. **Cut the intro/outro if needed** to prioritize code

### Screen Layout

```
┌──────────────────────────┬─────────────┐
│                          │   BROWSER   │
│       VS CODE            │  (minimized │
│    (80% of screen)       │   during    │
│                          │   code      │
│    - File Explorer       │   section)  │
│    - Multiple files open │             │
│    - Zoom text for       │   NETWORK   │
│      readability         │   TAB       │
│                          │  (visible   │
│                          │   during    │
│                          │   demo)     │
└──────────────────────────┴─────────────┘
```

**During Code Section (minutes 1-4):**

- VS Code takes 80-90% of screen
- Browser minimized or small corner

**During Demo Section (minutes 4-5:30):**

- Browser + DevTools takes 60% of screen
- Keep Network tab visible entire time

---

## 📊 What This Demonstrates

In just 6 minutes, you show:

- ✅ **Architecture understanding** - MVC, middleware, separation of concerns
- ✅ **Security knowledge** - JWT, authentication, parameterized queries
- ✅ **Full-stack skills** - React → Express → PostgreSQL flow
- ✅ **Modern JavaScript** - async/await, hooks, ES6+
- ✅ **Best practices** - error handling, validation, RESTful design
- ✅ **Real implementation** - not just theory, working code

**They'll assess your ability in the first 1-2 minutes** - so make server.js and authMiddleware.js count!

---

## 📤 Revised Email Template

```
Subject: Re: Video Submission - Revised Version (6 Minutes)

Hi Joan,

Thank you for the feedback! I've created a revised version focused on the key requirements:

📹 Video Link: [Your YouTube Unlisted Link]
⏱️ Duration: 6 minutes
📊 Structure:
  - 4 minutes on code (architecture + one complete feature)
  - 2 minutes on demo (showing that feature in action)
  - Focus: Orders API feature demonstrating full-stack flow

The video walks through:
1. Overall architecture (MVC, middleware, auth)
2. One feature end-to-end: Orders CRUD
   - Backend: Routes → Controllers → Models → Database
   - Frontend: React component → API module → Axios interceptors
3. Live demo showing that exact feature with Network tab

This demonstrates full-stack JavaScript skills, authentication/security,
and clean architecture in a concise format.

Best regards,
Gabriel Ludwig Rivera
```

---

## ✅ Final Pre-Flight Check

- [ ] Practiced full script in under 6 minutes
- [ ] Can navigate to all files quickly
- [ ] Know exactly which lines of code to point at
- [ ] Browser and DevTools positioned correctly
- [ ] Backend and frontend running without errors
- [ ] Test credentials work
- [ ] Network tab clears properly
- [ ] Speaking pace is brisk but clear
- [ ] Ready to record in ONE take

---

## 💪 Confidence Reminder

**Your goal:** Show you understand full-stack JavaScript architecture and can explain code clearly.

**What they're looking for:**

- Can you navigate a codebase confidently?
- Do you understand how the pieces connect?
- Can you explain technical concepts clearly?
- Did you actually write/understand this code?

**You've got this!** 6 minutes, one feature, full stack. Simple. 🚀

---

## 🎯 If You Need to Cut Time Further

**If running over, remove in this order:**

1. ~~Wrap-up section~~ (just say "Thanks for watching" at 5:30)
2. ~~Sources tab in demo~~ (not critical)
3. ~~Architecture overview~~ (go straight to code at 0:30)
4. Condense controller/model to 60 seconds total instead of 90

**Absolute minimum structure:**

- 0:00-0:20: "Hi, I'm Gabriel, this is K-Wise, full-stack JavaScript app"
- 0:20-3:50: Code walkthrough (server.js → middleware → route → controller → model → frontend API)
- 3:50-5:50: Demo with Network tab visible
- 5:50-6:00: "That's the full stack flow, thanks"

**Protect the code section at all costs** - that's what they want to see!
