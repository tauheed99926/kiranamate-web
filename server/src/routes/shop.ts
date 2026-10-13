import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// Get shop details & settings
router.get('/', async (req: Request, res: Response) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: req.user!.shopId },
      include: { settings: true },
    });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    res.json({ success: true, shop, settings: shop.settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update shop details
router.put('/', async (req: Request, res: Response) => {
  try {
    const { name, ownerName, phone, address, gstin, logoUrl, invoicePrefix } = req.body;

    const updatedShop = await prisma.shop.update({
      where: { id: req.user!.shopId },
      data: {
        ...(name && { name }),
        ...(ownerName && { ownerName }),
        ...(phone && { phone }),
        ...(address !== undefined && { address }),
        ...(gstin !== undefined && { gstin }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(invoicePrefix && { invoicePrefix }),
      },
      include: { settings: true },
    });

    res.json({
      success: true,
      message: 'Shop profile updated successfully',
      shop: updatedShop,
      settings: updatedShop.settings,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update shop settings
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const {
      taxEnabled,
      defaultGstRate,
      taxInclusive,
      allowNegativeStock,
      lowStockDefault,
      thermalPrinterWidth,
    } = req.body;

    const updatedSettings = await prisma.shopSetting.upsert({
      where: { shopId: req.user!.shopId },
      update: {
        ...(taxEnabled !== undefined && { taxEnabled: Boolean(taxEnabled) }),
        ...(defaultGstRate !== undefined && { defaultGstRate: Number(defaultGstRate) }),
        ...(taxInclusive !== undefined && { taxInclusive: Boolean(taxInclusive) }),
        ...(allowNegativeStock !== undefined && {
          allowNegativeStock: Boolean(allowNegativeStock),
        }),
        ...(lowStockDefault !== undefined && {
          lowStockDefault: Number(lowStockDefault),
        }),
        ...(thermalPrinterWidth && { thermalPrinterWidth }),
      },
      create: {
        shopId: req.user!.shopId,
        taxEnabled: taxEnabled !== undefined ? Boolean(taxEnabled) : true,
        defaultGstRate: Number(defaultGstRate) || 0.0,
        taxInclusive: taxInclusive !== undefined ? Boolean(taxInclusive) : true,
        allowNegativeStock: Boolean(allowNegativeStock),
        lowStockDefault: Number(lowStockDefault) || 5.0,
        thermalPrinterWidth: thermalPrinterWidth || '80mm',
      },
    });

    res.json({
      success: true,
      message: 'Shop settings updated successfully',
      settings: updatedSettings,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
