import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// Helper to generate sequential invoice number
async function generateInvoiceNumber(shopId: string, prefix: string): Promise<string> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  const countToday = await prisma.sale.count({
    where: {
      shopId,
      createdAt: { gte: todayStart, lte: todayEnd },
    },
  });

  const seq = String(countToday + 1).padStart(4, '0');
  return `${prefix}${dateStr}-${seq}`;
}

// Complete checkout / generate bill
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const {
      items, // array of { productId, quantity, unitPrice, discount, taxRate }
      billDiscount = 0,
      paymentMethod = 'CASH', // CASH, UPI, CARD, SPLIT
      payments, // if SPLIT: array of { paymentMethod, amount, transactionRef }
      cashTendered,
      customerName,
      customerPhone,
      notes,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart cannot be empty.' });
    }

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: { settings: true },
    });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop details not found.' });
    }

    const allowNegative = shop.settings?.allowNegativeStock ?? false;

    // Fetch all products involved to verify stock and prices
    const productIds = items.map((i) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, shopId },
    });

    const productMap = new Map<string, typeof dbProducts[0]>();
    dbProducts.forEach((p) => productMap.set(p.id, p));

    // Verify stock availability
    for (const item of items) {
      const p = productMap.get(item.productId);
      if (!p) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.productId} was not found.`,
        });
      }

      const qty = Number(item.quantity);
      if (qty <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for ${p.name}.`,
        });
      }

      if (!allowNegative && p.stockQuantity < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${p.name}". Available: ${p.stockQuantity} ${p.unit}, Requested: ${qty} ${p.unit}.`,
        });
      }
    }

    // Calculate totals safely
    let subtotal = 0;
    let itemDiscountsTotal = 0;
    let taxTotal = 0;

    const validatedItems = items.map((item) => {
      const p = productMap.get(item.productId)!;
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPrice ?? p.sellingPrice);
      const discount = Number(item.discount ?? 0);
      const taxRate = Number(item.taxRate ?? shop.settings?.defaultGstRate ?? 0);

      const rawLine = qty * unitPrice;
      const lineAfterDisc = Math.max(0, rawLine - discount);

      let lineTax = 0;
      let lineFinal = lineAfterDisc;

      if (shop.settings?.taxEnabled && taxRate > 0) {
        if (shop.settings.taxInclusive) {
          // Included in price: Tax = LineTotal - (LineTotal / (1 + rate/100))
          lineTax = lineAfterDisc - (lineAfterDisc / (1 + taxRate / 100));
          lineFinal = lineAfterDisc;
        } else {
          // Exclusive: Tax = LineTotal * (rate / 100)
          lineTax = lineAfterDisc * (taxRate / 100);
          lineFinal = lineAfterDisc + lineTax;
        }
      }

      subtotal += rawLine;
      itemDiscountsTotal += discount;
      taxTotal += lineTax;

      return {
        productId: p.id,
        productName: p.name,
        barcode: p.barcode,
        quantity: qty,
        unitPrice,
        discount,
        taxRate,
        lineTotal: Math.round(lineFinal * 100) / 100,
      };
    });

    const totalDiscount = itemDiscountsTotal + Number(billDiscount);
    const grandTotal = Math.max(0, Math.round((subtotal - totalDiscount + (shop.settings?.taxInclusive ? 0 : taxTotal)) * 100) / 100);

    // Calculate cash change if applicable
    let changeGiven = 0;
    const tendered = cashTendered !== undefined ? Number(cashTendered) : grandTotal;
    if (paymentMethod === 'CASH' && tendered > grandTotal) {
      changeGiven = Math.round((tendered - grandTotal) * 100) / 100;
    }

    const invoiceNumber = await generateInvoiceNumber(shopId, shop.invoicePrefix || 'KM-');

    // Run atomic checkout transaction
    const saleResult = await prisma.$transaction(async (tx) => {
      // Find or create customer if phone provided
      let customerId: string | null = null;
      if (customerPhone && customerPhone.trim()) {
        const phone = customerPhone.trim();
        const name = (customerName || 'Customer').trim();
        let cust = await tx.customer.findFirst({
          where: { shopId, phone },
        });

        if (!cust) {
          cust = await tx.customer.create({
            data: {
              shopId,
              name,
              phone,
              totalSpent: grandTotal,
              visitCount: 1,
              lastPurchaseDate: new Date(),
            },
          });
        } else {
          cust = await tx.customer.update({
            where: { id: cust.id },
            data: {
              ...(customerName && { name }),
              totalSpent: cust.totalSpent + grandTotal,
              visitCount: cust.visitCount + 1,
              lastPurchaseDate: new Date(),
            },
          });
        }
        customerId = cust.id;
      }

      // Create Sale
      const sale = await tx.sale.create({
        data: {
          shopId,
          invoiceNumber,
          customerId,
          customerName: customerName || (customerPhone ? 'Customer' : 'Walk-in Customer'),
          customerPhone: customerPhone || null,
          subtotal: Math.round(subtotal * 100) / 100,
          discountTotal: Math.round(totalDiscount * 100) / 100,
          taxTotal: Math.round(taxTotal * 100) / 100,
          grandTotal,
          paymentMethod,
          paymentStatus: 'PAID',
          cashTendered: paymentMethod === 'CASH' ? tendered : null,
          changeGiven: paymentMethod === 'CASH' ? changeGiven : null,
          notes: notes || null,
          status: 'COMPLETED',
        },
      });

      // Create Sale Items & Deduct Stock & Record StockMovement
      for (const item of validatedItems) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            productName: item.productName,
            barcode: item.barcode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
            lineTotal: item.lineTotal,
          },
        });

        const currentP = productMap.get(item.productId)!;
        const newStock = currentP.stockQuantity - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: newStock },
        });

        await tx.stockMovement.create({
          data: {
            shopId,
            productId: item.productId,
            type: 'SALE',
            quantityChange: -item.quantity,
            previousStock: currentP.stockQuantity,
            newStock,
            reason: `Bill sale ${invoiceNumber}`,
            referenceId: sale.id,
          },
        });
      }

      // Create Payment entries
      if (paymentMethod === 'SPLIT' && Array.isArray(payments) && payments.length > 0) {
        for (const p of payments) {
          await tx.payment.create({
            data: {
              saleId: sale.id,
              paymentMethod: p.paymentMethod,
              amount: Number(p.amount),
              transactionRef: p.transactionRef || null,
            },
          });
        }
      } else {
        await tx.payment.create({
          data: {
            saleId: sale.id,
            paymentMethod,
            amount: grandTotal,
            transactionRef: null,
          },
        });
      }

      return sale;
    });

    // Fetch complete sale details for print
    const completeSale = await prisma.sale.findUnique({
      where: { id: saleResult.id },
      include: {
        items: true,
        payments: true,
        customer: true,
      },
    });

    res.status(201).json({
      success: true,
      message: `Bill generated successfully: ${invoiceNumber}`,
      sale: completeSale,
      shop,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
