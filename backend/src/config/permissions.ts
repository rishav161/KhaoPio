export interface PermissionDefinition {
  name: string;
  label: string;
  description: string;
  category: 'orders' | 'billing' | 'tables' | 'reports' | 'staff';
}

export interface PermissionCategory {
  key: 'orders' | 'billing' | 'tables' | 'reports' | 'staff';
  label: string;
  icon: string;
  permissions: PermissionDefinition[];
}

export const PERMISSIONS_CATALOG: PermissionDefinition[] = [
  // 🛒 Orders & KOT
  {
    name: 'view:orders',
    label: 'View Orders',
    description: 'Can view active, pending, and completed orders across tables',
    category: 'orders',
  },
  {
    name: 'create:kot',
    label: 'Create KOT / Place Orders',
    description: 'Can take orders from menu and dispatch Kitchen Order Tickets to kitchen',
    category: 'orders',
  },
  {
    name: 'request:bill',
    label: 'Request Bill',
    description: 'Can mark a table order as bill-requested for customer checkout',
    category: 'orders',
  },
  {
    name: 'update:order-status',
    label: 'Update Order / Kitchen Status',
    description: 'Can advance cooking progress (preparing, ready, served) on kitchen display',
    category: 'orders',
  },

  // 💳 Billing & Checkout
  {
    name: 'pay:order',
    label: 'Process Payments & Checkout',
    description: 'Can apply coupons, accept payments (Cash, Card, UPI), and print invoices',
    category: 'billing',
  },

  // 🪑 Floor & Tables
  {
    name: 'view:tables',
    label: 'View Tables',
    description: 'Can view restaurant dining floor plan, table statuses, and reservations',
    category: 'tables',
  },
  {
    name: 'manage:tables',
    label: 'Manage Tables & Bookings',
    description: 'Can add/edit dining tables, adjust capacities, and seat customer bookings',
    category: 'tables',
  },

  // 📊 Reports & Analytics
  {
    name: 'view:dashboard',
    label: 'View Analytics Dashboard',
    description: 'Can view revenue totals, sales trends, hourly peaks, and top sold items',
    category: 'reports',
  },
  {
    name: 'view:sales-reports',
    label: 'View Sales & Financial Reports',
    description: 'Can access detailed transaction receipts, payment method breakdowns, and taxes',
    category: 'reports',
  },
  {
    name: 'view:staff-reports',
    label: 'View Staff Performance Reports',
    description: 'Can audit employee sales volume, shift activities, and order counts',
    category: 'reports',
  },

  // 👥 Staff Administration
  {
    name: 'view:staff',
    label: 'View Staff Roster',
    description: 'Can view employee profiles, roles, and shift availability',
    category: 'staff',
  },
  {
    name: 'invite:staff',
    label: 'Invite Staff Members',
    description: 'Can send onboarding email invitations and generate registration links',
    category: 'staff',
  },
  {
    name: 'update:staff',
    label: 'Edit Staff Accounts',
    description: 'Can edit staff names, switch roles, and toggle active/inactive status',
    category: 'staff',
  },
  {
    name: 'delete:staff',
    label: 'Delete Staff Accounts',
    description: 'Can permanently remove unlinked employee accounts from the restaurant',
    category: 'staff',
  },
];

export const SYSTEM_ROLE_DEFAULTS: Record<string, string[]> = {
  SUPER_ADMIN: [
    'view:dashboard', 'view:sales-reports', 'view:staff-reports',
    'view:staff', 'invite:staff', 'update:staff', 'delete:staff',
    'view:orders', 'create:kot', 'request:bill', 'update:order-status',
    'pay:order', 'view:tables', 'manage:tables'
  ],
  STORE_MANAGER: [
    'view:dashboard', 'view:sales-reports', 'view:staff-reports',
    'view:staff', 'invite:staff', 'update:staff',
    'view:orders', 'create:kot', 'request:bill', 'update:order-status',
    'pay:order', 'view:tables', 'manage:tables'
  ],
  CASHIER: [
    'view:orders', 'create:kot', 'request:bill', 'pay:order',
    'view:tables', 'manage:tables'
  ],
  WAITER: [
    'view:orders', 'create:kot', 'request:bill',
    'view:tables', 'manage:tables'
  ],
  KITCHEN_CHEF: [
    'view:orders', 'update:order-status'
  ],
};

export const CATEGORY_METADATA: Record<string, { label: string; icon: string }> = {
  orders: { label: 'Orders & KOT', icon: 'Receipt' },
  billing: { label: 'Billing & Checkout', icon: 'CreditCard' },
  tables: { label: 'Tables & Floor', icon: 'TableProperties' },
  reports: { label: 'Reports & Analytics', icon: 'BarChart3' },
  staff: { label: 'Staff Management', icon: 'Users' },
};
