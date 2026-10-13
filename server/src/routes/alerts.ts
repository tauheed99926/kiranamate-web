import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// Get all inventory & expiry alerts
router.get('/', async (req: Request, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const allProducts = await prisma.product.findMany({
      where: { shopId },
      include: { category: true, supplier: true },
      orderBy: { stockQuantity: 'asc' },
    });

    const outOfStock: any[] = [];
    const lowStock: any[] = [];
    const expired: any[] = [];
    const expiringSoon: any[] = [];

    allProducts.forEach((p) => {
      // Stock checks
      if (p.stockQuantity <= 0) {
        outOfStock.push({
          ...p,
          suggestedRestock: Math.max(10, Math.ceil(p.lowStockThreshold * 3)),
        });
      } else if (p.stockQuantity <= p.lowStockThreshold) {
        lowStock.push({
          ...p,
          suggestedRestock: Math.max(5, Math.ceil(p.lowStockThreshold * 2.5 - p.stockQuantity)),
        });
      }

      // Expiry checks
      if (p.expiryDate) {
        const exp = new Date(p.expiryDate);
        if (exp < now) {
          expired.push(p);
        } else if (exp <= thirtyDaysFromNow) {
          expiringSoon.push(p);
        }
      }
    });

    res.json({
      success: true,
      summary: {
        outOfStockCount: outOfStock.length,
        lowStockCount: lowStock.length,
        expiredCount: expired.length,
        expiringSoonCount: expiringSoon.length,
        totalAlerts: outOfStock.length + lowStock.length + expired.length + expiringSoon.length,
      },
      outOfStock,
      lowStock,
      expired,
      expiringSoon,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
