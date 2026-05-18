import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  userService, sessionService, SocialAccount, Session,
} from '@/services/auth';
import {
  userActivityService, AuthorizedApp, AuditEvent,
} from '@/services/admin';
import {
  Shield, Monitor, Link2, CheckCircle, AlertCircle, Activity,
  Smartphone, Tablet, Globe, X, Trash2, Rocket
} from 'lucide-react';
import api from '@/services/api';
import { clsx } from 'clsx';
import { generateReceiptPDF } from '@/utils/receipt';

export default function Dashboard() {
  const { user, permissions } = useAuthStore();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [apps, setApps] = useState<AuthorizedApp[]>([]);
  const [activity, setActivity] = useState<AuditEvent[]>([]);
  const [paymentState, setPaymentState] = useState<'idle' | 'paying' | 'processing' | 'success'>('idle');

  const [promoPlans, setPromoPlans] = useState<{devPlan: any}>({devPlan: null});

  const loadAll = () => {
    userService.getSocialAccounts().then(setAccounts).catch(() => {});
    sessionService.getSessions().then(setSessions).catch(() => {});
    userActivityService.getAuthorizedApps().then(setApps).catch(() => {});
    userActivityService.getActivity(10).then(setActivity).catch(() => {});
    
    // Fetch plans for promo banner
    api.get('/v1/plans/public').then(({data}) => {
      const dev = data.find((p: any) => p.type === 'DEVELOPER' && p.is_default);
      setPromoPlans({devPlan: dev});
    }).catch(() => {});
  };

  useEffect(() => { loadAll(); }, []);

  const revokeApp = async (id: string) => {
    await userActivityService.revokeApp(id);
    loadAll();
  };

  const revokeSession = async (id: string) => {
    await sessionService.revokeSession(id);
    loadAll();
  };

  const securityScore = computeSecurityScore(user, accounts, sessions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.full_name || user?.email}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Your identity and connected services.</p>
      </div>

      {/* Status row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Shield className="w-5 h-5" />}
          label="Account"
          value={user?.is_active ? 'Active' : 'Inactive'}
          sub={user?.email_verified ? 'Email verified' : 'Email not verified'}
          ok={user?.is_active && user?.email_verified}
        />
        <StatCard
          icon={<Link2 className="w-5 h-5" />}
          label="Linked accounts"
          value={`${accounts.length}`}
          sub={accounts.length ? accounts.map((a) => a.provider).join(', ') : 'None'}
          ok={accounts.length > 0}
        />
        <StatCard
          icon={<Monitor className="w-5 h-5" />}
          label="Sessions"
          value={`${sessions.length}`}
          sub="Active devices"
          ok={sessions.length > 0}
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Authorized apps"
          value={`${apps.length}`}
          sub={apps.length ? 'Active connections' : 'No apps connected'}
          ok={true}
        />
      </div>
      
      {/* Developer Program Banner */}
      {!permissions?.roles.includes('app_admin') && (
        <div className="relative overflow-hidden bg-gradient-to-r from-primary-900 via-primary-800 to-primary-700 rounded-3xl p-8 text-white shadow-2xl shadow-primary-200 my-6">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Rocket className="w-6 h-6 text-primary-200" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight italic">Join the WytPass Developer Program</h2>
              </div>
              <p className="text-primary-100 text-lg leading-relaxed font-medium">
                Register your own apps and let users sign in with WytPass SSO. Get your client ID, secret and full integration docs.
              </p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start pt-2">
                <div className="flex items-center gap-2 text-sm font-bold bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                  <CheckCircle className="w-4 h-4 text-primary-300" />
                  Register OAuth apps
                </div>
                <div className="flex items-center gap-2 text-sm font-bold bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                  <CheckCircle className="w-4 h-4 text-primary-300" />
                  Get client ID & secret
                </div>
                <div className="flex items-center gap-2 text-sm font-bold bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                  <CheckCircle className="w-4 h-4 text-primary-300" />
                  Integration docs
                </div>
                <div className="flex items-center gap-2 text-sm font-bold bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                  <CheckCircle className="w-4 h-4 text-primary-300" />
                  {promoPlans.devPlan?.credits_limit || 2} free API requests per app
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-4 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-sm min-w-[200px]">
              {paymentState === 'idle' ? (
                <>
                  <button 
                    onClick={async () => {
                      try {
                        setPaymentState('processing');
                        await api.post('/v1/plans/join-developer-program');
                        setPaymentState('success');
                        setTimeout(async () => {
                          await useAuthStore.getState().fetchUser();
                          window.location.reload();
                        }, 2000);
                      } catch (e) {
                        setPaymentState('idle');
                        alert('Failed to join the developer program. Please try again.');
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-black/20 group"
                  >
                    <Rocket className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
                    Join now
                  </button>
                </>
              ) : paymentState === 'processing' ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  <p className="font-bold">Joining...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center py-4">
                  <CheckCircle className="w-16 h-16 text-green-400 animate-bounce" />
                  <p className="text-xl font-black">Welcome!</p>
                  <p className="text-sm text-primary-200">You are now a developer.</p>
                </div>
              )}
            </div>
          </div>

          {/* Abstract Background Shapes */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      )}

      {/* Security score */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Security checklist</h2>
          <span className={clsx(
            'text-xs px-2 py-1 rounded-full font-semibold',
            securityScore.score >= 80 ? 'bg-green-100 text-green-700' :
            securityScore.score >= 50 ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700',
          )}>
            {securityScore.score}/100
          </span>
        </div>
        <ul className="space-y-2">
          {securityScore.items.map((it: ChecklistItem, i: number) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              {it.ok
                ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              }
              <span className={it.ok ? 'text-gray-700' : 'text-gray-900 font-medium'}>{it.label}</span>
              {!it.ok && it.action && (
                <Link to={it.action.href} className="ml-auto text-xs text-primary-600 hover:underline">
                  {it.action.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Authorized apps */}
        <div className="card">
          <h2 className="font-semibold mb-3">Authorized applications</h2>
          {apps.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No applications have been authorized.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {apps.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center font-semibold text-sm">
                      {a.app_name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{a.app_name}</p>
                      <p className="text-xs text-gray-400">
                        {a.authorized_at ? `Last used ${new Date(a.authorized_at).toLocaleDateString()}` : 'No recent activity'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => revokeApp(a.id)}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Active sessions */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Active sessions</h2>
            <Link to="/sessions" className="text-xs text-primary-600 hover:underline">View all</Link>
          </div>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No active sessions.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sessions.slice(0, 4).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <DeviceIcon device={s.device_info} />
                    <div>
                      <p className="text-sm font-medium">{s.device_info || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">
                        {s.ip_address || '?'} · {new Date(s.last_active_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => revokeSession(s.id)}
                    className="text-red-500 hover:text-red-700"
                    aria-label="Revoke"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <h2 className="font-semibold mb-3">Recent account activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No recent activity.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {activity.map((e: AuditEvent) => (
              <li key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <EventDot event={e.event_type} />
                  <span>{prettyEvent(e.event_type)}</span>
                  {e.ip_address && (
                    <span className="text-xs text-gray-400 font-mono">· {e.ip_address}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, ok,
}: {
  icon: React.ReactNode; label: string; value: string; sub: string; ok?: boolean;
}) {
  return (
    <div className="card flex items-start gap-4 p-5">
      <div className="rounded-xl bg-primary-50 text-primary-600 p-3.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1 truncate">
          {ok !== undefined && (ok
            ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
            : <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />)}
          <span className="truncate">{sub}</span>
        </p>
      </div>
    </div>
  );
}

function DeviceIcon({ device }: { device: string | null }) {
  const Icon =
    device === 'Mobile' ? Smartphone :
    device === 'Tablet' ? Tablet :
    device === 'Desktop' ? Monitor : Globe;
  return <Icon className="w-5 h-5 text-gray-400" />;
}

function EventDot({ event }: { event: string }) {
  const color =
    event === 'auth.login' ? 'bg-green-500' :
    event === 'auth.login_failed' ? 'bg-red-500' :
    event.startsWith('auth.social') ? 'bg-blue-500' :
    event === 'auth.logout' || event === 'auth.global_logout' ? 'bg-gray-400' :
    'bg-primary-500';
  return <span className={`w-2 h-2 rounded-full ${color}`} />;
}

function prettyEvent(event: string): string {
  const map: Record<string, string> = {
    'auth.login': 'Signed in',
    'auth.login_failed': 'Failed sign-in',
    'auth.logout': 'Signed out',
    'auth.global_logout': 'Signed out everywhere',
    'auth.social_login': 'Signed in with social provider',
    'auth.social_register': 'Registered with social provider',
    'auth.social_link': 'Linked social account',
    'user.register': 'Account created',
  };
  return map[event] || event;
}

interface ChecklistItem {
  ok: boolean;
  label: string;
  action?: { label: string; href: string };
}

function computeSecurityScore(user: any, accounts: SocialAccount[], sessions: Session[]) {
  const items: ChecklistItem[] = [
    {
      ok: !!user?.email_verified,
      label: 'Email address verified',
      action: !user?.email_verified ? { label: 'Verify', href: '/profile' } : undefined,
    },
    {
      ok: !!user?.password_hash || accounts.length > 0,
      label: 'Sign-in method configured',
    },
    {
      ok: accounts.length > 0,
      label: 'At least one social account linked',
      action: accounts.length === 0 ? { label: 'Link account', href: '/profile' } : undefined,
    },
    {
      ok: sessions.length <= 5,
      label: 'No excessive active sessions',
      action: sessions.length > 5 ? { label: 'Review', href: '/sessions' } : undefined,
    },
  ];
  const score = Math.round((items.filter((i) => i.ok).length / items.length) * 100);
  return { score, items };
}
