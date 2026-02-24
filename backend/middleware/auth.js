import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nexthara_jwt_secret_2026';

// ── Frozen role enums ─────────────────────────────────────────────────────────
// Internal (users table):       SUPER_ADMIN | LOAN_HEAD | LOAN_EXECUTIVE
// Bank portal (bank_portal_users): BANK_SUPER_ADMIN | BANK_REGION_HEAD | BANK_BRANCH_MANAGER | BANK_OFFICER

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// requireSuperAdmin — internal users only, SUPER_ADMIN role
export function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// requireRole(...roles) — generic role gate for internal users
// Usage: router.use(requireAuth, requireRole('SUPER_ADMIN', 'LOAN_HEAD'))
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// requireInternalUser — any internal role (SUPER_ADMIN, LOAN_HEAD, LOAN_EXECUTIVE)
export function requireInternalUser(req, res, next) {
  const INTERNAL_ROLES = ['SUPER_ADMIN', 'LOAN_HEAD', 'LOAN_EXECUTIVE'];
  if (!INTERNAL_ROLES.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// requireBankPortalUser — any bank portal role
export function requireBankPortalUser(req, res, next) {
  const BANK_ROLES = ['BANK_SUPER_ADMIN', 'BANK_REGION_HEAD', 'BANK_BRANCH_MANAGER', 'BANK_OFFICER'];
  if (!BANK_ROLES.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

export { JWT_SECRET };
