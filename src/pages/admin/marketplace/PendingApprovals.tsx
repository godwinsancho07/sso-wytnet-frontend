import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, AlertTriangle, CheckCircle, XCircle, Clock, Eye, 
  ExternalLink, Mail, ShieldCheck, CheckSquare, Send, CheckCircle2,
  RefreshCw, Play, Laptop, Lock, HelpCircle, ArrowRight, Ban, Activity
} from 'lucide-react';
import saasApi from '@/services/saasApi';

export default function PendingApprovals() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Active Admin Workflow Step (1 to 6)
  const [adminStep, setAdminStep] = useState(1);

  // Step 2 Form States - Review App checklist
  const [urlChecked, setUrlChecked] = useState(false);
  const [descChecked, setDescChecked] = useState(false);
  const [screensChecked, setScreensChecked] = useState(false);
  const [supportChecked, setSupportChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Step 5 Form States - Final Verification checklist
  const [webhookVerified, setWebhookVerified] = useState(false);
  const [testEventReceived, setTestEventReceived] = useState(false);
  const [verifyApiWorks, setVerifyApiWorks] = useState(false);
  const [gatingWorks, setGatingWorks] = useState(false);
  const [urlLiveSSO, setUrlLiveSSO] = useState(false);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const res = await saasApi.get('/api/v1/admin/marketplace/pending');
      const data = Array.isArray(res.data) ? res.data : [];
      setSubmissions(data);
      
      // If we have an actively selected app, keep its state synced with the latest database record
      if (selectedApp) {
        const current = data.find(x => x.id === selectedApp.id);
        if (current) {
          setSelectedApp(current);
        }
      }
    } catch (err) {
      console.error('Failed to load pending queue:', err);
      setError('Failed to fetch pending applications list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  // Dynamically determines the appropriate admin review step based on database app status
  const determineAdminStep = (app: any) => {
    const status = app.status;
    if (status === 'pending_review' || status === 'rejected') {
      return 2; // Step 2: Quality & structural audit
    } else if (status === 'approved') {
      const plan = app.plan;
      if (plan && plan.agreement_signed) {
        return 4; // Step 4: Awaiting webhook integration
      } else {
        return 3; // Step 3: Approve & Assign plans (waiting for developer choice)
      }
    } else if (status === 'integration_pending') {
      return 4; // Step 4: Awaiting webhook integration status board
    } else if (status === 'publish_pending') {
      return 5; // Step 5: Final publishing verification checks
    } else if (status === 'live' || status === 'suspended') {
      return 6; // Step 6: Published dashboard & suspension tools
    }
    return 1;
  };

  const handleStartReview = (app: any) => {
    setSelectedApp(app);
    const targetStep = determineAdminStep(app);
    setAdminStep(targetStep);
    
    // Reset screening checkboxes for structural audits
    setUrlChecked(false);
    setDescChecked(false);
    setScreensChecked(false);
    setSupportChecked(false);
    setPrivacyChecked(false);
    setAdminNotes(app.admin_notes || '');

    // Auto check publishing requirements if they already bypassed or set them
    if (app.credentials?.webhook_url) {
      setWebhookVerified(true);
      setTestEventReceived(true);
      setVerifyApiWorks(true);
      setGatingWorks(true);
      setUrlLiveSSO(true);
    } else {
      setWebhookVerified(false);
      setTestEventReceived(false);
      setVerifyApiWorks(false);
      setGatingWorks(false);
      setUrlLiveSSO(false);
    }
  };

  const handleRefreshAppStatus = async () => {
    if (!selectedApp) return;
    try {
      const res = await saasApi.get('/api/v1/admin/marketplace/pending');
      const data = Array.isArray(res.data) ? res.data : [];
      const current = data.find(x => x.id === selectedApp.id);
      if (current) {
        setSelectedApp(current);
        const targetStep = determineAdminStep(current);
        setAdminStep(targetStep);
        setSuccessMsg("Synced latest developer status from database!");
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setError('Failed to sync latest database state.');
    }
  };

  // Step 2: Approve App
  const handleApproveApp = async () => {
    if (!selectedApp) return;
    if (!urlChecked || !descChecked || !screensChecked || !supportChecked) {
      setError('Please review and check off all required parameters before approving.');
      return;
    }
    setError('');
    try {
      await saasApi.post(`/api/v1/admin/marketplace/${selectedApp.id}/approve`, {
        notes: adminNotes
      });
      setSuccessMsg(`Application "${selectedApp.name}" approved! Redirecting to plan assignment.`);
      await loadSubmissions();
      
      // Re-fetch state to advance cleanly
      const res = await saasApi.get('/api/v1/admin/marketplace/pending');
      const data = Array.isArray(res.data) ? res.data : [];
      const refreshed = data.find(x => x.id === selectedApp.id);
      if (refreshed) {
        setSelectedApp(refreshed);
        setAdminStep(determineAdminStep(refreshed));
      } else {
        setAdminStep(3);
      }
    } catch (err) {
      setError('Approval failed.');
    }
  };

  // Step 2: Reject App
  const handleRejectApp = async () => {
    if (!selectedApp) return;
    if (!rejectionReason) {
      setError('Please provide a rejection reason/feedback for the developer.');
      return;
    }
    setError('');
    try {
      await saasApi.post(`/api/v1/admin/marketplace/${selectedApp.id}/reject`, {
        reason: rejectionReason
      });
      setSuccessMsg(`Application "${selectedApp.name}" has been rejected. Developer notified.`);
      setAdminStep(1);
      setSelectedApp(null);
      await loadSubmissions();
    } catch (err) {
      setError('Rejection failed.');
    }
  };

  // Step 3: Trigger Approval Email (Simulation)
  const handleSendApprovalEmail = () => {
    setSuccessMsg('Simulated approval notification email dispatched to developer!');
    setTimeout(() => {
      setAdminStep(4);
    }, 1500);
  };

  // Step 4: Simulate developer notifying ready for final check
  const handleSimulateDeveloperReady = async () => {
    if (!selectedApp) return;
    try {
      // Simulate developer complete action
      await saasApi.post(`/api/v1/marketplace/listings/${selectedApp.id}/notify-ready`);
      setSuccessMsg('Simulator: Developer has completed integrating webhooks and notified Admin!');
      
      // Reload submissions and update step dynamically
      await loadSubmissions();
      
      const res = await saasApi.get('/api/v1/admin/marketplace/pending');
      const data = Array.isArray(res.data) ? res.data : [];
      const refreshed = data.find(x => x.id === selectedApp.id);
      if (refreshed) {
        setSelectedApp(refreshed);
        setAdminStep(determineAdminStep(refreshed));
      } else {
        setAdminStep(5);
      }
    } catch (err) {
      setError('Simulation ready notification failed.');
    }
  };

  // Step 5: Publish App Live
  const handlePublishApp = async () => {
    if (!selectedApp) return;
    if (!webhookVerified || !testEventReceived || !verifyApiWorks || !gatingWorks || !urlLiveSSO) {
      setError('All final verification checks must be checked before publishing live.');
      return;
    }
    setError('');
    try {
      await saasApi.post(`/api/v1/admin/marketplace/${selectedApp.id}/publish`, {
        notes: adminNotes
      });
      setSuccessMsg(`Congratulations! Application "${selectedApp.name}" is now LIVE on the public store!`);
      await loadSubmissions();
      
      const res = await saasApi.get('/api/v1/admin/marketplace/pending');
      const data = Array.isArray(res.data) ? res.data : [];
      const refreshed = data.find(x => x.id === selectedApp.id);
      if (refreshed) {
        setSelectedApp(refreshed);
        setAdminStep(6);
      } else {
        setAdminStep(6);
      }
    } catch (err) {
      setError('Failed to publish application.');
    }
  };

  // Step 6: Suspend a Live application
  const handleSuspendApp = async () => {
    if (!selectedApp) return;
    setError('');
    try {
      await saasApi.post(`/api/v1/admin/marketplace/${selectedApp.id}/suspend`);
      setSuccessMsg(`Application "${selectedApp.name}" suspended successfully.`);
      await loadSubmissions();
      
      const res = await saasApi.get('/api/v1/admin/marketplace/pending');
      const data = Array.isArray(res.data) ? res.data : [];
      const refreshed = data.find(x => x.id === selectedApp.id);
      if (refreshed) {
        setSelectedApp(refreshed);
      }
    } catch (err) {
      setError('Suspension request failed.');
    }
  };

  // Step 5: Request integration updates
  const handleSendBackToDeveloper = () => {
    if (!selectedApp) return;
    setSuccessMsg('Listing sent back to developer with integration feedback.');
    setAdminStep(4);
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-gray-100 p-8 font-sans selection:bg-blue-500 selection:text-white">
      {/* Upper Navigation Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800/80 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-amber-500 to-orange-600 p-2.5 rounded-xl shadow-lg shadow-orange-500/10">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                WytSaaS Admin Workspace
                <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded">Security Panel</span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">Audit listings, enforce compliance protocols, and moderate developers live on the store</p>
            </div>
          </div>
        </div>

        {/* Sync Controls */}
        <div className="flex items-center gap-3">
          {selectedApp && (
            <button
              onClick={handleRefreshAppStatus}
              className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 hover:bg-gray-850 text-amber-400 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync Developer State
            </button>
          )}
          
          <button
            onClick={() => {
              setSelectedApp(null);
              setAdminStep(1);
            }}
            className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 hover:bg-gray-850 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all"
          >
            View Submissions Queue
          </button>
        </div>
      </div>

      {/* Notifications Alert Container */}
      <div className="max-w-7xl mx-auto space-y-4 mb-6">
        {error && (
          <div className="bg-red-950/40 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm flex items-start gap-3 animate-slide-in">
            <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-start gap-3 animate-slide-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Primary Layout Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Steps Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2 bg-[#101015]/80 border border-gray-800/80 p-5 rounded-2xl h-fit">
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 px-1">Review Steps</span>
          
          {[
            { step: 1, title: 'Registry Queue', desc: 'All submissions & states' },
            { step: 2, title: 'Review App', desc: 'Legitimacy & compliance' },
            { step: 3, title: 'Approve & Plans', desc: 'Notify approval splits' },
            { step: 4, title: 'Awaiting Integration', desc: 'Developer webhook setup' },
            { step: 5, title: 'Final Verification', desc: 'Test end-to-end' },
            { step: 6, title: 'Published Store', desc: 'Live in marketplace' }
          ].map((item) => {
            const isCompleted = adminStep > item.step;
            const isActive = adminStep === item.step;
            
            return (
              <button
                key={item.step}
                disabled={item.step > 1 && !selectedApp}
                onClick={() => setAdminStep(item.step)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left border ${
                  isActive 
                    ? 'bg-amber-500/10 border-amber-500/30 text-white' 
                    : isCompleted 
                    ? 'bg-emerald-950/5 border-emerald-900/10 text-gray-400 hover:bg-gray-800/20' 
                    : 'bg-transparent border-transparent text-gray-500'
                }`}
              >
                <div className="mt-0.5">
                  {isCompleted ? (
                    <div className="w-5 h-5 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                    </div>
                  ) : (
                    <div className={`w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center ${
                      isActive 
                        ? 'bg-amber-500 border-amber-400 text-white' 
                        : 'bg-gray-900 border-gray-800 text-gray-400'
                    }`}>
                      {item.step}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className={`text-xs font-semibold leading-tight ${isActive ? 'text-white' : 'text-gray-300'}`}>
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-none">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Active Admin Control Screen */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* STEP 1: Submissions Queue */}
          {adminStep === 1 && (
            <div className="bg-[#121218] border border-gray-800 p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Step 1: Application Registry Queue</h3>
                <p className="text-xs text-gray-400 mt-1">Audit, approve, monitor integrations, and publish any app submission live to the storefront.</p>
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                  <span className="text-xs">Scanning registry queue...</span>
                </div>
              ) : submissions.length > 0 ? (
                <div className="space-y-4">
                  {submissions.map((app) => {
                    // Status Badge colors
                    let statusLabel = app.status;
                    let badgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                    
                    if (app.status === 'pending_review') {
                      statusLabel = 'Pending Review';
                    } else if (app.status === 'approved') {
                      statusLabel = 'Approved / Pick Plan';
                      badgeClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                    } else if (app.status === 'integration_pending') {
                      statusLabel = 'Integrating SDK';
                      badgeClass = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
                    } else if (app.status === 'publish_pending') {
                      statusLabel = 'Ready to Publish';
                      badgeClass = 'bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse';
                    } else if (app.status === 'live') {
                      statusLabel = 'Live on Store';
                      badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                    } else if (app.status === 'rejected') {
                      statusLabel = 'Rejected';
                      badgeClass = 'bg-red-500/10 text-red-400 border border-red-500/20';
                    } else if (app.status === 'suspended') {
                      statusLabel = 'Suspended';
                      badgeClass = 'bg-gray-700/20 text-gray-400 border border-gray-600/20';
                    }

                    return (
                      <div 
                        key={app.id} 
                        className="bg-gray-900/60 border border-gray-800/80 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-gray-750 transition-colors"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2.5">
                            <h4 className="text-sm font-bold text-white">{app.name}</h4>
                            <span className={`text-[9px] uppercase tracking-widest font-extrabold px-2.5 py-0.5 rounded-full ${badgeClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">{app.description}</p>
                          
                          <div className="flex items-center gap-4 text-[10px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {app.support_email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Submitted {new Date(app.submitted_at).toLocaleDateString()}
                            </span>
                            {app.plan && (
                              <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-full">
                                plan: {app.plan.plan_id.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartReview(app)}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Manage App
                          </button>
                          <a
                            href={app.url}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-gray-800 hover:bg-gray-750 text-gray-300 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                          >
                            Visit Website
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#101015] border border-gray-800 rounded-xl p-12 text-center space-y-4">
                  <AlertTriangle className="w-12 h-12 text-gray-500 mx-auto" />
                  <h4 className="text-sm font-bold text-white">Review queue is empty</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">There are no applications pending administrative action right now.</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Review App Checklist */}
          {adminStep === 2 && selectedApp && (
            <div className="bg-[#121218] border border-gray-800 p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Step 2: Security & Legitimacy Screening</h3>
                <p className="text-xs text-gray-400 mt-1">Review the compliance checklist parameters below before approving the developer's submission.</p>
              </div>

              {/* App Summary */}
              <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 block">App Identity Summary</span>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">Name:</span> <span className="text-white font-semibold">{selectedApp.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Landing URL:</span> <a href={selectedApp.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-0.5">{selectedApp.url} <ExternalLink className="w-2.5 h-2.5" /></a>
                  </div>
                  <div>
                    <span className="text-gray-500">Category:</span> <span className="text-white font-semibold">{selectedApp.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Support contact:</span> <span className="text-white font-mono">{selectedApp.support_email}</span>
                  </div>
                </div>
              </div>

              {/* Screenshots Preview */}
              {selectedApp.screenshots && selectedApp.screenshots.filter(Boolean).length > 0 && (
                <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 block">Uploaded App Screenshots</span>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedApp.screenshots.filter(Boolean).map((src: string, index: number) => (
                      <div key={index} className="relative group w-full h-32 bg-gray-950 border border-gray-850 rounded-lg overflow-hidden shadow-inner flex items-center justify-center">
                        <img 
                          src={src} 
                          alt={`Uploaded screenshot ${index + 1}`} 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => {
                            const newTab = window.open();
                            if (newTab) {
                              newTab.document.write(`<img src="${src}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist form */}
              <div className="space-y-3.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 block">Quality Review Checklist</span>

                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="audit1"
                      checked={urlChecked}
                      onChange={(e) => setUrlChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-amber-500 rounded"
                    />
                    <label htmlFor="audit1" className="text-xs text-gray-300 cursor-pointer">
                      <span className="font-bold text-white block text-xs">App URL is live and accessible</span>
                      Visit and confirm the hosted domain loads, responds under 4 seconds, and displays operational interfaces.
                    </label>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="audit2"
                      checked={descChecked}
                      onChange={(e) => setDescChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-amber-500 rounded"
                    />
                    <label htmlFor="audit2" className="text-xs text-gray-300 cursor-pointer">
                      <span className="font-bold text-white block text-xs">Description matches the app</span>
                      Ensure the textual description describes actual core functions, without containing misleading spam keyword injection.
                    </label>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="audit3"
                      checked={screensChecked}
                      onChange={(e) => setScreensChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-amber-500 rounded"
                    />
                    <label htmlFor="audit3" className="text-xs text-gray-300 cursor-pointer">
                      <span className="font-bold text-white block text-xs">Screenshots are genuine</span>
                      Audit the screenshots to confirm they represent live app mockups rather than generic stock vectors or placeholder templates.
                    </label>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="audit4"
                      checked={supportChecked}
                      onChange={(e) => setSupportChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-amber-500 rounded"
                    />
                    <label htmlFor="audit4" className="text-xs text-gray-300 cursor-pointer">
                      <span className="font-bold text-white block text-xs">Support email is valid</span>
                      Check that the developer support email domain matches their site identity.
                    </label>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="audit5"
                      checked={privacyChecked}
                      onChange={(e) => setPrivacyChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-amber-500 rounded"
                    />
                    <label htmlFor="audit5" className="text-xs text-gray-300 cursor-pointer">
                      <span className="font-bold text-white block text-xs">Privacy policy page exists</span>
                      Verify that a standard privacy policy url has been provided to protect user information.
                    </label>
                  </div>
                </div>
              </div>

              {/* Action notes */}
              <div className="space-y-4 pt-4 border-t border-gray-800">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Admin Notes (internal or approval notes)</label>
                  <textarea
                    placeholder="Provide audit notes or review feedback for internal record logs..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    disabled={!urlChecked || !descChecked || !screensChecked || !supportChecked || !privacyChecked}
                    onClick={handleApproveApp}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve App
                  </button>
                  
                  <button
                    onClick={() => {
                      const reason = prompt('Please enter rejection feedback reasoning for the developer:');
                      if (reason) {
                        setRejectionReason(reason);
                        setTimeout(handleRejectApp, 100);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject App
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Approve & Assign Plans */}
          {adminStep === 3 && selectedApp && (
            <div className="bg-[#121218] border border-gray-800 p-6 rounded-2xl space-y-6">
              <div className="bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 p-4 rounded-xl text-xs space-y-1">
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  App Approved Successfully!
                </span>
                <p>The application details are verified. The developer has been auto-notified via email and can now select a plan from their portal.</p>
              </div>

              {/* Waiting status — dynamic based on whether plan is already selected */}
              {selectedApp.plan ? (
                <div className="bg-blue-950/20 border border-blue-500/20 p-4 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-300 font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Developer Selected a Plan!
                    </span>
                    <button
                      onClick={handleRefreshAppStatus}
                      className="bg-blue-600/15 border border-blue-500/20 text-blue-300 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-blue-600/30"
                    >
                      Sync Latest Status
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-900 rounded-lg p-3">
                      <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Selected Plan</p>
                      <p className="text-white font-bold text-sm uppercase">{selectedApp.plan.plan_id}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3">
                      <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Agreement Signed</p>
                      <p className={`font-bold text-sm ${selectedApp.plan.agreement_signed ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {selectedApp.plan.agreement_signed ? '✅ Signed' : '⏳ Pending'}
                      </p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3">
                      <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Signed At</p>
                      <p className="text-white text-xs">{selectedApp.plan.signed_at ? new Date(selectedApp.plan.signed_at).toLocaleDateString() : '—'}</p>
                    </div>
                  </div>
                  {!selectedApp.plan.agreement_signed && (
                    <p className="text-amber-400/80 text-[11px]">⏳ Waiting for developer to sign the revenue split agreement in their portal...</p>
                  )}
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between text-xs text-gray-300">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold animate-pulse">
                    <Clock className="w-4 h-4" />
                    <span>Awaiting developer plan selection &amp; revenue split sign-off...</span>
                  </div>
                  <button
                    onClick={handleRefreshAppStatus}
                    className="bg-blue-600/15 border border-blue-500/20 text-blue-300 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-blue-600/30"
                  >
                    Sync Latest Status
                  </button>
                </div>
              )}

              <div className="bg-[#181824] border border-blue-500/20 p-5 rounded-xl space-y-3.5">
                <span className="text-xs font-semibold text-blue-400 block">Verification Email Simulator</span>
                <p className="text-xs text-gray-400">
                  Simulate dispatching the official secure approval notification email to WytSaaS Developer program members.
                </p>
                <button
                  onClick={handleSendApprovalEmail}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Approval Email to Developer
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Awaiting Developer Integration */}
          {adminStep === 4 && selectedApp && (
            <div className="bg-[#121218] border border-gray-800 p-6 rounded-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Step 4: Monitoring SDK & Webhook Integration</h3>
                  <p className="text-xs text-gray-400 mt-1">Real-time status of checkpoints completed by the developer in their integration workspace.</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-400 text-xs font-bold animate-pulse">
                  Awaiting Integration
                </div>
              </div>

              {/* Developer Checkpoints Status */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 block">Live Integration Checkpoints</span>
                
                {[
                  { label: 'WytPass SSO OAuth protocol configured', status: selectedApp.integration_status?.wytpass_sso ? 'done' : 'pending' },
                  { label: `Platform billing plan selected (${selectedApp.plan?.plan_id?.toUpperCase() || 'Starter'})`, status: selectedApp.integration_status?.plan_selected ? 'done' : 'pending' },
                  { label: 'Revenue Split legal agreement terms signed', status: selectedApp.integration_status?.agreement_signed ? 'done' : 'pending' },
                  { label: 'Marketplace client secure credentials issued', status: selectedApp.integration_status?.credentials_issued ? 'done' : 'pending' },
                  { label: `Webhook endpoint URL registered (${selectedApp.credentials?.webhook_url || 'Not set'})`, status: selectedApp.integration_status?.webhook_url_set ? 'done' : 'pending' },
                  { label: 'GET /api/v1/marketplace/verify SDK test authorization passed', status: selectedApp.integration_status?.webhook_url_set ? 'done' : 'pending' },
                  { label: 'HMAC Webhook dispatch test verification completed', status: selectedApp.integration_status?.webhook_url_set ? 'done' : 'pending' },
                  { label: 'Final administrative publish verification', status: 'locked' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-gray-300 font-medium">
                    <span className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        item.status === 'done' ? 'bg-emerald-500' : item.status === 'locked' ? 'bg-gray-600' : 'bg-amber-500 animate-pulse'
                      }`} />
                      {item.label}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      item.status === 'done' 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : item.status === 'locked'
                        ? 'bg-gray-800 text-gray-500'
                        : 'bg-amber-500/10 text-amber-400 animate-pulse'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Admin developer notify ready simulator */}
              <div className="bg-[#181822] border border-blue-500/20 p-5 rounded-xl space-y-3">
                <span className="text-xs font-semibold text-blue-400 block">Integration Fast-Track Sandbox</span>
                <p className="text-xs text-gray-400">
                  Simulate that the developer has completed their integration and webhook endpoint setup, and has notified administrative reviewers that they are ready!
                </p>
                <button
                  onClick={handleSimulateDeveloperReady}
                  className="bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Simulate: Developer Notified Ready
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Final Verification */}
          {adminStep === 5 && selectedApp && (
            <div className="bg-[#121218] border border-gray-800 p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Step 5: End-to-End Publication Verification</h3>
                <p className="text-xs text-gray-400 mt-1">Complete final security reviews on the active endpoints before publishing the app listing live.</p>
              </div>

              <div className="bg-blue-950/20 border border-blue-500/20 p-4 rounded-xl text-xs text-blue-300 space-y-1">
                <span className="font-bold text-blue-400 block">End-to-End Test Tip:</span>
                <p>Simulate a test billing transaction. Confirm that the developer's registered webhook URL parses subscription claims correctly and their API gates premium functions.</p>
              </div>

              {/* Verification checklist */}
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 block">Administrative Publish Checks</span>

                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="pub1"
                      checked={webhookVerified}
                      onChange={(e) => setWebhookVerified(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-amber-500 rounded"
                    />
                    <label htmlFor="pub1" className="text-xs text-gray-300 cursor-pointer">
                      <span className="font-bold text-white block text-xs">Webhook URL is set and live</span>
                      Confirm the endpoint URL is active and processes POST payload signatures.
                    </label>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="pub2"
                      checked={testEventReceived}
                      onChange={(e) => setTestEventReceived(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-amber-500 rounded"
                    />
                    <label htmlFor="pub2" className="text-xs text-gray-300 cursor-pointer">
                      <span className="font-bold text-white block text-xs">Test webhook event received successfully</span>
                      Simulated dispatch triggered from step 6 developer panel returned HTTP 200 Success.
                    </label>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="pub3"
                      checked={verifyApiWorks}
                      onChange={(e) => setVerifyApiWorks(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-amber-500 rounded"
                    />
                    <label htmlFor="pub3" className="text-xs text-gray-300 cursor-pointer">
                      <span className="font-bold text-white block text-xs">Subscription verify API works correctly</span>
                      The integrated app performs successful token validation checks against the verify API.
                    </label>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="pub4"
                      checked={gatingWorks}
                      onChange={(e) => setGatingWorks(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-amber-500 rounded"
                    />
                    <label htmlFor="pub4" className="text-xs text-gray-300 cursor-pointer">
                      <span className="font-bold text-white block text-xs">App correctly gates access by plan</span>
                      Ensure non-paying or expired users are securely redirected from premium resources.
                    </label>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="pub5"
                      checked={urlLiveSSO}
                      onChange={(e) => setUrlLiveSSO(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-amber-500 rounded"
                    />
                    <label htmlFor="pub5" className="text-xs text-gray-300 cursor-pointer">
                      <span className="font-bold text-white block text-xs">App URL is live with WytPass login</span>
                      Verify that only SSO OAuth-based sessions gate user login boards on the live URL.
                    </label>
                  </div>
                </div>
              </div>

              {/* Publish actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
                <button
                  disabled={!webhookVerified || !testEventReceived || !verifyApiWorks || !gatingWorks || !urlLiveSSO}
                  onClick={handlePublishApp}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Publish to Marketplace
                </button>

                <button
                  onClick={handleSendBackToDeveloper}
                  className="bg-red-650 hover:bg-red-750 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  Send Back to Developer
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Published Success / Moderate */}
          {adminStep === 6 && selectedApp && (
            <div className="bg-[#121218] border border-gray-800 p-8 rounded-2xl text-center space-y-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                selectedApp.status === 'live'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-gray-500/10 border border-gray-500/20 text-gray-400'
              }`}>
                {selectedApp.status === 'live' ? <ShieldCheck className="w-8 h-8" /> : <Ban className="w-8 h-8" />}
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">
                  {selectedApp.status === 'live' ? 'Listing is Active & Published!' : 'Listing is Suspended'}
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  {selectedApp.status === 'live'
                    ? `Application "${selectedApp.name}" is public and open to end-user premium subscriptions!`
                    : `Application "${selectedApp.name}" is temporarily suspended. End-users cannot buy new plans.`
                  }
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl text-xs max-w-sm mx-auto space-y-1.5 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-500">Live Status:</span>
                  <span className={`font-bold uppercase ${selectedApp.status === 'live' ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {selectedApp.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Billed Plan:</span>
                  <span className="text-white uppercase font-bold">{selectedApp.plan ? selectedApp.plan.plan_id.toUpperCase() : 'Starter'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">SSO OAuth Handshake:</span>
                  <span className="text-white font-semibold">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Webhook Target:</span>
                  <span className="text-white font-mono truncate max-w-[200px]">{selectedApp.credentials?.webhook_url || 'None'}</span>
                </div>
              </div>

              {/* Moderate panel */}
              <div className="flex justify-center gap-3 pt-4 max-w-sm mx-auto">
                {selectedApp.status === 'live' ? (
                  <button
                    onClick={handleSuspendApp}
                    className="w-full bg-red-650 hover:bg-red-750 text-white font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Suspend Listing
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        await saasApi.post(`/api/v1/admin/marketplace/${selectedApp.id}/publish`, { notes: 'Re-activated listing' });
                        setSuccessMsg('App re-activated successfully!');
                        await loadSubmissions();
                      } catch {
                        setError('Failed to re-activate.');
                      }
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Re-activate Listing
                  </button>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setSelectedApp(null);
                    setAdminStep(1);
                  }}
                  className="text-gray-400 hover:text-white text-xs font-semibold underline"
                >
                  Return to Audit Queue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
