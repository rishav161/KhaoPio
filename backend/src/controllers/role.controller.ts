import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import roleService from '../services/role.service';

export const getPermissionsCatalog = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const catalog = roleService.getPermissionsCatalog();
    res.status(200).json(catalog);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch permissions catalog.' });
  }
};

export const getRoles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const roles = await roleService.getRolesForRestaurant(restaurantId);
    res.status(200).json(roles);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch roles.' });
  }
};

export const createRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is missing from current user.' });
      return;
    }

    const { name, permissionNames } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Valid role name is required.' });
      return;
    }

    const newRole = await roleService.createCustomRole(restaurantId, {
      name,
      permissionNames: Array.isArray(permissionNames) ? permissionNames : [],
    });

    res.status(201).json({ message: 'Role created successfully.', role: newRole });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create role.' });
  }
};

export const updateRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is missing from current user.' });
      return;
    }

    const { id } = req.params;
    const { name, permissionNames } = req.body;

    const updated = await roleService.updateRole(restaurantId, id, {
      name,
      permissionNames: Array.isArray(permissionNames) ? permissionNames : undefined,
    });

    res.status(200).json({ message: 'Role updated successfully.', role: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update role.' });
  }
};

export const deleteRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is missing from current user.' });
      return;
    }

    const { id } = req.params;
    const result = await roleService.deleteCustomRole(restaurantId, id);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete role.' });
  }
};

export const switchUserRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is missing from current user.' });
      return;
    }

    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      res.status(400).json({ error: 'Target roleId is required.' });
      return;
    }

    const result = await roleService.switchUserRole(restaurantId, userId, roleId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to switch user role.' });
  }
};

export const getUserPermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is missing from current user.' });
      return;
    }

    const { userId } = req.params;
    const result = await roleService.getUserPermissions(restaurantId, userId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to fetch user permissions.' });
  }
};

export const setUserPermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const setById = req.user?.id;
    if (!restaurantId || !setById) {
      res.status(400).json({ error: 'Restaurant context is missing from current user.' });
      return;
    }

    const { userId } = req.params;
    const { overrides } = req.body;

    if (!Array.isArray(overrides)) {
      res.status(400).json({ error: 'overrides must be an array of { permissionId, granted }.' });
      return;
    }

    const result = await roleService.setUserPermissions(restaurantId, userId, overrides, setById);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to set user permissions.' });
  }
};
