import { useState, useEffect } from 'react';
import { Check, AlertCircle, ArrowUpRight, Shield as ShieldIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  credits_limit: number;
  app_registrations_limit: number;
  is_default: boolean;
}

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data } = await api.get('/v1/plans/public?plan_type=DEVELOPER');
        setPlans(data);
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          Choose the right plan for your business
        </h1>
        <p className="mt-4 text-xl text-gray-600">
          Scale your identity infrastructure with WytNet SSO.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {plans.map((plan) => {
          const isCurrent = user?.plan_id === plan.id;
          const isPro = plan.name.toLowerCase().includes('pro') || plan.price > 0;
          
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col p-8 bg-white border rounded-2xl shadow-sm transition-all hover:shadow-md ${
                isPro ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-200'
              }`}
            >
              {isPro && (
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1 rounded-full border border-primary-200">
                  Recommended
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-4 text-gray-500 text-sm leading-relaxed">{plan.description || `Perfect for ${plan.name.toLowerCase()} developers.`}</p>
                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-extrabold text-gray-900">₹{plan.price}</span>
                  <span className="ml-1 text-xl font-medium text-gray-500">/ month</span>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  {plan.price === 0 ? 'No card required' : 'Billed monthly · cancel anytime'}
                </p>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  <span>{plan.credits_limit === 0 ? 'Unlimited' : plan.credits_limit} user logins (per app)</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  <span>{plan.app_registrations_limit === 0 ? 'Unlimited' : plan.app_registrations_limit} app registrations</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  <span>Full docs access</span>
                </div>
                {plan.price === 0 && plan.credits_limit > 0 && (
                  <div className="flex items-start gap-3 text-sm text-gray-600">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <span>Limited to {plan.credits_limit} unique users per app</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => !isCurrent && navigate('/register')}
                disabled={isCurrent}
                className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                  isCurrent
                    ? 'bg-gray-50 text-gray-500 border border-gray-200 cursor-default'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isCurrent ? 'Current plan' : `Get Started`}
                {!isCurrent && <ArrowUpRight className="w-4 h-4" />}
              </button>
            </div>
          );
        })}
      </div>
      
      <div className="mt-12 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <ShieldIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900">Enterprise Grade Security</h4>
            <p className="text-sm text-blue-700">Need more users or custom integration? Contact us.</p>
          </div>
        </div>
        <button className="text-sm font-bold text-blue-700 hover:underline">
          Talk to sales &rarr;
        </button>
      </div>
    </div>
  );
}
