# KhaoPio Restaurant POS - Frontend

This is the frontend client for the **KhaoPio Restaurant POS (Point of Sale)** system. It is a modern, high-performance web application built with **React 19**, **Next.js 16 (App Router)**, **Tailwind CSS v4**, and **Zustand** for state management.

## Features

- **Staff Authentication**:
  - Initial Administrator Registration (`/register-admin`)
  - Admin/Manager Email-Password Login (`/login`)
  - Quick PIN-based Login screen for active staff members (Waiters, Chefs, Cashiers)
  - Interactive onboarding for invited staff members (`/accept-invite`)
- **Ordering System (KOT)**:
  - Table-based menu browsing and order cart
  - Multi-category navigation (e.g. Appetizers, Mains, Desserts, Beverages)
  - Real-time cart calculations using `big.js` to ensure floating-point precision
  - Quick KOT (Kitchen Order Ticket) dispatching
- **Kitchen View**:
  - Live status board showing active kitchen orders
  - Interactive order state management (marking items as preparing, completed, or served)
- **Billing & Checkout**:
  - Live billing overview with pending bill requests
  - Payment options selection (Cash, Card, UPI)
  - Clean printed-receipt invoice style with automatic confetti animations on successful payment
- **Staff & Menu Administration**:
  - Manage restaurant categories and menu items
  - Manage staff roles (Admin, Waiter, Chef, Cashier) and invite new staff via email invitation links

## Prerequisites

- **Node.js**: Version 18.x or 20.x (Recommended: Node 20+)
- **Running Backend API**: Ensure the [KhaoPio Backend](../backend/README.md) is running.

## Getting Started

### 1. Clone the repository and navigate to frontend directory
```bash
cd frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root of the `frontend` directory:
```env
# Backend API Base URL
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```
*(You can use `.env.example` as a template)*

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### 5. Build for Production
```bash
npm run build
npm start
```

---

## State Management

The application uses **Zustand** for lightweight and reactive global state management:
1. **`useAuthStore`** ([store/useAuthStore.ts](file:///c:/Users/ASUS/Desktop/invoice-resturant/frontend/src/store/useAuthStore.ts)):
   - Manages the active user's session, JWT token, and role permissions.
   - Handles PIN login cache and automatic logs out when token expires.
2. **`usePOSStore`** ([store/usePOSStore.ts](file:///c:/Users/ASUS/Desktop/invoice-resturant/frontend/src/store/usePOSStore.ts)):
   - Coordinates active orders, selected tables, cart modifications, and kitchen status updates.

---

## Directory Structure

```
frontend/
├── public/               # Static assets (images, icons)
├── src/
│   ├── app/              # Next.js App Router Pages
│   │   ├── (pos)/        # POS Shell (Authenticated layout)
│   │   │   ├── billing/  # Cashier Billing and checkout panel
│   │   │   ├── checkout/ # Payment screen
│   │   │   ├── kitchen/  # Chef live status board
│   │   │   ├── menu/     # Admin menu item editor
│   │   │   ├── staff/    # Admin staff invitation control
│   │   │   └── layout.tsx# Shared POS navbar / sidebar layout
│   │   ├── login/        # Sign-in panel (Email + PIN list)
│   │   ├── register-admin/ # Master Admin onboarding
│   │   ├── accept-invite/# Onboarding from staff email invite links
│   │   ├── globals.css   # Tailwind configuration & global styles
│   │   └── layout.tsx    # Root Next.js layout template
│   ├── store/            # Zustand global stores
│   ├── types/            # TypeScript interfaces & types
│   └── utils/            # Shared utilities (Centred apiFetch wrapper)
├── tsconfig.json         # TypeScript configuration
└── package.json          # Node dependencies and scripts
```
