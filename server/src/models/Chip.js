const pool = require('../config/db');

const Chip = {
  async createChip(betId, holderId, debtorId, prize) {
    if (!holderId || holderId === debtorId) return null;
    const result = await pool.query(
      `INSERT INTO betting_chips (original_bet_id, holder_id, debtor_id, prize_description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [betId, holderId, debtorId, prize]
    );
    return result.rows[0] || null;
  },

  async createGroupChips(client, betId, holderId, loserIds, prize) {
    const chips = [];
    for (const debtorId of loserIds) {
      if (debtorId === holderId) continue;
      const result = await client.query(
        `INSERT INTO betting_chips (original_bet_id, holder_id, debtor_id, prize_description)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [betId, holderId, debtorId, prize]
      );
      if (result.rows[0]) chips.push(result.rows[0]);
    }
    return chips;
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT c.*,
              b.title as bet_title,
              uh.name as holder_name,
              ud.name as debtor_name
       FROM betting_chips c
       JOIN bets b ON c.original_bet_id = b.id
       JOIN users uh ON c.holder_id = uh.id
       JOIN users ud ON c.debtor_id = ud.id
       WHERE c.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async findByUser(userId) {
    const result = await pool.query(
      `SELECT c.*,
              b.title as bet_title,
              uh.name as holder_name,
              ud.name as debtor_name
       FROM betting_chips c
       JOIN bets b ON c.original_bet_id = b.id
       JOIN users uh ON c.holder_id = uh.id
       JOIN users ud ON c.debtor_id = ud.id
       WHERE c.holder_id = $1 OR c.debtor_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findByBet(betId) {
    const result = await pool.query(
      `SELECT c.*,
              b.title as bet_title,
              uh.name as holder_name,
              ud.name as debtor_name
       FROM betting_chips c
       JOIN bets b ON c.original_bet_id = b.id
       JOIN users uh ON c.holder_id = uh.id
       JOIN users ud ON c.debtor_id = ud.id
       WHERE c.original_bet_id = $1
       ORDER BY c.created_at DESC`,
      [betId]
    );
    return result.rows;
  },

  async findHeldByUser(userId) {
    const result = await pool.query(
      `SELECT c.*,
              b.title as bet_title,
              uh.name as holder_name,
              ud.name as debtor_name
       FROM betting_chips c
       JOIN bets b ON c.original_bet_id = b.id
       JOIN users uh ON c.holder_id = uh.id
       JOIN users ud ON c.debtor_id = ud.id
       WHERE c.holder_id = $1 AND c.status = 'active'
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findDebtsForUser(userId) {
    const result = await pool.query(
      `SELECT c.*,
              b.title as bet_title,
              uh.name as holder_name,
              ud.name as debtor_name
       FROM betting_chips c
       JOIN bets b ON c.original_bet_id = b.id
       JOIN users uh ON c.holder_id = uh.id
       JOIN users ud ON c.debtor_id = ud.id
       WHERE c.debtor_id = $1 AND c.status IN ('active', 'offered')
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async offerChip(chipId, debtChipId) {
    const result = await pool.query(
      `UPDATE betting_chips
       SET status = 'offered', offered_to_chip_id = $2, offered_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [chipId, debtChipId]
    );
    return result.rows[0];
  },

  async acceptOffer(chipId) {
    const chip = await this.findById(chipId);
    if (!chip || chip.status !== 'offered') return null;

    // The debt chip this offer is paying
    const debtChip = await this.findById(chip.offered_to_chip_id);
    if (!debtChip) return null;

    // New holder of the offered chip = the creditor of the debt (debtChip.holder_id)
    const newHolderId = debtChip.holder_id;

    if (newHolderId === chip.debtor_id) {
      // Chip returns to its debtor -> void it
      await pool.query(
        `UPDATE betting_chips
         SET status = 'voided', holder_id = $2, offered_to_chip_id = NULL, resolved_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [chipId, newHolderId]
      );
    } else {
      // Transfer to new holder
      await pool.query(
        `UPDATE betting_chips
         SET status = 'active', holder_id = $2, offered_to_chip_id = NULL, offered_at = NULL
         WHERE id = $1`,
        [chipId, newHolderId]
      );
    }

    // Void the debt chip (the debt is now settled)
    await pool.query(
      `UPDATE betting_chips
       SET status = 'voided', resolved_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [debtChip.id]
    );

    return this.findById(chipId);
  },

  async declineOffer(chipId) {
    const result = await pool.query(
      `UPDATE betting_chips
       SET status = 'active', offered_to_chip_id = NULL, offered_at = NULL
       WHERE id = $1
       RETURNING *`,
      [chipId]
    );
    return result.rows[0];
  },

  async stakeInBet(chipId, betId) {
    const result = await pool.query(
      `UPDATE betting_chips
       SET status = 'staked', staked_in_bet_id = $2
       WHERE id = $1
       RETURNING *`,
      [chipId, betId]
    );
    return result.rows[0];
  },

  async resolveStakedChip(chipId, winnerId) {
    const chip = await this.findById(chipId);
    if (!chip) return null;

    if (winnerId === chip.debtor_id) {
      // Goes back to debtor -> void
      await pool.query(
        `UPDATE betting_chips
         SET status = 'voided', holder_id = $2, staked_in_bet_id = NULL, resolved_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [chipId, winnerId]
      );
    } else {
      // Transfer to winner
      await pool.query(
        `UPDATE betting_chips
         SET status = 'active', holder_id = $2, staked_in_bet_id = NULL
         WHERE id = $1`,
        [chipId, winnerId]
      );
    }

    return this.findById(chipId);
  },

  async unstakeChip(chipId) {
    const result = await pool.query(
      `UPDATE betting_chips
       SET status = 'active', staked_in_bet_id = NULL
       WHERE id = $1
       RETURNING *`,
      [chipId]
    );
    return result.rows[0];
  }
};

module.exports = Chip;
