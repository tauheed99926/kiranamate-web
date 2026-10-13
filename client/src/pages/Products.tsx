import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  AlertTriangle,
  Camera,
  Layers,
  ArrowUpDown,
  History,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Product, Category, Supplier } from '../types';
import { apiRequest } from '../lib/api';
import { formatINR, formatDate } from '../lib/utils';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

interface ProductsProps {
  initialState?: {
    newBarcode?: string;
    editProductId?: string;
  };
}

export const Products: React.FC<ProductsProps> = ({ initialState }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockStatus, setStockStatus] = useState('all');
  const [expiryStatus, setExpiryStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'ADD' | 'REMOVE' | 'SET'>('ADD');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Stock Count Correction');

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Product Form state
  const [formName, setFormName] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formPurchaseCost, setFormPurchaseCost] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formMrp, setFormMrp] = useState('');
  const [formStockQuantity, setFormStockQuantity] = useState('');
  const [formLowStockThreshold, setFormLowStockThreshold] = useState('5');
  const [formUnit, setFormUnit] = useState('piece');
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await apiRequest('/categories');
      if (res.success) setCategories(res.categories);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await apiRequest('/suppliers');
      if (res.success) setSuppliers(res.suppliers);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search,
        categoryId: selectedCategory,
        stockStatus,
        expiryStatus,
        sortBy,
        sortOrder,
        page: String(page),
        limit: '25',
      });

      const res = await apiRequest(`/products?${queryParams.toString()}`);
      if (res.success) {
        setProducts(res.products);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, stockStatus, expiryStatus, sortBy, sortOrder, page]);

  // Handle incoming props (e.g. from BarcodeScannerPage)
  useEffect(() => {
    if (initialState?.newBarcode) {
      openAddModal(initialState.newBarcode);
    }
  }, [initialState]);

  const openAddModal = (prefillBarcode?: string) => {
    setEditingProduct(null);
    setFormName('');
    setFormBarcode(prefillBarcode || '');
    setFormSku('');
    setFormCategoryId(categories[0]?.id || '');
    setFormBrand('');
    setFormPurchaseCost('0');
    setFormSellingPrice('');
    setFormMrp('');
    setFormStockQuantity('0');
    setFormLowStockThreshold('5');
    setFormUnit('piece');
    setFormSupplierId('');
    setFormExpiryDate('');
    setFormError(null);
    setIsAddEditOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormBarcode(p.barcode || '');
    setFormSku(p.sku || '');
    setFormCategoryId(p.categoryId);
    setFormBrand(p.brand || '');
    setFormPurchaseCost(p.purchaseCost.toString());
    setFormSellingPrice(p.sellingPrice.toString());
    setFormMrp(p.mrp ? p.mrp.toString() : '');
    setFormStockQuantity(p.stockQuantity.toString());
    setFormLowStockThreshold(p.lowStockThreshold.toString());
    setFormUnit(p.unit || 'piece');
    setFormSupplierId(p.supplierId || '');
    setFormExpiryDate(p.expiryDate ? p.expiryDate.split('T')[0] : '');
    setFormError(null);
    setIsAddEditOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formSellingPrice || !formCategoryId) {
      setFormError('Product Name, Category, and Selling Price are required.');
      return;
    }

    try {
      const payload = {
        name: formName.trim(),
        barcode: formBarcode.trim() || null,
        sku: formSku.trim() || null,
        categoryId: formCategoryId,
        brand: formBrand.trim() || null,
        purchaseCost: parseFloat(formPurchaseCost) || 0,
        sellingPrice: parseFloat(formSellingPrice),
        mrp: formMrp ? parseFloat(formMrp) : null,
        stockQuantity: parseFloat(formStockQuantity) || 0,
        lowStockThreshold: parseFloat(formLowStockThreshold) || 5,
        unit: formUnit,
        supplierId: formSupplierId || null,
        expiryDate: formExpiryDate || null,
      };

      if (editingProduct) {
        await apiRequest(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsAddEditOpen(false);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product.');
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`Are you sure you want to delete "${p.name}"?`)) return;

    try {
      await apiRequest(`/products/${p.id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product.');
    }
  };

  const openAdjustModal = (p: Product) => {
    setAdjustingProduct(p);
    setAdjustType('ADD');
    setAdjustQty('');
    setAdjustReason('Physical Inventory Count');
    setIsAdjustOpen(true);
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || !adjustQty) return;

    try {
      await apiRequest('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: adjustingProduct.id,
          changeType: adjustType,
          quantity: parseFloat(adjustQty),
          reason: adjustReason,
        }),
      });

      setIsAdjustOpen(false);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Stock adjustment failed.');
    }
  };

  const handleExportCsv = () => {
    window.open('/api/products/export/csv', '_blank');
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (!csvContent.trim()) return;

    try {
      const lines = csvContent.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setImportMessage('CSV file is empty or missing headers.');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
      const parsedProducts = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map((col) => col.trim().replace(/^"|"$/g, ''));
        const obj: any = {};
        headers.forEach((h, idx) => {
          if (h.includes('name')) obj.name = row[idx];
          else if (h.includes('barcode')) obj.barcode = row[idx];
          else if (h.includes('sku')) obj.sku = row[idx];
          else if (h.includes('category')) obj.category = row[idx];
          else if (h.includes('brand')) obj.brand = row[idx];
          else if (h.includes('cost')) obj.purchaseCost = parseFloat(row[idx]) || 0;
          else if (h.includes('sell') || h.includes('price')) obj.sellingPrice = parseFloat(row[idx]) || 0;
          else if (h.includes('mrp')) obj.mrp = parseFloat(row[idx]) || null;
          else if (h.includes('stock') || h.includes('qty')) obj.stockQuantity = parseFloat(row[idx]) || 0;
          else if (h.includes('unit')) obj.unit = row[idx] || 'piece';
        });

        if (obj.name && obj.sellingPrice) {
          parsedProducts.push(obj);
        }
      }

      const res = await apiRequest('/products/import/csv', {
        method: 'POST',
        body: JSON.stringify({ products: parsedProducts }),
      });

      setImportMessage(res.message);
      fetchProducts();
    } catch (err: any) {
      setImportMessage(err.message || 'Import failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Products & Inventory</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage your store catalog, retail barcodes, purchase costs, and stock levels ({totalCount} total items)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openAddModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
          <button
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <Upload className="w-4 h-4 text-gray-500" />
            Import CSV
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-gray-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by product name, barcode, brand, or SKU..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Category Dropdown */}
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-gray-300 rounded-xl outline-none bg-white text-gray-700"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Stock Status Dropdown */}
        <select
          value={stockStatus}
          onChange={(e) => {
            setStockStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-gray-300 rounded-xl outline-none bg-white text-gray-700"
        >
          <option value="all">All Stock Status</option>
          <option value="in_stock">In Stock (&gt;0)</option>
          <option value="low">Low Stock (≤ Threshold)</option>
          <option value="out">Out of Stock (0)</option>
        </select>

        {/* Expiry Filter */}
        <select
          value={expiryStatus}
          onChange={(e) => {
            setExpiryStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-gray-300 rounded-xl outline-none bg-white text-gray-700"
        >
          <option value="all">All Expiries</option>
          <option value="expiring_soon">Expiring Soon (30d)</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-gray-500 border-b border-gray-200">
                <th className="py-3 px-4 font-semibold">Product Name</th>
                <th className="py-3 px-4 font-semibold">Barcode / SKU</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold text-right">Cost Price</th>
                <th className="py-3 px-4 font-semibold text-right">Selling Price</th>
                <th className="py-3 px-4 font-semibold text-center">Stock Level</th>
                <th className="py-3 px-4 font-semibold">Expiry</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isOutOfStock = p.stockQuantity <= 0;
                  const isLowStock = p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-900 block">{p.name}</span>
                        {p.brand && <span className="text-[10px] text-gray-400">{p.brand}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-gray-700 block">{p.barcode || '-'}</span>
                        {p.sku && <span className="text-[10px] text-gray-400 font-mono">SKU: {p.sku}</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {p.category?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600 font-medium">
                        {formatINR(p.purchaseCost)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-emerald-700">{formatINR(p.sellingPrice)}</span>
                        {p.mrp && p.mrp > p.sellingPrice && (
                          <span className="block text-[10px] text-gray-400 line-through">MRP: ₹{p.mrp}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-800'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {p.stockQuantity} {p.unit}
                          </span>
                          {isLowStock && <span className="text-[9px] text-amber-600 font-semibold mt-0.5">Low Stock</span>}
                          {isOutOfStock && <span className="text-[9px] text-red-600 font-semibold mt-0.5">Out of Stock</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(p.expiryDate)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openAdjustModal(p)}
                            title="Adjust Stock"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(p)}
                            title="Edit Product"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            title="Delete Product"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page {page} of {totalPages} ({totalCount} total products)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-8 border border-gray-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 text-sm">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsAddEditOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Aashirvaad Atta 5kg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Barcode / EAN</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={formBarcode}
                      onChange={(e) => setFormBarcode(e.target.value)}
                      placeholder="8901030383457"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none font-mono focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="p-2 border border-gray-300 hover:bg-gray-100 rounded-lg text-emerald-700 shrink-0"
                      title="Scan Barcode with Camera"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">SKU / Code</label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="ATT-AASH-5KG"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Category *</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="ITC"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={formPurchaseCost}
                    onChange={(e) => setFormPurchaseCost(e.target.value)}
                    placeholder="215"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    placeholder="245"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={formMrp}
                    onChange={(e) => setFormMrp(e.target.value)}
                    placeholder="260"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    {editingProduct ? 'Current Stock' : 'Opening Stock'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formStockQuantity}
                    onChange={(e) => setFormStockQuantity(e.target.value)}
                    placeholder="20"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Unit</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                  >
                    <option value="piece">Piece (pc)</option>
                    <option value="packet">Packet (pkt)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="gm">Gram (gm)</option>
                    <option value="litre">Litre (L)</option>
                    <option value="ml">Millilitre (ml)</option>
                    <option value="box">Box</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Low Stock Alert</label>
                  <input
                    type="number"
                    value={formLowStockThreshold}
                    onChange={(e) => setFormLowStockThreshold(e.target.value)}
                    placeholder="5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Supplier</label>
                  <select
                    value={formSupplierId}
                    onChange={(e) => setFormSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                  >
                    <option value="">No Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustOpen && adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">
                Adjust Stock: {adjustingProduct.name}
              </h3>
              <button onClick={() => setIsAdjustOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4 pt-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl text-gray-600">
                Current Stock: <span className="font-bold text-gray-900">{adjustingProduct.stockQuantity} {adjustingProduct.unit}</span>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Action</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADD')}
                    className={`py-2 rounded-lg font-semibold border ${
                      adjustType === 'ADD' ? 'bg-emerald-50 border-emerald-600 text-emerald-800' : 'border-gray-200'
                    }`}
                  >
                    + Add Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('REMOVE')}
                    className={`py-2 rounded-lg font-semibold border ${
                      adjustType === 'REMOVE' ? 'bg-red-50 border-red-600 text-red-800' : 'border-gray-200'
                    }`}
                  >
                    - Deduct Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('SET')}
                    className={`py-2 rounded-lg font-semibold border ${
                      adjustType === 'SET' ? 'bg-blue-50 border-blue-600 text-blue-800' : 'border-gray-200'
                    }`}
                  >
                    = Set Exact
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Quantity ({adjustingProduct.unit})</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full px-3 py-2 text-sm font-bold border border-gray-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Reason for Adjustment</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Damaged goods, physical audit correction"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 p-6 space-y-4 text-xs animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Import Products from CSV</h3>
              <button onClick={() => setIsImportOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {importMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
                {importMessage}
              </div>
            )}

            <p className="text-gray-500">
              Upload a CSV file containing columns like <code className="bg-gray-100 px-1 py-0.5 rounded">Name, Barcode, Category, Selling Price, Stock Quantity</code>.
            </p>

            <input
              type="file"
              accept=".csv"
              onChange={handleCsvFile}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!csvContent}
                onClick={handleImportSubmit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50"
              >
                Start Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Camera Modal for barcode input */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(scanned) => {
          setFormBarcode(scanned);
          setIsScannerOpen(false);
        }}
      />
    </div>
  );
};
