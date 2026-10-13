import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  ShieldCheck,
  Download,
  Upload,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';

export const Settings: React.FC = () => {
  const { shop, settings, refreshShop } = useAuth();

  // Shop Profile state
  const [shopName, setShopName] = useState(shop?.name || '');
  const [ownerName, setOwnerName] = useState(shop?.ownerName || '');
  const [phone, setPhone] = useState(shop?.phone || '');
  const [address, setAddress] = useState(shop?.address || '');
  const [gstin, setGstin] = useState(shop?.gstin || '');
  const [invoicePrefix, setInvoicePrefix] = useState(shop?.invoicePrefix || 'KM-');
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Settings state
  const [taxEnabled, setTaxEnabled] = useState(settings?.taxEnabled ?? true);
  const [defaultGstRate, setDefaultGstRate] = useState(settings?.defaultGstRate?.toString() || '5');
  const [taxInclusive, setTaxInclusive] = useState(settings?.taxInclusive ?? true);
  const [allowNegativeStock, setAllowNegativeStock] = useState(settings?.allowNegativeStock ?? false);
  const [lowStockDefault, setLowStockDefault] = useState(settings?.lowStockDefault?.toString() || '5');
  const [thermalWidth, setThermalWidth] = useState(settings?.thermalPrinterWidth || '80mm');
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Database Backup / Restore state
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (shop) {
      setShopName(shop.name);
      setOwnerName(shop.ownerName);
      setPhone(shop.phone);
      setAddress(shop.address || '');
      setGstin(shop.gstin || '');
      setInvoicePrefix(shop.invoicePrefix || 'KM-');
    }
    if (settings) {
      setTaxEnabled(settings.taxEnabled);
      setDefaultGstRate(settings.defaultGstRate.toString());
      setTaxInclusive(settings.taxInclusive);
      setAllowNegativeStock(settings.allowNegativeStock);
      setLowStockDefault(settings.lowStockDefault.toString());
      setThermalWidth(settings.thermalPrinterWidth);
    }
  }, [shop, settings]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    try {
      await apiRequest('/shop', {
        method: 'PUT',
        body: JSON.stringify({
          name: shopName,
          ownerName,
          phone,
          address,
          gstin,
          invoicePrefix,
        }),
      });
      await refreshShop();
      setProfileSuccess('Shop profile updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess(null);
    try {
      await apiRequest('/shop/settings', {
        method: 'PUT',
        body: JSON.stringify({
          taxEnabled,
          defaultGstRate: Number(defaultGstRate),
          taxInclusive,
          allowNegativeStock,
          lowStockDefault: Number(lowStockDefault),
          thermalPrinterWidth: thermalWidth,
        }),
      });
      await refreshShop();
      setSettingsSuccess('Billing and stock policies saved!');
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    try {
      const res = await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordMsg({ type: 'success', text: res.message || 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    }
  };

  const handleDownloadBackup = () => {
    window.open('/api/backup/download', '_blank');
  };

  const handleRestoreDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) return;

    if (!window.confirm('Are you sure you want to restore the database? An automatic safety backup of your existing data will be saved.')) {
      return;
    }

    setIsRestoring(true);
    setRestoreMsg(null);
    try {
      const formData = new FormData();
      formData.append('dbFile', restoreFile);

      const res = await apiRequest('/backup/restore', {
        method: 'POST',
        body: formData,
      });

      setRestoreMsg(res.message);
      await refreshShop();
    } catch (err: any) {
      setRestoreMsg(`Restore failed: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Settings & Store Configuration</h1>
        <p className="text-xs text-gray-500 mt-1">
          Configure shop details, invoice preferences, tax rates, data backups, and security
        </p>
      </div>

      {/* 1. Shop Profile Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Store className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-gray-900">Shop Profile & Branding</h2>
        </div>

        {profileSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs border border-emerald-200">
            {profileSuccess}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Store / Shop Name *</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Proprietor / Owner Name *</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="07AAAAA0000A1Z5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Bill / Invoice Prefix</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Full Shop Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm"
            >
              Update Store Profile
            </button>
          </div>
        </form>
      </div>

      {/* 2. Billing, Tax & Stock Preferences */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Receipt className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-gray-900">Billing, GST & Stock Policies</h2>
        </div>

        {settingsSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs border border-emerald-200">
            {settingsSuccess}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Enable Tax / GST</label>
              <select
                value={taxEnabled ? 'true' : 'false'}
                onChange={(e) => setTaxEnabled(e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled (0% Tax)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Default GST Rate (%)</label>
              <select
                value={defaultGstRate}
                onChange={(e) => setDefaultGstRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
              >
                <option value="0">0% (Nil)</option>
                <option value="5">5% (Groceries & Staples)</option>
                <option value="12">12% (Packaged Food)</option>
                <option value="18">18% (Personal & Home Care)</option>
                <option value="28">28% (Beverages / Luxury)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Tax Calculation</label>
              <select
                value={taxInclusive ? 'true' : 'false'}
                onChange={(e) => setTaxInclusive(e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
              >
                <option value="true">Tax Inclusive (Prices include GST)</option>
                <option value="false">Tax Exclusive (GST added at billing)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Negative Stock Policy</label>
              <select
                value={allowNegativeStock ? 'true' : 'false'}
                onChange={(e) => setAllowNegativeStock(e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
              >
                <option value="false">Disallow (Block sale if stock insufficient)</option>
                <option value="true">Allow (Permit sales even if 0 stock)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Default Low Stock Alert</label>
              <input
                type="number"
                value={lowStockDefault}
                onChange={(e) => setLowStockDefault(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Thermal Receipt Format</label>
              <select
                value={thermalWidth}
                onChange={(e) => setThermalWidth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
              >
                <option value="80mm">80mm (Standard POS)</option>
                <option value="58mm">58mm (Compact Mobile Printer)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm"
            >
              Save Billing & Stock Policies
            </button>
          </div>
        </form>
      </div>

      {/* 3. Database Backup & Safety Restore */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Download className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-gray-900">Database Backup & Safety Restore</h2>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Your shop data is stored reliably in a local SQLite database (<code className="bg-gray-100 px-1 py-0.5 rounded font-mono">kiranamate.db</code>).
          You can download a complete backup copy at any time or restore an earlier database file.
        </p>

        {restoreMsg && (
          <div className="p-3 bg-slate-100 text-gray-800 rounded-xl text-xs border border-gray-300">
            {restoreMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Download Backup */}
          <div className="p-4 bg-slate-50 rounded-xl border border-gray-200 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="font-bold text-gray-900 text-xs">Download Database Backup</h3>
              <p className="text-[11px] text-gray-500 mt-1">
                Save a timestamped copy of all products, bills, stock movements, and customers to your computer.
              </p>
            </div>
            <button
              onClick={handleDownloadBackup}
              className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download kiranamate-backup.db
            </button>
          </div>

          {/* Restore Database */}
          <form onSubmit={handleRestoreDatabase} className="p-4 bg-slate-50 rounded-xl border border-gray-200 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="font-bold text-gray-900 text-xs">Restore from Backup File</h3>
              <p className="text-[11px] text-gray-500 mt-1">
                Upload a valid <code className="font-mono">.db</code> file. An automatic safety copy of your current data is saved before restoring.
              </p>
              <input
                type="file"
                accept=".db"
                required
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                className="mt-2 text-xs w-full"
              />
            </div>
            <button
              type="submit"
              disabled={!restoreFile || isRestoring}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {isRestoring ? 'Restoring...' : 'Restore Database'}
            </button>
          </form>
        </div>
      </div>

      {/* 4. Change Password */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Lock className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-gray-900">Change Account Password</h2>
        </div>

        {passwordMsg && (
          <div
            className={`p-3 rounded-xl text-xs border ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 text-xs max-w-md">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Current Password *</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">New Password (min 6 characters) *</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Confirm New Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
