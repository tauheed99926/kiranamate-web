import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// List bills with search, filter, and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      search = '',
      startDate,
      endDate,
      status, // COMPLETED, CANCELLED, RETURNED
      paymentMethod,
      page = '1',
      limit = '30',
    } = req.query;

    const shopId = req.user!.shopId;
    const where: any = { shopId };

    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { invoiceNumber: { contains: q } },
        { customerName: { contains: q } },
        { customerPhone: { contains: q } },
      ];
    }

    if (status && String(status) !== 'all') {
      where.status = String(status);
    }

    if (paymentMethod && String(paymentMethod) !== 'all') {
      where.paymentMethod = String(paymentMethod);
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const [bills, totalCount] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: true,
          payments: true,
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.sale.count({ where }),
    ]);

    res.json({
      success: true,
      bills,
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

// Single bill details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const shopId = req.user!.shopId;

    const bill = await prisma.sale.findFirst({
      where: { id, shopId },
      include: {
        items: true,
        payments: true,
        customer: true,
        returns: {
          include: { items: { include: { product: true } } },
        },
      },
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: { settings: true },
    });

    res.json({ success: true, bill, shop });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel full bill and restore inventory
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { reason = 'Cancelled by cashier' } = req.body;
    const shopId = req.user!.shopId;

    const sale = await prisma.sale.findFirst({
      where: { id, shopId },
      include: { items: true },
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }

    if (sale.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'This bill is already cancelled.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark sale as CANCELLED
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'REFUNDED',
          notes: sale.notes ? `${sale.notes} | Cancellation Reason: ${reason}` : `Cancelled: ${reason}`,
        },
      });

      // 2. Restore stock for all products
      for (const item of sale.items) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (prod) {
          const newStock = prod.stockQuantity + item.quantity;
          await tx.product.update({
            where: { id: prod.id },
            data: { stockQuantity: newStock },
          });

          await tx.stockMovement.create({
            data: {
              shopId,
              productId: prod.id,
              type: 'RETURN',
              quantityChange: item.quantity,
              previousStock: prod.stockQuantity,
              newStock,
              reason: `Bill ${sale.invoiceNumber} cancelled: ${reason}`,
              referenceId: sale.id,
            },
          });
        }
      }

      // 3. Adjust customer total spend if customer recorded
      if (sale.customerId) {
        const cust = await tx.customer.findUnique({
          where: { id: sale.customerId },
        });
        if (cust) {
          await tx.customer.update({
            where: { id: cust.id },
            data: {
              totalSpent: Math.max(0, cust.totalSpent - sale.grandTotal),
              visitCount: Math.max(0, cust.visitCount - 1),
            },
          });
        }
      }
    });

    res.json({
      success: true,
      message: `Bill ${sale.invoiceNumber} cancelled and inventory restored successfully.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Partial/full items return
router.post('/:id/return', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { items, reason = 'Customer return' } = req.body;
    const shopId = req.user!.shopId;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Return items are required.' });
    }

    const sale = await prisma.sale.findFirst({
      where: { id, shopId },
      include: { items: true },
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }

    let totalRefund = 0;
    for (const item of items) {
      totalRefund += Number(item.quantity) * Number(item.refundPrice);
    }

    await prisma.$transaction(async (tx) => {
      const returnRecord = await tx.return.create({
        data: {
          shopId,
          saleId: sale.id,
          reason,
          refundAmount: totalRefund,
        },
      });

      for (const item of items) {
        const qty = Number(item.quantity);
        const refundPrice = Number(item.refundPrice);

        await tx.returnItem.create({
          data: {
            returnId: returnRecord.id,
            productId: item.productId,
            quantity: qty,
            refundPrice,
          },
        });

        // Restore stock
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (prod) {
          const newStock = prod.stockQuantity + qty;
          await tx.product.update({
            where: { id: prod.id },
            data: { stockQuantity: newStock },
          });

          await tx.stockMovement.create({
            data: {
              shopId,
              productId: prod.id,
              type: 'RETURN',
              quantityChange: qty,
              previousStock: prod.stockQuantity,
              newStock,
              reason: `Return from bill ${sale.invoiceNumber}: ${reason}`,
              referenceId: sale.id,
            },
          });
        }
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: { status: 'RETURNED' },
      });
    });

    res.json({
      success: true,
      message: `Return processed successfully. Refund: ₹${totalRefund.toFixed(2)}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
