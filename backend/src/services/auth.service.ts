import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prisma';
import { RoleName } from '@prisma/client';
import { emailService } from './email.service';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretposkey';

export class AuthService {
  /**
   * Registers the very first SUPER_ADMIN in the system.
   */
  async registerFirstAdmin(data: { name: string; email: string; passwordHash: string; restaurantName?: string; menuItems?: any[] }) {
    // Verify that the email was verified with OTP first
    const verification = await prisma.otpVerification.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!verification || !verification.isVerified) {
      throw new Error('Email address has not been verified with OTP.');
    }

    // Check if SUPER_ADMIN role exists
    const superAdminRole = await prisma.role.findUnique({
      where: { name: RoleName.SUPER_ADMIN },
    });

    if (!superAdminRole) {
      throw new Error('SUPER_ADMIN role not found in database. Run seed first.');
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

    // Cleanup OTP Verification
    await prisma.otpVerification.delete({
      where: { email: data.email.toLowerCase() },
    }).catch(() => {});

    // Fetch all permissions linked to the SUPER_ADMIN role
    const dbPermissions = await prisma.rolePermission.findMany({
      where: { roleId: superAdminRole.id },
      include: { permission: true },
    });
    const permissions = dbPermissions.map((dp) => dp.permission.name);

    return this.generateUserResponse(newAdmin, permissions);
  }

  /**
   * Initializes Super Admin registration by generating and sending an OTP verification email.
   */
  async initializeAdminRegistration(email: string): Promise<{ otp: string }> {
    const superAdminRole = await prisma.role.findUnique({
      where: { name: RoleName.SUPER_ADMIN },
    });

    if (!superAdminRole) {
      throw new Error('SUPER_ADMIN role not found in database. Run seed first.');
    }



    const emailExists = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (emailExists) {
      throw new Error('A user with this email address is already registered.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await prisma.otpVerification.upsert({
      where: { email: email.toLowerCase() },
      create: {
        email: email.toLowerCase(),
        otp,
        isVerified: false,
        expiresAt,
      },
      update: {
        otp,
        isVerified: false,
        expiresAt,
      },
    });

    // Send the OTP via email
    await emailService.sendOtpEmail(email.toLowerCase(), otp);

    return { otp };
  }

  /**
   * Verifies the OTP code for Super Admin email verification.
   */
  async verifyAdminOtp(email: string, otp: string): Promise<boolean> {
    const record = await prisma.otpVerification.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!record) {
      throw new Error('No verification code request found for this email address.');
    }

    if (record.otp !== otp) {
      throw new Error('Invalid verification code.');
    }

    if (record.expiresAt < new Date()) {
      throw new Error('Verification code has expired. Please request a new one.');
    }

    await prisma.otpVerification.update({
      where: { email: email.toLowerCase() },
      data: { isVerified: true },
    });

    return true;
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
        restaurant: {
          select: {
            name: true
          }
        }
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
  async getStaffList(restaurantId?: string) {
    return prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        ...(restaurantId && { restaurantId }),
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
        restaurant: {
          select: {
            name: true
          }
        }
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
  async getAllUsersDetails(restaurantId?: string) {
    return prisma.user.findMany({
      where: {
        ...(restaurantId && { restaurantId }),
      },
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
  async updateUserDetail(id: string, data: { name?: string; role?: RoleName; status?: 'ACTIVE' | 'INACTIVE' | 'INVITED' }, restaurantId?: string) {
    if (restaurantId) {
      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser || existingUser.restaurantId !== restaurantId) {
        throw new Error('User not found or does not belong to your restaurant.');
      }
    }

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
  async deleteUser(id: string, restaurantId?: string) {
    const userWithOrders = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            waiterOrders: true,
            payments: true,
          },
        },
      },
    });

    if (!userWithOrders) {
      throw new Error('User not found.');
    }

    if (restaurantId && userWithOrders.restaurantId !== restaurantId) {
      throw new Error('User not found or does not belong to your restaurant.');
    }

    const orderCount = userWithOrders._count.waiterOrders + userWithOrders._count.payments;
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
        restaurantName: user.restaurant?.name || '',
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
        restaurantName: user.restaurant?.name || '',
      },
      permissions,
      token,
    };
  }

  /**
   * Updates user name.
   */
  async updateProfile(userId: string, name: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { name },
      select: {
        id: true,
        name: true,
        email: true,
        restaurantId: true,
        role: {
          select: {
            name: true
          }
        }
      }
    });
  }

  /**
   * Updates restaurant details.
   */
  async updateRestaurant(restaurantId: string, name: string) {
    return prisma.restaurant.update({
      where: { id: restaurantId },
      data: { name }
    });
  }
}

export const authService = new AuthService();
export default authService;
