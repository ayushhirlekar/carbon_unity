const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CarbonUnity v2 API — Admin-Managed Architecture',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV !== 'production' ? error.message : undefined
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log('\n ========================================');
  console.log('   CARBONUNITY v2 — ADMIN-MANAGED');
  console.log(' ========================================');
  console.log(`  Server:    http://localhost:${PORT}`);
  console.log(`  Env:       ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Supabase:  ${process.env.SUPABASE_URL ? '✅ Connected' : '❌ Missing'}`);
  console.log(`  Contract:  ${process.env.CONTRACT_ADDRESS || '⚠️  Not set'}`);
  console.log(' ========================================\n');
});

module.exports = app;