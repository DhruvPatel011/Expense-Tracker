// backend/middleware/authMiddleware.js
// Protects routes by validating the JWT Bearer token in the Authorization header.
// Attaches req.user = { id } on success so controllers can use it.

import { verifyToken } from '../utils/generateToken.js';
import User from '../models/User.js';

/**
 * protect — must be used on any route that requires authentication.
 * Usage: router.get('/profile', protect, profileController)
 */
export const protect = async (req, res, next) => {
  let token;

  // Extract token from "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — no token provided',
    });
  }

  try {
    const decoded = verifyToken(token); // throws if expired or invalid

    // Attach the user (without password) to the request
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found — token may be stale',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Session expired — please log in again'
        : 'Not authorized — invalid token';

    return res.status(401).json({ success: false, message });
  }
};
