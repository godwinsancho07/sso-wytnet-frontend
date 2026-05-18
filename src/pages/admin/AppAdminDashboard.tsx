import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appAdminService, AdminGlobalOverview } from '@/services/admin';
import { useAuthStore } from '@/store/authStore';
import {
  Briefcase, Users, Activity, RefreshCw, Layers, ShieldCheck, Zap,
} from 'lucide-react';

export default function AppAdminDashboard() {
  const [metrics, setMetrics] = useState<AdminGlobalOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    appAdminService.getGlobalMetrics()
      .then(setMetrics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration Overview</h1>
          <p className="text-gray-500 text-sm mt-1">
            Global metrics for all applications under your management.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
          <Activity className="w-3 h-3 text-green-500" />
          REFRESHED: {metrics?.generated_at ? new Date(metrics.generated_at).toLocaleTimeString() : 'N/A'}
        </div>
      </div>



      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Layers className="w-5 h-5 text-indigo-600" />}
          label="Total Applications"
          value={metrics?.total_apps || 0}
          trend="Owned by you"
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-600" />}
          label="Total Users"
          value={metrics?.total_users || 0}
          trend="Unique authorizations"
        />
        <StatCard
          icon={<Zap className="w-5 h-5 text-amber-600" />}
          label="Active Tokens"
          value={metrics?.active_tokens || 0}
          trend="Currently valid"
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-emerald-600" />}
          label="24h Activity"
          value={metrics?.tokens_24h || 0}
          trend="Tokens issued"
        />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-600" />
            Recent Activity
          </h2>
        </div>
        <div className="text-center py-12 text-gray-400">
           <Activity className="w-10 h-10 mx-auto mb-4 opacity-20" />
           <p className="text-sm">Activity feed coming soon...</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, onClick, actionLabel }: any) {
  return (
    <div className="card p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <h3 className="text-3xl font-bold text-gray-900 mt-1">{value}</h3>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-400">{trend}</span>
        {onClick && (
          <button 
            onClick={onClick}
            className="text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            {actionLabel} →
          </button>
        )}
      </div>
    </div>
  );
}
