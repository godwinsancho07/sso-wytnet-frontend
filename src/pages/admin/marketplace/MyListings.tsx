import React, { useState, useEffect } from 'react';
import { Briefcase, AlertTriangle, Plus, CheckCircle, Clock, XCircle, Loader, Globe, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import saasApi from '@/services/saasApi';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  live:               { label: 'Live',               color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <Globe className="w-3.5 h-3.5" /> },
  approved:           { label: 'Approved',           color: 'bg-blue-50 text-blue-700 border-blue-100',         icon: <CheckCircle className="w-3.5 h-3.5" /> },
  integration_pending:{ label: 'Integration',        color: 'bg-violet-50 text-violet-700 border-violet-100',   icon: <Loader className="w-3.5 h-3.5 animate-spin" /> },
  publish_pending:    { label: 'Publish Review',     color: 'bg-amber-50 text-amber-700 border-amber-100',      icon: <Clock className="w-3.5 h-3.5" /> },
  pending_review:     { label: 'Under Review',       color: 'bg-amber-50 text-amber-700 border-amber-100',      icon: <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} /> },
  rejected:           { label: 'Rejected',           color: 'bg-red-50 text-red-600 border-red-100',            icon: <XCircle className="w-3.5 h-3.5" /> },
  suspended:          { label: 'Suspended',          color: 'bg-gray-50 text-gray-500 border-gray-200',         icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

export default function MyListings() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    saasApi.get('/api/v1/marketplace/developer/listings')
      .then((res) => setListings(Array.isArray(res.data) ? res.data : []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary-600" />
            My Listings
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track the validation status of your submitted SaaS products.</p>
        </div>
        <Link
          to="/app-admin/marketplace/submit"
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all hover:scale-105 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Submit Application
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading your listings...</div>
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {listings.map((app) => {
            const cfg = STATUS_CONFIG[app.status] ?? { label: app.status, color: 'bg-gray-50 text-gray-500 border-gray-200', icon: null };
            return (
              <Link
                key={app.id}
                to={`/app-admin/marketplace/submit?app_id=${app.id}`}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between group"
              >
                <div className="p-6 space-y-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center font-bold text-xl text-primary-700">
                      {(app.name || app.title || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {app.name || app.title}
                      </h3>
                      <span className="text-xs text-primary-600 font-medium bg-primary-50 px-2.5 py-0.5 rounded-md mt-1 inline-block">
                        {app.category || 'Utility'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{app.description}</p>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Pricing</p>
                    <p className="text-sm font-bold text-gray-900">{app.price || 'Free'}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-lg font-bold text-gray-800">No listings found</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">Get started by listing your first SaaS application to the store.</p>
          <Link
            to="/app-admin/marketplace/submit"
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" /> Submit Your First App
          </Link>
        </div>
      )}
    </div>
  );
}
