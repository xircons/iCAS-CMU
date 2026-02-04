# iCAS-CMU HUB — Master Project Documentation

**Single source of truth for the Integrated Club Administration System (CMU).**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Database](#4-database)
5. [Backend API](#5-backend-api)
6. [Authentication & Security](#6-authentication--security)
7. [WebSocket (Real-Time)](#7-websocket-real-time)
8. [Frontend](#8-frontend)
9. [Services & Integrations](#9-services--integrations)
10. [Environment Variables](#10-environment-variables)
11. [Deployment](#11-deployment)
12. [Development & Testing](#12-development--testing)
13. [Key User Flows](#13-key-user-flows)

---

## 1. Project Overview

### Purpose

- **iCAS-CMU HUB** is a full-stack **club management system** for Carnegie Mellon University (CMU).
- It manages **clubs**, **members**, **events**, **assignments**, **check-ins**, **documents**, **chat**, and **reports** in one place.

### Roles

| Role    | Description |
|--------|-------------|
| **member** | Can join clubs, submit assignments, check in to events, use club chat, submit reports/feedback. |
| **leader** | Same as member plus: manage own club(s), create/grade assignments, manage members, start/end check-in sessions, manage club home/content, smart documents. |
| **admin**  | Platform-wide: create clubs, manage club owners, report inbox, user/leader oversight, smart documents (global). |

### Main Features

- **Auth:** CMU email only (`@cmu.ac.th`), OTP signup, JWT in HttpOnly cookies.
- **Clubs:** Create/join, memberships (pending/approved/rejected/left), club home, calendar, members, chat.
- **Assignments:** Create/edit/delete, attachments, submissions (text/file), grading, threaded comments (hide/unhide).
- **Events & calendar:** CRUD, reminders, filtered by user’s club memberships.
- **Check-in:** QR code or 6-digit passcode per event session; real-time updates via WebSocket.
- **Chat:** Per-club, encrypted at rest (AES-256-GCM), typing indicators, edit/delete/unsend.
- **Smart documents:** Club-scoped docs with templates, assignments, submissions, bulk actions.
- **Reports:** User feedback/issues/suggestions/complaints/questions/appreciation; admin inbox and responses.
- **Profile:** Update name/phone, change password, delete account (ProfileSettingsDialog).

### Localization

- UI includes **Thai** strings (e.g. loading, OTP messages, validation, toasts).

---

## 2. Tech Stack

| Layer     | Technologies |
|----------|---------------|
| **Frontend** | React 19, TypeScript, Vite, React Router 7, Axios |
| **UI**       | Radix UI, Tailwind CSS, shadcn-style components, Lucide, TipTap, Recharts, date-fns, react-hook-form |
| **Backend**  | Node.js, Express, TypeScript |
| **Database** | MySQL 8 / MariaDB (or TiDB Cloud) |
| **Real-time**| Socket.IO (server + client) |
| **Auth**     | JWT (access + refresh), bcrypt, HttpOnly cookies |
| **File**     | Multer (assignments, documents, templates) |
| **Deploy**   | Docker Compose, Vercel (frontend), Render (backend) |

---

## 3. Repository Structure

```
iCAS-CMU/
├── .github/workflows/ci.yml    # CI: backend + frontend tests, build, Codecov
├── backend/                   # Express API
│   ├── .sql/icas_cmu_hub.sql   # DB schema + seed (Docker may use backend/database/ copy)
│   ├── src/
│   │   ├── config/database.ts
│   │   ├── features/           # auth, club, chat, assignment, event, checkin, report, smart-document, document, line
│   │   │   ├── */controllers, routes, middleware, types, utils
│   │   ├── middleware/         # errorHandler, rateLimiter
│   │   ├── routes/health.ts
│   │   ├── server.ts
│   │   ├── services/          # otpService, emailService, chatEncryptionService, lineBotService, eventReminderService
│   │   ├── types/
│   │   ├── websocket/socketServer.ts
│   │   └── scripts/            # DB migration/seed scripts
│   ├── package.json
│   ├── Dockerfile
│   └── TIDB_CLOUD_SETUP.md
├── public/                    # Fonts, logo, favicon
├── src/                       # React app
│   ├── components/            # Views, club/*, shared/*, ui/*, smart-document/*
│   ├── config/                # api.ts, websocket.ts
│   ├── constants/             # majors.ts
│   ├── contexts/              # ClubContext, WebSocketContext
│   ├── features/              # auth, club, assignment, checkin, event, report, document, smart-document (api, hooks, types)
│   ├── hooks/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── docker-compose.yml
├── Dockerfile, Dockerfile.dev
├── index.html, vite.config.ts, package.json
├── vercel.json                # Frontend deploy (Vercel)
├── render.yaml                # Backend deploy (Render)
├── nginx.conf
└── README.md
```

---

## 4. Database

- **Database name:** `icas_cmu_hub`
- **Charset:** utf8mb4
- **Schema file:** `backend/.sql/icas_cmu_hub.sql` (Docker Compose may reference `backend/database/`; ensure init script path matches or copy file there).

### Tables (Summary)

| Table | Purpose |
|-------|--------|
| **users** | id, email, password (bcrypt), first_name, last_name, phone_number, major, role (member/leader/admin), club_id, club_name (legacy), avatar, timestamps |
| **clubs** | id, name, category, president_id, meeting_day, location, logo, status (active/pending/inactive), description, home_content, home_title |
| **club_memberships** | user_id, club_id, status (pending/approved/rejected/left), role (member/staff/leader), request_date, approved_date, approved_by |
| **club_assignments** | club_id, title, description, max_score, available_date, due_date, is_visible, attachment_*, created_by |
| **assignment_attachments** | assignment_id, file_path, file_name, file_mime_type, file_size |
| **assignment_submissions** | assignment_id, user_id, submission_type (text/file), text_content or file_*, score, comment, graded_by, graded_at, submitted_at |
| **assignment_comments** | assignment_id, user_id, comment_text, parent_comment_id, is_hidden |
| **events** | title, type (practice/meeting/performance/workshop/other), date, time, location, description, attendees, reminder_enabled, created_by |
| **check_in_sessions** | event_id, passcode (6), qr_code_data (JSON), expires_at, created_by, is_active, regenerate_on_checkin |
| **check_ins** | event_id, user_id, check_in_method (qr/passcode), check_in_time |
| **club_chat_messages** | club_id, user_id, encrypted_message, status, is_edited, deleted_at, is_unsent, deleted_by_sender, reply_to_message_id |
| **documents** | title, type, recipient, due_date, status (Draft/Sent/…), sent_by, sent_date, notes, created_by |
| **document_assignments** | document_id, user_id, status, submission_status, file_*, submitted_at, admin_comment |
| **document_templates** | name, description, category, file_path, club_id, created_by, tags (JSON), is_public |
| **smart_documents** | club_id, title, description, priority, type, template_path, due_date, status, created_by |
| **reports** | type (feedback/issue/suggestion/complaint/question/appreciation), subject, message, sender_id, status, assigned_to, response, response_date |
| **email_otps** | email, otp, expires_at, is_used (signup OTP) |

### Important Constraints

- **assignment_submissions:** UNIQUE (assignment_id, user_id)
- **check_ins:** UNIQUE (event_id, user_id)

### Optional / Migration Tables

- **event_reminders** (see `backend/src/scripts/create-event-reminders-table.ts`)

---

## 5. Backend API

- **Base URL:** `/api` (e.g. `http://localhost:5001/api`)
- **Port (default):** 5001
- **Auth:** Protected routes use `authenticate` middleware (JWT from cookie or `Authorization` header).

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/health | No | Health check + DB status |

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /request-otp | No | Request OTP for signup (email @cmu.ac.th, 1/min) |
| POST | /signup | No | Sign up (firstName, lastName, email, password, confirmPassword, phoneNumber?, major, otp) |
| POST | /login | No | Login (email, password) → sets HttpOnly cookies |
| POST | /verify | No | Verify token |
| POST | /logout | No | Clear auth cookies |
| POST | /refresh | No | Refresh access token (uses refresh_token cookie) |
| GET | /me | Yes | Current user |
| PUT | /profile | Yes | Update profile (firstName, lastName, phoneNumber?) |
| PUT | /password | Yes | Change password (oldPassword, newPassword, confirmPassword) |
| DELETE | /account | Yes | Delete account |

### Clubs — `/api/clubs`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | No | List clubs |
| GET | /:id | No | Get club by ID |
| GET | /memberships/me | Yes | Current user’s memberships |
| POST | /join | Yes | Request to join club |
| POST | / | Yes | Create club (admin) |
| GET | /leader/my-clubs | Yes | Clubs current user leads |
| GET | /:clubId/requests | Yes | Join requests for club |
| GET | /:clubId/members | Yes | Club members |
| GET | /:clubId/stats | Yes | Membership stats |
| PATCH | /:clubId/home-content | Yes | Update club home content |
| PATCH | /memberships/:membershipId/status | Yes | Approve/reject membership |
| PATCH | /memberships/:membershipId/role | Yes | Change member role |
| DELETE | /memberships/:membershipId | Yes | Remove member |

### Assignments — `/api/clubs/:clubId/assignments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /:clubId/assignments | Yes (member) | List assignments |
| POST | /:clubId/assignments | Yes (leader/admin) | Create (up to 10 attachments) |
| GET | /:clubId/assignments/:assignmentId | Yes (member) | Get assignment |
| PUT | /:clubId/assignments/:assignmentId | Yes (leader/admin) | Update (attachments) |
| DELETE | /:clubId/assignments/:assignmentId | Yes (leader/admin) | Delete |
| DELETE | /:clubId/assignments/:assignmentId/attachments/:attachmentId | Yes (leader/admin) | Delete one attachment |
| POST | /:clubId/assignments/:assignmentId/submit | Yes (member) | Submit (text or file) |
| GET | /:clubId/assignments/:assignmentId/submission | Yes (member) | Own submission |
| GET | /:clubId/assignments/:assignmentId/submissions | Yes (leader/admin) | All submissions |
| GET | /:clubId/assignments/:assignmentId/submissions/:submissionId | Yes (leader/admin) | One submission |
| PATCH | /:clubId/assignments/:assignmentId/submissions/:submissionId/grade | Yes (leader/admin) | Grade |
| GET/POST/PUT/DELETE | .../comments, .../comments/:commentId | Yes (member) | Comments |
| PATCH | .../comments/:commentId/visibility | Yes (leader/admin) | Hide/unhide comment |

### Chat — `/api/clubs/:clubId/chat`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /:clubId/chat/messages | Yes | Paginated messages |
| POST | /:clubId/chat/messages | Yes (rate limited) | Send message |
| PATCH | /:clubId/chat/messages/:messageId | Yes | Edit |
| DELETE | /:clubId/chat/messages/:messageId | Yes | Delete |
| POST | /:clubId/chat/messages/:messageId/unsend | Yes | Unsend |

### Check-in — `/api/checkin`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /session/:eventId | Yes (leader/admin) | Start check-in session |
| DELETE | /session/:eventId | Yes (leader/admin) | End session |
| GET | /session/:eventId | Yes (leader/admin) | Get active session |
| GET | /:eventId/members | Yes (leader/admin) | Checked-in members |
| POST | /qr | Yes (member) | Check in via QR |
| POST | /passcode | Yes (member) | Check in via passcode |

### Events — `/api/events`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Yes | Events (filtered by user clubs) |
| GET | /stats | Yes | Event stats |
| GET | /:id | Yes | Event by ID |
| POST | / | Yes (leader/admin) | Create |
| PUT | /:id | Yes | Update (creator or leader/admin) |
| DELETE | /:id | Yes | Delete (creator or leader/admin) |

### Smart Documents — `/api/clubs/:clubId/documents`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /documents/templates | Yes | List templates |
| POST | /:clubId/documents/templates | Yes (leader/admin) | Create template |
| PUT/DELETE | /documents/templates/:templateId | Yes | Update/delete template |
| GET | /:clubId/documents | Yes (leader/admin) | Club documents |
| GET | /:clubId/documents/assigned | Yes (member) | Assigned to user |
| POST | /:clubId/documents | Yes (admin) | Create document |
| GET/PUT/PATCH/DELETE | /:clubId/documents/:documentId | Yes | CRUD + status |
| PATCH | .../member-status | Yes (leader) | Update member submission status |
| POST | .../submit | Yes (member) | Submit file |
| PATCH | .../review | Yes (admin) | Review submission |
| POST | /:clubId/documents/bulk-update-status, bulk-assign, bulk-delete, bulk-export | Yes (leader/admin) | Bulk operations |

### Reports — `/api/reports`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Yes | List (admin: all; user: own) |
| GET | /stats | Yes (admin) | Stats |
| GET | /:id | Yes | One report |
| POST | / | Yes | Create |
| PATCH | /:id/status | Yes (admin) | Update status |
| PATCH | /:id/response | Yes (admin) | Set response |

### Static & SPA

- **GET** `/uploads/*` — User uploads (assignments, documents).
- **GET** `/documents/*` — Template files.
- If `build/` exists in production, Express serves the React app and `/api/*` returns 404 for unknown API paths.

### LINE (Optional)

- LINE routes live in `backend/src/features/line/routes/line.ts`. If mounted (e.g. at `/api/line`), **POST** `/webhook` receives LINE webhook events. Requires `LINE_CHANNEL_ACCESS_TOKEN` and `LINE_CHANNEL_SECRET`.

---

## 6. Authentication & Security

### JWT

- **Access token:** Short-lived (e.g. 15m), stored in HttpOnly cookie `access_token`.
- **Refresh token:** Long-lived (e.g. 30d), stored in HttpOnly cookie `refresh_token`.
- **Cookies:** `sameSite: lax` (dev), `none` (prod); `secure` in production; path `/`.

### Login Flow

1. Client POSTs email/password to `/api/auth/login`.
2. Server validates, issues access + refresh tokens, sets cookies.
3. Client uses `withCredentials: true` on all API requests; no token in JS.

### Refresh Flow

1. On 401, frontend calls `POST /api/auth/refresh` (sends refresh_token cookie).
2. Server issues new access token, sets cookie.
3. Frontend retries original request.

### Signup Flow

1. **POST** `/api/auth/request-otp` with email (@cmu.ac.th). Rate limit: 1 request per minute per email.
2. OTP stored in `email_otps`, expiry 15 minutes; email sent (or logged if no SMTP).
3. **POST** `/api/auth/signup` with OTP + profile; password bcrypt-hashed.

### WebSocket Auth

- Socket.IO middleware reads `access_token` from handshake cookie (or `auth.token` / `Authorization`), verifies JWT, attaches user to `socket.data.user`.

### Rate Limits (Backend)

| Limiter | Window | Max | Used On |
|---------|--------|-----|--------|
| generalLimiter | 15 min | 100 | (if applied globally) |
| checkInSessionLimiter | 1 min | 5 | Start check-in session |
| qrCheckInLimiter | 1 min | 10 | QR check-in (successful not counted) |
| passcodeCheckInLimiter | 1 min | 5 | Passcode check-in (successful not counted) |
| membersListLimiter | 1 min | 30 | Get checked-in members |
| sessionEndLimiter | 1 min | 10 | End check-in session |
| chatMessageLimiter | 1 min | 10 | Send chat message |

---

## 7. WebSocket (Real-Time)

- **Server:** Socket.IO on same HTTP server as Express (`backend/src/websocket/socketServer.ts`).
- **CORS:** From `CORS_ORIGIN` or `http://localhost:3000`.
- **Auth:** Cookie or header; `socket.data.user` set after JWT verify.

### Rooms

| Room | Join Event | Purpose |
|------|------------|---------|
| event-{eventId} | join-event | Check-in live updates |
| club-{clubId} | join-club | Club updates for leaders |
| club-chat-{clubId} | join-club-chat | Chat + typing |
| user-{userId} | (auto) | Per-user notifications |

### Client Events (Server Handlers)

- **join-event**, **leave-event** — Event check-in room.
- **join-club**, **leave-club** — Club room.
- **join-club-chat**, **leave-club-chat** — Club chat room.
- **user-typing** — Payload `{ clubId }`; server broadcasts to room (excluding sender) with user name.
- **user-stopped-typing** — Payload `{ clubId }`.

### Server Events (Emitted by Controllers)

- Check-in controller: e.g. new check-in, session start/end (to `event-{eventId}`).
- Chat controller: new message, edit, delete (to `club-chat-{clubId}`).
- Club/event controllers: various updates to club/event rooms.
- **user-role-updated** — To `user-{userId}` when role changes; frontend refreshes user and shows toast.

### Reconnection

- Client re-emits join events after reconnect; server does not persist room membership across disconnect.

---

## 8. Frontend

### Stack

- React 19, TypeScript, Vite, React Router 7.
- Axios instance in `src/config/api.ts`: baseURL from `VITE_API_URL` or inferred (e.g. `http://localhost:5001/api`), `withCredentials: true`, 10s timeout, 401 → refresh then retry.

### Routing

- **/login** — LoginHub; if already logged in → redirect by role (admin → /create-clubs, else /dashboard).
- **/*** — Wrapped in AppLayout; no user → redirect to /login.

### Route Protection

- **ProtectedRoute(allowedRoles)** — Requires user; if role not in allowedRoles → redirect to /dashboard.
- **SidebarProtectedRoute(path)** — Requires user; path must be in `getMenuItemsForRole(user.role)` or be a club route (`/club/:clubId/...`).

### Sidebar by Role (`getMenuItemsForRole`)

- **member:** Dashboard, Check In, Join Clubs, Feedback.
- **leader:** Dashboard, Check In, Feedback.
- **admin:** Create Clubs, Manage Club, Report Inbox, Leader & User Oversight, Smart Document.

### Main Routes (Summary)

- **Global:** /dashboard, /calendar, /check-in, /qr-code/:eventId, /clubs (Join Clubs or Club Leader), /report, /feedback, /assignments (admin: budget; leader: leader assignments).
- **Admin-only:** /create-clubs, /manage-owners, /report-inbox, /user-oversight, /smartdoc.
- **Club:** /club/:clubId → redirect to home; /club/:clubId/home|assignments|assignment/:id|.../submission/:id|calendar|chat|members|smartdoc|smartdoc/:id|report.

### Contexts

- **UserContext** — user, setUser (from /auth/me on load and after refresh).
- **ClubContext** — Current club for club-scoped views.
- **WebSocketContext** — Socket connection when user exists; subscribe to events (e.g. user-role-updated).
- **UserRoleUpdateListener** — On user-role-updated for current user, calls getMe and updates user + toast.

### Profile Settings (ProfileSettingsDialog)

- **Profile tab:** firstName, lastName, phoneNumber (email read-only). Calls `PUT /api/auth/profile`, then updates parent user state.
- **Password tab:** oldPassword, newPassword, confirmPassword. Calls `PUT /api/auth/password`.
- **Delete tab:** password + confirmation text. Calls `DELETE /api/auth/account`, then disconnectSocket and redirect to /login.

---

## 9. Services & Integrations

### OTP (`backend/src/services/otpService.ts`)

- Create OTP, store in `email_otps`, 15 min expiry, 1 request/min per email.
- Mark previous OTPs used; send email via `emailService` or log to console.

### Email (`backend/src/services/emailService.ts`)

- SMTP (e.g. Gmail). Sends OTP and other transactional mail. Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.

### Chat Encryption (`backend/src/services/chatEncryptionService.ts`)

- AES-256-GCM for club chat messages. Key from `CHAT_ENCRYPTION_KEY` (32+ chars). Encrypt before save; decrypt when loading.

### LINE Bot (`backend/src/services/lineBotService.ts`, `features/line/`)

- Optional. Webhook handler in `lineWebhookController`; LINE SDK middleware for signature verification. Env: LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET.

### Event Reminders (`backend/src/services/eventReminderService.ts`)

- Scheduled reminders for events. Table: see `create-event-reminders-table` script.

---

## 10. Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| PORT | Server port (default 5001) |
| NODE_ENV | development / production / test |
| DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME | MySQL (or TiDB) |
| DB_SSL | true for TiDB Cloud |
| JWT_SECRET | Access token signing |
| JWT_REFRESH_SECRET | Refresh token (default: JWT_SECRET + '-refresh') |
| JWT_EXPIRES_IN, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN | Token TTL |
| CORS_ORIGIN | Allowed origin(s), comma-separated |
| CHAT_ENCRYPTION_KEY | 32+ chars for chat AES-256-GCM |
| SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS | Optional email |
| LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET | Optional LINE |

### Frontend

| Variable | Description |
|----------|-------------|
| VITE_API_URL | API base URL (e.g. https://api.example.com/api). If unset, localhost uses http://localhost:5001/api. |

### Docker Compose (see docker-compose.yml)

- Database: MYSQL_*, ports 3307:3306.
- Backend: PORT 5000 in container, 5002 on host; DB_* pointing to `database` service; CORS_ORIGIN=http://localhost:3000.

---

## 11. Deployment

### Docker Compose

- **Services:** database (MySQL 8, port 3307), backend (port 5002). Init DB from SQL (ensure path matches: e.g. `backend/.sql/icas_cmu_hub.sql` or copy to `backend/database/` and point volume there).
- **Commands:** `docker-compose up -d`, `docker-compose down`, `docker-compose logs -f`.

### Vercel (Frontend)

- **Config:** `vercel.json` — buildCommand, outputDirectory `build`, rewrites to index.html, cache headers for /assets.
- **Install:** `npm install --legacy-peer-deps`. Set `VITE_API_URL` to backend API URL.

### Render (Backend)

- **Config:** `render.yaml` — web service, rootDir backend, buildCommand, startCommand, env (NODE_ENV, PORT, DB_SSL). Other env (DB_*, JWT_*, CORS_ORIGIN, etc.) in dashboard.

### Monorepo Option

- Backend can serve built frontend from `build/` when not in development and `build` exists; catch-all serves index.html for non-API routes.

---

## 12. Development & Testing

### Local Setup

1. **DB:** MySQL (e.g. XAMPP) or Docker DB. Create DB `icas_cmu_hub`, run `backend/.sql/icas_cmu_hub.sql`.
2. **Backend:** `cd backend`, `npm install`, copy `.env` from `.env.example`, `npm run dev` (e.g. http://localhost:5001).
3. **Frontend:** Root `npm install --legacy-peer-deps`, `npm run dev` (e.g. http://localhost:3000). Set VITE_API_URL if backend is on different host/port.

### Backend Scripts (package.json)

- dev, build, start, type-check, test, test:ci, test:db, import:schema, create:assignment-tables, create:otp-table, create:event-reminders-table, create:club-chat-tables, fix:chat-table, reset:passwords.

### Frontend Scripts

- dev, build, test, test:ci, test:coverage, test:ui.

### CI (`.github/workflows/ci.yml`)

- **Triggers:** push/PR on main, develop.
- **Jobs:** Backend tests (MySQL service, type-check, test:ci, Codecov); Frontend tests (type-check, test:ci, Codecov); Build (backend + frontend, upload artifacts).

---

## 13. Key User Flows

### Signup

1. Request OTP (email @cmu.ac.th).
2. Receive OTP (email or console).
3. Submit signup form with OTP; account created, then login.

### Join Club

1. Member opens Join Clubs, selects club, requests to join.
2. Leader (or admin) sees request in club members/requests, approves or rejects.
3. Membership status updated; member sees club in sidebar and can access club routes.

### Assignment

1. Leader creates assignment (optional attachments), sets dates.
2. Members submit text or file before due date.
3. Leader views submissions, grades, optional comment; member sees grade and feedback.

### Check-in

1. Leader opens event, starts check-in session (QR + passcode generated).
2. Leader displays QR or passcode; members scan QR or enter passcode.
3. Check-in recorded; leader sees list in real time; session can be ended.

### Club Chat

1. Member/leader joins club chat; client joins `club-chat-{clubId}`.
2. Messages sent via API (rate limited), stored encrypted; server broadcasts to room.
3. Typing indicators via user-typing / user-stopped-typing.

### Profile & Account

1. Profile: open ProfileSettingsDialog → Profile tab → edit name/phone → save → user state updated.
2. Password: Password tab → old + new + confirm → change.
3. Delete: Delete tab → password + confirm text → delete account → logout and redirect to login.

---

## 14. Performance & Optimization

### Database Indexes
- **Chat:** `idx_club_chat_composite` (`club_id`, `created_at` DESC) for efficient message paging.
- **Memberships:** `unique_user_club` covering lookups by user and club.
- **Users:** Unique `email` index for fast auth.

### Connection Pool
- Configured in `backend/src/config/database.ts`.
- **Limit:** 10 connections (default).
- **Strategy:** `waitForConnections: true`, `enableKeepAlive: true`.
- **Scaling:** For high load, increase `connectionLimit` or use a proxy (e.g., ProxySQL).

### API Optimization
- **Compression:** Gzip enabled via `compression` middleware.
- **Security:** Headers secured via `helmet`.
- **Response Shapes:** List endpoints (e.g., `getAllClubs`) exclude heavy text fields (`home_content`).

---

*This document is the master reference for the iCAS-CMU HUB project. Keep it updated when adding features or changing APIs, DB, or deployment.*
