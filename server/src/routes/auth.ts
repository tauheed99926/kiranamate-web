import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { generateToken, requireAuth } from '../middleware/auth';

const router = Router();

// Check if shop is already configured
router.get('/status', async (req: Request, res: Response) => {
  try {
    const shopCount = await prisma.shop.count();
    const userCount = await prisma.user.count();
    res.json({
      success: true,
      initialized: shopCount > 0 && userCount > 0,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// First-run setup wizard
router.post('/setup', async (req: Request, res: Response) => {
  try {
    const existingShop = await prisma.shop.count();
    if (existingShop > 0) {
      return res.status(400).json({
        success: false,
        message: 'Shop is already initialized. Please login instead.',
      });
    }

    const {
      shopName,
      ownerName,
      phone,
      address,
      gstin,
      username,
      password,
      defaultGstRate,
      taxInclusive,
      invoicePrefix,
    } = req.body;

    if (!shopName || !ownerName || !phone || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Shop name, owner name, phone, username, and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create shop and associated records in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          name: shopName,
          ownerName,
          phone,
          address: address || '',
          gstin: gstin || '',
          invoicePrefix: invoicePrefix || 'KM-',
        },
      });

      const settings = await tx.shopSetting.create({
        data: {
          shopId: shop.id,
          taxEnabled: defaultGstRate !== undefined && defaultGstRate > 0,
          defaultGstRate: Number(defaultGstRate) || 0.0,
          taxInclusive: taxInclusive !== undefined ? Boolean(taxInclusive) : true,
          allowNegativeStock: false,
          lowStockDefault: 5.0,
          thermalPrinterWidth: '80mm',
        },
      });

      const user = await tx.user.create({
        data: {
          shopId: shop.id,
          username: username.trim().toLowerCase(),
          name: ownerName,
          passwordHash,
          role: 'OWNER',
        },
      });

      // Default Indian Kirana categories
      const starterCategories = [
        { name: 'Groceries & Staples', description: 'Atta, rice, dal, oils, spices, and sugar' },
        { name: 'Snacks & Biscuits', description: 'Biscuits, namkeen, chips, and noodles' },
        { name: 'Beverages', description: 'Tea, coffee, cold drinks, and juices' },
        { name: 'Dairy & Bakery', description: 'Milk, butter, paneer, and bread' },
        { name: 'Personal Care', description: 'Soaps, shampoos, toothpaste, and creams' },
        { name: 'Household & Cleaning', description: 'Detergents, dishwash, and floor cleaners' },
        { name: 'Other Items', description: 'Miscellaneous general store items' },
      ];

      for (const cat of starterCategories) {
        await tx.category.create({
          data: {
            shopId: shop.id,
            name: cat.name,
            description: cat.description,
          },
        });
      }

      return { shop, user, settings };
    });

    const token = generateToken({
      userId: result.user.id,
      shopId: result.shop.id,
      username: result.user.username,
      name: result.user.name,
      role: result.user.role,
    });

    res.status(201).json({
      success: true,
      message: 'Shop setup successfully completed!',
      token,
      user: {
        id: result.user.id,
        username: result.user.username,
        name: result.user.name,
        role: result.user.role,
      },
      shop: result.shop,
      settings: result.settings,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Setup failed.' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: {
        shop: {
          include: { settings: true },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    const token = generateToken({
      userId: user.id,
      shopId: user.shopId,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      shop: user.shop,
      settings: user.shop.settings,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Login failed.' });
  }
});

// Get current session info
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        shop: {
          include: { settings: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      shop: user.shop,
      settings: user.shop.settings,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Change Password
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
