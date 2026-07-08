import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function Dashboard({ setActiveTab, user }: { setActiveTab: (tab: string) => void, user: any }) {
  const [summary, setSummary] = useState<any>(null);

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

  if (!summary) return <div className="flex items-center justify-center h-64">Loading...</div>;

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
    ...(user.role !== 'accountant' ? [{ 
      label: 'Active Plans', 
      value: (summary.planCount || 0).toString(), 
      icon: CreditCard, 
      color: 'bg-violet-500',
      trend: 'Stable',
      trendUp: true
    }] : []),
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
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                stat.trendUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}>
                {stat.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
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
        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Clock size={18} className="text-slate-400" />
              Recent Collections
            </h3>
            {user?.role !== 'accountant' && (
              <button 
                onClick={() => setActiveTab('reports')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                View All <ChevronRight size={14} />
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-50">
            {(summary.recentTransactions || []).map((tx: any) => (
              <div key={tx.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{tx.student_name}</p>
                    <p className="text-xs text-slate-500">{format(new Date(tx.created_at), 'MMM dd, yyyy • hh:mm a')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">₹{(tx.amount || 0).toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tx.payment_mode}</p>
                </div>
              </div>
            ))}
            {summary.recentTransactions.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-sm">
                No recent transactions found.
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
