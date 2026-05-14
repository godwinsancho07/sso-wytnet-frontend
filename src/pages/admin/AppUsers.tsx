import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Users, Search, ChevronLeft, ChevronRight, Ban, UserCheck, 
  MoreVertical, Mail, Calendar, ShieldOff, RefreshCw
} from 'lucide-react';
import { appAdminService, AppUser, clientsAdminService, OAuthClientRead } from '@/services/admin';
import { clsx } from 'clsx';
import Alert from '@/components/Alert';

interface AppUserWithBan extends AppUser {
  is_banned: boolean;
}

export default function AppUsers() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AppUserWithBan[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [limit] = useState(20);
  const [app, setApp] = useState<OAuthClientRead | null>(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async (isManual = false) => {
    if (!clientId) return;
    if (isManual) setLoading(true);
    setError('');
    try {
      // Parallel fetch for app info and users
      const [appData, usersData] = await Promise.all([
        app === null ? clientsAdminService.get(clientId).catch(() => null) : Promise.resolve(app),
        appAdminService.getPaginatedUsers(clientId, { offset, limit, q: query })
      ]);
      
      if (appData) setApp(appData);
      setUsers(usersData.items);
      setTotal(usersData.total);
    } catch (e: any) {
      console.error(e);
      setError('Failed to load app users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(0);
      loadData(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, clientId]);

  useEffect(() => {
    loadData(true);
  }, [offset]);

  const handleBan = async (userId: string, currentlyBanned: boolean) => {
    if (!clientId) return;
    setActionLoading(userId);
    try {
      if (currentlyBanned) {
        await appAdminService.unbanUser(clientId, userId);
      } else {
        await appAdminService.banUser(clientId, userId);
      }
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/app-admin/clients')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-600" />
            {app?.app_name ? `${app.app_name} Users` : 'Application Users'}
          </h1>
          <p className="text-gray-500 text-sm">
            {app?.app_name 
              ? `Manage users who have authorized ${app.app_name}.` 
              : 'Manage users who have access to this application.'}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-bold text-gray-900">{total}</span> total users
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      <div className="card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">User</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Seen</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.user_id} className={clsx(
                  "hover:bg-gray-50/50 transition-colors",
                  u.is_banned && "bg-red-50/30"
                )}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 overflow-hidden border border-white shadow-sm">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (u.full_name?.[0] || u.email[0]).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">{u.full_name || 'User'}</div>
                        <div className="text-[10px] font-mono text-gray-400 truncate">{u.user_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-300" />
                      {u.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-3.5 h-3.5 text-gray-300" />
                      {u.last_seen ? new Date(u.last_seen).toLocaleDateString() : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {u.is_banned ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">
                        <ShieldOff className="w-3 h-3" /> Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                        <UserCheck className="w-3 h-3" /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleBan(u.user_id, u.is_banned)}
                      disabled={actionLoading === u.user_id}
                      className={clsx(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        u.is_banned 
                          ? "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-100" 
                          : "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                      )}
                    >
                      {actionLoading === u.user_id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : u.is_banned ? (
                        <><UserCheck className="w-3.5 h-3.5" /> Unban User</>
                      ) : (
                        <><Ban className="w-3.5 h-3.5" /> Ban User</>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing <span className="font-bold text-gray-900">{offset + 1}</span> to <span className="font-bold text-gray-900">{Math.min(offset + limit, total)}</span> of <span className="font-bold text-gray-900">{total}</span> users
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="p-2 border border-gray-200 rounded-lg bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-sm font-medium text-gray-700 mx-2">
                Page {currentPage} of {totalPages}
              </div>
              <button 
                onClick={() => setOffset(offset + limit)}
                disabled={currentPage >= totalPages}
                className="p-2 border border-gray-200 rounded-lg bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
