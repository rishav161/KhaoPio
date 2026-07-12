import { create } from 'zustand';
import Big from 'big.js';
import { MenuItem, CartItem, Order, OrderTotals } from '@/types/pos';
import { apiFetch } from '@/utils/api';

interface POSState {
  menuItems: MenuItem[];
  cartItems: CartItem[];
  activeOrders: Order[];
  
  // Actions
  fetchMenuItems: () => Promise<void>;
  addToCart: (item: MenuItem) => void;
  updateCartQuantity: (itemId: string, change: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  fetchActiveOrders: (includePaid?: boolean, paidDays?: string) => Promise<void>;
  sendOrderToKitchen: () => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: Order['status']) => Promise<void>;
  completePayment: (orderId: string, paymentMethod: 'CASH' | 'CARD_UPI') => Promise<void>;
}

export const usePOSStore = create<POSState>((set, get) => ({
  menuItems: [],
  cartItems: [],
  activeOrders: [],

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
            tax: order.taxTotal.toFixed(2),
            total: order.grandTotal.toFixed(2),
          },
          status: order.status,
          createdAt: order.createdAt,
          paymentMethod: order.paymentMethod || undefined,
          completedAt: order.completedAt || undefined,
        };
      });

      set({ activeOrders: mappedOrders });
    } catch (error) {
      console.error('Error synchronizing active orders from database:', error);
    }
  },

  // 3. Post new orders to backend KOT endpoint
  sendOrderToKitchen: async () => {
    const { cartItems } = get();
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
        },
      });

      // Clear local cart
      set({ cartItems: [] });

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
  completePayment: async (orderId: string, paymentMethod: 'CASH' | 'CARD_UPI') => {
    try {
      await apiFetch(`/orders/${orderId}/pay`, {
        method: 'POST',
        body: {
          paymentMethod,
        },
      });

      await get().fetchActiveOrders(true);
    } catch (error) {
      console.error(`Error completing payment for order ${orderId}:`, error);
    }
  },
}));
