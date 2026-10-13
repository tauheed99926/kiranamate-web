import { Router, Request, Response } from 'express';
import { prisma, containsFilter } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// Get customers list
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search = '', page = '1', limit = '50' } = req.query;
    const shopId = req.user!.shopId;

    const where: any = { shopId };
    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { name: containsFilter(q) },
        { phone: containsFilter(q) },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, parseInt(String(limit), 10) || 50);
    const skip = (pageNum - 1) * limitNum;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { totalSpent: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      customers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Single customer with purchases
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const shopId = req.user!.shopId;

    const customer = await prisma.customer.findFirst({
      where: { id, shopId },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    res.json({ success: true, customer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create customer
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, address } = req.body;
    const shopId = req.user!.shopId;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Customer name and phone number are required.' });
    }

    const cleanPhone = String(phone).trim();
    const existing = await prisma.customer.findFirst({
      where: { shopId, phone: cleanPhone },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Customer with phone ${cleanPhone} already exists (${existing.name}).`,
      });
    }

    const customer = await prisma.customer.create({
      data: {
        shopId,
        name: String(name).trim(),
        phone: cleanPhone,
        email: email ? String(email).trim() : null,
        address: address ? String(address).trim() : null,
      },
    });

    res.status(201).json({ success: true, customer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update customer
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, phone, email, address } = req.body;
    const shopId = req.user!.shopId;

    const existing = await prisma.customer.findFirst({
      where: { id, shopId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(phone && { phone: String(phone).trim() }),
        ...(email !== undefined && { email: email ? String(email).trim() : null }),
        ...(address !== undefined && { address: address ? String(address).trim() : null }),
      },
    });

    res.json({ success: true, customer: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
