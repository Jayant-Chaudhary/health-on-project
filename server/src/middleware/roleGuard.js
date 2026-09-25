function roleGuard(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: requires one of [${allowedRoles.join(', ')}], current: ${req.user.role}`,
      });
    }

    // Anyone can sign up as a clinician; the role only carries clinical
    // powers once an administrator has verified the registration.
    if (req.user.role === 'clinician' && !req.user.isVerified) {
      return res.status(403).json({ error: 'Clinician account is pending verification' });
    }

    next();
  };
}

module.exports = roleGuard;
