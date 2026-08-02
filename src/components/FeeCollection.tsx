import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  CreditCard, 
  Smartphone, 
  Printer, 
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ArrowRight,
  FileDown,
  History,
  RefreshCw,
  Edit3,
  Clock,
  Eye
} from 'lucide-react';
import { safeFetchJson } from '../utils/api';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Transaction, OrgSettings } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import Receipt from './Receipt';

export default function FeeCollection() {
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastTx, setLastTx] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [recentTxs, setRecentTxs] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState('');

  const [payment, setPayment] = useState({
    amount: '',
    payment_mode: 'UPI Digital',
    transaction_id: '',
    academic_term: '',
    course: '',
    branch: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    bank_account: ''
  });

  const receiptRef = useRef<HTMLDivElement>(null);

  const loadRecentTransactions = async () => {
    try {
      const data = await safeFetchJson('/api/transactions', undefined, []);
      if (Array.isArray(data)) {
        setRecentTxs(data);
      }
    } catch (err) {
      console.error('Failed to load recent transactions:', err);
    }
  };

  useEffect(() => {
    safeFetchJson('/api/students', undefined, [])
      .then(data => Array.isArray(data) ? setStudents(data) : setStudents([]));
    
    safeFetchJson('/api/settings', undefined, null)
      .then(data => {
        if (data) {
          setSettings(data.settings);
          setBranches(data.branches || []);
          setSemesters(data.semesters || []);
        }
      });

    loadRecentTransactions();
  }, []);

  const handleSavePayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStudent) return;
    setError(null);

    const payload: any = {
      student_id: selectedStudent.id,
      ...payment
    };

    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message || 'Failed to save payment. Please try again.');
      return;
    }

    const savedTxnId = data.transaction_id || payment.transaction_id;

    setLastTx({
      id: data.id || Math.floor(Math.random() * 1000),
      ...payment,
      transaction_id: savedTxnId,
      amount: Number(payment.amount),
      student_name: selectedStudent.name,
      roll_no: selectedStudent.roll_no,
      guardian_name: selectedStudent.guardian_name,
      branch_name: payment.branch,
      semester_name: payment.course,
      created_at: new Date().toISOString()
    } as Transaction);

    setIsSuccess(true);
    setIsModalOpen(false);
    loadRecentTransactions();
    setPayment({ 
      amount: '', 
      payment_mode: 'UPI Digital', 
      transaction_id: '', 
      academic_term: '', 
      course: '', 
      branch: '',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      bank_account: ''
    });
  };

  const shareWhatsApp = () => {
    if (!lastTx) return;
    const phone = selectedStudent?.phone || (lastTx as any).phone || (lastTx as any).student_phone || '';
    const cleanPhone = phone.toString().replace(/[^0-9]/g, '');
    const orgName = settings?.name || 'MAYA GROUP OF INSTITUTIONS';

    const receiptNo = `RC-${lastTx.id < 100 ? 800 + lastTx.id : lastTx.id}`;
    const amountPaid = (lastTx.amount || 0).toFixed(2);
    const txDateStr = lastTx.created_at ? format(new Date(lastTx.created_at), 'dd-MM-yyyy HH:mm') : format(new Date(), 'dd-MM-yyyy HH:mm');

    const msg = `🚩 *PAYMENT RECEIPT*\n*${orgName.toUpperCase()}*\n\nReceipt No: ${receiptNo}\nDate: ${txDateStr}\n\n*Student Details:*\nName: ${cleanVal(lastTx.student_name)}\nRoll No: ${cleanVal(lastTx.roll_no)}\nFather's Name: ${cleanVal(lastTx.guardian_name || 'N/A')}\nBranch: ${cleanVal(lastTx.branch_name || lastTx.branch || 'N/A')}\nSemester: ${cleanVal(lastTx.semester_name || lastTx.course || 'N/A')}\nSession: ${cleanVal(lastTx.academic_term || '2026-27')}\n\n*Payment Details:*\nAmount Paid: ₹${amountPaid}\nPayment Mode: ${cleanVal(lastTx.payment_mode)}\nTransaction ID: ${cleanVal(lastTx.transaction_id || 'N/A')}\n\nThank you for your payment!\nSoftware Developed by Digital Communique Private Limited`;

    const encodedMsg = encodeURIComponent(msg);
    const targetPhone = cleanPhone ? (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone) : '';
    
    if (targetPhone) {
      window.open(`https://wa.me/${targetPhone}?text=${encodedMsg}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
    }
  };

  const handlePrint = () => {
    const element = document.getElementById('receipt-content');
    if (!element) {
      window.print();
      return;
    }
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Receipt - ${lastTx?.id || ''}</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-white p-4">
            ${element.outerHTML}
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 600);
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
    } else {
      window.print();
    }
  };

  const downloadPDF = async () => {
    const element = document.getElementById('receipt-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const pdfName = `Receipt_${lastTx?.id || 'Fee'}.pdf`;
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = pdfName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err: any) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF: ' + (err.message || err));
    }
  };

  const filteredStudents = (students || []).filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(search.toLowerCase()) || 
                         (s.roll_no || '').toLowerCase().includes(search.toLowerCase());
    const matchesBranch = !filterBranch || s.branch_name === filterBranch;
    const matchesCourse = !filterCourse || s.semester_name === filterCourse;
    return matchesSearch && matchesBranch && matchesCourse;
  });

  const formatTxDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const month = d.getMonth() + 1;
      const date = d.getDate();
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const seconds = d.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'AM' : 'PM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${month}/${date}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;
    } catch (e) {
      return dateStr;
    }
  };

  const cleanVal = (val: any) => val ? val.toString().replace(/^\[Auto\]\s*/, '') : '';

  const viewHistoryReceipt = (tx: any) => {
    setLastTx({
      id: tx.id,
      student_id: tx.student_id || 0,
      amount: Number(tx.amount || 0),
      payment_mode: cleanVal(tx.payment_mode || 'UPI Digital'),
      transaction_id: cleanVal(tx.transaction_id || ''),
      academic_term: cleanVal(tx.academic_term || ''),
      course: cleanVal(tx.course || ''),
      branch: cleanVal(tx.branch || ''),
      transaction_date: tx.transaction_date || format(new Date(), 'yyyy-MM-dd'),
      bank_account: cleanVal(tx.bank_account || ''),
      student_name: cleanVal(tx.student_name || tx.student?.name || 'Student'),
      roll_no: cleanVal(tx.roll_no || tx.student?.roll_no || ''),
      guardian_name: cleanVal(tx.guardian_name || tx.student?.guardian_name || ''),
      branch_name: cleanVal(tx.branch_name || tx.branch || ''),
      semester_name: cleanVal(tx.semester_name || tx.academic_term || ''),
      created_at: tx.created_at || new Date().toISOString(),
      is_edited: tx.is_edited,
      edited_by: tx.edited_by,
      edited_at: tx.edited_at,
      previous_data: tx.previous_data
    } as unknown as Transaction);
    setIsSuccess(true);
  };

  const [editingTx, setEditingTx] = useState<any>(null);
  const [isEditTxModalOpen, setIsEditTxModalOpen] = useState(false);
  const [viewingAuditTx, setViewingAuditTx] = useState<any>(null);
  const [editTxForm, setEditTxForm] = useState({
    student_id: '',
    amount: '',
    payment_mode: 'UPI Digital',
    transaction_id: '',
    academic_term: '',
    transaction_date: '',
    bank_account: ''
  });

  const startEditTx = (tx: any) => {
    setEditingTx(tx);
    setEditTxForm({
      student_id: (tx.student_id || '').toString(),
      amount: (tx.amount || '').toString(),
      payment_mode: cleanVal(tx.payment_mode || 'UPI Digital'),
      transaction_id: cleanVal(tx.transaction_id || ''),
      academic_term: cleanVal(tx.academic_term || ''),
      transaction_date: tx.transaction_date || format(new Date(), 'yyyy-MM-dd'),
      bank_account: cleanVal(tx.bank_account || '')
    });
    setIsEditTxModalOpen(true);
  };

  const handleSaveTxEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    try {
      const res = await fetch(`/api/transactions/${editingTx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: Number(editTxForm.student_id),
          amount: Number(editTxForm.amount),
          payment_mode: editTxForm.payment_mode,
          transaction_id: editTxForm.transaction_id,
          academic_term: editTxForm.academic_term,
          transaction_date: editTxForm.transaction_date,
          bank_account: editTxForm.bank_account,
          edited_by: 'Accountant'
        })
      });

      if (res.ok) {
        setIsEditTxModalOpen(false);
        setEditingTx(null);
        loadRecentTransactions();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to edit transaction');
      }
    } catch (err) {
      console.error("Edit transaction failed:", err);
      alert('Failed to save transaction edit.');
    }
  };

  const filteredRecentTxs = (recentTxs || []).filter(tx => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    const name = (tx.student_name || tx.student?.name || '').toLowerCase();
    const roll = (tx.roll_no || tx.student?.roll_no || '').toLowerCase();
    const txId = (tx.transaction_id || '').toLowerCase();
    const mode = (tx.payment_mode || '').toLowerCase();
    return name.includes(q) || roll.includes(q) || txId.includes(q) || mode.includes(q);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {!isSuccess ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-5 sm:p-8 bg-slate-900 text-white">
            <h3 className="text-xl sm:text-2xl font-bold">Record Payment</h3>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">Search student and record payment details</p>
          </div>

          <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter by Branch</label>
                <select 
                  value={filterBranch}
                  onChange={e => setFilterBranch(e.target.value)}
                  className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white text-sm"
                >
                  <option value="">All Branches</option>
                  {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter by Course</label>
                <select 
                  value={filterCourse}
                  onChange={e => setFilterCourse(e.target.value)}
                  className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white text-sm"
                >
                  <option value="">All Courses</option>
                  {semesters.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 md:col-span-1 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Student</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Name or Roll No..."
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      setSelectedStudent(null);
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-medium"
                  />
                  
                  {(search || filterBranch || filterCourse) && !selectedStudent && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-50">
                      {filteredStudents.map(s => (
                        <button 
                          key={s.id}
                          onClick={() => {
                            setSelectedStudent(s);
                            setSearch(s.name);
                            setPayment({
                              ...payment,
                              course: s.semester_name || '',
                              branch: s.branch_name || ''
                            });
                          }}
                          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                        >
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{s.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">ROLL: {s.roll_no} • {s.branch_name} • {s.semester_name}</p>
                          </div>
                          <ArrowRight size={16} className="text-slate-300" />
                        </button>
                      ))}
                      {filteredStudents.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-sm">No students found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedStudent && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Selected Student</p>
                    <p className="text-lg font-bold text-slate-900">{selectedStudent.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Dues</p>
                  <p className="text-lg font-black text-slate-900">₹{selectedStudent.plan_name ? 'Pending' : '0'}</p>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700"
              >
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-sm font-bold">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSavePayment} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Course</label>
                <input 
                  readOnly
                  type="text"
                  value={payment.course}
                  className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 font-medium outline-none cursor-not-allowed"
                  placeholder="Course Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch</label>
                <input 
                  readOnly
                  type="text"
                  value={payment.branch}
                  className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 font-medium outline-none cursor-not-allowed"
                  placeholder="Branch Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount (₹)</label>
                <input 
                  required
                  type="number"
                  value={payment.amount}
                  onChange={e => setPayment({...payment, amount: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-lg font-bold"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Term</label>
                <input 
                  required
                  type="text"
                  value={payment.academic_term}
                  onChange={e => setPayment({...payment, academic_term: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="e.g. Sem I / 2024"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Mode</label>
                <select 
                  value={payment.payment_mode}
                  onChange={e => setPayment({...payment, payment_mode: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                >
                  <option>UPI Digital</option>
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaction ID</label>
                <input 
                  required={payment.payment_mode !== 'Cash'}
                  type="text"
                  value={payment.transaction_id}
                  onChange={e => setPayment({...payment, transaction_id: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder={payment.payment_mode === 'Cash' ? 'Optional for Cash' : 'Mandatory for Digital'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaction Date</label>
                <input 
                  required
                  type="date"
                  value={payment.transaction_date}
                  onChange={e => setPayment({...payment, transaction_date: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bank Account Number</label>
                <input 
                  type="text"
                  value={payment.bank_account}
                  onChange={e => setPayment({...payment, bank_account: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="e.g. XXXX XXXX 1234"
                />
              </div>

              <div className="md:col-span-2 pt-6">
                <button 
                  type="submit"
                  disabled={!selectedStudent}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CreditCard size={20} />
                  Save Payment & Generate Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-8"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden print:shadow-none print:border-none">
            <div className="p-8 bg-emerald-600 text-white text-center print:bg-white print:text-slate-900 print:border-b print:border-slate-200">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 print:hidden">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-2xl font-bold">Payment Successful</h3>
              <p className="text-emerald-100 text-sm opacity-80 print:hidden">Transaction recorded successfully</p>
            </div>

            {lastTx && <Receipt transaction={lastTx} settings={settings} />}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 print:hidden">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-lg"
            >
              <Printer size={18} />
              Print
            </button>
            <button 
              onClick={downloadPDF}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-lg"
            >
              <FileDown size={18} />
              PDF
            </button>
            <button 
              onClick={shareWhatsApp}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
              <MessageCircle size={18} />
              WhatsApp
            </button>
            <button 
              onClick={() => {
                setIsSuccess(false);
                setSelectedStudent(null);
                setSearch('');
              }}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
            >
              New Collection
            </button>
          </div>
        </motion.div>
      )}

      {/* Recent Transaction History */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 md:p-8 space-y-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <History size={20} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Recent Transaction History</h3>
            </div>
            <p className="text-slate-500 text-xs mt-1">Live overview of recent fee collections recorded in the system</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative min-w-[220px] flex-1 md:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Search transactions..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
              />
            </div>
            <button 
              onClick={loadRecentTransactions}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              title="Refresh transaction list"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs">
                <th className="py-3 px-4 font-semibold">Receipt / ID</th>
                <th className="py-3 px-4 font-semibold">Date & Time</th>
                <th className="py-3 px-4 font-semibold">Student</th>
                <th className="py-3 px-4 font-semibold">Txn ID / Mode</th>
                <th className="py-3 px-4 font-semibold">Term</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRecentTxs.slice(0, 15).map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    <div>#DC-{1000 + tx.id}</div>
                    {tx.is_edited && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-amber-500 text-white rounded text-[9px] font-bold uppercase tracking-wider">
                        Edited by {tx.edited_by || 'Accountant'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {formatTxDate(tx.created_at || tx.transaction_date)}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800">{cleanVal(tx.student_name || tx.student?.name || 'Student')}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{cleanVal(tx.roll_no || tx.student?.roll_no || '')}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-mono text-slate-700 font-semibold">{cleanVal(tx.transaction_id || 'N/A')}</p>
                    <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold mt-0.5">
                      {cleanVal(tx.payment_mode || 'UPI Digital')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {cleanVal(tx.academic_term || '-')}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-emerald-600 text-sm">
                    ₹{Number(tx.amount || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button 
                        onClick={() => viewHistoryReceipt(tx)}
                        className="bg-[#17A2B8] hover:bg-[#138496] text-white px-2.5 py-1.2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                        title="Print / View Receipt"
                      >
                        <Printer size={12} />
                        Receipt
                      </button>

                      <button 
                        onClick={() => startEditTx(tx)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                        title="Edit Transaction"
                      >
                        <Edit3 size={12} />
                        Edit
                      </button>

                      {tx.is_edited && (
                        <button 
                          onClick={() => setViewingAuditTx(tx)}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-2 py-1.2 rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                          title="View Before & After Editing"
                        >
                          <Clock size={11} />
                          Before & After
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecentTxs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No recent transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Transaction Modal */}
      <AnimatePresence>
        {isEditTxModalOpen && editingTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditTxModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Edit Transaction #DC-{1000 + editingTx.id}</h3>
                  <p className="text-xs text-slate-400">Modifications will be logged as Edited by Accountant</p>
                </div>
                <button 
                  onClick={() => setIsEditTxModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveTxEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Student</label>
                  <select 
                    value={editTxForm.student_id}
                    onChange={e => setEditTxForm({ ...editTxForm, student_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold"
                    required
                  >
                    <option value="">Choose Student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {cleanVal(s.name)} (Roll: {cleanVal(s.roll_no)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount (₹)</label>
                    <input 
                      type="number"
                      value={editTxForm.amount}
                      onChange={e => setEditTxForm({ ...editTxForm, amount: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Mode</label>
                    <select 
                      value={editTxForm.payment_mode}
                      onChange={e => setEditTxForm({ ...editTxForm, payment_mode: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold"
                    >
                      <option value="UPI Digital">UPI Digital</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="DD">Demand Draft (DD)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaction ID / UPI Ref No</label>
                  <input 
                    type="text"
                    value={editTxForm.transaction_id}
                    onChange={e => setEditTxForm({ ...editTxForm, transaction_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                    placeholder="Enter UPI Ref No or Txn Hash"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Term / Sem</label>
                    <input 
                      type="text"
                      value={editTxForm.academic_term}
                      onChange={e => setEditTxForm({ ...editTxForm, academic_term: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      placeholder="e.g. Semester 1"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaction Date</label>
                    <input 
                      type="date"
                      value={editTxForm.transaction_date}
                      onChange={e => setEditTxForm({ ...editTxForm, transaction_date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bank Account</label>
                  <input 
                    type="text"
                    value={editTxForm.bank_account}
                    onChange={e => setEditTxForm({ ...editTxForm, bank_account: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    placeholder="Deposit Bank Account"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsEditTxModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-md transition-all"
                  >
                    Save & Mark as Edited
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  Below is the step-by-step comparison showing transaction details <span className="text-rose-600 font-bold">before editing</span> and <span className="text-emerald-600 font-bold">after editing</span>:
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

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 0; }
          body * { visibility: hidden; }
          #receipt-content, #receipt-content * { visibility: visible; }
          #receipt-content {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            padding: 40px;
            margin: 0;
            background: white;
            z-index: 9999;
          }
        }
      `}} />
    </div>
  );
}
