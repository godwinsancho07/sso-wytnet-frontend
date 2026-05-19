import React, { useState, useEffect } from 'react';
import { ShoppingBag, Star, Zap, Search, AlertTriangle } from 'lucide-react';
import saasApi from '@/services/saasApi';

export default function BrowseApps() {
  const [search, setSearch] = useState('');
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    saasApi.get('/api/v1/marketplace/listings')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setListings(data);
      })
      .catch((err) => {
        console.error('Failed to fetch marketplace listings:', err);
        setListings([]); // Graceful fallback
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary-600 animate-pulse" />
            WytSaaS Marketplace
          </h1>
          <p className="text-sm text-gray-500 mt-1">Discover, buy, and integrate powerful cloud applications instantly.</p>
        </div>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search apps or categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Featured Banner */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none">
          <Zap className="w-full h-full scale-150 transform translate-x-1/4" />
        </div>
        <div className="max-w-xl space-y-3 relative z-10">
          <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">Join WytSaaS</span>
          <h2 className="text-3xl font-extrabold tracking-tight">Supercharge Your Workflow</h2>
          <p className="text-white/80 text-sm">Deploy high-quality developer-built applications right inside WytPass with a single click. Start scaling today.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading marketplace applications...</div>
      ) : listings.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-lg font-bold text-gray-800">No active listings</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">The marketplace storefront is clean! Once developers list their apps, they will show up here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.filter(app => app.title?.toLowerCase().includes(search.toLowerCase())).map((app) => (
            <div key={app.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="p-5 space-y-4">
                <div className="flex gap-4">
                  <img src={app.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&h=128&fit=crop'} alt={app.title} className="w-12 h-12 rounded-lg object-cover bg-gray-50 border border-gray-100" />
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-1.5">
                      {app.title}
                    </h3>
                    <span className="text-xs text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded-md">{app.category || 'App'}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{app.description}</p>
              </div>
              
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Pricing Plan</p>
                  <p className="text-sm font-bold text-gray-900">{app.price || 'Contact Sales'}</p>
                </div>
                <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all hover:scale-105">
                  Subscribe
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
