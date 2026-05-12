import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import {
  Briefcase, Search, MoreVertical, Edit2, Trash2, ExternalLink, 
  LayoutGrid, RefreshCw, KeyRound, Globe, AlertTriangle, Check, Copy, X,
  ChevronDown
} from 'lucide-react';
import { clsx } from 'clsx';
import { clientsAdminService, appAdminService, AppUser } from '@/services/admin';
import Alert from '@/components/Alert';

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
}

export default function AppAdminClients() {
  const [clients, setClients] = useState<OwnedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<OwnedClient | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadClients = () => {
    setLoading(true);
    api.get<OwnedClient[]>('/v1/clients')
      .then((r) => setClients(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClients();
  }, []);

  const filtered = clients.filter(c => 
    c.app_name.toLowerCase().includes(query.toLowerCase()) || 
    c.client_id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registered Applications</h1>
          <p className="text-gray-500 text-sm mt-1">
            Applications you have registered and manage on this platform.
          </p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applications..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
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
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading applications...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
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
                          <span className="truncate max-w-[150px]">{new URL(c.redirect_uris[0]).hostname}</span>
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
                                    setSelectedClient(c);
                                    setActiveMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Edit2 className="w-4 h-4 text-gray-400" /> Edit Settings
                                </button>
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
  const [appName, setAppName] = useState(client.app_name);
  const [description, setDescription] = useState(client.description || '');
  const [uris, setUris] = useState<string[]>(client.redirect_uris);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await clientsAdminService.update(client.id, {
        app_name: appName,
        description: description || null,
        redirect_uris: uris.filter(Boolean),
      });
      onUpdated();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex justify-end">
      <div className="bg-white w-full max-w-xl shadow-xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Application Settings</h2>
            <p className="text-xs text-gray-400 font-mono">{client.client_id}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && <Alert type="error" message={error} />}

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">App Name</label>
              <input 
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input w-full min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Redirect URIs</label>
              <div className="space-y-2">
                {uris.map((u, i) => (
                  <input 
                    key={i}
                    value={u}
                    onChange={(e) => setUris(curr => curr.map((v, idx) => idx === i ? e.target.value : v))}
                    className="input w-full text-sm font-mono"
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-gray-50">
             <button 
               onClick={async () => {
                 if (confirm('Rotate client secret? Old secret will stop working.')) {
                   try {
                     const res = await clientsAdminService.rotateSecret(client.id);
                     alert(`New Secret: ${res.client_secret}\n\nSAVE THIS NOW. IT WILL NEVER BE SHOWN AGAIN.`);
                   } catch (e: any) {
                     alert(e.response?.data?.detail || 'Rotation failed');
                   }
                 }
               }}
               className="btn-secondary w-full gap-2 py-3"
             >
               <KeyRound className="w-4 h-4" /> Rotate Client Secret
             </button>
          </div>
        </div>

        <div className="p-5 border-t bg-gray-50 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button 
            onClick={save} 
            disabled={saving}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
