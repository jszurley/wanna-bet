# Wanna Bet?

A web application for creating friendly bets between connected users.

## Features

- **User Registration** - Sign up without approval required
- **Connections** - Find and connect with other users (both must agree)
- **Create Bets** - Challenge connections to friendly wagers
- **Bet Agreement** - Both parties must agree before a bet is locked
- **Completion Tracking** - Both parties must confirm when a bet is fulfilled
- **Bet History** - View upcoming, pending, past due, and completed bets

## Tech Stack

- **Frontend:** React, React Router, Axios, Vite
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Authentication:** JWT

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Database Setup

1. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE wannabet;
   ```

2. Run the schema:
   ```bash
   psql -d wannabet -f database/schema.sql
   ```

### Server Setup

1. Navigate to server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```
   PORT=3001
   DATABASE_URL=postgresql://user:password@localhost:5432/wannabet
   JWT_SECRET=your-secret-key-change-this
   FRONTEND_URL=http://localhost:3000
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

### Client Setup

1. Navigate to client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Connections
- `GET /api/connections/search?q=` - Search users
- `GET /api/connections` - List connections
- `GET /api/connections/pending` - Pending requests received
- `GET /api/connections/sent` - Pending requests sent
- `POST /api/connections` - Send connection request
- `POST /api/connections/:id/accept` - Accept request
- `POST /api/connections/:id/reject` - Reject request
- `DELETE /api/connections/:id` - Remove connection

### Bets
- `GET /api/bets` - All my bets
- `GET /api/bets/upcoming` - Upcoming bets
- `GET /api/bets/pending` - Pending agreement
- `GET /api/bets/uncompleted` - Past due bets
- `GET /api/bets/completed` - Completed bets
- `GET /api/bets/:id` - Single bet
- `POST /api/bets` - Create bet
- `POST /api/bets/:id/agree` - Agree to bet
- `POST /api/bets/:id/decline` - Decline bet
- `POST /api/bets/:id/complete` - Mark complete

## Deployment

For production deployment, build the client and serve from the server:

```bash
cd client && npm run build
cd ../server && npm start
```

The server will serve the built React app from `client/dist`.
