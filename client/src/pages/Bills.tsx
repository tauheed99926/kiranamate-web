import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Eye,
  RotateCcw,
  Ban,
  Calendar,
  X,
  Printer,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Sale } from '../types';
import { apiRequest } from '../lib/api';
import { formatINR, formatDateTime } from '../lib/utils';
import { ReceiptModal } from '../components/ReceiptModal';
import { useAuth } from '../context/AuthContext';

export const Bills: React.FC = () => {
  const { shop } = useAuth();
  const [bills, setBills] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Bill & Action Modals
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [cancelModalSale, setCancelModalSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('Customer return / Mistake');
  const [returnModalSale, setReturnModalSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<{ [productId: string]: number }>({});
  const [returnReason, setReturnReason] = useState('Defective or returned product');

  const fetchBills = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search,
        status,
        paymentMethod,
        startDate,
        endDate,
        page: String(page),
        limit: '20',
      });

      const res = await apiRequest(`/bills?${queryParams.toString()}`);
      if (res.success) {
        setBills(res.bills);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
      }
    } catch (err) {
      console.error('Failed to load bills', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [search, status, paymentMethod, startDate, endDate, page]);

  const handleCancelBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalSale) return;

    try {
      await apiRequest(`/bills/${cancelModalSale.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason }),
      });

      setCancelModalSale(null);
      fetchBills();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel bill.');
    }
  };

  const handleReturnBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalSale) return;

    const itemsToReturn = Object.entries(returnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const item = returnModalSale.items.find((i) => i.productId === productId);
        return {
          productId,
          quantity: qty,
          refundPrice: item?.unitPrice || 0,
        };
      });

    if (itemsToReturn.length === 0) {
      alert('Please specify quantity to return for at least one item.');
      return;
    }

    try {
      await apiRequest(`/bills/${returnModalSale.id}/return`, {
        method: 'POST',
        body: JSON.stringify({
          items: itemsToReturn,
          reason: returnReason,
        }),
      });

      setReturnModalSale(null);
      fetchBills();
    } catch (err: any) {
      alert(err.message || 'Failed to process return.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Sales & Previous Bills</h1>
        <p className="text-xs text-gray-500 mt-1">
          Complete audit history of customer transactions, receipts, returns, and inventory restoration ({totalCount} total bills)
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by invoice number, customer name, or phone..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-gray-300 rounded-xl outline-none bg-white text-gray-700"
        >
          <option value="all">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="RETURNED">Returned</option>
        </select>

        <select
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs border border-gray-300 rounded-xl outline-none bg-white text-gray-700"
        >
          <option value="all">All Payment Modes</option>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="CARD">Card</option>
          <option value="SPLIT">Split</option>
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-xl outline-none"
            title="Start Date"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-xl outline-none"
            title="End Date"
          />
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-gray-500 border-b border-gray-200">
                <th className="py-3 px-4 font-semibold">Invoice No</th>
                <th className="py-3 px-4 font-semibold">Date & Time</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold text-center">Items</th>
                <th className="py-3 px-4 font-semibold">Payment Mode</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    Loading sales records...
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No bills match your current filters.
                  </td>
                </tr>
              ) : (
                bills.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatDateTime(sale.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-800 block">
                        {sale.customerName || 'Walk-in Customer'}
                      </span>
                      {sale.customerPhone && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {sale.customerPhone}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-700">
                      {sale.items?.length || 0}
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
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sale.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sale.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          title="View & Print Receipt"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {sale.status === 'COMPLETED' && (
                          <>
                            <button
                              onClick={() => {
                                setReturnModalSale(sale);
                                setReturnItems({});
                              }}
                              title="Process Return & Restock"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setCancelModalSale(sale)}
                              title="Cancel Bill & Restore Stock"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page {page} of {totalPages} ({totalCount} total bills)
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

      {/* Cancel Bill Modal */}
      {cancelModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 p-6 space-y-4 text-xs animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">
                Cancel Bill #{cancelModalSale.invoiceNumber}
              </h3>
              <button onClick={() => setCancelModalSale(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-red-50 text-red-800 rounded-xl space-y-1">
              <p className="font-semibold">Warning: This action will:</p>
              <ul className="list-disc list-inside text-[11px] space-y-0.5">
                <li>Mark the bill as CANCELLED.</li>
                <li>Automatically return all item quantities back to available inventory.</li>
                <li>Record StockMovement audit records for stock restoration.</li>
              </ul>
            </div>

            <form onSubmit={handleCancelBill} className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Reason for Cancellation</label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalSale(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Confirm Cancellation & Restore Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Items Modal */}
      {returnModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-100 p-6 space-y-4 text-xs animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">
                Process Return for Bill #{returnModalSale.invoiceNumber}
              </h3>
              <button onClick={() => setReturnModalSale(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-500">
              Select items being returned by customer. Returned quantities will be restored to store inventory.
            </p>

            <form onSubmit={handleReturnBill} className="space-y-4">
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                {returnModalSale.items.map((item) => (
                  <div key={item.productId} className="p-3 flex items-center justify-between bg-white hover:bg-slate-50">
                    <div>
                      <p className="font-semibold text-gray-800">{item.productName}</p>
                      <p className="text-[10px] text-gray-400">Sold: {item.quantity} @ {formatINR(item.unitPrice)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500">Return Qty:</span>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={returnItems[item.productId] || ''}
                        onChange={(e) =>
                          setReturnItems({
                            ...returnItems,
                            [item.productId]: Math.min(item.quantity, parseFloat(e.target.value) || 0),
                          })
                        }
                        placeholder="0"
                        className="w-16 px-2 py-1 text-center font-bold border border-gray-300 rounded-lg outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Return Reason</label>
                <input
                  type="text"
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnModalSale(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Process Return & Restore Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
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
