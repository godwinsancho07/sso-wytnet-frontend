import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldOff, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function BannedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const logout = useAuthStore((s) => s.logout);
  const clientId = searchParams.get('client_id');

  const handleBackToLogin = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <ShieldOff className="w-10 h-10 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-500">
            Sorry, you have been banned from using this application by the app administrator.
          </p>
        </div>

        {clientId && (
          <div className="p-3 bg-gray-50 rounded-xl text-xs font-mono text-gray-400 break-all">
            Client ID: {clientId}
          </div>
        )}

        <button
          onClick={handleBackToLogin}
          className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-100 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          OK, Back to Login
        </button>
      </div>
    </div>
  );
}
