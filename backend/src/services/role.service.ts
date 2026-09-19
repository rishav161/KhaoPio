import prisma from '../prisma';
import { PERMISSIONS_CATALOG, SYSTEM_ROLE_DEFAULTS, CATEGORY_METADATA } from '../config/permissions';

export interface CreateRolePayload {
  name: string;
  permissionNames: string[];
}

export interface UpdateRolePayload {
  name?: string;
  permissionNames?: string[];
}

export class RoleService {
  /**
   * Returns all permissions categorized for UI consumption.
   */
  getPermissionsCatalog() {
    // Group permissions by category with metadata
    const categoriesMap: Record<string, any> = {};

    for (const [catKey, meta] of Object.entries(CATEGORY_METADATA)) {
      categoriesMap[catKey] = {
        key: catKey,
        label: meta.label,
        icon: meta.icon,
        permissions: [],
      };
    }

    for (const perm of PERMISSIONS_CATALOG) {
      if (categoriesMap[perm.category]) {
        categoriesMap[perm.category].permissions.push(perm);
      }
    }

    return {
      permissions: PERMISSIONS_CATALOG,
      categories: Object.values(categoriesMap),
      systemRoleDefaults: SYSTEM_ROLE_DEFAULTS,
    };
  }

  /**
   * Fetches all available roles for a restaurant:
   * 1. Global system roles (isSystem = true or restaurantId = null)
   * 2. Custom restaurant roles created under this restaurantId
   * 
   * Highly optimized:
   * - Selects only necessary fields
   * - Counts assigned staff members per role within this restaurant using _count
   */
  async getRolesForRestaurant(restaurantId?: string) {
    const whereClause: any = {
      OR: [
        { isSystem: true },
        { restaurantId: null },
        ...(restaurantId ? [{ restaurantId }] : []),
      ],
    };

    const roles = await prisma.role.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        isSystem: true,
        restaurantId: true,
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: restaurantId
              ? { where: { restaurantId } }
              : true,
          },
        },
      },
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' },
      ],
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      isSystem: role.isSystem,
      restaurantId: role.restaurantId,
      staffCount: role._count.users,
      permissions: role.permissions.map((rp) => rp.permission.name),
    }));
  }

  /**
   * Creates a custom role under the restaurant with selected permissions.
   */
  async createCustomRole(restaurantId: string, payload: CreateRolePayload) {
    const trimmedName = payload.name?.trim();
    if (!trimmedName) {
      throw new Error('Role name is required and cannot be empty.');
    }

    // Check for name collision within the restaurant or against system roles
    const existingRole = await prisma.role.findFirst({
      where: {
        OR: [
          { name: { equals: trimmedName, mode: 'insensitive' }, restaurantId },
          { name: { equals: trimmedName, mode: 'insensitive' }, isSystem: true },
        ],
      },
      select: { id: true, name: true },
    });

    if (existingRole) {
      throw new Error(`A role with the name "${trimmedName}" already exists.`);
    }

    // Fetch valid permission IDs matching the requested permission names in one query
    const validPermissions = await prisma.permission.findMany({
      where: {
        name: { in: payload.permissionNames },
      },
      select: { id: true, name: true },
    });

    // Create the role with linked permissions in an atomic operation
    const createdRole = await prisma.role.create({
      data: {
        name: trimmedName,
        isSystem: false,
        restaurantId,
        permissions: {
          create: validPermissions.map((p) => ({
            permissionId: p.id,
          })),
        },
      },
      select: {
        id: true,
        name: true,
        isSystem: true,
        restaurantId: true,
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    return {
      id: createdRole.id,
      name: createdRole.name,
      isSystem: createdRole.isSystem,
      restaurantId: createdRole.restaurantId,
      staffCount: 0,
      permissions: createdRole.permissions.map((rp) => rp.permission.name),
    };
  }

  /**
   * Updates an existing role's name and/or permissions.
   * If isSystem is true, name cannot be changed, but permissions can be adjusted.
   */
  async updateRole(restaurantId: string, roleId: string, payload: UpdateRolePayload) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true, isSystem: true, restaurantId: true },
    });

    if (!role) {
      throw new Error('Role not found.');
    }

    // Tenant check for custom roles
    if (!role.isSystem && role.restaurantId !== restaurantId) {
      throw new Error('You do not have permission to modify this role.');
    }

    // System roles name check
    if (role.isSystem && payload.name && payload.name.trim().toUpperCase() !== role.name.toUpperCase()) {
      throw new Error('Built-in system role names cannot be modified.');
    }

    let updatedName = role.name;
    if (payload.name && !role.isSystem) {
      const trimmed = payload.name.trim();
      if (!trimmed) throw new Error('Role name cannot be empty.');

      // Check collision
      const collision = await prisma.role.findFirst({
        where: {
          id: { not: roleId },
          OR: [
            { name: { equals: trimmed, mode: 'insensitive' }, restaurantId },
            { name: { equals: trimmed, mode: 'insensitive' }, isSystem: true },
          ],
        },
        select: { id: true },
      });

      if (collision) {
        throw new Error(`Another role with the name "${trimmed}" already exists.`);
      }
      updatedName = trimmed;
    }

    // Perform atomic transaction if permissions are being updated
    if (payload.permissionNames !== undefined) {
      const validPermissions = await prisma.permission.findMany({
        where: { name: { in: payload.permissionNames } },
        select: { id: true, name: true },
      });

      await prisma.$transaction([
        // Update role name if changed
        prisma.role.update({
          where: { id: roleId },
          data: { name: updatedName },
        }),
        // Clear existing role permissions
        prisma.rolePermission.deleteMany({
          where: { roleId },
        }),
        // Insert new role permissions
        prisma.rolePermission.createMany({
          data: validPermissions.map((p) => ({
            roleId,
            permissionId: p.id,
          })),
        }),
      ]);
    } else if (updatedName !== role.name) {
      await prisma.role.update({
        where: { id: roleId },
        data: { name: updatedName },
      });
    }

    // Return the refreshed role with its updated permissions
    const refreshed = await prisma.role.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        name: true,
        isSystem: true,
        restaurantId: true,
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: restaurantId ? { where: { restaurantId } } : true,
          },
        },
      },
    });

    if (!refreshed) throw new Error('Failed to retrieve updated role.');

    return {
      id: refreshed.id,
      name: refreshed.name,
      isSystem: refreshed.isSystem,
      restaurantId: refreshed.restaurantId,
      staffCount: refreshed._count.users,
      permissions: refreshed.permissions.map((rp) => rp.permission.name),
    };
  }

  /**
   * Deletes a custom role. Built-in system roles cannot be deleted.
   * If any staff are assigned, deletion is blocked with a descriptive error.
   */
  async deleteCustomRole(restaurantId: string, roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true, isSystem: true, restaurantId: true },
    });

    if (!role) {
      throw new Error('Role not found.');
    }

    if (role.isSystem) {
      throw new Error('Built-in system roles cannot be deleted.');
    }

    if (role.restaurantId !== restaurantId) {
      throw new Error('You do not have permission to delete this role.');
    }

    // Check if staff are currently assigned to this role
    const assignedCount = await prisma.user.count({
      where: { roleId, restaurantId },
    });

    if (assignedCount > 0) {
      throw new Error(
        `Cannot delete role "${role.name}" because ${assignedCount} staff member(s) are currently assigned to it. Please reassign them first.`
      );
    }

    await prisma.role.delete({
      where: { id: roleId },
    });

    return { success: true, message: `Role "${role.name}" has been deleted.` };
  }

  /**
   * Switches a staff member's role to any available role (system or custom).
   */
  async switchUserRole(restaurantId: string, userId: string, targetRoleId: string) {
    // 1. Validate user belongs to this restaurant
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, restaurantId: true, roleId: true, role: { select: { name: true } } },
    });

    if (!user || user.restaurantId !== restaurantId) {
      throw new Error('User not found or does not belong to your restaurant.');
    }

    // 2. Validate target role exists and is accessible
    const targetRole = await prisma.role.findFirst({
      where: {
        id: targetRoleId,
        OR: [
          { isSystem: true },
          { restaurantId: null },
          { restaurantId },
        ],
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!targetRole) {
      throw new Error('Target role does not exist or is not available for your restaurant.');
    }

    if (targetRole.name === 'SUPER_ADMIN') {
      throw new Error('SUPER_ADMIN cannot be assigned through the staff interface.');
    }

    // Prevent demoting the only active super admin of the restaurant
    if (user.role.name === 'SUPER_ADMIN' && targetRole.name !== 'SUPER_ADMIN') {
      const superAdminCount = await prisma.user.count({
        where: {
          restaurantId,
          role: { name: 'SUPER_ADMIN' },
          status: 'ACTIVE',
        },
      });

      if (superAdminCount <= 1) {
        throw new Error('Cannot change role: the restaurant must have at least one active Super Admin.');
      }
    }

    // 3. Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { roleId: targetRoleId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        role: {
          select: {
            id: true,
            name: true,
            isSystem: true,
          },
        },
      },
    });

    return {
      user: updatedUser,
      permissions: targetRole.permissions.map((rp) => rp.permission.name),
      message: `Successfully updated ${updatedUser.name}'s role to "${targetRole.name}".`,
    };
  }

  async getUserPermissions(restaurantId: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
        userPermissions: { include: { permission: true } },
      },
    });

    if (!user || user.restaurantId !== restaurantId) {
      throw new Error('User not found or does not belong to your restaurant.');
    }

    const rolePermissions = user.role.permissions.map((rp) => ({
      permissionId: rp.permissionId,
      permissionName: rp.permission.name,
      description: rp.permission.description,
    }));

    const overrides = user.userPermissions.map((up) => ({
      permissionId: up.permissionId,
      permissionName: up.permission.name,
      description: up.permission.description,
      granted: up.granted,
    }));

    const base = new Set(rolePermissions.map((p) => p.permissionName));
    for (const up of user.userPermissions) {
      if (up.granted) {
        base.add(up.permission.name);
      } else {
        base.delete(up.permission.name);
      }
    }

    return {
      rolePermissions,
      overrides,
      effectivePermissions: [...base],
    };
  }

  async setUserPermissions(
    restaurantId: string,
    userId: string,
    overrides: { permissionId: string; granted: boolean }[],
    setById: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.restaurantId !== restaurantId) {
      throw new Error('User not found or does not belong to your restaurant.');
    }

    if (user.role.name === 'SUPER_ADMIN') {
      throw new Error('Cannot override permissions for SUPER_ADMIN.');
    }

    await prisma.$transaction([
      prisma.userPermission.deleteMany({ where: { userId } }),
      ...(overrides.length > 0
        ? [
            prisma.userPermission.createMany({
              data: overrides.map((o) => ({
                userId,
                permissionId: o.permissionId,
                granted: o.granted,
                setById,
              })),
            }),
          ]
        : []),
    ]);

    return this.getUserPermissions(restaurantId, userId);
  }
}

export const roleService = new RoleService();
export default roleService;
