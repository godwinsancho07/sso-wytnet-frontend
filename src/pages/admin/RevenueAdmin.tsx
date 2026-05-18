import { useState, useEffect } from 'react';
import { 
  DollarSign, CreditCard, TrendingUp, Search, 
  Download, Filter, ArrowUpRight, ArrowDownRight,
  ShoppingCart, Calendar, User, Globe, Zap
} from 'lucide-react';
import { adminService, RevenueReport } from '@/services/admin';
import api from '@/services/api';
import { clsx } from 'clsx';

export default function RevenueAdmin() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    Promise.all([
      adminService.getRevenue(),
      api.get('/v1/plans/debug/logs').then(r => r.data).catch(() => ({ event_types: [], total_logs: 0 }))
    ]).then(([revenueData, debugLogs]) => {
      setData({ ...revenueData, debug_all: debugLogs });
    }).finally(() => setLoading(false));
  }, []);

  const filteredPayments = data?.recent_payments?.filter((p: any) => 
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.plan_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Financial Overview
            {data?.debug?.raw_log_count > 0 && (
              <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full border border-primary-100 font-bold">
                {data.debug.raw_log_count} UPGRADES
              </span>
            )}
          </h1>
          <div className="flex flex-col gap-1 mt-1">
            <p className="text-gray-500 text-sm">Track platform revenue and plan upgrades.</p>
            {data?.debug && (
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full border border-primary-100 font-bold">
                  {data.debug.raw_log_count} LOGS FOUND
                </span>
                <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100 font-medium">
                  Types: {data.debug.found_types?.join(', ') || 'None'}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={async () => {
              try {
                await api.post('/v1/plans/debug/simulate');
                alert('Test Transaction Successful!');
                window.location.reload();
              } catch (err: any) {
                alert('Test Failed: ' + (err.response?.data?.detail || err.message));
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-100 text-primary-700 rounded-xl text-sm font-bold hover:bg-primary-100 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Test Transaction
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RevenueKPI 
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Lifetime Revenue"
          value={`₹${(data?.total_revenue ?? 0).toLocaleString()}`}
          trend="+12% from last month"
          color="blue"
        />
        <RevenueKPI 
          icon={<TrendingUp className="w-5 h-5" />}
          label="Average Order Value"
          value="₹1.00"
          trend="Stable"
          color="green"
        />
        <RevenueKPI 
          icon={<ShoppingCart className="w-5 h-5" />}
          label="Total Plan Upgrades"
          value={(data?.total_payments ?? 0).toLocaleString()}
          trend="+5 new today"
          color="purple"
        />
      </div>

      {/* Transactions Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-600" />
            Upgrade Transactions
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search user email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 w-64"
              />
            </div>
            <button className="p-2 bg-gray-50 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[11px] uppercase font-bold text-gray-500 tracking-wider">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Plan Details</th>
                <th className="px-6 py-4">Transaction Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-700 font-bold text-xs">
                          {p.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{p.email}</p>
                          <p className="text-[10px] text-gray-500">ID: ...{Math.random().toString(16).slice(2, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-700">{p.plan_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-3.5 h-3.5 opacity-40" />
                        <span className="text-sm">{new Date(p.date).toLocaleDateString()}</span>
                        <span className="text-[10px] opacity-40">{new Date(p.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 text-sm">
                      ₹{p.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-tighter">
                          Successful
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.recent_payments.length > 0 && (
          <div className="p-4 bg-gray-50/30 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
            <p>Showing {filteredPayments.length} of {data.total_payments} total transactions</p>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled>Previous</button>
              <button className="px-3 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RevenueKPI({ icon, label, value, trend, color }: { icon: any, label: string, value: string, trend: string, color: 'blue' | 'green' | 'purple' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", colors[color])}>
          {icon}
        </div>
        <div className={clsx(
          "px-2 py-1 rounded-lg text-[10px] font-bold",
          trend.startsWith('+') ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-600"
        )}>
          {trend}
        </div>
      </div>
      <div>
        <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
        <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
