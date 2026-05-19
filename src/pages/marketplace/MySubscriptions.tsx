import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, AlertTriangle, ExternalLink } from 'lucide-react';
import saasApi from '@/services/saasApi';

export default function MySubscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    saasApi.get('/api/v1/marketplace/my/subscriptions')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setSubscriptions(data);
      })
      .catch((err) => {
        console.error('Failed to fetch subscriptions:', err);
        setSubscriptions([]); // Graceful fallback
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary-600" />
          My Subscriptions
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage your active SaaS subscriptions, access apps, and cancel anytime.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading subscriptions...</div>
      ) : subscriptions.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-200">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center font-bold text-lg text-primary-700">
                    {sub.app_name?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {sub.app_name}
                      <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-100">
                        {sub.status}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">{sub.plan_name} • {sub.price}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="text-sm">
                    <p className="text-gray-400 font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Next Billing</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{sub.next_billing_at || 'N/A'}</p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button className="flex items-center gap-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all">
                      Open App <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button className="bg-red-50 hover:bg-red-100 text-red-600 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all">
                      Cancel Plan
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-lg font-bold text-gray-800">No subscriptions found</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">Explore and subscribe to amazing tools from the WytSaaS marketplace storefront.</p>
        </div>
      )}
    </div>
  );
}
