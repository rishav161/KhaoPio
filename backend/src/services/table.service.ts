import prisma from '../prisma';
import { DiningTable } from '../types';

export class TableService {
  async getTables(restaurantId: string): Promise<DiningTable[]> {
    return prisma.diningTable.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    }) as unknown as DiningTable[];
  }

  async createTable(restaurantId: string, name: string, capacity: number): Promise<DiningTable> {
    // Check if table name already exists for this restaurant
    const existingTable = await prisma.diningTable.findUnique({
      where: {
        name_restaurantId: {
          name,
          restaurantId,
        },
      },
    });

    if (existingTable) {
      throw new Error(`A table named "${name}" already exists.`);
    }

    return prisma.diningTable.create({
      data: {
        name,
        capacity,
        status: 'AVAILABLE',
        restaurantId,
      },
    }) as unknown as DiningTable;
  }

  async deleteTable(restaurantId: string, tableId: string): Promise<DiningTable> {
    // Verify the table belongs to this restaurant
    const table = await prisma.diningTable.findFirst({
      where: { id: tableId, restaurantId },
    });

    if (!table) {
      throw new Error('Table not found.');
    }

    // Check if there are active orders on this table (occupied)
    if (table.status === 'OCCUPIED') {
      throw new Error('Cannot delete an occupied table with an active order.');
    }

    return prisma.diningTable.delete({
      where: { id: tableId },
    }) as unknown as DiningTable;
  }
}

export default new TableService();
