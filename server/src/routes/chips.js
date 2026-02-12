const express = require('express');
const Chip = require('../models/Chip');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/chips - All chips for current user
router.get('/', auth, async (req, res) => {
  try {
    const chips = await Chip.findByUser(req.user.id);
    res.json(chips);
  } catch (error) {
    console.error('Get chips error:', error);
    res.status(500).json({ error: 'Failed to get chips' });
  }
});

// GET /api/chips/held - Active chips held by user (for offer/stake pickers)
router.get('/held', auth, async (req, res) => {
  try {
    const chips = await Chip.findHeldByUser(req.user.id);
    res.json(chips);
  } catch (error) {
    console.error('Get held chips error:', error);
    res.status(500).json({ error: 'Failed to get held chips' });
  }
});

// GET /api/chips/debts - Active debts owed by user
router.get('/debts', auth, async (req, res) => {
  try {
    const chips = await Chip.findDebtsForUser(req.user.id);
    res.json(chips);
  } catch (error) {
    console.error('Get debt chips error:', error);
    res.status(500).json({ error: 'Failed to get debts' });
  }
});

// GET /api/chips/bet/:betId - Chips for a specific bet
router.get('/bet/:betId', auth, async (req, res) => {
  try {
    const chips = await Chip.findByBet(req.params.betId);
    res.json(chips);
  } catch (error) {
    console.error('Get bet chips error:', error);
    res.status(500).json({ error: 'Failed to get bet chips' });
  }
});

// POST /api/chips/:id/offer - Offer chip to pay a debt
router.post('/:id/offer', auth, async (req, res) => {
  try {
    const chip = await Chip.findById(req.params.id);
    if (!chip) {
      return res.status(404).json({ error: 'Chip not found' });
    }
    if (chip.holder_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the chip holder can offer it' });
    }
    if (chip.status !== 'active') {
      return res.status(400).json({ error: 'Chip is not available to offer' });
    }

    const { debtChipId } = req.body;
    if (!debtChipId) {
      return res.status(400).json({ error: 'debtChipId is required' });
    }

    // Verify the debt chip exists and the current user is the debtor
    const debtChip = await Chip.findById(debtChipId);
    if (!debtChip) {
      return res.status(404).json({ error: 'Debt chip not found' });
    }
    if (debtChip.debtor_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not the debtor on this chip' });
    }
    if (debtChip.status !== 'active') {
      return res.status(400).json({ error: 'Debt chip is not in active status' });
    }

    const updated = await Chip.offerChip(chip.id, debtChipId);
    res.json(updated);
  } catch (error) {
    console.error('Offer chip error:', error);
    res.status(500).json({ error: 'Failed to offer chip' });
  }
});

// POST /api/chips/:id/accept - Accept an offered chip
router.post('/:id/accept', auth, async (req, res) => {
  try {
    const chip = await Chip.findById(req.params.id);
    if (!chip) {
      return res.status(404).json({ error: 'Chip not found' });
    }
    if (chip.status !== 'offered') {
      return res.status(400).json({ error: 'Chip is not in offered status' });
    }

    // The person accepting must be the creditor (holder of the debt chip)
    const debtChip = await Chip.findById(chip.offered_to_chip_id);
    if (!debtChip || debtChip.holder_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the creditor can accept this offer' });
    }

    const updated = await Chip.acceptOffer(chip.id);
    res.json(updated);
  } catch (error) {
    console.error('Accept chip error:', error);
    res.status(500).json({ error: 'Failed to accept chip' });
  }
});

// POST /api/chips/:id/decline - Decline an offered chip
router.post('/:id/decline', auth, async (req, res) => {
  try {
    const chip = await Chip.findById(req.params.id);
    if (!chip) {
      return res.status(404).json({ error: 'Chip not found' });
    }
    if (chip.status !== 'offered') {
      return res.status(400).json({ error: 'Chip is not in offered status' });
    }

    // The person declining must be the creditor (holder of the debt chip)
    const debtChip = await Chip.findById(chip.offered_to_chip_id);
    if (!debtChip || debtChip.holder_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the creditor can decline this offer' });
    }

    const updated = await Chip.declineOffer(chip.id);
    res.json(updated);
  } catch (error) {
    console.error('Decline chip error:', error);
    res.status(500).json({ error: 'Failed to decline chip' });
  }
});

module.exports = router;
