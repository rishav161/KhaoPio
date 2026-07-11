import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretposkey';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string | null;
    role: string;
    restaurantId?: string;
    permissions: string[];
  };
}

/**
 * Middleware to authenticate requests via JWT Bearer tokens.
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Format: Bearer <token>

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        res.status(403).json({ error: 'Forbidden. Invalid or expired token.' });
        return;
      }

      (req as AuthenticatedRequest).user = decoded as AuthenticatedRequest['user'];
      next();
    });
  } else {
    res.status(401).json({ error: 'Unauthorized. Authorization header is missing.' });
  }
};

/**
 * Middleware to restrict route access based on a required granular permission.
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized. User context not found.' });
      return;
    }

    if (!user.permissions.includes(permission)) {
      res.status(403).json({
        error: `Forbidden. You do not have the required permission (${permission}) to perform this action.`,
      });
      return;
    }

    next();
  };
};
