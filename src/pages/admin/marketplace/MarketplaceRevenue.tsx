import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Landmark, TrendingUp, Search, 
  CheckCircle, Loader2, Sparkles, Filter, 
  HelpCircle, User, Box, ShieldCheck, Mail
} from 'lucide-react';
import saasApi from '@/services/saasApi';

export default function MarketplaceRevenue() {
  const [data, setData] = useState<any>({ summary: {}, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'settled'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const res = await saasApi.get('/api/v1/admin/marketplace/revenue');
      setData(res.data || { summary: {}, transactions: [] });
    } catch (err) {
      console.error('Failed to fetch marketplace revenue:', err);
      showNotification('error', 'Failed to retrieve revenue share records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  const handleShareRevenue = async (subId: string) => {
    try {
      setProcessingId(subId);
      const res = await saasApi.post(`/api/v1/admin/marketplace/revenue/${subId}/share`);
      showNotification('success', res.data.message || 'Revenue share completed successfully!');
      
      // Update local state to reflect change immediately
      setData((prev: any) => {
        const updatedTransactions = prev.transactions.map((tx: any) => {
          if (tx.id === subId) {
            return { ...tx, settled: true };
          }
          return tx;
        });

        // Recalculate summary
        let total_settled = 0.0;
        let total_pending = 0.0;
        updatedTransactions.forEach((tx: any) => {
          const devShare = parseFloat(tx.developer_share);
          if (tx.settled) {
            total_settled += devShare;
          } else {
            total_pending += devShare;
          }
        });

        return {
          ...prev,
          summary: {
            ...prev.summary,
            total_settled: total_settled.toFixed(2),
            total_pending: total_pending.toFixed(2)
          },
          transactions: updatedTransactions
        };
      });
    } catch (err: any) {
      console.error('Revenue share failed:', err);
      showNotification('error', err.response?.data?.detail || 'Failed to process payout.');
    } finally {
      setProcessingId(null);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Filter transactions
  const filteredTransactions = (data.transactions || []).filter((tx: any) => {
    const matchesSearch = 
      tx.app_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.developer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.developer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.user_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'pending') return matchesSearch && !tx.settled;
    if (filterType === 'settled') return matchesSearch && tx.settled;
    return matchesSearch;
  });

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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Landmark className="w-6 h-6 text-primary-600" />
            Marketplace Revenue Share
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage paid listings subscriptions, track the 80/20 platform split, and settle revenue shares with developers.
          </p>
        </div>
        <button 
          onClick={fetchRevenue}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-xl transition-colors shadow-sm"
        >
          Refresh Data
        </button>
      </div>

      {/* KPI summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gross Sales</p>
              <p className="text-3xl font-black text-gray-900 mt-2">
                {loading ? '...' : `₹${data.summary?.total_gross || '0.00'}`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 border border-primary-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-semibold text-primary-700 bg-primary-50/50 w-fit px-2 py-0.5 rounded-md border border-primary-50">
            <Sparkles className="w-3 h-3" /> Includes 20% platform share
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Settled Share</p>
              <p className="text-3xl font-black text-gray-900 mt-2">
                {loading ? '...' : `₹${data.summary?.total_settled || '0.00'}`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-semibold text-emerald-700 bg-emerald-50/50 w-fit px-2 py-0.5 rounded-md border border-emerald-50">
            80% developer share paid out
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pending Payout Share</p>
              <p className="text-3xl font-black text-rose-600 mt-2">
                {loading ? '...' : `₹${data.summary?.total_pending || '0.00'}`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
              <DollarSign className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-semibold text-rose-700 bg-rose-50/50 w-fit px-2 py-0.5 rounded-md border border-rose-50">
            Awaiting manual settlement
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by app name, developer or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm w-full outline-none focus:ring-0 placeholder:text-gray-400 border-none p-0 text-gray-700"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <Filter className="w-4 h-4 text-gray-400 hidden sm:inline" />
          <div className="flex rounded-xl bg-gray-50 p-1 border border-gray-100">
            {(['all', 'pending', 'settled'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  filterType === t 
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-100' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-gray-400 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            <p className="text-sm font-medium">Loading revenue share entries...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-24 text-center text-gray-400 space-y-2">
            <Landmark className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-gray-700">No revenue records found</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              There are currently no matching subscriptions/transactions that qualify for revenue split.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-4">Application</th>
                  <th className="px-6 py-4">Publisher / Developer</th>
                  <th className="px-6 py-4">Subscriber ID</th>
                  <th className="px-6 py-4">Plan & Amount</th>
                  <th className="px-6 py-4">Revenue Splits</th>
                  <th className="px-6 py-4 text-center">Settlement Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 border border-primary-100 flex-shrink-0">
                          <Box className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{tx.app_name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">TxID: ...{tx.id.slice(-8)}</p>
                          {tx.razorpay_payment_id && (
                            <p className="text-[9px] text-primary-600 font-mono mt-0.5 bg-primary-50/50 w-fit px-1 py-0.5 rounded border border-primary-100/50">RPay: {tx.razorpay_payment_id}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-semibold text-gray-800">{tx.developer_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-gray-400">
                          <Mail className="w-3 h-3" />
                          <span>{tx.developer_email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-500">
                      {tx.user_id}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-900">₹{tx.gross}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 uppercase font-medium">{tx.plan} Plan</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-16 text-[9px] text-gray-400 font-semibold uppercase">Dev (80%):</span>
                          <span className="font-bold text-emerald-600">₹{tx.developer_share}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-16 text-[9px] text-gray-400 font-semibold uppercase">Platform (20%):</span>
                          <span className="font-semibold text-gray-500">₹{tx.platform_split}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {tx.settled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Settled
                          </span>
                        ) : (
                          <button
                            onClick={() => handleShareRevenue(tx.id)}
                            disabled={processingId === tx.id}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100 shadow-sm"
                          >
                            {processingId === tx.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" /> Processing
                              </>
                            ) : (
                              <>
                                <DollarSign className="w-3 h-3" /> Share to Developer
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
