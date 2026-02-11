# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Backend (runs on port 3001)
cd server && npm install && npm run dev

# Frontend (runs on port 3000)
cd client && npm install && npm run dev

# Database setup
createdb wannabet
psql -d wannabet -f database/schema.sql

# Production build
cd client && npm run build
```

No test framework or linter is configured.

## Environment Variables (server/.env)

```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/wannabet
JWT_SECRET=<secret>
FRONTEND_URL=http://localhost:3000
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
TWILIO_PHONE_NUMBER=<number>
```

## Architecture

Full-stack friendly betting app with JWT auth, mutual-agreement bet system, and Twilio SMS notifications. Deployed to Railway.app.

- **server/src/index.js** — Express entry point; serves built client in production
- **server/src/config/db.js** — PostgreSQL connection pool
- **server/src/middleware/auth.js** — JWT verification middleware
- **server/src/models/** — Direct SQL query functions (User, Connection, Bet, GroupBet, TrashTalk) — no ORM
- **server/src/routes/** — auth (register/login/profile), connections (friend requests), bets (create/agree/decline/complete)
- **server/src/services/sms.js** — Twilio integration for bet notifications
- **client/src/context/AuthContext.jsx** — Global auth state, token management, login/logout
- **client/src/services/api.js** — Axios instance with JWT interceptor
- **client/src/pages/** — Dashboard, Connections, CreateBet, BetDetail, Profile
- **database/schema.sql** — Tables: users, connections, bets, group_bets, trash_talk

### Key Domain Logic

- Bets require mutual agreement to lock in
- Both parties must confirm completion
- Group bets support multiple participants with prediction options
- Trash talk (comments) on active bets

### Key Patterns

- Monorepo with `client/` (React 18 + Vite) and `server/` (Express + Node.js)
- JWT stored in localStorage, sent via Axios interceptor
- Models are plain functions running raw SQL against `pg` pool (no ORM)
- Routes use Express Router with auth middleware
- Server serves built client static files in production from `client/dist`
- Procfile: `web: cd server && npm start`
