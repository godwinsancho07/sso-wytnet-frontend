import { Link } from 'react-router-dom';
import { Shield, Zap, Lock, Globe, ArrowRight, CheckCircle2, ChevronRight, Activity, Users, Layout, BarChart3 } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/authStore';
import { useState, useEffect } from 'react';
import api, { API_URL } from '@/services/api';
import { OAuthClientRead } from '@/services/admin';
import { storage } from '@/utils/storage';

export default function LandingPage() {
  const { isAuthenticated, primaryDashboard, user } = useAuthStore();
  const [apps, setApps] = useState<OAuthClientRead[]>([]);
  const [connectedAppIds, setConnectedAppIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [fetchingConnected, setFetchingConnected] = useState(false);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const { data } = await api.get<OAuthClientRead[]>('/v1/clients/public');
        const filtered = data.filter(app => 
          !app.app_name.toLowerCase().includes('internal sso')
        );
        setApps(filtered.slice(0, 4));
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
      setFetchingConnected(true);
      api.get('/v1/users/me/connected-apps')
        .then(({ data }) => {
          const ids = new Set<string>(data.map((a: any) => String(a.id)));
          setConnectedAppIds(ids);
        })
        .finally(() => setFetchingConnected(false));
    }
  }, [isAuthenticated]);

  const handleLaunchApp = (app: OAuthClientRead) => {
    const name = app.app_name.toLowerCase();
    
    // 1. Generate verifier FIRST
    const verifier = 'demo_verifier_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('pkce_verifier', verifier);

    // Use the best available redirect URI from the registered list
    const isPortalLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    let redirectUri = app.redirect_uris.find(u => {
      const isUriLocal = u.includes('localhost') || u.includes('127.0.0.1');
      const hasCallback = u.includes('/callback');
      // Prioritize environment-specific URI that HAS a /callback path
      return isPortalLocal ? (isUriLocal && hasCallback) : (!isUriLocal && hasCallback);
    });

    // Fallback 1: Any URI that has /callback
    if (!redirectUri) {
      redirectUri = app.redirect_uris.find(u => u.includes('/callback'));
    }

    // Fallback 2: Any environment-specific URI
    if (!redirectUri) {
      redirectUri = app.redirect_uris.find(u => {
        const isUriLocal = u.includes('localhost') || u.includes('127.0.0.1');
        return isPortalLocal ? isUriLocal : !isUriLocal;
      });
    }

    // Ultimate fallback
    if (!redirectUri) {
      redirectUri = app.redirect_uris[0] || 'http://localhost:5173/callback';
    }
    
    // We pass the verifier in the 'state' parameter to bypass strict redirect_uri matching
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
    
    const token = useAuthStore.getState().isAuthenticated ? storage.getAccessToken() : null;
    if (token) params.append('token', token);

    // Navigate directly to backend to start OAuth flow
    const authorizeUrl = `${API_URL}/oauth/authorize?${params.toString()}`;
    window.location.href = authorizeUrl;
  };

  const getAppDetails = (name: string, app: OAuthClientRead) => {
    const n = name.toLowerCase();
    const realDesc = (app as any).description;
    
    if (n.includes('vote')) return {
      desc: realDesc || "",
      icon: <Users className="w-6 h-6 text-white" />,
      bgClass: "bg-gradient-to-br from-blue-600 to-indigo-700"
    };
    if (n.includes('nexj')) return {
      desc: realDesc || "",
      icon: <Activity className="w-6 h-6 text-white" />,
      bgClass: "bg-gradient-to-br from-purple-600 to-violet-700"
    };
    if (n.includes('madurai')) return {
      desc: realDesc || "",
      icon: <Globe className="w-6 h-6 text-white" />,
      bgClass: "bg-gradient-to-br from-emerald-500 to-teal-700"
    };
    if (n.includes('test')) return {
      desc: realDesc || "",
      icon: <Lock className="w-6 h-6 text-white" />,
      bgClass: "bg-gradient-to-br from-slate-600 to-slate-800"
    };
    return {
      desc: (app as any).description || "",
      icon: <Shield className="w-6 h-6 text-white" />,
      bgClass: "bg-gradient-to-br from-primary-600 to-indigo-700"
    };
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-primary-100 selection:text-primary-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 md:h-20 items-center">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="bg-primary-600 p-1.5 rounded-lg shadow-lg shadow-primary-200/20 group-hover:scale-105 transition-all duration-300">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">WytPass</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-[13px] font-bold text-slate-500 uppercase tracking-widest">
              <a href="#features" className="hover:text-primary-600 transition-colors">Platform</a>
              <Link to="/explore" className="hover:text-primary-600 transition-colors">Explore Apps</Link>
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link 
                  to={primaryDashboard()} 
                  className="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-[14px] font-bold hover:bg-primary-700 transition-all shadow-button flex items-center gap-2 group active:scale-95"
                >
                  Dashboard <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-[14px] font-bold text-slate-600 hover:text-primary-600 transition-colors">
                    Log in
                  </Link>
                  <Link 
                    to="/register" 
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[14px] font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-100 active:scale-95"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-8 md:pt-32 md:pb-12 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-5 relative">
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Secure access for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-accent-violet to-accent-pink">every identity.</span>
            </h1>
            
            <p className="text-base md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium pt-2">
              A single platform combining seamless SSO with multi-layer cryptographic security to protect your users and data.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link 
                to={isAuthenticated ? primaryDashboard() : "/register"} 
                className="w-full sm:w-auto bg-primary-600 text-white px-6 py-3 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-primary-700 transition-all shadow-button active:scale-95 group"
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started for Free"} 
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* Connected Apps Section */}
      <section id="connect" className="py-16 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
            <div className="flex items-center justify-center gap-3 mb-1">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-primary-700 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Zap className="w-5.5 h-5.5 text-white fill-white/10" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Featured Apps
              </h2>
            </div>
            <p className="text-[14px] md:text-[15px] text-slate-500 font-medium max-w-xl mx-auto">
              Boost your productivity with <span className="text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">smart tools</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="h-24 bg-slate-50 animate-pulse rounded-2xl" />
              ))
            ) : apps.length > 0 ? (
              apps.map((app, i) => {
                const details = getAppDetails(app.app_name, app);
                
                const iconColors = [
                  'bg-indigo-600',
                  'bg-emerald-500',
                  'bg-orange-600',
                  'bg-rose-500',
                  'bg-blue-600',
                  'bg-green-500'
                ];
                const iconBg = iconColors[i % iconColors.length];

                return (
                  <div 
                    key={app.id} 
                    onClick={() => handleLaunchApp(app)}
                    className="group flex items-center gap-4 p-4 bg-slate-50/50 border border-slate-100/50 rounded-2xl hover:bg-white hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                  >
                    <div className={`w-11 h-11 shrink-0 ${iconBg} rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-300`}>
                      {details.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-[15px] truncate group-hover:text-primary-600 transition-colors">
                        {app.app_name}
                      </h4>
                      <p className="text-[12px] text-slate-500 leading-snug line-clamp-1 font-medium mt-0.5">
                        {details.desc || 'Optimized identity and security for your workflow.'}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-10 bg-slate-50 rounded-2xl border border-slate-100/50">
                <Users className="w-6 h-6 mx-auto mb-2 text-slate-200" />
                <p className="text-[12px] font-bold text-slate-400">No public apps registered yet</p>
              </div>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link to="/explore" className="inline-flex items-center gap-2 text-primary-600 text-[13px] font-black hover:gap-3 transition-all group">
              View All Applications <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50/30 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">
              Engineered for security. Designed for people.
            </h2>
            <p className="text-lg text-slate-500 font-medium">
              We've simplified the most complex part of your application so you can focus on building what matters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Activity className="w-7 h-7 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Real-time Auditing</h3>
              <p className="text-slate-500 text-[15px] leading-relaxed font-medium">
                Monitor every authentication event with detailed logs and instant threat detection alerts.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Role-Based Access</h3>
              <p className="text-slate-500 text-[15px] leading-relaxed font-medium">
                Granular permissions system that lets you control exactly who can see and do what in your apps.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Layout className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Custom Domain SSO</h3>
              <p className="text-slate-500 text-[15px] leading-relaxed font-medium">
                White-label the entire login experience to keep your brand front and center for your users.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section id="developers" className="py-32 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#4f46e5_0%,transparent_40%)] opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="max-w-2xl mx-auto space-y-10">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
              Ready to secure your project?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/register" 
                className="w-full sm:w-auto bg-primary-600 text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-primary-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-primary-900/20"
              >
                Get Started for Free <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                to="/login" 
                className="w-full sm:w-auto text-white font-bold flex items-center justify-center gap-2 group text-base px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition-all"
              >
                Sign in to account <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* About Us Column */}
            <div className="space-y-4">
              <h3 className="text-[15px] font-black text-slate-900 tracking-tight uppercase">About Us</h3>
              <p className="text-slate-500 text-[13px] leading-relaxed font-medium max-w-xs">
                WytPass is a next-generation identity infrastructure providing seamless single sign-on with multi-layer cryptographic security. We empower businesses to protect their users and data with state-of-the-art authentication.
              </p>
            </div>

            {/* Quick Links Column */}
            <div className="space-y-4">
              <h3 className="text-[15px] font-black text-slate-900 tracking-tight uppercase">Quick Links</h3>
              <ul className="space-y-2.5 text-[13px] text-slate-500 font-semibold">
                <li><Link to="/explore" className="hover:text-primary-600 transition-colors">Explore Apps</Link></li>
              </ul>
            </div>

            {/* Connect Column */}
            <div className="space-y-4">
              <h3 className="text-[15px] font-black text-slate-900 tracking-tight uppercase">Connect</h3>
              <ul className="space-y-2.5 text-[13px] text-slate-500 font-semibold">
                <li className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>wytnet.com</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
              © 2026 WYTPASS. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
