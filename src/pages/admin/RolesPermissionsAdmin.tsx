import { useEffect, useMemo, useState } from 'react';
import {
  rolesAdminService,
  permissionsAdminService,
  usersAdminService,
  AdminRole,
  AdminUserListItem,
  AdminRoleDetail,
  AdminPermissionsByResource,
  AdminPermission,
} from '@/services/admin';
import Alert from '@/components/Alert';
import { clsx } from 'clsx';
import {
  Plus,
  Shield,
  X,
  Trash2,
  UserPlus,
  UserMinus,
  Search,
  Save,
  Layers,
} from 'lucide-react';

const PROTECTED = new Set(['super_admin', 'app_admin', 'user']);
const RESOURCE_ORDER = ['client', 'user', 'role', 'session', 'audit', 'self'];

export default function RolesPermissionsAdmin() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [counts, setCounts] = useState<Record<string, { perms: number; users: number }>>({});
  const [permsByResource, setPermsByResource] = useState<AdminPermissionsByResource>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<AdminRole | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [roleList, perms] = await Promise.all([
        rolesAdminService.list(),
        permissionsAdminService.list(),
      ]);
      setRoles(roleList);
      setPermsByResource(perms);

      // Fetch role details for counts in parallel
      const detailed = await Promise.all(roleList.map((r) => rolesAdminService.get(r.id)));
      const c: Record<string, { perms: number; users: number }> = {};
      detailed.forEach((d) => {
        c[d.id] = { perms: d.permissions.length, users: d.user_count };
      });
      setCounts(c);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const deleteRole = async (id: string) => {
    try {
      await rolesAdminService.remove(id);
      setSuccess('Role deleted successfully.');
      loadAll();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to delete role');
    } finally {
      setRoleToDelete(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Manage system and custom roles to control user access levels across the platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateRoleOpen(true)}
            className="btn-primary text-sm gap-1.5 inline-flex items-center"
          >
            <Plus className="w-4 h-4" /> Create Role
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Roles Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Shield className="w-4 h-4" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Available Roles</h2>
        </div>
        {loading && roles.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">Loading roles…</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((r) => {
              const isProtected = PROTECTED.has(r.name);
              const isSuperAdminCard = r.name === 'super_admin';
              const c = counts[r.id] || { perms: 0, users: 0 };
              
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoleId(r.id)}
                  className="card text-left p-6 hover:shadow-md hover:border-primary-300 transition cursor-pointer flex flex-col h-full border-gray-100 bg-white"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={clsx(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      isProtected ? "bg-amber-50" : "bg-primary-50"
                    )}>
                      <Shield className={isProtected ? 'w-5 h-5 text-amber-500' : 'w-5 h-5 text-primary-500'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 truncate">{r.name}</h3>
                        {isProtected && (
                          <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold shrink-0">
                            System
                          </span>
                        )}
                      </div>
                    </div>
                    {!isProtected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoleToDelete(r);
                        }}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">
                      {isSuperAdminCard 
                        ? 'Full system access with all permissions' 
                        : r.description || 'Standard role with defined access levels.'}
                    </p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-gray-600">
                      {c.users} {c.users === 1 ? 'user' : 'users'}
                    </p>
                    <p className="text-[11px] font-semibold text-primary-600">
                      {isSuperAdminCard ? 'All perms' : `${c.perms} perms`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Modals & Drawers */}
      {createRoleOpen && (
        <CreateRoleModal
          onClose={() => setCreateRoleOpen(false)}
          onCreated={() => {
            setCreateRoleOpen(false);
            loadAll();
          }}
        />
      )}

      {selectedRoleId && (
        <RoleDetailDrawer
          roleId={selectedRoleId}
          permsByResource={permsByResource}
          resourceOrder={RESOURCE_ORDER}
          onClose={() => setSelectedRoleId(null)}
          onChanged={() => {
            loadAll();
          }}
        />
      )}

      {roleToDelete && (
        <DeleteRoleModal
          role={roleToDelete}
          onClose={() => setRoleToDelete(null)}
          onConfirm={() => deleteRole(roleToDelete.id)}
        />
      )}
    </div>
  );
}

function CreateRoleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await rolesAdminService.create({ name, description });
      onCreated();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to create role');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">Create Role</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && <Alert type="error" message={error} />}
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Role Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. content_editor"
              className="input w-full mt-1.5 h-10"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What can this role do?"
              className="input w-full mt-1.5 py-2"
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-sm h-10 px-4">Cancel</button>
          <button
            onClick={submit}
            disabled={busy || !name.trim()}
            className="btn-primary text-sm h-10 px-6 disabled:opacity-50"
          >
            {busy ? 'Creating...' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleDetailDrawer({
  roleId,
  permsByResource,
  resourceOrder,
  onClose,
  onChanged,
}: {
  roleId: string;
  permsByResource: AdminPermissionsByResource;
  resourceOrder: string[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<AdminRoleDetail | null>(null);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUserListItem[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [originalPerms, setOriginalPerms] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isProtected = detail ? detail.is_protected : false;

  const load = async () => {
    setError('');
    setBusy(true);
    try {
      const [d, all] = await Promise.all([
        rolesAdminService.get(roleId),
        usersAdminService.searchUsers(undefined, undefined, 0, 200),
      ]);
      setDetail(d);
      const ids = new Set(d.permissions.map((p) => p.id));
      setSelectedPerms(new Set(ids));
      setOriginalPerms(new Set(ids));
      setAllUsers(all.items);
      setUsers(all.items.filter((u) => u.roles.some((r) => r.id === roleId)));
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load role');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, [roleId]);

  const toggle = (pid: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const dirty = useMemo(() => {
    if (selectedPerms.size !== originalPerms.size) return true;
    for (const p of selectedPerms) if (!originalPerms.has(p)) return true;
    return false;
  }, [selectedPerms, originalPerms]);

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const toGrant = [...selectedPerms].filter((p) => !originalPerms.has(p));
      const toRevoke = [...originalPerms].filter((p) => !selectedPerms.has(p));
      for (const pid of toGrant) await rolesAdminService.grantPermission(roleId, pid);
      for (const pid of toRevoke) await rolesAdminService.revokePermission(roleId, pid);
      setSuccess('Permissions updated successfully.');
      await load();
      onChanged();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const removeUserFromRole = async (userId: string) => {
    try {
      await rolesAdminService.removeUser(userId, roleId);
      await load();
      onChanged();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to remove user');
    }
  };

  const addUserToRole = async (userId: string) => {
    try {
      await rolesAdminService.assignUser(userId, roleId);
      await load();
      onChanged();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to add user');
    }
  };

  const deleteRoleAction = async () => {
    try {
      await rolesAdminService.remove(roleId);
      onChanged();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to delete role');
    }
  };

  const assignedIds = new Set(users.map((u) => u.id));
  const candidateUsers = allUsers
    .filter((u) => !assignedIds.has(u.id))
    .filter((u) =>
      userSearch
        ? `${u.email} ${u.full_name || ''}`.toLowerCase().includes(userSearch.toLowerCase())
        : false,
    )
    .slice(0, 8);

  const orderedResources = [
    ...resourceOrder.filter((r) => permsByResource[r]),
    ...Object.keys(permsByResource).filter((r) => !resourceOrder.includes(r)),
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-5xl h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b px-8 py-6 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-3">
              <Shield className={isProtected ? 'w-6 h-6 text-amber-500' : 'w-6 h-6 text-primary-500'} />
              <h2 className="text-xl font-bold text-gray-900">{detail?.name || 'Loading role...'}</h2>
              {isProtected && (
                <span className="text-[10px] uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                  System Role
                </span>
              )}
            </div>
            {detail?.description && (
              <p className="text-sm text-gray-500 mt-1">{detail.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isProtected && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn-secondary text-xs h-9 px-3 text-red-600 hover:bg-red-50 border-red-100 gap-1.5 flex items-center"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Role
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8 flex-1">
          {error && <div className="mb-6"><Alert type="error" message={error} /></div>}
          {success && <div className="mb-6"><Alert type="success" message={success} /></div>}

          {busy && !detail ? (
            <div className="text-gray-400 text-center py-20">Loading role details...</div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8 h-full">
              {/* Left 2/3: Permissions */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Permissions Grid</h3>
                  <button
                    onClick={save}
                    disabled={!dirty || saving}
                    className="btn-primary text-xs h-9 px-4 gap-1.5 inline-flex items-center disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : dirty ? 'Save Changes' : 'All Changes Saved'}
                  </button>
                </div>

                <div className="space-y-6">
                  {orderedResources.map((resource) => (
                    <div key={resource} className="bg-gray-50/50 rounded-xl p-5 border border-gray-100">
                      <h4 className="font-bold text-[10px] uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                        <Layers className="w-3 h-3" /> {resource}
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {(permsByResource[resource] || []).map((p: AdminPermission) => {
                          const checked = selectedPerms.has(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                checked
                                  ? 'border-primary-500 bg-primary-50/50 shadow-sm'
                                  : 'border-white bg-white hover:border-gray-200'
                              }`}
                            >
                              <div className="mt-0.5">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggle(p.id)}
                                  className="w-4 h-4 rounded text-primary-600 border-gray-300 focus:ring-primary-500"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-mono text-[11px] font-bold text-gray-900 truncate">
                                  {p.name}
                                </div>
                                {p.description && (
                                  <div className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                                    {p.description}
                                  </div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 1/3: Assigned Users */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Assigned Users</h3>
                  <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {users.length}
                  </span>
                </div>

                <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 space-y-2 max-h-[400px] overflow-y-auto">
                  {users.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-10">No users assigned to this role.</div>
                  ) : (
                    users.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-transparent hover:border-gray-100 shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                           <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {(u.full_name || u.email)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-gray-900 truncate">
                              {u.full_name || u.email}
                            </div>
                            <div className="text-[9px] text-gray-400 truncate font-mono">
                              {u.email}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeUserFromRole(u.id)}
                          className="text-gray-300 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                          title="Remove user"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-100 space-y-4 shadow-sm">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assign New User</h4>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search users..."
                      className="input w-full text-xs pl-9 h-10 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {userSearch && candidateUsers.length === 0 && (
                      <div className="text-[10px] text-gray-400 text-center py-4">No matching users found.</div>
                    )}
                    {candidateUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => addUserToRole(u.id)}
                        className="flex items-center justify-between w-full gap-3 p-2 rounded-lg hover:bg-primary-50 group text-left transition-colors border border-transparent hover:border-primary-100"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[9px] font-bold shrink-0">
                            {(u.full_name || u.email)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-gray-900 truncate">{u.full_name || u.email}</div>
                            <div className="text-[9px] text-gray-400 truncate font-mono">{u.email}</div>
                          </div>
                        </div>
                        <UserPlus className="w-3.5 h-3.5 text-primary-400 group-hover:text-primary-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">Delete Role?</h3>
              <p className="text-sm text-gray-500 mt-2">
                This will permanently remove the role and its permissions from all assigned users. This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setConfirmDelete(false);
                  deleteRoleAction();
                }}
                className="btn-primary bg-red-600 hover:bg-red-700 h-11 text-sm font-bold border-transparent"
              >
                Yes, Delete Role
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary h-11 text-sm font-bold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeleteRoleModal({ role, onClose, onConfirm }: { role: AdminRole; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900">Delete Role?</h3>
          <p className="text-sm text-gray-500 mt-2">
            Are you sure you want to delete the role <strong>{role.name}</strong>? This will remove it from all users and revoke its permissions.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={onConfirm}
            className="btn-primary bg-red-600 hover:bg-red-700 h-11 text-sm font-bold border-transparent"
          >
            Yes, Delete Role
          </button>
          <button onClick={onClose} className="btn-secondary h-11 text-sm font-bold">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
