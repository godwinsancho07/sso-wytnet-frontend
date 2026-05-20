import React, { useState, useEffect } from 'react';
import { Globe, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import saasApi from '@/services/saasApi';

export default function MarketplaceCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [message, setMessage] = useState('');

  const loadData = () => {
    setLoading(true);
    saasApi.get('/api/v1/marketplace/categories')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setCategories(data);
      })
      .catch((err) => {
        console.error('Failed to fetch categories:', err);
        setCategories([]); // Graceful fallback
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;
    setError('');
    setMessage('');
    try {
      await saasApi.post('/api/v1/admin/marketplace/categories', { name, slug });
      setMessage('Category created successfully!');
      setName('');
      setSlug('');
      loadData();
    } catch {
      setError('Failed to create category.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary-600" />
            Marketplace Categories
          </h1>
          <p className="text-sm text-gray-500 mt-1">Configure active categorization filters for the public SaaS storefront.</p>
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
          <div className="text-center py-12 text-gray-400">Loading categories...</div>
        ) : categories.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-3.5">Category Name</th>
                  <th className="px-6 py-3.5">Slug</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{cat.name}</td>
                    <td className="px-6 py-4 font-mono text-gray-500">{cat.slug}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Delete "${cat.name}"?`)) return;
                          try {
                            await saasApi.delete(`/api/v1/admin/marketplace/categories/${cat.id}`);
                            setMessage('Category deleted.');
                            setTimeout(() => setMessage(''), 2500);
                            loadData();
                          } catch {
                            setError('Failed to delete category.');
                          }
                        }}
                        className="text-red-600 hover:text-red-700 font-bold transition-all text-xs inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-4 shadow-sm">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto" />
            <h2 className="text-lg font-bold text-gray-800">No categories</h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">Create categorizations to allow users to filter storefront apps.</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900">Add New Category</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Category Name</label>
              <input
                type="text"
                placeholder="e.g. Productivity"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Slug</label>
              <input
                type="text"
                placeholder="e.g. productivity"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-xs font-semibold shadow-sm transition-all hover:scale-105 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create Category
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
