import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, Loader2, UserPlus, Mail, Lock, User, Shield, CheckCircle2,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  usersAdminService,
  AdminUserDetailRole,
} from '@/services/admin';
import { extractErrorMessage } from '@/utils/errors';
import Alert from '@/components/Alert';

export default function CreateUser() {
  const navigate = useNavigate();

  const [roles, setRoles] = useState<AdminUserDetailRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    roleId: '',
  });

  useEffect(() => {
    usersAdminService.listRoles()
      .then(setRoles)
      .catch((e) => setError(extractErrorMessage(e, 'Failed to load roles')))
      .finally(() => setLoadingRoles(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!formData.roleId) {
      setError('Please select a role for the user.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create the user
      const user = await usersAdminService.createUser({
        email: formData.email.trim(),
        full_name: formData.fullName.trim() || null,
        password: formData.password,
      });

      // 2. Assign role if selected
      if (formData.roleId) {
        await usersAdminService.assignRole(user.id, formData.roleId);
      }

      setSuccess('User created successfully with the assigned role.');
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/admin/users');
      }, 2000);
    } catch (e: any) {
      setError(extractErrorMessage(e, 'Failed to create user'));
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-full space-y-6">
      <div className="flex flex-col gap-2">
        <nav className="flex items-center gap-2 text-[10px] text-gray-400">
          <Link to="/admin/dashboard" className="hover:text-primary-600 transition-colors">Dashboard</Link>
          <span>/</span>
          <Link to="/admin/users" className="hover:text-primary-600 transition-colors">All Users</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Create New User</span>
        </nav>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/users')}
              className="p-1.5 -ml-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">Create User</h1>
              <p className="text-gray-500 text-sm">Assign platform permissions and details.</p>
            </div>
          </div>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card bg-white shadow-md border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2.5">
              <UserPlus className="w-4 h-4 text-primary-600" />
              General Information
            </h3>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Role Field */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                Role <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="roleId"
                  required
                  value={formData.roleId}
                  onChange={handleChange}
                  disabled={loadingRoles}
                  className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none appearance-none transition-all disabled:bg-gray-50 font-medium"
                >
                  <option value="">Select a role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {loadingRoles ? (
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 border-r-2 border-b-2 border-gray-400 rotate-45 mb-1 mr-1" />
                  )}
                </div>
              </div>
            </div>

            {/* Name Field */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3 h-3" />
                Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter full name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-medium"
              />
            </div>

            {/* Email Field */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3 h-3" />
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="user@example.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-medium"
              />
            </div>
          </div>
        </div>

        <div className="card bg-white shadow-md border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-primary-600" />
              Security
            </h3>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-medium"
              />
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={8}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-medium"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={clsx(
              "px-8 py-3 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2.5",
              submitting 
                ? "bg-primary-400 cursor-not-allowed text-white" 
                : "bg-primary-600 hover:bg-primary-700 text-white active:scale-95 shadow-primary-200/50 hover:-translate-y-0.5"
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              'Create User'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
