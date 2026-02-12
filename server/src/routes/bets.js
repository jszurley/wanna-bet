const express = require('express');
const Bet = require('../models/Bet');
const GroupBet = require('../models/GroupBet');
const Connection = require('../models/Connection');
const TrashTalk = require('../models/TrashTalk');
const User = require('../models/User');
const sms = require('../services/sms');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all my bets (1v1 + group)
router.get('/', auth, async (req, res) => {
  try {
    const [oneOnOneBets, groupBets] = await Promise.all([
      Bet.findByUser(req.user.id),
      GroupBet.findByUser(req.user.id)
    ]);
    const allBets = [...oneOnOneBets, ...groupBets].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );
    res.json(allBets);
  } catch (error) {
    console.error('Get bets error:', error);
    res.status(500).json({ error: 'Failed to get bets' });
  }
});

// Get upcoming bets (1v1 + group)
router.get('/upcoming', auth, async (req, res) => {
  try {
    const [oneOnOneBets, groupBets] = await Promise.all([
      Bet.findUpcoming(req.user.id),
      GroupBet.findUpcoming(req.user.id)
    ]);
    const allBets = [...oneOnOneBets, ...groupBets].sort((a, b) =>
      new Date(a.start_date) - new Date(b.start_date)
    );
    res.json(allBets);
  } catch (error) {
    console.error('Get upcoming bets error:', error);
    res.status(500).json({ error: 'Failed to get upcoming bets' });
  }
});

// Get pending bets (awaiting agreement) - 1v1 + group
router.get('/pending', auth, async (req, res) => {
  try {
    const [oneOnOneBets, groupBets] = await Promise.all([
      Bet.findPending(req.user.id),
      GroupBet.findPending(req.user.id)
    ]);
    const allBets = [...oneOnOneBets, ...groupBets].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );
    res.json(allBets);
  } catch (error) {
    console.error('Get pending bets error:', error);
    res.status(500).json({ error: 'Failed to get pending bets' });
  }
});

// Get past uncompleted bets - 1v1 + group
router.get('/uncompleted', auth, async (req, res) => {
  try {
    const [oneOnOneBets, groupBets] = await Promise.all([
      Bet.findPastUncompleted(req.user.id),
      GroupBet.findPastUncompleted(req.user.id)
    ]);
    const allBets = [...oneOnOneBets, ...groupBets].sort((a, b) =>
      new Date(b.end_date) - new Date(a.end_date)
    );
    res.json(allBets);
  } catch (error) {
    console.error('Get uncompleted bets error:', error);
    res.status(500).json({ error: 'Failed to get uncompleted bets' });
  }
});

// Get completed bets - 1v1 + group
router.get('/completed', auth, async (req, res) => {
  try {
    const [oneOnOneBets, groupBets] = await Promise.all([
      Bet.findCompleted(req.user.id),
      GroupBet.findCompleted(req.user.id)
    ]);
    const allBets = [...oneOnOneBets, ...groupBets].sort((a, b) =>
      new Date(b.completed_at) - new Date(a.completed_at)
    );
    res.json(allBets);
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

// Get disputed bets
router.get('/disputed', auth, async (req, res) => {
  try {
    const bets = await Bet.findDisputed(req.user.id);
    res.json(bets);
  } catch (error) {
    console.error('Get disputed bets error:', error);
    res.status(500).json({ error: 'Failed to get disputed bets' });
  }
});

// Get single bet (handles both 1v1 and group)
router.get('/:id', auth, async (req, res) => {
  try {
    let bet = await Bet.findById(req.params.id);

    // If it's a group bet, check authorization via participants
    if (bet && bet.bet_type === 'group') {
      const isParticipant = await GroupBet.isParticipant(bet.id, req.user.id);
      if (!isParticipant) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      res.json(bet);
      return;
    }

    // If not found or not a 1v1 bet with opponent_id, check if it's a group-only bet
    if (!bet || !bet.opponent_id) {
      const groupBet = await GroupBet.findById(req.params.id);
      if (groupBet) {
        const isParticipant = await GroupBet.isParticipant(groupBet.id, req.user.id);
        if (!isParticipant) {
          return res.status(403).json({ error: 'Not authorized' });
        }
        res.json(groupBet);
        return;
      }
      return res.status(404).json({ error: 'Bet not found' });
    }

    // 1v1 bet authorization
    if (bet.creator_id !== req.user.id && bet.opponent_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(bet);
  } catch (error) {
    console.error('Get bet error:', error);
    res.status(500).json({ error: 'Failed to get bet' });
  }
});

// Create bet (1v1 or group)
router.post('/', auth, async (req, res) => {
  try {
    const { betType, opponentId, title, description, prizeDescription, startDate, endDate, creatorSide, options, invitedUserIds, creatorOptionIndex } = req.body;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Handle group bet creation
    if (betType === 'group') {
      if (!title || !description || !prizeDescription || !startDate || !endDate) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      if (!options || options.length < 2) {
        return res.status(400).json({ error: 'At least 2 options are required for a group bet' });
      }
      if (!invitedUserIds || invitedUserIds.length < 1) {
        return res.status(400).json({ error: 'At least 1 participant must be invited' });
      }
      if (creatorOptionIndex === undefined || creatorOptionIndex < 0 || creatorOptionIndex >= options.length) {
        return res.status(400).json({ error: 'You must select your prediction' });
      }

      // Verify all invited users are connections
      for (const userId of invitedUserIds) {
        const connection = await Connection.findBetweenUsers(req.user.id, userId);
        if (!connection || connection.status !== 'accepted') {
          return res.status(400).json({ error: 'All participants must be your connections' });
        }
      }

      const bet = await GroupBet.create(
        req.user.id,
        title,
        description,
        prizeDescription,
        startDate,
        endDate,
        options,
        invitedUserIds,
        creatorOptionIndex
      );

      // Send SMS notifications to invited participants
      const creator = await User.findById(req.user.id);
      for (const userId of invitedUserIds) {
        const invitedUser = await User.findById(userId);
        if (invitedUser) {
          sms.notifyUser(invitedUser, 'groupBetInvite', creator.name, title);
        }
      }

      res.status(201).json(bet);
      return;
    }

    // Handle 1v1 bet creation (existing logic)
    if (!opponentId || !title || !description || !prizeDescription || !startDate || !endDate || !creatorSide) {
      return res.status(400).json({ error: 'All fields are required including your side of the bet' });
    }

    // Check if users are connected
    const connection = await Connection.findBetweenUsers(req.user.id, opponentId);
    if (!connection || connection.status !== 'accepted') {
      return res.status(400).json({ error: 'You must be connected to create a bet' });
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

    // Send SMS notification to opponent
    const creator = await User.findById(req.user.id);
    const opponent = await User.findById(opponentId);
    if (opponent) {
      sms.notifyUser(opponent, 'newBetInvite', creator.name, title);
    }

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

// Resolve dispute
router.post('/:id/resolve', auth, async (req, res) => {
  try {
    const { winnerId, comment } = req.body;
    const bet = await Bet.findById(req.params.id);

    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    if (bet.creator_id !== req.user.id && bet.opponent_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!bet.disputed_at) {
      return res.status(400).json({ error: 'Bet is not in disputed status' });
    }

    if (bet.completed_at) {
      return res.status(400).json({ error: 'Bet already completed' });
    }

    // Validate winner if provided
    const parsedWinnerId = winnerId ? parseInt(winnerId, 10) : null;
    if (parsedWinnerId && parsedWinnerId !== bet.creator_id && parsedWinnerId !== bet.opponent_id) {
      return res.status(400).json({ error: 'Winner must be one of the bet participants' });
    }

    const updated = await Bet.resolveDispute(bet.id, req.user.id, parsedWinnerId, comment);
    res.json(updated);
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

// Get trash talk for a bet
router.get('/:id/trash-talk', auth, async (req, res) => {
  try {
    const betId = req.params.id;

    // Try loading as 1v1 bet first, then as group bet
    let bet = await Bet.findById(betId);
    if (bet) {
      if (bet.creator_id !== req.user.id && bet.opponent_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    } else {
      bet = await GroupBet.findById(betId);
      if (!bet) {
        return res.status(404).json({ error: 'Bet not found' });
      }
      const isParticipant = await GroupBet.isParticipant(betId, req.user.id);
      if (!isParticipant) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    const trashTalk = await TrashTalk.findByBet(betId);
    res.json(trashTalk);
  } catch (error) {
    console.error('Get trash talk error:', error);
    res.status(500).json({ error: 'Failed to get trash talk' });
  }
});

// Add trash talk to a bet
router.post('/:id/trash-talk', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const betId = req.params.id;

    // Try loading as 1v1 bet first, then as group bet
    let bet = await Bet.findById(betId);
    if (bet) {
      if (bet.creator_id !== req.user.id && bet.opponent_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    } else {
      bet = await GroupBet.findById(betId);
      if (!bet) {
        return res.status(404).json({ error: 'Bet not found' });
      }
      const isParticipant = await GroupBet.isParticipant(betId, req.user.id);
      if (!isParticipant) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const trashTalk = await TrashTalk.create(betId, req.user.id, message.trim());

    // Return with user name
    const result = await TrashTalk.findByBet(betId);
    const created = result.find(t => t.id === trashTalk.id);
    res.status(201).json(created);
  } catch (error) {
    console.error('Add trash talk error:', error);
    res.status(500).json({ error: 'Failed to add trash talk' });
  }
});

// Delete trash talk
router.delete('/:id/trash-talk/:trashTalkId', auth, async (req, res) => {
  try {
    const deleted = await TrashTalk.delete(req.params.trashTalkId, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Trash talk not found or not authorized' });
    }
    res.json({ message: 'Trash talk deleted' });
  } catch (error) {
    console.error('Delete trash talk error:', error);
    res.status(500).json({ error: 'Failed to delete trash talk' });
  }
});

// ===============================
// GROUP BET ENDPOINTS
// ===============================

// Get group bet with full details (options, participants)
router.get('/:id/details', auth, async (req, res) => {
  try {
    const bet = await GroupBet.findByIdWithDetails(req.params.id);
    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    // Check if user is a participant
    const isParticipant = await GroupBet.isParticipant(bet.id, req.user.id);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(bet);
  } catch (error) {
    console.error('Get bet details error:', error);
    res.status(500).json({ error: 'Failed to get bet details' });
  }
});

// Join a group bet (pick an option)
router.post('/:id/join', auth, async (req, res) => {
  try {
    const { selectedOptionId } = req.body;

    if (!selectedOptionId) {
      return res.status(400).json({ error: 'You must select an option to join' });
    }

    const bet = await GroupBet.findById(req.params.id);
    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    // Check user is an invited participant
    const participant = await GroupBet.getParticipant(bet.id, req.user.id);
    if (!participant) {
      return res.status(403).json({ error: 'You are not invited to this bet' });
    }

    if (participant.status !== 'invited') {
      return res.status(400).json({ error: 'You have already responded to this bet' });
    }

    // Verify the option belongs to this bet
    const options = await GroupBet.getOptions(bet.id);
    const validOption = options.find(o => o.id === parseInt(selectedOptionId));
    if (!validOption) {
      return res.status(400).json({ error: 'Invalid option selected' });
    }

    const wasLocked = !!bet.locked_at;
    const updatedBet = await GroupBet.joinBet(bet.id, req.user.id, selectedOptionId);

    // Send SMS notifications to other joined participants
    const joiner = await User.findById(req.user.id);
    const participants = await GroupBet.getParticipants(bet.id);
    for (const p of participants) {
      if (p.user_id !== req.user.id && p.status === 'joined') {
        const participantUser = await User.findById(p.user_id);
        if (participantUser) {
          // Notify about new joiner
          sms.notifyUser(participantUser, 'participantJoined', joiner.name, bet.title);
          // If bet just locked, send lock notification too
          if (!wasLocked && updatedBet.locked_at) {
            sms.notifyUser(participantUser, 'betLocked', bet.title);
          }
        }
      }
    }

    res.json(updatedBet);
  } catch (error) {
    console.error('Join group bet error:', error);
    res.status(500).json({ error: 'Failed to join bet' });
  }
});

// Decline a group bet invitation
router.post('/:id/decline-invite', auth, async (req, res) => {
  try {
    const bet = await GroupBet.findById(req.params.id);
    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    const participant = await GroupBet.getParticipant(bet.id, req.user.id);
    if (!participant) {
      return res.status(403).json({ error: 'You are not invited to this bet' });
    }

    if (participant.status !== 'invited') {
      return res.status(400).json({ error: 'You have already responded to this bet' });
    }

    await GroupBet.declineBet(bet.id, req.user.id);
    res.json({ message: 'Invitation declined' });
  } catch (error) {
    console.error('Decline group bet error:', error);
    res.status(500).json({ error: 'Failed to decline bet' });
  }
});

// Set winning option (creator only, after end date)
router.post('/:id/set-winner', auth, async (req, res) => {
  try {
    const { winningOptionId } = req.body;

    if (!winningOptionId) {
      return res.status(400).json({ error: 'Winning option is required' });
    }

    const bet = await GroupBet.findById(req.params.id);
    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    if (bet.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the creator can set the winner' });
    }

    if (!bet.locked_at) {
      return res.status(400).json({ error: 'Bet must be locked before setting winner' });
    }

    if (bet.completed_at) {
      return res.status(400).json({ error: 'Bet is already completed' });
    }

    // Verify the option belongs to this bet
    const options = await GroupBet.getOptions(bet.id);
    const validOption = options.find(o => o.id === parseInt(winningOptionId));
    if (!validOption) {
      return res.status(400).json({ error: 'Invalid winning option' });
    }

    const updatedBet = await GroupBet.setWinningOption(bet.id, req.user.id, winningOptionId);

    // Notify all participants about bet completion
    const participants = await GroupBet.getParticipants(bet.id);
    for (const p of participants) {
      if (p.status === 'joined') {
        const participantUser = await User.findById(p.user_id);
        if (participantUser) {
          const isWinner = p.selected_option_id === parseInt(winningOptionId);
          sms.notifyUser(participantUser, 'betCompleted', bet.title, isWinner);
        }
      }
    }

    res.json(updatedBet);
  } catch (error) {
    console.error('Set winner error:', error);
    res.status(500).json({ error: 'Failed to set winner' });
  }
});

module.exports = router;
