const { supabaseAdmin } = require('../config/supabase');
const {
  generateNonce,
  createAuthMessage,
  verifySignature,
  isValidAddress,
  normalizeAddress
} = require('../utils/auth');
const { generateToken } = require('../utils/jwt');

// A nonce is only valid for five minutes, and only once.
const NONCE_TTL_MS = 5 * 60 * 1000;

// Roles anyone may give themselves.
const SELF_SERVICE_ROLES = ['buyer', 'farmer'];

// Admin is available too, but only to someone who knows the code.
// Previously the role came straight from the request body and the
// frontend offered Admin as a radio button, so anyone who found
// the endpoint could make themselves a platform administrator.
// The code turns that from "ask nicely" into "hold a secret".
const ADMIN_SIGNUP_CODE = process.env.ADMIN_SIGNUP_CODE;

const SUPPORTED_LANGUAGES = ['en', 'mr', 'hi'];

/**
 * Consume a previously issued nonce.
 *
 * Returns the expected message if the nonce is live and unused,
 * or null. Marks it used so the same signature cannot be replayed.
 */
const consumeNonce = async (normalizedLower) => {
  const { data: row } = await supabaseAdmin
    .from('auth_nonces')
    .select('*')
    .eq('wallet_address', normalizedLower)
    .maybeSingle();

  if (!row || row.used_at) return null;
  if (Date.now() - new Date(row.issued_at).getTime() > NONCE_TTL_MS) return null;

  await supabaseAdmin
    .from('auth_nonces')
    .update({ used_at: new Date().toISOString() })
    .eq('wallet_address', normalizedLower);

  return createAuthMessage(normalizeAddress(normalizedLower), row.nonce);
};

/**
 * Verify a signature against the nonce the server actually issued.
 *
 * The client's `message` is ignored entirely. Accepting it would
 * let a caller sign anything they like and have it validated,
 * which is what made the old nonce decorative.
 */
const verifyAgainstIssuedNonce = async (walletAddress, signature) => {
  const normalized = normalizeAddress(walletAddress);
  const lower = normalized.toLowerCase();

  const expectedMessage = await consumeNonce(lower);
  if (!expectedMessage) {
    return { ok: false, reason: 'Nonce missing, expired or already used. Request a new one.' };
  }

  if (!verifySignature(expectedMessage, signature, normalized)) {
    return { ok: false, reason: 'Invalid signature' };
  }

  return { ok: true, address: lower };
};

/**
 * POST /api/auth/nonce
 * Issue a nonce and remember it.
 */
const requestNonce = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress || !isValidAddress(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid wallet address' });
    }

    const normalized = normalizeAddress(walletAddress);
    const lower = normalized.toLowerCase();
    const nonce = generateNonce();

    const { error } = await supabaseAdmin
      .from('auth_nonces')
      .upsert({
        wallet_address: lower,
        nonce,
        issued_at: new Date().toISOString(),
        used_at: null
      }, { onConflict: 'wallet_address' });

    if (error) {
      console.error('Nonce persist error:', error);
      return res.status(500).json({ success: false, message: 'Failed to generate nonce' });
    }

    return res.status(200).json({
      success: true,
      data: {
        nonce,
        message: createAuthMessage(normalized, nonce),
        walletAddress: normalized
      }
    });
  } catch (error) {
    console.error('Request nonce error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate nonce' });
  }
};

/**
 * POST /api/auth/register
 * Buyers and farmers only.
 */
const register = async (req, res) => {
  try {
    const {
      walletAddress, signature, role, displayName, phone, preferredLanguage, adminCode
    } = req.body;

    if (!walletAddress || !signature || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: walletAddress, signature, role'
      });
    }

    if (!isValidAddress(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid wallet address' });
    }

    if (role === 'admin') {
      if (!ADMIN_SIGNUP_CODE) {
        return res.status(403).json({
          success: false,
          message: 'Admin registration is disabled. Set ADMIN_SIGNUP_CODE in backend/.env to enable it.'
        });
      }
      if (adminCode !== ADMIN_SIGNUP_CODE) {
        return res.status(403).json({ success: false, message: 'Incorrect admin code' });
      }
    } else if (!SELF_SERVICE_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "farmer", "buyer" or "admin".'
      });
    }

    const language = preferredLanguage || 'en';
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported language. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`
      });
    }

    const check = await verifyAgainstIssuedNonce(walletAddress, signature);
    if (!check.ok) {
      return res.status(401).json({ success: false, message: check.reason });
    }

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('wallet_address', check.address)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Wallet address already registered' });
    }

    // farmer_code is assigned by a database trigger when role is
    // 'farmer', so it is never generated here.
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([{
        wallet_address: check.address,
        role,
        display_name: displayName || null,
        phone: phone || null,
        preferred_language: language
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ success: false, message: 'Failed to create user account' });
    }

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user: newUser, token: generateToken(check.address, role) }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!isValidAddress(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid wallet address' });
    }

    const check = await verifyAgainstIssuedNonce(walletAddress, signature);
    if (!check.ok) {
      return res.status(401).json({ success: false, message: check.reason });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', check.address)
      .maybeSingle();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.'
      });
    }

    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('wallet_address', check.address);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user, token: generateToken(check.address, user.role) }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
};

/**
 * GET /api/auth/profile
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
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

module.exports = { requestNonce, register, login, getProfile };
