import React, { useState } from 'react';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';
import { Sale, Shop } from '../types';
import { formatINR, formatDateTime } from '../lib/utils';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  shop: Shop | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  shop,
}) => {
  const [format, setFormat] = useState<'thermal' | 'a4'>('thermal');

  if (!isOpen || !sale || !shop) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-8 overflow-hidden flex flex-col border border-gray-100 animate-in fade-in zoom-in-95">
        {/* Modal Top Bar (hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-800">
              Bill Receipt #{sale.invoiceNumber}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Format toggle */}
            <div className="flex bg-gray-200 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setFormat('thermal')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  format === 'thermal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Thermal (80mm)
              </button>
              <button
                type="button"
                onClick={() => setFormat('a4')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  format === 'a4' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Tax Invoice (A4)
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh] flex justify-center bg-gray-100/50 print:p-0 print:bg-white print:max-h-none">
          {format === 'thermal' ? (
            /* THERMAL RECEIPT (80mm) */
            <div
              id="printable-receipt"
              className="w-full max-w-[340px] bg-white p-5 shadow-sm border border-gray-200 font-mono text-xs text-gray-900 print:border-none print:shadow-none print:p-0 print:w-full"
            >
              <div className="text-center pb-3 border-b border-dashed border-gray-300">
                <h2 className="text-base font-bold uppercase tracking-wide">{shop.name}</h2>
                <p className="text-[11px] text-gray-600 mt-0.5">{shop.address}</p>
                <p className="text-[11px] text-gray-600">Phone: {shop.phone}</p>
                {shop.gstin && <p className="text-[11px] text-gray-600 font-semibold">GSTIN: {shop.gstin}</p>}
              </div>

              <div className="py-2.5 border-b border-dashed border-gray-300 text-[11px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Bill No:</span>
                  <span className="font-bold">{sale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{formatDateTime(sale.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{sale.customerName || 'Walk-in Customer'}</span>
                </div>
                {sale.customerPhone && (
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span>{sale.customerPhone}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="py-2.5 border-b border-dashed border-gray-300">
                <div className="grid grid-cols-12 font-bold pb-1 text-[11px]">
                  <span className="col-span-6">Item</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>
                {sale.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 py-1 text-[11px]">
                    <span className="col-span-6 truncate font-medium">{item.productName}</span>
                    <span className="col-span-2 text-center">{item.quantity}</span>
                    <span className="col-span-2 text-right">₹{item.unitPrice.toFixed(0)}</span>
                    <span className="col-span-2 text-right font-bold">₹{item.lineTotal.toFixed(0)}</span>
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div className="py-2.5 border-b border-dashed border-gray-300 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatINR(sale.subtotal)}</span>
                </div>
                {sale.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span>- {formatINR(sale.discountTotal)}</span>
                  </div>
                )}
                {sale.taxTotal > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (GST):</span>
                    <span>+ {formatINR(sale.taxTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-300">
                  <span>GRAND TOTAL:</span>
                  <span>{formatINR(sale.grandTotal)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="py-2.5 border-b border-dashed border-gray-300 text-[11px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Payment Mode:</span>
                  <span className="font-bold">{sale.paymentMethod}</span>
                </div>
                {sale.paymentMethod === 'CASH' && sale.cashTendered !== null && sale.cashTendered !== undefined && (
                  <>
                    <div className="flex justify-between">
                      <span>Cash Received:</span>
                      <span>{formatINR(sale.cashTendered)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>Change Returned:</span>
                      <span>{formatINR(sale.changeGiven || 0)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="text-center pt-3 text-[10px] text-gray-500 space-y-1">
                <p className="font-semibold text-gray-700">Thank you for shopping with us!</p>
                <p>Please visit again • Goods once sold can be returned within 3 days with bill</p>
                <p className="text-[9px] text-gray-400">Powered by KiranaMate</p>
              </div>
            </div>
          ) : (
            /* A4 TAX INVOICE FORMAT */
            <div
              id="printable-invoice"
              className="w-full bg-white p-8 shadow-sm border border-gray-200 text-sm text-gray-900 print:border-none print:shadow-none print:p-0"
            >
              {/* Header */}
              <div className="flex justify-between items-start pb-6 border-b border-gray-200">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{shop.name}</h1>
                  <p className="text-sm text-gray-600 mt-1">{shop.address}</p>
                  <p className="text-sm text-gray-600">Phone: {shop.phone}</p>
                  {shop.gstin && <p className="text-sm text-gray-700 font-semibold mt-1">GSTIN: {shop.gstin}</p>}
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded uppercase tracking-wider mb-2">
                    Tax Invoice
                  </span>
                  <p className="font-bold text-base text-gray-800">Invoice #{sale.invoiceNumber}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Date: {formatDateTime(sale.createdAt)}</p>
                </div>
              </div>

              {/* Bill To */}
              <div className="py-4 border-b border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Billed To</h4>
                <p className="font-semibold text-gray-800">{sale.customerName || 'Walk-in Customer'}</p>
                {sale.customerPhone && <p className="text-xs text-gray-600">Phone: {sale.customerPhone}</p>}
              </div>

              {/* Item Table */}
              <div className="py-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="py-2 font-semibold">#</th>
                      <th className="py-2 font-semibold">Item Description</th>
                      <th className="py-2 font-semibold text-right">Qty</th>
                      <th className="py-2 font-semibold text-right">Unit Price</th>
                      <th className="py-2 font-semibold text-right">Discount</th>
                      <th className="py-2 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sale.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 text-gray-400">{idx + 1}</td>
                        <td className="py-2.5 font-medium text-gray-800">{it.productName}</td>
                        <td className="py-2.5 text-right font-medium">{it.quantity}</td>
                        <td className="py-2.5 text-right text-gray-600">{formatINR(it.unitPrice)}</td>
                        <td className="py-2.5 text-right text-emerald-600">{it.discount > 0 ? `-${formatINR(it.discount)}` : '-'}</td>
                        <td className="py-2.5 text-right font-bold text-gray-900">{formatINR(it.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>{formatINR(sale.subtotal)}</span>
                  </div>
                  {sale.discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Total Discounts:</span>
                      <span>-{formatINR(sale.discountTotal)}</span>
                    </div>
                  )}
                  {sale.taxTotal > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Taxes:</span>
                      <span>+{formatINR(sale.taxTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Grand Total:</span>
                    <span>{formatINR(sale.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 pt-1 text-[11px]">
                    <span>Payment Mode:</span>
                    <span className="font-medium uppercase">{sale.paymentMethod}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Bill
          </button>
        </div>
      </div>
    </div>
  );
};
