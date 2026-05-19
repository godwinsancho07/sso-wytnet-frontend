import React, { useState, useEffect } from 'react';
import { Settings, BarChart3, AlertTriangle, ShieldCheck } from 'lucide-react';
import saasApi from '@/services/saasApi';

export default function MarketplaceSettings() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feePercentage, setFeePercentage] = useState('20');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    saasApi.get('/api/v1/admin/marketplace/revenue')
      .then((res) => {
        setData(res.data || {});
      })
      .catch((err) => {
        console.error('Failed to fetch platform earnings:', err);
        setData({}); // Graceful fallback
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await saasApi.post('/api/v1/admin/marketplace/settings', { fee_percentage: Number(feePercentage) });
      setMessage('Platform commission fee settings successfully updated!');
    } catch {
      setError('Failed to save settings.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary-600 animate-pulse" />
            Marketplace Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">Configure platform commission models and track platform earnings.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading settings...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gross platform transacted</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2">${data.gross || '0.00'}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 border border-primary-100">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Platform Earnings (20%)</p>
                  <p className="text-3xl font-extrabold text-emerald-600 mt-2">${data.platform || '0.00'}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900">Commission Rate</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Platform Split Fee (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={feePercentage}
                onChange={(e) => setFeePercentage(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                required
              />
              <p className="text-[10px] text-gray-400">Standard contract is set to 20% platform share.</p>
            </div>

            <button
              type="submit"
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-xs font-semibold shadow-sm transition-all hover:scale-105"
            >
              Save Configuration
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
