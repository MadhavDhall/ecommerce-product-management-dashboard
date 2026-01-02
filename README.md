# Dhall Ecom

A role-based company dashboard for managing **products, inventory, users, and analytics** — all in one place.

Dhall Ecom allows companies to register, create a private dashboard, onboard team members with granular permissions, and visualize business performance through clean and interactive analytics.

---

## 🌐 Live Demo

👉 **Live Website:** _[Add working deployment link here]_

---

## ✨ Features

### 🏢 Company-Based Architecture
- Each company gets its **own isolated dashboard**
- Secure, multi-user environment per company

### 👑 Owner & Role-Based Access
- Company **Owner** can:
  - Add / remove users
  - Assign permissions
  - Manage company-level data

### 🔐 Permission System
Each user can have any combination of the following permissions:
- **manageProducts** → Add, update, delete products
- **manageInventory** → Manage product stock levels
- **manageUsers** → Add users, update permissions, remove users

Users without permissions can still:
- View products
- View inventory details
- View analytics and reports

### 📦 Product Management
- Add, edit, and delete products
- Product images uploaded via Cloudinary

### 📊 Inventory Management
- Track real-time stock
- Automatic inventory updates
- Low-stock and out-of-stock handling

### 📈 Analytics Dashboard
- Revenue trends
- Orders over time
- Product-level performance
- Inventory movement
- Interactive charts and clean UI

---

## 🧱 Tech Stack

### Frontend & Backend
- **Next.js** (App Router)

### Data Fetching
- **SWR**

### Form Validation
- **Zod**

### Data Visualization
- **Chart.js**

### Image Storage
- **Cloudinary**

### Database
- **PostgreSQL**
- **Supabase**

---

## 🔄 Application Flow

1. Company owner signs up and registers a company
2. A private dashboard is created for the company
3. Owner adds users and assigns permissions
4. Users operate within assigned permissions
5. Analytics available for company and products

---

## 🧪 Dummy Credentials (For Testing)

### 👑 Owner
- **Email:** owner@dhallecom.com  
- **Password:** owner123  
- **Permissions:** All permissions enabled

---

### 👤 Product Manager
- **Email:** products@dhallecom.com  
- **Password:** product123  
- **Permissions:**
  - manageProducts ✅
  - manageInventory ❌
  - manageUsers ❌

---

### 👤 Inventory Manager
- **Email:** inventory@dhallecom.com  
- **Password:** inventory123  
- **Permissions:**
  - manageProducts ❌
  - manageInventory ✅
  - manageUsers ❌

---

### 👤 Admin Assistant
- **Email:** admin@dhallecom.com  
- **Password:** admin123  
- **Permissions:**
  - manageProducts ✅
  - manageInventory ✅
  - manageUsers ❌

---

### 👤 Viewer
- **Email:** viewer@dhallecom.com  
- **Password:** viewer123  
- **Permissions:**
  - View-only access

---

## 🚀 Local Development Setup

```bash
git clone https://github.com/your-username/dhall-ecom.git
cd dhall-ecom
npm install
npm run dev
