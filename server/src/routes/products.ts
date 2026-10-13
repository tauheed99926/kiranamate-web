import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// List products with search, filter, sorting, and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      search = '',
      categoryId,
      stockStatus = 'all', // all, low, out, in_stock
      expiryStatus = 'all', // all, expiring_soon, expired
      sortBy = 'name', // name, price, stock, createdAt
      sortOrder = 'asc', // asc, desc
      page = '1',
      limit = '50',
      all = 'false', // if true, returns all products (useful for POS cache/dropdown)
    } = req.query;

    const shopId = req.user!.shopId;
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const where: any = { shopId };

    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q } },
        { barcode: { contains: q } },
        { sku: { contains: q } },
        { brand: { contains: q } },
      ];
    }

    if (categoryId && String(categoryId) !== 'all') {
      where.categoryId = String(categoryId);
    }

    if (stockStatus === 'out') {
      where.stockQuantity = { lte: 0 };
    } else if (stockStatus === 'in_stock') {
      where.stockQuantity = { gt: 0 };
    }

    if (expiryStatus === 'expired') {
      where.expiryDate = { lte: now };
    } else if (expiryStatus === 'expiring_soon') {
      where.expiryDate = { gte: now, lte: thirtyDaysFromNow };
    }

    let orderBy: any = {};
    if (sortBy === 'price') {
      orderBy = { sellingPrice: sortOrder === 'desc' ? 'desc' : 'asc' };
    } else if (sortBy === 'stock') {
      orderBy = { stockQuantity: sortOrder === 'desc' ? 'desc' : 'asc' };
    } else if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder === 'desc' ? 'desc' : 'asc' };
    } else {
      orderBy = { name: sortOrder === 'desc' ? 'desc' : 'asc' };
    }

    if (all === 'true') {
      const products = await prisma.product.findMany({
        where,
        include: { category: true, supplier: true },
        orderBy,
      });
      return res.json({ success: true, products, total: products.length });
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(String(limit), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    let [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, supplier: true },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.product.count({ where }),
    ]);

    // Handle 'low' stock status accurately if requested
    if (stockStatus === 'low') {
      const allMatching = await prisma.product.findMany({
        where: {
          ...where,
          stockQuantity: { gt: 0 },
        },
        include: { category: true, supplier: true },
        orderBy,
      });
      const lowList = allMatching.filter((p) => p.stockQuantity <= p.lowStockThreshold);
      totalCount = lowList.length;
      products = lowList.slice(skip, skip + limitNum);
    }

    res.json({
      success: true,
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Barcode fast lookup
router.get('/barcode/:barcode', async (req: Request, res: Response) => {
  try {
    const rawBarcode = req.params.barcode;
    const barcodeStr = Array.isArray(rawBarcode) ? rawBarcode[0] : rawBarcode;
    const cleanBarcode = (barcodeStr || '').trim();

    const product = await prisma.product.findFirst({
      where: {
        shopId: req.user!.shopId,
        barcode: cleanBarcode,
      },
      include: { category: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        found: false,
        message: `No product found with barcode ${cleanBarcode}`,
        barcode: cleanBarcode,
      });
    }

    res.json({
      success: true,
      found: true,
      product,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Single product with stock movement history
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const product = await prisma.product.findFirst({
      where: { id, shopId: req.user!.shopId },
      include: {
        category: true,
        supplier: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create product
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      barcode,
      sku,
      categoryId,
      brand,
      purchaseCost = 0,
      sellingPrice,
      mrp,
      stockQuantity = 0,
      lowStockThreshold = 5,
      unit = 'piece',
      supplierId,
      expiryDate,
      description,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Product name is required.' });
    }

    if (sellingPrice === undefined || Number(sellingPrice) < 0) {
      return res.status(400).json({ success: false, message: 'Valid selling price is required.' });
    }

    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }

    const shopId = req.user!.shopId;

    // Check duplicate barcode warning/validation
    if (barcode && String(barcode).trim()) {
      const bStr = String(barcode).trim();
      const existing = await prisma.product.findFirst({
        where: { shopId, barcode: bStr },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `A product with barcode "${bStr}" already exists (${existing.name}).`,
        });
      }
    }

    const initialStock = Number(stockQuantity) || 0;

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          shopId,
          categoryId,
          name: name.trim(),
          barcode: barcode && String(barcode).trim() ? String(barcode).trim() : null,
          sku: sku && String(sku).trim() ? String(sku).trim() : null,
          brand: brand && String(brand).trim() ? String(brand).trim() : null,
          purchaseCost: Number(purchaseCost) || 0,
          sellingPrice: Number(sellingPrice),
          mrp: mrp ? Number(mrp) : null,
          stockQuantity: initialStock,
          lowStockThreshold: Number(lowStockThreshold) || 5,
          unit: unit || 'piece',
          supplierId: supplierId || null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          description: description || null,
        },
        include: { category: true },
      });

      if (initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            shopId,
            productId: product.id,
            type: 'ADJUSTMENT',
            quantityChange: initialStock,
            previousStock: 0,
            newStock: initialStock,
            reason: 'Initial stock intake',
          },
        });
      }

      return product;
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update product
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const shopId = req.user!.shopId;
    const {
      name,
      barcode,
      sku,
      categoryId,
      brand,
      purchaseCost,
      sellingPrice,
      mrp,
      lowStockThreshold,
      unit,
      supplierId,
      expiryDate,
      description,
    } = req.body;

    const existingProduct = await prisma.product.findFirst({
      where: { id, shopId },
    });

    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Check duplicate barcode if barcode is changed
    if (barcode && String(barcode).trim() && String(barcode).trim() !== existingProduct.barcode) {
      const bStr = String(barcode).trim();
      const dup = await prisma.product.findFirst({
        where: { shopId, barcode: bStr, id: { not: id } },
      });
      if (dup) {
        return res.status(400).json({
          success: false,
          message: `Another product already has barcode "${bStr}" (${dup.name}).`,
        });
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(barcode !== undefined && {
          barcode: barcode && String(barcode).trim() ? String(barcode).trim() : null,
        }),
        ...(sku !== undefined && { sku: sku && String(sku).trim() ? String(sku).trim() : null }),
        ...(categoryId && { categoryId }),
        ...(brand !== undefined && { brand: brand && String(brand).trim() ? String(brand).trim() : null }),
        ...(purchaseCost !== undefined && { purchaseCost: Number(purchaseCost) }),
        ...(sellingPrice !== undefined && { sellingPrice: Number(sellingPrice) }),
        ...(mrp !== undefined && { mrp: mrp ? Number(mrp) : null }),
        ...(lowStockThreshold !== undefined && {
          lowStockThreshold: Number(lowStockThreshold),
        }),
        ...(unit && { unit }),
        ...(supplierId !== undefined && { supplierId: supplierId || null }),
        ...(expiryDate !== undefined && {
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        }),
        ...(description !== undefined && { description: description || null }),
      },
      include: { category: true, supplier: true },
    });

    res.json({ success: true, message: 'Product updated successfully', product: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete product safely
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const shopId = req.user!.shopId;

    const product = await prisma.product.findFirst({
      where: { id, shopId },
      include: {
        _count: {
          select: { saleItems: true, purchaseItems: true },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (product._count.saleItems > 0 || product._count.purchaseItems > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete product "${product.name}" because it is referenced in past sales or purchases. You can set stock to 0 instead.`,
      });
    }

    await prisma.product.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CSV Export
router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const products = await prisma.product.findMany({
      where: { shopId },
      include: { category: true, supplier: true },
      orderBy: { name: 'asc' },
    });

    const header = [
      'Name',
      'Barcode',
      'SKU',
      'Category',
      'Brand',
      'Purchase Cost',
      'Selling Price',
      'MRP',
      'Stock Quantity',
      'Unit',
      'Low Stock Threshold',
      'Expiry Date',
    ].join(',');

    const rows = products.map((p) => {
      const escape = (str: string | null | undefined) => `"${(str || '').replace(/"/g, '""')}"`;
      return [
        escape(p.name),
        escape(p.barcode),
        escape(p.sku),
        escape(p.category?.name),
        escape(p.brand),
        p.purchaseCost.toFixed(2),
        p.sellingPrice.toFixed(2),
        p.mrp ? p.mrp.toFixed(2) : '',
        p.stockQuantity,
        escape(p.unit),
        p.lowStockThreshold,
        p.expiryDate ? p.expiryDate.toISOString().split('T')[0] : '',
      ].join(',');
    });

    const csvContent = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="kiranamate-products.csv"');
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CSV Import endpoint
router.post('/import/csv', async (req: Request, res: Response) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid product rows received.' });
    }

    const shopId = req.user!.shopId;

    const categories = await prisma.category.findMany({ where: { shopId } });
    const categoryMap = new Map<string, string>();
    categories.forEach((c) => categoryMap.set(c.name.toLowerCase(), c.id));

    let createdCount = 0;
    let skippedCount = 0;

    for (const item of products) {
      if (!item.name || !item.sellingPrice) {
        skippedCount++;
        continue;
      }

      let categoryId = item.categoryId;
      if (!categoryId && item.category) {
        const catKey = String(item.category).trim().toLowerCase();
        if (categoryMap.has(catKey)) {
          categoryId = categoryMap.get(catKey);
        } else {
          const newCat = await prisma.category.create({
            data: { shopId, name: String(item.category).trim() },
          });
          categoryId = newCat.id;
          categoryMap.set(catKey, newCat.id);
        }
      }

      if (!categoryId) {
        const defaultCat = categories[0];
        categoryId = defaultCat ? defaultCat.id : null;
      }

      if (!categoryId) {
        skippedCount++;
        continue;
      }

      const barcode = item.barcode ? String(item.barcode).trim() : null;
      if (barcode) {
        const existing = await prisma.product.findFirst({
          where: { shopId, barcode },
        });
        if (existing) {
          skippedCount++;
          continue;
        }
      }

      const initialStock = Number(item.stockQuantity) || 0;
      await prisma.$transaction(async (tx) => {
        const p = await tx.product.create({
          data: {
            shopId,
            categoryId,
            name: String(item.name).trim(),
            barcode,
            sku: item.sku ? String(item.sku).trim() : null,
            brand: item.brand ? String(item.brand).trim() : null,
            purchaseCost: Number(item.purchaseCost) || 0,
            sellingPrice: Number(item.sellingPrice),
            mrp: item.mrp ? Number(item.mrp) : null,
            stockQuantity: initialStock,
            lowStockThreshold: Number(item.lowStockThreshold) || 5,
            unit: item.unit ? String(item.unit).trim() : 'piece',
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          },
        });

        if (initialStock > 0) {
          await tx.stockMovement.create({
            data: {
              shopId,
              productId: p.id,
              type: 'ADJUSTMENT',
              quantityChange: initialStock,
              previousStock: 0,
              newStock: initialStock,
              reason: 'CSV Import intake',
            },
          });
        }
      });
      createdCount++;
    }

    res.json({
      success: true,
      message: `Successfully imported ${createdCount} products (${skippedCount} skipped/duplicates).`,
      createdCount,
      skippedCount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
