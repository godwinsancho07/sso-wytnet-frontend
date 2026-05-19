import React, { useState, useEffect } from 'react';
import { Layers, AlertTriangle, Trash2, CheckCircle, Clock } from 'lucide-react';
import saasApi from '@/services/saasApi';

export default function AllListings() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = () => {
    setLoading(true);
    saasApi.get('/api/v1/admin/marketplace/all')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setListings(data);
      })
      .catch((err) => {
        console.error('Failed to fetch master directory:', err);
        setListings([]); // Graceful fallback
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this app listing?')) return;
    try {
      await saasApi.post(`/api/v1/admin/marketplace/${id}/reject`); // Or custom delete endpoint
      setMessage('Listing has been successfully removed from store.');
      loadData();
    } catch {
      setError('Failed to remove application listing.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Layers className="w-6 h-6 text-primary-600" />
          Master Directory
        </h1>
        <p className="text-sm text-gray-500 mt-1">Review, moderate, and remove any active listings on the platform storefront.</p>
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
        <div className="text-center py-12 text-gray-400">Loading master directory...</div>
      ) : listings.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-3.5">Logo</th>
                  <th className="px-6 py-3.5">Application</th>
                  <th className="px-6 py-3.5">Pricing</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {listings.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <img src={app.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=64&h=64&fit=crop'} alt={app.title} className="w-10 h-10 rounded object-cover border border-gray-100 bg-gray-50" />
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 leading-none">{app.title}</p>
                      <span className="text-[10px] text-primary-600 font-semibold bg-primary-50 px-2 py-0.5 rounded-full mt-1.5 inline-block">{app.category || 'App'}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{app.price || 'Free'}</td>
                    <td className="px-6 py-4">
                      {app.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <CheckCircle className="w-3.5 h-3.5" /> Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-bold transition-all text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
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
          <h2 className="text-lg font-bold text-gray-800">Master directory empty</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">Once developers submit listings, they will show up here.</p>
        </div>
      )}
    </div>
  );
}
