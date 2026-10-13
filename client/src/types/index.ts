export interface Shop {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  address?: string | null;
  gstin?: string | null;
  logoUrl?: string | null;
  currency: string;
  invoicePrefix: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShopSetting {
  id: string;
  shopId: string;
  taxEnabled: boolean;
  defaultGstRate: number;
  taxInclusive: boolean;
  allowNegativeStock: boolean;
  lowStockDefault: number;
  thermalPrinterWidth: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
}

export interface Category {
  id: string;
  shopId: string;
  name: string;
  description?: string | null;
  productCount?: number;
  createdAt: string;
}

export interface Product {
  id: string;
  shopId: string;
  categoryId: string;
  category?: Category;
  name: string;
  barcode?: string | null;
  sku?: string | null;
  brand?: string | null;
  purchaseCost: number;
  sellingPrice: number;
  mrp?: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  unit: string;
  supplierId?: string | null;
  supplier?: Supplier | null;
  expiryDate?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  shopId: string;
  productId: string;
  product?: { name: string; unit: string; barcode?: string | null };
  type: string;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  reason?: string | null;
  referenceId?: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  totalSpent: number;
  visitCount: number;
  lastPurchaseDate?: string | null;
  createdAt: string;
}

export interface Supplier {
  id: string;
  shopId: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
  _count?: { products: number; purchases: number };
  createdAt: string;
}

export interface PurchaseItem {
  id?: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitCost: number;
  total: number;
}

export interface Purchase {
  id: string;
  shopId: string;
  supplierId?: string | null;
  supplier?: Supplier | null;
  invoiceNumber: string;
  totalAmount: number;
  notes?: string | null;
  purchaseDate: string;
  items: PurchaseItem[];
  createdAt: string;
}

export interface SaleItem {
  id?: string;
  productId: string;
  productName: string;
  barcode?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
}

export interface Payment {
  id?: string;
  paymentMethod: string;
  amount: number;
  transactionRef?: string | null;
}

export interface Sale {
  id: string;
  shopId: string;
  invoiceNumber: string;
  customerId?: string | null;
  customer?: Customer | null;
  customerName?: string | null;
  customerPhone?: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  cashTendered?: number | null;
  changeGiven?: number | null;
  notes?: string | null;
  status: string;
  items: SaleItem[];
  payments: Payment[];
  createdAt: string;
}
