import React, { useState, useEffect } from 'react';
import { Briefcase, AlertTriangle, Plus, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import saasApi from '@/services/saasApi';

export default function MyListings() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    saasApi.get('/api/v1/marketplace/developer/listings')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setListings(data);
      })
      .catch((err) => {
        console.error('Failed to fetch developer listings:', err);
        setListings([]); // Gracefully empty instead of displaying broken errors to user
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
        <div className="text-center py-12 text-gray-400">Loading developer listings...</div>
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {listings.map((app) => (
            <div key={app.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="p-6 space-y-4">
                <div className="flex gap-4">
                  <img
                    src={app.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&h=128&fit=crop'}
                    alt={app.title}
                    className="w-12 h-12 rounded-lg object-cover bg-gray-50 border border-gray-100"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {app.title}
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
                  <p className="text-xs text-gray-400 font-medium">Pricing Plan</p>
                  <p className="text-sm font-bold text-gray-900">{app.price || 'Free'}</p>
                </div>

                <div>
                  {app.status === 'approved' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                      <CheckCircle className="w-3.5 h-3.5" /> Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                      <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} /> Pending Approval
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-lg font-bold text-gray-800">No listings found</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">Get started by listing your first SaaS application to the store.</p>
        </div>
      )}
    </div>
  );
}
