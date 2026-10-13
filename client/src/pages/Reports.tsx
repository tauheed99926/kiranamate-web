import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  IndianRupee,
  Receipt,
  TrendingUp,
  CreditCard,
  PieChart as PieIcon,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { apiRequest } from '../lib/api';
import { formatINR } from '../lib/utils';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

export const Reports: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await apiRequest(`/reports/analytics?${params.toString()}`);
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
    fetchAnalytics();
  }, [startDate, endDate]);

  const handleQuickFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    window.open(`/api/reports/export/csv?${params.toString()}`, '_blank');
  };

  const summary = data?.summary || {
    totalRevenue: 0,
    completedBillsCount: 0,
    averageBillValue: 0,
    totalDiscounts: 0,
    totalTax: 0,
    estimatedGrossProfit: 0,
    totalPurchasesAmount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header and Export Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Reports & Business Analytics</h1>
          <p className="text-xs text-gray-500 mt-1">
            Revenue trends, profit estimation, category performance, and payment breakdown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Pills */}
          <button
            onClick={() => handleQuickFilter(0)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            Today
          </button>
          <button
            onClick={() => handleQuickFilter(7)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            7 Days
          </button>
          <button
            onClick={() => handleQuickFilter(30)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            30 Days
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Date Range Inputs */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold text-gray-700">Filter Custom Period:</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg outline-none"
        />
        <span className="text-gray-400">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg outline-none"
        />
        {(startDate || endDate) && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="text-xs text-red-600 hover:underline ml-2"
          >
            Reset
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-gray-500">Period Revenue</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatINR(summary.totalRevenue)}</h3>
          <p className="text-[11px] text-gray-500 mt-1">{summary.completedBillsCount} bill(s) completed</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-gray-500">Avg Bill Value</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatINR(summary.averageBillValue)}</h3>
          <p className="text-[11px] text-gray-500 mt-1">Per transaction ticket size</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-gray-500">Gross Profit (Est.)</span>
          <h3 className="text-2xl font-bold text-emerald-700 mt-2">{formatINR(summary.estimatedGrossProfit)}</h3>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">From recorded purchase costs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-gray-500">Restock Spend</span>
          <h3 className="text-2xl font-bold text-blue-700 mt-2">{formatINR(summary.totalPurchasesAmount)}</h3>
          <p className="text-[11px] text-gray-500 mt-1">Purchases during period</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Revenue Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Sales by Category</h3>
          <p className="text-xs text-gray-500 mb-4">Revenue distribution across product departments</p>

          <div className="h-64 w-full">
            {(!data?.categoryBreakdown || data.categoryBreakdown.length === 0) ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                No category sales recorded during this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.name} (${Math.round((entry.value / summary.totalRevenue) * 100 || 0)}%)`}
                    fontSize={11}
                  >
                    {data.categoryBreakdown.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatINR(val)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Payment Method Distribution</h3>
          <p className="text-xs text-gray-500 mb-4">Cash vs UPI QR vs Card collections</p>

          <div className="h-64 w-full">
            {(!data?.paymentBreakdown || data.paymentBreakdown.length === 0) ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                No payment data for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.paymentBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(val: any) => [formatINR(val), 'Amount Collected']} />
                  <Bar dataKey="value" fill="#059669" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
