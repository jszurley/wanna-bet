const express = require('express');
const Bet = require('../models/Bet');
const Connection = require('../models/Connection');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all my bets
router.get('/', auth, async (req, res) => {
  try {
    const bets = await Bet.findByUser(req.user.id);
    res.json(bets);
  } catch (error) {
    console.error('Get bets error:', error);
    res.status(500).json({ error: 'Failed to get bets' });
  }
});

// Get upcoming bets
router.get('/upcoming', auth, async (req, res) => {
  try {
    const bets = await Bet.findUpcoming(req.user.id);
    res.json(bets);
  } catch (error) {
    console.error('Get upcoming bets error:', error);
    res.status(500).json({ error: 'Failed to get upcoming bets' });
  }
});

// Get pending bets (awaiting agreement)
router.get('/pending', auth, async (req, res) => {
  try {
    const bets = await Bet.findPending(req.user.id);
    res.json(bets);
  } catch (error) {
    console.error('Get pending bets error:', error);
    res.status(500).json({ error: 'Failed to get pending bets' });
  }
});

// Get past uncompleted bets
router.get('/uncompleted', auth, async (req, res) => {
  try {
    const bets = await Bet.findPastUncompleted(req.user.id);
    res.json(bets);
  } catch (error) {
    console.error('Get uncompleted bets error:', error);
    res.status(500).json({ error: 'Failed to get uncompleted bets' });
  }
});

// Get completed bets
router.get('/completed', auth, async (req, res) => {
  try {
    const bets = await Bet.findCompleted(req.user.id);
    res.json(bets);
  } catch (error) {
    console.error('Get completed bets error:', error);
    res.status(500).json({ error: 'Failed to get completed bets' });
  }
});

// Get rejected bets
router.get('/rejected', auth, async (req, res) => {
  try {
    const bets = await Bet.findRejected(req.user.id);
    res.json(bets);
  } catch (error) {
    console.error('Get rejected bets error:', error);
    res.status(500).json({ error: 'Failed to get rejected bets' });
  }
});

// Get single bet
router.get('/:id', auth, async (req, res) => {
  try {
    const bet = await Bet.findById(req.params.id);
    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    if (bet.creator_id !== req.user.id && bet.opponent_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(bet);
  } catch (error) {
    console.error('Get bet error:', error);
    res.status(500).json({ error: 'Failed to get bet' });
  }
});

// Create bet
router.post('/', auth, async (req, res) => {
  try {
    const { opponentId, title, description, prizeDescription, startDate, endDate, creatorSide } = req.body;

    if (!opponentId || !title || !description || !prizeDescription || !startDate || !endDate || !creatorSide) {
      return res.status(400).json({ error: 'All fields are required including your side of the bet' });
    }

    // Check if users are connected
    const connection = await Connection.findBetweenUsers(req.user.id, opponentId);
    if (!connection || connection.status !== 'accepted') {
      return res.status(400).json({ error: 'You must be connected to create a bet' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const bet = await Bet.create(
      connection.id,
      req.user.id,
      opponentId,
      title,
      description,
      prizeDescription,
      startDate,
      endDate,
      creatorSide
    );

    const fullBet = await Bet.findById(bet.id);
    res.status(201).json(fullBet);
  } catch (error) {
    console.error('Create bet error:', error);
    res.status(500).json({ error: 'Failed to create bet' });
  }
});

// Agree to bet (opponent)
router.post('/:id/agree', auth, async (req, res) => {
  try {
    const { opponentSide } = req.body;
    const bet = await Bet.findById(req.params.id);
    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    if (bet.opponent_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the opponent can agree to this bet' });
    }

    if (bet.opponent_agreed) {
      return res.status(400).json({ error: 'Bet already agreed' });
    }

    if (!opponentSide) {
      return res.status(400).json({ error: 'You must enter your side of the bet' });
    }

    const updated = await Bet.agree(bet.id, opponentSide);
    const fullBet = await Bet.findById(updated.id);
    res.json(fullBet);
  } catch (error) {
    console.error('Agree to bet error:', error);
    res.status(500).json({ error: 'Failed to agree to bet' });
  }
});

// Decline bet (opponent, before agreement)
router.post('/:id/decline', auth, async (req, res) => {
  try {
    const bet = await Bet.findById(req.params.id);
    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    if (bet.opponent_id !== req.user.id && bet.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (bet.opponent_agreed) {
      return res.status(400).json({ error: 'Cannot decline a locked bet' });
    }

    await Bet.decline(bet.id, req.user.id);
    res.json({ message: 'Bet declined' });
  } catch (error) {
    console.error('Decline bet error:', error);
    res.status(500).json({ error: 'Failed to decline bet' });
  }
});

// Mark bet as complete
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const { winnerId } = req.body;
    const bet = await Bet.findById(req.params.id);

    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    if (bet.creator_id !== req.user.id && bet.opponent_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!bet.opponent_agreed) {
      return res.status(400).json({ error: 'Bet must be agreed before completing' });
    }

    if (bet.completed_at) {
      return res.status(400).json({ error: 'Bet already completed' });
    }

    // Validate winner if provided
    const parsedWinnerId = winnerId ? parseInt(winnerId, 10) : null;
    if (parsedWinnerId && parsedWinnerId !== bet.creator_id && parsedWinnerId !== bet.opponent_id) {
      return res.status(400).json({ error: 'Winner must be one of the bet participants' });
    }

    const updated = await Bet.markComplete(bet.id, req.user.id, parsedWinnerId);
    res.json(updated);
  } catch (error) {
    console.error('Complete bet error:', error);
    res.status(500).json({ error: 'Failed to complete bet' });
  }
});

module.exports = router;
