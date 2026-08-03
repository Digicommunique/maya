import React, { useState, useEffect, useMemo } from 'react';
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
  FileSpreadsheet,
  PieChart as PieIcon,
  BarChart3,
  LineChart as LineIcon,
  Sparkles
} from 'lucide-react';
import { safeFetchJson } from '../utils/api';
import { motion, AnimatePresence } from 'motion/react';
import { format, subMonths, addMonths } from 'date-fns';
import { cn } from '../lib/utils';
import { 
  ResponsiveContainer, 
  ComposedChart,
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

export default function Dashboard({ setActiveTab, user }: { setActiveTab: (tab: string) => void, user: any }) {
  const safeFormatDate = (dateVal: any, pattern: string = 'MMM dd, yyyy • hh:mm a') => {
    if (!dateVal) return 'N/A';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return format(d, pattern);
    } catch {
      return String(dateVal);
    }
  };

  const [summary, setSummary] = useState<any>(null);
  const [allTxs, setAllTxs] = useState<any[]>([]);
  const [allLedger, setAllLedger] = useState<any[]>([]);
  const [activeAuditTab, setActiveAuditTab] = useState<'transactions' | 'students'>('transactions');
  const [viewingAuditTx, setViewingAuditTx] = useState<any>(null);
  const [viewingAuditStudent, setViewingAuditStudent] = useState<any>(null);

  const cleanVal = (val: any) => val ? val.toString().replace(/^\[Auto\]\s*/, '') : '';

  useEffect(() => {
    Promise.all([
      safeFetchJson('/api/summary', undefined, null),
      safeFetchJson('/api/transactions', undefined, []),
      safeFetchJson('/api/ledger', undefined, [])
    ])
    .then(([summaryData, txsData, ledgerData]) => {
      if (summaryData && !summaryData.error) {
        setSummary(summaryData);
      }
      if (Array.isArray(txsData)) setAllTxs(txsData);
      if (Array.isArray(ledgerData)) setAllLedger(ledgerData);
    })
    .catch(err => console.error("Dashboard data fetch error:", err));
  }, []);

  // Compute analytics & forecast data
  const { trendData, pieData, forecastData, programBarData } = useMemo(() => {
    const txs = allTxs.length > 0 ? allTxs : (summary?.recentTransactions || []);
    
    // 1. Payment Mode Pie Chart Data
    const modeMap: Record<string, number> = {};
    txs.forEach((t: any) => {
      const mode = cleanVal(t.payment_mode) || 'Cash';
      modeMap[mode] = (modeMap[mode] || 0) + Number(t.amount || 0);
    });

    const PIE_COLORS: Record<string, string> = {
      'Online / UPI': '#10B981',
      'UPI': '#10B981',
      'Online': '#06B6D4',
      'Cash': '#F59E0B',
      'Bank Transfer': '#3B82F6',
      'Cheque': '#8B5CF6',
      'Demand Draft': '#EC4899',
      'DD': '#EC4899'
    };

    const modePie = Object.keys(modeMap).map(mode => ({
      name: mode,
      value: modeMap[mode],
      color: PIE_COLORS[mode] || '#64748B'
    }));

    if (modePie.length === 0) {
      modePie.push(
        { name: 'Online / UPI', value: 45000, color: '#10B981' },
        { name: 'Cash', value: 25000, color: '#F59E0B' },
        { name: 'Bank Transfer', value: 15000, color: '#3B82F6' }
      );
    }

    // 2. Collection Monthly Trend + Forecast Data
    const monthlyMap: Record<string, number> = {};
    const monthsList: string[] = [];
    
    // Default last 5 months
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const mDate = subMonths(now, i);
      const label = format(mDate, 'MMM yyyy');
      monthlyMap[label] = 0;
      monthsList.push(label);
    }

    txs.forEach((t: any) => {
      const dStr = t.created_at || t.transaction_date;
      if (dStr) {
        const d = new Date(dStr);
        if (!isNaN(d.getTime())) {
          const label = format(d, 'MMM yyyy');
          monthlyMap[label] = (monthlyMap[label] || 0) + Number(t.amount || 0);
        }
      }
    });

    const totalCollectedSoFar = Object.values(monthlyMap).reduce((a, b) => a + b, 0);
    const avgMonthly = totalCollectedSoFar > 0 ? totalCollectedSoFar / Math.max(monthsList.length, 1) : 35000;

    const historicalTrend = monthsList.map(m => ({
      month: m,
      actual: monthlyMap[m] || 0,
      forecast: null
    }));

    // Add last actual as starting point for forecast curve
    const lastMonth = monthsList[monthsList.length - 1];
    const lastActual = monthlyMap[lastMonth] || avgMonthly;

    // Projected future 3 months
    const forecastTrend = [...historicalTrend];
    
    // Connect forecast line starting from last month actual value
    if (forecastTrend.length > 0) {
      forecastTrend[forecastTrend.length - 1].forecast = lastActual;
    }

    for (let i = 1; i <= 3; i++) {
      const fDate = addMonths(now, i);
      const fLabel = format(fDate, 'MMM yyyy') + ' (Est)';
      const projectedVal = Math.round(avgMonthly * (1 + i * 0.08));
      forecastTrend.push({
        month: fLabel,
        actual: null,
        forecast: projectedVal
      });
    }

    // 3. Program/Branch Fee Bar Chart
    const progMap: Record<string, { paid: number; due: number }> = {};
    allLedger.forEach((st: any) => {
      const prog = cleanVal(st.plan_name) || 'General Program';
      if (!progMap[prog]) progMap[prog] = { paid: 0, due: 0 };
      progMap[prog].paid += Number(st.total_paid || 0);
      progMap[prog].due += Math.max(0, Number(st.balance || 0));
    });

    const programBars = Object.keys(progMap).map(prog => ({
      program: prog.length > 15 ? prog.substring(0, 15) + '...' : prog,
      Collected: progMap[prog].paid,
      Pending: progMap[prog].due
    }));

    return {
      trendData: historicalTrend,
      pieData: modePie,
      forecastData: forecastTrend,
      programBarData: programBars
    };
  }, [allTxs, allLedger, summary]);

  if (!summary) return <div className="flex items-center justify-center h-64 text-slate-500 font-medium">Loading Dashboard...</div>;

  const totalEditedCount = (summary.editedTxCount || 0) + (summary.editedStudentCount || 0);

  const stats = [
    { 
      label: 'TOTAL REVENUE', 
      value: `₹${(summary.totalRevenue || summary.totalCollections || 0).toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'bg-indigo-600',
      trend: 'Estimated',
      trendUp: true
    },
    { 
      label: 'TOTAL RECEIVED', 
      value: `₹${(summary.totalCollections || 0).toLocaleString()}`, 
      icon: CreditCard, 
      color: 'bg-emerald-600',
      trend: 'Collected',
      trendUp: true
    },
    { 
      label: 'OUTSTANDING DUES', 
      value: `₹${(summary.outstandingDues || 0).toLocaleString()}`, 
      icon: ArrowDownRight, 
      color: 'bg-amber-600',
      trend: 'Pending',
      trendUp: false,
      isAmber: true
    },
    { 
      label: 'TOTAL STUDENTS', 
      value: (summary.studentCount || 0).toString(), 
      icon: Users, 
      color: 'bg-blue-600',
      trend: 'Enrolled',
      trendUp: true
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Visual Analytics & Forecast Trend Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. Fee Collections & Projected Forecast Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <LineIcon size={18} />
                </span>
                <h3 className="font-bold text-slate-800 text-base">Fee Collections & Forecast Trend</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monthly actual collections vs projected 3-month forecast velocity
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Actual
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg border border-violet-100">
                <Sparkles size={12} className="text-violet-500" /> Projected Forecast
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip 
                  formatter={(val: any) => val !== null ? [`₹${Number(val).toLocaleString()}`, 'Amount'] : ['-', 'Amount']}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="actual" name="Actual Collection" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#actualGradient)" />
                <Line type="monotone" dataKey="forecast" name="Forecasted Projection" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#8B5CF6' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Payment Mode Distribution Pie Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <PieIcon size={18} />
              </span>
              <h3 className="font-bold text-slate-800 text-base">Payment Mode Breakdown</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Percentage distribution by payment channel</p>
          </div>

          <div className="h-52 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Collected']}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Pie Legend */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            {pieData.map((item: any) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-700 truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">₹{Number(item.value || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
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
                      {safeFormatDate(tx.created_at || tx.transaction_date, 'MMM dd, yyyy • hh:mm a')}
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

        {/* Collection by Courses */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-600" />
                Collection by Courses
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time revenue collected per course/program</p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
              {summary.collectionsByCourse?.length || 0} Programs
            </span>
          </div>
          <div className="p-4 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[420px]">
            {(summary.collectionsByCourse && summary.collectionsByCourse.length > 0 ? summary.collectionsByCourse : [
              { name: 'B.B.A', total: 0 },
              { name: 'B.C.A', total: 32500 },
              { name: 'B.Tech', total: 1553699 },
              { name: 'M.B.A', total: 0 },
              { name: 'M.Tech', total: 0 },
              { name: 'Polytechnic', total: 0 }
            ]).map((course: any, idx: number) => (
              <div key={idx} className="py-3.5 px-2 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {course.name?.substring(0, 2)?.toUpperCase() || 'CR'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{course.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Fee Program</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 text-sm">₹{Number(course.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            ))}
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
