import { PrismaClient, RoleName } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing database entries to ensure a clean seed
  await prisma.rolePermission.deleteMany({});
  await prisma.sidebarItem.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.menuCategory.deleteMany({});
  await prisma.restaurant.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});

  console.log('Database cleared.');

  // Create default Restaurant
  const restaurant = await prisma.restaurant.create({
    data: { name: 'KhaoPio Restaurant' },
  });
  console.log('Default Restaurant created.');

  // 1. Create Granular Permissions
  const permissionsData = [
    // Dashboard & Reports
    { name: 'view:dashboard', description: 'Can view administrative dashboard analytics' },
    { name: 'view:sales-reports', description: 'Can access sales reports and transactions logs' },
    { name: 'view:staff-reports', description: 'Can access staff performance and audit logs' },
    
    // Staff & Access Control
    { name: 'view:staff', description: 'Can view staff profiles and shift rosters' },
    { name: 'invite:staff', description: 'Can send invitations to new staff members' },
    { name: 'update:staff', description: 'Can edit staff details, roles, or disable accounts' },
    { name: 'delete:staff', description: 'Can permanently remove staff members from the system' },
    
    // POS Order Operations
    { name: 'view:orders', description: 'Can view active, pending, and completed orders' },
    { name: 'create:kot', description: 'Can place and submit Kitchen Order Tickets (KOT)' },
    { name: 'request:bill', description: 'Can trigger bill requests for customers' },
    { name: 'update:order-status', description: 'Can advance order preparation states (e.g. preparing, ready)' },
    { name: 'pay:order', description: 'Can close orders, apply discounts, and accept payments' },
  ];

  const permissions: Record<string, any> = {};
  for (const item of permissionsData) {
    permissions[item.name] = await prisma.permission.create({
      data: item,
    });
  }
  console.log('Granular Permissions seeded successfully.');

  // 2. Create Roles
  const roles: Record<RoleName, any> = {} as any;
  const roleNames: RoleName[] = ['SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER', 'WAITER', 'KITCHEN_CHEF'];

  for (const name of roleNames) {
    roles[name] = await prisma.role.create({
      data: { name },
    });
  }
  console.log('Roles seeded successfully.');

  // 3. Define Granular Role Permissions mappings
  const rolePermissionsMap: Record<RoleName, string[]> = {
    SUPER_ADMIN: [
      'view:dashboard',
      'view:sales-reports',
      'view:staff-reports',
      'view:staff',
      'invite:staff',
      'update:staff',
      'delete:staff',
      'view:orders',
      'create:kot',
      'request:bill',
      'update:order-status',
      'pay:order',
    ],
    STORE_MANAGER: [
      'view:dashboard',
      'view:sales-reports',
      'view:staff-reports',
      'view:staff',
      'invite:staff',
      'update:staff',
      'view:orders',
      'create:kot',
      'request:bill',
      'update:order-status',
      'pay:order',
    ],
    CASHIER: [
      'view:orders',
      'create:kot',
      'request:bill',
      'pay:order',
    ],
    WAITER: [
      'view:orders',
      'create:kot',
      'request:bill',
    ],
    KITCHEN_CHEF: [
      'view:orders',
      'update:order-status',
    ],
  };

  for (const [roleName, permissionNames] of Object.entries(rolePermissionsMap)) {
    const roleId = roles[roleName as RoleName].id;
    for (const permName of permissionNames) {
      const permissionId = permissions[permName].id;
      await prisma.rolePermission.create({
        data: {
          roleId,
          permissionId,
        },
      });
    }
  }
  console.log('RolePermissions associations seeded.');

  // 4. Create Sidebar Items aligned with existing frontend Next.js directory routes
  const sidebarData = [
    { label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard', order: 1, permissionName: 'view:dashboard' },
    { label: 'Billing (POS)', icon: 'Receipt', path: '/billing', order: 2, permissionName: 'create:kot' },
    { label: 'Checkout', icon: 'CreditCard', path: '/checkout', order: 3, permissionName: 'pay:order' },
    { label: 'Kitchen (KDS)', icon: 'ChefHat', path: '/kitchen', order: 4, permissionName: 'update:order-status' },
    { label: 'Staff Management', icon: 'Users', path: '/staff', order: 5, permissionName: 'view:staff' },
    { label: 'Set Menu', icon: 'Layers', path: '/menu', order: 6, permissionName: 'view:staff' },
    { label: 'Reports', icon: 'BarChart3', path: '/reports', order: 7, permissionName: 'view:sales-reports' },
  ];

  const sidebarItems: Record<string, any> = {};
  for (const item of sidebarData) {
    const permissionId = permissions[item.permissionName]?.id || null;
    sidebarItems[item.label] = await prisma.sidebarItem.create({
      data: {
        label: item.label,
        icon: item.icon,
        path: item.path,
        order: item.order,
        permissionId,
      },
    });
  }

  // Add nested sub-reports
  await prisma.sidebarItem.create({
    data: {
      label: 'Sales Report',
      path: '/reports/sales',
      order: 1,
      permissionId: permissions['view:sales-reports'].id,
      parentId: sidebarItems['Reports'].id,
    },
  });

  await prisma.sidebarItem.create({
    data: {
      label: 'Staff Activity',
      path: '/reports/staff',
      order: 2,
      permissionId: permissions['view:staff-reports'].id,
      parentId: sidebarItems['Reports'].id,
    },
  });

  console.log('SidebarItems seeded successfully.');

  // 5. Seed Menu Categories & Menu Items under the default restaurant
  const categoriesData = ['Burgers', 'Pizzas', 'Sides', 'Drinks', 'Desserts'];
  const menuCategoriesMap: Record<string, any> = {};
  for (const catName of categoriesData) {
    menuCategoriesMap[catName] = await prisma.menuCategory.create({
      data: {
        name: catName,
        restaurantId: restaurant.id,
      }
    });
  }
  console.log('Menu Categories seeded successfully.');

  const seedMenuItemsData = [
    { name: 'Classic Cheese Burger', price: 6.99, category: 'Burgers', image: '🍔', description: 'Flame-grilled beef patty, melted cheddar, lettuce, tomato, house sauce', code: 'B01' },
    { name: 'Double BBQ Bacon Burger', price: 8.99, category: 'Burgers', image: '🥓', description: 'Double beef patty, crispy bacon, cheddar, crispy onions, smoky BBQ sauce', code: 'B02' },
    { name: 'Spicy Crispy Chicken Burger', price: 7.49, category: 'Burgers', image: '🍗', description: 'Crispy fried chicken breast, spicy mayo, pickles, shredded lettuce', code: 'B03' },
    { name: 'Classic Margherita Pizza', price: 10.99, category: 'Pizzas', image: '🍕', description: 'San Marzano tomato sauce, fresh mozzarella, fresh basil, olive oil', code: 'P01' },
    { name: 'Pepperoni Supreme Pizza', price: 12.99, category: 'Pizzas', image: '🍕', description: 'Double pepperoni, mozzarella cheese, spicy marinara sauce', code: 'P02' },
    { name: 'Truffle Mushroom Pizza', price: 13.49, category: 'Pizzas', image: '🍄', description: 'Cremini mushrooms, white truffle oil, fontina, fresh arugula', code: 'P03' },
    { name: 'Golden French Fries', price: 3.49, category: 'Sides', image: '🍟', description: 'Crispy golden fries, sea salt, served with ketchup', code: 'S01' },
    { name: 'Garlic Bread with Cheese', price: 4.99, category: 'Sides', image: '🥖', description: 'Toasted baguette with garlic butter, mozzarella, herbs', code: 'S02' },
    { name: 'Mozzarella Sticks', price: 5.49, category: 'Sides', image: '🧀', description: 'Crispy breaded mozzarella cheese sticks, marinara dipping sauce', code: 'S03' },
    { name: 'Iced Caramel Macchiato', price: 4.49, category: 'Drinks', image: '☕', description: 'Espresso, vanilla syrup, cold milk, caramel drizzle', code: 'D01' },
    { name: 'Lemon Mint Cooler', price: 3.29, category: 'Drinks', image: '🥤', description: 'Freshly squeezed lemon juice, crushed mint leaves, club soda', code: 'D02' },
    { name: 'Coca Cola Zero', price: 1.99, category: 'Drinks', image: '🥤', description: 'Chilled canned Coca-Cola Zero Sugar', code: 'D03' },
    { name: 'Chocolate Fudge Brownie', price: 5.49, category: 'Desserts', image: '🍫', description: 'Warm, gooey chocolate fudge brownie with chocolate drizzle', code: 'E01' },
    { name: 'New York Blueberry Cheesecake', price: 6.99, category: 'Desserts', image: '🍰', description: 'Rich, creamy classic cheesecake topped with sweet blueberry compote', code: 'E02' }
  ];

  for (const item of seedMenuItemsData) {
    await prisma.menuItem.create({
      data: {
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        code: item.code,
        categoryId: menuCategoriesMap[item.category].id,
        restaurantId: restaurant.id,
        isAvailable: true
      }
    });
  }
  console.log('Menu Items seeded successfully.');

  // 6. Seed Coupons
  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(startDate.getFullYear() + 1); // 1 year from now

  await prisma.coupon.createMany({
    data: [
      {
        code: 'WELCOME10',
        description: 'Get 10% off on your order',
        discountType: 'PERCENTAGE',
        discountValue: 10.0,
        minSubtotal: 10.0,
        startDate,
        endDate,
        isActive: true,
        restaurantId: restaurant.id,
      },
      {
        code: 'FLAT50',
        description: 'Get $50 off on orders above $100',
        discountType: 'FLAT',
        discountValue: 50.0,
        minSubtotal: 100.0,
        startDate,
        endDate,
        isActive: true,
        restaurantId: restaurant.id,
      }
    ]
  });
  console.log('Coupons seeded successfully.');

  console.log('KhaoPio Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seed execution:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
