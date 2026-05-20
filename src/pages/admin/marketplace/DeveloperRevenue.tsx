import React, { useState, useEffect } from 'react';
import { DollarSign, Landmark, ArrowUpRight, TrendingUp, ShieldCheck, HelpCircle, Loader2, AlertTriangle } from 'lucide-react';
import saasApi from '@/services/saasApi';

export default function DeveloperRevenue() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [formValues, setFormValues] = useState({
    bank_name: '',
    account_number: '',
    account_holder: '',
    ifsc_code: '',
    upi_id: ''
  });

  const fetchRevenue = () => {
    setLoading(true);
    saasApi.get('/api/v1/marketplace/developer/revenue')
      .then((res) => {
        setData(res.data || {});
        if (res.data?.payout_details) {
          setFormValues({
            bank_name: res.data.payout_details.bank_name || '',
            account_number: res.data.payout_details.account_number || '',
            account_holder: res.data.payout_details.account_holder || '',
            ifsc_code: res.data.payout_details.ifsc_code || '',
            upi_id: res.data.payout_details.upi_id || ''
          });
        }
      })
      .catch((err) => {
        console.error('Failed to fetch revenue stats:', err);
        setData({}); // Graceful fallback
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  const handleRequestSettlement = async () => {
    const netBalance = parseFloat(data.net || '0.00');
    if (netBalance <= 0) {
      showNotification('error', 'You have no pending payouts to settle.');
      return;
    }

    try {
      setSettling(true);
      const res = await saasApi.post('/api/v1/marketplace/developer/settle');
      showNotification('success', res.data.message || 'Settlement processed successfully!');
      fetchRevenue();
    } catch (err: any) {
      console.error('Failed to request settlement:', err);
      showNotification('error', err.response?.data?.detail || 'Failed to process bank settlement.');
    } finally {
      setSettling(false);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingDetails(true);
      const res = await saasApi.post('/api/v1/marketplace/developer/payment-details', formValues);
      showNotification('success', res.data.message || 'Payout details updated successfully!');
      setIsEditing(false);
      fetchRevenue();
    } catch (err: any) {
      console.error('Failed to update payout details:', err);
      showNotification('error', err.response?.data?.detail || 'Failed to update payout details.');
    } finally {
      setSavingDetails(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const hasBank = data.payout_details?.bank_name && data.payout_details?.account_number && data.payout_details?.account_holder && data.payout_details?.ifsc_code;
  const hasUpi = data.payout_details?.upi_id;
  const isPayoutConfigured = hasBank || hasUpi;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl transition-all duration-300 border animate-in fade-in slide-in-from-top-4 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {notification.type === 'success' ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <HelpCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <p className="text-sm font-semibold">{notification.message}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary-600" />
            Developer Revenue
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track active subscriptions, platform splits (80/20), and process bank payouts.</p>
        </div>
        <button 
          onClick={fetchRevenue}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-xl transition-colors shadow-sm self-start sm:self-auto"
        >
          Refresh Stats
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-gray-400 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-sm font-medium">Loading revenue details...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gross Revenue</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2">₹{data.gross || '0.00'}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 border border-primary-100">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-3 font-semibold">Total sales generated by your apps</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Profit (80%)</p>
                  <p className="text-3xl font-extrabold text-emerald-600 mt-2">₹{data.net || '0.00'}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-emerald-600 mt-3 font-semibold">Ready for bank transfer</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Settled to Bank</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2">₹{data.withdrawn || '0.00'}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                  <Landmark className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-blue-600 mt-3 font-semibold">Deposited lifetime earnings</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Platform Split (20%)</p>
                  <p className="text-3xl font-extrabold text-gray-500 mt-2">₹{data.platform || '0.00'}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-3 font-semibold">Platform operations commission</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Bank Transfer Request */}
            <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-700 flex-shrink-0">
                    <Landmark className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">Bank Settlement</h3>
                    <p className="text-xs text-gray-400 mt-1">Request settlement of your ready-for-transfer funds instantly to your connected payout account.</p>
                  </div>
                </div>

                {!isPayoutConfigured && (
                  <div className="mt-5 p-3.5 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-900">Missing Payout Method</p>
                      <p className="text-amber-700 mt-0.5">Please add your bank account details or a UPI ID in the Payout Settings panel to enable settlement requests.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-gray-50">
                <button 
                  onClick={handleRequestSettlement}
                  disabled={settling || !isPayoutConfigured || parseFloat(data.net || '0') <= 0}
                  className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-105 disabled:hover:scale-100 flex items-center justify-center gap-1.5"
                >
                  {settling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                    </>
                  ) : (
                    'Request Settlement'
                  )}
                </button>
              </div>
            </div>

            {/* Payout Account Settings */}
            <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-gray-900 leading-tight flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-primary-600" />
                  Payout Settings
                </h3>
                <p className="text-xs text-gray-400 mt-1">Configure where you receive your profits.</p>
                
                {isEditing ? (
                  <form onSubmit={handleSaveDetails} className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bank Name</label>
                        <input
                          type="text"
                          placeholder="e.g. HDFC Bank"
                          value={formValues.bank_name}
                          onChange={(e) => setFormValues({ ...formValues, bank_name: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-800 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">IFSC Code</label>
                        <input
                          type="text"
                          placeholder="e.g. HDFC0000245"
                          value={formValues.ifsc_code}
                          onChange={(e) => setFormValues({ ...formValues, ifsc_code: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-800 font-semibold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Holder Name</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={formValues.account_holder}
                        onChange={(e) => setFormValues({ ...formValues, account_holder: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 50100234567891"
                        value={formValues.account_number}
                        onChange={(e) => setFormValues({ ...formValues, account_number: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-800 font-semibold"
                      />
                    </div>
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-gray-100"></div>
                      <span className="flex-shrink mx-3 text-[9px] text-gray-300 font-bold uppercase tracking-wider">OR</span>
                      <div className="flex-grow border-t border-gray-100"></div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">UPI ID</label>
                      <input
                        type="text"
                        placeholder="e.g. developer@upi"
                        value={formValues.upi_id}
                        onChange={(e) => setFormValues({ ...formValues, upi_id: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-800 font-semibold"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 border border-gray-100 hover:bg-gray-50 text-gray-500 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingDetails}
                        className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                      >
                        {savingDetails && <Loader2 className="w-3 h-3 animate-spin" />}
                        Save Details
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-4 space-y-3">
                    {isPayoutConfigured ? (
                      <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-4 space-y-2">
                        {hasBank ? (
                          <div className="space-y-1.5 text-xs text-gray-600">
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-400">Bank:</span>
                              <span className="font-bold text-gray-800">{data.payout_details.bank_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-400">Holder:</span>
                              <span className="font-semibold text-gray-800">{data.payout_details.account_holder}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-400">Account:</span>
                              <span className="font-mono text-gray-800">
                                •••• •••• {data.payout_details.account_number.slice(-4)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-400">IFSC:</span>
                              <span className="font-mono text-gray-800">{data.payout_details.ifsc_code}</span>
                            </div>
                          </div>
                        ) : null}
                        
                        {hasBank && hasUpi ? (
                          <div className="border-t border-gray-100/80 my-2"></div>
                        ) : null}

                        {hasUpi ? (
                          <div className="flex justify-between text-xs text-gray-600">
                            <span className="font-medium text-gray-400">UPI ID:</span>
                            <span className="font-bold text-gray-800">{data.payout_details.upi_id}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl text-center">
                        <p className="text-xs text-rose-700 font-semibold">No payout account connected</p>
                        <p className="text-[10px] text-rose-500 mt-0.5">Please add your bank account or UPI details to accept bank settlements.</p>
                      </div>
                    )}
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full mt-2 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-xl transition-colors shadow-sm"
                    >
                      {isPayoutConfigured ? 'Edit Payout Details' : 'Configure Payout Details'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
