import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Save, Rocket, Shield, Info, 
  CreditCard, Layout, Settings2, CheckCircle2, 
  ChevronRight, Laptop, Smartphone, Tablet
} from 'lucide-react';
import { clsx } from 'clsx';
import { plansAdminService, Plan, PlanType, ResetInterval } from '@/services/admin';
import Alert from '@/components/Alert';

export default function EditPlan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Plan>>({
    name: '',
    type: 'DEVELOPER',
    price: 0,
    description: '',
    credits_limit: 0,
    warning_threshold: 80,
    reset_interval: 'NEVER',
    app_registrations_limit: 0,
    is_default: false,
    is_active: true
  });

  useEffect(() => {
    if (!isNew && id) {
      fetchPlan(id);
    }
  }, [id]);

  const fetchPlan = async (planId: string) => {
    try {
      const plan = await plansAdminService.get(planId);
      setFormData(plan);
    } catch (err: any) {
      setError('Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      if (isNew) {
        await plansAdminService.create(formData);
      } else if (id) {
        await plansAdminService.update(id, formData);
      }
      navigate('/admin/plans');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link to="/admin/plans" className="hover:text-primary-600 transition-colors">Plans</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{isNew ? 'New plan' : 'Edit plan'}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/plans')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isNew ? 'Create new plan' : `Edit plan`}
              <span className="ml-3 px-2 py-0.5 bg-primary-50 text-primary-600 text-xs rounded-lg align-middle">
                {formData.type === 'DEVELOPER' ? 'Developer' : 'User'}
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">Adjust settings for the {formData.name || 'new'} plan.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/admin/plans')}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-all shadow-lg shadow-primary-200"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save changes
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      <form onSubmit={handleSave} className="grid grid-cols-1 gap-6">
        {/* Basic Info Section */}
        <Section title="Basic info" icon={Info}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Plan name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Pro, Basic, Enterprise"
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Price (₹ / month)</label>
              <input 
                type="number" 
                value={formData.price}
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                placeholder="0"
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Default on registration</label>
              <select 
                value={formData.is_default ? 'yes' : 'no'}
                onChange={e => setFormData({...formData, is_default: e.target.value === 'yes'})}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Status</label>
              <select 
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={e => setFormData({...formData, is_active: e.target.value === 'active'})}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-gray-700">Description</label>
              <textarea 
                value={formData.description || ''}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the plan..."
                rows={3}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none"
              />
            </div>
          </div>
        </Section>

        {formData.type === 'DEVELOPER' && (
          <>
            {/* API Requests Section */}
            <Section title="API call requests per app" icon={CreditCard}>
              <div className="p-6 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">Total API call requests per app</label>
                    <span className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-bold text-gray-600">
                      {formData.credits_limit === 0 ? 'Unlimited' : formData.credits_limit}
                    </span>
                  </div>
                  <input 
                    type="number" 
                    min="0"
                    value={formData.credits_limit}
                    onChange={e => setFormData({...formData, credits_limit: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  />
                  <p className="text-xs text-gray-400 italic">Each unique user authorization is 1 credit. <span className="font-bold text-gray-500">This limit applies individually to each application</span> assigned to this plan. Set to 0 for unlimited.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Warning threshold (%)</label>
                    <input 
                      type="number" 
                      value={formData.warning_threshold}
                      onChange={e => setFormData({...formData, warning_threshold: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    />
                    <p className="text-[11px] text-gray-400">Alert app admin when this % is consumed.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Credit reset</label>
                    <select 
                      value={formData.reset_interval}
                      onChange={e => setFormData({...formData, reset_interval: e.target.value as ResetInterval})}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    >
                      <option value="NEVER">Never (one-time pool)</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                </div>
              </div>
            </Section>

            {/* App Registrations Section */}
            <Section title="App registrations" icon={Layout}>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">Max apps allowed</label>
                  <span className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-bold text-gray-600">
                    {formData.app_registrations_limit === 0 ? 'Unlimited' : formData.app_registrations_limit}
                  </span>
                </div>
                <input 
                  type="number" 
                  min="0"
                  value={formData.app_registrations_limit}
                  onChange={e => setFormData({...formData, app_registrations_limit: Number(e.target.value)})}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                />
                <p className="text-xs text-gray-400 italic">Set to 0 for Unlimited.</p>
              </div>
            </Section>
          </>
        )}

        {/* Danger Zone */}
        {!isNew && (
          <div className="p-6 border border-red-100 bg-red-50/30 rounded-2xl flex items-center justify-between">
             <div>
               <p className="text-sm font-bold text-red-800">Delete this plan</p>
               <p className="text-xs text-red-600 mt-0.5">This action cannot be undone. All apps on this plan will be moved to default.</p>
             </div>
             <button 
               type="button"
               onClick={() => {
                 if (window.confirm('Delete this plan?')) {
                   plansAdminService.remove(id!).then(() => navigate('/admin/plans'));
                 }
               }}
               className="px-4 py-2 bg-white border border-red-200 text-red-600 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-red-50 transition-colors"
             >
               Delete plan
             </button>
          </div>
        )}
      </form>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}
