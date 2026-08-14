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
  subtotal: string;
  taxRate: string;
  tax: string;
  serviceChargeRate: string;
  serviceCharge: string;
  discount: string;
  total: string;
}

export interface Payment {
  id: string;
  amount: number;
  paymentMethod: 'CASH' | 'CARD' | 'UPI';
  transactionReference?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  totals: OrderTotals;
  status: 'DRAFT' | 'KITCHEN_PENDING' | 'PREPARING' | 'READY' | 'BILL_REQUESTED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  createdAt: string;
  couponCode?: string | null;
  payments?: Payment[];
  tableId?: string | null;
  table?: DiningTable | null;
  waiterName?: string;
  waiterRole?: string;
}

export interface DiningTable {
  id: string;
  name: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
}

export interface Booking {
  id: string;
  customerName: string;
  customerPhone?: string | null;
  bookingTime: string;
  guestsCount: number;
  status: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'CANCELLED';
  tableId: string;
  table?: DiningTable;
}

export interface KotItem {
  id: string;
  kotId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  menuItem?: MenuItem;
}

export interface Kot {
  id: string;
  kotNumber: number;
  orderId: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  items: KotItem[];
  order?: Order;
  waiterName?: string;
  waiterRole?: string;
  table?: DiningTable;
}
