const pool = require('../config/db');
const Chip = require('./Chip');

const Bet = {
  async create(connectionId, creatorId, opponentId, title, description, prizeDescription, startDate, endDate, creatorSide) {
    const result = await pool.query(
      `INSERT INTO bets (connection_id, creator_id, opponent_id, title, description, prize_description, start_date, end_date, creator_agreed, creator_side)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
       RETURNING *`,
      [connectionId, creatorId, opponentId, title, description, prizeDescription, startDate, endDate, creatorSide]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT b.*,
              uc.name as creator_name, uc.email as creator_email,
              uo.name as opponent_name, uo.email as opponent_email,
              uw.name as winner_name,
              ucw.name as creator_selected_winner_name,
              uow.name as opponent_selected_winner_name,
              ucrw.name as creator_resolution_winner_name,
              uorw.name as opponent_resolution_winner_name
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       JOIN users uo ON b.opponent_id = uo.id
       LEFT JOIN users uw ON b.winner_id = uw.id
       LEFT JOIN users ucw ON b.creator_selected_winner = ucw.id
       LEFT JOIN users uow ON b.opponent_selected_winner = uow.id
       LEFT JOIN users ucrw ON b.creator_resolution_winner = ucrw.id
       LEFT JOIN users uorw ON b.opponent_resolution_winner = uorw.id
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
       WHERE (b.creator_id = $1 OR b.opponent_id = $1)
         AND (b.bet_type IS NULL OR b.bet_type = '1v1')
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Upcoming bets (agreed, not completed, end_date >= today) - 1v1 only
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
         AND (b.bet_type IS NULL OR b.bet_type = '1v1')
         AND b.opponent_agreed = TRUE
         AND b.completed_at IS NULL
         AND b.end_date >= CURRENT_DATE
       ORDER BY b.start_date ASC`,
      [userId]
    );
    return result.rows;
  },

  // Pending bets (not yet agreed by opponent, not rejected) - 1v1 only
  async findPending(userId) {
    const result = await pool.query(
      `SELECT b.*,
              uc.name as creator_name, uo.name as opponent_name
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       JOIN users uo ON b.opponent_id = uo.id
       WHERE (b.creator_id = $1 OR b.opponent_id = $1)
         AND (b.bet_type IS NULL OR b.bet_type = '1v1')
         AND b.opponent_agreed = FALSE
         AND b.rejected_at IS NULL
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Past uncompleted bets (agreed, end_date < today, not completed) - 1v1 only
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
         AND (b.bet_type IS NULL OR b.bet_type = '1v1')
         AND b.opponent_agreed = TRUE
         AND b.completed_at IS NULL
         AND b.end_date < CURRENT_DATE
       ORDER BY b.end_date DESC`,
      [userId]
    );
    return result.rows;
  },

  // Completed bets - 1v1 only
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
         AND (b.bet_type IS NULL OR b.bet_type = '1v1')
         AND b.completed_at IS NOT NULL
       ORDER BY b.completed_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Opponent agrees to bet (with their side)
  async agree(id, opponentSide) {
    const result = await pool.query(
      `UPDATE bets
       SET opponent_agreed = TRUE, locked_at = CURRENT_TIMESTAMP, opponent_side = $2
       WHERE id = $1
       RETURNING *`,
      [id, opponentSide]
    );
    return result.rows[0];
  },

  // Decline a pending bet (mark as rejected instead of deleting)
  async decline(id, userId) {
    const result = await pool.query(
      `UPDATE bets
       SET rejected_at = CURRENT_TIMESTAMP, rejected_by = $2
       WHERE id = $1
       RETURNING *`,
      [id, userId]
    );
    return result.rows[0];
  },

  // Rejected bets - 1v1 only
  async findRejected(userId) {
    const result = await pool.query(
      `SELECT b.*,
              uc.name as creator_name, uo.name as opponent_name,
              ur.name as rejected_by_name
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       JOIN users uo ON b.opponent_id = uo.id
       LEFT JOIN users ur ON b.rejected_by = ur.id
       WHERE (b.creator_id = $1 OR b.opponent_id = $1)
         AND (b.bet_type IS NULL OR b.bet_type = '1v1')
         AND b.rejected_at IS NOT NULL
       ORDER BY b.rejected_at DESC`,
      [userId]
    );
    return result.rows;
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
      updateFields.push(`creator_completed_at = CURRENT_TIMESTAMP`);
      if (winnerId) {
        updateFields.push(`creator_selected_winner = $${paramIndex}`);
        params.push(winnerId);
        paramIndex++;
      }
    } else if (userId === bet.opponent_id) {
      updateFields.push(`opponent_marked_complete = TRUE`);
      updateFields.push(`opponent_completed_at = CURRENT_TIMESTAMP`);
      if (winnerId) {
        updateFields.push(`opponent_selected_winner = $${paramIndex}`);
        params.push(winnerId);
        paramIndex++;
      }
    }

    await pool.query(
      `UPDATE bets SET ${updateFields.join(', ')} WHERE id = $1`,
      params
    );

    // Check if both have marked complete
    const updated = await this.findById(id);
    if (updated.creator_marked_complete && updated.opponent_marked_complete) {
      // Check if they agree on the winner
      const creatorWinner = updated.creator_selected_winner;
      const opponentWinner = updated.opponent_selected_winner;

      if (creatorWinner === opponentWinner) {
        // They agree (including both null = no winner)
        await pool.query(
          'UPDATE bets SET completed_at = CURRENT_TIMESTAMP, winner_id = $2 WHERE id = $1',
          [id, creatorWinner]
        );
        // Create chip if there's a winner
        if (creatorWinner) {
          const loserId = creatorWinner === updated.creator_id ? updated.opponent_id : updated.creator_id;
          await Chip.createChip(id, creatorWinner, loserId, updated.prize_description);
        }
        // Handle staked chip
        if (updated.staked_chip_id) {
          if (creatorWinner) {
            await Chip.resolveStakedChip(updated.staked_chip_id, creatorWinner);
          } else {
            // Draw - unstake
            await Chip.unstakeChip(updated.staked_chip_id);
          }
        }
      } else {
        // They disagree - mark as disputed
        await pool.query(
          'UPDATE bets SET disputed_at = CURRENT_TIMESTAMP WHERE id = $1',
          [id]
        );
      }
    }

    return this.findById(id);
  },

  // Disputed bets - 1v1 only
  async findDisputed(userId) {
    const result = await pool.query(
      `SELECT b.*,
              uc.name as creator_name, uo.name as opponent_name,
              ucw.name as creator_selected_winner_name,
              uow.name as opponent_selected_winner_name
       FROM bets b
       JOIN users uc ON b.creator_id = uc.id
       JOIN users uo ON b.opponent_id = uo.id
       LEFT JOIN users ucw ON b.creator_selected_winner = ucw.id
       LEFT JOIN users uow ON b.opponent_selected_winner = uow.id
       WHERE (b.creator_id = $1 OR b.opponent_id = $1)
         AND (b.bet_type IS NULL OR b.bet_type = '1v1')
         AND b.disputed_at IS NOT NULL
       ORDER BY b.disputed_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Resolve dispute (by one user)
  async resolveDispute(id, userId, winnerId, comment) {
    const bet = await this.findById(id);
    if (!bet) return null;

    let updateFields = [];
    let params = [id];
    let paramIndex = 2;

    if (userId === bet.creator_id) {
      updateFields.push(`creator_resolution_at = CURRENT_TIMESTAMP`);
      if (winnerId) {
        updateFields.push(`creator_resolution_winner = $${paramIndex}`);
        params.push(winnerId);
        paramIndex++;
      } else {
        updateFields.push(`creator_resolution_winner = NULL`);
      }
      if (comment) {
        updateFields.push(`creator_resolution_comment = $${paramIndex}`);
        params.push(comment);
        paramIndex++;
      }
    } else if (userId === bet.opponent_id) {
      updateFields.push(`opponent_resolution_at = CURRENT_TIMESTAMP`);
      if (winnerId) {
        updateFields.push(`opponent_resolution_winner = $${paramIndex}`);
        params.push(winnerId);
        paramIndex++;
      } else {
        updateFields.push(`opponent_resolution_winner = NULL`);
      }
      if (comment) {
        updateFields.push(`opponent_resolution_comment = $${paramIndex}`);
        params.push(comment);
        paramIndex++;
      }
    }

    await pool.query(
      `UPDATE bets SET ${updateFields.join(', ')} WHERE id = $1`,
      params
    );

    // Check if both have submitted resolution
    const updated = await this.findById(id);
    if (updated.creator_resolution_at && updated.opponent_resolution_at) {
      const creatorWinner = updated.creator_resolution_winner;
      const opponentWinner = updated.opponent_resolution_winner;

      if (creatorWinner === opponentWinner) {
        // They agree - mark as completed
        await pool.query(
          'UPDATE bets SET completed_at = CURRENT_TIMESTAMP, winner_id = $2, disputed_at = NULL WHERE id = $1',
          [id, creatorWinner]
        );
        // Create chip if there's a winner
        if (creatorWinner) {
          const loserId = creatorWinner === updated.creator_id ? updated.opponent_id : updated.creator_id;
          await Chip.createChip(id, creatorWinner, loserId, updated.prize_description);
        }
        // Handle staked chip
        if (updated.staked_chip_id) {
          if (creatorWinner) {
            await Chip.resolveStakedChip(updated.staked_chip_id, creatorWinner);
          } else {
            await Chip.unstakeChip(updated.staked_chip_id);
          }
        }
      }
      // If they still disagree, leave in disputed (disputed_at remains set)
    }

    return this.findById(id);
  },

  async delete(id) {
    await pool.query('DELETE FROM bets WHERE id = $1', [id]);
  }
};

module.exports = Bet;
