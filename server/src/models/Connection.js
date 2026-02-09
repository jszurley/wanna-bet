const pool = require('../config/db');

const Connection = {
  async create(requesterId, recipientId) {
    const result = await pool.query(
      `INSERT INTO connections (requester_id, recipient_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [requesterId, recipientId]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT c.*,
              u1.name as requester_name, u1.email as requester_email,
              u2.name as recipient_name, u2.email as recipient_email
       FROM connections c
       JOIN users u1 ON c.requester_id = u1.id
       JOIN users u2 ON c.recipient_id = u2.id
       WHERE c.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async findBetweenUsers(userId1, userId2) {
    const result = await pool.query(
      `SELECT * FROM connections
       WHERE (requester_id = $1 AND recipient_id = $2)
          OR (requester_id = $2 AND recipient_id = $1)`,
      [userId1, userId2]
    );
    return result.rows[0];
  },

  async findByUser(userId) {
    const result = await pool.query(
      `SELECT c.*,
              u1.name as requester_name, u1.email as requester_email,
              u2.name as recipient_name, u2.email as recipient_email
       FROM connections c
       JOIN users u1 ON c.requester_id = u1.id
       JOIN users u2 ON c.recipient_id = u2.id
       WHERE (c.requester_id = $1 OR c.recipient_id = $1)
         AND c.status = 'accepted'
       ORDER BY c.accepted_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findPendingForUser(userId) {
    const result = await pool.query(
      `SELECT c.*,
              u1.name as requester_name, u1.email as requester_email
       FROM connections c
       JOIN users u1 ON c.requester_id = u1.id
       WHERE c.recipient_id = $1 AND c.status = 'pending'
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findSentByUser(userId) {
    const result = await pool.query(
      `SELECT c.*,
              u2.name as recipient_name, u2.email as recipient_email
       FROM connections c
       JOIN users u2 ON c.recipient_id = u2.id
       WHERE c.requester_id = $1 AND c.status = 'pending'
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async accept(id) {
    const result = await pool.query(
      `UPDATE connections
       SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  async reject(id) {
    const result = await pool.query(
      `UPDATE connections SET status = 'rejected' WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM connections WHERE id = $1', [id]);
  },

  async areConnected(userId1, userId2) {
    const result = await pool.query(
      `SELECT id FROM connections
       WHERE status = 'accepted'
         AND ((requester_id = $1 AND recipient_id = $2)
           OR (requester_id = $2 AND recipient_id = $1))`,
      [userId1, userId2]
    );
    return result.rows.length > 0;
  }
};

module.exports = Connection;
