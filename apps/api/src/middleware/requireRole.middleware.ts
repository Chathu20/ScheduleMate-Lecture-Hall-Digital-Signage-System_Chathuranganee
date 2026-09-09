import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.admin || !allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}