require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const connectionsRoutes = require('./routes/connections');
const betsRoutes = require('./routes/bets');
const chipsRoutes = require('./routes/chips');

const app = express();

// Trust proxy for Railway
app.set('trust proxy', 1);

// Serve static files first
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Security headers for API routes
app.use('/api', helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS - allow same-origin and localhost for development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (same-origin, mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);

    // Allow the Railway app domain
    if (origin.includes('wannabet.up.railway.app')) return callback(null, true);

    // Allow if FRONTEND_URL is set and matches
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }

    return callback(null, true); // Allow all for now since it's same-origin
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many attempts, please try again later.' }
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json({ limit: '10kb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Wanna Bet?' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/bets', betsRoutes);
app.use('/api/chips', chipsRoutes);

// Serve React app for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Wanna Bet? server running on port ${PORT}`);
});
