import React, { useState, useEffect } from 'react';
import {
  ScanLine,
  Camera,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Package,
  ShoppingCart,
  ArrowRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Product } from '../types';
import { apiRequest } from '../lib/api';
import { formatINR, playBeep } from '../lib/utils';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

interface BarcodeScannerPageProps {
  onNavigate: (tab: string, state?: any) => void;
}

export const BarcodeScannerPage: React.FC<BarcodeScannerPageProps> = ({ onNavigate }) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const lookupBarcode = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    setScannedBarcode(clean);
    setLoading(true);
    setNotFound(false);
    setProduct(null);

    try {
      const res = await apiRequest(`/products/barcode/${clean}`);
      if (res.success && res.product) {
        setProduct(res.product);
        playBeep('success');
      } else {
        setNotFound(true);
        playBeep('error');
      }
    } catch (err) {
      setNotFound(true);
      playBeep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      lookupBarcode(barcodeInput.trim());
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <ScanLine className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Barcode Scanner</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Scan retail barcodes using device camera or manual input to inspect products & stock
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Open Camera Scanner</span>
          </button>
        </div>
      </div>

      {/* Manual Input Search Box */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
          Manual Barcode Lookup
        </h2>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Enter EAN-13, EAN-8, UPC, or Code-128 number (e.g. 8901030383457)..."
              className="w-full pl-9 pr-3 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
          >
            {loading ? 'Searching...' : 'Lookup'}
          </button>
        </form>
      </div>

      {/* Scanner Result Card */}
      {loading && (
        <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-medium">Looking up product in shop database...</p>
        </div>
      )}

      {!loading && product && (
        <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500/80 shadow-lg space-y-6 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Product Found
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">{product.name}</h3>
                <p className="text-xs text-gray-500">Barcode: <span className="font-mono font-semibold text-gray-700">{product.barcode}</span></p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-2xl font-black text-emerald-700">{formatINR(product.sellingPrice)}</span>
              {product.mrp && product.mrp > product.sellingPrice && (
                <p className="text-xs text-gray-400 line-through">MRP: {formatINR(product.mrp)}</p>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl text-xs">
            <div>
              <span className="text-[10px] text-gray-500 font-semibold block">Category</span>
              <span className="font-medium text-gray-800">{product.category?.name || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-semibold block">Current Stock</span>
              <span className={`font-bold ${product.stockQuantity <= product.lowStockThreshold ? 'text-amber-600' : 'text-gray-900'}`}>
                {product.stockQuantity} {product.unit}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-semibold block">Purchase Cost</span>
              <span className="font-medium text-gray-800">{formatINR(product.purchaseCost)}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-semibold block">SKU</span>
              <span className="font-mono text-gray-700">{product.sku || '-'}</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigate('pos')}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Go to POS & Add to Bill</span>
            </button>
            <button
              onClick={() => onNavigate('products', { editProductId: product.id })}
              className="px-4 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
            >
              Edit Product Details
            </button>
          </div>
        </div>
      )}

      {/* Not Found in Database state */}
      {!loading && notFound && scannedBarcode && (
        <div className="bg-white p-6 rounded-2xl border-2 border-amber-300 shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Barcode Not Found in Shop Database
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                No product is currently registered with barcode <span className="font-mono font-bold text-gray-800">{scannedBarcode}</span>.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Would you like to register this new product now?
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onNavigate('products', { newBarcode: scannedBarcode })}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Product With This Barcode</span>
            </button>
          </div>
        </div>
      )}

      {/* Barcode Camera Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code) => {
          setIsScannerOpen(false);
          lookupBarcode(code);
        }}
      />
    </div>
  );
};
