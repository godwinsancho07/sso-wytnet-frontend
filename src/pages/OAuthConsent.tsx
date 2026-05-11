import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '@/services/api';
import Alert from '@/components/Alert';
import { Shield, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: 'Verify your identity',
  profile: 'Access your name and avatar',
  email: 'Access your email address',
  offline_access: 'Stay signed in',
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [clientInfo, setClientInfo] = useState<{app_name: string, logo_url: string | null} | null>(null);
  const [error, setError] = useState('');

  const clientId = params.get('client_id') || '';
  const scopes = (params.get('scope') || 'openid').split(' ');
  const redirectUri = params.get('redirect_uri') || '';
  const state = params.get('state') || '';
  const nonce = params.get('nonce') || '';
  const codeChallenge = params.get('code_challenge') || '';
  const codeChallengeMethod = params.get('code_challenge_method') || '';

  useEffect(() => {
    if (!clientId) return;
    api.get(`/oauth/client-info?client_id=${clientId}`)
      .then(({ data }) => setClientInfo(data))
      .catch(() => setError('Invalid client application'));
  }, [clientId]);

  const approve = async () => {
    const url = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      confirm: 'true',
    });
    if (state) url.append('state', state);
    if (nonce) url.append('nonce', nonce);
    if (codeChallenge) url.append('code_challenge', codeChallenge);
    if (codeChallengeMethod) url.append('code_challenge_method', codeChallengeMethod);
    const t = params.get('token');
    if (t) url.append('token', t);
    try {
      // Use current origin to stay within port 3000 proxy
      window.location.href = `${import.meta.env.VITE_API_URL}/oauth/authorize?${url.toString()}`;
    } catch (err) {
      setError('Authorization failed');
    }
  };

  const deny = () => {
    window.location.href = `${redirectUri}?error=access_denied${state ? `&state=${state}` : ''}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 mb-4 p-3">
            {clientInfo?.logo_url ? (
              <img src={clientInfo.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Shield className="w-8 h-8 text-primary-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Trust this App?</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">An application is requesting access to your account.</p>
        </div>

        <div className="card space-y-6">
          {error && <Alert type="error" message={error} />}

          {/* User Profile Info */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.email}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Logged in as</p>
            </div>
            <button onClick={() => navigate('/login')} className="text-xs text-primary-600 font-semibold hover:underline">
              Switch
            </button>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">
              <span className="text-primary-600">{clientInfo?.app_name || clientId}</span> wants to verify your identity.
            </p>
            <div className="space-y-3">
              {scopes.map((scope) => (
                <div key={scope} className="flex items-start gap-3 text-sm text-gray-600">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-3 h-3" />
                  </div>
                  <span>{SCOPE_DESCRIPTIONS[scope] || scope}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button onClick={approve} className="btn-primary w-full py-3">
              Trust this App
            </button>
            <button onClick={deny} className="btn-secondary w-full py-3 border-none shadow-none text-gray-400 hover:text-gray-600 hover:bg-transparent">
              Cancel
            </button>
          </div>

          <div className="pt-2 text-center border-t border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              Securely authenticated by WytPass
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
