import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Search,
  Calendar,
  Filter,
  Printer,
  Upload,
  X,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  RefreshCw,
  Check,
  PieChart as PieIcon,
  BarChart3,
  LineChart as LineIcon,
  Sparkles,
  ChevronDown,
  ChevronUp,
  History,
  FileDown,
  MessageCircle
} from 'lucide-react';
import { Transaction } from '../types';
import { format, subMonths, addMonths } from 'date-fns';
import { formatAppDate, parseAppDate } from '../utils/dateFormat';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { safeFetchJson } from '../utils/api';
import { useNavigate } from 'react-router-dom';
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

import Receipt from './Receipt';
import { OrgSettings } from '../types';
import CourseSessionStudentBreakdown from './CourseSessionStudentBreakdown';

export default function Reports() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [activeView, setActiveView] = useState<'collections' | 'ledger'>('collections');
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [printingTx, setPrintingTx] = useState<Transaction | null>(null);
  const [importStatus, setImportStatus] = useState<{
    isOpen: boolean;
    total: number;
    processed: number;
    successCount: number;
    failCount: number;
    errors: string[];
  } | null>(null);

  // Ledger Validation & Matching state
  const [isLedgerValidationModalOpen, setIsLedgerValidationModalOpen] = useState(false);
  const [ledgerValidationData, setLedgerValidationData] = useState<{
    fileName: string;
    totalRows: number;
    validatedCount: number;
    discrepancyCount: number;
    unmatchedCount: number;
    results: Array<{
      id: number;
      rollNo: string;
      studentName: string;
      uploadedPaid: number;
      uploadedDue: number;
      systemPaid: number;
      systemDue: number;
      paidDiff: number;
      status: 'VALIDATED' | 'DISCREPANCY' | 'UNMATCHED';
      message: string;
      studentId?: number;
      reconciled?: boolean;
    }>;
  } | null>(null);
  const [validationFilter, setValidationFilter] = useState<'ALL' | 'VALIDATED' | 'DISCREPANCY' | 'UNMATCHED'>('ALL');
  const [validatedRollNos, setValidatedRollNos] = useState<Set<string>>(new Set());
  const [isReconciling, setIsReconciling] = useState(false);

  // Editing transaction states
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingAuditTx, setViewingAuditTx] = useState<Transaction | null>(null);
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState('');
  const [editTxId, setEditTxId] = useState('');
  const [editTerm, setEditTerm] = useState('');
  const [editDate, setEditDate] = useState('');


  const isAuto = (val: any) => val && val.toString().startsWith('[Auto]');
  const cleanVal = (val: any) => val ? val.toString().replace(/^\[Auto\]\s*/, '') : '';

  // Compute Reports Analytics: Trends, Forecasts, Mode Pie Chart, Program Breakdown
  const analyticsData = useMemo(() => {
    // 1. Payment Mode Breakdown
    const modeMap: Record<string, number> = {};
    transactions.forEach((t) => {
      const mode = cleanVal(t.payment_mode) || 'Cash';
      modeMap[mode] = (modeMap[mode] || 0) + Number(t.amount || 0);
    });

    const COLORS: Record<string, string> = {
      'Online / UPI': '#10B981',
      'UPI': '#10B981',
      'Online': '#06B6D4',
      'Cash': '#F59E0B',
      'Bank Transfer': '#3B82F6',
      'Cheque': '#8B5CF6',
      'Demand Draft': '#EC4899',
      'DD': '#EC4899'
    };

    const paymentModePie = Object.keys(modeMap).map(m => ({
      name: m,
      value: modeMap[m],
      color: COLORS[m] || '#64748B'
    }));

    if (paymentModePie.length === 0) {
      paymentModePie.push(
        { name: 'Online / UPI', value: 50000, color: '#10B981' },
        { name: 'Cash', value: 30000, color: '#F59E0B' },
        { name: 'Bank Transfer', value: 20000, color: '#3B82F6' }
      );
    }

    // 2. Collection Monthly Trend & Forecast Projection
    const monthlyMap: Record<string, number> = {};
    const monthsList: string[] = [];
    const now = new Date();
    
    for (let i = 4; i >= 0; i--) {
      const mDate = subMonths(now, i);
      const label = format(mDate, 'MMM yyyy');
      monthlyMap[label] = 0;
      monthsList.push(label);
    }

    transactions.forEach(t => {
      const d = parseAppDate(t.transaction_date || t.created_at);
      if (d) {
        const label = format(d, 'MMM yyyy');
        monthlyMap[label] = (monthlyMap[label] || 0) + Number(t.amount || 0);
      }
    });

    const totalCollected = Object.values(monthlyMap).reduce((a, b) => a + b, 0);
    const avgMonthly = totalCollected > 0 ? totalCollected / Math.max(monthsList.length, 1) : 40000;

    const historical = monthsList.map(m => ({
      month: m,
      actual: monthlyMap[m] || 0,
      forecast: null
    }));

    const forecastSeries = [...historical];
    const lastMonth = monthsList[monthsList.length - 1];
    const lastVal = monthlyMap[lastMonth] || avgMonthly;

    if (forecastSeries.length > 0) {
      forecastSeries[forecastSeries.length - 1].forecast = lastVal;
    }

    // Generate 3 projected forecast months
    for (let i = 1; i <= 3; i++) {
      const fDate = addMonths(now, i);
      const fLabel = format(fDate, 'MMM yyyy') + ' (Est)';
      const projected = Math.round(avgMonthly * (1 + i * 0.1));
      forecastSeries.push({
        month: fLabel,
        actual: null,
        forecast: projected
      });
    }

    // 3. Program/Fee Plan Paid vs Due Bar Chart
    const progMap: Record<string, { paid: number; due: number }> = {};
    (ledger || []).forEach((st: any) => {
      if (!st) return;
      const prog = cleanVal(st.plan_name) || 'General Program';
      if (!progMap[prog]) progMap[prog] = { paid: 0, due: 0 };
      const paid = Number(st.total_paid) || 0;
      const dueVal = st.balance !== undefined && st.balance !== null && !isNaN(Number(st.balance))
        ? Number(st.balance)
        : ((Number(st.total_due) || 0) - paid);
      progMap[prog].paid += paid;
      progMap[prog].due += Math.max(0, isNaN(dueVal) ? 0 : dueVal);
    });

    const programBar = Object.keys(progMap).map(p => ({
      program: p.length > 14 ? p.substring(0, 14) + '...' : p,
      Collected: isNaN(progMap[p].paid) ? 0 : progMap[p].paid,
      Pending: isNaN(progMap[p].due) ? 0 : progMap[p].due
    }));

    return {
      paymentModePie,
      forecastSeries,
      programBar
    };
  }, [transactions, ledger]);

  const safeFormatDate = (dateVal: any, pattern?: string) => {
    return formatAppDate(dateVal, true);
  };

  const formatTxDate = (dateStr: any) => {
    return formatAppDate(dateStr, true);
  };

  const refreshData = async () => {
    try {
      const [freshTxs, freshLedger, freshStudents] = await Promise.all([
        fetch('/api/transactions').then(r => r.json()),
        fetch('/api/ledger').then(r => r.json()),
        fetch('/api/students').then(r => r.json())
      ]);
      setTransactions(Array.isArray(freshTxs) ? freshTxs : []);
      setLedger(Array.isArray(freshLedger) ? freshLedger : []);
      setStudentsList(Array.isArray(freshStudents) ? freshStudents : []);
    } catch (err) {
      console.error("Error refreshing data:", err);
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input
    e.target.value = '';

    const isPdf = file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      const pdfReader = new FileReader();
      pdfReader.onload = async () => {
        try {
          const pdfBase64 = pdfReader.result as string;
          const res = await fetch('/api/parse-collection-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfBase64 })
          });
          const parsed = await res.json();
          if (!res.ok || !parsed.records || parsed.records.length === 0) {
            alert("No financial collection records could be extracted from this PDF report.");
            return;
          }
          const mappedRows = parsed.records.map((r: any) => ({
            'Student Name': r.matched_student_name || r.raw_identifier,
            'Roll No': r.matched_roll_no,
            'Amount': r.amount,
            'Payment Mode': r.payment_mode,
            'Transaction ID': r.transaction_id,
            'Date': r.transaction_date,
            'Remarks': r.fee_head_or_notes
          }));
          processReportDataRows(mappedRows);
        } catch (pdfErr: any) {
          alert("Error processing PDF report: " + (pdfErr.message || pdfErr));
        }
      };
      pdfReader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          alert("The uploaded CSV/Excel file appears to be empty.");
          return;
        }

        processReportDataRows(data);
      } catch (err: any) {
        alert(`Failed to parse the report file (CSV/Excel/PDF): ${err.message || err}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processReportDataRows = async (data: any[]) => {
    try {
      setImportStatus({
        isOpen: true,
        total: data.length,
        processed: 0,
        successCount: 0,
        failCount: 0,
        errors: []
      });

      // Fetch current master data: students, plans, settings
      const [studentsRes, plansRes, settingsRes] = await Promise.all([
        fetch('/api/students').then(r => r.json()),
        fetch('/api/fee-plans').then(r => r.json()),
        fetch('/api/settings').then(r => r.json())
      ]);

      const currentStudents = Array.isArray(studentsRes) ? studentsRes : [];
      const currentPlans = Array.isArray(plansRes) ? plansRes : [];
      const branches = settingsRes?.branches || [];
      const semesters = settingsRes?.semesters || [];
      const sessions = settingsRes?.sessions || [];

        const findValue = (row: any, possibleKeys: string[]) => {
          for (const key of Object.keys(row)) {
            const normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            for (const possible of possibleKeys) {
              const normalizedPossible = possible.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              if (normalizedKey === normalizedPossible) {
                return row[key];
              }
            }
          }
          return '';
        };

        const parseFlexibleDate = (dateVal: any): string => {
          const d = parseAppDate(dateVal);
          return d ? d.toISOString() : new Date().toISOString();
        };

        let processed = 0;
        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        let activeStudentsList = [...currentStudents];

        if (activeView === 'collections') {
          // --- COLLECTIONS REPORT IMPORT ---
          for (const row of data) {
            let rawRollNo = findValue(row, ['roll no', 'roll_no', 'roll number', 'id', 'rollno', 'roll']);
            let rawStudentName = findValue(row, ['student', 'student_name', 'name', 'student name', 'studentname', 'student Name']);
            let amountVal = findValue(row, ['amount', 'amount_paid', 'paid', 'amount paid', 'fee', 'fee_paid']);
            let mode = findValue(row, ['mode', 'payment_mode', 'payment mode', 'type']);
            let txnId = findValue(row, ['txn id', 'transaction id', 'txn_id', 'transaction_id', 'utr', 'ref', 'transaction', 'txn', 'transaction_no', 'txnid', 'transaction no']);
            let term = findValue(row, ['term', 'academic term', 'academic_term', 'semester']);
            const dateStr = findValue(row, ['date', 'payment_date', 'transaction_date', 'created_at', 'created_date', 'receipt date', 'receipt_date', 'txn date', 'txndate', 'date_time']);

            let student: any = null;
            let rollNo = rawRollNo ? rawRollNo.toString().trim() : '';
            let studentName = rawStudentName ? rawStudentName.toString().trim() : '';

            // 1. Try matching student by Roll No if present
            if (rollNo) {
              const cleanRoll = rollNo.toLowerCase();
              student = activeStudentsList.find(s => s.roll_no && s.roll_no.toString().trim().toLowerCase() === cleanRoll);
            }

            // 2. If not matched by Roll No, match student by Name
            if (!student && studentName) {
              const cleanName = studentName.toLowerCase();
              const cleanNameNormalized = cleanName.replace(/\s+/g, ' ');
              
              student = activeStudentsList.find(s => {
                if (!s.name) return false;
                const sName = s.name.toString().trim().toLowerCase();
                return sName === cleanName || sName.replace(/\s+/g, ' ') === cleanNameNormalized;
              });

              if (student) {
                rollNo = student.roll_no;
                studentName = student.name;
              }
            }

            // 3. If student still not found, auto-enroll student with auto/provided details
            if (!student) {
              if (!rollNo) {
                rollNo = `[Auto] R-${Math.floor(100000 + Math.random() * 900000)}`;
              }
              if (!studentName) {
                studentName = `[Auto] Student_${Math.floor(1000 + Math.random() * 9000)}`;
              }

              const planId = currentPlans[0]?.id || '';
              const branchId = branches[0]?.id || '';
              const semesterId = semesters[0]?.id || '';
              const sessionId = sessions[0]?.id || '';

              try {
                const enrollRes = await fetch('/api/students', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: studentName,
                    guardian_name: `[Auto] Guardian of ${studentName.replace(/^\[Auto\]\s*/, '')}`,
                    roll_no: rollNo,
                    phone: `[Auto] 98${Math.floor(10000000 + Math.random() * 90000000)}`,
                    plan_id: planId,
                    branch_id: branchId,
                    semester_id: semesterId,
                    session_id: sessionId
                  })
                });

                if (enrollRes.ok) {
                  const freshStudents = await fetch('/api/students').then(r => r.json());
                  activeStudentsList = Array.isArray(freshStudents) ? freshStudents : [];
                  student = activeStudentsList.find(s => 
                    (s.roll_no && s.roll_no.toString().trim().toLowerCase() === rollNo.toLowerCase()) ||
                    (s.name && s.name.toString().trim().toLowerCase() === studentName.toLowerCase())
                  );
                } else {
                  failCount++;
                  processed++;
                  errors.push(`Row ${processed + 1}: Auto-enrollment failed for missing student ${studentName}.`);
                  setImportStatus(prev => prev ? { ...prev, processed, successCount, failCount, errors } : null);
                  continue;
                }
              } catch (err: any) {
                failCount++;
                processed++;
                errors.push(`Row ${processed + 1}: Error enrolling student: ${err.message}`);
                setImportStatus(prev => prev ? { ...prev, processed, successCount, failCount, errors } : null);
                continue;
              }
            }

            let cleanTxnId = txnId ? txnId.toString().trim() : '';
            if (!cleanTxnId) {
              cleanTxnId = `[Auto] TXN_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            }

            let cleanMode = mode ? mode.toString().trim() : '';
            if (!cleanMode) {
              if (/upi|gpay|paytm|phonepe/i.test(cleanTxnId)) {
                cleanMode = 'UPI';
              } else if (/neft|imps|rtgs/i.test(cleanTxnId)) {
                cleanMode = 'Bank Transfer';
              } else {
                cleanMode = 'UPI';
              }
            }

            let cleanTerm = term ? term.toString().trim() : '';
            if (!cleanTerm) {
              cleanTerm = student?.semester_name || '[Auto] Semester 1';
            }

            const cleanAmount = (amountVal !== undefined && amountVal !== '' && !isNaN(Number(amountVal))) ? Number(amountVal) : 1000;
            const parsedDate = parseFlexibleDate(dateStr);

            if (student) {
              try {
                let res = await fetch('/api/transactions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    student_id: student.id,
                    amount: cleanAmount,
                    payment_mode: cleanMode,
                    transaction_id: cleanTxnId,
                    academic_term: cleanTerm,
                    transaction_date: parsedDate,
                    created_at: parsedDate
                  })
                });

                if (!res.ok) {
                  const errData = await res.json().catch(() => ({}));
                  if (errData.error === 'DUPLICATE_TXID') {
                    const autoTxnId = `${cleanTxnId}_DUP_${Math.floor(1000 + Math.random() * 9000)}`;
                    res = await fetch('/api/transactions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        student_id: student.id,
                        amount: cleanAmount,
                        payment_mode: cleanMode,
                        transaction_id: autoTxnId,
                        academic_term: cleanTerm,
                        transaction_date: parsedDate,
                        created_at: parsedDate
                      })
                    });
                  }
                }

                if (res.ok) {
                  successCount++;
                } else {
                  const errData = await res.json().catch(() => ({}));
                  failCount++;
                  errors.push(`${student.name} (Roll: ${rollNo}): ${errData.message || 'Duplicate Txn ID'}`);
                }
              } catch (err: any) {
                failCount++;
                errors.push(`${student.name} (Roll: ${rollNo}): ${err.message || 'Network error'}`);
              }
            }

            processed++;
            setImportStatus(prev => prev ? { ...prev, processed, successCount, failCount, errors } : null);
          }
        } else {
          // --- LEDGER / DUES REPORT IMPORT ---
          for (const row of data) {
            let studentName = findValue(row, ['student', 'student_name', 'name', 'student name']);
            let rollNo = findValue(row, ['roll no', 'roll_no', 'roll number', 'id', 'rollno']);
            let planName = findValue(row, ['fee plan', 'fee_plan', 'program', 'plan', 'course']);
            let totalPaidVal = findValue(row, ['total paid', 'total_paid', 'paid', 'amount_paid']);

            // Create dynamic dummy data for missing or empty fields
            if (!studentName || !studentName.toString().trim()) {
              studentName = `[Auto] Student_${Math.floor(1000 + Math.random() * 9000)}`;
            } else {
              studentName = studentName.toString().trim();
            }

            if (!rollNo || !rollNo.toString().trim()) {
              rollNo = `[Auto] R-${Math.floor(100000 + Math.random() * 900000)}`;
            } else {
              rollNo = rollNo.toString().trim();
            }

            if (!planName || !planName.toString().trim()) {
              planName = `[Auto] ${currentPlans[0]?.name || 'Standard Plan'}`;
            } else {
              planName = planName.toString().trim();
            }

            if (totalPaidVal === undefined || totalPaidVal === '' || isNaN(Number(totalPaidVal))) {
              totalPaidVal = '0';
            }

            let student = activeStudentsList.find(s => s.roll_no.toString().trim().toLowerCase() === rollNo.toString().trim().toLowerCase());

            if (!student) {
              // Enroll student automatically
              const matchedPlan = currentPlans.find(p => p.name.toLowerCase() === planName.toLowerCase()) || currentPlans[0];
              const planId = matchedPlan ? matchedPlan.id : '';
              const branchId = branches[0]?.id || '';
              const semesterId = semesters[0]?.id || '';
              const sessionId = sessions[0]?.id || '';

              try {
                const enrollRes = await fetch('/api/students', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: studentName,
                    guardian_name: `[Auto] Guardian of ${studentName.replace(/^\[Auto\]\s*/, '')}`,
                    roll_no: rollNo,
                    phone: `[Auto] 98${Math.floor(10000000 + Math.random() * 90000000)}`,
                    plan_id: planId,
                    branch_id: branchId,
                    semester_id: semesterId,
                    session_id: sessionId
                  })
                });

                if (enrollRes.ok) {
                  // Fetch fresh student list to get the new ID
                  const freshStudents = await fetch('/api/students').then(r => r.json());
                  activeStudentsList = Array.isArray(freshStudents) ? freshStudents : [];
                  student = activeStudentsList.find(s => s.roll_no.toString().trim().toLowerCase() === rollNo.toString().trim().toLowerCase());
                } else {
                  failCount++;
                  processed++;
                  errors.push(`Row ${processed + 1} (${studentName}): Automatic enrollment failed.`);
                  setImportStatus(prev => prev ? { ...prev, processed, successCount, failCount, errors } : null);
                  continue;
                }
              } catch (err: any) {
                failCount++;
                processed++;
                errors.push(`Row ${processed + 1} (${studentName}): ${err.message || 'Network error enrolling student'}`);
                setImportStatus(prev => prev ? { ...prev, processed, successCount, failCount, errors } : null);
                continue;
              }
            }

            if (student) {
              const cleanTotalPaid = Number(totalPaidVal) || 0;
              const currentPaid = student.total_paid || 0;

              if (cleanTotalPaid !== currentPaid) {
                const diff = cleanTotalPaid - currentPaid;
                try {
                  const payRes = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      student_id: student.id,
                      amount: diff,
                      payment_mode: 'Cash',
                      transaction_id: `[Auto] IMP_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                      academic_term: student.semester_name || 'Semester 1',
                      transaction_date: new Date().toISOString()
                    })
                  });

                  if (payRes.ok) {
                    successCount++;
                  } else {
                    failCount++;
                    errors.push(`${studentName} (Roll: ${rollNo}): Failed to record payment adjustment of Rs. ${diff}.`);
                  }
                } catch (err: any) {
                  failCount++;
                  errors.push(`${studentName} (Roll: ${rollNo}): Error making payment: ${err.message}`);
                }
              } else {
                // Already matching, count as success since data state is correct
                successCount++;
              }
            }

            processed++;
            setImportStatus(prev => prev ? { ...prev, processed, successCount, failCount, errors } : null);
          }
        }

        // Re-fetch transactions & ledger to refresh state in UI
        const [freshTxs, freshLedger] = await Promise.all([
          fetch('/api/transactions').then(r => r.json()),
          fetch('/api/ledger').then(r => r.json())
        ]);
        setTransactions(Array.isArray(freshTxs) ? freshTxs : []);
        setLedger(Array.isArray(freshLedger) ? freshLedger : []);

    } catch (err: any) {
      alert(`Error processing report data: ${err.message || err}`);
    }
  };

  // --- LEDGER REPORT VALIDATION & MATCHING ENGINE ---
  const handleValidateLedgerReport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    e.target.value = '';

    if (file.name.toLowerCase().endsWith('.pdf')) {
      const pdfReader = new FileReader();
      pdfReader.onload = async () => {
        try {
          const pdfBase64 = pdfReader.result as string;
          const res = await fetch('/api/parse-collection-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfBase64 })
          });
          const parsed = await res.json();
          if (!res.ok || !parsed.records || parsed.records.length === 0) {
            alert("No financial collection records could be extracted from this PDF ledger report.");
            return;
          }
          const mappedRows = parsed.records.map((r: any) => ({
            'Student Name': r.matched_student_name || r.raw_identifier,
            'Roll No': r.matched_roll_no,
            'Total Paid': r.amount,
            'Uploaded Paid': r.amount
          }));
          processLedgerValidationRows(mappedRows, fileName);
        } catch (err: any) {
          alert("Error processing PDF ledger report: " + (err.message || err));
        }
      };
      pdfReader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          alert("The uploaded ledger report file appears to be empty.");
          return;
        }

        processLedgerValidationRows(data, fileName);
      } catch (err: any) {
        alert(`Failed to parse ledger report file: ${err.message || err}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processLedgerValidationRows = async (data: any[], fileName: string) => {
    try {
      // Fetch fresh ledger data
      const freshLedger = await fetch('/api/ledger').then(r => r.json()).catch(() => ledger);
      const activeLedger = Array.isArray(freshLedger) ? freshLedger : ledger;

        const findValue = (row: any, possibleKeys: string[]) => {
          for (const key of Object.keys(row)) {
            const normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            for (const possible of possibleKeys) {
              const normalizedPossible = possible.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              if (normalizedKey === normalizedPossible) {
                return row[key];
              }
            }
          }
          return '';
        };

        const results: any[] = [];
        let validatedCount = 0;
        let discrepancyCount = 0;
        let unmatchedCount = 0;
        const newValidatedRolls = new Set(validatedRollNos);

        data.forEach((row, idx) => {
          let rawRollNo = findValue(row, ['roll no', 'roll_no', 'roll number', 'id', 'rollno', 'roll', 'student_id']);
          let rawStudentName = findValue(row, ['student', 'student_name', 'name', 'student name', 'studentname']);
          let uploadedPaidVal = findValue(row, ['total paid', 'total_paid', 'paid', 'amount_paid', 'fee_paid', 'paid amount', 'paid_amount', 'amount']);
          let uploadedDueVal = findValue(row, ['total due', 'total_due', 'due', 'course_fee', 'plan_fee', 'total fee', 'total_fee', 'due_amount']);

          const rollNo = rawRollNo ? rawRollNo.toString().trim() : '';
          const studentName = rawStudentName ? rawStudentName.toString().trim() : '';
          const uploadedPaid = (uploadedPaidVal !== undefined && uploadedPaidVal !== '' && !isNaN(Number(uploadedPaidVal))) ? Number(uploadedPaidVal) : 0;
          const uploadedDue = (uploadedDueVal !== undefined && uploadedDueVal !== '' && !isNaN(Number(uploadedDueVal))) ? Number(uploadedDueVal) : 0;

          // Try matching in activeLedger by Roll No first, then Name
          let matched: any = null;
          if (rollNo) {
            const cleanRoll = rollNo.toLowerCase();
            matched = activeLedger.find(s => s.roll_no && s.roll_no.toString().trim().toLowerCase() === cleanRoll);
          }
          if (!matched && studentName) {
            const cleanName = studentName.toLowerCase().replace(/\s+/g, ' ');
            matched = activeLedger.find(s => s.name && s.name.toString().trim().toLowerCase().replace(/\s+/g, ' ') === cleanName);
          }

          if (!matched) {
            unmatchedCount++;
            results.push({
              id: idx + 1,
              rollNo: rollNo || 'N/A',
              studentName: studentName || 'Unknown Student',
              uploadedPaid,
              uploadedDue,
              systemPaid: 0,
              systemDue: 0,
              paidDiff: uploadedPaid,
              status: 'UNMATCHED',
              message: 'Student / Roll No not found in system ledger',
              reconciled: false
            });
          } else {
            const systemPaid = Number(matched.total_paid || 0);
            const systemDue = Number(matched.total_due || 0);
            const paidDiff = uploadedPaid - systemPaid;

            if (uploadedPaidVal !== '' && Math.abs(paidDiff) >= 1) {
              discrepancyCount++;
              results.push({
                id: idx + 1,
                rollNo: matched.roll_no || rollNo,
                studentName: matched.name || studentName,
                uploadedPaid,
                uploadedDue: uploadedDue || systemDue,
                systemPaid,
                systemDue,
                paidDiff,
                status: 'DISCREPANCY',
                message: `Paid mismatch: Uploaded ₹${uploadedPaid.toLocaleString()} vs System ₹${systemPaid.toLocaleString()} (${paidDiff > 0 ? '+' : ''}₹${paidDiff.toLocaleString()})`,
                studentId: matched.id,
                reconciled: false
              });
            } else {
              validatedCount++;
              if (matched.roll_no) newValidatedRolls.add(matched.roll_no);
              results.push({
                id: idx + 1,
                rollNo: matched.roll_no || rollNo,
                studentName: matched.name || studentName,
                uploadedPaid: uploadedPaid || systemPaid,
                uploadedDue: uploadedDue || systemDue,
                systemPaid,
                systemDue,
                paidDiff: 0,
                status: 'VALIDATED',
                message: 'Data matches and validated successfully',
                studentId: matched.id,
                reconciled: true
              });
            }
          }
        });

        setValidatedRollNos(newValidatedRolls);
        setLedgerValidationData({
          fileName,
          totalRows: data.length,
          validatedCount,
          discrepancyCount,
          unmatchedCount,
          results
        });
        setIsLedgerValidationModalOpen(true);

    } catch (err: any) {
      alert(`Failed to parse ledger report: ${err.message || 'Invalid CSV/Excel/PDF format'}`);
    }
  };

  const reconcileRow = async (item: any) => {
    if (!item.studentId || item.paidDiff === 0) return;

    setIsReconciling(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: item.studentId,
          amount: item.paidDiff,
          payment_mode: 'Report Reconciliation',
          transaction_id: `RECON_${Date.now()}_${item.studentId}`,
          academic_term: 'Ledger Audit Adjustment',
          transaction_date: new Date().toISOString()
        })
      });

      if (res.ok) {
        await refreshData();
        setLedgerValidationData(prev => {
          if (!prev) return null;
          const newResults = prev.results.map(r => {
            if (r.id === item.id) {
              return {
                ...r,
                status: 'VALIDATED' as const,
                systemPaid: r.systemPaid + r.paidDiff,
                paidDiff: 0,
                message: 'Reconciled & Validated',
                reconciled: true
              };
            }
            return r;
          });
          const vCount = newResults.filter(r => r.status === 'VALIDATED').length;
          const dCount = newResults.filter(r => r.status === 'DISCREPANCY').length;
          const uCount = newResults.filter(r => r.status === 'UNMATCHED').length;
          return {
            ...prev,
            validatedCount: vCount,
            discrepancyCount: dCount,
            unmatchedCount: uCount,
            results: newResults
          };
        });

        if (item.rollNo) {
          setValidatedRollNos(prev => new Set(prev).add(item.rollNo));
        }
      } else {
        alert("Failed to reconcile transaction");
      }
    } catch (err: any) {
      alert("Reconciliation error: " + err.message);
    } finally {
      setIsReconciling(false);
    }
  };

  const reconcileAllDiscrepancies = async () => {
    if (!ledgerValidationData) return;
    const discrepancies = ledgerValidationData.results.filter(r => r.status === 'DISCREPANCY' && r.studentId);
    if (discrepancies.length === 0) {
      alert("No discrepancy records eligible for auto-reconciliation.");
      return;
    }

    setIsReconciling(true);
    for (const item of discrepancies) {
      await reconcileRow(item);
    }
    setIsReconciling(false);
  };

  const exportValidationReportCSV = () => {
    if (!ledgerValidationData) return;
    const headers = ['Row #', 'Roll No', 'Student Name', 'Uploaded Paid (Rs)', 'System Paid (Rs)', 'Difference (Rs)', 'Status', 'Audit Notes'];
    const rows = ledgerValidationData.results.map(r => [
      r.id,
      r.rollNo,
      r.studentName,
      r.uploadedPaid,
      r.systemPaid,
      r.paidDiff,
      r.status,
      r.message
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Validation_Audit");
    XLSX.writeFile(wb, `Ledger_Validation_Audit_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  useEffect(() => {
    refreshData();
    safeFetchJson('/api/settings', undefined, null)
      .then(data => {
        if (data && data.settings) setSettings(data.settings);
      });
  }, []);

  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  const confirmDeleteTx = async () => {
    if (!deletingTx) return;
    try {
      const res = await fetch(`/api/transactions/${deletingTx.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingTx(null);
        refreshData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to delete transaction");
      }
    } catch (err: any) {
      alert("Error deleting transaction: " + err.message);
    }
  };

  const deleteTx = (tx: Transaction) => {
    setDeletingTx(tx);
  };

  const startEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setEditAmount(tx.amount.toString());
    setEditPaymentMode(tx.payment_mode);
    setEditTxId(tx.transaction_id || '');
    setEditTerm(tx.academic_term);
    setEditDate(tx.transaction_date ? tx.transaction_date.split('T')[0] : (tx.created_at ? tx.created_at.split('T')[0] : ''));
    setIsEditModalOpen(true);
  };

  const saveEditTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    try {
      const res = await fetch(`/api/transactions/${editingTx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: editingTx.student_id,
          amount: Number(editAmount) || 0,
          payment_mode: editPaymentMode,
          transaction_id: editTxId,
          academic_term: editTerm,
          transaction_date: editDate ? new Date(editDate).toISOString() : new Date().toISOString(),
          edited_by: 'Accountant'
        })
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingTx(null);
        refreshData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update transaction");
      }
    } catch (err: any) {
      alert("Error updating transaction: " + err.message);
    }
  };

  const handlePrint = (tx: Transaction) => {
    setPrintingTx(tx);
  };

  const triggerPrintReceipt = () => {
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
            <title>Payment Receipt - ${printingTx?.id || ''}</title>
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

  const downloadReceiptPDF = async () => {
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
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      const pdfName = `Receipt_${printingTx?.id || 'Fee'}.pdf`;
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
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF: " + (err.message || err));
    }
  };

  const shareWhatsAppReceipt = () => {
    if (!printingTx) return;
    const orgName = settings?.name || 'MAYA GROUP OF INSTITUTIONS';
    const txIdNum = Number(printingTx.id) || 0;
    const receiptNo = `RC-${txIdNum < 100 ? 800 + txIdNum : txIdNum}`;
    const cleanVal = (val: any) => (val ? val.toString().replace(/^\[Auto\]\s*/, '') : '');
    
    const msg = `🚩 *PAYMENT RECEIPT*\n*${orgName.toUpperCase()}*\n\nReceipt No: ${receiptNo}\nDate: ${printingTx.created_at || printingTx.transaction_date || ''}\n\n*Student Details:*\nName: ${cleanVal(printingTx.student_name)}\nRoll No: ${cleanVal(printingTx.roll_no)}\nFather's Name: ${cleanVal(printingTx.guardian_name || 'N/A')}\nBranch: ${cleanVal(printingTx.branch_name || printingTx.branch || 'N/A')}\nSemester: ${cleanVal(printingTx.semester_name || printingTx.course || 'N/A')}\nSession: ${cleanVal(printingTx.academic_term || '2026-27')}\n\n*Payment Details:*\nAmount Paid: ₹${printingTx.amount}\nPayment Mode: ${cleanVal(printingTx.payment_mode)}\nTransaction ID: ${cleanVal(printingTx.transaction_id || 'N/A')}\n\nThank you for your payment!`;

    const encodedMsg = encodeURIComponent(msg);
    const targetPhone = cleanVal(printingTx.phone || (printingTx as any).student_phone || '');
    if (targetPhone) {
      window.open(`https://wa.me/${targetPhone}?text=${encodedMsg}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
    }
  };

  const filteredTransactions = (transactions || []).filter(tx => {
    const matchesSearch = 
      (tx.student_name || '').toLowerCase().includes(search.toLowerCase()) || 
      (tx.transaction_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (tx.roll_no || '').toLowerCase().includes(search.toLowerCase());
    
    const txDate = new Date(tx.created_at);
    const matchesFrom = !dateRange.from || txDate >= new Date(dateRange.from);
    const matchesTo = !dateRange.to || txDate <= new Date(dateRange.to);

    return matchesSearch && matchesFrom && matchesTo;
  });

  const filteredLedger = (ledger || []).filter(item => 
    (item.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (item.roll_no || '').toLowerCase().includes(search.toLowerCase())
  );

  const exportExcel = () => {
    if (activeView === 'collections') {
      const headers = ['Date', 'Student', 'Roll No', 'Amount', 'Mode', 'Txn ID', 'Term'];
      const rows = filteredTransactions.map(tx => [
        formatAppDate(tx.transaction_date || tx.created_at),
        tx.student_name || '',
        tx.roll_no || '',
        tx.amount || 0,
        tx.payment_mode || '',
        tx.transaction_id || '',
        tx.academic_term || ''
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Collections");
      XLSX.writeFile(wb, `Collections_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } else {
      const headers = ['Student', 'Roll No', 'Fee Plan', 'Total Due', 'Total Paid', 'Balance'];
      const rows = filteredLedger.map(item => {
        const balance = (item.total_due || 0) - (item.total_paid || 0);
        return [
          item.name || '',
          item.roll_no || '',
          item.plan_name || 'No Plan',
          item.total_due || 0,
          item.total_paid || 0,
          balance
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ledger_Dues");
      XLSX.writeFile(wb, `Ledger_Dues_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    if (activeView === 'collections') {
      doc.text("Financial Collections Report", 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [['Date', 'Student', 'Roll No', 'Amount', 'Mode', 'Txn ID']],
        body: filteredTransactions.map(tx => [
          formatAppDate(tx.transaction_date || tx.created_at),
          tx.student_name || '',
          tx.roll_no || '',
          `Rs. ${tx.amount || 0}`,
          tx.payment_mode || '',
          tx.transaction_id || '-'
        ]),
      });
      doc.save(`Collections_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } else {
      doc.text("Student Ledger & Dues Report", 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [['Student', 'Roll No', 'Fee Plan', 'Total Due', 'Total Paid', 'Balance']],
        body: filteredLedger.map(item => {
          const balance = (item.total_due || 0) - (item.total_paid || 0);
          return [
            item.name || '',
            item.roll_no || '',
            item.plan_name || 'No Plan',
            `Rs. ${item.total_due || 0}`,
            `Rs. ${item.total_paid || 0}`,
            `Rs. ${balance}`
          ];
        }),
      });
      doc.save(`Ledger_Dues_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    }
  };

  const totalAmount = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">
            {activeView === 'collections' ? 'Financial Collections' : 'Financial Intelligence'}
          </h3>
          {activeView !== 'collections' && (
            <p className="text-slate-500 text-sm">Global collections tracking and student ledger auditing</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeView === 'collections' ? (
            <>
              <label className="px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-sm">
                <Upload size={14} className="text-blue-600" />
                Import
                <input 
                  type="file" 
                  accept=".csv, .xlsx, .xls, .txt, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
                  className="hidden" 
                  onChange={handleImportExcel} 
                />
              </label>
              <button 
                onClick={exportExcel}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 text-xs font-bold shadow-sm"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                Excel
              </button>
              <button 
                onClick={exportPDF}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 text-xs font-bold shadow-sm"
              >
                <FileText size={14} className="text-violet-600" />
                PDF
              </button>
            </>
          ) : (
            <>
              <label className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-2 text-xs font-bold cursor-pointer shadow-sm transition-colors">
                <FileCheck size={16} />
                Upload & Validate Report
                <input 
                  type="file" 
                  accept=".csv, .xlsx, .xls, .txt, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
                  className="hidden" 
                  onChange={handleValidateLedgerReport} 
                />
              </label>
              <button 
                onClick={exportExcel}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 text-xs font-bold shadow-sm"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                Excel
              </button>
              <button 
                onClick={exportPDF}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 text-xs font-bold shadow-sm"
              >
                <FileText size={14} className="text-violet-600" />
                PDF
              </button>
            </>
          )}
          {activeView === 'collections' && (
            <button 
              id="btn-new-payment"
              onClick={() => navigate('/collection')}
              className="bg-[#22C55E] hover:bg-[#16A34A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
            >
              New Payment
            </button>
          )}
          <button 
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm",
              showAnalytics ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            <BarChart3 size={15} />
            {showAnalytics ? 'Hide Analytics & Forecast' : 'Show Analytics & Forecast'}
            {showAnalytics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => setActiveView('collections')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                activeView === 'collections' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:text-slate-700"
              )}
            >
              COLLECTIONS
            </button>
            <button 
              onClick={() => setActiveView('ledger')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                activeView === 'ledger' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:text-slate-700"
              )}
            >
              LEDGER / DUES
            </button>
          </div>
        </div>
      </div>

      {/* Reports Analytics & Forecast Trends Panel */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 overflow-hidden"
          >
            {/* Course-wise and Session-wise Student Breakdown */}
            <CourseSessionStudentBreakdown students={studentsList.length > 0 ? studentsList : ledger} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart 1: Collection Forecast Trend */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                      <LineIcon size={18} className="text-emerald-600" />
                      Collection & Revenue Forecast Trend
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Historical collection velocity and 3-month AI projected target</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Actuals
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg border border-violet-100">
                      <Sparkles size={12} className="text-violet-500" /> Projected Forecast
                    </span>
                  </div>
                </div>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analyticsData.forecastSeries} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="repActualGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                      <Tooltip 
                        formatter={(val: any) => val !== null ? [`₹${Number(val).toLocaleString()}`, 'Amount'] : ['-', 'Amount']}
                        contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="actual" name="Actual Collection" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#repActualGradient)" />
                      <Line type="monotone" dataKey="forecast" name="Forecast Projection" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#8B5CF6' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Payment Mode Breakdown Pie Chart */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <PieIcon size={18} className="text-blue-600" />
                    Payment Channel Shares
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Distribution across UPI, Cash, Bank Transfer</p>
                </div>

                <div className="h-48 w-full my-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.paymentModePie}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {analyticsData.paymentModePie.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Total Share']}
                        contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  {analyticsData.paymentModePie.map((item: any) => (
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

            {/* Program Revenue vs Pending Bar Chart */}
            {analyticsData.programBar.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                      <BarChart3 size={18} className="text-violet-600" />
                      Academic Program Fee Performance
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Total collected vs outstanding pending dues per fee program</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <span className="w-3 h-3 rounded bg-emerald-500" /> Collected
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-600">
                      <span className="w-3 h-3 rounded bg-rose-500" /> Outstanding Pending Dues
                    </span>
                  </div>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.programBar} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="program" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                      <Tooltip 
                        formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Amount']}
                        contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="Collected" fill="#10B981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Pending" fill="#F43F5E" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      {activeView === 'collections' ? (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[280px]">
            <input 
              type="text"
              placeholder="Search student / txn"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
            />
          </div>

          <div className="w-48 relative">
            <input 
              type="date"
              value={dateRange.from}
              onChange={e => setDateRange({...dateRange, from: e.target.value})}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
            />
          </div>

          <div className="w-48 relative">
            <input 
              type="date"
              value={dateRange.to}
              onChange={e => setDateRange({...dateRange, to: e.target.value})}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
            />
          </div>

          <button 
            onClick={refreshData}
            className="bg-[#007BFF] hover:bg-[#0056B3] text-white px-8 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
          >
            Search
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 rounded-2xl border border-amber-200/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                <FileCheck size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  Ledger Report Validation Engine
                  {validatedRollNos.size > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                      {validatedRollNos.size} Validated
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-500">Upload external bank/fee reports (.csv, .xlsx) to validate student roll numbers, dues & payments against active ledger.</p>
              </div>
            </div>
            <label className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-all flex items-center gap-2">
              <Upload size={14} />
              Upload & Validate Ledger Report
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls, .txt, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
                className="hidden" 
                onChange={handleValidateLedgerReport} 
              />
            </label>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-6">
            <div className="flex-1 min-w-[300px] space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Search Student / Roll</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Enter student name or roll number..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="bg-emerald-50 px-6 py-2.5 rounded-xl border border-emerald-100 text-center min-w-[100px]">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Results</p>
              <p className="text-xl font-black text-emerald-700">{filteredLedger.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Banner */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white flex items-center justify-between shadow-2xl shadow-slate-200">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <TrendingUp size={32} />
          </div>
          <div>
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Collection in Period</h4>
            <p className="text-4xl font-black mt-1">₹{(totalAmount || 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Report Generated</p>
          <p className="text-sm font-medium mt-1">{format(new Date(), 'dd MMMM yyyy • hh:mm a')}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeView === 'collections' ? (
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-[#343A40]">
                  <th className="py-3 px-4 text-xs font-bold text-white border border-slate-200 w-16">ID</th>
                  <th className="py-3 px-4 text-xs font-bold text-white border border-slate-200">Date</th>
                  <th className="py-3 px-4 text-xs font-bold text-white border border-slate-200">Student</th>
                  <th className="py-3 px-4 text-xs font-bold text-white border border-slate-200">Txn</th>
                  <th className="py-3 px-4 text-xs font-bold text-white border border-slate-200">Mode</th>
                  <th className="py-3 px-4 text-xs font-bold text-white border border-slate-200">Amount</th>
                  <th className="py-3 px-4 text-xs font-bold text-white border border-slate-200 w-32 print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 border border-slate-200 text-slate-700 text-sm font-medium">{tx.id}</td>
                    <td className="p-3 border border-slate-200 text-slate-700 text-sm">{formatTxDate(tx.transaction_date || tx.created_at)}</td>
                    <td className="p-3 border border-slate-200 text-slate-800 text-sm font-semibold">
                      <p className={cn(
                        "font-bold flex items-center flex-wrap gap-1",
                        isAuto(tx.student_name) ? "text-amber-600 italic font-mono font-medium" : "text-slate-800"
                      )}>
                        {cleanVal(tx.student_name)}
                        {isAuto(tx.student_name) && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[8px] font-bold tracking-normal not-italic uppercase">Auto</span>
                        )}
                        {tx.is_edited && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[8px] font-bold uppercase tracking-wider">
                            Edited by {tx.edited_by || 'Accountant'}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span className={cn(isAuto(tx.academic_term) ? "text-amber-600 italic font-mono font-medium" : "")}>
                          {cleanVal(tx.academic_term)}
                        </span>
                      </p>
                    </td>
                    <td className="p-3 border border-slate-200 text-slate-700 text-sm font-mono">
                      <p className={cn(
                        "text-sm font-mono",
                        isAuto(tx.transaction_id) ? "text-amber-600 italic font-medium" : "text-slate-600"
                      )}>
                        {cleanVal(tx.transaction_id) || 'CASH_PAYMENT'}
                        {isAuto(tx.transaction_id) && (
                          <span className="ml-1 px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[8px] font-bold not-italic normal-case">Auto</span>
                        )}
                      </p>
                    </td>
                    <td className="p-3 border border-slate-200 text-slate-700 text-sm">
                      <span className={cn(isAuto(tx.payment_mode) ? "text-amber-600 italic font-mono font-medium" : "")}>
                        {cleanVal(tx.payment_mode)}
                      </span>
                    </td>
                    <td className="p-3 border border-slate-200 text-slate-800 text-sm font-semibold">
                      ₹{(tx.amount || 0).toLocaleString()}
                    </td>
                    <td className="p-3 border border-slate-200 print:hidden">
                      <div className="flex flex-col gap-1 w-full max-w-[120px]">
                        <div className="flex gap-1.5 justify-between">
                          <button 
                            onClick={() => startEditTx(tx)}
                            className="bg-[#FFC107] hover:bg-[#E0A800] text-slate-900 px-2 py-1 rounded text-xs font-bold transition-all flex-1 text-center"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => deleteTx(tx)}
                            className="bg-[#DC3545] hover:bg-[#C82333] text-white px-2 py-1 rounded text-xs font-bold transition-all flex-1 text-center"
                          >
                            Delete
                          </button>
                        </div>
                        <button 
                          onClick={() => handlePrint(tx)}
                          className="bg-[#17A2B8] hover:bg-[#138496] text-white px-3 py-1 rounded text-xs font-bold transition-all w-full text-center"
                        >
                          Receipt
                        </button>
                        {tx.is_edited && (
                          <button 
                            onClick={() => setViewingAuditTx(tx)}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded text-[10px] font-bold transition-all w-full text-center"
                          >
                            Before & After
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-slate-400">
                      No transactions found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student / Roll</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fee Plan</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total Due</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total Paid</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Balance</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Date-wise Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLedger.map(item => {
                  const balance = (item.total_due || 0) - (item.total_paid || 0);
                  const isExpanded = expandedStudentId === item.id;
                  const txs = item.transactions || [];

                  return (
                    <React.Fragment key={item.id}>
                      <tr 
                        onClick={() => setExpandedStudentId(isExpanded ? null : item.id)}
                        className={cn(
                          "hover:bg-slate-50 transition-colors cursor-pointer",
                          isExpanded ? "bg-slate-50/80" : ""
                        )}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              "font-bold",
                              isAuto(item.name) ? "text-amber-600 italic font-mono font-medium" : "text-slate-900"
                            )}>
                              {cleanVal(item.name)}
                              {isAuto(item.name) && (
                                <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[8px] font-bold tracking-normal not-italic uppercase">Auto</span>
                              )}
                            </p>
                            {validatedRollNos.has(item.roll_no) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase tracking-wide">
                                <CheckCircle2 size={10} /> Validated Match
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            ROLL:{' '}
                            <span className={cn(isAuto(item.roll_no) ? "text-amber-600 italic font-mono font-medium" : "")}>
                              {cleanVal(item.roll_no)}
                            </span>
                            {isAuto(item.roll_no) && (
                              <span className="ml-1.5 px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[8px] font-bold normal-case not-italic">Auto</span>
                            )}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <p className={cn(
                            "text-sm font-medium",
                            isAuto(item.plan_name) ? "text-amber-600 italic font-mono" : "text-slate-700"
                          )}>
                            {cleanVal(item.plan_name) || 'No Plan'}
                          </p>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <p className="text-sm font-bold text-slate-900">₹{(item.total_due || 0).toLocaleString()}</p>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <p className="text-sm font-bold text-emerald-600">₹{(item.total_paid || 0).toLocaleString()}</p>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <p className={cn(
                            "text-sm font-black",
                            balance > 0 ? "text-red-600" : "text-emerald-600"
                          )}>
                            ₹{(balance || 0).toLocaleString()}
                          </p>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedStudentId(isExpanded ? null : item.id);
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 mx-auto border",
                              isExpanded 
                                ? "bg-slate-800 text-white border-slate-800" 
                                : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                            )}
                          >
                            <History size={13} />
                            {isExpanded ? 'Hide Ledger' : `View Ledger (${txs.length})`}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b-2 border-slate-200">
                          <td colSpan={6} className="p-4 sm:p-6">
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                  <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                    <History className="text-blue-600" size={16} />
                                    Student Payment Ledger — {cleanVal(item.name)} (Roll: {cleanVal(item.roll_no)})
                                  </h5>
                                  <p className="text-xs text-slate-500">Date-wise chronological record of all payments received</p>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold">
                                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                                    Course Fee: ₹{(item.total_due || 0).toLocaleString()}
                                  </span>
                                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                                    Total Paid: ₹{(item.total_paid || 0).toLocaleString()}
                                  </span>
                                  <span className={cn(
                                    "px-2.5 py-1 rounded-lg",
                                    balance > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                                  )}>
                                    Balance: ₹{(balance || 0).toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {txs.length > 0 ? (
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                        <th className="p-3">Payment Date</th>
                                        <th className="p-3">Term / Sem</th>
                                        <th className="p-3">Txn / UPI ID</th>
                                        <th className="p-3">Payment Mode</th>
                                        <th className="p-3 text-right">Amount Paid</th>
                                        <th className="p-3 text-right">Running Paid Total</th>
                                        <th className="p-3 text-right">Balance Due</th>
                                        <th className="p-3 text-center">Accountant Audit / Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                      {txs.map((tx: any, idx: number) => {
                                        const txDateStr = tx.created_at || tx.transaction_date;
                                        const formattedDate = safeFormatDate(txDateStr, 'yyyy-MM-dd HH:mm');
                                        return (
                                          <tr key={tx.id || idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 font-semibold text-slate-900">{formattedDate}</td>
                                            <td className="p-3">{tx.academic_term || 'Sem 1'}</td>
                                            <td className="p-3 font-mono text-slate-600">{tx.transaction_id || 'CASH'}</td>
                                            <td className="p-3">{tx.payment_mode || 'Cash'}</td>
                                            <td className="p-3 text-right font-bold text-emerald-600">₹{(tx.amount || 0).toLocaleString()}</td>
                                            <td className="p-3 text-right font-bold text-slate-800">₹{(tx.running_paid || 0).toLocaleString()}</td>
                                            <td className="p-3 text-right font-bold text-slate-900">₹{(tx.running_balance || 0).toLocaleString()}</td>
                                            <td className="p-3 text-center">
                                              <div className="flex items-center justify-center gap-1.5">
                                                {tx.is_edited && (
                                                  <button
                                                    onClick={() => setViewingAuditTx(tx)}
                                                    className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold transition-all border border-amber-300 flex items-center gap-1"
                                                  >
                                                    <Edit3 size={10} />
                                                    Edited by {tx.edited_by || 'Accountant'}
                                                  </button>
                                                )}
                                                <button
                                                  onClick={() => handlePrint(tx)}
                                                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-all border border-slate-200"
                                                >
                                                  Receipt
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                  No transaction records found for this student.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredLedger.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-400">
                      No student records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Interactive Receipt Modal */}
      <AnimatePresence>
        {printingTx && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-transparent">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col print:max-w-none print:max-h-none print:shadow-none print:border-none print:rounded-none"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
                <div className="flex items-center gap-2">
                  <Printer size={18} className="text-emerald-400" />
                  <h3 className="font-bold text-base">Payment Receipt - RC-{Number(printingTx.id) < 100 ? 800 + Number(printingTx.id) : printingTx.id}</h3>
                </div>
                <button 
                  onClick={() => setPrintingTx(null)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Receipt Content Container */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50 print:p-0 print:bg-white print:overflow-visible">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
                  <Receipt transaction={printingTx} settings={settings} />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3 shrink-0 print:hidden">
                <button 
                  onClick={triggerPrintReceipt}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-md cursor-pointer"
                >
                  <Printer size={16} />
                  Print Receipt
                </button>
                <button 
                  onClick={downloadReceiptPDF}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-700 transition-all shadow-md cursor-pointer"
                >
                  <FileDown size={16} />
                  Download PDF
                </button>
                <button 
                  onClick={shareWhatsAppReceipt}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-md cursor-pointer"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
                <button 
                  onClick={() => setPrintingTx(null)}
                  className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingTx && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-3 bg-rose-100 rounded-2xl">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Delete Transaction</h3>
                  <p className="text-xs text-slate-500 font-medium">Transaction ID: #{deletingTx.id}</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete transaction <strong className="text-slate-900">#{deletingTx.id}</strong> (₹{deletingTx.amount?.toLocaleString()} paid by <strong className="text-slate-900">{deletingTx.student_name || 'Student'}</strong>)?
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeletingTx(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteTx}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  Yes, Delete Transaction
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: A4;
            margin: 10mm;
          }
          body * { 
            visibility: hidden !important; 
          }
          #receipt-content, #receipt-content * { 
            visibility: visible !important; 
          }
          #receipt-content { 
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            z-index: 99999 !important;
          }
        }
      `}} />

      {/* Import Status Modal */}
      <AnimatePresence>
        {importStatus && importStatus.isOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 overflow-hidden space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-lg font-bold text-slate-900">
                  {activeView === 'collections' ? 'Collections' : 'Ledger Dues'} Report Import Progress
                </h4>
                {importStatus.processed >= importStatus.total && (
                  <button 
                    onClick={() => setImportStatus(null)}
                    className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold text-slate-600">
                  <span>Processed: {importStatus.processed} / {importStatus.total}</span>
                  <span>{Math.round((importStatus.processed / importStatus.total) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-full transition-all duration-300"
                    style={{ width: `${(importStatus.processed / importStatus.total) * 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center py-2">
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl">
                  <span className="block text-2xl font-extrabold">{importStatus.successCount}</span>
                  <span className="text-xs font-medium">Successfully Synced</span>
                </div>
                <div className="bg-red-50 text-red-700 p-3 rounded-xl">
                  <span className="block text-2xl font-extrabold">{importStatus.failCount}</span>
                  <span className="text-xs font-medium">Failed Rows</span>
                </div>
              </div>

              {importStatus.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Errors / Skip logs</p>
                  <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-500 font-mono space-y-1">
                    {importStatus.errors.map((err, idx) => (
                      <div key={idx} className="border-b border-slate-100/50 pb-1 last:border-0">{err}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button 
                  onClick={() => setImportStatus(null)}
                  disabled={importStatus.processed < importStatus.total}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md"
                >
                  {importStatus.processed < importStatus.total ? 'Syncing...' : 'Done & Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingTx && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 overflow-hidden space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">Edit Transaction</h4>
                  <p className="text-xs text-slate-500">Payer: {cleanVal(editingTx.student_name)} (Roll: {cleanVal(editingTx.roll_no)})</p>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={saveEditTx} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount Paid (Rs.)</label>
                  <input 
                    type="number"
                    required
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Mode</label>
                  <select 
                    value={editPaymentMode}
                    onChange={e => setEditPaymentMode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white font-medium"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Draft">Demand Draft</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction / UTR ID</label>
                  <input 
                    type="text"
                    value={editTxId}
                    onChange={e => setEditTxId(e.target.value)}
                    placeholder="Enter transaction reference code..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Term / Semester</label>
                  <input 
                    type="text"
                    required
                    value={editTerm}
                    onChange={e => setEditTerm(e.target.value)}
                    placeholder="e.g. Semester 1, Semester 3..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Date</label>
                  <input 
                    type="date"
                    required
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium bg-white"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-500 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-md"
                  >
                    Save Changes
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
                    <h3 className="text-lg font-bold">Transaction #{viewingAuditTx.id}</h3>
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
                  Step-by-step comparison showing details <span className="text-rose-600 font-bold">before editing</span> and <span className="text-emerald-600 font-bold">after editing</span>:
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

      {/* Ledger Report Validation & Matching Modal */}
      <AnimatePresence>
        {isLedgerValidationModalOpen && ledgerValidationData && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLedgerValidationModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-500 text-slate-900 rounded font-bold text-[10px] uppercase">Ledger Audit & Validation</span>
                    <h3 className="text-xl font-bold">Report Matching & Audit Results</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Uploaded File: <span className="font-mono text-amber-400 font-bold">{ledgerValidationData.fileName}</span> ({ledgerValidationData.totalRows} records evaluated)
                  </p>
                </div>
                <button 
                  onClick={() => setIsLedgerValidationModalOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Stats Bar */}
              <div className="bg-slate-50 p-6 border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Uploaded</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{ledgerValidationData.totalRows}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-700">
                    <CheckCircle2 size={16} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Validated Matches</p>
                  </div>
                  <p className="text-2xl font-black text-emerald-800 mt-1">{ledgerValidationData.validatedCount}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-amber-700">
                    <AlertTriangle size={16} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Discrepancies</p>
                  </div>
                  <p className="text-2xl font-black text-amber-800 mt-1">{ledgerValidationData.discrepancyCount}</p>
                </div>
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-rose-700">
                    <XCircle size={16} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Unmatched Students</p>
                  </div>
                  <p className="text-2xl font-black text-rose-800 mt-1">{ledgerValidationData.unmatchedCount}</p>
                </div>
              </div>

              {/* Action Toolbar & Filters */}
              <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {(['ALL', 'VALIDATED', 'DISCREPANCY', 'UNMATCHED'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setValidationFilter(tab)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        validationFilter === tab ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      {tab === 'ALL' ? `ALL (${ledgerValidationData.totalRows})` :
                       tab === 'VALIDATED' ? `VALIDATED (${ledgerValidationData.validatedCount})` :
                       tab === 'DISCREPANCY' ? `MISMATCHES (${ledgerValidationData.discrepancyCount})` :
                       `UNMATCHED (${ledgerValidationData.unmatchedCount})`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {ledgerValidationData.discrepancyCount > 0 && (
                    <button
                      onClick={reconcileAllDiscrepancies}
                      disabled={isReconciling}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow flex items-center gap-1.5"
                    >
                      <RefreshCw size={14} className={isReconciling ? "animate-spin" : ""} />
                      Auto-Reconcile All Discrepancies
                    </button>
                  )}
                  <button
                    onClick={exportValidationReportCSV}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow flex items-center gap-1.5"
                  >
                    <Download size={14} />
                    Export Audit Excel
                  </button>
                </div>
              </div>

              {/* Table Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-3 border-b border-slate-200">Row #</th>
                      <th className="p-3 border-b border-slate-200">Roll No</th>
                      <th className="p-3 border-b border-slate-200">Student Name</th>
                      <th className="p-3 border-b border-slate-200 text-right">Uploaded Paid</th>
                      <th className="p-3 border-b border-slate-200 text-right">System Paid</th>
                      <th className="p-3 border-b border-slate-200 text-right">Difference</th>
                      <th className="p-3 border-b border-slate-200">Validation Status</th>
                      <th className="p-3 border-b border-slate-200 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {ledgerValidationData.results
                      .filter(r => {
                        if (validationFilter === 'VALIDATED') return r.status === 'VALIDATED';
                        if (validationFilter === 'DISCREPANCY') return r.status === 'DISCREPANCY';
                        if (validationFilter === 'UNMATCHED') return r.status === 'UNMATCHED';
                        return true;
                      })
                      .map(r => (
                        <tr key={r.id} className={cn(
                          "hover:bg-slate-50 transition-colors",
                          r.status === 'DISCREPANCY' ? "bg-amber-50/40" :
                          r.status === 'UNMATCHED' ? "bg-rose-50/40" : ""
                        )}>
                          <td className="p-3 text-slate-400 font-mono">{r.id}</td>
                          <td className="p-3 font-bold text-slate-900 font-mono">{r.rollNo}</td>
                          <td className="p-3 font-semibold text-slate-800">{r.studentName}</td>
                          <td className="p-3 text-right font-bold text-slate-900">₹{r.uploadedPaid.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-emerald-700">₹{r.systemPaid.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold">
                            {r.paidDiff !== 0 ? (
                              <span className={r.paidDiff > 0 ? "text-amber-600" : "text-rose-600"}>
                                {r.paidDiff > 0 ? '+' : ''}₹{r.paidDiff.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400">₹0</span>
                            )}
                          </td>
                          <td className="p-3">
                            {r.status === 'VALIDATED' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                <CheckCircle2 size={12} /> Validated Match
                              </span>
                            ) : r.status === 'DISCREPANCY' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                                <AlertTriangle size={12} /> Amount Mismatch
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                                <XCircle size={12} /> Student Not Found
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {r.status === 'DISCREPANCY' && r.studentId ? (
                              <button
                                onClick={() => reconcileRow(r)}
                                disabled={isReconciling}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded text-[11px] font-bold transition-all shadow-sm"
                              >
                                {r.paidDiff > 0 ? `Reconcile (+₹${r.paidDiff})` : `Reconcile (₹${r.paidDiff})`}
                              </button>
                            ) : r.status === 'VALIDATED' ? (
                              <span className="text-emerald-600 text-xs font-bold inline-flex items-center gap-1">
                                <Check size={14} /> Synced
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Matches are verified against current database student roll numbers and ledger balances.
                </p>
                <button
                  onClick={() => setIsLedgerValidationModalOpen(false)}
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-all"
                >
                  Close Audit Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
