const pool = require('../config/db');

const Wallet = {
  async createEntry(betId, creditorId, debtorId, prizeDescription) {
    if (!creditorId || creditorId === debtorId) return null;
    const result = await pool.query(
      `INSERT INTO wallet_entries (bet_id, creditor_id, debtor_id, prize_description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (bet_id, debtor_id) DO NOTHING
       RETURNING *`,
      [betId, creditorId, debtorId, prizeDescription]
    );
    return result.rows[0] || null;
  },

  async createGroupEntries(client, betId, creditorId, loserIds, prizeDescription) {
    const entries = [];
    for (const debtorId of loserIds) {
      if (debtorId === creditorId) continue;
      const result = await client.query(
        `INSERT INTO wallet_entries (bet_id, creditor_id, debtor_id, prize_description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (bet_id, debtor_id) DO NOTHING
         RETURNING *`,
        [betId, creditorId, debtorId, prizeDescription]
      );
      if (result.rows[0]) entries.push(result.rows[0]);
    }
    return entries;
  },

  async findByUser(userId) {
    const result = await pool.query(
      `SELECT w.*,
              b.title as bet_title,
              uc.name as creditor_name,
              ud.name as debtor_name
       FROM wallet_entries w
       JOIN bets b ON w.bet_id = b.id
       JOIN users uc ON w.creditor_id = uc.id
       JOIN users ud ON w.debtor_id = ud.id
       WHERE w.creditor_id = $1 OR w.debtor_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT w.*,
              b.title as bet_title,
              uc.name as creditor_name,
              ud.name as debtor_name
       FROM wallet_entries w
       JOIN bets b ON w.bet_id = b.id
       JOIN users uc ON w.creditor_id = uc.id
       JOIN users ud ON w.debtor_id = ud.id
       WHERE w.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async findByBet(betId) {
    const result = await pool.query(
      `SELECT w.*,
              b.title as bet_title,
              uc.name as creditor_name,
              ud.name as debtor_name
       FROM wallet_entries w
       JOIN bets b ON w.bet_id = b.id
       JOIN users uc ON w.creditor_id = uc.id
       JOIN users ud ON w.debtor_id = ud.id
       WHERE w.bet_id = $1
       ORDER BY w.created_at DESC`,
      [betId]
    );
    return result.rows;
  },

  async setPaymentMethod(id, method) {
    const result = await pool.query(
      `UPDATE wallet_entries
       SET status = $2, method_set_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, method]
    );
    return result.rows[0];
  },

  async markPaid(id) {
    const result = await pool.query(
      `UPDATE wallet_entries
       SET status = 'paid', paid_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }
};

module.exports = Wallet;
