import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// Dashboard overview metrics
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Products & stock
    const products = await prisma.product.findMany({
      where: { shopId },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        lowStockThreshold: true,
        purchaseCost: true,
        sellingPrice: true,
      },
    });

    const totalProducts = products.length;
    let totalInventoryItems = 0;
    let totalInventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      if (p.stockQuantity <= 0) {
        outOfStockCount++;
      } else if (p.stockQuantity <= p.lowStockThreshold) {
        lowStockCount++;
      }
      if (p.stockQuantity > 0) {
        totalInventoryItems += p.stockQuantity;
        totalInventoryValue += p.stockQuantity * p.purchaseCost;
      }
    }

    // Today's completed sales
    const todaySales = await prisma.sale.findMany({
      where: {
        shopId,
        status: 'COMPLETED',
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    let todaySalesAmount = 0;
    let todayBillsCount = todaySales.length;
    let todayEstimatedGrossProfit = 0;

    for (const sale of todaySales) {
      todaySalesAmount += sale.grandTotal;
      for (const item of sale.items) {
        const cost = item.product?.purchaseCost ?? 0;
        const profit = (item.unitPrice - cost) * item.quantity - item.discount;
        todayEstimatedGrossProfit += profit;
      }
    }

    // Recent 5 bills
    const recentBills = await prisma.sale.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { items: true },
    });

    // 7-day sales trend
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const pastWeekSales = await prisma.sale.findMany({
      where: {
        shopId,
        status: 'COMPLETED',
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        createdAt: true,
        grandTotal: true,
      },
    });

    const salesByDayMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      const key = d.toISOString().split('T')[0];
      salesByDayMap.set(key, 0);
    }

    pastWeekSales.forEach((s) => {
      const dayKey = s.createdAt.toISOString().split('T')[0];
      if (salesByDayMap.has(dayKey)) {
        salesByDayMap.set(dayKey, salesByDayMap.get(dayKey)! + s.grandTotal);
      }
    });

    const weeklyTrend = Array.from(salesByDayMap.entries()).map(([date, total]) => ({
      date,
      formattedDate: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
      sales: Math.round(total * 100) / 100,
    }));

    // Top selling products (last 30 days)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const recentSaleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          shopId,
          status: 'COMPLETED',
          createdAt: { gte: thirtyDaysAgo },
        },
      },
      select: {
        productId: true,
        productName: true,
        quantity: true,
        lineTotal: true,
      },
    });

    const productSalesAgg = new Map<string, { name: string; quantity: number; revenue: number }>();
    recentSaleItems.forEach((item) => {
      if (!productSalesAgg.has(item.productId)) {
        productSalesAgg.set(item.productId, { name: item.productName, quantity: 0, revenue: 0 });
      }
      const existing = productSalesAgg.get(item.productId)!;
      existing.quantity += item.quantity;
      existing.revenue += item.lineTotal;
    });

    const topSelling = Array.from(productSalesAgg.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((p) => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
      }));

    res.json({
      success: true,
      totalProducts,
      totalInventoryItems: Math.round(totalInventoryItems * 100) / 100,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      todaySales: Math.round(todaySalesAmount * 100) / 100,
      todayBillsCount,
      todayEstimatedGrossProfit: Math.round(todayEstimatedGrossProfit * 100) / 100,
      lowStockCount,
      outOfStockCount,
      recentBills,
      weeklyTrend,
      topSelling,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Detailed analytics & reports
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const { startDate, endDate } = req.query;

    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(now.getDate() - 30);
    defaultStart.setHours(0, 0, 0, 0);

    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : defaultStart;
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date();

    const sales = await prisma.sale.findMany({
      where: {
        shopId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            product: { include: { category: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalRevenue = 0;
    let completedBillsCount = 0;
    let cancelledBillsCount = 0;
    let totalDiscounts = 0;
    let totalTax = 0;
    let estimatedGrossProfit = 0;

    const paymentMethodMap = new Map<string, number>();
    const categorySalesMap = new Map<string, number>();
    const dailySalesMap = new Map<string, { date: string; sales: number; bills: number }>();

    for (const sale of sales) {
      if (sale.status === 'COMPLETED') {
        completedBillsCount++;
        totalRevenue += sale.grandTotal;
        totalDiscounts += sale.discountTotal;
        totalTax += sale.taxTotal;

        // Payment method breakdown
        const method = sale.paymentMethod || 'CASH';
        paymentMethodMap.set(method, (paymentMethodMap.get(method) || 0) + sale.grandTotal);

        // Daily aggregation
        const dayStr = sale.createdAt.toISOString().split('T')[0];
        if (!dailySalesMap.has(dayStr)) {
          dailySalesMap.set(dayStr, { date: dayStr, sales: 0, bills: 0 });
        }
        const daily = dailySalesMap.get(dayStr)!;
        daily.sales += sale.grandTotal;
        daily.bills += 1;

        // Item profits and categories
        for (const item of sale.items) {
          const cost = item.product?.purchaseCost ?? 0;
          const profit = (item.unitPrice - cost) * item.quantity - item.discount;
          estimatedGrossProfit += profit;

          const catName = item.product?.category?.name || 'Uncategorized';
          categorySalesMap.set(catName, (categorySalesMap.get(catName) || 0) + item.lineTotal);
        }
      } else if (sale.status === 'CANCELLED') {
        cancelledBillsCount++;
      }
    }

    const averageBillValue = completedBillsCount > 0 ? totalRevenue / completedBillsCount : 0;

    // Payment methods array for Pie chart
    const paymentBreakdown = Array.from(paymentMethodMap.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }));

    // Category breakdown array for Pie chart
    const categoryBreakdown = Array.from(categorySalesMap.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }));

    // Daily sales trend
    const dailyTrend = Array.from(dailySalesMap.values()).map((d) => ({
      ...d,
      sales: Math.round(d.sales * 100) / 100,
    }));

    // Purchases in date range
    const purchases = await prisma.purchase.findMany({
      where: {
        shopId,
        purchaseDate: { gte: start, lte: end },
      },
    });
    const totalPurchasesAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

    res.json({
      success: true,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        completedBillsCount,
        cancelledBillsCount,
        averageBillValue: Math.round(averageBillValue * 100) / 100,
        totalDiscounts: Math.round(totalDiscounts * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        estimatedGrossProfit: Math.round(estimatedGrossProfit * 100) / 100,
        totalPurchasesAmount: Math.round(totalPurchasesAmount * 100) / 100,
      },
      paymentBreakdown,
      categoryBreakdown,
      dailyTrend,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CSV Export for Sales
router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const { startDate, endDate } = req.query;

    const where: any = { shopId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
    });

    const header = [
      'Invoice Number',
      'Date',
      'Customer Name',
      'Customer Phone',
      'Subtotal',
      'Discount',
      'Tax',
      'Grand Total',
      'Payment Method',
      'Status',
    ].join(',');

    const rows = sales.map((s) => {
      const escape = (str: string | null | undefined) => `"${(str || '').replace(/"/g, '""')}"`;
      return [
        escape(s.invoiceNumber),
        escape(s.createdAt.toISOString()),
        escape(s.customerName),
        escape(s.customerPhone),
        s.subtotal.toFixed(2),
        s.discountTotal.toFixed(2),
        s.taxTotal.toFixed(2),
        s.grandTotal.toFixed(2),
        escape(s.paymentMethod),
        escape(s.status),
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sales-report.csv"');
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
