import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// List purchases
router.get('/', async (req: Request, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const purchases = await prisma.purchase.findMany({
      where: { shopId },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { purchaseDate: 'desc' },
      take: 50,
    });

    res.json({ success: true, purchases });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Record new purchase / restocking
router.post('/', async (req: Request, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const {
      supplierId,
      invoiceNumber,
      notes,
      purchaseDate,
      items, // array of { productId, quantity, unitCost }
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Purchase must include at least one product.' });
    }

    const invNum = (invoiceNumber || `PO-${Date.now()}`).trim();

    let totalAmount = 0;
    for (const it of items) {
      const q = Number(it.quantity);
      const c = Number(it.unitCost);
      if (q <= 0 || c < 0) {
        return res.status(400).json({ success: false, message: 'Quantity and unit cost must be valid positive numbers.' });
      }
      totalAmount += q * c;
    }

    const purchase = await prisma.$transaction(async (tx) => {
      const pRecord = await tx.purchase.create({
        data: {
          shopId,
          supplierId: supplierId || null,
          invoiceNumber: invNum,
          totalAmount: Math.round(totalAmount * 100) / 100,
          notes: notes || null,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        },
      });

      for (const it of items) {
        const qty = Number(it.quantity);
        const cost = Number(it.unitCost);
        const lineTotal = Math.round(qty * cost * 100) / 100;

        await tx.purchaseItem.create({
          data: {
            purchaseId: pRecord.id,
            productId: it.productId,
            quantity: qty,
            unitCost: cost,
            total: lineTotal,
          },
        });

        // Fetch current product to record movement & update stock
        const currentProd = await tx.product.findUnique({
          where: { id: it.productId },
        });

        if (currentProd) {
          const newStock = currentProd.stockQuantity + qty;
          await tx.product.update({
            where: { id: it.productId },
            data: {
              stockQuantity: newStock,
              purchaseCost: cost, // update wholesale cost
            },
          });

          await tx.stockMovement.create({
            data: {
              shopId,
              productId: it.productId,
              type: 'PURCHASE',
              quantityChange: qty,
              previousStock: currentProd.stockQuantity,
              newStock,
              reason: `Purchase Restock (Inv: ${invNum})`,
              referenceId: pRecord.id,
            },
          });
        }
      }

      return pRecord;
    });

    const fullPurchase = await prisma.purchase.findUnique({
      where: { id: purchase.id },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: `Purchase order ${invNum} recorded and stock updated!`,
      purchase: fullPurchase,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Purchase details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const shopId = req.user!.shopId;

    const purchase = await prisma.purchase.findFirst({
      where: { id, shopId },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found.' });
    }

    res.json({ success: true, purchase });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
