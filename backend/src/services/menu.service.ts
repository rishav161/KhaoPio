import prisma from '../prisma';

export class MenuService {
  /**
   * Fetches all menu categories and their associated items.
   */
  async getMenu(restaurantId: string) {
    return prisma.menuCategory.findMany({
      where: { restaurantId },
      include: {
        menuItems: {
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Creates a new menu category.
   */
  async createCategory(restaurantId: string, name: string) {
    const trimmedName = name.trim();
    const exists = await prisma.menuCategory.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
        restaurantId,
      },
    });

    if (exists) {
      throw new Error(`Category "${trimmedName}" already exists.`);
    }

    return prisma.menuCategory.create({
      data: {
        name: trimmedName,
        restaurantId,
      },
    });
  }

  /**
   * Updates a category name.
   */
  async updateCategory(restaurantId: string, id: string, name: string) {
    const category = await prisma.menuCategory.findFirst({
      where: { id, restaurantId },
    });

    if (!category) {
      throw new Error('Menu category not found.');
    }

    const trimmedName = name.trim();
    const exists = await prisma.menuCategory.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
        restaurantId,
        id: { not: id },
      },
    });

    if (exists) {
      throw new Error(`Category "${trimmedName}" already exists.`);
    }

    return prisma.menuCategory.update({
      where: { id },
      data: { name: trimmedName },
    });
  }

  /**
   * Deletes a category and all its menu items.
   */
  async deleteCategory(restaurantId: string, id: string) {
    const category = await prisma.menuCategory.findFirst({
      where: { id, restaurantId },
    });

    if (!category) {
      throw new Error('Menu category not found.');
    }

    return prisma.menuCategory.delete({
      where: { id },
    });
  }

  /**
   * Creates a new menu item.
   */
  async createMenuItem(
    restaurantId: string,
    data: { name: string; description?: string; price: number; image?: string; code: string; categoryId: string }
  ) {
    const category = await prisma.menuCategory.findFirst({
      where: { id: data.categoryId, restaurantId },
    });

    if (!category) {
      throw new Error('Selected category is invalid.');
    }

    const trimmedCode = data.code.trim().toUpperCase();
    const codeExists = await prisma.menuItem.findFirst({
      where: {
        code: trimmedCode,
        restaurantId,
      },
    });

    if (codeExists) {
      throw new Error(`Item short code "${trimmedCode}" is already in use.`);
    }

    return prisma.menuItem.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || '',
        price: data.price,
        image: data.image?.trim() || '',
        code: trimmedCode,
        categoryId: data.categoryId,
        restaurantId,
        isAvailable: true,
      },
    });
  }

  /**
   * Updates an existing menu item.
   */
  async updateMenuItem(
    restaurantId: string,
    id: string,
    data: { name?: string; description?: string; price?: number; image?: string; code?: string; categoryId?: string; isAvailable?: boolean }
  ) {
    const item = await prisma.menuItem.findFirst({
      where: { id, restaurantId },
    });

    if (!item) {
      throw new Error('Menu item not found.');
    }

    if (data.categoryId) {
      const category = await prisma.menuCategory.findFirst({
        where: { id: data.categoryId, restaurantId },
      });
      if (!category) {
        throw new Error('Selected category is invalid.');
      }
    }

    if (data.code) {
      const trimmedCode = data.code.trim().toUpperCase();
      const codeExists = await prisma.menuItem.findFirst({
        where: {
          code: trimmedCode,
          restaurantId,
          id: { not: id },
        },
      });
      if (codeExists) {
        throw new Error(`Item short code "${trimmedCode}" is already in use.`);
      }
    }

    return prisma.menuItem.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description.trim() }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.image !== undefined && { image: data.image.trim() }),
        ...(data.code && { code: data.code.trim().toUpperCase() }),
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
      },
    });
  }

  /**
   * Deletes a menu item.
   */
  async deleteMenuItem(restaurantId: string, id: string) {
    const item = await prisma.menuItem.findFirst({
      where: { id, restaurantId },
    });

    if (!item) {
      throw new Error('Menu item not found.');
    }

    return prisma.menuItem.delete({
      where: { id },
    });
  }
}

export const menuService = new MenuService();
export default menuService;
