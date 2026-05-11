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

    // In a real scenario, this would be done by the backend of the sub-app.
    // Since we're simulating the sub-app inside the SPA for demonstration:
    const clientId = appKey === 'habit-tracking' ? 'client_XCCfrYINlTpyDqKD3b1Hsw' : 'client_xRleoxpBuyHaFScBx2bFQA';
    const clientSecret = appKey === 'habit-tracking' ? '1TNI92JAe4boCf_wsxK5ndNGOR7uQyqLHzuQh4Jz7S0' : 'QmeXxUynHJmprGu2J1TLi40WtaOSa4xgIWOZHcQY5jU';
    
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${window.location.origin}/apps/callback?app=${appKey}`,
    });

    api.post('/oauth/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    .then(({ data }) => {
      localStorage.setItem(`${appKey}_access_token`, data.access_token);
      setStatus('Login successful! Redirecting...');
      setTimeout(() => navigate(`/apps/dashboard?app=${appKey}`), 800);
    })
    .catch(() => setStatus('Connection error. Please try again.'));
  }, [code, appKey, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{status}</p>
      </div>
    </div>
  );
}
