import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  UserPlus, 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  Eye,
  FileSpreadsheet,
  FileText,
  X,
  ChevronDown,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, FeePlan, Branch, Semester, Session } from '../types';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function StudentDirectory() {
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<FeePlan[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    plan: 'all',
    branch: 'all',
    semester: 'all'
  });

  const [newStudent, setNewStudent] = useState({
    name: '',
    guardian_name: '',
    roll_no: '',
    phone: '',
    plan_id: '',
    branch_id: '',
    semester_id: '',
    session_id: ''
  });

  const fetchData = () => {
    Promise.all([
      fetch('/api/students').then(res => res.json()),
      fetch('/api/fee-plans').then(res => res.json()),
      fetch('/api/settings').then(res => res.json())
    ]).then(([studentsData, plansData, settingsData]) => {
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setBranches(settingsData?.branches || []);
      setSemesters(settingsData?.semesters || []);
      setSessions(settingsData?.sessions || []);
    }).catch(err => {
      console.error("fetchData error:", err);
      setStudents([]);
      setPlans([]);
      setBranches([]);
      setSemesters([]);
      setSessions([]);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
    const method = editingStudent ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStudent)
    }).then(res => {
      if (res.ok) {
        fetchData();
        setIsModalOpen(false);
        setEditingStudent(null);
        setNewStudent({
          name: '', guardian_name: '', roll_no: '', phone: '',
          plan_id: '', branch_id: '', semester_id: '', session_id: ''
        });
      } else {
        alert(editingStudent ? 'Update failed' : 'Roll Number already exists');
      }
    });
  };

  const startEdit = (student: Student) => {
    setEditingStudent(student);
    setNewStudent({
      name: student.name,
      guardian_name: student.guardian_name,
      roll_no: student.roll_no,
      phone: student.phone,
      plan_id: (student.plan_id || '').toString(),
      branch_id: (student.branch_id || '').toString(),
      semester_id: (student.semester_id || '').toString(),
      session_id: (student.session_id || '').toString()
    });
    setIsModalOpen(true);
  };

  const startView = (student: Student) => {
    setViewingStudent(student);
    setIsViewModalOpen(true);
  };

  const deleteStudent = (id: number) => {
    if (confirm('Are you sure? This will delete all records for this student.')) {
      fetch(`/api/students/${id}`, { method: 'DELETE' }).then(fetchData);
    }
  };

  const filteredStudents = (students || []).filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.roll_no.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search);
    
    const matchesPlan = filters.plan === 'all' || s.plan_id === Number(filters.plan);
    const matchesBranch = filters.branch === 'all' || s.branch_id === Number(filters.branch);
    const matchesSemester = filters.semester === 'all' || s.semester_id === Number(filters.semester);

    return matchesSearch && matchesPlan && matchesBranch && matchesSemester;
  });

  const exportExcel = () => {
    const data = filteredStudents.map(s => ({
      Name: s.name,
      'Roll No': s.roll_no,
      Guardian: s.guardian_name,
      Phone: s.phone,
      Program: s.plan_name,
      Branch: s.branch_name,
      Semester: s.semester_name,
      Session: s.session_name
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Student_Directory.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Student Directory", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Name', 'Roll No', 'Program', 'Branch', 'Phone']],
      body: filteredStudents.map(s => [s.name, s.roll_no, s.plan_name, s.branch_name, s.phone]),
    });
    doc.save("Student_Directory.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Student Directory</h3>
          <p className="text-slate-500 text-sm">Manage enrollment and student profiles</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <FileSpreadsheet size={18} className="text-emerald-600" />
            Export Excel
          </button>
          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <FileText size={18} className="text-violet-600" />
            PDF Report
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
          >
            <UserPlus size={18} />
            Enroll New
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name, roll no or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
          />
        </div>
        
        <select 
          value={filters.plan}
          onChange={e => setFilters({...filters, plan: e.target.value})}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[140px]"
        >
          <option value="all">All Programs</option>
          {(plans || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select 
          value={filters.branch}
          onChange={e => setFilters({...filters, branch: e.target.value})}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[140px]"
        >
          <option value="all">All Branches</option>
          {(branches || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <select 
          value={filters.semester}
          onChange={e => setFilters({...filters, semester: e.target.value})}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[140px]"
        >
          <option value="all">All Semesters</option>
          {(semesters || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Info</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guardian Info</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Program & Cohort</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{student.name}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ROLL: {student.roll_no}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-semibold text-slate-700">{student.guardian_name}</p>
                    <p className="text-xs text-slate-400">{student.phone}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-bold text-slate-800">{student.plan_name}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">{student.branch_name}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">{student.semester_name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startView(student)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => startEdit(student)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteStudent(student.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Users size={48} className="mb-4 opacity-20" />
                      <p className="font-medium">No students found matching your criteria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enroll Modal */}
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
                  {editingStudent ? 'Edit Student Profile' : 'Enroll New Student'}
                </h3>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingStudent(null);
                    setNewStudent({
                      name: '', guardian_name: '', roll_no: '', phone: '',
                      plan_id: '', branch_id: '', semester_id: '', session_id: ''
                    });
                  }}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEnroll} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <input 
                      required
                      type="text"
                      value={newStudent.name}
                      onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="e.g. Rahul Singh"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guardian Name</label>
                    <input 
                      required
                      type="text"
                      value={newStudent.guardian_name}
                      onChange={e => setNewStudent({...newStudent, guardian_name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="Father's Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Program (Course)</label>
                    <select 
                      required
                      value={newStudent.plan_id}
                      onChange={e => setNewStudent({...newStudent, plan_id: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                    >
                      <option value="">Select Plan</option>
                      {(plans || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch</label>
                    <select 
                      required
                      value={newStudent.branch_id}
                      onChange={e => setNewStudent({...newStudent, branch_id: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                    >
                      <option value="">Select Branch</option>
                      {(branches || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Semester</label>
                    <select 
                      required
                      value={newStudent.semester_id}
                      onChange={e => setNewStudent({...newStudent, semester_id: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                    >
                      <option value="">Select Sem</option>
                      {(semesters || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Session</label>
                    <select 
                      required
                      value={newStudent.session_id}
                      onChange={e => setNewStudent({...newStudent, session_id: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                    >
                      <option value="">Select Session</option>
                      {(sessions || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Roll Number / ID</label>
                    <input 
                      required
                      type="text"
                      value={newStudent.roll_no}
                      onChange={e => setNewStudent({...newStudent, roll_no: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="e.g. 2024CS001"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Phone</label>
                    <input 
                      required
                      type="tel"
                      value={newStudent.phone}
                      onChange={e => setNewStudent({...newStudent, phone: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="10-digit mobile"
                    />
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    Complete Enrollment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {isViewModalOpen && viewingStudent && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsViewModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white font-black text-2xl">
                    {viewingStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{viewingStudent.name}</h3>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">ROLL: {viewingStudent.roll_no}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsViewModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guardian Name</p>
                    <p className="font-bold text-slate-800">{viewingStudent.guardian_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Phone</p>
                    <p className="font-bold text-slate-800">{viewingStudent.phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Program / Course</p>
                    <p className="font-bold text-slate-800">{viewingStudent.plan_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Branch</p>
                    <p className="font-bold text-slate-800">{viewingStudent.branch_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Semester</p>
                    <p className="font-bold text-slate-800">{viewingStudent.semester_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Session</p>
                    <p className="font-bold text-slate-800">{viewingStudent.session_name}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={() => setIsViewModalOpen(false)}
                    className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Close Profile
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
