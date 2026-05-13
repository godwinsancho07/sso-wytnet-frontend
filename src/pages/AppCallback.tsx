import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { handleCallback } from '@/oauth/client';

const CLIENT_IDS: Record<string, string> = {
  'habit-tracking': 'client_XCCfrYINlTpyDqKD3b1Hsw',
  'project-a': 'client_xRleoxpBuyHaFScBx2bFQA',
};

export default function AppCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Completing login...');
  
  const appKey = params.get('app') || 'habit-tracking';
  const clientId = CLIENT_IDS[appKey];

  useEffect(() => {
    async function completeLogin() {
      const config = {
        authorizationEndpoint: `${window.location.origin}/oauth/authorize`,
        tokenEndpoint: `${import.meta.env.VITE_API_URL}/oauth/token`,
        clientId: clientId,
        redirectUri: `${window.location.origin}/apps/callback?app=${appKey}`,
        scope: 'openid profile email offline_access',
      };

      try {
        const tokens = await handleCallback(config);
        localStorage.setItem(`${appKey}_access_token`, tokens.access_token);
        if (tokens.id_token) {
          localStorage.setItem(`${appKey}_id_token`, tokens.id_token);
        }
        
        setStatus('Login successful! Redirecting...');
        setTimeout(() => navigate(`/apps/dashboard?app=${appKey}`), 800);
      } catch (error: any) {
        console.error('Callback error:', error);
        setStatus(error.message || 'Login failed. Please try again.');
      }
    }

    completeLogin();
  }, [appKey, clientId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{status}</p>
      </div>
    </div>
  );
}

