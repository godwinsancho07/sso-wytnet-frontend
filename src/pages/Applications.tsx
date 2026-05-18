import { useEffect, useState } from 'react';
import api from '@/services/api';
import Alert from '@/components/Alert';
import { useAuthStore } from '@/store/authStore';
import { userActivityService, AuthorizedApp, clientsAdminService, OAuthClientRead } from '@/services/admin';
import { Briefcase, RefreshCw, Trash2, ExternalLink, XCircle, FileText, Download } from 'lucide-react';
import { generateNextJsMarkdown, generateReactMarkdown, downloadFile } from '@/utils/integrationDocs';

export default function Applications() {
  const { user } = useAuthStore();
  const [adminClients, setAdminClients] = useState<OAuthClientRead[]>([]);
  const [authorizedApps, setAuthorizedApps] = useState<AuthorizedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (user?.is_superuser) {
        const data = await clientsAdminService.list();
        setAdminClients(data.filter(c => !c.app_name.toLowerCase().includes('internal sso')));
      } else {
        const data = await userActivityService.getAuthorizedApps();
        setAuthorizedApps(data.filter(app => !app.app_name.toLowerCase().includes('internal sso')));
      }
    } catch (e) {
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Emergency fix for standard apps ownership (Open Madurai, Vote Smart AI)
    api.post('/v1/users/me/fix-standard-apps').catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [user]);

  const handleRevoke = async (id: string) => {
    try {
      await userActivityService.revokeApp(id);
      setAuthorizedApps(prev => prev.filter(app => app.id !== id));
      setMessage('Application access revoked');
    } catch (e) {
      setError('Failed to revoke application');
    }
  };


  const rotateSecret = async (id: string) => {
    try {
      const data = await clientsAdminService.rotateSecret(id);
      setMessage(`New secret for ${data.app_name}: ${data.client_secret}`);
    } catch (e) {
      setError('Failed to rotate secret');
    }
  };

  const deleteClient = async (id: string) => {
    try {
      await clientsAdminService.remove(id);
      setAdminClients((p) => p.filter((c) => c.id !== id));
      setMessage('Client deleted');
    } catch (e) {
      setError('Failed to delete client');
    }
  };

  const downloadGuide = (client: OAuthClientRead, type: 'nextjs' | 'react') => {
    const markdown = type === 'nextjs' 
      ? generateNextJsMarkdown(client.client_id, '', client.app_name, client.redirect_uris)
      : generateReactMarkdown(client.client_id, '', client.app_name, client.redirect_uris);
    
    downloadFile(markdown, `${client.app_name.replace(/\s+/g, '_')}_${type}_Integration.md`);
  };

  if (!user?.is_superuser) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-500 text-sm mt-1">Manage third-party applications connected to your account.</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {message && <Alert type="info" message={message} onClose={() => setMessage('')} />}

        {loading ? (
          <div className="card text-center py-10 text-gray-400">Loading...</div>
        ) : authorizedApps.length === 0 ? (
          <div className="card text-center py-12 text-gray-400 border-2 border-dashed border-gray-100 shadow-none">
            <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No applications connected</p>
            <p className="text-xs mt-1">Apps you authorize via SSO will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {authorizedApps.map((app) => (
              <div key={app.client_id} className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xl border border-primary-100">
                    {app.app_name[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">{app.app_name}</h3>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {app.scopes && app.scopes.length > 0 && (
                        <p className="text-[10px] text-gray-400 font-semibold">
                          Scopes: <span className="text-gray-500 font-mono">{app.scopes.join(', ')}</span>
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                        Last used: {app.last_used ? new Date(app.last_used).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a 
                    href={(() => {
                      if (app.app_name.toLowerCase().includes('habit')) return '/habit-tracking/dashboard.html';
                      if (app.app_name.toLowerCase().includes('project a')) return '/project-a/dashboard.html';
                      
                      const uris = app.redirect_uris || [];
                      const best = uris.find(u => u.includes('/callback')) || uris[0] || '#';
                      return best.split('/callback')[0] || best;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-xs py-1.5 px-3 gap-1.5"
                  >
                    <ExternalLink className="w-3 h-3" /> Launch App
                  </a>
                  <button 
                    onClick={() => handleRevoke(app.id)}
                    className="btn-secondary text-xs py-1.5 px-3 gap-1.5 text-red-600 hover:bg-red-50 border-red-100 hover:border-red-200"
                  >
                    <XCircle className="w-3 h-3" /> Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Admin View
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">OAuth Management</h1>
        <p className="text-gray-500 text-sm mt-1">Register and manage platform OAuth2 clients.</p>
      </div>
      
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {message && <Alert type="info" message={message} onClose={() => setMessage('')} />}

      {loading ? (
        <div className="card text-center py-10 text-gray-400">Loading clients...</div>
      ) : adminClients.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">No registered applications</div>
      ) : (
        <div className="space-y-4">
          {adminClients.map((c) => (
            <div key={c.id} className="card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{c.app_name}</h3>
                  <p className="text-xs text-gray-400 font-mono">{c.client_id}</p>
                  {c.description && <p className="text-sm text-gray-500 mt-1">{c.description}</p>}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${c.is_active ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Redirect URIs</p>
                <div className="space-y-1">
                  {c.redirect_uris.map((u) => (
                    <p key={u} className="text-xs font-mono text-gray-600 bg-gray-50 p-1 rounded border border-gray-100 truncate">{u}</p>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => downloadGuide(c, 'nextjs')} className="btn-secondary text-xs py-1.5 gap-1.5 border-blue-100 text-blue-700 hover:bg-blue-50">
                  <Download className="w-3 h-3" /> Next.js Guide
                </button>
                <button onClick={() => downloadGuide(c, 'react')} className="btn-secondary text-xs py-1.5 gap-1.5 border-indigo-100 text-indigo-700 hover:bg-indigo-50">
                  <Download className="w-3 h-3" /> React Guide
                </button>
                <div className="flex-grow" />
                <button onClick={() => rotateSecret(c.id)} className="btn-secondary text-xs py-1.5 gap-1.5">
                  <RefreshCw className="w-3 h-3" /> Rotate secret
                </button>
                <button onClick={() => deleteClient(c.id)} className="btn-secondary text-xs py-1.5 text-red-600 gap-1.5">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

