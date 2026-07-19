import { create } from 'zustand';
import Big from 'big.js';
import { MenuItem, CartItem, Order, OrderTotals, DiningTable, Booking } from '@/types/pos';
import { apiFetch } from '@/utils/api';

interface POSState {
  menuItems: MenuItem[];
  cartItems: CartItem[];
  activeOrders: Order[];
  tables: DiningTable[];
  bookings: Booking[];
  selectedTableId: string | null;
  
  // Actions
  fetchMenuItems: () => Promise<void>;
  addToCart: (item: MenuItem) => void;
  updateCartQuantity: (itemId: string, change: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  fetchActiveOrders: (includePaid?: boolean, paidDays?: string) => Promise<void>;
  sendOrderToKitchen: () => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: Order['status']) => Promise<void>;
  completePayment: (
    orderId: string,
    paymentPayload: {
      couponCode?: string;
      manualDiscount?: number;
      payments?: { paymentMethod: 'CASH' | 'CARD' | 'UPI'; amount: number; transactionReference?: string }[];
    }
  ) => Promise<void>;

  // New actions for tables & bookings
  fetchTables: () => Promise<void>;
  createTable: (name: string, capacity: number) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;
  fetchBookings: () => Promise<void>;
  createBooking: (payload: { customerName: string; customerPhone?: string; bookingTime: string; guestsCount: number; tableId: string }) => Promise<void>;
  checkInBooking: (id: string) => Promise<void>;
  cancelBooking: (id: string) => Promise<void>;
  setSelectedTableId: (tableId: string | null) => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  menuItems: [],
  cartItems: [],
  activeOrders: [],
  tables: [],
  bookings: [],
  selectedTableId: null,

  // 1. Fetch menu categories and items from backend
  fetchMenuItems: async () => {
    try {
      const categories = await apiFetch<any[]>('/menu');
      if (!categories || categories.length === 0) {
        set({ menuItems: [] });
        return;
      }
      
      const flatMenuItems: MenuItem[] = [];
      categories.forEach((cat) => {
        if (cat.menuItems && Array.isArray(cat.menuItems)) {
          cat.menuItems.forEach((dbItem: any) => {
            flatMenuItems.push({
              id: dbItem.id,
              name: dbItem.name,
              price: dbItem.price,
              category: cat.name,
              image: dbItem.image || '🍽️',
              description: dbItem.description || '',
              code: dbItem.code,
              isAvailable: dbItem.isAvailable,
            });
          });
        }
      });
      set({ menuItems: flatMenuItems });
    } catch (error) {
      console.error('Error fetching dynamic menu items:', error);
      set({ menuItems: [] });
    }
  },

  addToCart: (item: MenuItem) => {
    if (!item.isAvailable) return;
    
    set((state) => {
      const existingCartItem = state.cartItems.find(
        (ci) => ci.menuItem.id === item.id
      );

      let newCartItems;
      if (existingCartItem) {
        newCartItems = state.cartItems.map((ci) =>
          ci.menuItem.id === item.id
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        );
      } else {
        newCartItems = [...state.cartItems, { menuItem: item, quantity: 1 }];
      }

      return { cartItems: newCartItems };
    });
  },

  updateCartQuantity: (itemId: string, change: number) => {
    set((state) => {
      const newCartItems = state.cartItems
        .map((ci) => {
          if (ci.menuItem.id === itemId) {
            return { ...ci, quantity: ci.quantity + change };
          }
          return ci;
        })
        .filter((ci) => ci.quantity > 0);

      return { cartItems: newCartItems };
    });
  },

  removeFromCart: (itemId: string) => {
    set((state) => ({
      cartItems: state.cartItems.filter((ci) => ci.menuItem.id !== itemId),
    }));
  },

  clearCart: () => {
    set({ cartItems: [] });
  },

  // 2. Fetch active orders from backend KOT queues
  fetchActiveOrders: async (includePaid = false, paidDays = 'today') => {
    try {
      const url = includePaid 
        ? `/orders/active?includePaid=true&paidDays=${paidDays}` 
        : '/orders/active';
      const orders = await apiFetch<any[]>(url);
      const mappedOrders: Order[] = orders.map((order) => {
        const items: CartItem[] = order.items.map((dbItem: any) => {
          const localMenuItem = get().menuItems.find((mi) => mi.id === dbItem.menuItemId) || {
            id: dbItem.menuItemId,
            name: dbItem.name,
            price: dbItem.price,
            category: 'Other',
            image: '🍽️',
            code: 'KOT',
            isAvailable: true,
          };

          return {
            menuItem: localMenuItem,
            quantity: dbItem.quantity,
          };
        });

        return {
          id: order.id,
          orderNumber: `#${order.orderNumber}`,
          items,
          totals: {
            subtotal: order.subtotal.toFixed(2),
            taxRate: (order.taxRate ?? 5.0).toFixed(2),
            tax: order.taxTotal.toFixed(2),
            serviceChargeRate: (order.serviceChargeRate ?? 5.0).toFixed(2),
            serviceCharge: order.serviceChargeTotal.toFixed(2),
            discount: (order.discountTotal ?? 0.0).toFixed(2),
            total: order.grandTotal.toFixed(2),
          },
          status: order.status,
          createdAt: order.createdAt,
          couponCode: order.couponCode,
          payments: order.payments,
          tableId: order.tableId,
          table: order.table,
        };
      });

      set({ activeOrders: mappedOrders });
    } catch (error) {
      console.error('Error synchronizing active orders from database:', error);
    }
  },

  // 3. Post new orders to backend KOT endpoint
  sendOrderToKitchen: async () => {
    const { cartItems, selectedTableId } = get();
    if (cartItems.length === 0) return;

    try {
      const itemsPayload = cartItems.map((ci) => ({
        menuItemId: ci.menuItem.id,
        name: ci.menuItem.name,
        quantity: ci.quantity,
        price: ci.menuItem.price,
      }));

      await apiFetch('/orders/kitchen', {
        method: 'POST',
        body: {
          items: itemsPayload,
          tableId: selectedTableId || undefined,
        },
      });

      // Clear local cart
      set({ cartItems: [], selectedTableId: null });

      // Refresh order queues
      await get().fetchActiveOrders();
    } catch (error) {
      console.error('Error dispatching KOT order:', error);
      throw error;
    }
  },

  // 4. Patch order status on database
  updateOrderStatus: async (orderId: string, newStatus: Order['status']) => {
    try {
      await apiFetch(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: {
          status: newStatus,
        },
      });

      await get().fetchActiveOrders();
    } catch (error) {
      console.error(`Error updating order status for ${orderId}:`, error);
    }
  },

  // 5. Collect checkout payments on database
  completePayment: async (
    orderId: string,
    paymentPayload: {
      couponCode?: string;
      manualDiscount?: number;
      payments?: { paymentMethod: 'CASH' | 'CARD' | 'UPI'; amount: number; transactionReference?: string }[];
    }
  ) => {
    try {
      await apiFetch(`/orders/${orderId}/pay`, {
        method: 'POST',
        body: paymentPayload,
      });

      await get().fetchActiveOrders(true);
    } catch (error) {
      console.error(`Error completing payment for order ${orderId}:`, error);
    }
  },

  // New actions for tables & bookings
  fetchTables: async () => {
    try {
      const tables = await apiFetch<DiningTable[]>('/tables');
      set({ tables });
    } catch (error) {
      console.error('Error fetching dining tables:', error);
    }
  },

  createTable: async (name: string, capacity: number) => {
    try {
      await apiFetch('/tables', {
        method: 'POST',
        body: { name, capacity },
      });
      await get().fetchTables();
    } catch (error) {
      console.error('Error creating dining table:', error);
      throw error;
    }
  },

  deleteTable: async (id: string) => {
    try {
      await apiFetch(`/tables/${id}`, {
        method: 'DELETE',
      });
      await get().fetchTables();
    } catch (error) {
      console.error('Error deleting dining table:', error);
      throw error;
    }
  },

  fetchBookings: async () => {
    try {
      const bookings = await apiFetch<Booking[]>('/bookings');
      set({ bookings });
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  },

  createBooking: async (payload: { customerName: string; customerPhone?: string; bookingTime: string; guestsCount: number; tableId: string }) => {
    try {
      await apiFetch('/bookings', {
        method: 'POST',
        body: payload,
      });
      await get().fetchBookings();
      await get().fetchTables(); // Sync table status which might become RESERVED
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },

  checkInBooking: async (id: string) => {
    try {
      await apiFetch(`/bookings/${id}/checkin`, {
        method: 'POST',
      });
      await get().fetchBookings();
      await get().fetchTables(); // Sync table status which becomes OCCUPIED
    } catch (error) {
      console.error('Error checking in booking:', error);
      throw error;
    }
  },

  cancelBooking: async (id: string) => {
    try {
      await apiFetch(`/bookings/${id}/cancel`, {
        method: 'PATCH',
      });
      await get().fetchBookings();
      await get().fetchTables(); // Sync table status which might revert to AVAILABLE
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  },

  setSelectedTableId: (selectedTableId: string | null) => {
    set({ selectedTableId });
  },
}));
