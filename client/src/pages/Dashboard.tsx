import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Receipt,
  Package,
  AlertTriangle,
  IndianRupee,
  PlusCircle,
  ScanLine,
  Truck,
  ArrowUpRight,
  Clock,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { apiRequest } from '../lib/api';
import { formatINR, formatDateTime } from '../lib/utils';
import { ReceiptModal } from '../components/ReceiptModal';
import { Sale } from '../types';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { shop } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/reports/dashboard');
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading store dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Welcome back, {shop?.ownerName || 'Store Owner'}! 👋
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time status of <span className="font-semibold text-gray-700">{shop?.name}</span> • All figures computed live from database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('pos')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all hover:shadow-emerald-200"
          >
            <PlusCircle className="w-4 h-4" />
            New Bill (POS)
          </button>
          <button
            onClick={() => onNavigate('scan')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all"
          >
            <ScanLine className="w-4 h-4 text-emerald-600" />
            Scan Barcode
          </button>
          <button
            onClick={() => onNavigate('purchases')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all"
          >
            <Truck className="w-4 h-4 text-emerald-600" />
            Restock
          </button>
          <button
            onClick={fetchDashboard}
            title="Refresh metrics"
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">
              {formatINR(data?.todaySales || 0)}
            </h3>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
              <Receipt className="w-3 h-3 text-emerald-600" />
              <span>{data?.todayBillsCount || 0} bill(s) today</span>
            </p>
          </div>
        </div>

        {/* Gross Profit Estimate */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Gross Profit (Est.)</span>
            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">
              {formatINR(data?.todayEstimatedGrossProfit || 0)}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              Based on wholesale cost recorded
            </p>
          </div>
        </div>

        {/* Total Products & Inventory Value */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Inventory Valuation</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">
              {formatINR(data?.totalInventoryValue || 0)}
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">
              {data?.totalProducts || 0} items ({data?.totalInventoryItems || 0} units)
            </p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => onNavigate('alerts')}
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs relative overflow-hidden cursor-pointer hover:border-amber-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Stock Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-gray-900">
                {(data?.lowStockCount || 0) + (data?.outOfStockCount || 0)}
              </h3>
              <span className="text-xs text-amber-600 font-semibold">items need restock</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {data?.outOfStockCount || 0} out of stock • {data?.lowStockCount || 0} low
            </p>
          </div>
        </div>
      </div>

      {/* Charts & Top Selling Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">7-Day Sales Trend</h3>
              <p className="text-xs text-gray-500">Daily revenue across the last week</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
            >
              Full Reports <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.weeklyTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val: any) => [formatINR(val), 'Revenue']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top-Selling Products */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Top-Selling Items</h3>
            <span className="text-[11px] text-gray-400 font-medium">Last 30 days</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {(!data?.topSelling || data.topSelling.length === 0) ? (
              <div className="text-center py-10 text-gray-400 text-xs">
                No recent sales recorded yet. Start billing items in POS!
              </div>
            ) : (
              data.topSelling.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-gray-800 truncate max-w-[140px]">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {item.quantity} sold
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-900">
                    {formatINR(item.revenue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Bills Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-gray-900">Recent Customer Bills</h3>
          </div>
          <button
            onClick={() => onNavigate('bills')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View All Bills <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-gray-500 border-b border-gray-100">
                <th className="py-3 px-4 font-semibold">Invoice No</th>
                <th className="py-3 px-4 font-semibold">Date & Time</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Items</th>
                <th className="py-3 px-4 font-semibold">Payment Mode</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!data?.recentBills || data.recentBills.length === 0) ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No bills generated yet. Create your first bill using POS!
                  </td>
                </tr>
              ) : (
                data.recentBills.map((sale: Sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatDateTime(sale.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {sale.customerName || 'Walk-in'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {sale.items?.length || 0} items
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {formatINR(sale.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        title="View & Print Receipt"
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

      {/* Receipt Modal */}
      {selectedSale && (
        <ReceiptModal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          sale={selectedSale}
          shop={shop}
        />
      )}
    </div>
  );
};
