import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Camera,
  Plus,
  Minus,
  Trash2,
  Receipt,
  UserCheck,
  CreditCard,
  QrCode,
  Banknote,
  Percent,
  CheckCircle,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Product, Sale } from '../types';
import { apiRequest } from '../lib/api';
import { formatINR, playBeep } from '../lib/utils';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { useAuth } from '../context/AuthContext';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export const POS: React.FC = () => {
  const { shop, settings } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [billDiscount, setBillDiscount] = useState<number>(0);

  // Customer info
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Payment info
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'SPLIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');

  // Modals & status
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [createdSale, setCreatedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posError, setPosError] = useState<string | null>(null);

  // USB Barcode scanner hardware listener buffer
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load all products for fast local search
  const loadProducts = async () => {
    try {
      const res = await apiRequest('/products?all=true');
      if (res.success) {
        setProducts(res.products);
      }
    } catch (err) {
      console.error('Failed to load products for POS', err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Filter products live as user types in search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    const matches = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
    );
    setSearchResults(matches.slice(0, 8));
  }, [searchQuery, products]);

  // Global Hardware USB / Bluetooth Scanner Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input other than the search field
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';

      // If user presses Enter and buffer has content
      if (e.key === 'Enter') {
        const scannedCode = barcodeBufferRef.current.trim();
        if (scannedCode.length >= 3) {
          handleBarcodeScanned(scannedCode);
          barcodeBufferRef.current = '';
          e.preventDefault();
          return;
        }
        barcodeBufferRef.current = '';
      } else if (e.key.length === 1) {
        // Collect characters arriving in quick succession (< 60ms between keys = barcode scanner)
        const now = Date.now();
        if (now - lastKeyTimeRef.current > 100) {
          barcodeBufferRef.current = '';
        }
        lastKeyTimeRef.current = now;
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, cart]);

  // Add product to cart
  const addToCart = (product: Product, qty: number = 1) => {
    setPosError(null);
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);

    if (existingIndex > -1) {
      const newCart = [...cart];
      const newQty = newCart[existingIndex].quantity + qty;

      if (!settings?.allowNegativeStock && newQty > product.stockQuantity) {
        setPosError(`Cannot add more: Only ${product.stockQuantity} ${product.unit} available in stock!`);
        playBeep('error');
        return;
      }

      newCart[existingIndex].quantity = newQty;
      setCart(newCart);
      playBeep('success');
    } else {
      if (!settings?.allowNegativeStock && qty > product.stockQuantity) {
        setPosError(`Cannot add: Only ${product.stockQuantity} ${product.unit} available in stock!`);
        playBeep('error');
        return;
      }

      setCart([
        ...cart,
        {
          product,
          quantity: qty,
          unitPrice: product.sellingPrice,
          discount: 0,
        },
      ]);
      playBeep('success');
    }

    setSearchQuery('');
    setSearchResults([]);
  };

  const handleBarcodeScanned = (barcode: string) => {
    setPosError(null);
    const found = products.find((p) => p.barcode === barcode);
    if (found) {
      addToCart(found, 1);
    } else {
      setPosError(`Barcode "${barcode}" not recognized in database. Please add this product under Products.`);
      playBeep('error');
    }
  };

  const updateQuantity = (index: number, newQty: number) => {
    setPosError(null);
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }

    const item = cart[index];
    if (!settings?.allowNegativeStock && newQty > item.product.stockQuantity) {
      setPosError(`Available stock for ${item.product.name} is only ${item.product.stockQuantity} ${item.product.unit}`);
      return;
    }

    const newCart = [...cart];
    newCart[index].quantity = Math.round(newQty * 100) / 100;
    setCart(newCart);
  };

  const updateItemDiscount = (index: number, disc: number) => {
    const newCart = [...cart];
    newCart[index].discount = Math.max(0, disc);
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // Calculations
  const rawSubtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalItemDiscounts = cart.reduce((sum, item) => sum + item.discount, 0);
  const totalDiscounts = totalItemDiscounts + billDiscount;
  const taxableAmount = Math.max(0, rawSubtotal - totalDiscounts);

  const gstRate = settings?.taxEnabled ? settings.defaultGstRate || 0 : 0;
  let taxAmount = 0;
  let grandTotal = taxableAmount;

  if (settings?.taxEnabled && gstRate > 0) {
    if (settings.taxInclusive) {
      taxAmount = taxableAmount - (taxableAmount / (1 + gstRate / 100));
      grandTotal = taxableAmount;
    } else {
      taxAmount = taxableAmount * (gstRate / 100);
      grandTotal = taxableAmount + taxAmount;
    }
  }

  const roundedGrandTotal = Math.round(grandTotal * 100) / 100;
  const numericTendered = parseFloat(cashTendered) || 0;
  const changeToReturn = paymentMethod === 'CASH' && numericTendered > roundedGrandTotal
    ? Math.round((numericTendered - roundedGrandTotal) * 100) / 100
    : 0;

  // Checkout submission
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setPosError('Cart is empty. Add items before checking out.');
      return;
    }

    setPosError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          taxRate: gstRate,
        })),
        billDiscount,
        paymentMethod,
        cashTendered: paymentMethod === 'CASH' ? numericTendered : null,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
      };

      const res = await apiRequest('/pos/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setCreatedSale(res.sale);
        setIsReceiptOpen(true);
        // Clear POS state
        setCart([]);
        setBillDiscount(0);
        setCustomerName('');
        setCustomerPhone('');
        setCashTendered('');
        loadProducts(); // refresh local stock
      }
    } catch (err: any) {
      setPosError(err.message || 'Checkout failed. Please try again.');
      playBeep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-8rem)]">
      {/* LEFT: Products Search & Cart Table */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {/* Top Search & Scanner Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 bg-gray-50/50">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product by name, barcode, or SKU... (or scan barcode)"
              className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none shadow-2xs"
            />

            {/* Live Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-200 z-20 max-h-64 overflow-y-auto divide-y divide-gray-100">
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p, 1)}
                    className="p-3 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">{p.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {p.barcode && `Barcode: ${p.barcode} • `} Stock: {p.stockQuantity} {p.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-700">{formatINR(p.sellingPrice)}</span>
                      {p.mrp && p.mrp > p.sellingPrice && (
                        <span className="block text-[10px] text-gray-400 line-through">MRP: ₹{p.mrp}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>Camera Scanner</span>
          </button>
        </div>

        {/* Error notification */}
        {posError && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{posError}</span>
            </div>
            <button onClick={() => setPosError(null)} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {/* Cart Items Table */}
        <div className="flex-1 overflow-x-auto p-4">
          {cart.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3 text-gray-400">
                <Receipt className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-gray-600">Cart is empty</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Scan a barcode with camera/USB scanner, or search product by name to start adding items.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 pb-2">
                  <th className="py-2.5 font-semibold">Item</th>
                  <th className="py-2.5 font-semibold text-center">Unit Price</th>
                  <th className="py-2.5 font-semibold text-center w-32">Qty</th>
                  <th className="py-2.5 font-semibold text-center w-20">Discount</th>
                  <th className="py-2.5 font-semibold text-right">Line Total</th>
                  <th className="py-2.5 font-semibold text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cart.map((item, idx) => {
                  const lineTotal = Math.max(0, item.quantity * item.unitPrice - item.discount);
                  return (
                    <tr key={item.product.id} className="hover:bg-slate-50/60">
                      <td className="py-3 pr-2">
                        <p className="font-semibold text-gray-900">{item.product.name}</p>
                        <span className="text-[10px] text-gray-400">
                          Stock: {item.product.stockQuantity} {item.product.unit}
                        </span>
                      </td>
                      <td className="py-3 text-center text-gray-700">
                        {formatINR(item.unitPrice)}
                      </td>
                      <td className="py-3 text-center">
                        <div className="inline-flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, item.quantity - 1)}
                            className="p-1 hover:bg-gray-100 text-gray-600"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(idx, parseFloat(e.target.value) || 0)}
                            className="w-14 text-center text-xs font-semibold py-1 outline-none border-x border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, item.quantity + 1)}
                            className="p-1 hover:bg-gray-100 text-gray-600"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <input
                          type="number"
                          value={item.discount || ''}
                          onChange={(e) => updateItemDiscount(idx, parseFloat(e.target.value) || 0)}
                          placeholder="₹0"
                          className="w-16 px-1.5 py-1 text-center text-xs border border-gray-200 rounded-md outline-none"
                        />
                      </td>
                      <td className="py-3 text-right font-bold text-gray-900">
                        {formatINR(lineTotal)}
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* RIGHT: Bill Summary, Customer Details & Checkout */}
      <div className="w-full lg:w-96 flex flex-col gap-4">
        {/* Customer Information Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Customer (Optional)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 font-semibold mb-1">Phone Number</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 font-semibold mb-1">Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Bill Calculations Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Bill Summary ({cart.length} items)
          </h3>

          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatINR(rawSubtotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Bill Discount:</span>
              <div className="flex items-center gap-1">
                <span>- ₹</span>
                <input
                  type="number"
                  value={billDiscount || ''}
                  onChange={(e) => setBillDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="w-16 px-1.5 py-0.5 text-right text-xs border border-gray-200 rounded outline-none"
                />
              </div>
            </div>

            {totalDiscounts > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Total Discounts:</span>
                <span>-{formatINR(totalDiscounts)}</span>
              </div>
            )}

            {settings?.taxEnabled && (
              <div className="flex justify-between text-gray-500">
                <span>GST ({gstRate}% {settings.taxInclusive ? 'Included' : 'Extra'}):</span>
                <span>{formatINR(taxAmount)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline">
              <span className="text-sm font-bold text-gray-900">Grand Total:</span>
              <span className="text-2xl font-extrabold text-emerald-700">
                {formatINR(roundedGrandTotal)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <label className="block text-[11px] font-bold text-gray-700">Payment Mode</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 border transition-all ${
                  paymentMethod === 'CASH'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 border transition-all ${
                  paymentMethod === 'UPI'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>UPI QR</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 border transition-all ${
                  paymentMethod === 'CARD'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card</span>
              </button>
            </div>

            {/* Cash Tendered & Change Return Helper */}
            {paymentMethod === 'CASH' && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-600">Cash Received:</span>
                  <div className="flex items-center gap-1">
                    <span>₹</span>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder={roundedGrandTotal.toString()}
                      className="w-24 px-2 py-1 text-right text-xs font-bold border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>

                {/* Quick denomination chips */}
                <div className="flex gap-1.5 justify-end">
                  {[100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashTendered(amt.toString())}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-gray-200 hover:bg-gray-100 rounded text-gray-700"
                    >
                      ₹{amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashTendered(roundedGrandTotal.toString())}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 hover:bg-emerald-200 rounded text-emerald-800"
                  >
                    Exact
                  </button>
                </div>

                {changeToReturn > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-700 pt-1 border-t border-slate-200">
                    <span>Change to Return:</span>
                    <span className="text-sm font-extrabold">{formatINR(changeToReturn)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Checkout CTA Button */}
          <button
            type="button"
            disabled={cart.length === 0 || isSubmitting}
            onClick={handleCheckout}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Complete Sale & Print Receipt</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Barcode Scanner Camera Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(scannedBarcode) => {
          handleBarcodeScanned(scannedBarcode);
          setIsScannerOpen(false);
        }}
      />

      {/* Print Receipt Modal */}
      {createdSale && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            setCreatedSale(null);
          }}
          sale={createdSale}
          shop={shop}
        />
      )}
    </div>
  );
};
