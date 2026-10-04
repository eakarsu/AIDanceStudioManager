'use strict';

const authenticate = require('./auth');

// The legacy API has no tenant boundary. Guardian and student accounts can use
// their dedicated read surface, but cannot enter the broad legacy routers.
function legacyStaffBoundary(pool) {
  return (req, res, next) => {
    if (req.path === '/health' || req.path === '/mobile/manifest') return next();
    authenticate(req, res, async () => {
      try {
        if (!Number.isSafeInteger(req.user?.id)) return res.status(401).json({ error: 'Account unavailable' });
        const result = await pool.query('SELECT role,is_active FROM users WHERE id=$1', [req.user.id]);
        const account = result.rows[0];
        if (!account || account.is_active !== true) return res.status(401).json({ error: 'Account unavailable' });
        if (!['admin', 'staff', 'teacher'].includes(account.role))
          return res.status(403).json({ error: 'Staff account required' });
        next();
      } catch (_) { res.status(500).json({ error: 'Account check failed' }); }
    });
  };
}

module.exports = legacyStaffBoundary;
