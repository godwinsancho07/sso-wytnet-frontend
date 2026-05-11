import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '@/services/api';
import { LogOut, CheckCircle2 } from 'lucide-react';

export default function AppDashboard() {
  const [params] = useSearchParams();
  const appKey = params.get('app') || 'habit-tracking';
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem(`${appKey}_access_token`);
    if (token) {
      api.get('/oauth/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(({ data }) => setUser(data));
    }
  }, [appKey]);

  const habits = [
    { name: 'Morning Run', streak: '5 days' },
    { name: 'Read 20 Pages', streak: '12 days' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-600">Habit Tracking</h1>
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                {user?.name?.[0] || 'U'}
             </div>
             <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
               <LogOut className="w-4 h-4" />
             </button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">My Habits</h2>
          <p className="text-xs text-gray-400 -mt-2">Track your daily progress and stay consistent.</p>
          
          <div className="space-y-3">
            {habits.map((h) => (
              <div key={h.name} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{h.name}</p>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Streak: {h.streak}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-primary-500" />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-gray-50 text-center">
          <p className="text-[10px] text-gray-400">
            Logged in as <span className="font-bold text-gray-500">{user?.email || '...'}</span> via WytPass SSO
          </p>
        </div>
      </div>
    </div>
  );
}
