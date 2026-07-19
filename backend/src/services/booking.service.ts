import prisma from '../prisma';
import { Booking } from '../types';

export class BookingService {
  async getBookings(restaurantId: string): Promise<Booking[]> {
    // Fetch upcoming or seated bookings for today onwards, sorted by time
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return prisma.booking.findMany({
      where: {
        restaurantId,
        bookingTime: {
          gte: startOfToday,
        },
      },
      include: {
        table: true,
      },
      orderBy: {
        bookingTime: 'asc',
      },
    }) as unknown as Booking[];
  }

  async createBooking(
    restaurantId: string,
    payload: {
      customerName: string;
      customerPhone?: string;
      bookingTime: string;
      guestsCount: number;
      tableId: string;
    }
  ): Promise<Booking> {
    const { customerName, customerPhone, bookingTime, guestsCount, tableId } = payload;
    const parsedTime = new Date(bookingTime);

    // Verify the table belongs to this restaurant
    const table = await prisma.diningTable.findFirst({
      where: { id: tableId, restaurantId },
    });

    if (!table) {
      throw new Error('Table not found.');
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        customerName,
        customerPhone,
        bookingTime: parsedTime,
        guestsCount,
        status: 'CONFIRMED',
        tableId,
        restaurantId,
      },
      include: {
        table: true,
      },
    });

    // If the booking is for today, let's mark the table as RESERVED
    const today = new Date();
    const isToday =
      parsedTime.getDate() === today.getDate() &&
      parsedTime.getMonth() === today.getMonth() &&
      parsedTime.getFullYear() === today.getFullYear();

    if (isToday && table.status === 'AVAILABLE') {
      await prisma.diningTable.update({
        where: { id: tableId },
        data: { status: 'RESERVED' },
      });
    }

    return booking as unknown as Booking;
  }

  async checkInBooking(restaurantId: string, bookingId: string): Promise<Booking> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, restaurantId },
      include: { table: true },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') {
      throw new Error(`Booking cannot be checked in from status ${booking.status}.`);
    }

    // Update booking status to SEATED
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'SEATED' },
      include: { table: true },
    });

    // Update table status to OCCUPIED
    await prisma.diningTable.update({
      where: { id: booking.tableId },
      data: { status: 'OCCUPIED' },
    });

    return updatedBooking as unknown as Booking;
  }

  async cancelBooking(restaurantId: string, bookingId: string): Promise<Booking> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, restaurantId },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    // Update booking status to CANCELLED
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
      include: { table: true },
    });

    // Restore table status to AVAILABLE if it was RESERVED
    const table = await prisma.diningTable.findUnique({
      where: { id: booking.tableId },
    });

    if (table && table.status === 'RESERVED') {
      // Check if there are other confirmed bookings for today on this table
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const otherBookings = await prisma.booking.findMany({
        where: {
          tableId: booking.tableId,
          status: 'CONFIRMED',
          bookingTime: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      });

      if (otherBookings.length === 0) {
        await prisma.diningTable.update({
          where: { id: booking.tableId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    return updatedBooking as unknown as Booking;
  }
}

export default new BookingService();
