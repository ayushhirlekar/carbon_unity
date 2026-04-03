const { supabaseAdmin } = require('../config/supabase');
const {
  generateNonce,
  createAuthMessage,
  verifySignature,
  isValidAddress,
  normalizeAddress
} = require('../utils/auth');
const { generateToken } = require('../utils/jwt');

/**
 * Request authentication nonce
 */
const requestNonce = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress || !isValidAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address'
      });
    }

    const normalizedAddress = normalizeAddress(walletAddress);
    const nonce = generateNonce();
    const message = createAuthMessage(normalizedAddress, nonce);

    return res.status(200).json({
      success: true,
      data: { nonce, message, walletAddress: normalizedAddress }
    });
  } catch (error) {
    console.error('Request nonce error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate nonce'
    });
  }
};

/**
 * Register new user (admin or buyer)
 */
const register = async (req, res) => {
  try {
    const { walletAddress, signature, message, role, displayName } = req.body;

    if (!walletAddress || !signature || !message || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: walletAddress, signature, message, role'
      });
    }

    if (!isValidAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address'
      });
    }

    // v2: Only admin and buyer roles
    if (!['admin', 'buyer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "admin" or "buyer"'
      });
    }

    const normalizedAddress = normalizeAddress(walletAddress);
    const isValid = verifySignature(message, signature, normalizedAddress);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', normalizedAddress.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Wallet address already registered'
      });
    }

    // Create new user
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([{
        wallet_address: normalizedAddress.toLowerCase(),
        role,
        display_name: displayName || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user account'
      });
    }

    const token = generateToken(normalizedAddress.toLowerCase(), role);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user: newUser, token }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

/**
 * Login existing user
 */
const login = async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (!isValidAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address'
      });
    }

    const normalizedAddress = normalizeAddress(walletAddress);
    const isValid = verifySignature(message, signature, normalizedAddress);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Find user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', normalizedAddress.toLowerCase())
      .maybeSingle();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.'
      });
    }

    // Update last_login
    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('wallet_address', normalizedAddress.toLowerCase());

    const token = generateToken(normalizedAddress.toLowerCase(), user.role);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user, token }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const { walletAddress } = req.user;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

module.exports = { requestNonce, register, login, getProfile };