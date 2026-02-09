const pool = require('../config/db');

const Bet = {
  async create(connectionId, creatorId, opponentId, title, description, prizeDescription, startDate, endDate) {
    const result = await pool.query(
      `INSERT INTO bets (connection_id, creator_id, opponent_id, title, description, prize_description, start_date, end_date, creator_agreed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       RETURNING *`,
      [connectionId, creatorId, opponentId, title, description, prizeDescription, startDate, endDate]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT b.*,
              uc.name as creator_name, uc.email as creator_email,
              uo.name as opponent_name, uo.email as opponent_email,
              uw.name as winner_name
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       JOIN users uo ON b.opponent_id = uo.id
       LEFT JOIN users uw ON b.winner_id = uw.id
       WHERE b.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async findByUser(userId) {
    const result = await pool.query(
      `SELECT b.*,
              uc.name as creator_name, uc.email as creator_email,
              uo.name as opponent_name, uo.email as opponent_email,
              uw.name as winner_name
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       JOIN users uo ON b.opponent_id = uo.id
       LEFT JOIN users uw ON b.winner_id = uw.id
       WHERE b.creator_id = $1 OR b.opponent_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Upcoming bets (agreed, not completed, end_date >= today)
  async findUpcoming(userId) {
    const result = await pool.query(
      `SELECT b.*,
              uc.name as creator_name, uo.name as opponent_name,
              uw.name as winner_name
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       JOIN users uo ON b.opponent_id = uo.id
       LEFT JOIN users uw ON b.winner_id = uw.id
       WHERE (b.creator_id = $1 OR b.opponent_id = $1)
         AND b.opponent_agreed = TRUE
         AND b.completed_at IS NULL
         AND b.end_date >= CURRENT_DATE
       ORDER BY b.start_date ASC`,
      [userId]
    );
    return result.rows;
  },

  // Pending bets (not yet agreed by opponent)
  async findPending(userId) {
    const result = await pool.query(
      `SELECT b.*,
              uc.name as creator_name, uo.name as opponent_name
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       JOIN users uo ON b.opponent_id = uo.id
       WHERE (b.creator_id = $1 OR b.opponent_id = $1)
         AND b.opponent_agreed = FALSE
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Past uncompleted bets (agreed, end_date < today, not completed)
  async findPastUncompleted(userId) {
    const result = await pool.query(
      `SELECT b.*,
              uc.name as creator_name, uo.name as opponent_name,
              uw.name as winner_name
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       JOIN users uo ON b.opponent_id = uo.id
       LEFT JOIN users uw ON b.winner_id = uw.id
       WHERE (b.creator_id = $1 OR b.opponent_id = $1)
         AND b.opponent_agreed = TRUE
         AND b.completed_at IS NULL
         AND b.end_date < CURRENT_DATE
       ORDER BY b.end_date DESC`,
      [userId]
    );
    return result.rows;
  },

  // Completed bets
  async findCompleted(userId) {
    const result = await pool.query(
      `SELECT b.*,
              uc.name as creator_name, uo.name as opponent_name,
              uw.name as winner_name
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       JOIN users uo ON b.opponent_id = uo.id
       LEFT JOIN users uw ON b.winner_id = uw.id
       WHERE (b.creator_id = $1 OR b.opponent_id = $1)
         AND b.completed_at IS NOT NULL
       ORDER BY b.completed_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Opponent agrees to bet
  async agree(id) {
    const result = await pool.query(
      `UPDATE bets
       SET opponent_agreed = TRUE, locked_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  // Decline a pending bet
  async decline(id) {
    await pool.query('DELETE FROM bets WHERE id = $1', [id]);
  },

  // Mark as complete (by one user)
  async markComplete(id, userId, winnerId = null) {
    const bet = await this.findById(id);
    if (!bet) return null;

    let updateFields = [];
    let params = [id];
    let paramIndex = 2;

    if (userId === bet.creator_id) {
      updateFields.push(`creator_marked_complete = TRUE`);
    } else if (userId === bet.opponent_id) {
      updateFields.push(`opponent_marked_complete = TRUE`);
    }

    if (winnerId) {
      updateFields.push(`winner_id = $${paramIndex}`);
      params.push(winnerId);
      paramIndex++;
    }

    const result = await pool.query(
      `UPDATE bets SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    // Check if both have marked complete
    const updated = await this.findById(id);
    if (updated.creator_marked_complete && updated.opponent_marked_complete) {
      await pool.query(
        'UPDATE bets SET completed_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
    }

    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM bets WHERE id = $1', [id]);
  }
};

module.exports = Bet;
