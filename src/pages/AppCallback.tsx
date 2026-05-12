import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';

export default function AppCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Completing login...');
  
  const code = params.get('code');
  const appKey = params.get('app') || 'habit-tracking';

  useEffect(() => {
    if (!code) {
      setStatus('Login failed: No code provided');
      return;
    }

    // Retrieve the PKCE verifier we stored during the launch
    const verifier = localStorage.getItem('pkce_verifier');

    // In a real scenario, this would be done by the backend of the sub-app.
    // For this demo, we'll use the params or fallback to the main SSO client for the exchange
    const clientId = params.get('client_id') || 'client_XCCfrYINlTpyDqKD3b1Hsw';
    
    // Construct token request
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: clientId,
      redirect_uri: `${window.location.origin}/apps/callback?app=${appKey}`,
    });
    if (verifier) formData.append('code_verifier', verifier);

    api.post('/oauth/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    .then(({ data }) => {
      localStorage.setItem(`${appKey}_access_token`, data.access_token);
      localStorage.removeItem('pkce_verifier'); // Clean up
      setStatus('Login successful! Redirecting...');
      setTimeout(() => navigate(`/apps/dashboard?app=${appKey}`), 800);
    })
    .catch(() => setStatus('Connection error. Please try again.'));
    
  }, [code, appKey, navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{status}</p>
      </div>
    </div>
  );
}
