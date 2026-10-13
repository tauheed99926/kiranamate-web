# 🏪 KiranaMate — Complete Kirana Shop Management Web Application

KiranaMate is a full-stack, production-style retail POS and inventory management web application tailored specifically for Indian kirana stores, grocery shops, and small retail businesses.

Built with **React (TypeScript) + Vite + Tailwind CSS**, **Node.js (Express + TypeScript)**, and **Prisma ORM with SQLite**.

---

## ✨ Features

- **⚡ Fast POS Billing**:
  - Live product search & quick cart addition.
  - Hardware USB / Bluetooth barcode scanner auto-detection.
  - Live camera barcode scanning with torch toggle and audio beep confirmation.
  - Decimal quantity support (e.g. 1.25 kg sugar, 0.5 L oil).
  - Item-level & bill-level discount management.
  - Configurable GST calculation (Tax-Inclusive / Tax-Exclusive).
  - Payment modes: **Cash** (with cash tendered & change calculation), **UPI**, **Card**, and **Split Payment**.
  - One-click **Thermal Receipt (80mm / 58mm)** and **Tax Invoice (A4)** printing.
  - Atomic database transactions with immediate stock deduction.
- **📷 Real Barcode Scanner**:
  - Device camera scanner supporting EAN-13, EAN-8, UPC-A, Code 128, and QR codes.
  - Rear camera preferred on mobile devices.
  - Flashlight/torch toggle when supported.
  - Audio confirmation beep via Web Audio API.
  - Automatic prompt to register unknown barcodes.
- **📦 Products & Inventory Management**:
  - Full catalog CRUD with barcode, SKU, category, brand, purchase cost, selling price, and MRP.
  - Decimal weight & volume units: `piece`, `packet`, `kg`, `gm`, `litre`, `ml`, `box`.
  - Manual stock adjustments (Add, Deduct, Set exact) with audit reason logging.
  - Full stock movement audit trail for every purchase, sale, cancellation, or adjustment.
  - Import products from CSV & Export products to CSV.
  - Duplicate barcode warnings and safeguards.
- **🧾 Sales History & Returns**:
  - Search by invoice number, customer name, date range, or payment mode.
  - Reprint thermal receipts or full tax invoices anytime.
  - Complete bill cancellation with automatic stock restoration.
  - Itemized customer returns with refund calculation and stock replenishment.
- **🚚 Restocking & Purchases**:
  - Multi-item supplier purchase orders.
  - Automatic inventory increment upon purchase confirmation.
  - Wholesale cost tracking.
- **⚠️ Low-Stock & Expiry Alerts**:
  - Real-time alerts for out-of-stock and low-stock items.
  - Near-expiry (within 30 days) and expired item alerts.
  - Smart suggested reorder quantities.
  - One-click restock navigation.
- **📊 Reports & Business Analytics**:
  - Today's sales, bill count, and gross profit estimate.
  - Recharts visual graphs for 7-day and 30-day sales trends.
  - Category-wise revenue pie chart.
  - Payment method distribution bar chart.
  - Export reports to CSV.
- **👥 Customers & Suppliers**:
  - Customer directory with lifetime spend tracking and visit counters.
  - Supplier directory with contact details and purchase histories.
- **⚙️ Store Settings & Data Safety**:
  - Store profile (Shop name, owner, phone, address, GSTIN, invoice prefix).
  - Negative stock prevention toggle.
  - One-click SQLite database backup download (`kiranamate-backup.db`).
  - Safe database restore with automatic pre-restore safety copy.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, Html5Qrcode |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, JWT, BcryptJS, Multer |
| **Database** | SQLite (`server/data/kiranamate.db`) |
| **Currency & Time** | Indian Rupee (`₹`), Asia/Kolkata (IST) formatting |

---

## 🚀 Quick Start Guide (Windows)

### Prerequisites
- Node.js (v18 or higher) and npm installed.

### 1. Installation
Clone or navigate to the `kiranamate-web` directory:
```powershell
cd kiranamate-web

# Install root, backend, and frontend packages:
npm run install:all
```

### 2. Setup Database & Seed Demo Data
Initialize the SQLite database and seed 20 authentic Indian Kirana products (Atta, Dal, Mustard Oil, Maggi, Parle-G, Tata Salt, etc. with valid retail barcodes):
```powershell
npm run db:setup
```

### 3. Start Both Backend & Frontend
Run both servers with a single command:
```powershell
npm run dev
```

The application will be live at:
- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)

---

## 🔑 Demo Login Credentials

If you ran `npm run db:setup`:
- **Username**: `admin`
- **Password**: `admin123`

*(If you start with an empty database, KiranaMate automatically displays the **First-Run Setup Wizard** to configure your store name, owner, GSTIN, and password).*

---

## 📱 How to Test Barcode Scanning on Your Phone

Vite runs in host mode, allowing devices on your local Wi-Fi network to access the web app:

1. Connect your mobile phone to the **same Wi-Fi network** as your PC.
2. Find your PC's local IP address (printed in the terminal by Vite, e.g. `http://192.168.0.100:5173`).
3. Open Chrome or Safari on your phone and navigate to `http://<your-pc-ip>:5173`.
4. Log in and tap **Scan Barcode** or open the scanner in **POS Billing**.
5. Grant camera permission when prompted.
6. Point your phone's camera at any product barcode (e.g. Maggi `8901058852331`, Tata Salt `8904004400275`, or Parle-G `8901719101017`).
7. Hear the confirmation beep and watch the product appear on screen instantly!

> **Note on Browser Camera Permissions**: Browsers enforce camera access only over `localhost` or `https`. When testing from a phone IP over plain HTTP, if Chrome blocks the camera, go to `chrome://flags/#unsafely-treat-insecure-origin-as-secure` on mobile Chrome, add `http://<your-pc-ip>:5173`, enable it, and relaunch Chrome.

---

## 🧪 Automated Testing

KiranaMate includes an automated end-to-end test suite verifying all 15 acceptance criteria:

```powershell
# Run the test suite:
npm test
```

Tests verify:
- Authentication & private route protection.
- Product creation with barcode & fast barcode lookup.
- POS billing & atomic inventory deduction.
- Cash change return calculations.
- Over-ordering & insufficient stock prevention.
- Bill cancellation & inventory restoration.
- Real-time stock alerts & dashboard calculations.

---

## 💾 Database Backup & Restore

### Backup
1. Go to **Settings & Backup** in the sidebar.
2. Under **Database Backup & Safety Restore**, click **Download kiranamate-backup.db**.
3. A timestamped copy of your entire SQLite database is saved to your computer.

### Safe Restore
1. In **Settings & Backup**, choose a valid `.db` file.
2. Click **Restore Database**.
3. KiranaMate verifies the SQLite file signature, creates an automatic safety copy of your current data (`server/data/kiranamate.db.pre-restore-<timestamp>`), and restores the database.

---

## 📤 How to Push to a New GitHub Repository

To upload this clean project to your own GitHub account:

1. Create a new empty repository on [GitHub](https://github.com/new) (e.g. `kiranamate-web`).
2. Open PowerShell in `kiranamate-web`:
```powershell
cd kiranamate-web
git init
git add .
git commit -m "feat: complete KiranaMate web application with POS and barcode scanner"
git branch -M main
git remote add origin https://github.com/<your-username>/kiranamate-web.git
git push -u origin main
```
*(All `node_modules`, build files, and local databases are cleanly excluded by `.gitignore`).*
