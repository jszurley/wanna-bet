const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Auto-initialize schema
const initializeDatabase = async () => {
  try {
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Initializing database schema...');

      // Create users table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create connections table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS connections (
          id SERIAL PRIMARY KEY,
          requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          accepted_at TIMESTAMP,
          UNIQUE(requester_id, recipient_id)
        )
      `);

      // Create bets table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS bets (
          id SERIAL PRIMARY KEY,
          connection_id INTEGER REFERENCES connections(id) ON DELETE CASCADE,
          creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          opponent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          prize_description TEXT NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          creator_agreed BOOLEAN DEFAULT TRUE,
          opponent_agreed BOOLEAN DEFAULT FALSE,
          locked_at TIMESTAMP,
          creator_marked_complete BOOLEAN DEFAULT FALSE,
          opponent_marked_complete BOOLEAN DEFAULT FALSE,
          completed_at TIMESTAMP,
          winner_id INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_connections_recipient ON connections(recipient_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_bets_creator ON bets(creator_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_bets_opponent ON bets(opponent_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_bets_dates ON bets(start_date, end_date)`);

      console.log('Database schema initialized successfully');
    } else {
      console.log('Database connected - schema already exists');
    }

    // Add new columns if they don't exist (migrations)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'creator_side') THEN
          ALTER TABLE bets ADD COLUMN creator_side VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'opponent_side') THEN
          ALTER TABLE bets ADD COLUMN opponent_side VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'rejected_at') THEN
          ALTER TABLE bets ADD COLUMN rejected_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'rejected_by') THEN
          ALTER TABLE bets ADD COLUMN rejected_by INTEGER REFERENCES users(id);
        END IF;
      END $$;
    `);
    console.log('Database migrations complete');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
};

// Initialize on startup
initializeDatabase();

module.exports = pool;
