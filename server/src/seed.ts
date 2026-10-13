import { prisma } from './db';
import bcrypt from 'bcryptjs';

export async function seedDemoData() {
  console.log('Seeding KiranaMate initial realistic data...');

  // 1. Ensure or create Demo Shop
  let shop = await prisma.shop.findFirst();
  if (!shop) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    shop = await prisma.shop.create({
      data: {
        name: 'Sharma Kirana & General Store',
        ownerName: 'Ramesh Sharma',
        phone: '+91 98765 43210',
        address: 'Shop No. 12, Main Market, Sector 15, Delhi NCR',
        gstin: '07AAAAA0000A1Z5',
        currency: 'INR',
        invoicePrefix: 'SK-',
      },
    });

    await prisma.shopSetting.create({
      data: {
        shopId: shop.id,
        taxEnabled: true,
        defaultGstRate: 5.0,
        taxInclusive: true,
        allowNegativeStock: false,
        lowStockDefault: 10.0,
        thermalPrinterWidth: '80mm',
      },
    });

    await prisma.user.create({
      data: {
        shopId: shop.id,
        username: 'admin',
        name: 'Ramesh Sharma',
        passwordHash,
        role: 'OWNER',
      },
    });
    console.log('Created demo shop & owner (username: admin, password: admin123)');
  }

  const shopId = shop.id;

  // 2. Starter Categories
  const categoriesData = [
    { name: 'Flours, Grains & Dals', description: 'Atta, rice, pulses, and grains' },
    { name: 'Oils & Ghee', description: 'Cooking oils, mustard oil, and pure desi ghee' },
    { name: 'Spices & Salt', description: 'Salt, turmeric, chili powder, and blended spices' },
    { name: 'Dairy & Beverages', description: 'Milk, tea, coffee, cold drinks' },
    { name: 'Snacks & Biscuits', description: 'Biscuits, namkeen, chips, and noodles' },
    { name: 'Personal & Home Care', description: 'Soaps, detergents, cleaners, and toothpaste' },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const record = await prisma.category.upsert({
      where: { shopId_name: { shopId, name: cat.name } },
      update: {},
      create: { shopId, name: cat.name, description: cat.description },
    });
    categoryMap.set(cat.name, record.id);
  }

  // 3. Suppliers
  const supplier1 = await prisma.supplier.create({
    data: {
      shopId,
      name: 'Delhi Wholesale Grain Mandi Traders',
      phone: '+91 98111 22334',
      email: 'mandi.traders@example.com',
      address: 'Khari Baoli, Old Delhi',
      gstin: '07AAACM1234D1Z8',
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      shopId,
      name: 'National FMCG Distributors',
      phone: '+91 98222 33445',
      email: 'fmcg.dist@example.com',
      address: 'Okhla Industrial Area Phase II, New Delhi',
      gstin: '07BBBNA5678E1Z2',
    },
  });

  // 4. Products with authentic Indian retail barcodes
  const productsList = [
    {
      name: 'Aashirvaad Superior MP Atta (5kg)',
      barcode: '8901030383457',
      sku: 'ATT-AASH-5KG',
      category: 'Flours, Grains & Dals',
      brand: 'ITC Aashirvaad',
      purchaseCost: 215.0,
      sellingPrice: 245.0,
      mrp: 260.0,
      stockQuantity: 35.0,
      lowStockThreshold: 10.0,
      unit: 'packet',
      supplierId: supplier1.id,
      expiryDate: new Date('2027-04-30'),
    },
    {
      name: 'Tata Sampann Unpolished Toor Dal (1kg)',
      barcode: '8904004403108',
      sku: 'DAL-TOOR-1KG',
      category: 'Flours, Grains & Dals',
      brand: 'Tata Sampann',
      purchaseCost: 145.0,
      sellingPrice: 170.0,
      mrp: 185.0,
      stockQuantity: 28.0,
      lowStockThreshold: 8.0,
      unit: 'kg',
      supplierId: supplier1.id,
      expiryDate: new Date('2027-06-15'),
    },
    {
      name: 'India Gate Basmati Rice Feast Rozzana (1kg)',
      barcode: '8906001020015',
      sku: 'RIC-IGATE-1KG',
      category: 'Flours, Grains & Dals',
      brand: 'India Gate',
      purchaseCost: 85.0,
      sellingPrice: 105.0,
      mrp: 115.0,
      stockQuantity: 40.0,
      lowStockThreshold: 12.0,
      unit: 'kg',
      supplierId: supplier1.id,
      expiryDate: new Date('2027-08-30'),
    },
    {
      name: 'Fortune Kachi Ghani Mustard Oil Pouch (1L)',
      barcode: '8906007280183',
      sku: 'OIL-FORT-MUST-1L',
      category: 'Oils & Ghee',
      brand: 'Fortune',
      purchaseCost: 125.0,
      sellingPrice: 145.0,
      mrp: 160.0,
      stockQuantity: 24.0,
      lowStockThreshold: 8.0,
      unit: 'litre',
      supplierId: supplier2.id,
      expiryDate: new Date('2027-03-31'),
    },
    {
      name: 'Fortune Sunlite Refined Sunflower Oil (1L)',
      barcode: '8906007280145',
      sku: 'OIL-FORT-SUN-1L',
      category: 'Oils & Ghee',
      brand: 'Fortune',
      purchaseCost: 118.0,
      sellingPrice: 135.0,
      mrp: 150.0,
      stockQuantity: 18.0,
      lowStockThreshold: 6.0,
      unit: 'litre',
      supplierId: supplier2.id,
      expiryDate: new Date('2027-05-15'),
    },
    {
      name: 'Amul Pure Ghee Pouch (1L)',
      barcode: '8901262010053',
      sku: 'GHEE-AMUL-1L',
      category: 'Oils & Ghee',
      brand: 'Amul',
      purchaseCost: 540.0,
      sellingPrice: 610.0,
      mrp: 650.0,
      stockQuantity: 14.0,
      lowStockThreshold: 5.0,
      unit: 'litre',
      supplierId: supplier2.id,
      expiryDate: new Date('2027-02-28'),
    },
    {
      name: 'Tata Salt Vacuum Evaporated (1kg)',
      barcode: '8904004400275',
      sku: 'SLT-TATA-1KG',
      category: 'Spices & Salt',
      brand: 'Tata Salt',
      purchaseCost: 22.0,
      sellingPrice: 28.0,
      mrp: 30.0,
      stockQuantity: 60.0,
      lowStockThreshold: 15.0,
      unit: 'packet',
      supplierId: supplier1.id,
      expiryDate: new Date('2028-01-01'),
    },
    {
      name: 'Catch Turmeric Powder (100g)',
      barcode: '8901192100222',
      sku: 'SPC-CATCH-TURM-100G',
      category: 'Spices & Salt',
      brand: 'Catch',
      purchaseCost: 28.0,
      sellingPrice: 36.0,
      mrp: 40.0,
      stockQuantity: 30.0,
      lowStockThreshold: 10.0,
      unit: 'packet',
      supplierId: supplier2.id,
      expiryDate: new Date('2027-09-30'),
    },
    {
      name: 'Everest Garam Masala (100g)',
      barcode: '8901786100012',
      sku: 'SPC-EVEREST-GM-100G',
      category: 'Spices & Salt',
      brand: 'Everest',
      purchaseCost: 68.0,
      sellingPrice: 84.0,
      mrp: 92.0,
      stockQuantity: 22.0,
      lowStockThreshold: 8.0,
      unit: 'packet',
      supplierId: supplier2.id,
      expiryDate: new Date('2027-07-20'),
    },
    {
      name: 'Maggi 2-Minute Masala Noodles (70g)',
      barcode: '8901058852331',
      sku: 'SNK-MAGGI-70G',
      category: 'Snacks & Biscuits',
      brand: 'Nestle Maggi',
      purchaseCost: 11.5,
      sellingPrice: 14.0,
      mrp: 14.0,
      stockQuantity: 75.0,
      lowStockThreshold: 20.0,
      unit: 'packet',
      supplierId: supplier2.id,
      expiryDate: new Date('2027-03-10'),
    },
    {
      name: 'Parle-G Original Glucose Biscuits (800g)',
      barcode: '8901719101017',
      sku: 'SNK-PARLEG-800G',
      category: 'Snacks & Biscuits',
      brand: 'Parle',
      purchaseCost: 72.0,
      sellingPrice: 85.0,
      mrp: 90.0,
      stockQuantity: 4.0, // Set low stock to trigger low-stock alert!
      lowStockThreshold: 10.0,
      unit: 'packet',
      supplierId: supplier2.id,
      expiryDate: new Date('2027-01-15'),
    },
    {
      name: 'Britannia Good Day Cashew Biscuits (200g)',
      barcode: '8901063012225',
      sku: 'SNK-BRIT-GD-200G',
      category: 'Snacks & Biscuits',
      brand: 'Britannia',
      purchaseCost: 38.0,
      sellingPrice: 48.0,
      mrp: 50.0,
      stockQuantity: 0.0, // Out of stock to demonstrate out-of-stock badge!
      lowStockThreshold: 8.0,
      unit: 'packet',
      supplierId: supplier2.id,
      expiryDate: new Date('2026-11-20'), // Expiring soon to demonstrate expiry alert!
    },
    {
      name: "Lay's India's Magic Masala Chips (50g)",
      barcode: '8901491101836',
      sku: 'SNK-LAYS-MAS-50G',
      category: 'Snacks & Biscuits',
      brand: "Lay's",
      purchaseCost: 16.0,
      sellingPrice: 20.0,
      mrp: 20.0,
      stockQuantity: 45.0,
      lowStockThreshold: 15.0,
      unit: 'packet',
      supplierId: supplier2.id,
      expiryDate: new Date('2027-02-15'),
    },
    {
      name: 'Tata Tea Gold (500g)',
      barcode: '8901052003890',
      sku: 'BEV-TATA-TEA-500G',
      category: 'Dairy & Beverages',
      brand: 'Tata Tea',
      purchaseCost: 260.0,
      sellingPrice: 310.0,
      mrp: 340.0,
      stockQuantity: 19.0,
      lowStockThreshold: 6.0,
      unit: 'box',
      supplierId: supplier2.id,
      expiryDate: new Date('2027-10-15'),
    },
    {
      name: 'Amul Taaza Homogenised Toned Milk (1L)',
      barcode: '8901262010107',
      sku: 'DRY-AMUL-TZ-1L',
      category: 'Dairy & Beverages',
      brand: 'Amul',
      purchaseCost: 65.0,
      sellingPrice: 74.0,
      mrp: 75.0,
      stockQuantity: 25.0,
      lowStockThreshold: 8.0,
      unit: 'packet',
      supplierId: supplier2.id,
      expiryDate: new Date('2026-10-25'), // Expiring within days!
    },
    {
      name: 'Thums Up Soft Drink Pet Bottle (750ml)',
      barcode: '8901764012252',
      sku: 'BEV-THUMSUP-750ML',
      category: 'Dairy & Beverages',
      brand: 'Coca-Cola',
      purchaseCost: 32.0,
      sellingPrice: 40.0,
      mrp: 40.0,
      stockQuantity: 30.0,
      lowStockThreshold: 10.0,
      unit: 'bottle',
      supplierId: supplier2.id,
      expiryDate: new Date('2027-04-10'),
    },
    {
      name: 'Dettol Original Bathing Soap (125g)',
      barcode: '8901396112005',
      sku: 'PC-DETTOL-125G',
      category: 'Personal & Home Care',
      brand: 'Dettol',
      purchaseCost: 46.0,
      sellingPrice: 56.0,
      mrp: 60.0,
      stockQuantity: 42.0,
      lowStockThreshold: 12.0,
      unit: 'piece',
      supplierId: supplier2.id,
      expiryDate: new Date('2028-02-28'),
    },
    {
      name: 'Surf Excel Easy Wash Detergent Powder (1kg)',
      barcode: '8901030704408',
      sku: 'HC-SURF-1KG',
      category: 'Personal & Home Care',
      brand: 'Hindustan Unilever',
      purchaseCost: 115.0,
      sellingPrice: 138.0,
      mrp: 145.0,
      stockQuantity: 20.0,
      lowStockThreshold: 7.0,
      unit: 'packet',
      supplierId: supplier2.id,
      expiryDate: new Date('2028-05-30'),
    },
    {
      name: 'Vim Dishwash Bar (300g)',
      barcode: '8901030364906',
      sku: 'HC-VIM-300G',
      category: 'Personal & Home Care',
      brand: 'Hindustan Unilever',
      purchaseCost: 24.0,
      sellingPrice: 30.0,
      mrp: 32.0,
      stockQuantity: 50.0,
      lowStockThreshold: 15.0,
      unit: 'piece',
      supplierId: supplier2.id,
      expiryDate: new Date('2028-04-15'),
    },
    {
      name: 'Colgate Strong Teeth Dental Cream (200g)',
      barcode: '8901314010529',
      sku: 'PC-COLG-200G',
      category: 'Personal & Home Care',
      brand: 'Colgate',
      purchaseCost: 92.0,
      sellingPrice: 112.0,
      mrp: 120.0,
      stockQuantity: 28.0,
      lowStockThreshold: 10.0,
      unit: 'piece',
      supplierId: supplier2.id,
      expiryDate: new Date('2027-11-20'),
    },
  ];

  for (const item of productsList) {
    const categoryId = categoryMap.get(item.category)!;
    const existing = await prisma.product.findFirst({
      where: { shopId, barcode: item.barcode },
    });

    if (!existing) {
      const prod = await prisma.product.create({
        data: {
          shopId,
          categoryId,
          name: item.name,
          barcode: item.barcode,
          sku: item.sku,
          brand: item.brand,
          purchaseCost: item.purchaseCost,
          sellingPrice: item.sellingPrice,
          mrp: item.mrp,
          stockQuantity: item.stockQuantity,
          lowStockThreshold: item.lowStockThreshold,
          unit: item.unit,
          supplierId: item.supplierId,
          expiryDate: item.expiryDate,
        },
      });

      if (item.stockQuantity > 0) {
        await prisma.stockMovement.create({
          data: {
            shopId,
            productId: prod.id,
            type: 'ADJUSTMENT',
            quantityChange: item.stockQuantity,
            previousStock: 0,
            newStock: item.stockQuantity,
            reason: 'Opening stock balance',
          },
        });
      }
    }
  }

  // 5. Add a frequent customer
  await prisma.customer.upsert({
    where: { shopId_phone: { shopId, phone: '+91 99887 76655' } },
    update: {},
    create: {
      shopId,
      name: 'Sunita Verma',
      phone: '+91 99887 76655',
      address: 'Flat 402, Sunshine Apartments, Delhi',
      totalSpent: 0,
      visitCount: 0,
    },
  });

  console.log(`Successfully seeded ${productsList.length} Indian Kirana products with genuine barcodes!`);
}

// Run directly when called via tsx src/seed.ts
if (require.main === module) {
  seedDemoData()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
