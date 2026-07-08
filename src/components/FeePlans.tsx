import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Check,
  CreditCard,
  PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FeePlan, FeeHead } from '../types';
import { cn } from '../lib/utils';

export default function FeePlans() {
  const [plans, setPlans] = useState<FeePlan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [newPlan, setNewPlan] = useState<{
    name: string;
    frequency: string;
    heads: { name: string; amount: string }[];
  }>({
    name: '',
    frequency: 'Semester',
    heads: [{ name: '', amount: '' }]
  });

  const fetchPlans = () => {
    fetch('/api/fee-plans')
      .then(res => res.json())
      .then(data => Array.isArray(data) ? setPlans(data) : setPlans([]))
      .catch(err => {
        console.error("Failed to fetch plans:", err);
        setPlans([]);
      });
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const addHead = () => {
    setNewPlan(prev => ({
      ...prev,
      heads: [...prev.heads, { name: '', amount: '' }]
    }));
  };

  const removeHead = (index: number) => {
    setNewPlan(prev => ({
      ...prev,
      heads: prev.heads.filter((_, i) => i !== index)
    }));
  };

  const updateHead = (index: number, field: 'name' | 'amount', value: string) => {
    setNewPlan(prev => ({
      ...prev,
      heads: prev.heads.map((h, i) => i === index ? { ...h, [field]: value } : h)
    }));
  };

  const savePlan = () => {
    if (!newPlan.name || newPlan.heads.some(h => !h.name || !h.amount)) {
      alert('Please fill all fields correctly');
      return;
    }

    const url = editingPlanId ? `/api/fee-plans/${editingPlanId}` : '/api/fee-plans';
    const method = editingPlanId ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPlan)
    }).then(res => {
      if (res.ok) {
        fetchPlans();
        setIsModalOpen(false);
        setEditingPlanId(null);
        setNewPlan({ name: '', frequency: 'Semester', heads: [{ name: '', amount: '' }] });
      }
    });
  };

  const startEdit = (plan: FeePlan) => {
    setEditingPlanId(plan.id);
    setNewPlan({
      name: plan.name,
      frequency: plan.frequency,
      heads: plan.heads.map(h => ({ name: h.name, amount: (h.amount || 0).toString() }))
    });
    setIsModalOpen(true);
  };

  const deletePlan = (id: number) => {
    if (confirm('Are you sure you want to delete this fee structure? This may affect existing students.')) {
      fetch(`/api/fee-plans/${id}`, { method: 'DELETE' }).then(fetchPlans);
    }
  };

  const estimatedTotal = newPlan.heads.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Fee Structures</h3>
          <p className="text-slate-500 text-sm">Standardize billing across all programs</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
        >
          <Plus size={20} />
          Create New Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {(plans || []).map(plan => (
          <motion.div 
            layout
            key={plan.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
          >
            <div className="p-6 space-y-4 flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
                    {plan.frequency} Cycle
                  </span>
                  <h4 className="text-xl font-bold text-slate-900">{plan.name}</h4>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Package</p>
                  <p className="text-2xl font-black text-emerald-600">₹{(plan.total_amount || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fee Heads</p>
                {plan.heads?.map(head => (
                  <div key={head.id} className="flex items-center justify-between text-sm py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-slate-600 font-medium">{head.name}</span>
                    </div>
                    <span className="text-slate-900 font-bold">₹{(head.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button 
                onClick={() => startEdit(plan)}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit3 size={18} />
              </button>
              <button 
                onClick={() => deletePlan(plan.id)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </motion.div>
        ))}
        {plans.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <CreditCard size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-slate-900 font-bold">No Fee Plans Found</h3>
            <p className="text-slate-500 text-sm mt-1">Create your first fee structure to start enrolling students.</p>
          </div>
        )}
      </div>

      {/* Create Plan Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingPlanId ? 'Edit Fee Structure' : 'New Structure'}
                </h3>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPlanId(null);
                    setNewPlan({ name: '', frequency: 'Semester', heads: [{ name: '', amount: '' }] });
                  }}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plan Name</label>
                    <input 
                      type="text"
                      value={newPlan.name}
                      onChange={e => setNewPlan({...newPlan, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="e.g. Master of Science"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Installment Frequency</label>
                    <select 
                      value={newPlan.frequency}
                      onChange={e => setNewPlan({...newPlan, frequency: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                    >
                      <option>Semester</option>
                      <option>Annual</option>
                      <option>Monthly</option>
                      <option>One-time</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4 p-6 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Add Component</h4>
                  </div>
                  <div className="space-y-3">
                    {newPlan.heads.map((head, index) => (
                      <div key={index} className="flex gap-3 items-center">
                        <input 
                          type="text"
                          value={head.name}
                          onChange={e => updateHead(index, 'name', e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Head Name"
                        />
                        <div className="relative w-32">
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                          <input 
                            type="number"
                            value={head.amount}
                            onChange={e => updateHead(index, 'amount', e.target.value)}
                            className="w-full pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="Amt"
                          />
                        </div>
                        <button 
                          onClick={() => removeHead(index)}
                          disabled={newPlan.heads.length === 1}
                          className="p-2 text-slate-300 hover:text-red-500 disabled:opacity-0 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={addHead}
                    className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-emerald-200 text-emerald-600 font-bold text-sm hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                  >
                    <PlusCircle size={18} />
                    Append Head
                  </button>
                </div>
              </div>

              <div className="p-6 bg-slate-900 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Total</p>
                  <p className="text-3xl font-black text-emerald-400">₹{(estimatedTotal || 0).toLocaleString()}</p>
                </div>
                <button 
                  onClick={savePlan}
                  className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-xl"
                >
                  Confirm Plan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
