# KhaoPio Restaurant POS - Backend

This is the backend API for the **KhaoPio Restaurant POS (Point of Sale)** system. It is built using Node.js, Express, TypeScript, and Prisma ORM, connected to a PostgreSQL database.

## Features

- **Authentication & Authorization**:
  - Secure Admin Registration and Login
  - JWT Token Authentication
  - Staff Invitation workflow (via email using Mailgun/Nodemailer)
  - Staff PIN-based Login (for quick access at restaurant terminals)
  - Role-Based Access Control (RBAC) with granular permissions
- **Menu & Inventory Management**:
  - CRUD operations for Categories and Menu Items
  - Controlled access based on administrative roles
- **Ordering Workflow (KOT & Billing)**:
  - Create Kitchen Order Tickets (KOT)
  - Live tracking of active orders
  - Order status updates (e.g., preparation, completed)
  - Bill requests and Invoice payment processing
- **Dynamic Navigation**:
  - Fetch dynamic sidebar links matching the logged-in staff role's permissions

## Prerequisites

- **Node.js**: Version 18.x or 20.x
- **PostgreSQL**: Local database or a cloud instance (e.g., Neon)
- **Mailgun**: For sending email invitation links

## Getting Started

### 1. Clone the repository and navigate to backend directory
```bash
cd backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root of the `backend` directory:
```env
# Database connection string
DATABASE_URL="postgresql://username:password@host:port/dbname?sslmode=require"

# Application Configuration
PORT=5000

# Mailgun Configuration (Email Invitation)
EMAIL_API_KEY="your-mailgun-api-key"
MAILGUN_DOMAIN="your-mailgun-sandbox-domain"
MAILGUN_API_URL="https://api.mailgun.net"

# Frontend Client URL
FRONTEND_URL="http://localhost:3000"

# Authentication Configuration
JWT_SECRET="your-jwt-secret-key"
```

### 4. Database Setup & Migrations
Generate the Prisma Client and run the database migrations:
```bash
# Generate Prisma Client code
npm run prisma:generate

# Run migrations to set up schema in PostgreSQL
npm run prisma:migrate
```

### 5. Seed the Database
Seed the database with default roles, permissions, categories, and initial data:
```bash
npm run prisma:seed
```

### 6. Start the Server
Start the development server with live reloading:
```bash
npm run dev
```
For production build and start:
```bash
npm run build
npm start
```

---

## API Documentation

### Authentication `/api/auth`
| Method | Endpoint | Description | Auth Required | Permissions |
|--------|----------|-------------|---------------|-------------|
| `POST` | `/register-admin` | Registers the initial Admin user | No | - |
| `POST` | `/login` | Admin/Standard email-password login | No | - |
| `GET`  | `/staff` | Public list of staff members for PIN-login screen | No | - |
| `POST` | `/pin-login` | Quick access PIN login for staff | No | - |
| `POST` | `/invite` | Invites a new staff member via email | Yes | `invite:staff` |
| `GET`  | `/invitation/:token` | Verifies the validity of an email invitation token | No | - |
| `POST` | `/accept-invite` | Creates the staff account from an accepted invitation | No | - |
| `GET`  | `/admin/users` | List all users | Yes | `view:staff` |
| `PATCH`| `/admin/users/:id` | Update a staff user's status/role | Yes | `update:staff` |
| `DELETE`| `/admin/users/:id` | Delete a user | Yes | `delete:staff` |

### Menu Management `/api/menu`
| Method | Endpoint | Description | Auth Required | Permissions |
|--------|----------|-------------|---------------|-------------|
| `GET`  | `/` | Retrieves the entire menu structure (Categories & Items) | Yes | Logged in |
| `POST` | `/categories` | Creates a new category | Yes | `view:staff` (Admin) |
| `PATCH`| `/categories/:id` | Updates a category name/metadata | Yes | `view:staff` (Admin) |
| `DELETE`| `/categories/:id` | Deletes a category | Yes | `view:staff` (Admin) |
| `POST` | `/items` | Creates a new menu item | Yes | `view:staff` (Admin) |
| `PATCH`| `/items/:id` | Updates a menu item's price, status, or details | Yes | `view:staff` (Admin) |
| `DELETE`| `/items/:id` | Deletes a menu item | Yes | `view:staff` (Admin) |

### Orders & KOT `/api/orders`
| Method | Endpoint | Description | Auth Required | Permissions |
|--------|----------|-------------|---------------|-------------|
| `POST` | `/kitchen` | Submits a KOT (Kitchen Order Ticket) to send to the kitchen | Yes | `create:kot` |
| `GET`  | `/active` | Fetches active kitchen or POS orders | Yes | `view:orders` |
| `PATCH`| `/:id/status` | Updates order state (e.g. cooking, ready, served) | Yes | `update:order-status` |
| `POST` | `/:id/request-bill` | Requests the final bill invoice for a table | Yes | `request:bill` |
| `POST` | `/:id/pay` | Marks the order as paid and closes it | Yes | `pay:order` |

### Dynamic Navigation `/api/navigation`
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/` | Fetches the sidebar modules the user is allowed to access | Yes |

---

## Directory Structure

```
backend/
├── prisma/               # Prisma schema and seed scripts
│   ├── schema.prisma     # Database models and relations
│   └── seed.ts           # DB Seeder script
├── src/
│   ├── controllers/      # Route request/response handlers
│   ├── middlewares/      # Express middlewares (auth, guards)
│   ├── routes/           # Express routes mapping endpoints
│   ├── services/         # Business logic layer
│   ├── types/            # TypeScript definitions/interfaces
│   ├── index.ts          # Express Application entrypoint
│   └── prisma.ts         # Prisma Client instantiator
├── tsconfig.json         # TypeScript configuration
└── package.json          # Node dependencies and scripts
```
