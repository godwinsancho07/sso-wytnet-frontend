import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Rocket, Check, ArrowLeft, Layers, Shield, 
  ChevronRight, Info, AlertCircle, Sparkles
} from 'lucide-react';
import { clsx } from 'clsx';
import api from '@/services/api';
import { plansAdminService, Plan } from '@/services/admin';
import Alert from '@/components/Alert';

export default function UpgradePlan() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentClient, setCurrentClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansData, clientData] = await Promise.all([
        plansAdminService.list('DEVELOPER'),
        api.get(`/v1/clients/${clientId}`)
      ]);
      setPlans(plansData.filter((p: Plan) => p.is_active));
      setCurrentClient(clientData.data);
    } catch (err: any) {
      setError('Failed to load upgrade options');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      setUpgrading(planId);
      setError(null);
      await api.post(`/v1/clients/${clientId}/upgrade-plan`, null, { params: { plan_id: planId } });
      navigate('/app-admin/clients');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upgrade failed');
    } finally {
      setUpgrading(null);
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
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link to="/app-admin/clients" className="hover:text-primary-600 transition-colors">My Apps</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Upgrade Plan</span>
      </nav>

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
           <Sparkles className="w-3 h-3" />
           Scale your application
        </div>
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Choose a plan for {currentClient?.app_name}</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Unlock more login credits, higher app limits, and premium support for your application.
        </p>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <PlanCard 
            key={plan.id}
            plan={plan}
            isCurrent={currentClient?.plan_id === plan.id}
            isUpgrading={upgrading === plan.id}
            onSelect={() => handleUpgrade(plan.id)}
          />
        ))}
      </div>

      {/* FAQ / Info */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-12 border-t pt-20">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900">How do per-app credits work?</h3>
            <p className="text-gray-600 leading-relaxed">
              Each application has its own dedicated credit pool. When you upgrade this specific app, 
              you unlock more logins only for this application. One unique authorized user = one credit.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900">What happens when an app is blocked?</h3>
            <p className="text-gray-600 leading-relaxed">
              If an app reaches its 2-user free limit, new users are blocked from logging in 
              to that specific app. You can upgrade individual apps to restore access immediately without affecting your other projects.
            </p>
          </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, isCurrent, isUpgrading, onSelect }: { plan: Plan; isCurrent: boolean; isUpgrading: boolean; onSelect: () => void }) {
  const isPro = plan.name.toLowerCase().includes('pro');
  
  return (
    <div className={clsx(
      "relative flex flex-col p-8 rounded-3xl border transition-all duration-300",
      isPro 
        ? "border-primary-200 bg-white shadow-xl shadow-primary-100 scale-105 z-10" 
        : "border-gray-200 bg-white hover:border-primary-100 hover:shadow-lg"
    )}>
      {isPro && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
          Most Popular
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
        <p className="text-sm text-gray-500 min-h-[40px]">{plan.description || `Perfect for ${plan.name.toLowerCase()} developers.`}</p>
      </div>

      <div className="mb-8 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-gray-900 tracking-tight">₹{plan.price}</span>
        <span className="text-gray-400 font-medium text-sm">/ month</span>
      </div>

      <div className="flex-1 space-y-4 mb-8">
        <FeatureItem label={`${plan.credits_limit === 0 ? 'Unlimited' : plan.credits_limit} Logins (this app)`} />
        <FeatureItem label={`${plan.app_registrations_limit === 0 ? 'Unlimited' : plan.app_registrations_limit} App Registrations`} />
        <FeatureItem label={plan.credits_limit === 0 ? 'No credit limits' : `Resets ${plan.reset_interval.toLowerCase()}`} />
        {isPro && <FeatureItem label="Priority support" />}
        {isPro && <FeatureItem label="Custom branding" />}
      </div>

      <button
        onClick={onSelect}
        disabled={isCurrent || isUpgrading}
        className={clsx(
          "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
          isCurrent 
            ? "bg-gray-100 text-gray-500 cursor-default" 
            : isPro 
              ? "bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-200" 
              : "bg-white border-2 border-gray-100 text-gray-900 hover:border-primary-600 hover:text-primary-600"
        )}
      >
        {isUpgrading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isCurrent ? (
          <>
            <Check className="w-5 h-5" />
            Current Plan
          </>
        ) : (
          `Upgrade to ${plan.name}`
        )}
      </button>
    </div>
  );
}

function FeatureItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
        <Check className="w-3 h-3 text-emerald-600" />
      </div>
      <span className="text-sm text-gray-600 font-medium">{label}</span>
    </div>
  );
}
