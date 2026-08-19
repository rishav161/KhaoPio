import { PrismaClient, RoleName } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear non-destructive items to prevent duplicates while seeding
  await prisma.rolePermission.deleteMany({});
  await prisma.sidebarItem.deleteMany({});

  console.log('Database configuration tables cleared.');

  // Find or create default Restaurant
  let restaurant = await prisma.restaurant.findFirst({
    where: { name: 'KhaoPio Restaurant' },
  });
  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: { name: 'KhaoPio Restaurant' },
    });
    console.log('Default Restaurant created.');
  } else {
    console.log('Default Restaurant already exists.');
  }

  // 1. Create/Update Granular Permissions
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
    
    // Tables & Bookings
    { name: 'view:tables', description: 'Can view restaurant dining tables and reservations' },
    { name: 'manage:tables', description: 'Can add, remove, or modify dining tables and reservations' },
  ];

  const permissions: Record<string, any> = {};
  for (const item of permissionsData) {
    permissions[item.name] = await prisma.permission.upsert({
      where: { name: item.name },
      update: { description: item.description },
      create: item,
    });
  }
  console.log('Granular Permissions seeded/updated successfully.');

  // 2. Create/Update Roles
  const roles: Record<RoleName, any> = {} as any;
  const roleNames: RoleName[] = ['SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER', 'WAITER', 'KITCHEN_CHEF'];

  for (const name of roleNames) {
    roles[name] = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('Roles seeded/updated successfully.');

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
      'view:tables',
      'manage:tables',
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
      'view:tables',
      'manage:tables',
    ],
    CASHIER: [
      'view:orders',
      'create:kot',
      'request:bill',
      'pay:order',
      'view:tables',
      'manage:tables',
    ],
    WAITER: [
      'view:orders',
      'create:kot',
      'request:bill',
      'view:tables',
      'manage:tables',
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
    { label: 'Orders', icon: 'Receipt', path: '/orders', order: 2, permissionName: 'create:kot' },
    { label: 'Tables', icon: 'TableProperties', path: '/tables', order: 3, permissionName: 'view:tables' },
    { label: 'Checkout', icon: 'CreditCard', path: '/checkout', order: 4, permissionName: 'pay:order' },
    { label: 'Kitchen', icon: 'ChefHat', path: '/kitchen', order: 5, permissionName: 'update:order-status' },
    { label: 'Staff', icon: 'Users', path: '/staff', order: 6, permissionName: 'view:staff' },
    { label: 'Set Menu', icon: 'Layers', path: '/menu', order: 7, permissionName: 'view:staff' },
    { label: 'Reports', icon: 'BarChart3', path: '/reports', order: 8, permissionName: 'view:sales-reports' },
    { label: 'Help', icon: 'HelpCircle', path: '/help', order: 9, permissionName: null },
  ];

  const sidebarItems: Record<string, any> = {};
  for (const item of sidebarData) {
    const permissionId = item.permissionName ? permissions[item.permissionName]?.id ?? null : null;
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
    menuCategoriesMap[catName] = await prisma.menuCategory.upsert({
      where: {
        name_restaurantId: {
          name: catName,
          restaurantId: restaurant.id,
        }
      },
      update: {},
      create: {
        name: catName,
        restaurantId: restaurant.id,
      }
    });
  }
  console.log('Menu Categories seeded successfully.');

  const seedMenuItemsData = [
    { name: 'Classic Cheese Burger', price: 199.00, category: 'Burgers', image: '🍔', description: 'Flame-grilled beef patty, melted cheddar, lettuce, tomato, house sauce', code: 'B01' },
    { name: 'Double BBQ Bacon Burger', price: 299.00, category: 'Burgers', image: '🥓', description: 'Double beef patty, crispy bacon, cheddar, crispy onions, smoky BBQ sauce', code: 'B02' },
    { name: 'Spicy Crispy Chicken Burger', price: 249.00, category: 'Burgers', image: '🍗', description: 'Crispy fried chicken breast, spicy mayo, pickles, shredded lettuce', code: 'B03' },
    { name: 'Classic Margherita Pizza', price: 399.00, category: 'Pizzas', image: '🍕', description: 'San Marzano tomato sauce, fresh mozzarella, fresh basil, olive oil', code: 'P01' },
    { name: 'Pepperoni Supreme Pizza', price: 499.00, category: 'Pizzas', image: '🍕', description: 'Double pepperoni, mozzarella cheese, spicy marinara sauce', code: 'P02' },
    { name: 'Truffle Mushroom Pizza', price: 549.00, category: 'Pizzas', image: '🍄', description: 'Cremini mushrooms, white truffle oil, fontina, fresh arugula', code: 'P03' },
    { name: 'Golden French Fries', price: 129.00, category: 'Sides', image: '🍟', description: 'Crispy golden fries, sea salt, served with ketchup', code: 'S01' },
    { name: 'Garlic Bread with Cheese', price: 179.00, category: 'Sides', image: '🥖', description: 'Toasted baguette with garlic butter, mozzarella, herbs', code: 'S02' },
    { name: 'Mozzarella Sticks', price: 199.00, category: 'Sides', image: '🧀', description: 'Crispy breaded mozzarella cheese sticks, marinara dipping sauce', code: 'S03' },
    { name: 'Iced Caramel Macchiato', price: 189.00, category: 'Drinks', image: '☕', description: 'Espresso, vanilla syrup, cold milk, caramel drizzle', code: 'D01' },
    { name: 'Lemon Mint Cooler', price: 119.00, category: 'Drinks', image: '🥤', description: 'Freshly squeezed lemon juice, crushed mint leaves, club soda', code: 'D02' },
    { name: 'Coca Cola Zero', price: 59.00, category: 'Drinks', image: '🥤', description: 'Chilled canned Coca-Cola Zero Sugar', code: 'D03' },
    { name: 'Chocolate Fudge Brownie', price: 149.00, category: 'Desserts', image: '🍫', description: 'Warm, gooey chocolate fudge brownie with chocolate drizzle', code: 'E01' },
    { name: 'New York Blueberry Cheesecake', price: 249.00, category: 'Desserts', image: '🍰', description: 'Rich, creamy classic cheesecake topped with sweet blueberry compote', code: 'E02' }
  ];

  for (const item of seedMenuItemsData) {
    await prisma.menuItem.upsert({
      where: {
        code_restaurantId: {
          code: item.code,
          restaurantId: restaurant.id,
        }
      },
      update: {
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        categoryId: menuCategoriesMap[item.category].id,
      },
      create: {
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

  const couponsData = [
    {
      code: 'WELCOME10',
      description: 'Get 10% off on your order',
      discountType: 'PERCENTAGE' as const,
      discountValue: 10.0,
      minSubtotal: 299.0,
      startDate,
      endDate,
      isActive: true,
      restaurantId: restaurant.id,
    },
    {
      code: 'FLAT100',
      description: 'Get ₹100 off on orders above ₹500',
      discountType: 'FLAT' as const,
      discountValue: 100.0,
      minSubtotal: 500.0,
      startDate,
      endDate,
      isActive: true,
      restaurantId: restaurant.id,
    }
  ];

  for (const coupon of couponsData) {
    await prisma.coupon.upsert({
      where: {
        code_restaurantId: {
          code: coupon.code,
          restaurantId: restaurant.id,
        }
      },
      update: {
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minSubtotal: coupon.minSubtotal,
        startDate: coupon.startDate,
        endDate: coupon.endDate,
        isActive: coupon.isActive,
      },
      create: coupon,
    });
  }
  console.log('Coupons seeded successfully.');
  
  // 7. Seed Dining Tables
  const defaultTables = [
    { name: 'Table 1', capacity: 2 },
    { name: 'Table 2', capacity: 2 },
    { name: 'Table 3', capacity: 4 },
    { name: 'Table 4', capacity: 4 },
    { name: 'Table 5', capacity: 6 },
    { name: 'Table 6', capacity: 6 },
    { name: 'Table 7', capacity: 8 },
    { name: 'Table 8', capacity: 8 },
  ];
  
  for (const tbl of defaultTables) {
    await prisma.diningTable.upsert({
      where: {
        name_restaurantId: {
          name: tbl.name,
          restaurantId: restaurant.id,
        }
      },
      update: {
        capacity: tbl.capacity,
      },
      create: {
        name: tbl.name,
        capacity: tbl.capacity,
        status: 'AVAILABLE',
        restaurantId: restaurant.id,
      }
    });
  }
  console.log('Default Dining Tables seeded successfully.');


  // 8. Seed Help Categories & Articles
  const helpCategoriesData = [
    { title: 'Getting Started', slug: 'getting-started', icon: 'Rocket', order: 1 },
    { title: 'Orders', slug: 'orders', icon: 'Receipt', order: 2 },
    { title: 'Kitchen', slug: 'kitchen', icon: 'ChefHat', order: 3 },
    { title: 'Checkout & Payments', slug: 'checkout-payments', icon: 'CreditCard', order: 4 },
    { title: 'Settings & Admin', slug: 'settings-admin', icon: 'Settings', order: 5 },
  ];

  const helpCategoriesMap: Record<string, any> = {};
  for (const cat of helpCategoriesData) {
    helpCategoriesMap[cat.slug] = await prisma.helpCategory.upsert({
      where: { slug: cat.slug },
      update: { title: cat.title, icon: cat.icon, order: cat.order },
      create: cat,
    });
  }
  console.log('Help Categories seeded successfully.');

  const helpArticlesData = [
    // ── Getting Started ──────────────────────────────────────────────────
    {
      title: 'Welcome to KhaoPio — A Quick Overview',
      slug: 'welcome-to-khaopio',
      categorySlug: 'getting-started',
      order: 1,
      excerpt: 'Learn what KhaoPio is, who it is for, and how the main modules fit together.',
      roles: [],
      content: `<h2>What is KhaoPio?</h2>
<p>KhaoPio is a cloud-based Point-of-Sale (POS) system built for restaurants. It covers the full dining lifecycle — from seating a guest and taking an order, through kitchen preparation, to payment collection and end-of-day reporting.</p>

<h2>Who uses KhaoPio?</h2>
<p>KhaoPio supports multiple staff roles, each with a tailored view:</p>
<ol>
  <li><strong>Super Admin</strong> — Full access: manages staff, menus, settings, and reports.</li>
  <li><strong>Store Manager</strong> — Manages day-to-day operations, views reports, and handles staff.</li>
  <li><strong>Waiter</strong> — Creates orders, adds items, and requests the bill.</li>
  <li><strong>Cashier</strong> — Processes payments and closes orders.</li>
  <li><strong>Kitchen Chef</strong> — Views incoming orders and updates preparation status.</li>
</ol>

<h2>Main modules</h2>
<p>Navigate the app using the left sidebar. Key sections include:</p>
<ol>
  <li><strong>Orders</strong> — Create and manage table orders.</li>
  <li><strong>Tables</strong> — Monitor table availability and seat guests.</li>
  <li><strong>Kitchen</strong> — Real-time KOT (Kitchen Order Ticket) board.</li>
  <li><strong>Checkout</strong> — Accept payments and apply coupons.</li>
  <li><strong>Reports</strong> — Daily sales summaries and staff activity logs.</li>
  <li><strong>Set Menu</strong> — Manage menu categories and items.</li>
  <li><strong>Staff</strong> — Invite and manage team members.</li>
</ol>`,
    },
    {
      title: 'Logging In for the First Time',
      slug: 'logging-in-first-time',
      categorySlug: 'getting-started',
      order: 2,
      excerpt: 'How Super Admins and staff log in using email/password or a PIN.',
      roles: [],
      content: `<h2>Super Admin & Store Manager login</h2>
<p>Super Admins and Store Managers log in with an <strong>email address and password</strong> on the web or tablet browser. Navigate to your restaurant's KhaoPio URL and enter your credentials.</p>

<h2>Waiter / Cashier / Kitchen PIN login</h2>
<p>Operational staff (Waiters, Cashiers, Kitchen Chefs) use a <strong>4-digit PIN</strong> for quick tablet login. Your PIN is set when the Super Admin or Store Manager invites you:</p>
<ol>
  <li>Open the KhaoPio login screen on the shared tablet.</li>
  <li>Select your name from the staff list.</li>
  <li>Enter your 4-digit PIN and tap <strong>Login</strong>.</li>
</ol>

<h2>Forgot your PIN?</h2>
<p>Contact your Super Admin or Store Manager to reset your PIN. They can update it from the <strong>Staff</strong> section under your profile.</p>`,
    },
    {
      title: 'Inviting New Staff Members',
      slug: 'inviting-staff',
      categorySlug: 'getting-started',
      order: 3,
      excerpt: 'How to invite waiters, cashiers, and kitchen staff to your restaurant.',
      roles: ['SUPER_ADMIN', 'STORE_MANAGER'],
      content: `<h2>Who can invite staff?</h2>
<p>Only <strong>Super Admins</strong> and <strong>Store Managers</strong> can send invitations.</p>

<h2>Steps to invite a new staff member</h2>
<ol>
  <li>Go to <strong>Staff</strong> in the left sidebar.</li>
  <li>Click the <strong>Invite Staff</strong> button in the top-right corner.</li>
  <li>Enter the staff member's name, email, and select their role (Waiter, Cashier, or Kitchen Chef).</li>
  <li>Click <strong>Send Invitation</strong>.</li>
</ol>
<p>The staff member will receive an email with a link to complete registration and set their PIN.</p>

<h2>Managing existing staff</h2>
<p>From the Staff list you can:</p>
<ol>
  <li>Edit a staff member's name or role.</li>
  <li>Deactivate an account to immediately revoke access.</li>
  <li>Delete a staff member permanently.</li>
</ol>`,
    },

    // ── Orders ───────────────────────────────────────────────────────────
    {
      title: 'Creating a New Order',
      slug: 'creating-a-new-order',
      categorySlug: 'orders',
      order: 1,
      excerpt: 'Step-by-step guide to starting a new table order in KhaoPio.',
      roles: [],
      content: `<h2>Starting an order</h2>
<ol>
  <li>Tap <strong>Orders</strong> in the sidebar.</li>
  <li>Click <strong>New Order</strong> (top-right).</li>
  <li>Select the table from the table picker, or leave blank for a takeaway order.</li>
  <li>The order is created in <code>DRAFT</code> status — you can freely add, remove, and adjust items.</li>
</ol>

<h2>Adding items to an order</h2>
<ol>
  <li>With the order open, browse menu categories on the right panel.</li>
  <li>Tap any menu item to add one unit to the order.</li>
  <li>Use the <strong>+</strong> and <strong>−</strong> buttons in the order list to adjust quantities.</li>
  <li>To remove an item entirely, reduce its quantity to zero or tap the trash icon.</li>
</ol>

<h2>Order summary</h2>
<p>The order panel automatically calculates:</p>
<ol>
  <li><strong>Subtotal</strong> — sum of all items.</li>
  <li><strong>Service charge</strong> — configurable percentage (default 5%).</li>
  <li><strong>Tax (GST)</strong> — configurable percentage (default 5%).</li>
  <li><strong>Grand total</strong> — subtotal + service charge + tax − discount.</li>
</ol>`,
    },
    {
      title: 'Sending an Order to the Kitchen (KOT)',
      slug: 'sending-kot',
      categorySlug: 'orders',
      order: 2,
      excerpt: 'How to submit a Kitchen Order Ticket so the chefs can start preparing.',
      roles: ['WAITER', 'CASHIER', 'STORE_MANAGER', 'SUPER_ADMIN'],
      content: `<h2>What is a KOT?</h2>
<p>A <strong>Kitchen Order Ticket (KOT)</strong> is the instruction sent to the kitchen when a waiter finalises the items for a table. Once sent, chefs can see the order on their Kitchen screen.</p>

<h2>How to send to kitchen</h2>
<ol>
  <li>Open the order and confirm all items and quantities are correct.</li>
  <li>Click the <strong>Send to Kitchen</strong> button at the bottom of the order panel.</li>
  <li>The order status changes from <code>DRAFT</code> to <code>KITCHEN_PENDING</code>.</li>
  <li>The kitchen screen immediately shows the new ticket.</li>
</ol>

<h2>Adding more items after the KOT</h2>
<p>You can add further items to an active order at any time:</p>
<ol>
  <li>Open the existing order.</li>
  <li>Add the new items.</li>
  <li>Click <strong>Send to Kitchen</strong> again — only the new items are highlighted as additions.</li>
</ol>

<p><strong>Note:</strong> Once an order is in <code>BILL_REQUESTED</code> or <code>PAID</code> status you cannot add more items.</p>`,
    },
    {
      title: 'Requesting the Bill',
      slug: 'requesting-the-bill',
      categorySlug: 'orders',
      order: 3,
      excerpt: 'How waiters request a bill so the cashier can prepare the invoice.',
      roles: ['WAITER', 'CASHIER', 'STORE_MANAGER', 'SUPER_ADMIN'],
      content: `<h2>When to request a bill</h2>
<p>Request the bill once the guest has finished ordering and is ready to pay. This flags the order to the cashier without closing it.</p>

<h2>Steps</h2>
<ol>
  <li>Open the order from the Orders list.</li>
  <li>Click <strong>Request Bill</strong>.</li>
  <li>The order status moves to <code>BILL_REQUESTED</code>.</li>
  <li>The Cashier sees the order highlighted in the Checkout screen.</li>
</ol>

<h2>What happens next?</h2>
<p>The Cashier reviews the bill, applies any coupon or discount, and processes payment. See the <em>Checkout & Payments</em> section for the full payment flow.</p>`,
    },

    // ── Kitchen ──────────────────────────────────────────────────────────
    {
      title: 'Using the Kitchen Screen',
      slug: 'using-kitchen-screen',
      categorySlug: 'kitchen',
      order: 1,
      excerpt: 'How kitchen staff view incoming orders and update preparation status.',
      roles: ['KITCHEN_CHEF', 'STORE_MANAGER', 'SUPER_ADMIN'],
      content: `<h2>Opening the Kitchen screen</h2>
<p>Navigate to <strong>Kitchen</strong> in the sidebar. This screen is designed to be displayed on a dedicated kitchen tablet or monitor.</p>

<h2>Reading a KOT card</h2>
<p>Each order appears as a card showing:</p>
<ol>
  <li><strong>Order number</strong> and <strong>table name</strong>.</li>
  <li><strong>Time elapsed</strong> since the KOT was received.</li>
  <li>List of items with quantities.</li>
  <li>Current status badge (<code>KITCHEN_PENDING</code>, <code>PREPARING</code>, <code>READY</code>).</li>
</ol>

<h2>Updating order status</h2>
<ol>
  <li>When you start cooking an order, click <strong>Start Preparing</strong> — status becomes <code>PREPARING</code>.</li>
  <li>Once all items are plated and ready, click <strong>Mark Ready</strong> — status becomes <code>READY</code>.</li>
  <li>The waiter is notified and can serve the food to the table.</li>
</ol>

<h2>Tips</h2>
<p>Cards are sorted by time received — oldest orders appear first so nothing is forgotten. The elapsed timer turns <strong>red</strong> after 15 minutes to flag delayed orders.</p>`,
    },
    {
      title: 'Understanding Order Statuses',
      slug: 'order-statuses',
      categorySlug: 'kitchen',
      order: 2,
      excerpt: 'A reference for all order lifecycle statuses in KhaoPio.',
      roles: [],
      content: `<h2>Order status lifecycle</h2>
<p>Every order in KhaoPio moves through the following states:</p>
<ol>
  <li><code>DRAFT</code> — Order created; items still being added by the waiter. Not yet sent to kitchen.</li>
  <li><code>KITCHEN_PENDING</code> — KOT sent; waiting for kitchen to start preparation.</li>
  <li><code>PREPARING</code> — Kitchen has started cooking the order.</li>
  <li><code>READY</code> — All items are prepared and ready to be served.</li>
  <li><code>BILL_REQUESTED</code> — Guest has asked for the bill; awaiting cashier action.</li>
  <li><code>PARTIALLY_PAID</code> — Part of the bill has been paid (split payment in progress).</li>
  <li><code>PAID</code> — Order fully settled; archived.</li>
  <li><code>CANCELLED</code> — Order was cancelled before payment.</li>
</ol>

<h2>Who can change each status?</h2>
<p>Status transitions are role-gated:</p>
<ol>
  <li>Waiter → <code>KITCHEN_PENDING</code> (via Send to Kitchen), <code>BILL_REQUESTED</code> (via Request Bill).</li>
  <li>Kitchen Chef → <code>PREPARING</code>, <code>READY</code>.</li>
  <li>Cashier / Manager → <code>PAID</code>, <code>CANCELLED</code>.</li>
</ol>`,
    },

    // ── Checkout & Payments ──────────────────────────────────────────────
    {
      title: 'Processing a Payment',
      slug: 'processing-payment',
      categorySlug: 'checkout-payments',
      order: 1,
      excerpt: 'Step-by-step guide for cashiers to accept payment and close an order.',
      roles: ['CASHIER', 'STORE_MANAGER', 'SUPER_ADMIN'],
      content: `<h2>Opening Checkout</h2>
<ol>
  <li>Go to <strong>Checkout</strong> in the sidebar.</li>
  <li>Orders in <code>BILL_REQUESTED</code> status appear at the top.</li>
  <li>Click on an order to open the payment panel.</li>
</ol>

<h2>Reviewing the bill</h2>
<p>Verify the subtotal, tax, service charge, and grand total. If a coupon has been applied by the waiter, the discount is shown here.</p>

<h2>Accepting payment</h2>
<ol>
  <li>Select the payment method: <strong>Cash</strong>, <strong>Card</strong>, or <strong>UPI</strong>.</li>
  <li>Enter the amount tendered (for cash, KhaoPio calculates change automatically).</li>
  <li>For Card or UPI, enter the optional transaction reference number.</li>
  <li>Click <strong>Confirm Payment</strong>.</li>
</ol>
<p>The order status changes to <code>PAID</code> and a printable receipt is generated.</p>

<h2>Split payments</h2>
<p>To split a bill across multiple payment methods:</p>
<ol>
  <li>Enter the first partial amount and select the method, then click <strong>Add Payment</strong>.</li>
  <li>Repeat for each split until the full grand total is covered.</li>
  <li>The order moves through <code>PARTIALLY_PAID</code> and finally to <code>PAID</code> once the balance is zero.</li>
</ol>`,
    },
    {
      title: 'Applying Coupons and Discounts',
      slug: 'applying-coupons',
      categorySlug: 'checkout-payments',
      order: 2,
      excerpt: 'How to apply a coupon code during checkout to give guests a discount.',
      roles: ['CASHIER', 'WAITER', 'STORE_MANAGER', 'SUPER_ADMIN'],
      content: `<h2>Where to apply a coupon</h2>
<p>Coupons can be applied from the <strong>Checkout</strong> screen before confirming payment.</p>

<h2>Steps</h2>
<ol>
  <li>Open the order in Checkout.</li>
  <li>Click <strong>Apply Coupon</strong>.</li>
  <li>Type the coupon code (e.g. <code>WELCOME10</code>) and press <strong>Apply</strong>.</li>
  <li>If valid, the discount is deducted from the grand total instantly.</li>
</ol>

<h2>Coupon validation rules</h2>
<p>A coupon will be rejected if:</p>
<ol>
  <li>The code does not exist or is inactive.</li>
  <li>Today's date is outside the coupon's start/end window.</li>
  <li>The order subtotal is below the coupon's minimum subtotal requirement.</li>
</ol>

<h2>Removing a coupon</h2>
<p>Click the <strong>×</strong> icon next to the applied coupon to remove it before confirming payment.</p>`,
    },

    // ── Settings & Admin ─────────────────────────────────────────────────
    {
      title: 'Configuring Restaurant Settings',
      slug: 'restaurant-settings',
      categorySlug: 'settings-admin',
      order: 1,
      excerpt: 'How to update your restaurant name, tax rates, service charge, and branding.',
      roles: ['SUPER_ADMIN', 'STORE_MANAGER'],
      content: `<h2>Accessing Settings</h2>
<p>Go to <strong>Settings</strong> (gear icon, bottom of sidebar). Only Super Admins and Store Managers can modify restaurant settings.</p>

<h2>General information</h2>
<ol>
  <li><strong>Restaurant Name</strong> — Displayed on receipts and invoices.</li>
  <li><strong>Address & Phone</strong> — Printed on customer receipts.</li>
  <li><strong>GSTIN</strong> — Your GST Identification Number for tax compliance.</li>
  <li><strong>Logo</strong> — Upload a PNG or JPEG; appears on the dashboard header and receipts.</li>
  <li><strong>Thank-you Message</strong> — Shown at the bottom of every printed receipt.</li>
</ol>

<h2>Tax and charges</h2>
<ol>
  <li><strong>Default Tax Rate (%)</strong> — Applied to every new order (default: 5%).</li>
  <li><strong>Default Service Charge (%)</strong> — Applied to every new order (default: 5%).</li>
</ol>
<p>Changes affect new orders only; existing orders retain the rates captured at the time of creation.</p>

<h2>Currency</h2>
<p>Select your currency (default: INR). This affects how prices are displayed throughout the app.</p>`,
    },
    {
      title: 'Managing the Menu',
      slug: 'managing-the-menu',
      categorySlug: 'settings-admin',
      order: 2,
      excerpt: 'How to add, edit, and organise menu categories and items.',
      roles: ['SUPER_ADMIN', 'STORE_MANAGER'],
      content: `<h2>Opening the Menu editor</h2>
<p>Navigate to <strong>Set Menu</strong> in the sidebar.</p>

<h2>Adding a category</h2>
<ol>
  <li>Click <strong>Add Category</strong>.</li>
  <li>Enter a category name (e.g. <em>Starters</em>, <em>Mains</em>, <em>Desserts</em>).</li>
  <li>Click <strong>Save</strong>.</li>
</ol>

<h2>Adding a menu item</h2>
<ol>
  <li>Select the category you want to add the item to.</li>
  <li>Click <strong>Add Item</strong>.</li>
  <li>Fill in the fields:
    <ol>
      <li><strong>Name</strong> — Display name on the POS screen and receipts.</li>
      <li><strong>Code</strong> — Short alphanumeric code unique to the restaurant (e.g. <code>B01</code>).</li>
      <li><strong>Price</strong> — In your restaurant's configured currency.</li>
      <li><strong>Description</strong> (optional) — Shown to waiters on hover.</li>
      <li><strong>Image / Emoji</strong> (optional) — Visual aid for staff.</li>
      <li><strong>Available</strong> — Toggle off to temporarily hide the item from the POS without deleting it.</li>
    </ol>
  </li>
  <li>Click <strong>Save Item</strong>.</li>
</ol>

<h2>Editing and deleting items</h2>
<p>Click the pencil icon on any item to edit. Click the trash icon to permanently delete it. <strong>Deleting an item does not affect historical order records</strong> — item name and price are stored as snapshots on the <code>OrderItem</code> record.</p>`,
    },
  ];

  for (const article of helpArticlesData) {
    const categoryId = helpCategoriesMap[article.categorySlug].id;
    await prisma.helpArticle.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        content: article.content,
        excerpt: article.excerpt ?? null,
        categoryId,
        roles: article.roles,
        order: article.order,
      },
      create: {
        title: article.title,
        slug: article.slug,
        content: article.content,
        excerpt: article.excerpt ?? null,
        categoryId,
        roles: article.roles,
        order: article.order,
      },
    });
  }
  console.log('Help Articles seeded successfully.');

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
