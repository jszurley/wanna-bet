const express = require('express');
const Wallet = require('../models/Wallet');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/wallet - All wallet entries for current user
router.get('/', auth, async (req, res) => {
  try {
    const entries = await Wallet.findByUser(req.user.id);
    res.json(entries);
  } catch (error) {
    console.error('Get wallet entries error:', error);
    res.status(500).json({ error: 'Failed to get wallet entries' });
  }
});

// PUT /api/wallet/:id/payment-method - Debtor sets payment method
router.put('/:id/payment-method', auth, async (req, res) => {
  try {
    const entry = await Wallet.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Wallet entry not found' });
    }
    if (entry.debtor_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the debtor can set payment method' });
    }
    if (entry.status !== 'awaiting_method') {
      return res.status(400).json({ error: 'Payment method already set' });
    }

    const { method } = req.body;
    if (!['on_tab', 'payment_pending'].includes(method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const updated = await Wallet.setPaymentMethod(entry.id, method);
    res.json(updated);
  } catch (error) {
    console.error('Set payment method error:', error);
    res.status(500).json({ error: 'Failed to set payment method' });
  }
});

// PUT /api/wallet/:id/mark-paid - Creditor marks as paid
router.put('/:id/mark-paid', auth, async (req, res) => {
  try {
    const entry = await Wallet.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Wallet entry not found' });
    }
    if (entry.creditor_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the creditor can mark as paid' });
    }
    if (entry.status === 'paid') {
      return res.status(400).json({ error: 'Already marked as paid' });
    }
    if (entry.status === 'awaiting_method') {
      return res.status(400).json({ error: 'Debtor has not chosen a payment method yet' });
    }

    const updated = await Wallet.markPaid(entry.id);
    res.json(updated);
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
});

module.exports = router;
