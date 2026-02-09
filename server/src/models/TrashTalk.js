const pool = require('../config/db');

const TrashTalk = {
  async create(betId, userId, message) {
    const result = await pool.query(
      `INSERT INTO trash_talk (bet_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [betId, userId, message]
    );
    return result.rows[0];
  },

  async findByBet(betId) {
    const result = await pool.query(
      `SELECT t.*, u.name as user_name
       FROM trash_talk t
       JOIN users u ON t.user_id = u.id
       WHERE t.bet_id = $1
       ORDER BY t.created_at ASC`,
      [betId]
    );
    return result.rows;
  },

  async delete(id, userId) {
    // Only allow user to delete their own trash talk
    const result = await pool.query(
      'DELETE FROM trash_talk WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  }
};

module.exports = TrashTalk;
