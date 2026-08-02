import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  ChevronRight,
  Edit3,
  X,
  History,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function Dashboard({ setActiveTab, user }: { setActiveTab: (tab: string) => void, user: any }) {
  const [summary, setSummary] = useState<any>(null);
  const [activeAuditTab, setActiveAuditTab] = useState<'transactions' | 'students'>('transactions');
  const [viewingAuditTx, setViewingAuditTx] = useState<any>(null);
  const [viewingAuditStudent, setViewingAuditStudent] = useState<any>(null);

  const cleanVal = (val: any) => val ? val.toString().replace(/^\[Auto\]\s*/, '') : '';

  useEffect(() => {
    fetch('/api/summary')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setSummary(data);
        } else {
          console.error("Failed to fetch summary:", data?.error);
        }
      })
      .catch(err => console.error("Summary fetch error:", err));
  }, []);

  if (!summary) return <div className="flex items-center justify-center h-64 text-slate-500 font-medium">Loading Dashboard...</div>;

  const totalEditedCount = (summary.editedTxCount || 0) + (summary.editedStudentCount || 0);

  const stats = [
    { 
      label: 'Total Collections', 
      value: `₹${(summary.totalCollections || 0).toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'bg-emerald-500',
      trend: '+12.5%',
      trendUp: true
    },
    { 
      label: 'Total Students', 
      value: (summary.studentCount || 0).toString(), 
      icon: Users, 
      color: 'bg-blue-500',
      trend: '+4',
      trendUp: true
    },
    ...(user.role !== 'accountant' ? [
      { 
        label: 'Edited Audits', 
        value: totalEditedCount.toString(), 
        icon: Edit3, 
        color: totalEditedCount > 0 ? 'bg-amber-500' : 'bg-slate-500',
        trend: totalEditedCount > 0 ? `${summary.editedTxCount || 0} Txns, ${summary.editedStudentCount || 0} Students` : 'No edits',
        trendUp: false,
        isAmber: true
      }
    ] : [
      { 
        label: 'Active Plans', 
        value: (summary.planCount || 0).toString(), 
        icon: CreditCard, 
        color: 'bg-violet-500',
        trend: 'Stable',
        trendUp: true
      }
    ]),
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className={cn("p-3 rounded-xl text-white shadow-lg", stat.color)}>
                <stat.icon size={24} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full",
                stat.isAmber ? "bg-amber-100 text-amber-800" : stat.trendUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}>
                {!stat.isAmber && (stat.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />)}
                {stat.trend}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Collections */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock size={18} className="text-slate-400" />
                Recent Collections
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Highlights transactions edited by Accountant</p>
            </div>
            {user?.role !== 'accountant' && (
              <button 
                onClick={() => setActiveTab('reports')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                View Reports <ChevronRight size={14} />
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-50 flex-1 overflow-y-auto max-h-[420px]">
            {(summary.recentTransactions || []).map((tx: any) => (
              <div key={tx.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    tx.is_edited ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-600"
                  )}>
                    {tx.is_edited ? <Edit3 size={18} /> : <TrendingUp size={18} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-slate-900 truncate">{cleanVal(tx.student_name)}</p>
                      {tx.is_edited && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider flex-shrink-0">
                          Edited by {tx.edited_by || 'Accountant'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {tx.created_at ? format(new Date(tx.created_at), 'MMM dd, yyyy • hh:mm a') : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-900">₹{(tx.amount || 0).toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{cleanVal(tx.payment_mode)}</p>
                  {tx.is_edited && (
                    <button 
                      onClick={() => setViewingAuditTx(tx)}
                      className="mt-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 underline block ml-auto"
                    >
                      View Audit
                    </button>
                  )}
                </div>
              </div>
            ))}
            {summary.recentTransactions?.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-sm">
                No recent transactions found.
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & System Stats */}
        <div className="space-y-6">
          <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-200 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-bold">Collect Fees</h3>
              <p className="text-emerald-100 text-sm mt-1 opacity-80">Quickly record a new payment and generate a receipt.</p>
              <button 
                onClick={() => setActiveTab('collection')}
                className="mt-6 bg-white text-emerald-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors shadow-lg"
              >
                Start Collection
              </button>
            </div>
            <CreditCard className="absolute -right-4 -bottom-4 text-emerald-500/20 w-32 h-32 rotate-12" />
          </div>

          {user.role !== 'accountant' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">System Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Users size={16} />
                    </div>
                    <span className="text-sm font-medium text-slate-600">Active Students</span>
                  </div>
                  <span className="font-bold text-slate-900">{summary.studentCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                      <CreditCard size={16} />
                    </div>
                    <span className="text-sm font-medium text-slate-600">Fee Structures</span>
                  </div>
                  <span className="font-bold text-slate-900">{summary.planCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                      <Edit3 size={16} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-amber-900 block">Edited Records Log</span>
                      <span className="text-[11px] text-amber-700">Modified by Accountant</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold">
                    {totalEditedCount} Total
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADMIN EDITED DETAILS AUDIT SECTION */}
      {user.role !== 'accountant' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <Edit3 size={12} /> Audit Trail
                </span>
                <h3 className="text-lg font-bold text-slate-900">Edited Transactions & Student Details</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Track modifications made by Accountants with step-by-step Before vs After comparison history.
              </p>
            </div>

            {/* Audit Sub-Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              <button
                onClick={() => setActiveAuditTab('transactions')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  activeAuditTab === 'transactions' 
                    ? "bg-amber-500 text-white shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <FileSpreadsheet size={14} />
                Edited Transactions ({summary.editedTxCount || 0})
              </button>
              <button
                onClick={() => setActiveAuditTab('students')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  activeAuditTab === 'students' 
                    ? "bg-amber-500 text-white shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <UserCheck size={14} />
                Edited Student Details ({summary.editedStudentCount || 0})
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeAuditTab === 'transactions' ? (
              <div>
                {(summary.editedTransactions || []).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No transactions have been edited yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                          <th className="py-3 px-4">Receipt #</th>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4">Current Amount</th>
                          <th className="py-3 px-4">Payment Mode</th>
                          <th className="py-3 px-4">Edited By</th>
                          <th className="py-3 px-4">Edited Date</th>
                          <th className="py-3 px-4 text-center">Audit Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {summary.editedTransactions.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-amber-50/40 transition-colors font-medium">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">#DC-{1000 + tx.id}</td>
                            <td className="py-3 px-4 font-semibold text-slate-800">{cleanVal(tx.student_name)}</td>
                            <td className="py-3 px-4 font-bold text-emerald-700 font-mono">₹{Number(tx.amount || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-slate-600">{cleanVal(tx.payment_mode)}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px] uppercase">
                                {tx.edited_by || 'Accountant'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {tx.edited_at ? new Date(tx.edited_at).toLocaleString() : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => setViewingAuditTx(tx)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-1 mx-auto"
                              >
                                <History size={12} />
                                View Before & After
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {(summary.editedStudents || []).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No student details have been edited yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4">Roll No</th>
                          <th className="py-3 px-4">Program / Branch</th>
                          <th className="py-3 px-4">Phone</th>
                          <th className="py-3 px-4">Edited By</th>
                          <th className="py-3 px-4">Edited Date</th>
                          <th className="py-3 px-4 text-center">Audit Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {summary.editedStudents.map((s: any) => (
                          <tr key={s.id} className="hover:bg-amber-50/40 transition-colors font-medium">
                            <td className="py-3 px-4 font-bold text-slate-900">{cleanVal(s.name)}</td>
                            <td className="py-3 px-4 font-mono font-semibold text-slate-700">{cleanVal(s.roll_no)}</td>
                            <td className="py-3 px-4 text-slate-600">
                              {cleanVal(s.plan_name)} • {cleanVal(s.branch_name)}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">{cleanVal(s.phone)}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px] uppercase">
                                {s.edited_by || 'Accountant'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {s.edited_at ? new Date(s.edited_at).toLocaleString() : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => setViewingAuditStudent(s)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-1 mx-auto"
                              >
                                <History size={12} />
                                View Before & After
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction Audit Comparison Modal */}
      <AnimatePresence>
        {viewingAuditTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingAuditTx(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 bg-amber-500 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white text-amber-900 rounded font-bold text-[10px] uppercase">Audit History</span>
                    <h3 className="text-lg font-bold">Transaction #DC-{1000 + viewingAuditTx.id}</h3>
                  </div>
                  <p className="text-xs text-amber-100 mt-0.5">
                    Edited by <span className="font-bold">{viewingAuditTx.edited_by || 'Accountant'}</span> on {viewingAuditTx.edited_at ? new Date(viewingAuditTx.edited_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <button 
                  onClick={() => setViewingAuditTx(null)}
                  className="p-2 hover:bg-white/10 rounded-full text-white/80 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <p className="text-xs font-semibold text-slate-500">
                  Detailed comparison showing transaction details <span className="text-rose-600 font-bold">before editing</span> vs <span className="text-emerald-600 font-bold">after editing</span>:
                </p>

                <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-amber-100/80 text-amber-900 font-bold">
                        <th className="p-2.5 border-b border-amber-200">Field</th>
                        <th className="p-2.5 border-b border-amber-200 text-rose-700 bg-rose-50/60">Before Editing</th>
                        <th className="p-2.5 border-b border-amber-200 text-emerald-700 bg-emerald-50/60">After Editing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 font-medium">
                      {[
                        { label: 'Amount', key: 'amount', current: `₹${Number(viewingAuditTx.amount || 0).toLocaleString()}`, prev: viewingAuditTx.previous_data ? `₹${Number(viewingAuditTx.previous_data.amount || 0).toLocaleString()}` : 'N/A' },
                        { label: 'Payment Mode', key: 'payment_mode', current: cleanVal(viewingAuditTx.payment_mode || 'N/A'), prev: viewingAuditTx.previous_data ? cleanVal(viewingAuditTx.previous_data.payment_mode || 'N/A') : 'N/A' },
                        { label: 'Txn / UPI ID', key: 'transaction_id', current: cleanVal(viewingAuditTx.transaction_id || 'N/A'), prev: viewingAuditTx.previous_data ? cleanVal(viewingAuditTx.previous_data.transaction_id || 'N/A') : 'N/A' },
                        { label: 'Academic Term', key: 'academic_term', current: cleanVal(viewingAuditTx.academic_term || 'N/A'), prev: viewingAuditTx.previous_data ? cleanVal(viewingAuditTx.previous_data.academic_term || 'N/A') : 'N/A' },
                        { label: 'Transaction Date', key: 'transaction_date', current: viewingAuditTx.transaction_date || 'N/A', prev: viewingAuditTx.previous_data ? viewingAuditTx.previous_data.transaction_date || 'N/A' : 'N/A' },
                        { label: 'Bank Account', key: 'bank_account', current: cleanVal(viewingAuditTx.bank_account || 'N/A'), prev: viewingAuditTx.previous_data ? cleanVal(viewingAuditTx.previous_data.bank_account || 'N/A') : 'N/A' },
                      ].map(f => {
                        const changed = f.prev !== f.current;
                        return (
                          <tr key={f.key} className={changed ? 'bg-amber-50/90 font-bold' : ''}>
                            <td className="p-2.5 font-semibold text-slate-700">{f.label}</td>
                            <td className="p-2.5 text-rose-700 bg-rose-50/30 font-mono">{f.prev}</td>
                            <td className="p-2.5 text-emerald-700 bg-emerald-50/30 font-mono">{f.current}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={() => setViewingAuditTx(null)}
                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                  >
                    Close Audit View
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Audit Comparison Modal */}
      <AnimatePresence>
        {viewingAuditStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingAuditStudent(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 bg-amber-500 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white text-amber-900 rounded font-bold text-[10px] uppercase">Audit Details</span>
                    <h3 className="text-lg font-bold">{cleanVal(viewingAuditStudent.name)}</h3>
                  </div>
                  <p className="text-xs text-amber-100 mt-0.5">
                    Edited by <span className="font-bold">{viewingAuditStudent.edited_by || 'Accountant'}</span> on {viewingAuditStudent.edited_at ? new Date(viewingAuditStudent.edited_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <button 
                  onClick={() => setViewingAuditStudent(null)}
                  className="p-2 hover:bg-white/10 rounded-full text-white/80 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <p className="text-xs font-semibold text-slate-500">
                  Detailed comparison showing student record <span className="text-rose-600 font-bold">before editing</span> vs <span className="text-emerald-600 font-bold">after editing</span>:
                </p>

                <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-amber-100/80 text-amber-900 font-bold">
                        <th className="p-2.5 border-b border-amber-200">Field</th>
                        <th className="p-2.5 border-b border-amber-200 text-rose-700 bg-rose-50/60">Before Editing</th>
                        <th className="p-2.5 border-b border-amber-200 text-emerald-700 bg-emerald-50/60">After Editing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 font-medium">
                      {[
                        { label: 'Name', key: 'name', current: viewingAuditStudent.name },
                        { label: 'Roll No', key: 'roll_no', current: viewingAuditStudent.roll_no },
                        { label: 'Guardian Name', key: 'guardian_name', current: viewingAuditStudent.guardian_name },
                        { label: 'Phone', key: 'phone', current: viewingAuditStudent.phone },
                        { label: 'Fee Program', key: 'plan_name', current: viewingAuditStudent.plan_name },
                        { label: 'Branch', key: 'branch_name', current: viewingAuditStudent.branch_name },
                        { label: 'Semester', key: 'semester_name', current: viewingAuditStudent.semester_name },
                        { label: 'Session', key: 'session_name', current: viewingAuditStudent.session_name },
                      ].map(f => {
                        const prevVal = viewingAuditStudent.previous_data ? cleanVal(viewingAuditStudent.previous_data[f.key] || 'N/A') : 'N/A';
                        const currVal = cleanVal(f.current || 'N/A');
                        const changed = prevVal !== currVal;
                        return (
                          <tr key={f.key} className={changed ? 'bg-amber-50/90 font-bold' : ''}>
                            <td className="p-2.5 font-semibold text-slate-700">{f.label}</td>
                            <td className="p-2.5 text-rose-700 bg-rose-50/30 font-mono">{prevVal}</td>
                            <td className="p-2.5 text-emerald-700 bg-emerald-50/30 font-mono">{currVal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={() => setViewingAuditStudent(null)}
                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                  >
                    Close Audit View
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
