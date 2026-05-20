import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight, Search, Globe, Activity, Users, Lock, Star, Zap, Package, X, CheckCircle2, Crown, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import saasApi from '@/services/saasApi';

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

export default function Marketplace() {
  const { isAuthenticated, user, primaryDashboard } = useAuthStore();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal state
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const { data } = await saasApi.get('/api/v1/marketplace/listings');
        setApps(data);
      } catch (err) {
        console.error('Failed to fetch marketplace apps:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  const categories = ['All', ...Array.from(new Set(apps.map((a: any) => a.category).filter(Boolean)))];

  const filteredApps = apps.filter((app: any) => {
    const matchSearch =
      app.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === 'All' || app.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const handleSubscribe = async (planId: string) => {
    if (!selectedApp) return;
    
    if (!isAuthenticated) {
      setSubscribeError("Please log in using WytPass SSO first.");
      return;
    }
    
    const userId = (user as any)?.id || (user as any)?.sub || 'guest_user';
    setSubscribing(true);
    setSubscribeError(null);

    // 1. If Starter (Free), call the free subscribe endpoint directly
    if (planId === 'starter') {
      try {
        await saasApi.post(`/api/v1/marketplace/listings/${selectedApp.id}/subscribe`, {
          user_id: userId,
          plan: planId,
        });
        setSubscribeSuccess(planId);
      } catch (err: any) {
        setSubscribeError(err.response?.data?.detail || 'Subscription failed. Please try again.');
      } finally {
        setSubscribing(false);
      }
      return;
    }

    // 2. Paid subscription: Razorpay checkout
    try {
      const { data: orderData } = await saasApi.post(`/api/v1/marketplace/listings/${selectedApp.id}/create-razorpay-order`, {
        user_id: userId,
        plan: planId
      });

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "WytSaaS Marketplace",
        description: `Subscribe to ${planId.toUpperCase()} for ${selectedApp.name}`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            setSubscribing(true);
            await saasApi.post(`/api/v1/marketplace/listings/${selectedApp.id}/verify-razorpay-payment`, {
              user_id: userId,
              plan: planId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setSubscribeSuccess(planId);
          } catch (err: any) {
            setSubscribeError(err.response?.data?.detail || 'Subscription payment verification failed.');
          } finally {
            setSubscribing(false);
          }
        },
        modal: {
          onDismiss: () => {
            setSubscribing(false);
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
      setSubscribing(false);
    }
  };

  const closeModal = () => {
    setSelectedApp(null);
    setSubscribeSuccess(null);
    setSubscribeError(null);
  };

  const getAppBranding = (name: string, idx: number) => {
    const n = (name || '').toLowerCase();
    if (n.includes('vote')) return { icon: <Users className="w-6 h-6" />, iconBg: 'bg-indigo-600', badge: 'bg-indigo-50 text-indigo-700' };
    if (n.includes('nexj')) return { icon: <Activity className="w-6 h-6" />, iconBg: 'bg-purple-600', badge: 'bg-purple-50 text-purple-700' };
    if (n.includes('madurai') || n.includes('open')) return { icon: <Globe className="w-6 h-6" />, iconBg: 'bg-emerald-600', badge: 'bg-emerald-50 text-emerald-700' };
    if (n.includes('test')) return { icon: <Lock className="w-6 h-6" />, iconBg: 'bg-slate-600', badge: 'bg-slate-50 text-slate-700' };
    const defaults = [
      { icon: <Zap className="w-6 h-6" />, iconBg: 'bg-rose-600', badge: 'bg-rose-50 text-rose-700' },
      { icon: <Package className="w-6 h-6" />, iconBg: 'bg-orange-600', badge: 'bg-orange-50 text-orange-700' },
      { icon: <Star className="w-6 h-6" />, iconBg: 'bg-blue-600', badge: 'bg-blue-50 text-blue-700' },
      { icon: <Shield className="w-6 h-6" />, iconBg: 'bg-primary-600', badge: 'bg-primary-50 text-primary-700' },
    ];
    return defaults[idx % defaults.length];
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 md:h-20 items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-primary-600 p-1.5 rounded-lg shadow-lg shadow-primary-200/30 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">WytPass</span>
            </Link>

            <div className="hidden md:flex items-center gap-8 text-[13px] font-bold text-slate-500 uppercase tracking-widest">
              <Link to="/explore" className="hover:text-primary-600 transition-colors">Explore Apps</Link>
              <Link to="/marketplace" className="text-primary-600 border-b-2 border-primary-600 pb-0.5">Marketplace</Link>
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link to={primaryDashboard()} className="bg-primary-600 text-white px-5 py-2 rounded-xl text-[13px] font-bold hover:bg-primary-700 transition-all shadow-sm">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-[13px] font-bold text-slate-500 hover:text-primary-600 transition-colors">Log in</Link>
                  <Link to="/register" className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[13px] font-bold hover:bg-slate-800 transition-all">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Hero header */}
          <div className="text-center mb-14 space-y-4">
            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-primary-100 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              WytSaaS Marketplace
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Discover Live Apps
            </h1>
            <p className="text-slate-500 text-base font-medium max-w-xl mx-auto">
              Browse verified applications published to the WytSaaS Marketplace — all powered by WytPass SSO.
            </p>

            <div className="flex justify-center mt-6">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search marketplace apps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-11 pr-5 text-[13px] font-medium focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Category Filters */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2 justify-center mb-10">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all border ${
                    selectedCategory === cat
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-primary-300 hover:text-primary-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* App Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="h-72 bg-slate-50 rounded-[2rem] animate-pulse" />
              ))}
            </div>
          ) : filteredApps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredApps.map((app: any, i: number) => {
                const branding = getAppBranding(app.name, i);
                return (
                  <div key={app.id} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-2 transition-all duration-300 flex flex-col">
                    <div className="flex items-start justify-between mb-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300 ${branding.iconBg}`}>
                        {branding.icon}
                      </div>
                      {app.category && (
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${branding.badge}`}>
                          {app.category}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 text-[17px] mb-2 truncate group-hover:text-primary-600 transition-colors">
                      {app.name}
                    </h4>
                    <p className="text-[13px] text-slate-500 line-clamp-3 mb-6 font-medium leading-relaxed flex-grow">
                      {app.description || 'A verified application published on the WytSaaS Marketplace with WytPass SSO integration.'}
                    </p>

                    <div className="flex items-center gap-1.5 mb-4">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live on Marketplace</span>
                    </div>

                    <button
                      onClick={() => setSelectedApp(app)}
                      className={`w-full py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all text-white shadow-md hover:brightness-110 active:scale-95 ${branding.iconBg}`}
                    >
                      Get App <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-32 bg-slate-50 rounded-[3rem] border border-slate-100">
              <div className="bg-white w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-5">
                <Package className="w-7 h-7 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No marketplace apps yet</h3>
              <p className="text-slate-400 text-sm font-medium">
                {searchQuery ? 'Try a different search term.' : 'Published apps will appear here once live.'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 p-1.5 rounded-lg">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">WytPass Marketplace</span>
          </div>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">© 2026 WytPass. All Rights Reserved.</p>
        </div>
      </footer>

      {/* ── Get App Modal ─────────────────────────────────────── */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-slate-100">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-primary-600 mb-1">WytSaaS Marketplace</p>
                <h2 className="text-2xl font-black text-slate-900">{selectedApp.name}</h2>
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
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900">You're subscribed!</h3>
                <p className="text-slate-500 text-[14px] font-medium max-w-sm mx-auto">
                  You're now on the <span className="font-black text-slate-800 capitalize">{subscribeSuccess}</span> plan for{' '}
                  <span className="text-primary-600 font-black">{selectedApp.name}</span>. A webhook has been sent to the app developer.
                </p>
                <div className="flex gap-3 justify-center pt-4">
                  <a
                    href={selectedApp.url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold text-[13px] hover:bg-primary-700 transition-all flex items-center gap-2"
                  >
                    Open App <ArrowRight className="w-4 h-4" />
                  </a>
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
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={subscribing}
                        className={`w-full py-2.5 rounded-xl font-bold text-[13px] text-white transition-all mt-2 disabled:opacity-60 ${plan.btnClass}`}
                      >
                        {subscribing ? 'Processing...' : `Subscribe – ${plan.name}`}
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
