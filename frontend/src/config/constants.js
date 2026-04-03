export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || '11155111', 10);
export const NETWORK_NAME = import.meta.env.VITE_NETWORK_NAME || 'Sepolia';
export const CHAIN_ID_HEX = `0x${CHAIN_ID.toString(16)}`;

export const ROLES = {
  FARMER: 'farmer',
  BUYER: 'buyer',
};

export const LISTING_STATUS = {
  ACTIVE: 'active',
  SOLD: 'sold',
  CANCELLED: 'cancelled',
};

export const TOKEN_KEY = 'carbonunity_token';
export const USER_KEY = 'carbonunity_user';
