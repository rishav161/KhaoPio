# KhaoPio - Restaurant POS System

Welcome to **KhaoPio**, a modern, high-performance, and feature-rich **Restaurant Point of Sale (POS)** system. This repository is structured as a monorepo containing both the frontend client and the backend server.

## Repository Structure

- **[backend/](file:///c:/Users/ASUS/Desktop/invoice-resturant/backend/README.md)**: Node.js, Express, TypeScript, and Prisma ORM connected to PostgreSQL. Includes authentication (JWT, staff PINs), staff email invitations, order/KOT workflows, and menu management.
- **[frontend/](file:///c:/Users/ASUS/Desktop/invoice-resturant/frontend/README.md)**: Next.js 16 (App Router), React 19, Tailwind CSS v4, and Zustand. Features a full ordering cart, dynamic sidebar navigation matching staff permissions, live kitchen monitor, and cashier billing with interactive payment invoices.

---

## Tech Stack Overview

| Component | Key Technologies |
|---|---|
| **Frontend** | React 19, Next.js 16 (App Router), Tailwind CSS v4, Zustand, Lucide React, Big.js |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, JSON Web Tokens (JWT), Bcrypt.js, Nodemailer |
| **Database** | PostgreSQL (Hosted on Neon) |

---

## Quick Start

### 1. Database & Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the `.env` file (see [backend/.env.example](file:///c:/Users/ASUS/Desktop/invoice-resturant/backend/.env.example) for reference).
4. Run migrations and seed the database:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```
5. Start the API server in development mode:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the `.env.local` file (see [frontend/.env.example](file:///c:/Users/ASUS/Desktop/invoice-resturant/frontend/.env.example) for reference).
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) to access the application.

---

## Roles and Permissions Model

KhaoPio implements a granular Role-Based Access Control (RBAC) system supporting:
- **Admin**: Full access to dashboard, menu management, and staff management (including sending invitations).
- **Waiter**: Permissions to browse the menu, create/manage tables, and submit KOTs (Kitchen Order Tickets) to the kitchen.
- **Chef**: Access to the live kitchen view, updating cooking progress, and preparing tickets.
- **Cashier**: Access to checkout view, generating billing invoices, and processing payments.

Detailed setup and documentation are available in the individual folder READMEs:
- **[Backend Readme](file:///c:/Users/ASUS/Desktop/invoice-resturant/backend/README.md)**
- **[Frontend Readme](file:///c:/Users/ASUS/Desktop/invoice-resturant/frontend/README.md)**
