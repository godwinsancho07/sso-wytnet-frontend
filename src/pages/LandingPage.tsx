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
        setApps(data.slice(0, 4));
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
    let redirectUri = app.redirect_uris.find(u => u.includes('/callback')) || app.redirect_uris[0] || 'http://localhost:5173/callback';
    
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
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-left space-y-8 relative">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-100 text-primary-700 text-xs font-bold tracking-wider uppercase">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                </span>
                Next-Gen Identity Infrastructure
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.1]">
                Secure access for <br />
                <span className="relative inline-block">
                  <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-blue-600 to-primary-500">every identity.</span>
                  <div className="absolute -bottom-2 left-0 w-full h-3 bg-primary-100/60 -rotate-1 -z-10 rounded-full blur-[2px]" />
                </span>
              </h1>
              
              <p className="text-xl text-gray-500 max-w-xl leading-relaxed font-medium">
                The only platform that combines seamless single sign-on with multi-layer cryptographic security to protect your users and data.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-5 pt-4">
                <Link 
                  to={isAuthenticated ? primaryDashboard() : "/register"} 
                  className="w-full sm:w-auto bg-primary-600 text-white px-10 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-primary-700 transition-all shadow-2xl shadow-primary-200 hover:-translate-y-1 active:translate-y-0 group"
                >
                  {isAuthenticated ? "Go to Dashboard" : "Start Building Free"} 
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* App Showcase Column */}
            <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-tr from-primary-50 to-blue-50/50 rounded-[48px] -z-10 blur-2xl" />
                <div className="bg-white/40 backdrop-blur-md border border-white/60 p-8 rounded-[48px] shadow-2xl shadow-primary-100/50">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-bold text-gray-900">Connected Ecosystem</h3>
                        <span className="text-xs font-bold text-primary-600 px-2.5 py-1 bg-primary-50 rounded-full">Live Apps</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {loading ? (
                            Array(4).fill(0).map((_, i) => (
                                <div key={i} className="h-32 bg-gray-50 animate-pulse rounded-3xl" />
                            ))
                        ) : apps.length > 0 ? (
                            apps.map((app) => {
                                const isConnected = connectedAppIds.has(app.id);
                                return (
                                    <div key={app.id} className="group bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Shield className="w-5 h-5 text-primary-600" />
                                            </div>
                                            {isConnected && (
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-gray-900 text-sm truncate">{app.app_name}</h4>
                                        <p className="text-[10px] text-gray-400 font-medium mb-4">Official App</p>
                                        <button 
                                            onClick={() => handleLaunchApp(app)}
                                            className={clsx(
                                                "text-[11px] font-bold flex items-center gap-1 group-hover:gap-2 transition-all",
                                                isConnected ? "text-green-600" : "text-primary-600"
                                            )}
                                        >
                                            {isConnected ? "Open Dashboard" : "Launch App"} <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-2 text-center py-12 text-gray-400">
                                <Users className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                <p className="text-sm font-medium">No public apps registered yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
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
      <section id="developers" className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-[48px] p-8 md:p-16 text-center relative overflow-hidden border border-gray-100 shadow-xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-100/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-50/10 rounded-full blur-[100px]" />
                
                <div className="relative z-10 space-y-6">
                    <h2 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight">Ready to secure your <br />next big project?</h2>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto">Join thousands of developers building secure applications with WytPass.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link to="/register" className="bg-primary-600 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-primary-700 transition-all active:scale-95 shadow-lg shadow-primary-200">
                            Get Started for Free
                        </Link>
                        <Link to="/login" className="text-gray-900 font-bold flex items-center gap-2 group text-lg">
                            Sign in to existing account <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-2.5 group">
                    <div className="bg-primary-50 p-2 rounded-lg">
                        <Shield className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">WytPass</span>
                </div>
                
                <p className="text-sm text-gray-400 font-medium order-3 md:order-2">
                    © 2026 Wytnet Identity Systems. Built for secure engineering.
                </p>

                <div className="flex gap-8 order-2 md:order-3">
                    <a href="https://github.com" className="text-sm text-gray-500 hover:text-primary-600 font-bold transition-colors">GitHub</a>
                    <a href="#" className="text-sm text-gray-500 hover:text-primary-600 font-bold transition-colors">Twitter</a>
                    <a href="#" className="text-sm text-gray-500 hover:text-primary-600 font-bold transition-colors">LinkedIn</a>
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
