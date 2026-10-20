# CampusFix AI - Autonomous Campus Problem-Solving Agent

CampusFix AI is a hackathon prototype for reporting and resolving campus maintenance problems (broken fans,
Wi-Fi outages, water shortages, damaged equipment). Students file a report; a **controlled AI agent** classifies it,
sets a priority, finds duplicate reports, investigates repeated problems, recommends a fix and **drafts a
maintenance ticket that an admin must approve**.

> **Important:** this is a prototype. Tickets are internal database records. The app does **not** dispatch staff,
> send notifications, or contact emergency services. Safety-related complaints are flagged for urgent *human* review.

## Features

| Area | What it does |
| --- | --- |
| Landing page | Explains the system, links to Report an Issue and View Dashboard |
| Complaint form | Validated form (title, description, location, category, optional name, anonymous option), double-submit protection, success screen with complaint ID |
| Tracking | Look up a complaint by ID: status progress, priority, AI summary, ticket info, resolution notes |
| Admin dashboard | Live metrics from the database, search, filters (category, location, priority, status), sorting, complaint detail view |
| AI classification | Gemini returns JSON (category, priority, summary, reasoning, recommended action, team, confidence), validated with Zod |
| Demo mode | No API key needed: deterministic keyword-based fallback produces the same fields |
| Agent workflow | Fixed, auditable tool sequence (see below) |
| Duplicate detection | Normalized-text + keyword overlap + category + location + status score; configurable threshold |
| Priority and safety rules | Deterministic rules set a **floor** the AI cannot go below (e.g. sparks, smoke, exposed wire = Critical) |
| Tickets | Admin approval required; one active ticket per complaint; status lifecycle; resolution notes; synced with complaint status |
| Insights | Top categories and locations, repeated unresolved issues, high-priority list, average resolution time, weekly volume (shows empty states instead of inventing numbers) |
| Admin protection | Shared-passcode login (`ADMIN_PASSCODE`) guards the dashboard, tickets, insights and all admin APIs; students stay login-free |
| Audit log | Important actions (submit, classify, duplicate link, escalation, ticket, status changes) are recorded |

### The agent workflow

`lib/agent/workflow.ts` runs these steps in a fixed order (the model is only used in step 4):

1. Receive the complaint ID and validate it (Zod)
2. `getComplaint` reads the real record from SQLite
3. `classifyComplaint` calls Gemini (or the fallback), validates the output, then applies safety rules
4. `searchSimilarComplaints` scores earlier unresolved complaints
5. `investigateComplaint` links duplicates to the original, counts affected students, escalates repeated issues
6. `recommendAction` builds the recommendation and decides whether a ticket should be suggested
7. An `InvestigationRecord` and audit entries are stored
8. **The workflow stops.** `createMaintenanceTicket(complaintId, approval)` only runs when an admin approves in the UI.

The tools live in `lib/agent/tools.ts`: `getComplaint`, `searchSimilarComplaints`, `classifyComplaint`,
`investigateComplaint`, `recommendAction`, `createMaintenanceTicket`, `updateComplaintStatus` (plus
`updateTicketStatus`) and `getDashboardMetrics`.

If Gemini is unavailable or returns something invalid, the workflow falls back to the rule-based analysis and the
UI labels the result **Rule-based (demo analysis)** instead of **AI-generated (Gemini)**. The original report is
always saved first, so analysis failures never lose a complaint.

### Definitions worth knowing

* **Pending tickets** (dashboard card): open, non-duplicate complaints with no active ticket, i.e. the agent has
  suggested a ticket and nobody has approved it yet. "Pending Approval" exists as a ticket status for completeness,
  but tickets are only created after approval, so suggestions are shown as "awaiting approval".
* **Critical** (dashboard card): open complaints with Critical priority.
* **Duplicates**: a duplicate is kept and linked to the original; it never gets its own ticket. When the original is
  resolved, open duplicates are resolved with it.
* **Repeat escalation**: when 3 or more students report the same issue, a Medium/Low priority is raised one level (never
  above High; Critical comes only from safety rules).

## Architecture

```
app/                    Next.js App Router pages and API route handlers
  page.tsx              Landing page
  complaints/new        Complaint form
  tracking              Student tracking page (GET form, server rendered)
  (admin)/dashboard     Dashboard + complaint detail
  (admin)/tickets       Ticket list and approval queue
  (admin)/insights      Trend insights
  api/                  REST endpoints (Zod validated, consistent JSON errors)
components/             UI components (badges, form, dialogs, toasts, admin sidebar)
lib/
  ai/                   Gemini client, Zod schema, fallback analyzer, orchestration
  agent/                tools, workflow, priority/safety rules, status transition rules
  duplicate-detection/  similarity scoring
  analytics/            metrics and insights (pure functions)
  database/             Prisma client, queries, audit log
  validation/           Zod schemas
prisma/                 schema.prisma + seed.ts
tests/                  Vitest tests
scripts/                setup-env.mjs (creates .env on first setup)
```

Stack: Next.js 14 (App Router) + React 18 + TypeScript, Tailwind CSS 3, Prisma 5 + SQLite, Zod, Google Gen AI SDK
(`@google/genai`), Lucide icons, Vitest.

### API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/complaints` | Create a complaint and run the agent workflow |
| POST | `/api/admin/login`, `/api/admin/logout` | Start or end an admin session (public) |
| GET | `/api/complaints` | List complaints (`q`, `category`, `location`, `priority`, `status`, `sort`) |
| GET | `/api/complaints/:id` | Fetch a complaint (admin view) |
| GET | `/api/track/:id` | Student-safe tracking view |
| POST | `/api/complaints/:id/analyze` | Re-run the investigation |
| GET | `/api/complaints/:id/similar` | Similar complaints with scores |
| GET | `/api/complaints/:id/investigations` | Stored investigation records |
| PATCH | `/api/complaints/:id/status` | Update complaint status |
| POST | `/api/complaints/:id/ticket` | Create ticket (body `{ "approval": true }` required) |
| PATCH | `/api/tickets/:ticketId` | Update ticket status |
| GET | `/api/dashboard/metrics` | Dashboard metrics and AI mode |
| GET | `/api/insights` | Trend insights |

Public endpoints: `POST /api/complaints`, `GET /api/track/:id` and the two admin session endpoints. All others
require the admin cookie and return `401` without it.

Responses are `{ "data": ... }` or `{ "error": { "code", "message", "fieldErrors"? } }`. Stack traces and
environment values are never returned.

## Prerequisites (Windows)

* Windows 10/11
* **Node.js 18.18 or newer** (Node 20 LTS or 22 recommended): https://nodejs.org (check with `node -v`)
* **VS Code**: https://code.visualstudio.com
* Internet access for `npm install` (and for Gemini, if you enable it)

## Install and run on Windows

1. Right-click `CampusFix-AI.zip` and choose **Extract All...** You get a single `CampusFix-AI` folder.
2. Open VS Code, choose **File > Open Folder...** and select `CampusFix-AI`.
3. Open a terminal in VS Code (**Terminal > New Terminal**). PowerShell or Command Prompt both work.
4. Install dependencies:

   ```powershell
   npm install
   ```

5. Create the `.env` file, generate the Prisma client, create the SQLite database and load demo data (one command):

   ```powershell
   npm run setup
   ```

   This copies `.env.example` to `.env` if needed, creates `prisma/dev.db`, and seeds demo complaints.

6. Start the development server:

   ```powershell
   npm run dev
   ```

7. Open http://localhost:3000

### Command reference

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run build` then `npm start` | Production build and server |
| `npm run setup` | Create `.env`, generate client, create DB, seed |
| `npm run db:seed` | Replace demo data (real complaints are kept) |
| `npm run db:reset` | Wipe the database completely and re-seed |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint (Next.js rules) |
| `npm test` | Run the Vitest test suite once |

On first `npm run lint`, Next.js may ask which ESLint config to use; the project already has `.eslintrc.json`, so no
prompt should appear.

## Demo mode and Gemini

**Demo mode (default):** leave `GEMINI_API_KEY` empty. Classification, priority, duplicate detection and
recommendations all work using transparent keyword rules. The sidebar shows **Demo mode** and results are labeled
**Rule-based (demo analysis)**.

**Enable Gemini:**

1. Create a key at https://aistudio.google.com/apikey
2. Open `.env` and set `GEMINI_API_KEY="your-key"`
3. Restart `npm run dev`. The admin sidebar changes to **Gemini AI enabled** and new complaints are labeled
   **AI-generated (Gemini)**.

The default model is `gemini-3.8-flash`. Google retires and renames models regularly (`gemini-2.5-flash` is
scheduled to retire on 20 Oct 2026), so if you see a 404 or 400 error under "Why rules were used" on a complaint,
set `GEMINI_MODEL` in `.env` to a current name from https://ai.google.dev/gemini-api/docs/models and restart. Never commit `.env` and never paste your key into the code.

Other settings in `.env`: `DUPLICATE_THRESHOLD` (default `0.55`; lower finds more duplicates).

## Admin login

Students never log in: the landing page, report form, tracking page, `POST /api/complaints` and `GET /api/track/:id`
are public. Everything for staff is protected by a shared passcode:

* Pages: `/dashboard`, `/tickets`, `/insights` (and complaint detail pages)
* APIs: every endpoint except the two public ones above

Set it in `.env`, then restart the server:

```
ADMIN_PASSCODE="a-long-hard-to-guess-passcode"
```

Open `/dashboard`; you are redirected to `/admin/login`. After logging in, a signed, HTTP-only cookie keeps you
signed in for 8 hours. Use **Log out** in the sidebar to end the session. Changing the passcode logs everyone out.
After 5 wrong attempts from the same address, login is paused for a minute.

| `ADMIN_PASSCODE` | Development (`npm run dev`) | Production (`npm start`) |
| --- | --- | --- |
| Set | Login required | Login required |
| Empty | Admin is **open** (red warning shown in the sidebar) | Admin is **disabled** until a passcode is set |
 admin _password login:abcdefghijkh
This is a shared passcode, not individual accounts, and passcode changes need a restart (and a rebuild in
production). Serve the site over HTTPS if you expose it beyond a trusted network.

## Tests

```powershell
npm test
```

The suite covers complaint validation, complaint record creation and ID generation, priority and safety rules,
duplicate detection, AI response validation, Gemini failure fallback, ticket approval rules, status transitions and
dashboard/insight calculations and admin session/passcode security. These test the pure business logic; they do not require an API key or a database.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm` is not recognized | Install Node.js, then close and reopen VS Code |
| PowerShell says scripts are disabled | Use Command Prompt (`cmd`) in the VS Code terminal, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `Environment variable not found: DATABASE_URL` | Run `npm run setup` (it creates `.env`), or copy `.env.example` to `.env` |
| Dashboard shows "Something went wrong" | The database is missing. Run `npm run setup` |
| `EPERM` / file locked during `prisma generate` | Stop `npm run dev`, close other terminals, run `npm run db:generate` again |
| Port 3000 busy | `npm run dev -- -p 3001` |
| Gemini results never appear | Check the key in `.env`, restart the server, and look at the complaint's "Why rules were used" note |
| Want a clean slate | `npm run db:reset` |
| Login says "Admin access is disabled" | Set `ADMIN_PASSCODE` in `.env` and restart (production mode needs one) |
| Admin pages are open to everyone | `ADMIN_PASSCODE` is empty; set it and restart |
| Complaint shows "Gemini request failed (404/400)" | The model name is retired or malformed; update `GEMINI_MODEL` |

## Hackathon demonstration script (about 5 minutes)

1. **Problem (30 s):** open the landing page and explain repeated, overlooked campus complaints.
2. **Dashboard first (45 s):** open `/dashboard` (log in with the admin passcode). Point out live metrics and that rows tagged *Demo data* are seeded.
   Sort by priority and show the Critical item (sparks from a socket) flagged for urgent human review.
3. **Report live (90 s):** click *Report an issue* and submit: "Fan not working in Room 204" / location "Main Block,
   Room 204" / category Electrical. Show the success screen and copy the complaint ID.
4. **Duplicate detection (60 s):** open the new complaint in the dashboard. Show the similarity score, the
   explanation, and "N students have reported this problem". Explain that no second ticket is created.
5. **Human approval (45 s):** on the original complaint, click *Approve and create ticket*, confirm, then move the
   ticket to In Progress and Resolved with notes. Show the audit log.
6. **Student view (30 s):** paste the ID on *Track a complaint* and show the progress and resolution notes.
7. **Insights (30 s):** open Insights and mention that averages only appear with enough resolved complaints.
8. **AI honesty (30 s):** point to the badge: demo mode = rule-based; with a key = Gemini. Safety rules can never be
   downgraded by the AI.

## Current limitations

* **Admin protection is a single shared passcode**, not per-user accounts or roles, and the login rate limit is
  in-memory. Set `ADMIN_PASSCODE` before sharing the site, and use HTTPS beyond a trusted network.
* Reporter names are stored for non-anonymous complaints; anyone with the admin passcode can see them.
* The duplicate detector is a transparent word-overlap heuristic, **not** a machine-learning model.
* Demo-mode classification relies on English keywords and is less accurate than Gemini.
* Tickets and "assignments" are internal records only; there is no email, SMS or staff integration.
* No file/photo attachments, user accounts, rate limiting or multi-language support.
* SQLite is for local prototyping; use a server database for production.
* Package versions use caret ranges and there is no lockfile in the ZIP, so `npm install` resolves the newest
  compatible versions at install time (a `package-lock.json` will be created on your machine).

## Future improvements

Per-user accounts and roles for admins and technicians, photo attachments, embedding-based duplicate detection, email
or WhatsApp notifications, SLA timers and escalation, a PostgreSQL option, multilingual reports, and a mobile
app or PWA.
