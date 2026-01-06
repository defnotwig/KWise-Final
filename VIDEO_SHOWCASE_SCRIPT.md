# 🎬 K-Wise Admin System - Video Showcase Script

**Duration:** 6-7 minutes  
**Purpose:** Demonstrate full-stack JavaScript skills for job application

---

## 📋 Pre-Recording Checklist

### Environment Setup

- [ ] **Clean desktop** - Close unnecessary applications
- [ ] **PostgreSQL running** - KWiseDB database active
- [ ] **VS Code open** - Project loaded with file tree visible
- [ ] **Browser ready** - Chrome/Edge with DevTools in vertical layout
- [ ] **Terminal ready** - PowerShell positioned for commands
- [ ] **Screen resolution** - Set to 1920x1080 for clarity
- [ ] **OBS/Recording software** - Configured to NOT show face
- [ ] **Microphone test** - Clear audio, minimal background noise

### Application Preparation

```bash
# Terminal 1 - Backend
cd "c:\Users\Ludwig Rivera\Downloads\K-Wise Final 2\KWise-Backend"
node server.js

# Terminal 2 - Frontend
cd "c:\Users\Ludwig Rivera\Downloads\K-Wise Final 2\K-Wise"
npm start
```

### Browser DevTools Setup

1. Open Chrome at `http://localhost:3000`
2. Press `F12` to open DevTools
3. Click DevTools settings (⚙️) → Dock side → "Dock to right"
4. Open these tabs: **Network**, **Console**, **Sources**
5. Clear console and network logs before starting

### VS Code Layout

1. Split editor into 2-3 columns
2. Keep Explorer panel visible (file tree)
3. Have these files ready to open:
   - `KWise-Backend/server.js`
   - `KWise-Backend/routes/auth.js`
   - `KWise-Backend/controllers/ordersController.js`
   - `KWise-Backend/models/ordersModel.js`
   - `K-Wise/src/api/api.js`
   - `K-Wise/src/pages/Dashboard.jsx`

---

## 🎯 Video Script with Timestamps

### **[0:00 - 0:45] Introduction (45 seconds)**

**What to Say:**

> "Hi, I'm Gabriel Ludwig, and today I'm showcasing my K-Wise Admin System - a full-stack JavaScript application I built for managing a PC parts business. This is a production-ready admin panel with real-time features, role-based access control, and complete CRUD operations.
>
> The tech stack is React on the frontend, Node.js with Express on the backend, and PostgreSQL for the database. Everything you'll see is code I personally architected and implemented - I used AI as a learning tool and for debugging, similar to how developers use Stack Overflow, but all the architecture decisions, database design, and core logic are mine.
>
> I'll focus mostly on the code and how data flows through the system rather than just clicking through the UI."

**What to Show:**

- VS Code with project structure visible
- Quick glimpse of both K-Wise and KWise-Backend folders

---

### **[0:45 - 1:30] Project Structure & Architecture (45 seconds)**

**What to Say:**

> "Let me show you the project structure. This is a monorepo with clear separation of concerns.
>
> The backend in KWise-Backend follows MVC architecture - we have routes that define endpoints, controllers that handle business logic, models that interact with PostgreSQL, and middleware for authentication and authorization.
>
> The frontend in K-Wise is a React application with centralized API calls, Context for state management, and protected routes. Notice how everything is organized - no duplicate files, no mock data, everything is database-driven."

**What to Show:**

- Scroll through `KWise-Backend/` folder structure
  - Highlight: `routes/`, `controllers/`, `models/`, `middleware/`
- Scroll through `K-Wise/src/` structure
  - Highlight: `api/`, `contexts/`, `pages/`, `components/`
- Show `server.js` briefly
- Show `.env` file (blur out sensitive values)

---

### **[1:30 - 3:00] Live Demo with DevTools (90 seconds)**

**What to Say:**

> "Now let me show the application running. I'll log in as an admin user and demonstrate real-time features while we watch the network requests in DevTools.
>
> Watch the Network tab - here's the authentication flow. When I log in, we send credentials to `/api/auth/login`, and the backend returns a JWT token that gets stored securely.
>
> Now I'm on the dashboard - notice this API call fetching real-time statistics from PostgreSQL. Let me show you the orders page. Watch the Network tab - here's a GET request to `/api/orders` pulling data from the database.
>
> I'll create a new order - see this POST request? It's sending JSON data with validation on both frontend and backend. And here's the response with the newly created order ID.
>
> Let me check the audit logs - every action in the system is tracked with user ID, timestamp, and IP address for security and compliance."

**What to Show:**

1. **Login Process** (20 seconds)

   - Clear Network tab
   - Enter credentials
   - Show POST request to `/api/auth/login`
   - Show JWT in response (expand the response payload)
   - Show token stored in localStorage (Application tab)

2. **Dashboard Statistics** (20 seconds)

   - Navigate to Dashboard
   - Show GET request to `/api/dashboard/stats` or similar
   - Expand response JSON showing real data
   - Point to specific numbers matching UI

3. **Orders CRUD** (30 seconds)

   - Navigate to Orders page
   - Show GET `/api/orders` request with query parameters
   - Create new order (or edit existing)
   - Show POST/PUT request with payload
   - Show successful response with status code 201/200

4. **Audit Logs** (20 seconds)
   - Navigate to Audit Logs
   - Show GET request to `/api/audit-logs`
   - Expand response showing tracked actions

**DevTools Focus:**

- Keep Network tab visible
- Occasionally switch to Console to show no errors
- Point out HTTP status codes (200, 201, 401, etc.)

---

### **[3:00 - 4:45] Code Deep Dive - Backend (105 seconds)**

**What to Say:**

> "Now let me show you the code behind these requests. Starting with the backend architecture.
>
> This is server.js - our entry point. I've configured Express with security middleware like helmet for HTTP headers, CORS for cross-origin requests, and custom middleware for JWT authentication and role-based access control.
>
> Here's the authentication middleware - it extracts the JWT from the Authorization header, verifies it using our secret key, and attaches the user object to the request. This runs on every protected route.
>
> Now the orders route - notice the clean RESTful structure. Each route is protected by authentication middleware, and some have role-based checks to ensure only admins can delete orders, for example.
>
> Here's the orders controller - this is where business logic lives. Notice how I'm using try-catch blocks for error handling, validating inputs, and calling the model layer. No business logic in routes, no SQL in controllers - proper separation.
>
> And here's the model - this interacts directly with PostgreSQL using parameterized queries to prevent SQL injection. I'm using connection pooling for performance and handling null cases properly with COALESCE."

**What to Show:**

1. **server.js** (25 seconds)

   ```javascript
   // Show:
   - require statements
   - Middleware configuration (cors, helmet, express.json)
   - Authentication middleware import
   - Route mounting (/api/orders, /api/auth, etc.)
   - Error handling middleware
   - Port configuration (5000)
   ```

2. **middleware/authMiddleware.js** (20 seconds)

   ```javascript
   // Show:
   - JWT verification logic
   - Token extraction from headers
   - User object attachment to req.user
   - Error handling for invalid/expired tokens
   ```

3. **routes/orders.js** (15 seconds)

   ```javascript
   // Show:
   - Express Router setup
   - Route definitions (GET, POST, PUT, DELETE)
   - Middleware chaining (auth, roleCheck)
   - Controller function calls
   ```

4. **controllers/ordersController.js** (25 seconds)

   ```javascript
   // Show:
   - One complete function (e.g., createOrder)
   - Input validation
   - Model call
   - Response structure { success, data, message }
   - Error handling
   ```

5. **models/ordersModel.js** (20 seconds)
   ```javascript
   // Show:
   - Database pool import
   - Parameterized query with $1, $2, $3
   - SQL query structure
   - Result handling and return
   ```

**Key Points to Mention:**

- "Notice parameterized queries here - $1, $2 - prevents SQL injection"
- "All database credentials come from environment variables"
- "Connection pooling for better performance"
- "Consistent error handling pattern throughout"

---

### **[4:45 - 6:00] Code Deep Dive - Frontend (75 seconds)**

**What to Say:**

> "Now the frontend code. This is the centralized API module - every backend request goes through here. I'm using axios with interceptors to automatically attach JWT tokens to requests and handle authentication errors globally.
>
> Here's a React component - the Dashboard. I'm using functional components with hooks. Notice the useEffect for data fetching on mount, useState for local state, and useContext for global auth state.
>
> This is the AuthContext - it provides authentication state to the entire app. When a user logs in, the token is stored, and all components can access the current user's information.
>
> And here's how protected routes work - this ProtectedRoute component checks authentication before rendering child components. If not authenticated, it redirects to login. This prevents unauthorized access on the frontend.
>
> One cool feature - real-time updates. I'm using polling or WebSocket connections to keep the dashboard statistics current without manual refresh."

**What to Show:**

1. **api/api.js** (20 seconds)

   ```javascript
   // Show:
   - axios instance creation with baseURL
   - Request interceptor adding Authorization header
   - Response interceptor handling 401 errors
   - One API function (e.g., getOrders, createOrder)
   ```

2. **pages/Dashboard.jsx** (25 seconds)

   ```javascript
   // Show:
   - Component structure
   - useState hooks
   - useEffect for API call
   - API function call from api.js
   - State update with response data
   - JSX rendering data
   ```

3. **contexts/AuthContext.jsx** (15 seconds)

   ```javascript
   // Show:
   - Context creation
   - State management (user, token)
   - Login/logout functions
   - Provider wrapping
   ```

4. **ProtectedRoute component** (15 seconds)
   ```javascript
   // Show:
   - Authentication check
   - Conditional rendering
   - Redirect logic
   - Role-based access if implemented
   ```

**Key Points to Mention:**

- "Using React Context instead of Redux for simpler state management"
- "All API calls are centralized - easier to maintain and add global error handling"
- "Functional components with hooks - modern React best practices"

---

### **[6:00 - 6:30] Database & Personal Contributions (30 seconds)**

**What to Say:**

> "Let me quickly show the database structure. I designed this PostgreSQL schema with proper relationships, foreign keys, and indexes for performance.
>
> We have tables for users with password hashing, pc_parts with detailed specifications, orders with status tracking, and audit_logs for compliance.
>
> Regarding my contributions - I designed the entire database schema, implemented the authentication system with JWT and role-based access control, built the API layer with proper error handling and validation, and created the React frontend with protected routes and real-time features. I used AI tools like Copilot for boilerplate code and debugging, similar to how professionals use documentation and forums, but all architectural decisions, security implementations, and data modeling are my work."

**What to Show:**

- Open a database client or show SQL schema file
- Quickly scroll through key tables:
  - `users` table (id, email, password_hash, role, created_at)
  - `orders` table with foreign keys
  - `audit_logs` table structure
- Show one SQL query from models/ with JOIN if possible

---

### **[6:30 - 7:00] Wrap Up & Key Features (30 seconds)**

**What to Say:**

> "To summarize, this project demonstrates:
>
> - Full-stack JavaScript development with React and Node.js
> - RESTful API design with proper authentication and authorization
> - PostgreSQL database design with relationships and security
> - Clean architecture with separation of concerns
> - Production-ready features like audit logging and error handling
> - Modern React patterns with hooks and context
>
> This is a real-world admin system that could be deployed to production today. All code is available in my GitHub repository. Thanks for watching, and I'm excited to discuss this project further in the next steps."

**What to Show:**

- Quick scroll through project again
- Show terminal with both servers running
- Show browser with working application
- End on VS Code with clean project structure

---

## 🎥 Recording Tips

### Screen Layout Recommendation

```
┌─────────────────────┬─────────────────┐
│                     │                 │
│    VS CODE          │   BROWSER       │
│    (Main Editor)    │   (App Running) │
│                     │                 │
│                     │   DEVTOOLS      │
│                     │   (Network/     │
│                     │    Console)     │
└─────────────────────┴─────────────────┘
```

### What to Avoid

- ❌ Don't show your face (as per requirements)
- ❌ Don't read from a script verbatim (speak naturally)
- ❌ Don't edit the video (live, unscripted recording)
- ❌ Don't spend too much time on UI clicks
- ❌ Don't hide your involvement ("AI did everything")
- ❌ Don't show sensitive data (.env values, real passwords)
- ❌ Don't use Loom (use YouTube unlisted link)

### What to Do

- ✅ Speak clearly and at moderate pace
- ✅ Explain your thought process and decisions
- ✅ Show code and data flow extensively
- ✅ Highlight your personal contributions
- ✅ Point to specific lines of code while explaining
- ✅ Show Network requests and responses
- ✅ Demonstrate understanding of full-stack flow
- ✅ Mention challenges you solved
- ✅ Be honest about AI assistance (debugging, boilerplate)

---

## 🔍 Key Talking Points to Emphasize

### Your Skills

1. **Full-Stack Architecture**: "I designed the entire system architecture from database schema to frontend components"
2. **Security**: "Implemented JWT authentication, password hashing with bcrypt, SQL injection prevention, and RBAC"
3. **Clean Code**: "Followed MVC pattern, separation of concerns, no duplicate code, database-driven"
4. **Modern JavaScript**: "ES6+ features, async/await, functional React components with hooks"
5. **Database Design**: "Normalized PostgreSQL schema with proper relationships and indexes"
6. **API Design**: "RESTful conventions, consistent response structure, proper HTTP status codes"
7. **Error Handling**: "Comprehensive error handling on both frontend and backend with user-friendly messages"
8. **Real-Time Features**: "Implemented polling/WebSockets for live dashboard updates"

### AI Collaboration Transparency

> "I want to be transparent about my development process. I used AI tools like GitHub Copilot as a pair programming assistant - similar to how developers use Stack Overflow or documentation. The AI helped with boilerplate code, syntax suggestions, and debugging errors. However, all architectural decisions, database schema design, security implementations, and business logic are my work. I can explain every line of code in this project and made all the technical decisions myself. AI was a tool to accelerate development, not a replacement for my skills and knowledge."

### Problem-Solving Examples

Mention 1-2 specific challenges:

1. "One challenge was implementing real-time audit logging without impacting performance. I solved this by using database triggers and async logging middleware."
2. "Another was handling authentication across frontend and backend securely. I implemented JWT with refresh tokens and HTTP-only cookies for XSS protection."

---

## 📤 Publishing Your Video

### YouTube Upload Steps

1. Go to YouTube Studio (studio.youtube.com)
2. Click "Create" → "Upload video"
3. Select your recorded video file
4. **Title**: "K-Wise Admin System - Full-Stack JavaScript Project Showcase"
5. **Description**:

   ```
   Full-stack JavaScript admin system demonstrating:
   - React frontend with hooks and context
   - Node.js/Express RESTful API
   - PostgreSQL database with complex queries
   - JWT authentication & role-based access control
   - Real-time features and audit logging

   Tech Stack: React, Node.js, Express, PostgreSQL, JWT
   GitHub: [Your GitHub link]

   Project built by Gabriel Ludwig Rivera
   Created for job application portfolio demonstration
   ```

6. **Visibility**: Set to "Unlisted" (not Public, not Private)
7. **Thumbnail**: Screenshot of your code or architecture
8. Click "Publish"
9. Copy the shareable link

### Email Response Template

```
Subject: Video Submission - Full-Stack JavaScript Developer Role

Dear Joan and Recruiting Team,

Thank you for the opportunity to showcase my skills. I've prepared a 7-minute
video demonstration of my K-Wise Admin System, a production-ready full-stack
JavaScript application.

Video Link: [Your YouTube Unlisted Link]

In the video, I demonstrate:
- Complete full-stack architecture (React + Node.js + PostgreSQL)
- Live API requests and data flow through DevTools
- Authentication and authorization implementation
- Database design and query optimization
- Clean code architecture and modern JavaScript patterns

The project showcases my ability to:
✓ Design and implement RESTful APIs
✓ Build responsive React applications with modern hooks
✓ Work with relational databases and complex queries
✓ Implement security best practices (JWT, RBAC, input validation)
✓ Structure large codebases with clean architecture

I'm happy to answer any questions about the project or my development process.

Best regards,
Gabriel Ludwig Rivera
[Your Email]
[Your GitHub/Portfolio Link]
```

---

## ⚡ Quick Reference - File Paths to Showcase

### Must-Show Backend Files

1. `KWise-Backend/server.js` - Entry point & middleware setup
2. `KWise-Backend/middleware/authMiddleware.js` - JWT verification
3. `KWise-Backend/routes/orders.js` - Route definitions
4. `KWise-Backend/controllers/ordersController.js` - Business logic
5. `KWise-Backend/models/ordersModel.js` - Database queries

### Must-Show Frontend Files

1. `K-Wise/src/api/api.js` - Centralized API calls
2. `K-Wise/src/pages/Dashboard.jsx` - Main dashboard component
3. `K-Wise/src/contexts/AuthContext.jsx` - Authentication state
4. `K-Wise/src/App.jsx` - Protected routes setup

### Bonus Files (if time permits)

- `KWise-Backend/middleware/rbacMiddleware.js` - Role-based access
- `KWise-Backend/config/database.js` - Database configuration
- `K-Wise/src/hooks/useApi.js` - Custom React hooks
- SQL schema file from `KWise-Backend/sql/`

---

## 🎬 Final Checklist Before Recording

- [ ] Application runs without errors
- [ ] Database has sample data
- [ ] DevTools layout is vertical
- [ ] All tabs ready (Network, Console, Sources)
- [ ] VS Code layout clean with file tree visible
- [ ] No sensitive data visible in .env
- [ ] Audio quality tested
- [ ] Screen recording software configured
- [ ] Practiced speaking points 2-3 times
- [ ] Timer ready to keep within 6-7 minutes
- [ ] Browser tabs closed except for localhost:3000

---

## 💡 Confidence Boosters

Remember:

1. **You built this** - Every architectural decision is yours
2. **AI is a tool** - Like Stack Overflow, not a crutch
3. **Show enthusiasm** - Passion matters more than perfection
4. **Mistakes are okay** - This is unedited, natural is good
5. **Focus on learning** - Show how you solve problems
6. **Be specific** - "I chose JWT because..." not "I used JWT"
7. **Own your work** - "I designed/implemented/architected"

---

## 🚀 You've Got This!

This project demonstrates real-world full-stack skills that many candidates don't have. Be confident, be clear, and show your passion for coding. Good luck! 🎉
