import { useState, useEffect } from 'react';
import { 
  Activity, Clock, User, ArrowUpRight, 
  ArrowDownRight, Search, Filter, MoreHorizontal
} from 'lucide-react';
import { clsx } from 'clsx';
import api from '@/services/api';

interface CreditLog {
  id: string;
  app_name: string | null;
  target_user_email: string | null;
  event_type: string;
  description: string | null;
  credits_change: number;
  created_at: string;
}

export default function CreditLogs() {
  const [logs, setLogs] = useState<CreditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await api.get('/v1/plans/credit-logs');
        setLogs(data);
      } catch (err) {
        console.error('Failed to fetch credit logs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.app_name?.toLowerCase().includes(search.toLowerCase()) ||
    log.target_user_email?.toLowerCase().includes(search.toLowerCase()) ||
    log.description?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credit Logs</h1>
          <p className="text-gray-500 mt-1">Every login event that consumed a credit, across all your apps.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none w-full md:w-64"
            />
          </div>
          <button className="p-2 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">App</th>
                <th className="px-6 py-4">User / Event</th>
                <th className="px-6 py-4 text-right">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-100 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-48 bg-gray-100 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-12 bg-gray-100 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No credit history found</p>
                    <p className="text-xs mt-1">Activity from your apps will appear here.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-600 font-medium">
                        {formatDate(log.created_at)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900">
                        {log.app_name || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-gray-700">
                          {log.target_user_email || 'System'}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                          {log.event_type.replace('_', ' ')}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={clsx(
                        "text-sm font-bold tabular-nums",
                        log.credits_change > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {log.credits_change > 0 ? `+${log.credits_change}` : log.credits_change}
                      </span>
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
