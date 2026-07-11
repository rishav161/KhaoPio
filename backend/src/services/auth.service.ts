import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prisma';
import { RoleName } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretposkey';

export class AuthService {
  /**
   * Registers the very first SUPER_ADMIN in the system.
   */
  async registerFirstAdmin(data: { name: string; email: string; passwordHash: string; restaurantName?: string; menuItems?: any[] }) {
    // Check if any SUPER_ADMIN already exists
    const superAdminRole = await prisma.role.findUnique({
      where: { name: RoleName.SUPER_ADMIN },
    });

    if (!superAdminRole) {
      throw new Error('SUPER_ADMIN role not found in database. Run seed first.');
    }

    const adminExists = await prisma.user.findFirst({
      where: { roleId: superAdminRole.id },
    });

    if (adminExists) {
      throw new Error('A Super Admin is already registered. Registration is locked.');
    }

    const hashed = await bcrypt.hash(data.passwordHash, 10);

    // 1. Create the restaurant
    const restaurant = await prisma.restaurant.create({
      data: {
        name: data.restaurantName || 'KhaoPio Restaurant',
      },
    });

    // 2. Create the user
    const newAdmin = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash: hashed,
        status: 'ACTIVE',
        roleId: superAdminRole.id,
        restaurantId: restaurant.id,
      },
      include: {
        role: true,
      },
    });

    // 3. Bootstrap selected seed menu items if provided
    if (data.menuItems && Array.isArray(data.menuItems)) {
      for (const item of data.menuItems) {
        // Find or create category
        let category = await prisma.menuCategory.findFirst({
          where: {
            name: item.category,
            restaurantId: restaurant.id,
          },
        });

        if (!category) {
          category = await prisma.menuCategory.create({
            data: {
              name: item.category,
              restaurantId: restaurant.id,
            },
          });
        }

        // Create menu item
        await prisma.menuItem.create({
          data: {
            name: item.name,
            description: item.description || '',
            price: parseFloat(item.price),
            image: item.image || '',
            code: item.code,
            categoryId: category.id,
            restaurantId: restaurant.id,
            isAvailable: true,
          },
        });
      }
    }

    return this.generateUserResponse(newAdmin, ['view:dashboard', 'view:sales-reports', 'view:staff-reports', 'view:staff', 'invite:staff', 'update:staff', 'delete:staff', 'view:orders', 'create:kot', 'request:bill', 'update:order-status', 'pay:order']);
  }

  /**
   * Logs in a user using Email and Password.
   */
  async loginWithEmail(credentials: { email: string; passwordHash: string }) {
    const user = await prisma.user.findUnique({
      where: { email: credentials.email.toLowerCase() },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.passwordHash || user.status !== 'ACTIVE') {
      throw new Error('Invalid email, password, or inactive account.');
    }

    const isMatch = await bcrypt.compare(credentials.passwordHash, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.name);
    return this.generateUserResponse(user, permissions);
  }

  /**
   * Creates an invitation token for a new staff member.
   */
  async createInvitation(email: string, targetRole: RoleName, restaurantId?: string) {
    const role = await prisma.role.findUnique({
      where: { name: targetRole },
    });

    if (!role) {
      throw new Error(`Role ${targetRole} does not exist.`);
    }

    // Check if user already exists
    const userExists = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (userExists) {
      throw new Error(`User with email ${email} already exists.`);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    // Upsert invitation (delete old unused one if exists)
    await prisma.invitation.deleteMany({
      where: { email: email.toLowerCase(), isUsed: false },
    });

    const invitation = await prisma.invitation.create({
      data: {
        email: email.toLowerCase(),
        roleId: role.id,
        restaurantId,
        token,
        expiresAt,
      },
      include: {
        role: true,
      },
    });

    return invitation;
  }

  /**
   * Verifies an invitation token and returns associated metadata.
   */
  async verifyInvitationToken(token: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { role: true },
    });

    if (!invitation || invitation.isUsed || invitation.expiresAt < new Date()) {
      throw new Error('Invitation token is invalid, used, or expired.');
    }

    return invitation;
  }

  /**
   * Accepts invitation and registers the user.
   */
  async acceptInvitation(data: {
    token: string;
    name: string;
    pin?: string;
    password?: string;
  }) {
    const invitation = await this.verifyInvitationToken(data.token);

    let passwordHash: string | undefined;
    let pinHash: string | undefined;

    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    if (data.pin) {
      if (!/^\d{6}$/.test(data.pin)) {
        throw new Error('PIN must be exactly 6 numeric digits.');
      }
      pinHash = await bcrypt.hash(data.pin, 10);
    }

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: invitation.email,
        passwordHash,
        pin: pinHash,
        status: 'ACTIVE',
        roleId: invitation.roleId,
        restaurantId: invitation.restaurantId,
      },
    });

    // Mark invitation as used
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { isUsed: true },
    });

    return newUser;
  }

  /**
   * Fetches list of active staff members (for POS screen quick login list).
   */
  async getStaffList() {
    return prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        // Hide super admins from tablet lock screen unless desired, but typically we want roles like cashier, waiter, chef, manager
      },
      select: {
        id: true,
        name: true,
        role: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Logs in a user using their email and 4-digit PIN.
   */
  async loginWithPin(data: { email: string; pin: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.pin || user.status !== 'ACTIVE') {
      throw new Error('Invalid email or PIN.');
    }

    const isMatch = await bcrypt.compare(data.pin, user.pin);
    if (!isMatch) {
      throw new Error('Invalid email or PIN.');
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.name);
    return this.generateUserResponse(user, permissions);
  }

  /**
   * Retrieves detailed information of all users (for administrative management).
   */
  async getAllUsersDetails() {
    return prisma.user.findMany({
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Updates user name, status, or role.
   */
  async updateUserDetail(id: string, data: { name?: string; role?: RoleName; status?: 'ACTIVE' | 'INACTIVE' | 'INVITED' }) {
    let roleId: string | undefined;
    if (data.role) {
      const roleRecord = await prisma.role.findUnique({
        where: { name: data.role },
      });
      if (!roleRecord) {
        throw new Error(`Role ${data.role} does not exist.`);
      }
      roleId = roleRecord.id;
    }

    return prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(roleId && { roleId }),
        ...(data.status && { status: data.status }),
      },
      include: {
        role: true,
      },
    });
  }

  /**
   * Deletes a user if they have no active orders.
   */
  async deleteUser(id: string) {
    const userWithOrders = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            waiterOrders: true,
            cashierOrders: true,
          },
        },
      },
    });

    if (!userWithOrders) {
      throw new Error('User not found.');
    }

    const orderCount = userWithOrders._count.waiterOrders + userWithOrders._count.cashierOrders;
    if (orderCount > 0) {
      throw new Error(`Cannot delete staff member. They have processed ${orderCount} order(s). Please set their status to INACTIVE instead.`);
    }

    return prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Helper to sign JWT and format return object.
   */
  private generateUserResponse(user: any, permissions: string[]) {
    // Generate JWT Token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        restaurantId: user.restaurantId,
        permissions,
      },
      JWT_SECRET,
      { expiresIn: '12h' } // Short-lived token for POS environment
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        restaurantId: user.restaurantId,
      },
      permissions,
      token,
    };
  }
}

export const authService = new AuthService();
export default authService;
