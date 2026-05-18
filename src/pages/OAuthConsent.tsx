import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api, { API_URL } from '@/services/api';
import Alert from '@/components/Alert';
import { Shield, CheckCircle, ChevronRight, Lock, ArrowLeftRight } from 'lucide-react';
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
  const [clientInfo, setClientInfo] = useState<{
    app_name: string, 
    logo_url: string | null, 
    out_of_credits: boolean
  } | null>(null);
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
      .then(({ data }) => {
        setClientInfo(data);
        if (data.is_banned) {
          navigate(`/banned?client_id=${clientId}`, { replace: true });
        }
      })
      .catch(() => setError('Invalid client application'));
  }, [clientId, navigate]);

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
    if (codeChallenge) {
      url.append('code_challenge', codeChallenge);
      url.append('code_challenge_method', codeChallengeMethod || 'S256');
    }
    const t = params.get('token');
    if (t) url.append('token', t);
    
    try {
      window.location.href = `${API_URL}/oauth/authorize?${url.toString()}`;
    } catch (err) {
      setError('Authorization failed');
    }
  };

  const deny = () => {
    window.location.href = `${redirectUri}?error=access_denied${state ? `&state=${state}` : ''}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#fafafa]">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-50 rounded-full blur-[120px] opacity-60" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
      </div>

      <div className="w-full max-w-[440px]">
        <div className="bg-white rounded-[24px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden">
          {/* Header Section */}
          <div className="p-6 text-center border-b border-gray-50">
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-white shadow-sm border border-gray-100 p-2.5 flex items-center justify-center">
                <Shield className="w-7 h-7 text-primary-600" />
              </div>
              <ArrowLeftRight className="w-4 h-4 text-gray-300" />
              <div className="w-14 h-14 rounded-xl bg-white shadow-sm border border-gray-100 p-2.5 flex items-center justify-center">
                {clientInfo?.logo_url ? (
                  <img src={clientInfo.logo_url} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 font-bold text-xl">
                    {clientInfo?.app_name?.[0] || '?'}
                  </div>
                )}
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-gray-900 mb-1">Connect to {clientInfo?.app_name || 'Application'}</h1>
            <p className="text-gray-500 text-[11px] font-medium px-4">An application is requesting access to your WytPass account.</p>
          </div>

          <div className="p-6 space-y-6">
            {error && <Alert type="error" message={error} />}

            {/* Account Selector Section */}
            <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary-200">
                {user?.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Authenticated as</p>
                <p className="text-sm font-bold text-gray-900 truncate">{user?.email}</p>
              </div>
              <button 
                onClick={() => navigate('/login')} 
                className="text-xs text-primary-600 font-bold hover:text-primary-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-primary-50"
              >
                Switch
              </button>
            </div>

            {/* Permissions Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                Requested Access
                <Lock className="w-3.5 h-3.5 text-gray-400" />
              </h3>
              <div className="space-y-3">
                {scopes.map((scope) => (
                  <div key={scope} className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white border border-gray-100 hover:border-primary-100 hover:bg-primary-50/10 transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800 leading-none mb-1">{scope.charAt(0).toUpperCase() + scope.slice(1)}</p>
                        <p className="text-[11px] text-gray-400 font-medium leading-none">{SCOPE_DESCRIPTIONS[scope] || 'Access shared information'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Section */}
            <div className="space-y-3 pt-2">
              {clientInfo?.out_of_credits ? (
                <div className="space-y-3">
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                    <p className="text-xs text-red-800 font-medium leading-relaxed text-center">
                      Access Denied: This application is currently disabled for new users because it has reached the user limit of its current plan. 
                      Once the developer upgrades their plan, access will be restored.
                    </p>
                  </div>
                  <button 
                    disabled
                    className="w-full py-3.5 bg-gray-100 text-gray-400 rounded-2xl text-sm font-bold cursor-not-allowed"
                  >
                    Trust and Continue
                  </button>
                </div>
              ) : (
                <button 
                  onClick={approve} 
                  className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 group shadow-lg shadow-primary-100"
                >
                  Trust and Continue
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
              <button 
                onClick={deny} 
                className="w-full py-3.5 text-sm font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-2xl transition-all"
              >
                Cancel Request
              </button>
            </div>
          </div>

          <div className="px-8 pb-8 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">
              Securely Powered by WytPass
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-xs text-gray-400 font-medium px-8">
            Only grant access to applications you trust. WytPass never shares your password with third-party apps.
        </p>
      </div>
    </div>
  );
}
