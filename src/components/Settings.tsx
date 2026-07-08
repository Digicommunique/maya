import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  GraduationCap, 
  UserPlus, 
  Save,
  Upload,
  Phone,
  MapPin,
  ShieldCheck,
  Eye,
  EyeOff,
  PlusCircle,
  Clock,
  Edit3,
  Trash2,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { OrgSettings, Semester, Session, Branch, Staff } from '../types';
import { cn } from '../lib/utils';

export default function Settings() {
  const [activeSubTab, setActiveSubTab] = useState('organization');
  const [data, setData] = useState<{
    settings: OrgSettings;
    semesters: Semester[];
    sessions: Session[];
    branches: Branch[];
    staff: Staff[];
  } | null>(null);

  const [newItems, setNewItems] = useState({
    semester: '',
    session: '',
    branch: '',
    staff: { staff_id: '', name: '', password: '', role: 'staff' }
  });

  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);

  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});

  const [health, setHealth] = useState<Record<string, { readable: boolean; readError: string | null }>>({});
  const [checkingHealth, setCheckingHealth] = useState(false);

  const checkHealth = () => {
    setCheckingHealth(true);
    fetch('/api/debug/health')
      .then(res => res.json())
      .then(setHealth)
      .finally(() => setCheckingHealth(false));
  };

  const fetchData = () => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(setData);
    checkHealth();
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOrgSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    fetch('/api/settings/org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data.settings)
    }).then(() => {
      localStorage.setItem('dc_org_settings', JSON.stringify(data.settings));
      alert('Settings saved successfully!');
      window.dispatchEvent(new Event('org-settings-updated'));
    });
  };

  const addItem = (type: 'semester' | 'session' | 'branch') => {
    const val = newItems[type];
    if (!val) return;
    fetch(`/api/settings/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: val })
    }).then(async res => {
      if (res.ok) {
        fetchData();
        setNewItems(prev => ({ ...prev, [type]: '' }));
      } else {
        const err = await res.json();
        alert(err.error || `Failed to add ${type}. It might already exist.`);
      }
    }).catch(err => {
      console.error(`Error adding ${type}:`, err);
      alert(`Network error while adding ${type}`);
    });
  };

  const deleteItem = (type: 'semester' | 'session' | 'branch', id: number) => {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      fetch(`/api/settings/${type}/${id}`, { method: 'DELETE' }).then(async res => {
        if (res.ok) {
          fetchData();
        } else {
          const err = await res.json();
          alert(err.error || `Failed to delete ${type}. It might be in use by students.`);
        }
      }).catch(err => {
        console.error(`Error deleting ${type}:`, err);
        alert(`Network error while deleting ${type}`);
      });
    }
  };

  const addStaff = () => {
    if (!newItems.staff.staff_id || !newItems.staff.name || !newItems.staff.password) return;
    
    const url = editingStaffId ? `/api/settings/staff/${editingStaffId}` : '/api/settings/staff';
    const method = editingStaffId ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItems.staff)
    }).then(res => {
      if (res.ok) {
        fetchData();
        setNewItems(prev => ({ ...prev, staff: { staff_id: '', name: '', password: '', role: 'staff' } }));
        setEditingStaffId(null);
      } else {
        alert('Staff ID already exists or operation failed');
      }
    });
  };

  const deleteStaff = (id: number) => {
    if (confirm('Are you sure you want to delete this staff member?')) {
      fetch(`/api/settings/staff/${id}`, { method: 'DELETE' }).then(res => {
        if (res.ok) {
          fetchData();
        } else {
          res.json().then(data => alert(data.error || 'Failed to delete staff'));
        }
      });
    }
  };

  const startEditStaff = (s: Staff) => {
    setEditingStaffId(s.id);
    setNewItems(prev => ({
      ...prev,
      staff: { staff_id: s.staff_id, name: s.name, password: s.password || '', role: s.role || 'staff' }
    }));
  };

  const cancelEditStaff = () => {
    setEditingStaffId(null);
    setNewItems(prev => ({
      ...prev,
      staff: { staff_id: '', name: '', password: '', role: 'staff' }
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && data) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setData({
          ...data,
          settings: { ...data.settings, logo: reader.result as string }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  if (!data) return <div>Loading...</div>;

  const tabs = [
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'academic', label: 'Academic Setup', icon: GraduationCap },
    { id: 'staff', label: 'Staff Management', icon: ShieldCheck },
    { id: 'database', label: 'Database Status', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeSubTab === tab.id 
                ? "bg-white text-emerald-700 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {activeSubTab === 'organization' && (
          <form onSubmit={handleOrgSave} className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Institution Logo</label>
                <div className="relative group">
                  <div className="w-32 h-32 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                    {data.settings.logo ? (
                      <img src={data.settings.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <Upload className="text-slate-300" size={32} />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl pointer-events-none">
                    <span className="text-white text-xs font-bold">Change Logo</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Institution Name</label>
                  <input 
                    type="text"
                    value={data.settings.name || ''}
                    onChange={e => setData({...data, settings: {...data.settings, name: e.target.value}})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="e.g. St. Xavier's Academy"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="tel"
                      value={data.settings.phone || ''}
                      onChange={e => setData({...data, settings: {...data.settings, phone: e.target.value}})}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-slate-400" size={18} />
                    <textarea 
                      value={data.settings.address || ''}
                      onChange={e => setData({...data, settings: {...data.settings, address: e.target.value}})}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all min-h-[100px]"
                      placeholder="Enter full campus address..."
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button 
                type="submit"
                className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
              >
                <Save size={18} />
                Save Organization Profile
              </button>
            </div>
          </form>
        )}

        {activeSubTab === 'academic' && (
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Semesters */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={18} className="text-emerald-500" />
                Semesters
              </h4>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newItems.semester}
                  onChange={e => setNewItems({...newItems, semester: e.target.value})}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="New Semester..."
                />
                <button 
                  onClick={() => addItem('semester')}
                  className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <PlusCircle size={20} />
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {(data.semesters || []).map(s => (
                  <div key={s.id} className="p-3 bg-slate-50 rounded-lg text-sm font-medium text-slate-700 border border-slate-100 flex items-center justify-between group">
                    {s.name}
                    <button 
                      onClick={() => deleteItem('semester', s.id)}
                      className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sessions */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock size={18} className="text-blue-500" />
                Academic Sessions
              </h4>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newItems.session}
                  onChange={e => setNewItems({...newItems, session: e.target.value})}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. 2024-25"
                />
                <button 
                  onClick={() => addItem('session')}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <PlusCircle size={20} />
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {(data.sessions || []).map(s => (
                  <div key={s.id} className="p-3 bg-slate-50 rounded-lg text-sm font-medium text-slate-700 border border-slate-100 flex items-center justify-between group">
                    {s.name}
                    <button 
                      onClick={() => deleteItem('session', s.id)}
                      className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Branches */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <GraduationCap size={18} className="text-violet-500" />
                Branches / Courses
              </h4>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newItems.branch}
                  onChange={e => setNewItems({...newItems, branch: e.target.value})}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Computer Science"
                />
                <button 
                  onClick={() => addItem('branch')}
                  className="p-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                >
                  <PlusCircle size={20} />
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {(data.branches || []).map(b => (
                  <div key={b.id} className="p-3 bg-slate-50 rounded-lg text-sm font-medium text-slate-700 border border-slate-100 flex items-center justify-between group">
                    {b.name}
                    <button 
                      onClick={() => deleteItem('branch', b.id)}
                      className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'staff' && (
          <div className="p-8 space-y-8">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus size={18} className="text-emerald-600" />
                  {editingStaffId ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h4>
                {editingStaffId && (
                  <button 
                    onClick={cancelEditStaff}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    <X size={14} />
                    Cancel Edit
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <input 
                  type="text"
                  value={newItems.staff.staff_id}
                  onChange={e => setNewItems({...newItems, staff: {...newItems.staff, staff_id: e.target.value}})}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Staff ID (Login ID)"
                />
                <input 
                  type="text"
                  value={newItems.staff.name}
                  onChange={e => setNewItems({...newItems, staff: {...newItems.staff, name: e.target.value}})}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Full Name"
                />
                <input 
                  type="password"
                  value={newItems.staff.password}
                  onChange={e => setNewItems({...newItems, staff: {...newItems.staff, password: e.target.value}})}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Password"
                />
                <select
                  value={newItems.staff.role}
                  onChange={e => setNewItems({...newItems, staff: {...newItems.staff, role: e.target.value}})}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="staff">Staff</option>
                  <option value="accountant">Accountant</option>
                  <option value="admin">Admin</option>
                </select>
                <button 
                  onClick={addStaff}
                  className="bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors"
                >
                  {editingStaffId ? 'Update Staff' : 'Register Staff'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-800">Staff Directory</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Staff ID</th>
                      <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                      <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
                      <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Password (Admin Only)</th>
                      <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(data.staff || []).map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4 text-sm font-bold text-slate-900">{s.staff_id}</td>
                        <td className="py-4 px-4 text-sm text-slate-600">{s.name}</td>
                        <td className="py-4 px-4">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            s.role === 'admin' ? "bg-red-50 text-red-600" : 
                            s.role === 'accountant' ? "bg-emerald-50 text-emerald-600" :
                            "bg-blue-50 text-blue-600"
                          )}>
                            {s.role}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-slate-500">
                              {showPasswords[s.id] ? s.password : '••••••••'}
                            </span>
                            <button 
                              onClick={() => setShowPasswords(prev => ({...prev, [s.id]: !prev[s.id]}))}
                              className="p-1 hover:bg-slate-200 rounded text-slate-400"
                            >
                              {showPasswords[s.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => startEditStaff(s)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Staff"
                            >
                              <Edit3 size={16} />
                            </button>
                            {s.role !== 'admin' && (
                              <button 
                                onClick={() => deleteStaff(s.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Staff"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeSubTab === 'database' && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600" />
                Database Connection & Security Status
              </h4>
              <button 
                onClick={checkHealth}
                disabled={checkingHealth}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
              >
                {checkingHealth ? 'Checking...' : 'Refresh Status'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(health).map(([table, statusObj]) => {
                const status = statusObj as { readable: boolean; readError: string | null };
                return (
                  <div key={table} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-700 capitalize">{table.replace('_', ' ')}</span>
                      {!status.readable && (
                        <p className="text-[10px] text-red-500 mt-1">{status.readError}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        status.readable ? "bg-emerald-500" : "bg-red-500"
                      )} />
                      <span className="text-xs font-medium text-slate-500">
                        {status.readable ? 'Accessible' : 'Blocked (RLS)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl space-y-4">
              <h5 className="font-bold text-amber-800 flex items-center gap-2">
                <PlusCircle size={18} />
                How to fix "Blocked (RLS)" issues
              </h5>
              <p className="text-sm text-amber-700 leading-relaxed">
                If any table shows as <strong>Blocked (RLS)</strong>, it means Supabase is preventing the application from reading or writing data. 
                This usually happens when Row-Level Security is enabled without the correct policies.
              </p>
              <div className="bg-white/50 p-4 rounded-xl space-y-2">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Run this in your Supabase SQL Editor:</p>
                <code className="block text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                  ALTER TABLE branches DISABLE ROW LEVEL SECURITY;<br />
                  ALTER TABLE semesters DISABLE ROW LEVEL SECURITY;<br />
                  ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;<br />
                  ALTER TABLE students DISABLE ROW LEVEL SECURITY;
                </code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
