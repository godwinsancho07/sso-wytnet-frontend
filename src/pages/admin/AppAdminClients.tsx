import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import {
  Briefcase, Search, MoreVertical, Edit2, LayoutGrid, RefreshCw, Globe, 
  Trash2,
  X,
  Copy,
  Check,
  FileDown,
  AlertTriangle,
  ChevronDown,
  KeyRound,
  Rocket,
  Zap
} from 'lucide-react';
import { clsx } from 'clsx';
import { clientsAdminService, appAdminService, OAuthClientWithSecret, AppUser } from '@/services/admin';
import Alert from '@/components/Alert';
import { useAuthStore } from '@/store/authStore';

interface OwnedClient {
  id: string;
  client_id: string;
  app_name: string;
  description: string | null;
  redirect_uris: string[];
  allowed_scopes: string[];
  is_active: boolean;
  user_count: number;
  created_at: string;
  plan_id?: string;
  credits_used?: number;
  credits_limit?: number;
}

export default function AppAdminClients() {
  const [clients, setClients] = useState<OwnedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<OwnedClient | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isGlobalUnlimited = user?.plan_id === 'unlimited' || user?.plan?.credits_limit === 0;

  const loadClients = () => {
    setLoading(true);
    api.get<OwnedClient[]>('/v1/clients')
      .then((r) => setClients(r.data.filter(c => !c.app_name.toLowerCase().includes('internal sso'))))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClients();
  }, []);

  const filtered = clients
    .filter(c => !c.app_name.toLowerCase().includes('internal sso'))
    .filter(c => 
      c.app_name.toLowerCase().includes(query.toLowerCase()) || 
      c.client_id.toLowerCase().includes(query.toLowerCase())
    );

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registered Applications</h1>
          <p className="text-gray-500 text-sm mt-1">
            Applications you have registered and manage on this platform.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search applications..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary gap-2 whitespace-nowrap"
          >
            <Briefcase className="w-4 h-4" /> Register App
          </button>
        </div>
      </div>

      <div className="card">
        <div className="overflow-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Application</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Users</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Redirect URI</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading applications...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No applications found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-lg shrink-0">
                          {c.app_name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate">{c.app_name}</div>
                          <div className="text-[10px] font-mono text-gray-400 truncate">{c.client_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-gray-500 truncate">{c.description || 'No description'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <UserListDropdown clientId={c.id} initialCount={c.user_count} />
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      )}>
                        <span className={clsx('w-1.5 h-1.5 rounded-full', c.is_active ? 'bg-green-500' : 'bg-gray-400')} />
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {c.redirect_uris[0] ? (
                        <a 
                          href={c.redirect_uris[0]} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[150px]">
                            {(() => {
                              try {
                                return new URL(c.redirect_uris[0]).hostname;
                              } catch {
                                return c.redirect_uris[0];
                              }
                            })()}
                          </span>
                        </a>
                      ) : (
                        <span className="text-gray-300">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end">
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveMenu(activeMenu === c.id ? null : c.id);
                            }}
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {activeMenu === c.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setActiveMenu(null)}
                              />
                              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-100">
                                <button 
                                  onClick={() => {
                                    navigate(`/app-admin/clients/${c.id}/users`);
                                    setActiveMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <LayoutGrid className="w-4 h-4 text-gray-400" /> App Users
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedClient(c);
                                    setActiveMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Edit2 className="w-4 h-4 text-gray-400" /> Edit Settings
                                </button>
                                {!isGlobalUnlimited && c.credits_limit !== 0 && (
                                  <button 
                                    onClick={() => {
                                      // Navigate to a plan upgrade page
                                      navigate(`/app-admin/clients/${c.id}/upgrade`);
                                      setActiveMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2 font-medium"
                                  >
                                    <Rocket className="w-4 h-4" /> Upgrade Plan
                                  </button>
                                )}
                                <div className="border-t border-gray-50" />
                                <button 
                                  onClick={() => {
                                    if (confirm(`Delete application "${c.app_name}"?`)) {
                                      clientsAdminService.remove(c.id)
                                        .then(() => {
                                          loadClients();
                                          setActiveMenu(null);
                                        })
                                        .catch((e) => alert(e.response?.data?.detail || 'Delete failed'));
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4 opacity-70" /> Delete App
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateClientModal 
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => {
            loadClients();
          }}
        />
      )}

      {selectedClient && (
        <EditDrawer 
          client={selectedClient} 
          onClose={() => setSelectedClient(null)} 
          onUpdated={() => {
            loadClients();
            setSelectedClient(null);
          }}
        />
      )}
    </div>
  );
}

function UserListDropdown({ clientId, initialCount }: { clientId: string; initialCount: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && users.length === 0) {
      setLoading(true);
      try {
        const data = await appAdminService.getRecentUsers(clientId);
        setUsers(data);
      } catch (e) {}
      setLoading(false);
    }
    setIsOpen(!isOpen);
  };

  const filtered = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button 
        onClick={toggle}
        className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors bg-white shadow-sm"
      >
        <div className="w-6 h-6 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center text-[8px] font-bold border border-primary-100">
           {users[0]?.full_name?.[0] || 'U'}
        </div>
        <span className="text-xs font-medium text-gray-700">
           {initialCount} {initialCount === 1 ? 'user' : 'users'}
        </span>
        <ChevronDown className={clsx("w-3.5 h-3.5 text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in duration-100">
            <div className="p-3 border-b border-gray-50 bg-gray-50/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-400 text-xs">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-xs">No users found</div>
              ) : (
                filtered.map(u => (
                  <div key={u.user_id} className="p-3 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                     <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 overflow-hidden shrink-0 border border-white">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (u.full_name?.[0] || u.email[0]).toUpperCase()}
                     </div>
                     <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">{u.full_name || 'User'}</div>
                        <div className="text-[10px] text-gray-400 truncate">{u.email}</div>
                     </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EditDrawer({ client, onClose, onUpdated }: { client: OwnedClient; onClose: () => void; onUpdated: () => void }) {
  const { user } = useAuthStore();
  const isGlobalUnlimited = user?.plan_id === 'unlimited' || user?.plan?.credits_limit === 0;
  const navigate = useNavigate();
  const [appName, setAppName] = useState(client.app_name);
  const [description, setDescription] = useState(client.description || '');
  const [uris, setUris] = useState<string[]>(client.redirect_uris);
  const [scopes, setScopes] = useState<string[]>(client.allowed_scopes);
  const [isActive, setIsActive] = useState(client.is_active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [admins, setAdmins] = useState<AppUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);

  const loadAdmins = async () => {
    setAdminsLoading(true);
    try {
      const { data } = await api.get(`/v1/clients/${client.id}/admins`);
      setAdmins(data);
    } catch (e) {}
    setAdminsLoading(false);
  };

  useEffect(() => {
    loadAdmins();
  }, [client.id]);

  const toggleScope = (s: string) =>
    setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await clientsAdminService.update(client.id, {
        app_name: appName,
        description: description || null,
        redirect_uris: uris.filter(u => u.trim()),
        allowed_scopes: scopes,
        is_active: isActive,
      });
      setSuccess('Settings updated successfully');
      onUpdated();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const rotate = async () => {
    if (!confirm('Rotate client secret? Old secret will stop working immediately.')) return;
    try {
      const res = await clientsAdminService.rotateSecret(client.id);
      alert(`NEW CLIENT SECRET:\n\n${res.client_secret}\n\nSAVE THIS NOW. IT WILL NEVER BE SHOWN AGAIN.`);
      onUpdated();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Rotation failed');
    }
  };

  const removeApp = async () => {
    if (!confirm(`Delete application "${client.app_name}"? This cannot be undone.`)) return;
    try {
      await clientsAdminService.remove(client.id);
      onClose();
      onUpdated();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Delete failed');
    }
  };

  const assignAdmin = async (u: any) => {
    try {
      await api.post(`/v1/clients/${client.id}/admins`, { user_id: u.id });
      loadAdmins();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to assign admin');
    }
  };

  const removeAdmin = async (userId: string) => {
    try {
      await api.delete(`/v1/clients/${client.id}/admins/${userId}`);
      loadAdmins();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to remove admin');
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex justify-end">
      <div className="bg-white w-full max-w-xl shadow-xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        <div className="flex items-start justify-between p-5 border-b shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{client.app_name}</h2>
            <code className="text-xs text-gray-400 font-mono break-all">{client.client_id}</code>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {error && <Alert type="error" message={error} />}
          {success && <Alert type="success" message={success} />}

          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Application Name</label>
                <input 
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input w-full min-h-[80px] resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Redirect URIs</label>
                <div className="space-y-2">
                  {uris.map((u, i) => (
                    <div key={i} className="flex gap-2">
                      <input 
                        value={u}
                        onChange={(e) => setUris(curr => curr.map((v, idx) => idx === i ? e.target.value : v))}
                        className="input flex-1 text-sm font-mono"
                      />
                      {uris.length > 1 && (
                        <button onClick={() => setUris(curr => curr.filter((_, idx) => idx !== i))} className="p-2 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setUris([...uris, ''])} className="text-xs font-bold text-primary-600 hover:underline">
                    + Add redirect URI
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">Allowed Scopes</label>
                <div className="flex flex-wrap gap-2">
                  {['openid', 'profile', 'email', 'offline_access'].map(s => (
                    <button 
                      key={s} 
                      onClick={() => toggleScope(s)}
                      className={clsx(
                        "px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border outline-none",
                        scopes.includes(s) 
                          ? "bg-primary-600 border-primary-600 text-white shadow-sm" 
                          : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={save} 
                disabled={saving}
                className="btn-primary w-fit px-8 py-2.5 text-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan & Credits</h3>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Rocket className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Current Plan</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Active</p>
                  </div>
                </div>
                {!isGlobalUnlimited && client.credits_limit !== 0 && (
                  <button 
                    onClick={() => navigate(`/app-admin/clients/${client.id}/upgrade`)}
                    className="px-3 py-1.5 bg-primary-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Upgrade
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 font-medium">Monthly Logins</span>
                  <span className="text-gray-900 font-bold">{client.credits_used || 0} / {client.credits_limit || '∞'}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-primary-600 transition-all duration-500" 
                     style={{ width: `${Math.min(100, ((client.credits_used || 0) / (client.credits_limit || 1)) * 100)}%` }}
                   />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Administrators</h3>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">{admins.length} Total</span>
            </div>
            <p className="text-xs text-gray-500">Users granted app-admin scope for this client.</p>
            
            <AdminUserPicker onPick={assignAdmin} excludeIds={admins.map(a => a.user_id)} />

            <div className="flex flex-wrap gap-2">
              {adminsLoading ? (
                <span className="text-xs text-gray-400">Loading admins...</span>
              ) : admins.length === 0 ? (
                <span className="text-xs text-gray-400 italic">No admins assigned yet.</span>
              ) : (
                admins.map(a => (
                  <div key={a.user_id} className="inline-flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full pl-1 pr-2 py-1">
                    {a.avatar_url ? (
                      <img src={a.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[9px] font-bold flex items-center justify-center">
                        {(a.full_name?.[0] || a.email[0]).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-gray-700">{a.email}</span>
                    <button onClick={() => removeAdmin(a.user_id)} className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Integration</h3>
            <button 
              onClick={() => clientsAdminService.downloadIntegrationDocs(client.id, client.app_name)}
              className="flex items-center gap-3 w-full p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors group text-left"
            >
              <div className="p-2.5 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                <FileDown className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-900">Download integration docs</div>
                <div className="text-[10px] text-gray-400">Markdown — share with the team integrating this app</div>
              </div>
            </button>
          </section>

          <section className="space-y-4 border-t pt-6 pb-12">
            <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Danger Zone</h3>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={rotate}
                className="flex items-center gap-3 w-full p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="p-2 bg-gray-100 rounded-lg">
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">Rotate secret</div>
                  <div className="text-[10px] text-gray-400">Invalidate current secret and generate new one</div>
                </div>
              </button>

              <button 
                onClick={async () => {
                  try {
                    await clientsAdminService.update(client.id, { is_active: !isActive });
                    setIsActive(!isActive);
                  } catch (e) {}
                }}
                className="flex items-center gap-3 w-full p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Globe className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{isActive ? 'Disable' : 'Enable'} client</div>
                  <div className="text-[10px] text-gray-400">{isActive ? 'Prevent all logins for this app' : 'Allow logins for this app'}</div>
                </div>
              </button>

              <button 
                onClick={removeApp}
                className="flex items-center gap-3 w-full p-3 bg-red-50/50 border border-red-100 rounded-xl hover:bg-red-50 transition-colors text-left"
              >
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-red-600">Delete application</div>
                  <div className="text-[10px] text-red-400">Permanently remove this application and all tokens</div>
                </div>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function AdminUserPicker({ onPick, excludeIds }: { onPick: (u: any) => void; excludeIds: string[] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open || query.length < 2) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/v1/users', { params: { q: query, role: 'app_admin', limit: 5 } });
        setResults(data.items.filter((u: any) => !excludeIds.includes(u.id)));
      } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, open, excludeIds]);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
        <Search className="w-4 h-4 text-gray-400" />
        <input 
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Add admin by email or name..."
          className="bg-transparent border-none outline-none text-sm flex-1"
        />
      </div>
      {open && (query.length >= 2) && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
          {loading ? (
            <div className="p-4 text-center text-xs text-gray-400">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400">No matching admins found.</div>
          ) : (
            results.map(u => (
              <button 
                key={u.user_id}
                onClick={() => { onPick({ id: u.user_id, ...u }); setQuery(''); setOpen(false); }}
                className="w-full p-3 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                  {(u.full_name?.[0] || u.email[0]).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-900 truncate">{u.full_name || 'User'}</div>
                  <div className="text-[10px] text-gray-400 truncate">{u.email}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CreateClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [appName, setAppName] = useState('');
  const [description, setDescription] = useState('');
  const [redirectUris, setRedirectUris] = useState(['']);
  const [allowedScopes, setAllowedScopes] = useState(['openid', 'profile', 'email']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdClient, setCreatedClient] = useState<OAuthClientWithSecret | null>(null);

  const [copiedId, setCopiedId] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const copy = (val: string, which: 'id' | 'secret') => {
    navigator.clipboard.writeText(val);
    if (which === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const toggleScope = (s: string) => {
    setAllowedScopes(curr => 
      curr.includes(s) ? curr.filter(x => x !== s) : [...curr, s]
    );
  };

  const create = async () => {
    if (!appName) return setError('App name is required');
    if (allowedScopes.length === 0) return setError('At least one scope is required');
    setLoading(true);
    setError('');
    try {
      const result = await clientsAdminService.create({
        app_name: appName,
        description: description || null,
        redirect_uris: redirectUris.filter(u => u.trim()),
        allowed_scopes: allowedScopes,
      });
      setCreatedClient(result);
      onCreated();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Creation failed');
    } finally {
      setLoading(false);
    }
  };

  if (createdClient) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Client created — save these credentials</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                  <span className="text-sm font-bold text-emerald-900">
                    {user?.plan?.name || 'Free'} Tier — {user?.plan?.credits_limit === 0 ? 'Unlimited' : user?.plan?.credits_limit || 500} API requests included
                  </span>
                </div>
                <div className="bg-white border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  Active
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="w-full h-2 bg-emerald-900/10 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-emerald-600 rounded-full" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-emerald-800">
                    {user?.plan?.credits_limit === 0 ? 'Unlimited' : `${user?.plan?.credits_limit || 500} API requests available`}
                  </p>
                  <p className="text-[10px] font-medium text-emerald-600 italic">
                    Per-application limit
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-emerald-100 flex items-center justify-between">
                <p className="text-[11px] text-emerald-800 font-medium">Need more capacity for this app?</p>
                <button 
                  onClick={() => navigate('/app-admin/plans')}
                  className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  Go to Plan & Credits <ChevronDown className="w-3 h-3 -rotate-90" />
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900">Important: Save the Client Secret</p>
                <p className="text-[10px] text-amber-700 leading-relaxed mt-1">
                  The client secret will only be shown once. Copy it now and store it in your secrets manager.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Client ID</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono break-all flex items-center">
                    {createdClient.client_id}
                  </code>
                  <button 
                    onClick={() => copy(createdClient.client_id, 'id')}
                    className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs font-bold"
                  >
                    {copiedId ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    {copiedId ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Client Secret</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono break-all flex items-center">
                    {createdClient.client_secret}
                  </code>
                  <button 
                    onClick={() => copy(createdClient.client_secret!, 'secret')}
                    className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs font-bold"
                  >
                    {copiedSecret ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    {copiedSecret ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button 
              type="button"
              onClick={() => clientsAdminService.downloadIntegrationDocs(createdClient.id, createdClient.app_name)}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Download integration docs
            </button>
            <button 
              onClick={onClose} 
              className="px-8 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all"
            >
              I've saved it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Create OAuth Client</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && <Alert type="error" message={error} />}

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Application Name</label>
            <input 
              placeholder="My App"
              value={appName}
              onChange={e => setAppName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
            <textarea 
              placeholder="Optional description shown on the consent screen"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Redirect Uris</label>
            <div className="space-y-3">
              {redirectUris.map((uri, idx) => (
                <div key={idx} className="flex gap-2">
                  <input 
                    placeholder="https://app.example.com/callback"
                    value={uri}
                    onChange={e => setRedirectUris(curr => curr.map((u, i) => i === idx ? e.target.value : u))}
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                  />
                  {idx > 0 && (
                    <button onClick={() => setRedirectUris(curr => curr.filter((_, i) => i !== idx))} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setRedirectUris([...redirectUris, ''])} className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-1">
                + Add another redirect URI
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Allowed Scopes</label>
            <div className="flex flex-wrap gap-2">
              {['openid', 'profile', 'email', 'offline_access'].map(s => (
                <button 
                  key={s} 
                  onClick={() => toggleScope(s)}
                  className={clsx(
                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all border outline-none",
                    allowedScopes.includes(s) 
                      ? "bg-primary-600 border-primary-600 text-white shadow-sm" 
                      : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
          <button 
            onClick={create} 
            disabled={loading}
            className="px-8 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-200 hover:bg-primary-700 disabled:opacity-50 transition-all"
          >
            {loading ? 'Registering...' : 'Register app'}
          </button>
        </div>
      </div>
    </div>
  );
}
