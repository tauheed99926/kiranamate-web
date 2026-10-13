/**
 * KiranaMate SQLite to PostgreSQL Migration Tool
 * 
 * Safely transfers all records from local SQLite (kiranamate.db) to production PostgreSQL (Neon).
 * - Preserves existing shops, users, bcrypt password hashes, categories, products, bills, customers, suppliers, and stock audit history.
 * - 100% idempotent: uses upserts by primary key so running multiple times will not duplicate records.
 * - Does NOT modify or delete the source SQLite database.
 */

import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import { PrismaClient } from '@prisma/client';

function getSqlitePath(): string {
  const candidates = [
    path.resolve(__dirname, '../../prisma/data/kiranamate.db'),
    path.resolve(__dirname, '../../data/kiranamate.db'),
    path.resolve(process.cwd(), 'prisma/data/kiranamate.db'),
    path.resolve(process.cwd(), 'data/kiranamate.db'),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`SQLite database not found. Checked: \n${candidates.join('\n')}`);
  }
  return found;
}

function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseBoolean(val: any): boolean {
  return val === 1 || val === true || val === '1' || val === 'true';
}

async function run() {
  console.log('================================================================');
  console.log('    KiranaMate: SQLite -> PostgreSQL Data Migration Tool       ');
  console.log('================================================================\n');

  // 1. Locate SQLite DB
  const sqlitePath = getSqlitePath();
  console.log(`[1/4] Found source SQLite database at:\n      ${sqlitePath}`);

  // 2. Identify Target PostgreSQL URL
  let targetUrl = process.env.TARGET_DATABASE_URL;

  // Check command line args (e.g., npm run db:transfer-to-postgres -- "postgresql://...")
  const argUrl = process.argv.slice(2).find((arg) => arg.startsWith('postgres://') || arg.startsWith('postgresql://'));
  if (argUrl) {
    targetUrl = argUrl;
  }

  // Fallback to DATABASE_URL if it is a postgres URL
  if (!targetUrl && process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))) {
    targetUrl = process.env.DATABASE_URL;
  }

  if (!targetUrl) {
    console.error('\n[ERROR] Missing PostgreSQL Connection URL.');
    console.error('\nPlease provide your Neon PostgreSQL URL in one of the following ways:');
    console.error('  1. Command line argument:');
    console.error('     npm run db:transfer-to-postgres -- "postgresql://user:pass@host/db?sslmode=require"');
    console.error('  2. Environment variable:');
    console.error('     $env:TARGET_DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"; npm run db:transfer-to-postgres');
    process.exit(1);
  }

  // Mask credentials for display
  const maskedUrl = targetUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
  console.log(`\n[2/4] Target PostgreSQL Database:\n      ${maskedUrl}`);

  // 3. Connect to SQLite
  const sqlite = new DatabaseSync(sqlitePath);

  // 4. Connect to Target PostgreSQL
  const pgPrisma = new PrismaClient({
    datasources: {
      db: { url: targetUrl },
    },
  });

  try {
    await pgPrisma.$connect();
    console.log('\n[3/4] Successfully connected to target PostgreSQL database.');
  } catch (err: any) {
    console.error('\n[ERROR] Failed to connect to target PostgreSQL database:');
    console.error(err.message);
    process.exit(1);
  }

  console.log('\n[4/4] Starting data migration in foreign key order...\n');

  const stats: { table: string; source: number; migrated: number }[] = [];

  try {
    // 1. Shop
    const shops = sqlite.prepare('SELECT * FROM "Shop"').all() as any[];
    let shopCount = 0;
    for (const s of shops) {
      await pgPrisma.shop.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          name: s.name,
          ownerName: s.ownerName,
          phone: s.phone,
          address: s.address,
          gstin: s.gstin,
          logoUrl: s.logoUrl,
          currency: s.currency || 'INR',
          invoicePrefix: s.invoicePrefix || 'INV-',
          createdAt: parseDate(s.createdAt) || new Date(),
          updatedAt: parseDate(s.updatedAt) || new Date(),
        },
      });
      shopCount++;
    }
    stats.push({ table: 'Shop', source: shops.length, migrated: shopCount });

    // 2. ShopSetting
    const settings = sqlite.prepare('SELECT * FROM "ShopSetting"').all() as any[];
    let settingCount = 0;
    for (const st of settings) {
      await pgPrisma.shopSetting.upsert({
        where: { id: st.id },
        update: {},
        create: {
          id: st.id,
          shopId: st.shopId,
          taxEnabled: parseBoolean(st.taxEnabled),
          defaultGstRate: Number(st.defaultGstRate || 0),
          taxInclusive: parseBoolean(st.taxInclusive),
          allowNegativeStock: parseBoolean(st.allowNegativeStock),
          lowStockDefault: Number(st.lowStockDefault || 5),
          thermalPrinterWidth: st.thermalPrinterWidth || '80mm',
          createdAt: parseDate(st.createdAt) || new Date(),
          updatedAt: parseDate(st.updatedAt) || new Date(),
        },
      });
      settingCount++;
    }
    stats.push({ table: 'ShopSetting', source: settings.length, migrated: settingCount });

    // 3. User
    const users = sqlite.prepare('SELECT * FROM "User"').all() as any[];
    let userCount = 0;
    for (const u of users) {
      await pgPrisma.user.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          shopId: u.shopId,
          username: u.username,
          name: u.name,
          passwordHash: u.passwordHash, // preserves existing bcrypt password hash
          role: u.role || 'OWNER',
          createdAt: parseDate(u.createdAt) || new Date(),
          updatedAt: parseDate(u.updatedAt) || new Date(),
        },
      });
      userCount++;
    }
    stats.push({ table: 'User', source: users.length, migrated: userCount });

    // 4. Category
    const categories = sqlite.prepare('SELECT * FROM "Category"').all() as any[];
    let catCount = 0;
    for (const c of categories) {
      await pgPrisma.category.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          shopId: c.shopId,
          name: c.name,
          description: c.description,
          createdAt: parseDate(c.createdAt) || new Date(),
          updatedAt: parseDate(c.updatedAt) || new Date(),
        },
      });
      catCount++;
    }
    stats.push({ table: 'Category', source: categories.length, migrated: catCount });

    // 5. Supplier
    const suppliers = sqlite.prepare('SELECT * FROM "Supplier"').all() as any[];
    let suppCount = 0;
    for (const sup of suppliers) {
      await pgPrisma.supplier.upsert({
        where: { id: sup.id },
        update: {},
        create: {
          id: sup.id,
          shopId: sup.shopId,
          name: sup.name,
          phone: sup.phone,
          email: sup.email,
          address: sup.address,
          gstin: sup.gstin,
          createdAt: parseDate(sup.createdAt) || new Date(),
          updatedAt: parseDate(sup.updatedAt) || new Date(),
        },
      });
      suppCount++;
    }
    stats.push({ table: 'Supplier', source: suppliers.length, migrated: suppCount });

    // 6. Customer
    const customers = sqlite.prepare('SELECT * FROM "Customer"').all() as any[];
    let custCount = 0;
    for (const cust of customers) {
      await pgPrisma.customer.upsert({
        where: { id: cust.id },
        update: {},
        create: {
          id: cust.id,
          shopId: cust.shopId,
          name: cust.name,
          phone: cust.phone,
          email: cust.email,
          address: cust.address,
          totalSpent: Number(cust.totalSpent || 0),
          visitCount: Number(cust.visitCount || 0),
          lastPurchaseDate: parseDate(cust.lastPurchaseDate),
          createdAt: parseDate(cust.createdAt) || new Date(),
          updatedAt: parseDate(cust.updatedAt) || new Date(),
        },
      });
      custCount++;
    }
    stats.push({ table: 'Customer', source: customers.length, migrated: custCount });

    // 7. Product
    const products = sqlite.prepare('SELECT * FROM "Product"').all() as any[];
    let prodCount = 0;
    for (const p of products) {
      await pgPrisma.product.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          shopId: p.shopId,
          categoryId: p.categoryId,
          name: p.name,
          barcode: p.barcode,
          sku: p.sku,
          brand: p.brand,
          purchaseCost: Number(p.purchaseCost || 0),
          sellingPrice: Number(p.sellingPrice || 0),
          mrp: p.mrp ? Number(p.mrp) : null,
          stockQuantity: Number(p.stockQuantity || 0),
          lowStockThreshold: Number(p.lowStockThreshold || 5),
          unit: p.unit || 'piece',
          supplierId: p.supplierId,
          expiryDate: parseDate(p.expiryDate),
          description: p.description,
          createdAt: parseDate(p.createdAt) || new Date(),
          updatedAt: parseDate(p.updatedAt) || new Date(),
        },
      });
      prodCount++;
    }
    stats.push({ table: 'Product', source: products.length, migrated: prodCount });

    // 8. Purchase
    const purchases = sqlite.prepare('SELECT * FROM "Purchase"').all() as any[];
    let purchCount = 0;
    for (const pur of purchases) {
      await pgPrisma.purchase.upsert({
        where: { id: pur.id },
        update: {},
        create: {
          id: pur.id,
          shopId: pur.shopId,
          supplierId: pur.supplierId,
          invoiceNumber: pur.invoiceNumber,
          totalAmount: Number(pur.totalAmount || 0),
          notes: pur.notes,
          purchaseDate: parseDate(pur.purchaseDate) || new Date(),
          createdAt: parseDate(pur.createdAt) || new Date(),
          updatedAt: parseDate(pur.updatedAt) || new Date(),
        },
      });
      purchCount++;
    }
    stats.push({ table: 'Purchase', source: purchases.length, migrated: purchCount });

    // 9. PurchaseItem
    const purchaseItems = sqlite.prepare('SELECT * FROM "PurchaseItem"').all() as any[];
    let purchItemCount = 0;
    for (const pi of purchaseItems) {
      await pgPrisma.purchaseItem.upsert({
        where: { id: pi.id },
        update: {},
        create: {
          id: pi.id,
          purchaseId: pi.purchaseId,
          productId: pi.productId,
          quantity: Number(pi.quantity || 0),
          unitCost: Number(pi.unitCost || 0),
          total: Number(pi.total || 0),
        },
      });
      purchItemCount++;
    }
    stats.push({ table: 'PurchaseItem', source: purchaseItems.length, migrated: purchItemCount });

    // 10. Sale
    const sales = sqlite.prepare('SELECT * FROM "Sale"').all() as any[];
    let saleCount = 0;
    for (const s of sales) {
      await pgPrisma.sale.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          shopId: s.shopId,
          invoiceNumber: s.invoiceNumber,
          customerId: s.customerId,
          customerName: s.customerName,
          customerPhone: s.customerPhone,
          subtotal: Number(s.subtotal || 0),
          discountTotal: Number(s.discountTotal || 0),
          taxTotal: Number(s.taxTotal || 0),
          grandTotal: Number(s.grandTotal || 0),
          paymentMethod: s.paymentMethod || 'CASH',
          paymentStatus: s.paymentStatus || 'PAID',
          cashTendered: s.cashTendered ? Number(s.cashTendered) : null,
          changeGiven: s.changeGiven ? Number(s.changeGiven) : null,
          notes: s.notes,
          status: s.status || 'COMPLETED',
          createdAt: parseDate(s.createdAt) || new Date(),
          updatedAt: parseDate(s.updatedAt) || new Date(),
        },
      });
      saleCount++;
    }
    stats.push({ table: 'Sale', source: sales.length, migrated: saleCount });

    // 11. SaleItem
    const saleItems = sqlite.prepare('SELECT * FROM "SaleItem"').all() as any[];
    let saleItemCount = 0;
    for (const si of saleItems) {
      await pgPrisma.saleItem.upsert({
        where: { id: si.id },
        update: {},
        create: {
          id: si.id,
          saleId: si.saleId,
          productId: si.productId,
          productName: si.productName,
          barcode: si.barcode,
          quantity: Number(si.quantity || 0),
          unitPrice: Number(si.unitPrice || 0),
          discount: Number(si.discount || 0),
          taxRate: Number(si.taxRate || 0),
          lineTotal: Number(si.lineTotal || 0),
        },
      });
      saleItemCount++;
    }
    stats.push({ table: 'SaleItem', source: saleItems.length, migrated: saleItemCount });

    // 12. Payment
    const payments = sqlite.prepare('SELECT * FROM "Payment"').all() as any[];
    let paymentCount = 0;
    for (const pay of payments) {
      await pgPrisma.payment.upsert({
        where: { id: pay.id },
        update: {},
        create: {
          id: pay.id,
          saleId: pay.saleId,
          paymentMethod: pay.paymentMethod,
          amount: Number(pay.amount || 0),
          transactionRef: pay.transactionRef,
          createdAt: parseDate(pay.createdAt) || new Date(),
        },
      });
      paymentCount++;
    }
    stats.push({ table: 'Payment', source: payments.length, migrated: paymentCount });

    // 13. Return
    const returns = sqlite.prepare('SELECT * FROM "Return"').all() as any[];
    let returnCount = 0;
    for (const r of returns) {
      await pgPrisma.return.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          shopId: r.shopId,
          saleId: r.saleId,
          reason: r.reason,
          refundAmount: Number(r.refundAmount || 0),
          returnDate: parseDate(r.returnDate) || new Date(),
          createdAt: parseDate(r.createdAt) || new Date(),
        },
      });
      returnCount++;
    }
    stats.push({ table: 'Return', source: returns.length, migrated: returnCount });

    // 14. ReturnItem
    const returnItems = sqlite.prepare('SELECT * FROM "ReturnItem"').all() as any[];
    let returnItemCount = 0;
    for (const ri of returnItems) {
      await pgPrisma.returnItem.upsert({
        where: { id: ri.id },
        update: {},
        create: {
          id: ri.id,
          returnId: ri.returnId,
          productId: ri.productId,
          quantity: Number(ri.quantity || 0),
          refundPrice: Number(ri.refundPrice || 0),
        },
      });
      returnItemCount++;
    }
    stats.push({ table: 'ReturnItem', source: returnItems.length, migrated: returnItemCount });

    // 15. StockMovement
    const movements = sqlite.prepare('SELECT * FROM "StockMovement"').all() as any[];
    let moveCount = 0;
    for (const m of movements) {
      await pgPrisma.stockMovement.upsert({
        where: { id: m.id },
        update: {},
        create: {
          id: m.id,
          shopId: m.shopId,
          productId: m.productId,
          type: m.type,
          quantityChange: Number(m.quantityChange || 0),
          previousStock: Number(m.previousStock || 0),
          newStock: Number(m.newStock || 0),
          reason: m.reason,
          referenceId: m.referenceId,
          createdAt: parseDate(m.createdAt) || new Date(),
        },
      });
      moveCount++;
    }
    stats.push({ table: 'StockMovement', source: movements.length, migrated: moveCount });

    // Summary Table
    console.log('----------------------------------------------------------------');
    console.log('  Table Name       | SQLite Rows | Migrated to PostgreSQL       ');
    console.log('----------------------------------------------------------------');
    for (const row of stats) {
      console.log(`  ${row.table.padEnd(16)} | ${String(row.source).padStart(11)} | ${String(row.migrated).padStart(28)}`);
    }
    console.log('----------------------------------------------------------------');
    console.log('\n[SUCCESS] All records transferred safely to PostgreSQL!');
    console.log('          Source SQLite database remains intact and unchanged.\n');
  } catch (error: any) {
    console.error('\n[ERROR] Migration failed:', error);
    process.exit(1);
  } finally {
    sqlite.close();
    await pgPrisma.$disconnect();
  }
}

run();
