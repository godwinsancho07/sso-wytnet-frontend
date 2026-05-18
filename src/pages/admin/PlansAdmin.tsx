import { useState, useEffect } from 'react';
import { 
  Rocket, Plus, Pencil, ExternalLink, Shield, Users, 
  Layers, CheckCircle2, AlertCircle, Trash2, ArrowRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { Link, useNavigate } from 'react-router-dom';
import { plansAdminService, Plan, PlanStats } from '@/services/admin';
import Alert from '@/components/Alert';

export default function PlansAdmin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'DEVELOPER'>('DEVELOPER');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stats, setStats] = useState<PlanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansData, statsData] = await Promise.all([
        plansAdminService.list(activeTab),
        plansAdminService.getStats()
      ]);
      setPlans(plansData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    try {
      await plansAdminService.remove(id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete plan');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Plans</h1>
          <p className="text-gray-500 mt-1">
            Manage pricing, credits, and limits for Developer and User plans.
          </p>
        </div>
        <button 
          onClick={() => navigate('/admin/plans/new')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-all shadow-sm shadow-primary-200"
        >
          <Plus className="w-4 h-4" />
          <span>New plan</span>
        </button>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard 
          label="DEVELOPER PLANS" 
          value={stats?.developer_plans_count || 0} 
          subtitle="Available tiers" 
          color="blue"
        />
        <StatsCard 
          label="ACTIVE DEVELOPER APPS" 
          value={stats?.active_developer_apps_count || 0} 
          subtitle="Across all plans" 
          color="green"
        />
        <StatsCard 
          label="TOTAL USERS" 
          value={stats?.total_enrolled_users_count || 0} 
          subtitle="Total users" 
          color="orange"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('DEVELOPER')}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === 'DEVELOPER' 
              ? "bg-white text-primary-700 shadow-sm" 
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          <div className={clsx(
            "w-5 h-5 rounded flex items-center justify-center",
            activeTab === 'DEVELOPER' ? "bg-primary-100" : "bg-gray-200"
          )}>
             <Rocket className="w-3 h-3" />
          </div>
          Developer Plans
          <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px]">
            {stats?.developer_plans_count || 0}
          </span>
        </button>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">API Call Requests Per App</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">App Registrations</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Credit Reset</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No plans found for this category.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                          plan.name.toLowerCase() === 'free' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {plan.name.toLowerCase() === 'free' ? <Layers className="w-5 h-5" /> : <Rocket className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                            {plan.name}
                            {plan.is_default && (
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">Default</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-1">{plan.description || (plan.name === 'Free' ? 'Default plan' : 'Paid plan')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">₹{plan.price} <span className="text-gray-400 font-normal">/ mo</span></p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 font-medium">
                        {plan.credits_limit === 0 ? 'Unlimited' : `${plan.credits_limit} requests per app`}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">
                         {plan.app_registrations_limit === 0 ? 'Unlimited' : plan.app_registrations_limit}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 capitalize">{plan.reset_interval.toLowerCase()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm",
                        plan.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      )}>
                        <div className={clsx("w-1 h-1 rounded-full", plan.is_active ? "bg-emerald-500" : "bg-red-500")} />
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => navigate(`/admin/plans/${plan.id}/edit`)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(plan.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ label, value, subtitle, color }: { label: string; value: number | string; subtitle: string; color: 'blue' | 'purple' | 'green' | 'orange' }) {
  const colors = {
    blue: "border-blue-500 from-blue-50 to-white",
    purple: "border-purple-500 from-purple-50 to-white",
    green: "border-emerald-500 from-emerald-50 to-white",
    orange: "border-orange-500 from-orange-50 to-white",
  };

  return (
    <div className={clsx(
      "bg-white border-t-2 rounded-2xl p-5 shadow-sm bg-gradient-to-b transition-all hover:shadow-md",
      colors[color]
    )}>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 tracking-tight mb-1">{value}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}
