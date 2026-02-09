const pool = require('../config/db');

const GroupBet = {
  async create(creatorId, title, description, prizeDescription, startDate, endDate, options, invitedUserIds, creatorOptionIndex) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create the bet
      const betResult = await client.query(
        `INSERT INTO bets (creator_id, title, description, prize_description, start_date, end_date, bet_type, creator_agreed)
         VALUES ($1, $2, $3, $4, $5, $6, 'group', TRUE)
         RETURNING *`,
        [creatorId, title, description, prizeDescription, startDate, endDate]
      );
      const bet = betResult.rows[0];

      // Create options
      const optionIds = [];
      for (let i = 0; i < options.length; i++) {
        const optionResult = await client.query(
          `INSERT INTO bet_options (bet_id, option_text, display_order)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [bet.id, options[i], i]
        );
        optionIds.push(optionResult.rows[0].id);
      }

      // Add creator as participant with their selected option
      const creatorOptionId = optionIds[creatorOptionIndex];
      await client.query(
        `INSERT INTO bet_participants (bet_id, user_id, selected_option_id, status, is_creator, responded_at)
         VALUES ($1, $2, $3, 'joined', TRUE, CURRENT_TIMESTAMP)`,
        [bet.id, creatorId, creatorOptionId]
      );

      // Invite other participants
      for (const userId of invitedUserIds) {
        await client.query(
          `INSERT INTO bet_participants (bet_id, user_id, status, is_creator)
           VALUES ($1, $2, 'invited', FALSE)`,
          [bet.id, userId]
        );
      }

      await client.query('COMMIT');
      return this.findByIdWithDetails(bet.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getOptions(betId) {
    const result = await pool.query(
      `SELECT bo.*,
              (SELECT COUNT(*) FROM bet_participants bp
               WHERE bp.bet_id = bo.bet_id AND bp.selected_option_id = bo.id AND bp.status = 'joined') as participant_count
       FROM bet_options bo
       WHERE bo.bet_id = $1
       ORDER BY bo.display_order`,
      [betId]
    );
    return result.rows;
  },

  async getParticipants(betId) {
    const result = await pool.query(
      `SELECT bp.*, u.name as user_name, u.email as user_email,
              bo.option_text as selected_option_text
       FROM bet_participants bp
       JOIN users u ON bp.user_id = u.id
       LEFT JOIN bet_options bo ON bp.selected_option_id = bo.id
       WHERE bp.bet_id = $1
       ORDER BY bp.is_creator DESC, bp.invited_at`,
      [betId]
    );
    return result.rows;
  },

  async joinBet(betId, userId, selectedOptionId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update participant status
      await client.query(
        `UPDATE bet_participants
         SET status = 'joined', selected_option_id = $3, responded_at = CURRENT_TIMESTAMP
         WHERE bet_id = $1 AND user_id = $2`,
        [betId, userId, selectedOptionId]
      );

      // Check if we have 2+ participants joined - if so, lock the bet
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM bet_participants
         WHERE bet_id = $1 AND status = 'joined'`,
        [betId]
      );
      const joinedCount = parseInt(countResult.rows[0].count);

      // Check if bet is already locked
      const betResult = await client.query(
        `SELECT locked_at FROM bets WHERE id = $1`,
        [betId]
      );

      if (joinedCount >= 2 && !betResult.rows[0].locked_at) {
        await client.query(
          `UPDATE bets SET locked_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [betId]
        );
      }

      await client.query('COMMIT');
      return this.findByIdWithDetails(betId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async declineBet(betId, userId) {
    await pool.query(
      `UPDATE bet_participants
       SET status = 'declined', responded_at = CURRENT_TIMESTAMP
       WHERE bet_id = $1 AND user_id = $2`,
      [betId, userId]
    );
    return this.findByIdWithDetails(betId);
  },

  async setWinningOption(betId, creatorId, optionId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify the user is the creator
      const betResult = await client.query(
        `SELECT creator_id FROM bets WHERE id = $1`,
        [betId]
      );
      if (betResult.rows[0].creator_id !== creatorId) {
        throw new Error('Only the creator can set the winning option');
      }

      // Set winning option and complete the bet
      await client.query(
        `UPDATE bets
         SET winning_option_id = $2, completed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [betId, optionId]
      );

      await client.query('COMMIT');
      return this.findByIdWithDetails(betId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async findByIdWithDetails(betId) {
    const betResult = await pool.query(
      `SELECT b.*, uc.name as creator_name, uc.email as creator_email,
              wo.option_text as winning_option_text
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       LEFT JOIN bet_options wo ON b.winning_option_id = wo.id
       WHERE b.id = $1`,
      [betId]
    );

    if (betResult.rows.length === 0) return null;

    const bet = betResult.rows[0];
    bet.options = await this.getOptions(betId);
    bet.participants = await this.getParticipants(betId);

    return bet;
  },

  async findById(betId) {
    const result = await pool.query(
      `SELECT b.*, uc.name as creator_name, uc.email as creator_email
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       WHERE b.id = $1 AND b.bet_type = 'group'`,
      [betId]
    );
    return result.rows[0];
  },

  // Check if user is a participant in the bet
  async isParticipant(betId, userId) {
    const result = await pool.query(
      `SELECT id FROM bet_participants WHERE bet_id = $1 AND user_id = $2`,
      [betId, userId]
    );
    return result.rows.length > 0;
  },

  // Get participant record for a user
  async getParticipant(betId, userId) {
    const result = await pool.query(
      `SELECT bp.*, bo.option_text as selected_option_text
       FROM bet_participants bp
       LEFT JOIN bet_options bo ON bp.selected_option_id = bo.id
       WHERE bp.bet_id = $1 AND bp.user_id = $2`,
      [betId, userId]
    );
    return result.rows[0];
  },

  // Find all group bets for a user (as participant)
  async findByUser(userId) {
    const result = await pool.query(
      `SELECT DISTINCT b.*, uc.name as creator_name,
              (SELECT COUNT(*) FROM bet_participants WHERE bet_id = b.id AND status = 'joined') as participant_count,
              bp.status as my_status, bp.is_creator as am_creator
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       JOIN bet_participants bp ON b.id = bp.bet_id AND bp.user_id = $1
       WHERE b.bet_type = 'group'
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Upcoming group bets (locked, not completed, end_date >= today)
  async findUpcoming(userId) {
    const result = await pool.query(
      `SELECT DISTINCT b.*, uc.name as creator_name,
              (SELECT COUNT(*) FROM bet_participants WHERE bet_id = b.id AND status = 'joined') as participant_count,
              bp.status as my_status, bp.is_creator as am_creator
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       JOIN bet_participants bp ON b.id = bp.bet_id AND bp.user_id = $1
       WHERE b.bet_type = 'group'
         AND b.locked_at IS NOT NULL
         AND b.completed_at IS NULL
         AND b.end_date >= CURRENT_DATE
       ORDER BY b.start_date ASC`,
      [userId]
    );
    return result.rows;
  },

  // Pending group bets (invited but not responded, or waiting for others to join)
  async findPending(userId) {
    const result = await pool.query(
      `SELECT DISTINCT b.*, uc.name as creator_name,
              (SELECT COUNT(*) FROM bet_participants WHERE bet_id = b.id AND status = 'joined') as participant_count,
              bp.status as my_status, bp.is_creator as am_creator
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       JOIN bet_participants bp ON b.id = bp.bet_id AND bp.user_id = $1
       WHERE b.bet_type = 'group'
         AND (bp.status = 'invited' OR (b.locked_at IS NULL AND bp.status = 'joined'))
         AND b.completed_at IS NULL
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Past uncompleted group bets
  async findPastUncompleted(userId) {
    const result = await pool.query(
      `SELECT DISTINCT b.*, uc.name as creator_name,
              (SELECT COUNT(*) FROM bet_participants WHERE bet_id = b.id AND status = 'joined') as participant_count,
              bp.status as my_status, bp.is_creator as am_creator
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       JOIN bet_participants bp ON b.id = bp.bet_id AND bp.user_id = $1
       WHERE b.bet_type = 'group'
         AND b.locked_at IS NOT NULL
         AND b.completed_at IS NULL
         AND b.end_date < CURRENT_DATE
       ORDER BY b.end_date DESC`,
      [userId]
    );
    return result.rows;
  },

  // Completed group bets
  async findCompleted(userId) {
    const result = await pool.query(
      `SELECT DISTINCT b.*, uc.name as creator_name,
              wo.option_text as winning_option_text,
              (SELECT COUNT(*) FROM bet_participants WHERE bet_id = b.id AND status = 'joined') as participant_count,
              bp.status as my_status, bp.is_creator as am_creator, bp.selected_option_id
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       JOIN bet_participants bp ON b.id = bp.bet_id AND bp.user_id = $1
       LEFT JOIN bet_options wo ON b.winning_option_id = wo.id
       WHERE b.bet_type = 'group'
         AND b.completed_at IS NOT NULL
       ORDER BY b.completed_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Get winners for a completed bet
  async getWinners(betId) {
    const result = await pool.query(
      `SELECT bp.*, u.name as user_name
       FROM bet_participants bp
       JOIN users u ON bp.user_id = u.id
       JOIN bets b ON bp.bet_id = b.id
       WHERE bp.bet_id = $1
         AND bp.status = 'joined'
         AND bp.selected_option_id = b.winning_option_id`,
      [betId]
    );
    return result.rows;
  }
};

module.exports = GroupBet;
