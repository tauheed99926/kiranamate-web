import React, { useState, useEffect } from 'react';
import { Truck, Plus, Eye, Calendar, Package, X, Check, Search } from 'lucide-react';
import { Purchase, Product, Supplier } from '../types';
import { apiRequest } from '../lib/api';
import { formatINR, formatDate } from '../lib/utils';

export const Purchases: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // New Purchase Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; unitCost: number }>>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // View Details Modal state
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/purchases');
      if (res.success) setPurchases(res.purchases);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        apiRequest('/products?all=true'),
        apiRequest('/suppliers'),
      ]);
      if (pRes.success) setProducts(pRes.products);
      if (sRes.success) setSuppliers(sRes.suppliers);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchMeta();
  }, []);

  const openAddModal = () => {
    setSelectedSupplierId(suppliers[0]?.id || '');
    setInvoiceNumber(`PO-${Date.now().toString().slice(-6)}`);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setItems(products.length > 0 ? [{ productId: products[0].id, quantity: 10, unitCost: products[0].purchaseCost }] : []);
    setFormError(null);
    setIsAddOpen(true);
  };

  const addItemRow = () => {
    if (products.length === 0) return;
    const firstP = products[0];
    setItems([...items, { productId: firstP.id, quantity: 10, unitCost: firstP.purchaseCost }]);
  };

  const removeItemRow = (idx: number) => {
    const next = [...items];
    next.splice(idx, 1);
    setItems(next);
  };

  const updateItemRow = (idx: number, field: string, val: any) => {
    const next = [...items];
    (next[idx] as any)[field] = val;

    // if product changed, auto-update default unit cost
    if (field === 'productId') {
      const p = products.find((prod) => prod.id === val);
      if (p) next[idx].unitCost = p.purchaseCost;
    }
    setItems(next);
  };

  const totalPurchaseCost = items.reduce((sum, it) => sum + (it.quantity || 0) * (it.unitCost || 0), 0);

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (items.length === 0) {
      setFormError('Please add at least one product.');
      return;
    }

    try {
      await apiRequest('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: selectedSupplierId || null,
          invoiceNumber,
          purchaseDate,
          notes,
          items,
        }),
      });

      setIsAddOpen(false);
      fetchPurchases();
      fetchMeta(); // updates stock in products
    } catch (err: any) {
      setFormError(err.message || 'Failed to record purchase.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Restock & Purchases</h1>
          <p className="text-xs text-gray-500 mt-1">
            Record supplier shipments and stock replenishment. Inventory automatically increments upon entry.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Record Restock / Purchase
        </button>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-gray-500 border-b border-gray-200">
                <th className="py-3 px-4 font-semibold">PO / Invoice</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Supplier</th>
                <th className="py-3 px-4 font-semibold text-center">Items Received</th>
                <th className="py-3 px-4 font-semibold text-right">Total Amount</th>
                <th className="py-3 px-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Loading purchase records...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    No purchases recorded yet. Click "Record Restock" to add stock from suppliers!
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      {p.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatDate(p.purchaseDate)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">
                      {p.supplier?.name || 'Local Wholesale Market'}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-700">
                      {p.items?.length || 0} product(s)
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {formatINR(p.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedPurchase(p)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        title="View Purchase Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Purchase Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-gray-100 p-6 space-y-4 text-xs animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Record Restock / Purchase Order</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreatePurchase} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Supplier</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                  >
                    <option value="">No Supplier / General Mandi</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Invoice / PO Number *</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* Items Entry Table */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">Restock Items</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Item
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {items.map((row, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl">
                      <select
                        value={row.productId}
                        onChange={(e) => updateItemRow(idx, 'productId', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg outline-none bg-white truncate"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock: {p.stockQuantity} {p.unit})
                          </option>
                        ))}
                      </select>
                      <div className="w-24">
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="Qty"
                          value={row.quantity}
                          onChange={(e) => updateItemRow(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg outline-none text-center"
                        />
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="Cost Price"
                          value={row.unitCost}
                          onChange={(e) => updateItemRow(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg outline-none text-right"
                        />
                      </div>
                      <span className="w-24 text-right font-bold text-gray-800">
                        {formatINR(row.quantity * row.unitCost)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2 text-sm font-bold text-gray-900">
                  <span>Total Purchase Value: {formatINR(totalPurchaseCost)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery notes, batch numbers, or comments..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Confirm Restock & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-100 p-6 space-y-4 text-xs animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">
                Purchase Invoice #{selectedPurchase.invoiceNumber}
              </h3>
              <button onClick={() => setSelectedPurchase(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-gray-600 bg-slate-50 p-3 rounded-xl">
              <div>
                <span className="text-[10px] text-gray-400 block font-semibold">Supplier</span>
                <span className="font-semibold text-gray-800">{selectedPurchase.supplier?.name || 'Local Mandi'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-semibold">Date</span>
                <span className="font-semibold text-gray-800">{formatDate(selectedPurchase.purchaseDate)}</span>
              </div>
            </div>

            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              {selectedPurchase.items?.map((it, idx) => (
                <div key={idx} className="p-3 flex justify-between items-center bg-white">
                  <div>
                    <p className="font-semibold text-gray-800">{it.product?.name || 'Product'}</p>
                    <p className="text-[10px] text-gray-400">Qty: {it.quantity} @ {formatINR(it.unitCost)}</p>
                  </div>
                  <span className="font-bold text-gray-900">{formatINR(it.total)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-baseline pt-2 border-t border-gray-100 font-bold text-sm text-gray-900">
              <span>Total Amount:</span>
              <span className="text-emerald-700 text-base">{formatINR(selectedPurchase.totalAmount)}</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
