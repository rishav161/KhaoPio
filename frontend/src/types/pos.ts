export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description?: string;
  code: string; // E.g., short search code (e.g., B1, P3, etc.)
  isAvailable: boolean;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface OrderTotals {
  subtotal: string; // precise decimal representation from big.js
  tax: string;      // precise decimal representation from big.js
  total: string;    // precise decimal representation from big.js
}

export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  totals: OrderTotals;
  status: 'DRAFT' | 'KITCHEN_PENDING' | 'PREPARING' | 'READY' | 'PAID';
  createdAt: string;
  paymentMethod?: 'CASH' | 'CARD_UPI';
  completedAt?: string;
}
