import { Link } from 'react-router-dom';
import { Shield, Zap, Lock, Globe, ArrowRight, CheckCircle2, ChevronRight, Activity, Users, Layout } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans selection:bg-primary-100 selection:text-primary-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2.5 group cursor-pointer">
              <div className="bg-primary-600 p-2 rounded-xl shadow-lg shadow-primary-200 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-gray-900">WytPass</span>
            </div>
            
            <div className="hidden md:flex items-center gap-10 text-[15px] font-medium text-gray-500">
              <a href="#features" className="hover:text-primary-600 transition-colors">Platform</a>
              <Link to="/explore" className="hover:text-primary-600 transition-colors">Explore Apps</Link>
            </div>

            <div className="flex items-center gap-5">
              {isAuthenticated ? (
                <Link 
                  to={primaryDashboard()} 
                  className="bg-primary-600 text-white px-6 py-3 rounded-xl text-[15px] font-bold hover:bg-primary-700 transition-all shadow-xl shadow-primary-200 flex items-center gap-2 group active:scale-95"
                >
                  Dashboard <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-[15px] font-semibold text-gray-600 hover:text-primary-600 transition-colors">
                    Log in
                  </Link>
                  <Link 
                    to="/register" 
                    className="bg-black text-white px-6 py-3 rounded-xl text-[15px] font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-95"
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
      <section className="relative pt-24 pb-12 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-100/40 rounded-full blur-[120px]" />
          <div className="absolute top-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-100/30 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-10 relative">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-100 text-primary-700 text-xs font-bold tracking-wider uppercase">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              Next-Gen Identity Infrastructure
            </div>
            
            <h1 className="text-5xl md:text-8xl font-black text-gray-900 tracking-tight leading-[1.05]">
              Secure access for <br />
              <span className="relative inline-block">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-blue-600 to-primary-500">every identity.</span>
                <div className="absolute -bottom-2 left-0 w-full h-3 bg-primary-100/60 -rotate-1 -z-10 rounded-full blur-[2px]" />
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-medium">
              The only platform that combines seamless single sign-on with multi-layer cryptographic security to protect your users and data.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-4">
              <Link 
                to={isAuthenticated ? primaryDashboard() : "/register"} 
                className="w-full sm:w-auto bg-primary-600 text-white px-10 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-primary-700 transition-all shadow-2xl shadow-primary-200 hover:-translate-y-1 active:translate-y-0 group"
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started for Free"} 
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* App Showcase Section */}
      <section className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Connected Ecosystem</h2>
              <p className="text-lg text-gray-500 font-medium">Instantly access any application in our secure network.</p>
            </div>
            <Link to="/explore" className="text-primary-600 font-bold flex items-center gap-2 group hover:underline">
              Explore All Apps <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-48 bg-gray-50 animate-pulse rounded-[32px]" />
              ))
            ) : apps.length > 0 ? (
              apps.map((app) => {
                const isConnected = connectedAppIds.has(app.id);
                return (
                  <div key={app.id} className="group bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Shield className="w-7 h-7 text-primary-600" />
                      </div>
                      {isConnected && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-50 px-3 py-1 rounded-full flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-gray-900 text-lg mb-1 truncate">{app.app_name}</h4>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-6">Official Partner</p>
                    <button 
                      onClick={() => handleLaunchApp(app)}
                      className={clsx(
                        "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                        isConnected 
                          ? "bg-green-600 text-white shadow-lg shadow-green-100 hover:bg-green-700" 
                          : "bg-gray-900 text-white hover:bg-gray-800"
                      )}
                    >
                      {isConnected ? "Open Dashboard" : "Launch App"} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-bold text-gray-400">No public apps registered yet</p>
              </div>
            )}
          </div>
        </div>
      </section>


      {/* Features Grid */}
      <section id="features" className="py-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
            <div className="space-y-4 max-w-none text-left">
                <h2 className="text-3xl md:text-4xl font-black text-gray-900">Engineered for security. Designed for people.</h2>
                <p className="text-xl text-gray-500 font-medium">We've simplified the most complex part of your application so you can focus on building what matters.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                icon: <Activity className="w-8 h-8 text-rose-500" />,
                bg: "bg-rose-50",
                title: "Real-time Auditing",
                desc: "Monitor every authentication event with detailed logs and instant threat detection alerts."
              },
              {
                icon: <Users className="w-8 h-8 text-primary-600" />,
                bg: "bg-primary-50",
                title: "Role-Based Access",
                desc: "Granular permissions system that lets you control exactly who can see and do what in your apps."
              },
              {
                icon: <Layout className="w-8 h-8 text-emerald-500" />,
                bg: "bg-emerald-50",
                title: "Custom Domain SSO",
                desc: "White-label the entire login experience to keep your brand front and center for your users."
              }
            ].map((feature, i) => (
              <div key={i} className="group bg-white p-10 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <div className={`mb-8 inline-flex p-5 rounded-2xl ${feature.bg} group-hover:scale-110 transition-transform`}>{feature.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed text-lg">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="developers" className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="relative z-10 space-y-12">
                <div className="space-y-4">
                    <h2 className="text-5xl md:text-8xl font-black text-gray-900 tracking-tight leading-[1.05]">
                        Ready to secure <br />your project
                    </h2>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <Link 
                      to="/register" 
                      className="w-full sm:w-auto bg-primary-600 text-white px-12 py-5 rounded-2xl font-black text-xl hover:bg-primary-700 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-2xl shadow-primary-200"
                    >
                        Get Started for Free <ArrowRight className="w-6 h-6" />
                    </Link>
                    <Link 
                      to="/login" 
                      className="w-full sm:w-auto text-gray-900 font-bold flex items-center justify-center gap-3 group text-xl px-12 py-5 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        Sign in to account <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-20">
            {/* About Us */}
            <div className="space-y-6">
              <div className="flex items-center gap-2.5">
                <div className="bg-primary-600 p-1.5 rounded-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-gray-900">WytPass</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed font-medium">
                Next-generation identity infrastructure providing seamless single sign-on with multi-layer cryptographic security. We protect your users and data so you can focus on building what matters.
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold tracking-tight text-gray-900">Platform</h3>
              <ul className="space-y-4 text-sm text-gray-500 font-semibold">
                <li><Link to="/explore" className="hover:text-primary-600 transition-colors">App Directory</Link></li>
                <li><a href="#features" className="hover:text-primary-600 transition-colors">Security Features</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Developer Portal</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Documentation</a></li>
              </ul>
            </div>

            {/* Contact & Support */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold tracking-tight text-gray-900">Get in Touch</h3>
              <ul className="space-y-5 text-sm text-gray-500 font-semibold">
                <li className="flex gap-3">
                  <Globe className="w-5 h-5 text-primary-500" />
                  <span>wytnet.com</span>
                </li>
                <li className="flex gap-6 pt-2">
                    <a href="#" className="hover:text-primary-600 transition-colors"><Activity className="w-5 h-5" /></a>
                    <a href="#" className="hover:text-primary-600 transition-colors"><Users className="w-5 h-5" /></a>
                    <a href="#" className="hover:text-primary-600 transition-colors"><Layout className="w-5 h-5" /></a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-20 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              © 2026 Wytnet Identity Systems. All Rights Reserved.
            </p>
            <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <a href="#" className="hover:text-primary-600 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1.1); }
          50% { transform: translateY(-20px) scale(1.1); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.8s ease-out forwards;
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        
        .bg-grid-slate-100 {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(241 245 249 / 1)'%3E%3Cpath d='M0 .5H31.5V32'/%3E%3C/svg%3E");
        }
      `}} />
    </div>
  );
}
