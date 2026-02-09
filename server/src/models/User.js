const pool = require('../config/db');
const bcrypt = require('bcrypt');

const User = {
  async create(email, password, name) {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [email.toLowerCase(), passwordHash, name]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows[0];
  },

  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  },

  async updateProfile(id, { name, email }) {
    const result = await pool.query(
      `UPDATE users SET name = $1, email = $2 WHERE id = $3
       RETURNING id, email, name, created_at`,
      [name, email.toLowerCase(), id]
    );
    return result.rows[0];
  },

  async search(query, excludeUserId) {
    const result = await pool.query(
      `SELECT id, email, name FROM users
       WHERE id != $1 AND (name ILIKE $2 OR email ILIKE $2)
       LIMIT 20`,
      [excludeUserId, `%${query}%`]
    );
    return result.rows;
  }
};

module.exports = User;
