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

      // Create trash_talk table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS trash_talk (
          id SERIAL PRIMARY KEY,
          bet_id INTEGER REFERENCES bets(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`CREATE INDEX IF NOT EXISTS idx_trash_talk_bet ON trash_talk(bet_id)`);

      console.log('Database schema initialized successfully');
    } else {
      console.log('Database connected - schema already exists');

      // Create trash_talk table if it doesn't exist (migration for existing databases)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS trash_talk (
          id SERIAL PRIMARY KEY,
          bet_id INTEGER REFERENCES bets(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_trash_talk_bet ON trash_talk(bet_id)`);
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
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'disputed_at') THEN
          ALTER TABLE bets ADD COLUMN disputed_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'creator_selected_winner') THEN
          ALTER TABLE bets ADD COLUMN creator_selected_winner INTEGER REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'opponent_selected_winner') THEN
          ALTER TABLE bets ADD COLUMN opponent_selected_winner INTEGER REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'creator_completed_at') THEN
          ALTER TABLE bets ADD COLUMN creator_completed_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'opponent_completed_at') THEN
          ALTER TABLE bets ADD COLUMN opponent_completed_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'creator_resolution_winner') THEN
          ALTER TABLE bets ADD COLUMN creator_resolution_winner INTEGER REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'opponent_resolution_winner') THEN
          ALTER TABLE bets ADD COLUMN opponent_resolution_winner INTEGER REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'creator_resolution_comment') THEN
          ALTER TABLE bets ADD COLUMN creator_resolution_comment TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'opponent_resolution_comment') THEN
          ALTER TABLE bets ADD COLUMN opponent_resolution_comment TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'creator_resolution_at') THEN
          ALTER TABLE bets ADD COLUMN creator_resolution_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'opponent_resolution_at') THEN
          ALTER TABLE bets ADD COLUMN opponent_resolution_at TIMESTAMP;
        END IF;
        -- Group bet columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'bet_type') THEN
          ALTER TABLE bets ADD COLUMN bet_type VARCHAR(10) DEFAULT '1v1';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'winning_option_id') THEN
          ALTER TABLE bets ADD COLUMN winning_option_id INTEGER;
        END IF;
        -- Staked chip column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'staked_chip_id') THEN
          ALTER TABLE bets ADD COLUMN staked_chip_id INTEGER;
        END IF;
      END $$;
    `);

    // Create bet_options table for group bets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bet_options (
        id SERIAL PRIMARY KEY,
        bet_id INTEGER REFERENCES bets(id) ON DELETE CASCADE,
        option_text VARCHAR(255) NOT NULL,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bet_options_bet ON bet_options(bet_id)`);

    // Create bet_participants table for group bets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bet_participants (
        id SERIAL PRIMARY KEY,
        bet_id INTEGER REFERENCES bets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        selected_option_id INTEGER REFERENCES bet_options(id),
        status VARCHAR(20) DEFAULT 'invited',
        is_creator BOOLEAN DEFAULT FALSE,
        invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP,
        marked_complete BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        UNIQUE(bet_id, user_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bet_participants_bet ON bet_participants(bet_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bet_participants_user ON bet_participants(user_id)`);

    // Add phone number and notification preferences to users
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
          ALTER TABLE users ADD COLUMN phone VARCHAR(20);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'sms_notifications') THEN
          ALTER TABLE users ADD COLUMN sms_notifications BOOLEAN DEFAULT TRUE;
        END IF;
      END $$;
    `);

    // Create wallet_entries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_entries (
        id SERIAL PRIMARY KEY,
        bet_id INTEGER REFERENCES bets(id) ON DELETE CASCADE,
        creditor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        debtor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        prize_description TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'awaiting_method',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        method_set_at TIMESTAMP,
        paid_at TIMESTAMP,
        UNIQUE(bet_id, debtor_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wallet_entries_creditor ON wallet_entries(creditor_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wallet_entries_debtor ON wallet_entries(debtor_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wallet_entries_bet ON wallet_entries(bet_id)`);

    // Create betting_chips table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS betting_chips (
        id SERIAL PRIMARY KEY,
        original_bet_id INTEGER REFERENCES bets(id) ON DELETE CASCADE,
        prize_description TEXT NOT NULL,
        holder_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        debtor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'active',
        offered_to_chip_id INTEGER REFERENCES betting_chips(id),
        staked_in_bet_id INTEGER REFERENCES bets(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        offered_at TIMESTAMP,
        resolved_at TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_betting_chips_holder ON betting_chips(holder_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_betting_chips_debtor ON betting_chips(debtor_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_betting_chips_bet ON betting_chips(original_bet_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_betting_chips_status ON betting_chips(status)`);

    // Migrate wallet_entries to betting_chips if betting_chips is empty
    const chipCount = await pool.query(`SELECT COUNT(*) FROM betting_chips`);
    const walletCount = await pool.query(`SELECT COUNT(*) FROM wallet_entries`);
    if (parseInt(chipCount.rows[0].count) === 0 && parseInt(walletCount.rows[0].count) > 0) {
      console.log('Migrating wallet_entries to betting_chips...');
      await pool.query(`
        INSERT INTO betting_chips (original_bet_id, prize_description, holder_id, debtor_id, status, created_at, resolved_at)
        SELECT bet_id, prize_description, creditor_id, debtor_id,
               CASE WHEN status = 'paid' THEN 'voided' ELSE 'active' END,
               created_at,
               CASE WHEN status = 'paid' THEN paid_at ELSE NULL END
        FROM wallet_entries
      `);
      console.log('Wallet entries migrated to betting chips');
    }

    console.log('Database migrations complete');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
};

// Initialize on startup
initializeDatabase();

module.exports = pool;
