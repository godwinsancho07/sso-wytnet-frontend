import { useSearchParams } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { startAuthorizationFlow } from '@/oauth/client';

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

  const handleLogin = async () => {
    const config = {
      authorizationEndpoint: `${window.location.origin}/oauth/authorize`,
      tokenEndpoint: `${import.meta.env.VITE_API_URL}/oauth/token`,
      clientId: app.clientId,
      redirectUri: `${window.location.origin}/apps/callback?app=${appKey}`,
      scope: 'openid profile email offline_access',
    };
    
    try {
      await startAuthorizationFlow(config);
    } catch (error) {
      console.error('Failed to start login:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 mb-2">
              <Shield className="w-8 h-8" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{app.name}</h1>
            <p className="text-sm text-gray-500">
              Sign in with your WytPass account to continue.
            </p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-primary-600 text-white rounded-xl py-4 font-bold text-sm shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-700 hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign in with WytPass
          </button>
        </div>
      </div>
    </div>
  );
}

