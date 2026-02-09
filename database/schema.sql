-- Wanna Bet? Database Schema

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Connections between users (both must agree)
CREATE TABLE connections (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    UNIQUE(requester_id, recipient_id)
);

-- Bets between connected users
CREATE TABLE bets (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER REFERENCES connections(id) ON DELETE CASCADE,
    creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    opponent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    prize_description TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Agreement status
    creator_agreed BOOLEAN DEFAULT TRUE,
    opponent_agreed BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMP, -- Set when both agree

    -- Completion status
    creator_marked_complete BOOLEAN DEFAULT FALSE,
    opponent_marked_complete BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP, -- Set when both mark complete

    -- Winner (optional, set by agreement)
    winner_id INTEGER REFERENCES users(id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_connections_requester ON connections(requester_id);
CREATE INDEX idx_connections_recipient ON connections(recipient_id);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_bets_creator ON bets(creator_id);
CREATE INDEX idx_bets_opponent ON bets(opponent_id);
CREATE INDEX idx_bets_dates ON bets(start_date, end_date);
