import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { storage } from '@/utils/storage';
import Alert from '@/components/Alert';
import SocialLoginButtons from '@/components/SocialLoginButtons';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError, primaryDashboard, isAuthenticated } = useAuthStore();
  const searchParams = new URLSearchParams(window.location.search);
  let nextUrl = searchParams.get('next') || new URLSearchParams(location.search).get('next');
  
  // Ensure we redirect to the frontend consent page, not the proxied backend endpoint
  if (nextUrl?.startsWith('/oauth/authorize')) {
    nextUrl = nextUrl.replace('/oauth/authorize', '/consent/authorize');
  }
  const from = (location.state as any)?.from?.pathname;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const redirectAfterLogin = () => {
    console.log('Finalizing login. Destination:', nextUrl || from || 'dashboard');
    
    if (nextUrl) {
      // Handle OAuth authorize redirects specially to ensure token is passed if needed
      if (nextUrl.includes('/oauth/authorize') || nextUrl.includes('/consent/authorize')) {
        const token = storage.getAccessToken();
        const baseUrl = window.location.origin;
        try {
          const url = new URL(nextUrl, baseUrl);
          if (token) url.searchParams.set('token', token);
          console.log('OAuth Redirect:', url.toString());
          window.location.href = url.toString();
          return;
        } catch (e) {
          console.error('URL parse failed:', e);
        }
      }
      window.location.href = nextUrl;
      return;
    }
    
    window.location.href = from || primaryDashboard();
  };

  useEffect(() => {
    // 1. Check for token in URL first (highest priority)
    const urlToken = searchParams.get('token');
    if (urlToken) {
      console.log('Detected sync token, initializing session...');
      storage.setAccessToken(urlToken);
      // Immediate reload to the dashboard to refresh all store states
      window.location.href = '/admin/dashboard';
      return;
    }

    // 2. Check for existing session
    if (isAuthenticated) {
      redirectAfterLogin();
    }
  }, [isAuthenticated, searchParams]);

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      redirectAfterLogin();
    } catch {}
  };

  const quickLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      redirectAfterLogin();
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50/50">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary-600 shadow-lg shadow-primary-600/20 mb-3">
            <Shield className="w-5.5 h-5.5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Sign in</h1>
          <p className="text-gray-500 mt-0.5 text-[11px]">Access your SSO account</p>
        </div>

        <div className="card space-y-5 !p-6 shadow-xl shadow-gray-200/50">
          {error && (
            <Alert type="error" message={error} onClose={clearError} />
          )}

          <SocialLoginButtons next={nextUrl || undefined} />

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-[9px] uppercase font-bold tracking-widest text-gray-400">
              <span className="bg-white px-3">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                {...register('password')}
                type="password"
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">
              Create one
            </Link>
          </p>

          {import.meta.env.DEV && (
            <div className="border-t border-dashed border-gray-100 pt-5 space-y-2">
              <p className="text-[9px] uppercase text-gray-400 text-center font-bold tracking-widest">
                Dev quick login
              </p>
              <div className="grid gap-2">
                {[
                  { label: 'Super Admin', email: 'admin@example.com', color: 'amber', icon: Zap },
                  { label: 'App Admin', email: 'appadmin@example.com', color: 'blue', icon: Zap },
                  { label: 'End User', email: 'user@example.com', color: 'gray', icon: Zap },
                ].map((dev) => (
                  <button
                    key={dev.email}
                    type="button"
                    onClick={() => quickLogin(dev.email, dev.email.includes('admin') ? (dev.email.startsWith('app') ? 'AppAdmin123!@#' : 'Admin123!@#') : 'User123!@#')}
                    disabled={isLoading}
                    className={`flex items-center justify-between w-full rounded-lg bg-${dev.color}-50/50 border border-${dev.color}-100 px-3 py-2 text-[10px] font-medium text-${dev.color}-900 hover:bg-${dev.color}-100 transition-all hover:scale-[1.01]`}
                  >
                    <div className="flex items-center gap-2">
                      <dev.icon className={`w-3 h-3 text-${dev.color}-600`} />
                      <span className="font-semibold">{dev.label}</span>
                    </div>
                    <span className="font-mono opacity-60">{dev.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
