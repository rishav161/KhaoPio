export type OrderStatus =
  | 'DRAFT'
  | 'KITCHEN_PENDING'
  | 'PREPARING'
  | 'READY'
  | 'BILL_REQUESTED'
  | 'PAID'
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  orderId: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod?: string | null;
  waiterId: string;
  cashierId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
}

export interface CreateOrderPayload {
  items: Omit<OrderItem, 'id' | 'orderId'>[];
}
