import React, { useState, useEffect } from 'react';
import { History, Download, ShieldCheck, AlertTriangle } from 'lucide-react';
import saasApi from '@/services/saasApi';

export default function PurchaseHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    saasApi.get('/api/v1/marketplace/my/orders')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setOrders(data);
      })
      .catch((err) => {
        console.error('Failed to fetch orders:', err);
        setOrders([]); // Graceful fallback
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-primary-600" />
          Purchase History
        </h1>
        <p className="text-sm text-gray-500 mt-1">Access past invoices, orders, and download receipts easily.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading purchase history...</div>
      ) : orders.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-3.5">Order ID</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Application</th>
                  <th className="px-6 py-3.5">Plan</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => {
                  const statusColor = order.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : order.status === 'cancelled'
                    ? 'bg-red-50 text-red-600 border-red-100'
                    : 'bg-gray-50 text-gray-500 border-gray-200';
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-gray-600">{order.id?.slice(0, 14)}</td>
                      <td className="px-6 py-4 text-gray-500">{order.date || 'N/A'}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{order.app_name}</td>
                      <td className="px-6 py-4 text-gray-600">{order.plan}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{order.amount}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusColor}`}>
                          <ShieldCheck className="w-3 h-3" /> {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700 font-bold transition-all text-xs">
                          <Download className="w-3.5 h-3.5" /> Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-lg font-bold text-gray-800">No purchase history</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">You have not completed any payments yet.</p>
        </div>
      )}
    </div>
  );
}
