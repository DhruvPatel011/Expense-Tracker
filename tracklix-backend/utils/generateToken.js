// backend/utils/generateToken.js
// Generates and verifies JWT tokens for authentication.

import jwt from 'jsonwebtoken';

/**
 * Generate a signed JWT for a given user ID.
 * @param {string} userId - MongoDB ObjectId as string
 * @param {string} [expiresIn] - Override token expiry (e.g. '1d', '7d')
 * @returns {string} Signed JWT token
 */
export function generateToken(userId, expiresIn = process.env.JWT_EXPIRES_IN || '7d') {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Verify and decode a JWT token.
 * @param {string} token
 * @returns {{ id: string, iat: number, exp: number }} Decoded payload
 * @throws {JsonWebTokenError | TokenExpiredError}
 */
export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
