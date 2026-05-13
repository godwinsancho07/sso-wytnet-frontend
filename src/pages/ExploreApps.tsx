import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight, CheckCircle2, ChevronLeft, Search, Globe, Filter } from 'lucide-react';
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
    <div className="min-h-screen bg-[#fafafa] font-sans">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="bg-primary-600 p-2 rounded-xl">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">WytPass</span>
            </Link>
            
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link to={primaryDashboard()} className="btn-primary text-sm py-2 px-4">Dashboard</Link>
              ) : (
                <Link to="/login" className="btn-primary text-sm py-2 px-4">Sign In</Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div className="space-y-2">
              <Link to="/" className="text-sm font-bold text-gray-400 hover:text-primary-600 flex items-center gap-1 mb-4 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back to Home
              </Link>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">App Directory</h1>
              <p className="text-lg text-gray-500 font-medium">Discover and connect with the WytPass ecosystem.</p>
            </div>

            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text"
                placeholder="Search applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="h-64 bg-white border border-gray-100 rounded-[32px] animate-pulse" />
              ))}
            </div>
          ) : filteredApps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredApps.map((app) => {
                const isConnected = connectedAppIds.has(app.id);
                return (
                  <div key={app.id} className="group bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-primary-100">
                        <Shield className="w-7 h-7 text-primary-600" />
                      </div>
                      {isConnected && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-50 px-3 py-1 rounded-full flex items-center gap-1.5 border border-green-100">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-gray-900 text-xl mb-2 truncate">{app.app_name}</h4>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-8 font-medium leading-relaxed">
                      {app.description || "Secure application integrated with WytPass identity infrastructure."}
                    </p>
                    <button 
                      onClick={() => handleLaunchApp(app)}
                      className={clsx(
                        "w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                        isConnected 
                          ? "bg-green-600 text-white shadow-lg shadow-green-100 hover:bg-green-700" 
                          : "bg-gray-900 text-white hover:bg-gray-800 shadow-lg shadow-gray-200"
                      )}
                    >
                      {isConnected ? "Open Dashboard" : "Connect Now"} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-[48px] border-2 border-dashed border-gray-100">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No apps found</h3>
              <p className="text-gray-500 font-medium">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-20">
            {/* About Us */}
            <div className="space-y-6 text-left">
              <div className="flex items-center gap-2.5">
                <div className="bg-primary-600 p-1.5 rounded-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-gray-900">WytPass</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed font-medium">
                Next-generation identity infrastructure providing seamless single sign-on with multi-layer cryptographic security.
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-6 text-left">
              <h3 className="text-lg font-bold tracking-tight text-gray-900">Platform</h3>
              <ul className="space-y-4 text-sm text-gray-500 font-semibold">
                <li><Link to="/explore" className="hover:text-primary-600 transition-colors">App Directory</Link></li>
                <li><Link to="/" className="hover:text-primary-600 transition-colors">Home</Link></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Documentation</a></li>
              </ul>
            </div>

            {/* Contact & Support */}
            <div className="space-y-6 text-left">
              <h3 className="text-lg font-bold tracking-tight text-gray-900">Get in Touch</h3>
              <ul className="space-y-5 text-sm text-gray-500 font-semibold">
                <li className="flex gap-3">
                  <Globe className="w-5 h-5 text-primary-500" />
                  <span>wytnet.com</span>
                </li>
                <li className="flex gap-6 pt-2">
                    <a href="#" className="hover:text-primary-600 transition-colors"><Shield className="w-5 h-5" /></a>
                    <a href="#" className="hover:text-primary-600 transition-colors"><Globe className="w-5 h-5" /></a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-20 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              © 2026 Wytnet Identity Systems. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
