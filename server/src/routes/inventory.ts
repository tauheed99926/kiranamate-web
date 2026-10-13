import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// Record a manual stock adjustment
router.post('/adjust', async (req: Request, res: Response) => {
  try {
    const { productId, changeType, quantity, reason } = req.body;
    // changeType: 'ADD' (add stock) or 'REMOVE' (deduct stock) or 'SET' (set exact stock)
    const shopId = req.user!.shopId;

    if (!productId || quantity === undefined || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, quantity, and reason are required.',
      });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number.',
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId, shopId },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const shopSettings = await prisma.shopSetting.findUnique({
      where: { shopId },
    });
    const allowNegative = shopSettings?.allowNegativeStock ?? false;

    let newStock = product.stockQuantity;
    let qtyChange = 0;

    if (changeType === 'ADD') {
      newStock = product.stockQuantity + qty;
      qtyChange = qty;
    } else if (changeType === 'REMOVE') {
      newStock = product.stockQuantity - qty;
      qtyChange = -qty;
    } else if (changeType === 'SET') {
      qtyChange = qty - product.stockQuantity;
      newStock = qty;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid changeType. Use ADD, REMOVE, or SET.' });
    }

    if (newStock < 0 && !allowNegative) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock! Current stock is ${product.stockQuantity} ${product.unit}. Cannot reduce by ${qty} because negative stock is disallowed in shop settings.`,
      });
    }

    const movementType = qtyChange >= 0 ? 'ADJUSTMENT' : (reason.toLowerCase().includes('damage') ? 'DAMAGE' : 'ADJUSTMENT');

    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: newStock },
      });

      const movement = await tx.stockMovement.create({
        data: {
          shopId,
          productId,
          type: movementType,
          quantityChange: qtyChange,
          previousStock: product.stockQuantity,
          newStock,
          reason,
        },
      });

      return { product: updatedProduct, movement };
    });

    res.json({
      success: true,
      message: `Stock updated for ${product.name}. New stock: ${newStock} ${product.unit}`,
      product: result.product,
      movement: result.movement,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// List stock movements
router.get('/movements', async (req: Request, res: Response) => {
  try {
    const { productId, type, limit = '100' } = req.query;
    const shopId = req.user!.shopId;

    const where: any = { shopId };
    if (productId) where.productId = String(productId);
    if (type) where.type = String(type);

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: { name: true, unit: true, barcode: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, parseInt(String(limit), 10) || 100),
    });

    res.json({ success: true, movements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
