import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// Get all categories with product count
router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { shopId: req.user!.shopId },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const mapped = categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      productCount: c._count.products,
      createdAt: c.createdAt,
    }));

    res.json({ success: true, categories: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create category
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const existing = await prisma.category.findFirst({
      where: {
        shopId: req.user!.shopId,
        name: { equals: name.trim() },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Category "${name}" already exists.`,
      });
    }

    const category = await prisma.category.create({
      data: {
        shopId: req.user!.shopId,
        name: name.trim(),
        description: description ? description.trim() : null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: { ...category, productCount: 0 },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update category
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const category = await prisma.category.findFirst({
      where: { id, shopId: req.user!.shopId },
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const existing = await prisma.category.findFirst({
      where: {
        shopId: req.user!.shopId,
        name: { equals: name.trim() },
        id: { not: id },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Another category named "${name}" already exists.`,
      });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
      },
    });

    res.json({ success: true, message: 'Category updated successfully', category: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete category with safeguard
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const category = await prisma.category.findFirst({
      where: { id, shopId: req.user!.shopId },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    if (category._count.products > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category "${category.name}". It still contains ${category._count.products} product(s). Please reassign or delete them first.`,
      });
    }

    await prisma.category.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
