import React, { useState, useEffect } from 'react';
import { ShoppingBag, Zap, Search, AlertTriangle, CheckCircle, ExternalLink, X, Package, Crown, ArrowRight } from 'lucide-react';
import saasApi from '@/services/saasApi';
import { storage } from '@/utils/storage';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '₹0',
    period: 'Free',
    color: 'border-slate-200',
    iconBg: 'bg-slate-100',
    textColor: 'text-slate-700',
    btnClass: 'bg-slate-800 hover:bg-slate-900',
    icon: <Package className="w-5 h-5 text-slate-600" />,
    features: ['Basic access', '100 API calls/mo', 'Community support'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '₹1',
    period: '/month',
    color: 'border-blue-400 ring-2 ring-blue-100',
    iconBg: 'bg-blue-50',
    textColor: 'text-blue-700',
    btnClass: 'bg-blue-600 hover:bg-blue-700',
    icon: <Zap className="w-5 h-5 text-blue-600" />,
    badge: 'Most Popular',
    features: ['Full access', '10,000 API calls/mo', 'Priority support', 'Analytics dashboard'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹2',
    period: '/month',
    color: 'border-violet-400',
    iconBg: 'bg-violet-50',
    textColor: 'text-violet-700',
    btnClass: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700',
    icon: <Crown className="w-5 h-5 text-violet-600" />,
    features: ['Unlimited access', 'Unlimited API calls', 'Dedicated support', 'Custom integrations', 'SLA guarantee'],
  },
];

/** Decode a JWT payload without an external library */
function parseJwt(token: string): Record<string, any> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export default function BrowseApps() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [successMap, setSuccessMap] = useState<Record<string, boolean>>({});
  
  // Modal states
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [subscribeSuccess, setSubscribeSuccess] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  // Debug state
  const [debugInfo, setDebugInfo] = useState<any>({
    tokenFound: false,
    userId: null,
    apiStatus: 'Not started',
    apiError: null,
    apiResponse: null,
  });

  const getUserInfo = () => {
    const token = storage.getAccessToken();
    if (!token) return null;
    try {
      const decoded = parseJwt(token);
      const userId = decoded?.sub || decoded?.id || decoded?.wytpass_id || null;
      const email = decoded?.email || '';
      const name = decoded?.full_name || decoded?.name || (email ? email.split('@')[0] : 'User');
      return { userId, name, email };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    setLoading(true);
    saasApi.get('/api/v1/marketplace/listings')
      .then((res) => setListings(Array.isArray(res.data) ? res.data : []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));

    // Fetch user's existing subscriptions to populate successMap
    const token = storage.getAccessToken();
    const userInfo = getUserInfo();
    setDebugInfo(prev => ({
      ...prev,
      tokenFound: !!token,
      userId: userInfo ? userInfo.userId : null,
      apiStatus: token ? 'Loading...' : 'No Token Found',
    }));

    if (token) {
      saasApi.get('/api/v1/marketplace/my/subscriptions')
        .then((res) => {
          setDebugInfo(prev => ({
            ...prev,
            apiStatus: 'Success',
            apiResponse: res.data,
          }));
          if (Array.isArray(res.data)) {
            const activeSubsMap: Record<string, boolean> = {};
            res.data.forEach((sub: any) => {
              if (sub.status === 'active') {
                activeSubsMap[sub.app_id] = true;
              }
            });
            setSuccessMap(activeSubsMap);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch my subscriptions:', err);
          setDebugInfo(prev => ({
            ...prev,
            apiStatus: 'Error',
            apiError: err.message || String(err),
            apiResponse: err.response ? err.response.data : null,
          }));
        });
    }
  }, []);

  const handleSubscribe = async (appId: string, planId: string) => {
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.userId) { alert('Please log in to subscribe.'); return; }
    const { userId, name, email } = userInfo;
    
    setSubscribing(appId);
    setSubscribeError(null);

    // 1. If Starter (Free), call the free subscribe endpoint directly
    if (planId === 'starter') {
      try {
        await saasApi.post(`/api/v1/marketplace/listings/${appId}/subscribe`, {
          user_id: userId,
          plan: planId,
          user_name: name,
          user_email: email,
        });
        setSuccessMap(prev => ({ ...prev, [appId]: true }));
        setSubscribeSuccess(planId);
      } catch (err: any) {
        setSubscribeError(err.response?.data?.detail || 'Subscription failed. Please try again.');
      } finally {
        setSubscribing(null);
      }
      return;
    }

    // 2. Paid subscription: Razorpay checkout
    try {
      const { data: orderData } = await saasApi.post(`/api/v1/marketplace/listings/${appId}/create-razorpay-order`, {
        user_id: userId,
        plan: planId,
        user_name: name,
        user_email: email,
      });

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "WytSaaS Marketplace",
        description: `Subscribe to ${planId.toUpperCase()} for ${selectedApp.name || selectedApp.title}`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            setSubscribing(appId);
            await saasApi.post(`/api/v1/marketplace/listings/${appId}/verify-razorpay-payment`, {
              user_id: userId,
              plan: planId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              user_name: name,
              user_email: email,
            });
            setSuccessMap(prev => ({ ...prev, [appId]: true }));
            setSubscribeSuccess(planId);
          } catch (err: any) {
            setSubscribeError(err.response?.data?.detail || 'Subscription payment verification failed.');
          } finally {
            setSubscribing(null);
          }
        },
        modal: {
          onDismiss: () => {
            setSubscribing(null);
          }
        },
        theme: {
          color: "#3b82f6"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setSubscribeError(err.response?.data?.detail || 'Failed to initiate payment.');
      setSubscribing(null);
    }
  };



  const closeModal = () => {
    setSelectedApp(null);
    setSubscribeSuccess(null);
    setSubscribeError(null);
  };

  const categories = ['all', ...Array.from(new Set(listings.map(a => a.category).filter(Boolean)))];
  const filtered = listings.filter(app => {
    const matchSearch = (app.name || app.title || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || app.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Debug Section */}
      <div className="bg-slate-950 text-slate-100 p-4 rounded-xl text-xs font-mono space-y-2 border border-slate-800">
        <p className="font-bold text-amber-400">🔍 WytSaaS Integration Debugger</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div><strong>Token Found:</strong> {debugInfo.tokenFound ? '✅ YES' : '❌ NO'}</div>
          <div><strong>User ID in Token:</strong> {debugInfo.userId || 'null'}</div>
          <div><strong>API Endpoint:</strong> {saasApi.defaults.baseURL || 'http://localhost:8001'}/api/v1/marketplace/my/subscriptions</div>
          <div><strong>API Status:</strong> {debugInfo.apiStatus}</div>
        </div>
        {debugInfo.apiError && (
          <div className="text-rose-400 mt-1"><strong>API Error:</strong> {debugInfo.apiError}</div>
        )}
        <div className="mt-1">
          <strong>Backend Response:</strong>
          <pre className="bg-slate-900 p-2 rounded mt-1 overflow-x-auto text-[10px] max-h-32">
            {JSON.stringify(debugInfo.apiResponse, null, 2) || 'No response data yet'}
          </pre>
        </div>
        <div className="mt-1">
          <strong>Grid SuccessMap keys:</strong> {JSON.stringify(Object.keys(successMap))}
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

      {/* Category Filter */}
      {!loading && listings.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${category === cat ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400'}`}
            >
              {cat === 'all' ? `All Apps (${listings.length})` : cat}
            </button>
          ))}
        </div>
      )}

      {/* Listings Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading marketplace applications...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-lg font-bold text-gray-800">No active listings</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {search ? `No apps match "${search}".` : 'The marketplace storefront is clean! Once developers list their apps, they will show up here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((app) => {
            const isSubscribed = successMap[app.id];
            const isLoading = subscribing === app.id;
            return (
              <div key={app.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all flex flex-col justify-between">
                <div className="p-5 space-y-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center font-bold text-lg text-primary-700 flex-shrink-0">
                      {(app.name || app.title || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{app.name || app.title}</h3>
                      <span className="text-xs text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded-md">{app.category || 'App'}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{app.description}</p>

                  {app.url && (
                    <a href={app.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition-colors">
                      <ExternalLink className="w-3 h-3" /> {app.url.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>

                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Pricing</p>
                    <p className="text-sm font-bold text-gray-900">{app.price || 'Free'}</p>
                  </div>

                  {isSubscribed ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <CheckCircle className="w-3.5 h-3.5" /> Subscribed
                      </span>
                      {app.url && (
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold shadow-sm transition-all hover:scale-105"
                        >
                          Open App <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedApp(app)}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all hover:scale-105"
                    >
                      Subscribe
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Get App Modal ─────────────────────────────────────── */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 text-left">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-slate-100">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-primary-600 mb-1">WytSaaS Marketplace</p>
                <h2 className="text-2xl font-black text-slate-900">{selectedApp.name || selectedApp.title}</h2>
                <p className="text-[13px] text-slate-400 font-medium mt-1 max-w-md line-clamp-2">
                  {selectedApp.description || 'Subscribe to get full access to this application.'}
                </p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {subscribeSuccess ? (
              /* Success State */
              <div className="px-8 py-16 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900">You're subscribed!</h3>
                <p className="text-slate-500 text-[14px] font-medium max-w-sm mx-auto">
                  You're now on the <span className="font-black text-slate-800 capitalize">{subscribeSuccess}</span> plan for{' '}
                  <span className="text-primary-600 font-black">{selectedApp.name || selectedApp.title}</span>. A webhook has been sent to the app developer.
                </p>
                <div className="flex gap-3 justify-center pt-4">
                  {selectedApp.url && (
                    <a
                      href={selectedApp.url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold text-[13px] hover:bg-primary-700 transition-all flex items-center gap-2"
                    >
                      Open App <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={closeModal} className="px-6 py-3 rounded-xl font-bold text-[13px] border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                    Back to Marketplace
                  </button>
                </div>
              </div>
            ) : (
              /* Plan Selection */
              <div className="px-8 py-8">
                <p className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-5">Choose a Plan</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {PLANS.map((plan) => (
                    <div key={plan.id} className={`relative border-2 rounded-2xl p-5 flex flex-col gap-3 ${plan.color}`}>
                      {plan.badge && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                          {plan.badge}
                        </span>
                      )}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.iconBg}`}>
                        {plan.icon}
                      </div>
                      <div>
                        <p className={`font-black text-lg ${plan.textColor}`}>{plan.name}</p>
                        <p className="text-slate-900 font-black text-xl">
                          {plan.price}<span className="text-slate-400 text-[12px] font-semibold">{plan.period}</span>
                        </p>
                      </div>
                      <ul className="space-y-1.5 flex-grow">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-[12px] text-slate-500 font-medium">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => handleSubscribe(selectedApp.id, plan.id)}
                        disabled={subscribing !== null}
                        className={`w-full py-2.5 rounded-xl font-bold text-[13px] text-white transition-all mt-2 disabled:opacity-60 ${plan.btnClass}`}
                      >
                        {subscribing === selectedApp.id ? 'Processing...' : `Subscribe – ${plan.name}`}
                      </button>
                    </div>
                  ))}
                </div>

                {subscribeError && (
                  <p className="mt-4 text-center text-[13px] font-semibold text-red-500">{subscribeError}</p>
                )}

                <p className="text-center text-[11px] text-slate-400 font-medium mt-6">
                  🔒 Secured by WytPass SSO · Cancel anytime · No hidden fees
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

