require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const connectionsRoutes = require('./routes/connections');
const betsRoutes = require('./routes/bets');

const app = express();

// Trust proxy for Railway
app.set('trust proxy', 1);

// Security headers - disable for static files
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
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

// Serve static files in production with explicit MIME types
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    // Ensure correct MIME types
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=UTF-8');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Wanna Bet?' });
});

// Debug endpoint to check paths
const fs = require('fs');
app.get('/api/debug', (req, res) => {
  const info = {
    __dirname,
    clientBuildPath,
    cwd: process.cwd(),
    buildExists: fs.existsSync(clientBuildPath),
    buildContents: fs.existsSync(clientBuildPath) ? fs.readdirSync(clientBuildPath) : [],
    assetsExists: fs.existsSync(path.join(clientBuildPath, 'assets')),
    assetsContents: fs.existsSync(path.join(clientBuildPath, 'assets'))
      ? fs.readdirSync(path.join(clientBuildPath, 'assets'))
      : []
  };
  res.json(info);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/bets', betsRoutes);

// Serve React app for non-API routes
app.get('*', (req, res, next) => {
  // Don't serve index.html for asset requests that failed
  if (req.path.startsWith('/assets/')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Error handling - only for API routes
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (req.path.startsWith('/api/')) {
    res.status(500).json({ error: 'Something went wrong!' });
  } else {
    res.status(500).send('Server error');
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Wanna Bet? server running on port ${PORT}`);
});
