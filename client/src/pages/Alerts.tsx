import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  PackageX,
  Clock,
  CalendarX,
  Truck,
  RefreshCw,
  PlusCircle,
  ArrowRight,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { formatINR, formatDate } from '../lib/utils';
import { Product } from '../types';

interface AlertsProps {
  onNavigate: (tab: string, state?: any) => void;
}

export const Alerts: React.FC<AlertsProps> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'low' | 'out' | 'expiring' | 'expired'>('low');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/alerts');
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const summary = data?.summary || {
    lowStockCount: 0,
    outOfStockCount: 0,
    expiringSoonCount: 0,
    expiredCount: 0,
  };

  const currentList: Product[] =
    activeTab === 'low'
      ? data?.lowStock || []
      : activeTab === 'out'
      ? data?.outOfStock || []
      : activeTab === 'expiring'
      ? data?.expiringSoon || []
      : data?.expired || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Stock & Expiry Alerts</h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time proactive monitoring for inventory depletion and approaching product expiry dates
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors self-start sm:self-auto"
          title="Refresh alerts"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Summary / Filter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Low Stock */}
        <div
          onClick={() => setActiveTab('low')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'low'
              ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-300'
              : 'bg-white border-gray-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="text-2xl font-bold text-amber-700 mt-2">{summary.lowStockCount}</h3>
          <p className="text-[10px] text-gray-500 mt-1">Stock ≤ threshold</p>
        </div>

        {/* Out of Stock */}
        <div
          onClick={() => setActiveTab('out')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'out'
              ? 'bg-red-50/70 border-red-400 ring-2 ring-red-300'
              : 'bg-white border-gray-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Out of Stock</span>
            <PackageX className="w-4 h-4 text-red-600" />
          </div>
          <h3 className="text-2xl font-bold text-red-700 mt-2">{summary.outOfStockCount}</h3>
          <p className="text-[10px] text-gray-500 mt-1">0 items remaining</p>
        </div>

        {/* Expiring Soon */}
        <div
          onClick={() => setActiveTab('expiring')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'expiring'
              ? 'bg-orange-50/70 border-orange-400 ring-2 ring-orange-300'
              : 'bg-white border-gray-200 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Expiring Soon</span>
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <h3 className="text-2xl font-bold text-orange-700 mt-2">{summary.expiringSoonCount}</h3>
          <p className="text-[10px] text-gray-500 mt-1">Within 30 days</p>
        </div>

        {/* Expired */}
        <div
          onClick={() => setActiveTab('expired')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'expired'
              ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-300'
              : 'bg-white border-gray-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Expired</span>
            <CalendarX className="w-4 h-4 text-rose-600" />
          </div>
          <h3 className="text-2xl font-bold text-rose-700 mt-2">{summary.expiredCount}</h3>
          <p className="text-[10px] text-gray-500 mt-1">Past expiry date</p>
        </div>
      </div>

      {/* Alerts Items Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">
            {activeTab === 'low' && 'Low-Stock Products Requiring Reorder'}
            {activeTab === 'out' && 'Out-of-Stock Products (Depleted)'}
            {activeTab === 'expiring' && 'Products Approaching Expiry Within 30 Days'}
            {activeTab === 'expired' && 'Expired Inventory Items'}
          </h3>
          <span className="text-xs text-gray-400 font-medium">{currentList.length} items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-gray-500 border-b border-gray-200">
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold text-center">Current Stock</th>
                <th className="py-3 px-4 font-semibold text-center">Threshold</th>
                <th className="py-3 px-4 font-semibold text-center">Suggested Restock</th>
                <th className="py-3 px-4 font-semibold text-right">Selling Price</th>
                <th className="py-3 px-4 font-semibold">Expiry Date</th>
                <th className="py-3 px-4 font-semibold text-center">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    Loading alerts...
                  </td>
                </tr>
              ) : currentList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-emerald-600 font-medium">
                    ✓ All clear! No items currently flagged under this alert category.
                  </td>
                </tr>
              ) : (
                currentList.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900 block">{p.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {p.barcode || p.sku || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{p.category?.name || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        p.stockQuantity <= 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.stockQuantity} {p.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-gray-500">
                      {p.lowStockThreshold} {p.unit}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                        +{p.suggestedRestock || 10} {p.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {formatINR(p.sellingPrice)}
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono">
                      {formatDate(p.expiryDate)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onNavigate('purchases')}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Restock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
