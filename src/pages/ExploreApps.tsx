import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight, CheckCircle2, ChevronLeft, Search, Globe, Filter, Activity, Users, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/authStore';
import api, { API_URL } from '@/services/api';
import { OAuthClientRead } from '@/services/admin';
import { storage } from '@/utils/storage';

export default function ExploreApps() {
  const { isAuthenticated, primaryDashboard } = useAuthStore();
  const [apps, setApps] = useState<OAuthClientRead[]>([]);
  const [connectedAppIds, setConnectedAppIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const { data } = await api.get<OAuthClientRead[]>('/v1/clients/public');
        const filtered = data.filter(app => 
          !app.app_name.toLowerCase().includes('internal sso')
        );
        setApps(filtered);
      } catch (err) {
        console.error('Failed to fetch public apps:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/v1/users/me/connected-apps')
        .then(({ data }) => {
          const ids = new Set<string>(data.map((a: any) => String(a.id)));
          setConnectedAppIds(ids);
        });
    }
  }, [isAuthenticated]);

  const handleLaunchApp = (app: OAuthClientRead) => {
    const verifier = 'demo_verifier_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('pkce_verifier', verifier);

    const isPortalLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    let redirectUri = app.redirect_uris.find(u => {
      const isUriLocal = u.includes('localhost') || u.includes('127.0.0.1');
      const hasCallback = u.includes('/callback');
      return isPortalLocal ? (isUriLocal && hasCallback) : (!isUriLocal && hasCallback);
    });

    if (!redirectUri) redirectUri = app.redirect_uris.find(u => u.includes('/callback'));
    if (!redirectUri) redirectUri = app.redirect_uris[0] || 'http://localhost:5173/callback';
    
    const state = `portal|verifier:${verifier}`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: app.client_id,
      redirect_uri: redirectUri,
      state: state,
      scope: 'openid profile email',
      code_challenge: verifier,
      code_challenge_method: 'plain',
    });
    
    const token = storage.getAccessToken();
    if (token) params.append('token', token);

    window.location.href = `${API_URL}/oauth/authorize?${params.toString()}`;
  };

  const filteredApps = apps.filter(app => 
    app.app_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 md:h-20 items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-primary-600 p-1.5 rounded-lg shadow-lg shadow-primary-200">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">WytPass</span>
            </Link>
            
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link to={primaryDashboard()} className="bg-primary-600 text-white px-5 py-2 rounded-xl text-[13px] font-bold shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all">Dashboard</Link>
              ) : (
                <Link to="/login" className="bg-primary-600 text-white px-5 py-2 rounded-xl text-[13px] font-bold shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all">Sign In</Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 md:pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div className="space-y-1">
              <Link to="/" className="text-[12px] font-bold text-slate-400 hover:text-primary-600 flex items-center gap-1 mb-3 transition-colors uppercase tracking-wider">
                <ChevronLeft className="w-3.5 h-3.5" /> Back to Home
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">App Directory</h1>
              <p className="text-base text-slate-500 font-medium">Discover and connect with the WytPass ecosystem.</p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-11 pr-4 text-[13px] font-medium focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="h-64 bg-slate-50 rounded-[2rem] animate-pulse" />
              ))}
            </div>
          ) : filteredApps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredApps.map((app, i) => {
                const isConnected = connectedAppIds.has(app.id);
                
                // Consistency mapping with Landing Page
                const getAppBranding = (name: string) => {
                  const n = name.toLowerCase();
                  if (n.includes('vote')) return { icon: <Users className="w-6 h-6" />, color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-600', iconBg: 'bg-indigo-600' };
                  if (n.includes('nexj')) return { icon: <Activity className="w-6 h-6" />, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-600' };
                  if (n.includes('madurai')) return { icon: <Globe className="w-6 h-6" />, color: 'rose', bg: 'bg-rose-50', text: 'text-rose-600', iconBg: 'bg-rose-600' };
                  if (n.includes('test')) return { icon: <Lock className="w-6 h-6" />, color: 'orange', bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-600' };
                  
                  const defaults = [
                    { color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-600', iconBg: 'bg-indigo-600' },
                    { color: 'rose', bg: 'bg-rose-50', text: 'text-rose-600', iconBg: 'bg-rose-600' },
                    { color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-600' },
                    { color: 'orange', bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-600' }
                  ];
                  return { icon: <Shield className="w-6 h-6" />, ...defaults[i % defaults.length] };
                };

                const branding = getAppBranding(app.app_name);

                return (
                  <div key={app.id} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-premium-hover hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-5">
                      <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300", branding.iconBg)}>
                        {branding.icon}
                      </div>
                      {isConnected && (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 text-lg mb-1 truncate group-hover:text-primary-600 transition-colors">{app.app_name}</h4>
                    <p className="text-[13px] text-slate-500 line-clamp-2 mb-8 font-medium leading-relaxed flex-grow">
                      {app.description || "Secure application integrated with WytPass identity infrastructure."}
                    </p>
                    <button 
                      onClick={() => handleLaunchApp(app)}
                      className={clsx(
                        "w-full py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all shadow-lg text-white",
                        isConnected 
                          ? "bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700" 
                          : `${branding.iconBg} shadow-${branding.color}-100 hover:brightness-110`
                      )}
                    >
                      {isConnected ? "Open Dashboard" : `Use ${app.app_name}`} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-32 bg-slate-50/50 rounded-[3rem] border border-slate-100">
              <div className="bg-white w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6">
                <Search className="w-6 h-6 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No apps found</h3>
              <p className="text-slate-500 text-sm font-medium">Try adjusting your search query.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <div className="bg-primary-600 p-1.5 rounded-lg">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold tracking-tight text-slate-900">WytPass</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed font-medium max-w-sm">
                Next-generation identity infrastructure providing seamless single sign-on with multi-layer cryptographic security.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 uppercase">Platform</h3>
              <ul className="space-y-3 text-[13px] text-slate-500 font-semibold">
                <li><Link to="/explore" className="hover:text-primary-600 transition-colors">App Directory</Link></li>
                <li><Link to="/" className="hover:text-primary-600 transition-colors">Home</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 uppercase">Connect</h3>
              <ul className="space-y-3 text-[13px] text-slate-500 font-semibold">
                <li className="flex gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>wytnet.com</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-20 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
              © 2026 WytPass. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
