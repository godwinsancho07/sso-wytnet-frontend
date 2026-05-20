import React, { useState, useEffect } from 'react';
import { Layers, AlertTriangle, CheckCircle, Clock, Globe, XCircle, AlertCircle, Shield } from 'lucide-react';
import saasApi from '@/services/saasApi';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  live:                { label: 'Live',           color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <Globe className="w-3 h-3" /> },
  approved:            { label: 'Approved',       color: 'bg-blue-50 text-blue-700 border-blue-100',         icon: <CheckCircle className="w-3 h-3" /> },
  integration_pending: { label: 'Integration',   color: 'bg-violet-50 text-violet-700 border-violet-100',   icon: <Clock className="w-3 h-3" /> },
  publish_pending:     { label: 'Publish Review', color: 'bg-amber-50 text-amber-700 border-amber-100',      icon: <Clock className="w-3 h-3" /> },
  pending_review:      { label: 'Under Review',   color: 'bg-amber-50 text-amber-700 border-amber-100',      icon: <Clock className="w-3 h-3" /> },
  rejected:            { label: 'Rejected',       color: 'bg-red-50 text-red-600 border-red-100',            icon: <XCircle className="w-3 h-3" /> },
  suspended:           { label: 'Suspended',      color: 'bg-gray-100 text-gray-500 border-gray-200',        icon: <AlertCircle className="w-3 h-3" /> },
};

export default function AllListings() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');

  const loadData = () => {
    setLoading(true);
    saasApi.get('/api/v1/admin/marketplace/all')
      .then((res) => setListings(Array.isArray(res.data) ? res.data : []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'publish' | 'suspend') => {
    const labels = { approve: 'approve', reject: 'reject', publish: 'publish', suspend: 'suspend' };
    if (!window.confirm(`Are you sure you want to ${labels[action]} this app?`)) return;
    try {
      await saasApi.post(`/api/v1/admin/marketplace/${id}/${action}`, {});
      setMessage(`App ${action}d successfully.`);
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } catch {
      setMessage(`Failed to ${action} app.`);
    }
  };

  const filtered = filter === 'all' ? listings : listings.filter(a => a.status === filter);
  const counts = listings.reduce((acc: Record<string, number>, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary-600" />
            Master Directory
          </h1>
          <p className="text-sm text-gray-500 mt-1">Review, moderate, and manage all listings on the platform storefront.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {[
            { key: 'all', label: `All (${listings.length})` },
            { key: 'live', label: `Live (${counts['live'] || 0})` },
            { key: 'pending_review', label: `Review (${counts['pending_review'] || 0})` },
            { key: 'publish_pending', label: `Publish (${counts['publish_pending'] || 0})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all text-xs border ${filter === key ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-700">{message}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading master directory...</div>
      ) : filtered.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-3.5">App</th>
                  <th className="px-6 py-3.5">Developer</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Pricing</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((app) => {
                  const cfg = STATUS_CONFIG[app.status] ?? { label: app.status, color: 'bg-gray-50 text-gray-500 border-gray-200', icon: null };
                  return (
                    <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center font-bold text-primary-700 text-sm flex-shrink-0">
                            {(app.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-none">{app.name}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[180px]">{app.url}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-800 text-xs">{app.developer?.name || '—'}</p>
                        <p className="text-[10px] text-gray-400">{app.developer?.email || ''}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] text-primary-600 font-semibold bg-primary-50 px-2 py-0.5 rounded-full">{app.category}</span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900 text-xs">{app.price || 'Free'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {app.status === 'pending_review' && (
                            <>
                              <button onClick={() => handleAction(app.id, 'approve')} className="text-[11px] font-bold text-blue-600 hover:text-blue-700 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-all">Approve</button>
                              <button onClick={() => handleAction(app.id, 'reject')} className="text-[11px] font-bold text-red-500 hover:text-red-600 px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-all">Reject</button>
                            </>
                          )}
                          {app.status === 'publish_pending' && (
                            <button onClick={() => handleAction(app.id, 'publish')} className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded border border-emerald-200 hover:bg-emerald-50 transition-all">Publish</button>
                          )}
                          {app.status === 'live' && (
                            <button onClick={() => handleAction(app.id, 'suspend')} className="text-[11px] font-bold text-amber-600 hover:text-amber-700 px-2 py-1 rounded border border-amber-200 hover:bg-amber-50 transition-all">Suspend</button>
                          )}
                        </div>
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
          <Shield className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-lg font-bold text-gray-800">
            {filter === 'all' ? 'Master directory empty' : `No ${filter.replace('_', ' ')} listings`}
          </h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {filter === 'all' ? 'Once developers submit listings, they will show up here.' : 'No listings match this filter.'}
          </p>
        </div>
      )}
    </div>
  );
}
