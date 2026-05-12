import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Shield, ShieldOff, KeyRound, LogOut, Trash2, Mail,
  CheckCircle2, XCircle, ShieldAlert, MailWarning, Plus, X,
  Loader2, User as UserIcon, Monitor, LinkIcon, Activity, Tag, LayoutGrid,
} from 'lucide-react';
import { clsx } from 'clsx';

import Alert from '@/components/Alert';
import { extractErrorMessage } from '@/utils/errors';
import {
  usersAdminService,
  AdminUserDetail,
  AdminUserDetailRole,
  AuthorizedApp,
} from '@/services/admin';

type TabKey = 'profile' | 'sessions' | 'apps' | 'social' | 'activity' | 'roles';

const TABS: { id: TabKey; label: string; icon: any }[] = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'sessions', label: 'Sessions', icon: Monitor },
  { id: 'apps', label: 'Connected Apps', icon: LayoutGrid },
  { id: 'social', label: 'Linked Accounts', icon: LinkIcon },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'roles', label: 'Roles', icon: Tag },
];

export default function UserDetail() {
  const { userId = '' } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('profile');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return usersAdminService
      .getUserDetail(userId)
      .then(setDetail)
      .catch((e) => setError(extractErrorMessage(e, 'Failed to load user')))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  const wrap = async (
    key: string,
    confirmMsg: string | null,
    fn: () => Promise<unknown>,
    successMsg: string,
  ) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(key);
    setError('');
    setSuccess('');
    try {
      await fn();
      setSuccess(successMsg);
      await load();
    } catch (e) {
      setError(extractErrorMessage(e, 'Action failed'));
    } finally {
      setBusy(null);
    }
  };

  const handleSuspendToggle = () => {
    if (!detail) return;
    if (detail.user.is_active) {
      wrap(
        'suspend',
        `Suspend ${detail.user.email}? They will be logged out and unable to sign in.`,
        () => usersAdminService.suspend(userId),
        'User suspended',
      );
    } else {
      wrap(
        'activate',
        `Reactivate ${detail.user.email}?`,
        () => usersAdminService.activate(userId),
        'User reactivated',
      );
    }
  };

  const handleResetPassword = () => {
    if (!detail) return;
    wrap(
      'reset',
      `Send a password reset email to ${detail.user.email}?`,
      () => usersAdminService.adminResetPassword(userId),
      'Password reset email sent',
    );
  };

  const handleForceLogout = () => {
    if (!detail) return;
    wrap(
      'force-logout',
      `Revoke ALL active sessions and tokens for ${detail.user.email}?`,
      () => usersAdminService.forceLogout(userId),
      'All sessions revoked',
    );
  };

  const confirmDelete = async () => {
    if (!detail) return;
    setBusy('delete');
    setError('');
    try {
      await usersAdminService.deleteUser(userId);
      navigate('/admin/users');
    } catch (e) {
      setError(extractErrorMessage(e, 'Delete failed'));
    } finally {
      setBusy(null);
      setIsDeleteOpen(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <Link to="/admin/users" className="text-sm text-primary-600 hover:underline">
          <ArrowLeft className="inline w-4 h-4" /> Back to users
        </Link>
        {error && <Alert type="error" message={error} />}
      </div>
    );
  }

  const u = detail.user;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/users"
        className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Back to users
      </Link>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <EditUserModal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        user={detail.user}
        onUpdated={() => {
          setIsEditOpen(false);
          load();
          setSuccess('User updated successfully');
        }}
      />

      <DeleteUserModal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        email={detail.user.email}
      />

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <HeaderAvatar user={u} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">
                  {u.full_name || u.email}
                </h1>
                <StatusBadge active={u.is_active} verified={u.email_verified} />
                {u.is_superuser && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                    Superuser
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5 inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {u.email}
                {!u.email_verified && (
                  <MailWarning className="w-3.5 h-3.5 text-amber-500" />
                )}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {detail.roles.map((r) => (
                  <span
                    key={r.id}
                    className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100"
                  >
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action toolbar */}
          <div className="flex flex-wrap gap-2">
            <ActionButton
              onClick={() => setIsEditOpen(true)}
              icon={UserIcon}
            >
              Edit profile
            </ActionButton>
            <ActionButton
              onClick={handleSuspendToggle}
              loading={busy === 'suspend' || busy === 'activate'}
              icon={u.is_active ? ShieldOff : Shield}
              tone={u.is_active ? 'amber' : 'green'}
            >
              {u.is_active ? 'Suspend' : 'Activate'}
            </ActionButton>
            <ActionButton
              onClick={handleResetPassword}
              loading={busy === 'reset'}
              icon={KeyRound}
            >
              Reset password
            </ActionButton>
            <ActionButton
              onClick={handleForceLogout}
              loading={busy === 'force-logout'}
              icon={LogOut}
            >
              Force logout
            </ActionButton>
            <ActionButton
              onClick={() => setIsDeleteOpen(true)}
              loading={busy === 'delete'}
              icon={Trash2}
              tone="red"
            >
              Delete
            </ActionButton>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'inline-flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px transition',
                  active
                    ? 'border-primary-600 text-primary-700 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-900',
                )}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4">
        {tab === 'profile' && <ProfileTab detail={detail!} />}
        {tab === 'sessions' && <SessionsTab detail={detail!} />}
        {tab === 'apps' && <AppsTab userId={userId} />}
        {tab === 'social' && <SocialTab detail={detail!} />}
        {tab === 'activity' && <ActivityTab detail={detail!} />}
        {tab === 'roles' && (
          <RolesTab
            detail={detail!}
            userId={userId}
            onChanged={load}
            setError={setError}
            setSuccess={setSuccess}
          />
        )}
      </div>
    </div>
  );
}

// ── Header pieces ──────────────────────────────────────────────────────────

function HeaderAvatar({ user }: { user: AdminUserDetail['user'] }) {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.email}
        className="w-16 h-16 rounded-full object-cover border border-gray-100"
      />
    );
  }
  const initial = (user.full_name?.[0] || user.email[0] || '?').toUpperCase();
  return (
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-semibold text-xl">
      {initial}
    </div>
  );
}

function StatusBadge({ active, verified }: { active: boolean; verified: boolean }) {
  if (!active)
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
        <ShieldAlert className="w-3 h-3" /> Suspended
      </span>
    );
  if (!verified)
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
        <XCircle className="w-3 h-3" /> Unverified
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
      <CheckCircle2 className="w-3 h-3" /> Active
    </span>
  );
}

function ActionButton({
  onClick,
  loading,
  icon: Icon,
  tone = 'default',
  children,
}: {
  onClick: () => void;
  loading?: boolean;
  icon: any;
  tone?: 'default' | 'amber' | 'red' | 'green';
  children: React.ReactNode;
}) {
  const styles = {
    default: 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50',
    amber: 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50',
    green: 'bg-white border-green-200 text-green-700 hover:bg-green-50',
    red: 'bg-red-600 border-red-600 text-white hover:bg-red-700',
  }[tone];
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={clsx(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed',
        styles,
      )}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────

function ProfileTab({ detail }: { detail: AdminUserDetail }) {
  const u = detail.user;
  return (
    <div className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
      <Field label="User ID" value={<span className="font-mono text-xs">{u.id}</span>} />
      <Field label="Email" value={u.email} />
      <Field label="Full name" value={u.full_name || '—'} />
      <Field label="Email verified" value={u.email_verified ? 'Yes' : 'No'} />
      <Field label="Status" value={u.is_active ? 'Active' : 'Suspended'} />
      <Field label="Superuser" value={u.is_superuser ? 'Yes' : 'No'} />
      <Field label="Created" value={new Date(u.created_at).toLocaleString()} />
      <Field label="Updated" value={new Date(u.updated_at).toLocaleString()} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-gray-900">{value}</dd>
    </div>
  );
}

function SessionsTab({ detail }: { detail: AdminUserDetail }) {
  if (detail.sessions.length === 0) {
    return <EmptyCard text="No active sessions." />;
  }
  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-2.5">Device</th>
            <th className="text-left px-4 py-2.5">IP</th>
            <th className="text-left px-4 py-2.5">User Agent</th>
            <th className="text-right px-4 py-2.5">Last active</th>
            <th className="text-right px-4 py-2.5">Expires</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {detail.sessions.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-2.5">{s.device_info || '—'}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{s.ip_address || '—'}</td>
              <td className="px-4 py-2.5 text-xs text-gray-500 max-w-md truncate">
                {s.user_agent || '—'}
              </td>
              <td className="px-4 py-2.5 text-right text-xs text-gray-500">
                {new Date(s.last_active_at).toLocaleString()}
              </td>
              <td className="px-4 py-2.5 text-right text-xs text-gray-500">
                {new Date(s.expires_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AppsTab({ userId }: { userId: string }) {
  const [apps, setApps] = useState<AuthorizedApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersAdminService.getUserConnectedApps(userId)
      .then(setApps)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (apps.length === 0) {
    return <EmptyCard text="No connected applications." />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {apps.map((app) => (
        <div key={app.id} className="card p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              {(app.app_name?.[0] || '?').toUpperCase()}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{app.app_name}</h4>
              <p className="text-xs text-gray-500 font-mono">{app.client_id}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 uppercase tracking-wider font-medium">Authorized On</span>
              <span className="text-gray-700">{app.last_used ? new Date(app.last_used).toLocaleDateString() : '—'}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {app.scopes?.map((scope: string) => (
                <span key={scope} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                  {scope}
                </span>
              ))}
            </div>
          </div>

          <a 
            href={app.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-2 text-xs text-primary-600 hover:underline inline-flex items-center gap-1"
          >
            Open Application <LinkIcon className="w-3 h-3" />
          </a>
        </div>
      ))}
    </div>
  );
}

function SocialTab({ detail }: { detail: AdminUserDetail }) {
  if (detail.social_accounts.length === 0) {
    return <EmptyCard text="No linked social accounts." />;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {detail.social_accounts.map((sa) => (
        <div
          key={sa.id}
          className="card p-4 flex items-center justify-between"
        >
          <div>
            <p className="font-medium text-gray-900 capitalize">{sa.provider}</p>
            <p className="text-xs text-gray-500">{sa.provider_email || '—'}</p>
          </div>
          <p className="text-xs text-gray-400">
            Linked {new Date(sa.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}

function ActivityTab({ detail }: { detail: AdminUserDetail }) {
  if (detail.recent_audit.length === 0) {
    return <EmptyCard text="No recent activity." />;
  }
  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-2.5">Event</th>
            <th className="text-left px-4 py-2.5">IP</th>
            <th className="text-right px-4 py-2.5">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {detail.recent_audit.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-2.5">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {a.event_type}
                </span>
              </td>
              <td className="px-4 py-2.5 font-mono text-xs">{a.ip_address || '—'}</td>
              <td className="px-4 py-2.5 text-right text-xs text-gray-500">
                {new Date(a.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RolesTab({
  detail,
  userId,
  onChanged,
  setError,
  setSuccess,
}: {
  detail: AdminUserDetail;
  userId: string;
  onChanged: () => Promise<void> | void;
  setError: (s: string) => void;
  setSuccess: (s: string) => void;
}) {
  const [allRoles, setAllRoles] = useState<AdminUserDetailRole[]>([]);
  const [adding, setAdding] = useState<string>('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    usersAdminService
      .listRoles()
      .then(setAllRoles)
      .catch(() => setAllRoles([]));
  }, []);

  const assigned = new Set(detail.roles.map((r) => r.id));
  const available = allRoles.filter((r) => !assigned.has(r.id));

  const onAssign = async () => {
    if (!adding) return;
    setBusy('assign');
    try {
      await usersAdminService.assignRole(userId, adding);
      setAdding('');
      setSuccess('Role assigned');
      await onChanged();
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to assign role'));
    } finally {
      setBusy(null);
    }
  };

  const onRemove = async (roleId: string) => {
    if (!window.confirm('Remove this role from the user?')) return;
    setBusy(roleId);
    try {
      await usersAdminService.removeRole(userId, roleId);
      setSuccess('Role removed');
      await onChanged();
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to remove role'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Assigned roles</h3>
        {detail.roles.length === 0 ? (
          <p className="text-sm text-gray-400">No roles assigned.</p>
        ) : (
          <ul className="space-y-2">
            {detail.roles.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.name}</p>
                  {r.description && (
                    <p className="text-xs text-gray-500">{r.description}</p>
                  )}
                </div>
                <button
                  onClick={() => onRemove(r.id)}
                  disabled={busy === r.id}
                  className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  {busy === r.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Assign new role</h3>
        <div className="flex gap-2">
          <select
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            disabled={available.length === 0}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">
              {available.length === 0
                ? 'No more roles available'
                : 'Select a role…'}
            </option>
            {available.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            onClick={onAssign}
            disabled={!adding || busy === 'assign'}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {busy === 'assign' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="card p-12 text-center text-sm text-gray-400">{text}</div>
  );
}

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  user: AdminUserDetail['user'];
  onUpdated: () => void;
}

function EditUserModal({ open, onClose, user, onUpdated }: EditUserModalProps) {
  const [email, setEmail] = useState(user.email);
  const [fullName, setFullName] = useState(user.full_name || '');
  const [isSuperuser, setIsSuperuser] = useState(user.is_superuser);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setEmail(user.email);
      setFullName(user.full_name || '');
      setIsSuperuser(user.is_superuser);
      setPassword('');
      setError('');
    }
  }, [open, user]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const updates: any = {
        email: email.trim(),
        full_name: fullName.trim() || null,
        is_superuser: isSuperuser,
      };
      if (password.trim()) {
        updates.password = password;
      }
      await usersAdminService.updateUser(user.id, updates);
      onUpdated();
    } catch (e: any) {
      setError(extractErrorMessage(e, 'Failed to update user'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">Edit User Profile</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="p-5 space-y-4">
            {error && <Alert type="error" message={error} />}
            
            <div>
              <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Change Password (optional)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Leave blank to keep current"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={isSuperuser}
                onChange={(e) => setIsSuperuser(e.target.checked)}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Grant Superuser status</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 p-4 bg-gray-50 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteUserModal({
  open,
  onClose,
  onConfirm,
  email,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  email: string;
}) {
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm();
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Delete User</h2>
          <p className="text-sm text-gray-500 mt-2">
            Are you sure you want to delete user <strong>{email}</strong>? This action cannot be undone.
          </p>
        </div>
        <div className="flex border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition border-r"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition disabled:opacity-50"
          >
            {submitting ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
