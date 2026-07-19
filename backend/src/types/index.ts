export type OrderStatus =
  | 'DRAFT'
  | 'KITCHEN_PENDING'
  | 'PREPARING'
  | 'READY'
  | 'BILL_REQUESTED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED';

export type DiscountType = 'PERCENTAGE' | 'FLAT';
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  orderId: string;
}

export interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minSubtotal: number;
  maxDiscount?: number | null;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  restaurantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string | null;
  orderId: string;
  cashierId: string;
  createdAt: Date;
}

export interface Order {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  subtotal: number;
  taxRate: number;
  taxTotal: number;
  serviceChargeRate: number;
  serviceChargeTotal: number;
  discountTotal: number;
  couponId?: string | null;
  coupon?: Coupon | null;
  couponCode?: string | null;
  grandTotal: number;
  payments?: Payment[];
  restaurantId?: string | null;
  waiterId: string;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
}

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'SEATED' | 'CANCELLED';

export interface DiningTable {
  id: string;
  name: string;
  capacity: number;
  status: TableStatus;
  restaurantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  id: string;
  customerName: string;
  customerPhone?: string | null;
  bookingTime: Date;
  guestsCount: number;
  status: BookingStatus;
  tableId: string;
  restaurantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderPayload {
  items: Omit<OrderItem, 'id' | 'orderId'>[];
  tableId?: string;
}


