import passport from '../config/passport.js';

// Protects routes via the Passport JWT strategy (stateless Bearer token).
// Same 401 shape as before: { code: 'TOKEN_EXPIRED' } lets the client refresh.
export const protect = (req, res, next) =>
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      const expired = info?.name === 'TokenExpiredError';
      return res.status(401).json({
        message: expired ? 'Token expired' : 'Not authorized, invalid token',
        ...(expired ? { code: 'TOKEN_EXPIRED' } : {}),
      });
    }
    // Suspended accounts are rejected even with a valid token.
    if (user.isSuspended) {
      return res.status(403).json({ message: 'Account suspended', code: 'ACCOUNT_SUSPENDED' });
    }
    req.user = user;
    next();
  })(req, res, next);

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};