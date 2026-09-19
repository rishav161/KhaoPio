import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretposkey';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string | null;
    role: string;
    roleId: string;
    restaurantId?: string;
    permissions: string[];
  };
}

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized. Authorization header is missing.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    res.status(403).json({ error: 'Forbidden. Invalid or expired token.' });
    return;
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
        userPermissions: { include: { permission: true } },
      },
    });

    if (!dbUser) {
      res.status(401).json({ error: 'Unauthorized. User not found.' });
      return;
    }

    const base = new Set(dbUser.role.permissions.map((rp) => rp.permission.name));
    for (const up of dbUser.userPermissions) {
      if (up.granted) {
        base.add(up.permission.name);
      } else {
        base.delete(up.permission.name);
      }
    }

    (req as AuthenticatedRequest).user = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role.name,
      roleId: dbUser.roleId,
      restaurantId: dbUser.restaurantId ?? undefined,
      permissions: [...base],
    };

    next();
  } catch {
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};

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

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: 'Unauthorized. User context not found.' });
    return;
  }

  if (user.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      error: 'Forbidden. Only the Super Admin of this restaurant can perform this action.',
    });
    return;
  }

  next();
};
