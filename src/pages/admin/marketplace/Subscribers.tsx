import React, { useState, useEffect } from 'react';
import { Users, Search, AlertTriangle, ShieldCheck } from 'lucide-react';
import saasApi from '@/services/saasApi';

export default function Subscribers() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    saasApi.get('/api/v1/marketplace/developer/subscribers')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setSubscribers(data);
      })
      .catch((err) => {
        console.error('Failed to fetch subscribers:', err);
        setSubscribers([]); // Graceful fallback
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-600" />
            Active Subscribers
          </h1>
          <p className="text-sm text-gray-500 mt-1">Review all active users paying monthly subscriptions for your products.</p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading subscribers...</div>
      ) : subscribers.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-3.5">Subscriber</th>
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-6 py-3.5">Plan Selected</th>
                  <th className="px-6 py-3.5">Monthly Paid</th>
                  <th className="px-6 py-3.5">Join Date</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subscribers.filter(s => s.user_email?.toLowerCase().includes(search.toLowerCase())).map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 font-bold text-xs flex items-center justify-center border border-primary-100">
                          {sub.user_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 leading-none">{sub.user_name}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{sub.user_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{sub.app_name}</td>
                    <td className="px-6 py-4 text-gray-600">{sub.plan_name}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{sub.price}</td>
                    <td className="px-6 py-4 text-gray-500">{sub.created_at ? new Date(sub.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <ShieldCheck className="w-3 h-3" /> {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-lg font-bold text-gray-800">No active subscribers</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">Active client connections will appear once users subscribe to your platform.</p>
        </div>
      )}
    </div>
  );
}
