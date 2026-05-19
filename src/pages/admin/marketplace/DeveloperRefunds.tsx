import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import saasApi from '@/services/saasApi';

export default function DeveloperRefunds() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = () => {
    setLoading(true);
    saasApi.get('/api/v1/marketplace/developer/refunds')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setRefunds(data);
      })
      .catch((err) => {
        console.error('Failed to fetch refund requests:', err);
        setRefunds([]); // Graceful fallback
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await saasApi.post(`/api/v1/marketplace/developer/refunds/${id}/${action}`);
      setMessage(`Refund request successfully ${action}d.`);
      loadData();
    } catch {
      setError(`Failed to process refund ${action} action.`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-primary-600 animate-spin" style={{ animationDuration: '4s' }} />
          Refund Requests
        </h1>
        <p className="text-sm text-gray-500 mt-1">Review and process refund requests initiated by subscribers.</p>
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
        <div className="text-center py-12 text-gray-400">Loading refund requests...</div>
      ) : refunds.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Application</th>
                  <th className="px-6 py-3.5">Refund Value</th>
                  <th className="px-6 py-3.5">Reason</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {refunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 leading-none">{refund.user_email}</p>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{refund.app_name}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">${refund.amount}</td>
                    <td className="px-6 py-4 text-gray-500">{refund.reason || 'No reason provided'}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleAction(refund.id, 'approve')}
                        className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleAction(refund.id, 'reject')}
                        className="inline-flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
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
          <h2 className="text-lg font-bold text-gray-800">No refunds requested</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">There are no incoming refund dispute claims to process.</p>
        </div>
      )}
    </div>
  );
}
