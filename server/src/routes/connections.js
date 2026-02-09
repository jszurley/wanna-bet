const express = require('express');
const Connection = require('../models/Connection');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Search users to connect with
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const users = await User.search(q, req.user.id);
    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get my connections
router.get('/', auth, async (req, res) => {
  try {
    const connections = await Connection.findByUser(req.user.id);
    res.json(connections);
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ error: 'Failed to get connections' });
  }
});

// Get pending connection requests (received)
router.get('/pending', auth, async (req, res) => {
  try {
    const pending = await Connection.findPendingForUser(req.user.id);
    res.json(pending);
  } catch (error) {
    console.error('Get pending connections error:', error);
    res.status(500).json({ error: 'Failed to get pending connections' });
  }
});

// Get sent connection requests
router.get('/sent', auth, async (req, res) => {
  try {
    const sent = await Connection.findSentByUser(req.user.id);
    res.json(sent);
  } catch (error) {
    console.error('Get sent connections error:', error);
    res.status(500).json({ error: 'Failed to get sent connections' });
  }
});

// Send connection request
router.post('/', auth, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot connect with yourself' });
    }

    const recipient = await User.findById(userId);
    if (!recipient) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if connection already exists
    const existing = await Connection.findBetweenUsers(req.user.id, userId);
    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'Already connected' });
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ error: 'Connection request already pending' });
      }
    }

    const connection = await Connection.create(req.user.id, userId);
    res.status(201).json(connection);
  } catch (error) {
    console.error('Create connection error:', error);
    res.status(500).json({ error: 'Failed to send connection request' });
  }
});

// Accept connection request
router.post('/:id/accept', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await Connection.findById(id);
    if (!connection) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    if (connection.recipient_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (connection.status !== 'pending') {
      return res.status(400).json({ error: 'Connection request is not pending' });
    }

    const updated = await Connection.accept(id);
    res.json(updated);
  } catch (error) {
    console.error('Accept connection error:', error);
    res.status(500).json({ error: 'Failed to accept connection' });
  }
});

// Reject connection request
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await Connection.findById(id);
    if (!connection) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    if (connection.recipient_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await Connection.reject(id);
    res.json(updated);
  } catch (error) {
    console.error('Reject connection error:', error);
    res.status(500).json({ error: 'Failed to reject connection' });
  }
});

// Remove connection
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await Connection.findById(id);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    if (connection.requester_id !== req.user.id && connection.recipient_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Connection.delete(id);
    res.json({ message: 'Connection removed' });
  } catch (error) {
    console.error('Delete connection error:', error);
    res.status(500).json({ error: 'Failed to remove connection' });
  }
});

module.exports = router;
