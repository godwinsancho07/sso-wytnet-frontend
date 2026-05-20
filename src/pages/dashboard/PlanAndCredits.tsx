import { useState, useEffect } from 'react';
import { 
  Zap, Info, AlertTriangle, CheckCircle2,
  Lock, ArrowRight, Sparkles, LayoutGrid, Users
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { generateReceiptPDF } from '@/utils/receipt';

interface AppUsage {
  id: string;
  client_id: string;
  app_name: string;
  credits_used: number;
  credits_limit: number;
  logins: number;
  status: string;
  alert: string;
  is_blocked: boolean;
  is_low: boolean;
}

export default function PlanAndCredits() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [apps, setApps] = useState<AppUsage[]>([]);
  const [summary, setSummary] = useState({
    planName: 'Free plan',
    creditsPerApp: 2,
    usedAllApps: 0,
    appsRegistered: 0,
    totalCapacity: 0,
    warningThreshold: 80,
    appsRegisteredLimit: 0,
  });
  const [selectedApp, setSelectedApp] = useState<{id: string, name: string} | null>(null);
  const [targetPlan, setTargetPlan] = useState<any>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [clientsRes, planRes, availableRes] = await Promise.all([
        api.get('/v1/clients'),
        api.get('/v1/plans/my-plan'),
        api.get('/v1/plans/available?plan_type=DEVELOPER')
      ]);
      
      const clients = (clientsRes.data as any[]).filter(
        (c) => !c.app_name.toLowerCase().includes('internal sso')
      );
      const userPlan = planRes.data;
      const devPlans = availableRes.data;
      const sortedPlans = [...devPlans].sort((a: any, b: any) => {
        const aLim = a.credits_limit === 0 ? Infinity : a.credits_limit;
        const bLim = b.credits_limit === 0 ? Infinity : b.credits_limit;
        return aLim - bLim;
      });

      const mappedApps = clients.map((c: any) => {
        const used = c.user_count || 0;
        const limit = (c.credits_limit === 0) ? 0 : (c.credits_limit ?? userPlan?.credits_limit ?? 2);
        const isBlocked = limit > 0 && used >= limit;
        const isLow = limit > 0 && used === limit - 1;
        
        let status = 'Active';
        let alertText = 'OK';
        
        if (isBlocked) {
          status = 'Blocked';
          alertText = 'Full';
        } else if (isLow) {
          status = 'Low credits';
          alertText = `${limit - used} left`;
        }

        const nextPlan = sortedPlans.find(p => {
          const pLim = p.credits_limit === 0 ? Infinity : p.credits_limit;
          const currLim = limit === 0 ? Infinity : limit;
          return pLim > currLim;
        });

        return {
          id: c.id,
          client_id: c.client_id,
          app_name: c.app_name,
          credits_used: used,
          credits_limit: limit,
          logins: used,
          status,
          alert: alertText,
          is_blocked: isBlocked,
          is_low: isLow,
          next_plan: nextPlan
        };
      });
      
      const totalUsed = mappedApps.reduce((acc: number, app: any) => acc + app.logins, 0);
      
      const totalCapacity = mappedApps.reduce((acc: number, app: any) => {
        if (app.credits_limit === 0) return acc; // Unlimited doesn't add to finite capacity
        return acc + app.credits_limit;
      }, 0);
      
      const hasUnlimitedApp = mappedApps.some((app: any) => app.credits_limit === 0);
      
      let calculatedCapacity = 0;
      if (hasUnlimitedApp) {
        calculatedCapacity = -1; // Infinity
      } else {
        calculatedCapacity = totalCapacity;
      }
      
      setApps(mappedApps);
      setSummary({
        planName: userPlan?.name || 'Free plan',
        creditsPerApp: userPlan?.credits_limit ?? 2,
        usedAllApps: totalUsed,
        appsRegistered: mappedApps.length,
        totalCapacity: calculatedCapacity,
        warningThreshold: userPlan?.warning_threshold ?? 80,
        appsRegisteredLimit: userPlan?.app_registrations_limit ?? 0,
      });

    } catch (err) {
      console.error('Failed to fetch plan stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleUpgrade = async () => {
    try {
      setIsPaying(true);
      
      // 1. Create Razorpay Order
      console.log('Creating order for plan:', targetPlan.id);
      const { data: orderData } = await api.post('/v1/plans/create-razorpay-order', null, {
        params: { plan_id: targetPlan.id }
      });
      console.log('Order created:', orderData);

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "WytPass SSO",
        description: selectedApp ? `Upgrade ${selectedApp.name}` : `Upgrade to ${targetPlan?.name || 'Pro'} Plan`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            setIsPaying(true);
            // 2. Verify Payment
            await api.post('/v1/plans/verify-razorpay-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: targetPlan.id,
              target_client_id: selectedApp?.id
            });

            const priceStr = `₹${targetPlan?.price?.toFixed(2) || '1.00'}`;
            await generateReceiptPDF(user, priceStr, `${targetPlan?.name || 'Upgrade'} Plan Upgrade`);
            
            alert(`Payment Successful! ${selectedApp ? selectedApp.name : 'Your account'} has been upgraded.`);
            setShowUpgradeModal(false);
            setSelectedApp(null);
            setTargetPlan(null);
            fetchStats();
          } catch (err) {
            alert('Payment verification failed.');
          } finally {
            setIsPaying(false);
          }
        },
        modal: {
          onDismiss: () => {
            setIsPaying(false);
          }
        },
        theme: {
          color: "#059669"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to initialize payment. Please try again.';
      alert(errorMsg);
      setIsPaying(false);
    }
  };

  if (loading && apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-gray-500 font-medium text-sm">Synchronizing your app credits...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700 pb-20">
      {/* Top Banner */}
      <div className="bg-[#e9f5e9] rounded-2xl border border-[#d1e7d1] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-white rounded-xl shadow-sm border border-[#d1e7d1] flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">Plan Workspace</h2>
              <span className="px-2.5 py-1 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg">Active</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Manage your application usage and limits</p>
          </div>
        </div>

        <div className="flex items-center gap-12">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{summary.appsRegistered}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Apps Registered</p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-[#fdf3e7] border border-[#f5e1c8] rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#af7e4b] shrink-0 mt-0.5" />
        <p className="text-sm text-[#8a633a] leading-relaxed font-medium">
          Plans are <span className="font-bold underline decoration-[#af7e4b]/30 underline-offset-2">per-app</span>. Each app has its own API request limit based on its assigned plan. When an app reaches its limit, new requests are blocked for that app only — you can upgrade apps individually to increase their capacity.
        </p>
      </div>



      {/* Breakdown Table */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden mt-8">
        <div className="px-8 py-5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-lg">Per-app credit breakdown</h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Real-time sync</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-black border-b border-gray-50">
                <th className="px-8 py-5">Application</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">API Call Request Per App</th>
                <th className="px-8 py-5">Alert</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/50">
              {apps.map((app: any) => (
                <tr key={app.id} className={clsx(
                  "hover:bg-gray-50/50 transition-colors",
                  app.is_blocked && "bg-red-50/30"
                )}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={clsx(
                        "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shrink-0",
                        app.is_blocked ? "bg-red-100 text-red-600" : "bg-primary-50 text-primary-700"
                      )}>
                        {app.app_name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{app.app_name}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">client_{app.client_id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className={clsx(
                      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border",
                      app.is_blocked ? "bg-red-50 text-red-600 border-red-100" : 
                      app.is_low ? "bg-amber-50 text-amber-700 border-amber-100" :
                      "bg-green-50 text-green-700 border-green-100"
                    )}>
                      {app.is_blocked ? <Lock className="w-3 h-3" /> : <div className={clsx("w-2 h-2 rounded-full", app.is_low ? "bg-amber-500" : "bg-green-500")} />}
                      {app.status}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4 min-w-[140px]">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={clsx(
                            "h-full transition-all duration-700",
                            app.is_blocked ? "bg-red-500" : app.is_low ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${app.credits_limit === 0 ? 0 : (app.credits_used / app.credits_limit) * 100}%` }}
                        />
                      </div>
                      <span className={clsx("text-sm font-bold tabular-nums", app.is_blocked ? "text-red-600" : "text-gray-900")}>
                        {app.credits_used} / {app.credits_limit === 0 ? '∞' : app.credits_limit}
                      </span>
                    </div>
                  </td>

                  <td className="px-8 py-5">
                    <div className={clsx(
                      "flex items-center gap-1.5 text-xs font-bold",
                      app.is_blocked ? "text-red-600" : app.is_low ? "text-amber-600" : "text-green-600"
                    )}>
                      {app.is_blocked ? <AlertTriangle className="w-3.5 h-3.5" /> : app.is_low ? <Info className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {app.alert}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    {!app.next_plan ? (
                      <div className="px-5 py-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ml-auto w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Upgraded
                      </div>
                    ) : (
                      <button 
                        onClick={() => { setSelectedApp({ id: app.id, name: app.app_name }); setTargetPlan(app.next_plan); setShowUpgradeModal(true); }}
                        className="px-5 py-2.5 bg-white border border-gray-200 text-gray-900 rounded-xl text-xs font-bold hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 ml-auto"
                      >
                        <Zap className="w-3.5 h-3.5 text-emerald-500" />
                        Upgrade
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 pb-0 flex justify-between items-start">
               <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <Zap className="w-8 h-8 text-emerald-600" />
               </div>
               <button onClick={() => { setShowUpgradeModal(false); setSelectedApp(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ArrowRight className="w-6 h-6 text-gray-400" />
               </button>
            </div>
            
            <div className="p-8 pt-6 space-y-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  {selectedApp ? `Upgrade ${selectedApp.name}` : 'Scale your Platform'}
                </h3>
                <p className="text-gray-500 mt-2 font-medium">
                  {selectedApp 
                    ? `Increase capacity to ${targetPlan?.credits_limit === 0 ? 'unlimited' : targetPlan?.credits_limit} users specifically for this application.`
                    : `Upgrade to ${targetPlan?.name} plan for all your current and future applications.`}
                </p>
              </div>

              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                 <div className="flex items-center justify-between font-bold">
                    <span className="text-gray-500">Upgrade Price</span>
                    <span className="text-gray-900">₹{targetPlan?.price?.toFixed(2) || '1.00'}</span>
                 </div>
                 <div className="flex items-center justify-between font-bold">
                    <span className="text-gray-500">Service Fee</span>
                    <span className="text-emerald-600">FREE</span>
                 </div>
                 <div className="h-px bg-gray-200 my-2" />
                 <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-gray-900">Total Due</span>
                    <span className="text-3xl font-black text-emerald-600">₹{targetPlan?.price?.toFixed(2) || '1.00'}</span>
                 </div>
              </div>
            </div>

            <div className="p-8 pt-0">
              <button
                onClick={handleUpgrade}
                disabled={isPaying}
                className="w-full py-5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 text-lg"
              >
                {isPaying ? (
                   <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Proceed to Upgrade
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


