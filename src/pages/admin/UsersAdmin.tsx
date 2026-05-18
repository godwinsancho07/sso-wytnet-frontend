import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, CheckCircle2, XCircle, ShieldAlert, MailWarning,
  ChevronLeft, ChevronRight, Loader2, Plus, X, Eye, Check, Edit2, Trash2, MoreVertical
} from 'lucide-react';
import { clsx } from 'clsx';

import Alert from '@/components/Alert';
import { extractErrorMessage } from '@/utils/errors';
import {
  usersAdminService,
  AdminUserListItem,
  UserStatusFilter,
  AdminUserDetailRole,
} from '@/services/admin';

const PAGE_SIZE = 10;

const FILTERS: { id: 'all' | 'active' | 'unverified'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'unverified', label: 'Unverified' },
];

export default function UsersAdmin() {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'unverified'>('all');
  const [offset, setOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Debounce search input (300ms)
  const debounceRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setOffset(0);
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  const statusParam: UserStatusFilter = filter === 'all' ? undefined : filter as any;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    usersAdminService
      .searchUsers(debouncedQuery || undefined, statusParam, offset, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        setUsers(res.items);
        setTotalCount(res.count);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(extractErrorMessage(e, 'Failed to load users'));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, statusParam, offset, refreshKey]);

  const showingFrom = users.length === 0 ? 0 : offset + 1;
  const showingTo = offset + users.length;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserListItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUserListItem | null>(null);

  const confirmDelete = async () => {
    if (!deletingUser) return;
    try {
      await usersAdminService.remove(deletingUser.id);
      setSuccess('User deleted successfully');
      setUsers((prev) => prev.filter((user) => user.id !== deletingUser.id));
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setError(extractErrorMessage(e, 'Failed to delete user'));
    } finally {
      setDeletingUser(null);
    }
  };

  const verifyUser = async (user: AdminUserListItem) => {
    try {
      await usersAdminService.updateUser(user.id, { email_verified: true });
      setSuccess(`User verified successfully`);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setError(extractErrorMessage(e, 'Failed to verify user'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">
            Search, audit, and manage all user accounts on the platform.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/users/create')}
          className="btn-primary self-start inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create User
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}


      {editingUser && (
        <EditUserModal
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          user={editingUser}
          onUpdated={() => {
            setEditingUser(null);
            setRefreshKey((k) => k + 1);
            setSuccess('User updated successfully');
          }}
        />
      )}

      {deletingUser && (
        <DeleteUserModal
          open={!!deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirm={confirmDelete}
          email={deletingUser.email}
        />
      )}

      <div className="card p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email or name…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFilter(f.id);
                  setOffset(0);
                }}
                className={clsx(
                  'text-xs font-medium px-3 py-1.5 rounded-full border transition',
                  filter === f.id
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Roles</th>
              <th className="text-left px-4 py-3">Providers</th>
              <th className="text-right px-4 py-3">Sessions</th>
              <th className="text-right px-4 py-3">Registered Apps</th>
              <th className="text-right px-4 py-3">Connected Apps</th>
              <th className="text-right px-4 py-3">Created</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                  <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                  No users match these filters.
                </td>
              </tr>
            )}
            {!loading &&
              users.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar user={u} />
                      <div>
                        <div className="font-medium text-gray-900">
                          {u.full_name || '—'}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          {u.id.slice(0, 8)}…
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700">{u.email}</span>
                      {!u.email_verified && (
                        <MailWarning
                          className="w-3.5 h-3.5 text-amber-500"
                          aria-label="Email not verified"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge user={u} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                      {u.roles.map((r) => (
                        <span
                          key={r.id}
                          className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100"
                        >
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.providers.length === 0 && (
                        <span className="text-xs text-gray-400">password</span>
                      )}
                      {u.providers.map((p) => (
                        <span
                          key={p}
                          className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {u.active_sessions}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className="font-semibold text-indigo-600">{u.registered_apps}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className="font-semibold text-primary-600">{u.connected_apps}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === u.id ? null : u.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeDropdown === u.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveDropdown(null)}
                          />
                          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 focus:outline-none overflow-hidden">
                            <div className="py-1" role="menu">
                              <button
                                onClick={() => {
                                  navigate(`/admin/users/${u.id}`);
                                  setActiveDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                role="menuitem"
                              >
                                <Eye className="w-4 h-4 mr-3 text-gray-400" />
                                View Details
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setActiveDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                role="menuitem"
                              >
                                <Edit2 className="w-4 h-4 mr-3 text-gray-400" />
                                Edit User
                              </button>
                              {!u.email_verified && u.is_active && (
                                <button
                                  onClick={() => {
                                    verifyUser(u);
                                    setActiveDropdown(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-amber-600 hover:bg-gray-100 transition-colors"
                                  role="menuitem"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-3 text-amber-500" />
                                  Verify Email
                                </button>
                              )}
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                onClick={() => {
                                  setDeletingUser(u);
                                  setActiveDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                role="menuitem"
                              >
                                <Trash2 className="w-4 h-4 mr-3 text-red-400" />
                                Delete User
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500">
            Showing {showingFrom}–{showingTo} of {totalCount}
          </p>
          <div className="flex gap-2">
            <button
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-50 hover:bg-white"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              disabled={users.length < PAGE_SIZE || loading}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-50 hover:bg-white"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ user }: { user: AdminUserListItem }) {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.email}
        className="w-9 h-9 rounded-full object-cover border border-gray-100"
      />
    );
  }
  const initial =
    (user.full_name?.[0] || user.email[0] || '?').toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-semibold text-sm">
      {initial}
    </div>
  );
}

function StatusBadge({ user }: { user: AdminUserListItem }) {
  if (!user.is_active) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
        <ShieldAlert className="w-3 h-3" /> Suspended
      </span>
    );
  }
  if (!user.email_verified) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
        <XCircle className="w-3 h-3" /> Unverified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
      <CheckCircle2 className="w-3 h-3" /> Active
    </span>
  );
}


interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  user: AdminUserListItem;
  onUpdated: () => void;
}

function EditUserModal({ open, onClose, user, onUpdated }: EditUserModalProps) {
  const [email, setEmail] = useState(user.email);
  const [fullName, setFullName] = useState(user.full_name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles.map(r => r.id));
  const [availableRoles, setAvailableRoles] = useState<AdminUserDetailRole[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    usersAdminService.listRoles().then(setAvailableRoles).catch(console.error);
  }, []);

  useEffect(() => {
    if (open) {
      setEmail(user.email);
      setFullName(user.full_name || '');
      setPassword('');
      setConfirmPassword('');
      setSelectedRoles(user.roles.map(r => r.id));
      setError('');
    }
  }, [open, user]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const updates: any = {
        email: email.trim(),
        full_name: fullName.trim() || null,
      };
      if (password.trim()) {
        updates.password = password;
      }
      await usersAdminService.updateUser(user.id, updates);

      // Handle role changes
      const currentRoleIds = user.roles.map(r => r.id);
      const toAdd = selectedRoles.filter(id => !currentRoleIds.includes(id));
      const toRemove = currentRoleIds.filter(id => !selectedRoles.includes(id));

      for (const roleId of toAdd) {
        await usersAdminService.assignRole(user.id, roleId);
      }
      for (const roleId of toRemove) {
        await usersAdminService.removeRole(user.id, roleId);
      }

      onUpdated();
    } catch (e: any) {
      setError(extractErrorMessage(e, 'Failed to update user'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">Edit User</h2>
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
                Change Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Leave blank to keep current"
              />
            </div>

            {password && (
              <div>
                <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Confirm new password"
                />
              </div>
            )}

            <div className="pt-2">
              <label className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2 block">
                Roles
              </label>
              <div className="space-y-2">
                {availableRoles.map(role => (
                  <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{role.name}</span>
                  </label>
                ))}
              </div>
            </div>


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
