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
  fetchActiveOrders: () => Promise<void>;
  sendOrderToKitchen: () => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: Order['status']) => Promise<void>;
  completePayment: (orderId: string, paymentMethod: 'CASH' | 'CARD_UPI') => Promise<void>;
}

const SEED_MENU_ITEMS: MenuItem[] = [
  { id: 'm1', name: 'Classic Cheese Burger', price: 6.99, category: 'Burgers', image: '🍔', description: 'Flame-grilled beef patty, melted cheddar, lettuce, tomato, house sauce', code: 'B01', isAvailable: true },
  { id: 'm2', name: 'Double BBQ Bacon Burger', price: 8.99, category: 'Burgers', image: '🥓', description: 'Double beef patty, crispy bacon, cheddar, crispy onions, smoky BBQ sauce', code: 'B02', isAvailable: true },
  { id: 'm3', name: 'Spicy Crispy Chicken Burger', price: 7.49, category: 'Burgers', image: '🍗', description: 'Crispy fried chicken breast, spicy mayo, pickles, shredded lettuce', code: 'B03', isAvailable: true },
  { id: 'm4', name: 'Classic Margherita Pizza', price: 10.99, category: 'Pizzas', image: '🍕', description: 'San Marzano tomato sauce, fresh mozzarella, fresh basil, olive oil', code: 'P01', isAvailable: true },
  { id: 'm5', name: 'Pepperoni Supreme Pizza', price: 12.99, category: 'Pizzas', image: '🍕', description: 'Double pepperoni, mozzarella cheese, spicy marinara sauce', code: 'P02', isAvailable: true },
  { id: 'm6', name: 'Truffle Mushroom Pizza', price: 13.49, category: 'Pizzas', image: '🍄', description: 'Cremini mushrooms, white truffle oil, fontina, fresh arugula', code: 'P03', isAvailable: true },
  { id: 'm7', name: 'Golden French Fries', price: 3.49, category: 'Sides', image: '🍟', description: 'Crispy golden fries, sea salt, served with ketchup', code: 'S01', isAvailable: true },
  { id: 'm8', name: 'Garlic Bread with Cheese', price: 4.99, category: 'Sides', image: '🥖', description: 'Toasted baguette with garlic butter, mozzarella, herbs', code: 'S02', isAvailable: true },
  { id: 'm9', name: 'Mozzarella Sticks', price: 5.49, category: 'Sides', image: '🧀', description: 'Crispy breaded mozzarella cheese sticks, marinara dipping sauce', code: 'S03', isAvailable: true },
  { id: 'm10', name: 'Iced Caramel Macchiato', price: 4.49, category: 'Drinks', image: '☕', description: 'Espresso, vanilla syrup, cold milk, caramel drizzle', code: 'D01', isAvailable: true },
  { id: 'm11', name: 'Lemon Mint Cooler', price: 3.29, category: 'Drinks', image: '🥤', description: 'Freshly squeezed lemon juice, crushed mint leaves, club soda', code: 'D02', isAvailable: true },
  { id: 'm12', name: 'Coca Cola Zero', price: 1.99, category: 'Drinks', image: '🥤', description: 'Chilled canned Coca-Cola Zero Sugar', code: 'D03', isAvailable: true },
  { id: 'm13', name: 'Chocolate Fudge Brownie', price: 5.49, category: 'Desserts', image: '🍫', description: 'Warm, gooey chocolate fudge brownie with chocolate drizzle', code: 'E01', isAvailable: true },
  { id: 'm14', name: 'New York Blueberry Cheesecake', price: 6.99, category: 'Desserts', image: '🍰', description: 'Rich, creamy classic cheesecake topped with sweet blueberry compote', code: 'E02', isAvailable: true },
];

export const usePOSStore = create<POSState>((set, get) => ({
  menuItems: [],
  cartItems: [],
  activeOrders: [],

  // 1. Fetch menu categories and items from backend
  fetchMenuItems: async () => {
    try {
      const categories = await apiFetch<any[]>('/menu');
      if (!categories || categories.length === 0) {
        // Fallback to static seeds if database returns nothing
        set({ menuItems: SEED_MENU_ITEMS });
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
      // Fail-safe: load seeds if database call errors out (e.g. initial setup)
      set({ menuItems: SEED_MENU_ITEMS });
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
  fetchActiveOrders: async () => {
    try {
      const orders = await apiFetch<any[]>('/orders/active');
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

      await get().fetchActiveOrders();
    } catch (error) {
      console.error(`Error completing payment for order ${orderId}:`, error);
    }
  },
}));
