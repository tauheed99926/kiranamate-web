import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// List suppliers
router.get('/', async (req: Request, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const suppliers = await prisma.supplier.findMany({
      where: { shopId },
      include: {
        _count: {
          select: { products: true, purchases: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, suppliers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create supplier
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, address, gstin } = req.body;
    const shopId = req.user!.shopId;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Supplier name and phone are required.' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        shopId,
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        address: address ? String(address).trim() : null,
        gstin: gstin ? String(gstin).trim() : null,
      },
    });

    res.status(201).json({ success: true, supplier });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update supplier
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, phone, email, address, gstin } = req.body;
    const shopId = req.user!.shopId;

    const existing = await prisma.supplier.findFirst({
      where: { id, shopId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(phone && { phone: String(phone).trim() }),
        ...(email !== undefined && { email: email ? String(email).trim() : null }),
        ...(address !== undefined && { address: address ? String(address).trim() : null }),
        ...(gstin !== undefined && { gstin: gstin ? String(gstin).trim() : null }),
      },
    });

    res.json({ success: true, supplier: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete supplier
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const shopId = req.user!.shopId;

    const supplier = await prisma.supplier.findFirst({
      where: { id, shopId },
      include: {
        _count: { select: { purchases: true } },
      },
    });

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    if (supplier._count.purchases > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier "${supplier.name}" because past purchase records exist.`,
      });
    }

    await prisma.supplier.delete({ where: { id } });
    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
