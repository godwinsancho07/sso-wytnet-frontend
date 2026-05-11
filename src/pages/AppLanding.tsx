import { useSearchParams } from 'react-router-dom';
import { Shield } from 'lucide-react';
import api from '@/services/api';

const APPS: Record<string, { name: string; clientId: string }> = {
  'habit-tracking': {
    name: 'Habit Tracking',
    clientId: 'client_XCCfrYINlTpyDqKD3b1Hsw',
  },
  'project-a': {
    name: 'Project A',
    clientId: 'client_xRleoxpBuyHaFScBx2bFQA',
  },
};

export default function AppLanding() {
  const [params] = useSearchParams();
  const appKey = params.get('app') || 'habit-tracking';
  const app = APPS[appKey] || APPS['habit-tracking'];

  const handleLogin = () => {
    const redirectUri = `${window.location.origin}/apps/callback?app=${appKey}`;
    const authUrl = new URL(`${window.location.origin}/oauth/authorize`);
    authUrl.searchParams.set('client_id', app.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    
    window.location.href = authUrl.toString();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-primary-600 mb-2">{app.name}</h1>
            <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-sm text-gray-500 mt-2">
              Please sign in to continue to your dashboard.
            </p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-black text-white rounded-xl py-4 font-bold text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign in with WytPass
          </button>
        </div>
      </div>
    </div>
  );
}
