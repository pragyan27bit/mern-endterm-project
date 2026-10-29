# PacePilot ✳ — Your study, in motion

**A deadline-aware academic planning and focus-tracking platform built with MongoDB, Express, React, and Node.js.**

PacePilot is a functional full-stack application that converts a student's coursework into a realistic seven-day study schedule. Instead of acting as a basic to-do list, it uses scheduling rules to allocate time, respect deadlines and prerequisite tasks, and flag work that cannot fit within the student's available study hours.

> **Deployment status:** Source code is ready to configure; it is **not already hosted**. This ZIP also supports deploying *directly from your Mac to Vercel without GitHub*. See [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md) for instructions. No MongoDB credentials or hosting URLs are included.

## 1. Problem statement

Students juggle assignments across multiple courses and often have trouble deciding **what to do next**, how long to allocate, and whether their deadlines are realistic. A plain task list tracks *what* needs doing but does not answer *when* it can be done.

PacePilot brings tasks, deadlines, estimated effort, scheduling, focus tracking, and progress analytics into one consistent product.

**Target users:** University students, bootcamp learners, and self-paced learners managing several subjects and deadlines.

## 2. Main workflows

| Workflow | How it works | Engineering depth |
| --- | --- | --- |
| **Account / workspace** | Register, sign in, use a secure HTTP-only session cookie, update study capacity | Password hashing, JWT verification, user ownership checks, validated account configuration |
| **Coursework management** | Create/edit/delete tasks with course, estimate, deadline, priority, and prerequisite; update completion status | Input validation, task ownership authorization, prerequisite cycle prevention, dependent status rules |
| **Smart week planner** | Generate a 7-day plan with up to 90-minute work blocks; regenerate after changes | Deterministic urgency/priority scoring, deadline and capacity constraints, prerequisite gating, honest unallocated-work reporting |
| **Focus sessions** | Use a pause/resume timer or log offline study minutes against an unfinished task | Session persistence, task time accounting, progress transitions, date validation |
| **Study insights** | View weekly minutes, streaks, completion rates, course progress, and recent sessions | Aggregated MongoDB records, progress math, summary charts, due-soon and overdue metrics |

The demo account creates **six representative tasks and three recorded sessions**, including a prerequisite relationship; it is intended for exploration only. Because the demo account is shared and resets when anyone selects “Try the interactive demo,” **do not store sensitive data in it**. Create a personal account for private data.

## 3. Tech stack

- **Frontend:** React 18, Vite 6, CSS3, Lucide React icons, Recharts
- **Backend:** Node.js 20+, Express 4
- **Database:** MongoDB Atlas, Mongoose 8
- **Authentication:** bcryptjs password hashes; signed JWT in HTTP-only, `SameSite=Lax`, production-secure cookie
- **Security/validation:** Helmet, auth rate limiting, body size limit, model and route validation, owner-scoped queries
- **Deployment:** Render single Node.js web service serving the built frontend, with MongoDB Atlas for persistence
- **Quality:** Node native test runner for deterministic scheduling tests; GitHub Actions for syntax/test/build checks

No API subscriptions or AI credentials are required.

## 4. Architecture

```text
Browser (React SPA, Vite build)
    │ same-origin requests: /api/*
    ▼
Express web server (Helmet, cookies, JSON parser, rate limiting)
    ├── /api/auth/*           register / login / logout / demo / me
    ├── /api/tasks/*          ownership-restricted task workflows
    ├── /api/plan/*           priority/deadline scheduling engine
    ├── /api/focus            persistent study session logging
    ├── /api/insights         aggregated progress and analytics
    ├── /api/profile          daily capacity settings
    └── /*                    static client/dist + SPA fallback
    │
    ▼
MongoDB Atlas
    ├── users      password hashes, profile, daily capacity
    ├── tasks      estimates, time spent, status, prerequisite
    ├── focuses    minutes, task, logged day, method
    └── plans      schedule blocks and unschedulable work
```

All task, plan, and focus requests are scoped to the currently authenticated user. Records are never looked up by client-supplied owner IDs.

### Scheduling behavior

Given a start date and daily capacity, the pure `buildPlan()` function:

1. Ignores completed tasks and work already fully logged.
2. Excludes tasks whose prerequisite has not been completed and reports them as blocked.
3. Computes an urgency score from deadline proximity, priority, and unfinished workload.
4. Iterates through the next seven days, allocating work in blocks of at most **90 minutes**.
5. Never exceeds the configured daily capacity and **never schedules a task after its due date**.
6. Reports any remaining unscheduled minutes with an explanation instead of silently overbooking.

The algorithm is a heuristic, not an exhaustive optimization solver. The resulting schedule is a **snapshot**; generating a new schedule after changing tasks or logging sessions updates the saved plan.

### Reliability choices

- Completed prerequisite tasks unlock dependent tasks; dependencies cannot be cyclic.
- Reopening a prerequisite is forbidden while a dependent task is marked completed.
- Deleting a task also removes its focus records and unlinks dependent tasks.
- Deleting a task invalidates the saved plan; editing/completing tasks requires re-generating the plan to refresh the snapshot.
- The demo reset is not meant for shared production workspaces.
- Server responses include structured errors for invalid input, unauthorized access, duplicate accounts, and missing tasks.

## 5. Local setup

**Prerequisites:** Node.js 20+ (Node 22 recommended), npm, and a free MongoDB Atlas cluster (or local MongoDB database).

```bash
# 1. Unzip the project and open its root directory
cd PacePilot_MERN

# 2. Install backend and frontend dependencies
npm install

# 3. Add environment configuration (do not commit .env)
cp .env.example .env

# 4. Edit .env with your own MONGODB_URI and JWT_SECRET
# Generate a secret with:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 5. Run frontend and API together
npm run dev
```

Open **http://localhost:5173**. The Vite development server forwards `/api` requests to **http://localhost:5000**.

If a MongoDB connection is not configured or authentication fails, the backend will not start. This is intentional: no pretend persistence or mock production data.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Connection string from MongoDB Atlas or a local MongoDB server |
| `JWT_SECRET` | Yes | Random secret, **at least 32 characters** |
| `NODE_ENV` | In production | Set to `production` so the cookie uses `Secure` |
| `PORT` | No | Defaults to `5000`; Render injects its own port |
| `ENABLE_DEMO` | No | `true` by default; set to `false` to disable the demo endpoint |

Keep credentials out of your repository. Only `.env.example` is version-controlled.

## 6. Deploy to Render + MongoDB Atlas

This is a **single-service deployment**; there is no separate Vercel frontend or CORS configuration needed.

### A. Prepare MongoDB Atlas

1. Create a free **M0** MongoDB Atlas cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. In **Database Access**, create a database user with a strong password. Grant access to your PacePilot database.
3. In **Network Access**, allow connectivity from your host. Render free instances typically do not expose a stable outbound IP; if you temporarily use `0.0.0.0/0`, use strong database credentials and remove/restrict broad access when you can.
4. Select **Connect → Drivers → Node.js** and copy the connection string. Replace the username/password placeholders and ensure the database name is `pacepilot`. **URL-encode special characters** in passwords.

### B. Upload to GitHub

```bash
cd PacePilot_MERN
git init
git add .
git commit -m "Initialize PacePilot MERN application"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Create the **empty** repository on GitHub before pushing, or use the GitHub web upload flow. Subsequent, genuine changes should have their own commits, for example bug fixes, documentation updates, or UI refinements. The final repository should reflect your actual development and testing work.

### C. Deploy the backend + frontend together

1. Open [render.com](https://render.com) → **New** → **Blueprint** and connect your GitHub repository containing `render.yaml`. Alternatively create a **Web Service** from the repo.
2. If deploying manually, choose **Node**, build command `npm install && npm run build`, and start command `npm start`.
3. Add environment variable `MONGODB_URI` with the Atlas URI. The Blueprint generates `JWT_SECRET` automatically; for a manual service, provide a strong secret yourself.
4. Ensure `NODE_ENV=production`. The health endpoint `/api/health` should return `{ "status": "ok" }` when MongoDB is connected.
5. Wait until Render says the deployment is **Live**, then open its `https://...onrender.com` address.
6. Test registration, create a task, regenerate a plan, refresh, and confirm the task is still there.

**Troubleshooting:** A 503 health response usually means the database is not connected. A MongoDB authentication error usually means invalid credentials or a password that needs URL-encoding. A timeout may indicate Atlas Network Access settings. A 404 at `/` during local production start means you have not run `npm run build`. Free Render services may have a slow initial startup after inactivity.

## 7. Production build and tests

```bash
npm test                 # scheduling test suite
npm run check            # backend JavaScript syntax checks
npm run build            # create client/dist
npm start                # serve the frontend and API from port 5000
```

A `render.yaml` and `.github/workflows/ci.yml` are included. GitHub Actions installs dependencies, runs tests, and builds the frontend on pushes and pull requests.

## 8. User experience and exception handling

- Responsive desktop/mobile sidebar and full-screen mobile navigation
- Task creation/editing with field validation, course suggestions, status and priority controls
- Search, filtering, due-date sorting and course filtering
- Empty states, loading states, operation feedback and failure toasts
- Deadline alerts, prerequisite blockers, unallocated-schedule conflicts
- Pause/resume focus timer and session persistence
- Clear analytics, settings and demo workspace

The demo feature requires a configured MongoDB database just like all other functions.

## 9. Security notes and known limitations

- Shared demo data is public-to-demo-users and resets on demo sign-in. **Do not enter private information in demo.**
- JWT cookies last seven days. Logout clears the browser cookie; the app does not maintain a central JWT revocation list.
- Because focus logs are recorded in separate operations from task-minute updates, unexpected database failures between writes could cause mismatched counts. Production hardening would wrap these writes in a MongoDB transaction on a replica set.
- The focus timer runs in the active browser tab; it is not a server-authoritative proof of time spent.
- Calendar dates are stored as `YYYY-MM-DD` strings, making them stable across browser time zones. The client sends its calendar day for analytics and scheduling; some server defaults use UTC.
- No email verification/password reset is provided, so use a password manager and treat this as an academic project rather than a production-critical student information system.
- Passwords are never persisted or logged as plain text; JWT secrets remain in server environment variables.

## 10. Key folders

```text
PacePilot_MERN/
├── client/
│   ├── src/components/      reusable UI and task form
│   ├── src/pages/           dashboard, tasks, planner, focus, analytics, auth, settings
│   ├── src/lib/api.js        same-origin API wrapper, formatting helpers
│   ├── src/main.jsx         app navigation, authenticated actions, shared state
│   ├── src/style.css        responsive visual system
│   ├── index.html
│   └── vite.config.js
├── server/src/
│   ├── models/index.js     User, Task, Focus, Plan models
│   ├── lib/planner.js      pure scheduling logic
│   ├── lib/auth.js         HTTP-only signed session cookies
│   ├── routes/api.js       REST endpoints + validation
│   └── index.js           Express startup and static hosting
├── tests/planner.test.js    automated scheduling tests
├── render.yaml              Render Blueprint config
├── .env.example             example config without credentials
├── ARCHITECTURE.md          technical design
├── DEMO_SCRIPT.md           recommended 3–5 minute walkthrough
├── SUBMISSION_TEMPLATE.md   checklist and links to fill out
└── package.json
```

## 11. Submission reminder

The application ZIP is **not** a substitute for the required GitHub URL, live app URL, demo video URL, and completed submission form. Record a **3–5 minute working demo**, and test your GitHub, Render, and video links in a private browser window.

**Academic project deadline in the provided brief: October 27, 2026, 11:59 PM IST.**

Original implementation assembled for this end-term submission. Third-party open-source packages are declared in `package.json`. No prebuilt template application or third-party full-project source was imported.
