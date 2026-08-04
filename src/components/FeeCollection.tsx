import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Eye,
  Calendar,
  XCircle,
  Filter,
  Plus,
  Trash2,
  Layers,
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  Sparkles,
  ChevronUp,
  Grid,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  FileText,
  Check,
  AlertTriangle,
  Download
} from 'lucide-react';
import { safeFetchJson } from '../utils/api';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Transaction, OrgSettings } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import autoTable from 'jspdf-autotable';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  Cell 
} from 'recharts';

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
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('all');

  // PDF Financial Collection Upload State
  const [isPdfUploadModalOpen, setIsPdfUploadModalOpen] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfParseError, setPdfParseError] = useState<string | null>(null);
  const [parsedPdfRecords, setParsedPdfRecords] = useState<any[]>([]);
  const [selectedPdfRowIds, setSelectedPdfRowIds] = useState<Set<string>>(new Set());
  const [isImportingPdfRecords, setIsImportingPdfRecords] = useState(false);
  const [pdfSearchQuery, setPdfSearchQuery] = useState('');
  const [pdfImportStatus, setPdfImportStatus] = useState<string | null>(null);

  const handlePdfFileSelect = async (fileInput: File | null) => {
    if (!fileInput) return;

    if (!fileInput.name.toLowerCase().endsWith('.pdf')) {
      setPdfParseError('Please upload a valid PDF document (.pdf).');
      return;
    }

    setIsParsingPdf(true);
    setPdfParseError(null);
    setPdfImportStatus(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const pdfBase64 = reader.result as string;
        try {
          const res = await fetch('/api/parse-collection-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfBase64 })
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || 'Failed to parse PDF document.');
          }

          if (data.records && data.records.length > 0) {
            setParsedPdfRecords(data.records);
            setSelectedPdfRowIds(new Set(data.records.map((r: any) => r.id)));
          } else {
            setPdfParseError('No financial collection records could be automatically parsed from this PDF. You can try downloading our sample template or adding records manually.');
          }
        } catch (err: any) {
          setPdfParseError(err.message || 'Server error while parsing PDF.');
        } finally {
          setIsParsingPdf(false);
        }
      };
      reader.readAsDataURL(fileInput);
    } catch (err: any) {
      setPdfParseError('Error reading file: ' + err.message);
      setIsParsingPdf(false);
    }
  };

  // Download Sample PDF in Image 1 Format (Detailed 8 Columns)
  const handleDownloadFormat1Pdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("MAYA GROUP OF INSTITUTIONS", 14, 18);
    doc.setFontSize(11);
    doc.text("Financial Fee Collections Sheet (Image 1 Format - 8 Columns)", 14, 25);
    doc.setFontSize(9);
    doc.text(`Generated Date: ${format(new Date(), 'yyyy-MM-dd')} | Academic Term: 2026-27`, 14, 31);

    const sampleRows = students.slice(0, 5).map((st, i) => [
      (i + 1).toString(),
      st.name,
      st.roll_no || `CS-2026-00${i+1}`,
      ((i + 1) * 5000).toString(),
      i % 2 === 0 ? 'UPI' : 'Cash',
      i % 2 === 0 ? `UPI_REF_${Math.floor(100000 + Math.random() * 900000)}` : `CASH_${Math.floor(1000 + Math.random() * 9000)}`,
      format(new Date(), 'yyyy-MM-dd'),
      'Tuition Fee Collection'
    ]);

    if (sampleRows.length === 0) {
      sampleRows.push(
        ["1", "Alice Johnson", "CS-2025-001", "15000", "UPI", "UPI_REF_981234", format(new Date(), 'yyyy-MM-dd'), "Tuition Fee"],
        ["2", "Bob Smith", "EE-2025-042", "12000", "Bank Transfer", "NEFT_887123", format(new Date(), 'yyyy-MM-dd'), "Tuition Fee"]
      );
    }

    autoTable(doc, {
      startY: 36,
      head: [["S.No", "Student Name", "Roll / ID No", "Amount (₹)", "Payment Mode", "Transaction ID / UTR", "Date", "Remarks"]],
      body: sampleRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' }
    });

    doc.save(`Format1_Detailed_Collections_Sheet_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  // Download Sample PDF in Image 2 Format (Simplified 4 Columns)
  const handleDownloadFormat2Pdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("MAYA GROUP OF INSTITUTIONS", 14, 18);
    doc.setFontSize(11);
    doc.text("Fee Collections Data Sheet (Image 2 Format - 4 Columns)", 14, 25);
    doc.setFontSize(9);
    doc.text(`Generated Date: ${format(new Date(), 'yyyy-MM-dd')} | Academic Term: 2026-27`, 14, 31);

    const sampleRows = students.slice(0, 5).map((st, i) => [
      st.name,
      i % 2 === 0 ? `UPI_REF_${Math.floor(100000 + Math.random() * 900000)}` : `CASH_${Math.floor(1000 + Math.random() * 9000)}`,
      ((i + 1) * 5000).toString(),
      format(new Date(), 'yyyy-MM-dd')
    ]);

    if (sampleRows.length === 0) {
      sampleRows.push(
        ["Alice Johnson", "UPI_REF_981234", "15000", format(new Date(), 'yyyy-MM-dd')],
        ["Bob Smith", "NEFT_887123", "12000", format(new Date(), 'yyyy-MM-dd')]
      );
    }

    autoTable(doc, {
      startY: 36,
      head: [["Student", "Transaction", "Amount", "Date"]],
      body: sampleRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' }
    });

    doc.save(`Format2_Simple_Collections_Sheet_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  // Export parsed & dummy-enriched records as standardized Image 1 Format PDF
  const handleExportConvertedFormat1Pdf = () => {
    if (parsedPdfRecords.length === 0) return;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("MAYA GROUP OF INSTITUTIONS", 14, 18);
    doc.setFontSize(11);
    doc.text("Converted & Enriched Financial Collections Report (Image 1 Standard)", 14, 25);
    doc.setFontSize(9);
    doc.text(`Converted Date: ${format(new Date(), 'yyyy-MM-dd HH:mm')} | Total Records: ${parsedPdfRecords.length}`, 14, 31);

    const rows = parsedPdfRecords.map((r, i) => [
      (i + 1).toString(),
      r.matched_student_name || r.raw_identifier || 'Unknown Student',
      r.matched_roll_no || `REG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      Number(r.amount).toLocaleString('en-IN'),
      r.payment_mode || 'Cash',
      r.transaction_id || `TXN_${Math.floor(100000 + Math.random() * 900000)}`,
      r.transaction_date || format(new Date(), 'yyyy-MM-dd'),
      r.fee_head_or_notes || 'Tuition Fee Collection'
    ]);

    autoTable(doc, {
      startY: 36,
      head: [["S.No", "Student Name", "Roll / ID No", "Amount (₹)", "Payment Mode", "Transaction ID / UTR", "Date", "Remarks"]],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' }
    });

    doc.save(`Converted_Format1_Collections_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  };

  const handleBulkImportPdfRecords = async () => {
    const recordsToImport = parsedPdfRecords.filter(r => selectedPdfRowIds.has(r.id) && r.matched_student_id);

    if (recordsToImport.length === 0) {
      alert('Please select at least one valid record with a matched student to import.');
      return;
    }

    setIsImportingPdfRecords(true);
    setPdfImportStatus('Importing financial collection records to database...');

    const txPayloads = recordsToImport.map((r, idx) => ({
      student_id: r.matched_student_id,
      amount: Number(r.amount) || 0,
      payment_mode: r.payment_mode || 'Cash',
      transaction_id: r.transaction_id || `PDF_TXN_${Date.now()}_${idx + 1}`,
      academic_term: r.academic_term || '2026-27',
      transaction_date: r.transaction_date || format(new Date(), 'yyyy-MM-dd'),
      bank_account: ''
    }));

    try {
      const res = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: txPayloads })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || (data.errors && data.errors[0]) || 'Bulk import failed.');
      }

      setPdfImportStatus(`Successfully imported ${data.count || recordsToImport.length} financial collection records!`);
      setTimeout(() => {
        setIsPdfUploadModalOpen(false);
        setParsedPdfRecords([]);
        setIsImportingPdfRecords(false);
        setPdfImportStatus(null);
        loadRecentTransactions();
      }, 1200);

    } catch (err: any) {
      alert(`Import error: ${err.message}`);
      setIsImportingPdfRecords(false);
      setPdfImportStatus(null);
    }
  };

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    if (preset === 'all') {
      setHistoryStartDate('');
      setHistoryEndDate('');
    } else if (preset === 'today') {
      const todayStr = format(today, 'yyyy-MM-dd');
      setHistoryStartDate(todayStr);
      setHistoryEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = format(y, 'yyyy-MM-dd');
      setHistoryStartDate(yStr);
      setHistoryEndDate(yStr);
    } else if (preset === 'this_week') {
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      setHistoryStartDate(format(monday, 'yyyy-MM-dd'));
      setHistoryEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setHistoryStartDate(format(firstDay, 'yyyy-MM-dd'));
      setHistoryEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'last_month') {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      setHistoryStartDate(format(firstDayLastMonth, 'yyyy-MM-dd'));
      setHistoryEndDate(format(lastDayLastMonth, 'yyyy-MM-dd'));
    }
  };

  interface PaymentEntry {
    id: string;
    amount: string;
    payment_mode: string;
    transaction_id: string;
    transaction_date: string;
    bank_account: string;
  }

  const createNewEntry = (): PaymentEntry => ({
    id: Math.random().toString(36).substring(2, 9),
    amount: '',
    payment_mode: 'UPI Digital',
    transaction_id: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    bank_account: ''
  });

  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([createNewEntry()]);
  const [academicTerm, setAcademicTerm] = useState('Sem I / 2026-27');
  const [paymentCourse, setPaymentCourse] = useState('');
  const [paymentBranch, setPaymentBranch] = useState('');

  const addEntry = () => {
    setPaymentEntries(prev => [...prev, createNewEntry()]);
  };

  const removeEntry = (id: string) => {
    if (paymentEntries.length > 1) {
      setPaymentEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  const updateEntry = (id: string, field: keyof PaymentEntry, value: string) => {
    setPaymentEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const totalPaymentAmount = paymentEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

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
    if (!selectedStudent) {
      setError('Please search and select a student first.');
      return;
    }
    setError(null);

    // Validation
    const txIdSet = new Set<string>();
    for (let i = 0; i < paymentEntries.length; i++) {
      const entry = paymentEntries[i];
      const amt = parseFloat(entry.amount);
      if (isNaN(amt) || amt <= 0) {
        setError(`Please enter a valid amount for Transaction #${i + 1}.`);
        return;
      }
      if (entry.payment_mode !== 'Cash' && !entry.transaction_id.trim()) {
        setError(`Transaction ID is mandatory for Transaction #${i + 1} (${entry.payment_mode}).`);
        return;
      }
      const cleanId = entry.transaction_id.trim();
      if (cleanId) {
        if (txIdSet.has(cleanId.toLowerCase())) {
          setError(`Duplicate Transaction ID! Transaction ID '${cleanId}' is entered multiple times in this submission.`);
          return;
        }
        txIdSet.add(cleanId.toLowerCase());
      }
    }

    const savedTxList: Transaction[] = [];

    if (paymentEntries.length === 1) {
      const entry = paymentEntries[0];
      const payload: any = {
        student_id: selectedStudent.id,
        amount: parseFloat(entry.amount),
        payment_mode: entry.payment_mode,
        transaction_id: entry.transaction_id.trim() || `CASH_${Date.now()}_1`,
        academic_term: academicTerm || '2026-27',
        course: paymentCourse || selectedStudent.semester_name || '',
        branch: paymentBranch || selectedStudent.branch_name || '',
        transaction_date: entry.transaction_date || format(new Date(), 'yyyy-MM-dd'),
        bank_account: entry.bank_account
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to save transaction. Please try again.');
        return;
      }

      savedTxList.push({
        id: data.id || Math.floor(Math.random() * 1000),
        student_id: selectedStudent.id,
        amount: parseFloat(entry.amount),
        payment_mode: entry.payment_mode,
        transaction_id: data.transaction_id || entry.transaction_id,
        academic_term: academicTerm || '2026-27',
        course: paymentCourse || selectedStudent.semester_name || '',
        branch: paymentBranch || selectedStudent.branch_name || '',
        transaction_date: entry.transaction_date || format(new Date(), 'yyyy-MM-dd'),
        bank_account: entry.bank_account,
        student_name: selectedStudent.name,
        roll_no: selectedStudent.roll_no,
        guardian_name: selectedStudent.guardian_name,
        branch_name: paymentBranch || selectedStudent.branch_name,
        semester_name: paymentCourse || selectedStudent.semester_name,
        created_at: new Date().toISOString()
      } as Transaction);
    } else {
      const txPayloads = paymentEntries.map((entry, idx) => ({
        student_id: selectedStudent.id,
        amount: parseFloat(entry.amount),
        payment_mode: entry.payment_mode,
        transaction_id: entry.transaction_id.trim() || `CASH_${Date.now()}_${idx + 1}`,
        academic_term: academicTerm || '2026-27',
        course: paymentCourse || selectedStudent.semester_name || '',
        branch: paymentBranch || selectedStudent.branch_name || '',
        transaction_date: entry.transaction_date || format(new Date(), 'yyyy-MM-dd'),
        bank_account: entry.bank_account
      }));

      const res = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: txPayloads })
      });

      const data = await res.json();
      if (!res.ok || !data.savedList || data.savedList.length === 0) {
        setError(data.message || (data.errors && data.errors[0]) || 'Failed to save batch transactions.');
        return;
      }

      data.savedList.forEach((savedItem: any, idx: number) => {
        const entry = paymentEntries[idx] || paymentEntries[0];
        savedTxList.push({
          id: savedItem.id,
          student_id: selectedStudent.id,
          amount: parseFloat(entry.amount),
          payment_mode: entry.payment_mode,
          transaction_id: savedItem.transaction_id || entry.transaction_id,
          academic_term: academicTerm || '2026-27',
          course: paymentCourse || selectedStudent.semester_name || '',
          branch: paymentBranch || selectedStudent.branch_name || '',
          transaction_date: entry.transaction_date || format(new Date(), 'yyyy-MM-dd'),
          bank_account: entry.bank_account,
          student_name: selectedStudent.name,
          roll_no: selectedStudent.roll_no,
          guardian_name: selectedStudent.guardian_name,
          branch_name: paymentBranch || selectedStudent.branch_name,
          semester_name: paymentCourse || selectedStudent.semester_name,
          created_at: savedItem.created_at || new Date().toISOString()
        } as Transaction);
      });
    }

    // Build main combined transaction object for receipt
    const primaryTx = savedTxList[0];
    const combinedTx: Transaction = {
      ...primaryTx,
      amount: totalPaymentAmount,
      payment_mode: savedTxList.map(t => t.payment_mode).join(', '),
      transaction_id: savedTxList.map(t => t.transaction_id || 'N/A').join(', '),
      splitTransactions: savedTxList
    };

    setLastTx(combinedTx);
    setIsSuccess(true);
    setIsModalOpen(false);
    loadRecentTransactions();

    // Reset entries form
    setPaymentEntries([createNewEntry()]);
  };

  const shareWhatsApp = () => {
    if (!lastTx) return;
    const phone = selectedStudent?.phone || (lastTx as any).phone || (lastTx as any).student_phone || '';
    const cleanPhone = phone.toString().replace(/[^0-9]/g, '');
    const orgName = settings?.name || 'MAYA GROUP OF INSTITUTIONS';

    const receiptNo = `RC-${lastTx.id < 100 ? 800 + lastTx.id : lastTx.id}`;
    const amountPaid = (lastTx.amount || 0).toFixed(2);
    const txDateStr = lastTx.created_at ? format(new Date(lastTx.created_at), 'dd-MM-yyyy HH:mm') : format(new Date(), 'dd-MM-yyyy HH:mm');

    let paymentSection = `Amount Paid: ₹${amountPaid}\nPayment Mode: ${cleanVal(lastTx.payment_mode)}\nTransaction ID: ${cleanVal(lastTx.transaction_id || 'N/A')}`;

    if (lastTx.splitTransactions && lastTx.splitTransactions.length > 1) {
      const splitItems = lastTx.splitTransactions.map((st, i) => 
        `  ${i + 1}. ₹${Number(st.amount).toFixed(2)} (${cleanVal(st.payment_mode)}) - Txn ID: ${cleanVal(st.transaction_id || 'N/A')}`
      ).join('\n');
      paymentSection = `*Payment Breakdown (${lastTx.splitTransactions.length} Transactions):*\n${splitItems}\n\n*Total Paid Amount: ₹${amountPaid}*`;
    }

    const msg = `🚩 *PAYMENT RECEIPT*\n*${orgName.toUpperCase()}*\n\nReceipt No: ${receiptNo}\nDate: ${txDateStr}\n\n*Student Details:*\nName: ${cleanVal(lastTx.student_name)}\nRoll No: ${cleanVal(lastTx.roll_no)}\nFather's Name: ${cleanVal(lastTx.guardian_name || 'N/A')}\nBranch: ${cleanVal(lastTx.branch_name || lastTx.branch || 'N/A')}\nSemester: ${cleanVal(lastTx.semester_name || lastTx.course || 'N/A')}\nSession: ${cleanVal(lastTx.academic_term || '2026-27')}\n\n*Payment Details:*\n${paymentSection}\n\nThank you for your payment!\nSoftware Developed by Digital Communique Private Limited`;

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

  const formatTxDate = (dateVal?: any) => {
    if (!dateVal) return 'N/A';
    try {
      const str = dateVal.toString().trim();
      if (!str) return 'N/A';

      // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
      const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(.*)/);
      if (ymdMatch) {
        const year = parseInt(ymdMatch[1], 10);
        const month = parseInt(ymdMatch[2], 10);
        const day = parseInt(ymdMatch[3], 10);
        const rest = ymdMatch[4] ? ymdMatch[4].trim() : '';
        let timeStr = '';
        if (rest && (rest.includes('T') || rest.includes(':') || rest.includes(' '))) {
          const d = new Date(str);
          if (!isNaN(d.getTime())) {
            let hours = d.getHours();
            const minutes = d.getMinutes().toString().padStart(2, '0');
            const seconds = d.getSeconds().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            timeStr = ` ${hours}:${minutes}:${seconds} ${ampm}`;
          }
        }
        return `${month}/${day}/${year}${timeStr}`;
      }

      // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
      const dmYMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(.*)/);
      if (dmYMatch) {
        const day = parseInt(dmYMatch[1], 10);
        const month = parseInt(dmYMatch[2], 10);
        const year = parseInt(dmYMatch[3], 10);
        const rest = dmYMatch[4] ? dmYMatch[4].trim() : '';
        return `${month}/${day}/${year}${rest ? ' ' + rest : ''}`;
      }

      const d = new Date(str);
      if (isNaN(d.getTime())) return str;
      const month = d.getMonth() + 1;
      const date = d.getDate();
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const seconds = d.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${month}/${date}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;
    } catch (e) {
      return String(dateVal);
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

  const getTxDateString = (tx: any): string => {
    const val = tx.transaction_date || tx.created_at;
    if (!val) return '';
    const str = val.toString().trim();

    // 1. ISO or YYYY-MM-DD format
    const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // 2. DD-MM-YYYY or DD/MM/YYYY
    const dmYMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (dmYMatch) {
      const day = dmYMatch[1].padStart(2, '0');
      const month = dmYMatch[2].padStart(2, '0');
      const year = dmYMatch[3];
      return `${year}-${month}-${day}`;
    }

    // 3. Date fallback with UTC extraction
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = d.getUTCDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  const filteredRecentTxs = (recentTxs || []).filter(tx => {
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      const name = (tx.student_name || tx.student?.name || '').toLowerCase();
      const roll = (tx.roll_no || tx.student?.roll_no || '').toLowerCase();
      const txId = (tx.transaction_id || '').toLowerCase();
      const mode = (tx.payment_mode || '').toLowerCase();
      const term = (tx.academic_term || '').toLowerCase();
      const matchesText = name.includes(q) || roll.includes(q) || txId.includes(q) || mode.includes(q) || term.includes(q);
      if (!matchesText) return false;
    }

    if (historyStartDate || historyEndDate) {
      const txDateStr = getTxDateString(tx);
      if (!txDateStr) return false;
      if (historyStartDate && txDateStr < historyStartDate) return false;
      if (historyEndDate && txDateStr > historyEndDate) return false;
    }

    return true;
  });

  // Analytics & Export State
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [chartMetric, setChartMetric] = useState<'daily' | 'mode'>('daily');
  const [heatmapMonth, setHeatmapMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  // Export Recent Transactions to Excel (.xlsx)
  const exportRecentTransactionsExcel = () => {
    if (!filteredRecentTxs || filteredRecentTxs.length === 0) {
      alert("No transactions available to export.");
      return;
    }

    const exportData = filteredRecentTxs.map((tx, idx) => ({
      "S.No": idx + 1,
      "Receipt No": `#DC-${1000 + tx.id}`,
      "Date": formatTxDate(tx.transaction_date || tx.created_at),
      "Student Name": cleanVal(tx.student_name || tx.student?.name || 'Student'),
      "Roll No": cleanVal(tx.roll_no || tx.student?.roll_no || ''),
      "Course/Semester": cleanVal(tx.semester_name || tx.course || tx.academic_term || ''),
      "Branch": cleanVal(tx.branch_name || tx.branch || ''),
      "Payment Mode": cleanVal(tx.payment_mode || 'UPI Digital'),
      "Transaction ID": cleanVal(tx.transaction_id || 'N/A'),
      "Academic Term": cleanVal(tx.academic_term || '2026-27'),
      "Amount (₹)": Number(tx.amount || 0)
    }));

    const totalSum = filteredRecentTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    exportData.push({
      "S.No": "",
      "Receipt No": "TOTAL SUMMARY",
      "Date": "",
      "Student Name": `Total ${filteredRecentTxs.length} Record(s)`,
      "Roll No": "",
      "Course/Semester": "",
      "Branch": "",
      "Payment Mode": "",
      "Transaction ID": "",
      "Academic Term": "",
      "Amount (₹)": totalSum
    } as any);

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Recent Transactions");
    const fileName = `Recent_Transactions_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export Recent Transactions to PDF Report
  const exportRecentTransactionsPDF = () => {
    if (!filteredRecentTxs || filteredRecentTxs.length === 0) {
      alert("No transactions available to export.");
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const orgName = settings?.org_name || 'DIGITAL COMMUNIQUE PRIVATE LIMITED';
    const totalAmount = filteredRecentTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(orgName.toUpperCase(), 14, 15);

    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text("RECENT TRANSACTIONS HISTORY REPORT", 14, 22);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const dateInfo = historyStartDate && historyEndDate 
      ? `Period: ${historyStartDate} to ${historyEndDate}` 
      : `Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`;
    doc.text(`${dateInfo} | Total Records: ${filteredRecentTxs.length} | Total Collection: Rs. ${totalAmount.toLocaleString('en-IN')}`, 14, 27);

    const tableRows = filteredRecentTxs.map((tx, idx) => [
      (idx + 1).toString(),
      `#DC-${1000 + tx.id}`,
      formatTxDate(tx.transaction_date || tx.created_at),
      cleanVal(tx.student_name || tx.student?.name || 'Student'),
      cleanVal(tx.roll_no || tx.student?.roll_no || ''),
      cleanVal(tx.payment_mode || 'UPI Digital'),
      cleanVal(tx.transaction_id || 'N/A'),
      cleanVal(tx.academic_term || '2026-27'),
      `Rs. ${Number(tx.amount || 0).toLocaleString('en-IN')}`
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['#', 'Receipt No', 'Date & Time', 'Student Name', 'Roll No', 'Mode', 'Transaction ID', 'Term', 'Amount']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 50 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 },
        6: { cellWidth: 40 },
        7: { cellWidth: 25 },
        8: { cellWidth: 30, halign: 'right' }
      },
      foot: [['', '', '', 'TOTAL SUMMARY', '', '', '', `${filteredRecentTxs.length} Txns`, `Rs. ${totalAmount.toLocaleString('en-IN')}`]],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold' }
    });

    doc.save(`Recent_Transactions_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  };

  // Print Recent Transactions Summary Report
  const printRecentTransactionsReport = () => {
    if (!filteredRecentTxs || filteredRecentTxs.length === 0) {
      alert("No transactions available to print.");
      return;
    }
    const orgName = settings?.org_name || 'DIGITAL COMMUNIQUE PRIVATE LIMITED';
    const totalAmount = filteredRecentTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    const modeTotals: Record<string, number> = {};
    filteredRecentTxs.forEach(tx => {
      const mode = cleanVal(tx.payment_mode) || 'UPI Digital';
      modeTotals[mode] = (modeTotals[mode] || 0) + Number(tx.amount || 0);
    });

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Recent Transactions Report</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                body { margin: 0; padding: 20px; }
              }
            </style>
          </head>
          <body class="bg-white text-slate-900 p-8 font-sans">
            <div class="flex justify-between items-start border-b pb-4 mb-6">
              <div>
                <h1 class="text-2xl font-black uppercase text-slate-900">${orgName}</h1>
                <h2 class="text-base font-bold text-slate-600 mt-1">RECENT TRANSACTION HISTORY REPORT</h2>
                <p class="text-xs text-slate-500 mt-1">
                  Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')} 
                  ${historyStartDate && historyEndDate ? ` | Filter Range: ${historyStartDate} to ${historyEndDate}` : ''}
                </p>
              </div>
              <div class="text-right">
                <span class="inline-block bg-emerald-100 text-emerald-800 text-sm font-black px-4 py-2 rounded-xl">
                  Total Collection: ₹${totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <!-- Mode Breakdown -->
            <div class="grid grid-cols-4 gap-4 mb-6">
              <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <p class="text-[10px] font-bold text-slate-400 uppercase">Total Records</p>
                <p class="text-lg font-black text-slate-800">${filteredRecentTxs.length}</p>
              </div>
              ${Object.entries(modeTotals).map(([mode, amt]) => `
                <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <p class="text-[10px] font-bold text-slate-400 uppercase">${mode}</p>
                  <p class="text-lg font-black text-emerald-700">₹${amt.toLocaleString('en-IN')}</p>
                </div>
              `).join('')}
            </div>

            <!-- Data Table -->
            <table class="w-full text-left border-collapse text-xs mb-8">
              <thead>
                <tr class="bg-slate-900 text-white font-bold">
                  <th class="p-2 border">#</th>
                  <th class="p-2 border">Receipt No</th>
                  <th class="p-2 border">Date & Time</th>
                  <th class="p-2 border">Student Name</th>
                  <th class="p-2 border">Roll No</th>
                  <th class="p-2 border">Mode</th>
                  <th class="p-2 border">Txn ID</th>
                  <th class="p-2 border">Term</th>
                  <th class="p-2 border text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                ${filteredRecentTxs.map((tx, idx) => `
                  <tr class="hover:bg-slate-50">
                    <td class="p-2 border font-bold text-slate-500">${idx + 1}</td>
                    <td class="p-2 border font-mono font-bold text-slate-900">#DC-${1000 + tx.id}</td>
                    <td class="p-2 border text-slate-600">${formatTxDate(tx.transaction_date || tx.created_at)}</td>
                    <td class="p-2 border font-bold text-slate-800">${cleanVal(tx.student_name || tx.student?.name || 'Student')}</td>
                    <td class="p-2 border font-mono text-slate-600">${cleanVal(tx.roll_no || tx.student?.roll_no || '')}</td>
                    <td class="p-2 border font-semibold text-slate-700">${cleanVal(tx.payment_mode || 'UPI Digital')}</td>
                    <td class="p-2 border font-mono text-slate-600">${cleanVal(tx.transaction_id || 'N/A')}</td>
                    <td class="p-2 border text-slate-600">${cleanVal(tx.academic_term || '2026-27')}</td>
                    <td class="p-2 border text-right font-bold text-emerald-700">₹${Number(tx.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="bg-slate-100 font-black text-slate-900 text-sm">
                  <td colspan="8" class="p-3 border text-right uppercase">Total Amount Collected</td>
                  <td class="p-3 border text-right text-emerald-700">₹${totalAmount.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>

            <div class="flex justify-between items-end pt-8 text-xs text-slate-500">
              <div>
                <p class="font-bold text-slate-700">Digital Communique Fee System</p>
                <p>System Generated Report</p>
              </div>
              <div class="text-center border-t border-slate-400 pt-2 min-w-[150px]">
                <p class="font-bold text-slate-800">Authorized Signature</p>
              </div>
            </div>

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
    }
  };

  // Chart Computations
  const dailyChartData = useMemo(() => {
    const map: Record<string, { date: string; displayDate: string; amount: number; count: number }> = {};
    (filteredRecentTxs || []).forEach(tx => {
      const dStr = getTxDateString(tx);
      if (!dStr) return;
      if (!map[dStr]) {
        let disp = dStr;
        try {
          const parts = dStr.split('-');
          if (parts.length === 3) {
            disp = `${parts[2]}/${parts[1]}`;
          }
        } catch (e) {}
        map[dStr] = { date: dStr, displayDate: disp, amount: 0, count: 0 };
      }
      map[dStr].amount += Number(tx.amount || 0);
      map[dStr].count += 1;
    });

    const keys = Object.keys(map).sort();
    return keys.map(k => map[k]);
  }, [filteredRecentTxs]);

  const modeChartData = useMemo(() => {
    const map: Record<string, { mode: string; amount: number; count: number }> = {
      'UPI Digital': { mode: 'UPI Digital', amount: 0, count: 0 },
      'Cash': { mode: 'Cash', amount: 0, count: 0 },
      'Bank Transfer': { mode: 'Bank Transfer', amount: 0, count: 0 },
      'Cheque': { mode: 'Cheque', amount: 0, count: 0 }
    };
    (filteredRecentTxs || []).forEach(tx => {
      const m = cleanVal(tx.payment_mode) || 'UPI Digital';
      if (!map[m]) {
        map[m] = { mode: m, amount: 0, count: 0 };
      }
      map[m].amount += Number(tx.amount || 0);
      map[m].count += 1;
    });
    return Object.values(map);
  }, [filteredRecentTxs]);

  // Heatmap Computations
  const heatmapGridData = useMemo(() => {
    const [yearStr, monthStr] = (heatmapMonth || format(new Date(), 'yyyy-MM')).split('-');
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const monthIdx = (parseInt(monthStr, 10) || (new Date().getMonth() + 1)) - 1;

    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, monthIdx, 1).getDay(); // 0 = Sun

    const txMap: Record<string, { amount: number; count: number }> = {};
    (recentTxs || []).forEach(tx => {
      const dStr = getTxDateString(tx);
      if (!dStr) return;
      if (!txMap[dStr]) txMap[dStr] = { amount: 0, count: 0 };
      txMap[dStr].amount += Number(tx.amount || 0);
      txMap[dStr].count += 1;
    });

    const cells = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ empty: true, key: `empty-${i}` });
    }

    let monthTotal = 0;
    let monthTxCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayPadded = d.toString().padStart(2, '0');
      const monthPadded = (monthIdx + 1).toString().padStart(2, '0');
      const dateStr = `${year}-${monthPadded}-${dayPadded}`;
      const data = txMap[dateStr] || { amount: 0, count: 0 };

      monthTotal += data.amount;
      monthTxCount += data.count;

      let intensity = 0;
      if (data.amount > 0) {
        if (data.amount <= 10000) intensity = 1;
        else if (data.amount <= 30000) intensity = 2;
        else if (data.amount <= 75000) intensity = 3;
        else intensity = 4;
      }

      cells.push({
        empty: false,
        dayNumber: d,
        dateStr,
        amount: data.amount,
        count: data.count,
        intensity,
        key: dateStr
      });
    }

    const monthName = format(new Date(year, monthIdx, 1), 'MMMM yyyy');

    return { cells, year, monthIdx, monthName, monthTotal, monthTxCount };
  }, [recentTxs, heatmapMonth]);

  const changeHeatmapMonth = (delta: number) => {
    const [y, m] = heatmapMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setHeatmapMonth(format(d, 'yyyy-MM'));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {!isSuccess ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-5 sm:p-8 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold">Record Payment</h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">Search student and record payment details or upload PDF collection sheet</p>
            </div>
            <button 
              type="button"
              onClick={() => {
                setPdfParseError(null);
                setIsPdfUploadModalOpen(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <UploadCloud size={18} />
              <span>Upload Collections PDF Sheet</span>
            </button>
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
                            setPaymentCourse(s.semester_name || '');
                            setPaymentBranch(s.branch_name || '');
                            if (s.semester_name) {
                              setAcademicTerm(s.semester_name);
                            }
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

            <form onSubmit={handleSavePayment} className="space-y-6">
              {/* Course, Branch & Academic Term */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Course</label>
                  <input 
                    readOnly
                    type="text"
                    value={paymentCourse}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 font-medium outline-none cursor-not-allowed text-sm"
                    placeholder="Course Name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch</label>
                  <input 
                    readOnly
                    type="text"
                    value={paymentBranch}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 font-medium outline-none cursor-not-allowed text-sm"
                    placeholder="Branch Name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Term / Session *</label>
                  <input 
                    required
                    type="text"
                    value={academicTerm}
                    onChange={e => setAcademicTerm(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium"
                    placeholder="e.g. Sem I / 2026-27"
                  />
                </div>
              </div>

              {/* Multi-Transaction Entries Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Layers size={18} className="text-emerald-600" />
                      Transaction Entries / Split Payment ({paymentEntries.length})
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Record single or multiple transaction entries for different payment modes or dates.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addEntry}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all shadow-sm"
                  >
                    <Plus size={16} />
                    Add Transaction Entry
                  </button>
                </div>

                <div className="space-y-4">
                  {paymentEntries.map((entry, index) => (
                    <div 
                      key={entry.id} 
                      className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4 transition-all relative hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                            Transaction #{index + 1}
                          </span>
                        </div>
                        {paymentEntries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEntry(entry.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1 text-xs font-semibold"
                          >
                            <Trash2 size={15} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount (₹) *</label>
                          <input 
                            required
                            type="number"
                            step="any"
                            value={entry.amount}
                            onChange={e => updateEntry(entry.id, 'amount', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-base font-bold bg-white"
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment Mode *</label>
                          <select 
                            value={entry.payment_mode}
                            onChange={e => updateEntry(entry.id, 'payment_mode', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm font-medium"
                          >
                            <option value="UPI Digital">UPI Digital</option>
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cheque">Cheque</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Transaction ID {entry.payment_mode !== 'Cash' && '*'}
                          </label>
                          <input 
                            required={entry.payment_mode !== 'Cash'}
                            type="text"
                            value={entry.transaction_id}
                            onChange={e => updateEntry(entry.id, 'transaction_id', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
                            placeholder={entry.payment_mode === 'Cash' ? 'Optional for Cash' : 'Mandatory for Digital'}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transaction Date *</label>
                          <input 
                            required
                            type="date"
                            value={entry.transaction_date}
                            onChange={e => updateEntry(entry.id, 'transaction_date', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm font-medium"
                          />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bank Account Number (Optional)</label>
                          <input 
                            type="text"
                            value={entry.bank_account}
                            onChange={e => updateEntry(entry.id, 'bank_account', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
                            placeholder="e.g. XXXX XXXX 1234"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary & Submit */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-md">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Amount to Record</p>
                    <p className="text-2xl font-black text-emerald-400">₹ {totalPaymentAmount.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-bold border border-slate-700">
                      {paymentEntries.length} {paymentEntries.length === 1 ? 'Transaction' : 'Transactions / Splits'}
                    </span>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={!selectedStudent || totalPaymentAmount <= 0}
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
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 md:p-8 space-y-5 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <History size={20} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Recent Transaction History</h3>
            </div>
            <p className="text-slate-500 text-xs mt-1">Live overview, analytical visual charts, and report generation</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Upload PDF Sheet */}
            <button 
              onClick={() => {
                setPdfParseError(null);
                setIsPdfUploadModalOpen(true);
              }}
              className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title="Upload PDF Financial Collection Sheet"
            >
              <UploadCloud size={15} />
              <span>Upload PDF Sheet</span>
            </button>

            {/* Toggle Analytics Card */}
            <button 
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm",
                showAnalytics 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              )}
            >
              <BarChart3 size={15} />
              <span>{showAnalytics ? 'Hide Visual Analytics' : 'Show Charts & Heatmap'}</span>
            </button>

            {/* Export Excel Report */}
            <button 
              onClick={exportRecentTransactionsExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title="Download Excel Report"
            >
              <FileSpreadsheet size={15} />
              <span>Excel Report</span>
            </button>

            {/* Export PDF Report */}
            <button 
              onClick={exportRecentTransactionsPDF}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title="Download PDF Report"
            >
              <FileDown size={15} />
              <span>PDF Report</span>
            </button>

            {/* Print Report */}
            <button 
              onClick={printRecentTransactionsReport}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title="Print Summary Report"
            >
              <Printer size={15} />
              <span>Print Report</span>
            </button>

            {/* Refresh */}
            <button 
              onClick={loadRecentTransactions}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
              title="Refresh transaction list"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Visual Analytics Panel (Bar Chart & Daily Density Heat Map) */}
        <AnimatePresence>
          {showAnalytics && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-4 pt-1"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Bar Chart Panel (7 cols) */}
                <div className="lg:col-span-7 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                        <TrendingUp size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Fee Collection Bar Chart</h4>
                        <p className="text-[11px] text-slate-500">Visual breakdown of transactions</p>
                      </div>
                    </div>

                    {/* Metric Toggle */}
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
                      <button
                        onClick={() => setChartMetric('daily')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg transition-all text-[11px]",
                          chartMetric === 'daily'
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        Daily Collections
                      </button>
                      <button
                        onClick={() => setChartMetric('mode')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg transition-all text-[11px]",
                          chartMetric === 'mode'
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        Mode Breakdown
                      </button>
                    </div>
                  </div>

                  {/* Recharts Bar Chart Container */}
                  <div className="h-56 w-full pt-2">
                    {chartMetric === 'daily' ? (
                      dailyChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: '#64748B' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} />
                            <RechartsTooltip 
                              formatter={(value: any) => [`₹ ${Number(value).toLocaleString('en-IN')}`, 'Collection Amount']}
                              labelFormatter={(label) => `Date: ${label}`}
                              contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }}
                            />
                            <Bar dataKey="amount" fill="#059669" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                          No transaction data in selected range
                        </div>
                      )
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={modeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="mode" tick={{ fontSize: 11, fill: '#64748B' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} />
                          <RechartsTooltip 
                            formatter={(value: any, name: any, item: any) => [`₹ ${Number(value).toLocaleString('en-IN')} (${item.payload.count} txns)`, 'Total Collected']}
                            contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }}
                          />
                          <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                            {modeChartData.map((entry, index) => {
                              const colors = ['#2563EB', '#059669', '#7C3AED', '#D97706'];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Heat Map Panel (5 cols) */}
                <div className="lg:col-span-5 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                        <Grid size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Collection Heatmap</h4>
                        <p className="text-[11px] text-slate-500">Daily density & activity intensity</p>
                      </div>
                    </div>

                    {/* Month Controls */}
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => changeHeatmapMonth(-1)}
                        className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                        title="Previous Month"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-extrabold text-slate-800 px-1">
                        {heatmapGridData.monthName}
                      </span>
                      <button 
                        onClick={() => changeHeatmapMonth(1)}
                        className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                        title="Next Month"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Calendar Heatmap Grid */}
                  <div className="space-y-1.5 pt-1">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {heatmapGridData.cells.map((cell) => {
                        if (cell.empty) {
                          return <div key={cell.key} className="h-8 rounded-lg bg-transparent" />;
                        }

                        let bgClass = "bg-white border-slate-200 text-slate-600 hover:border-slate-400";
                        if (cell.intensity === 1) bgClass = "bg-emerald-100 border-emerald-300 text-emerald-900 font-bold";
                        else if (cell.intensity === 2) bgClass = "bg-emerald-300 border-emerald-400 text-emerald-950 font-black";
                        else if (cell.intensity === 3) bgClass = "bg-emerald-500 border-emerald-600 text-white font-black";
                        else if (cell.intensity === 4) bgClass = "bg-emerald-700 border-emerald-800 text-white font-black shadow-sm";

                        const isSelectedDate = historyStartDate === cell.dateStr && historyEndDate === cell.dateStr;

                        return (
                          <button
                            key={cell.key}
                            onClick={() => {
                              setHistoryStartDate(cell.dateStr);
                              setHistoryEndDate(cell.dateStr);
                              setDatePreset('custom');
                            }}
                            title={`${cell.dateStr}: ₹${cell.amount.toLocaleString('en-IN')} (${cell.count} txns)`}
                            className={cn(
                              "h-8 rounded-lg border text-[11px] flex items-center justify-center transition-all relative group cursor-pointer",
                              bgClass,
                              isSelectedDate && "ring-2 ring-blue-600 ring-offset-1 scale-105 z-10"
                            )}
                          >
                            <span>{cell.dayNumber}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Heatmap Legend */}
                  <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 pt-2 border-t border-slate-200/60">
                    <span className="font-semibold text-slate-600">Legend:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-white border border-slate-200" />
                        <span>₹0</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300" />
                        <span>≤10k</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-300 border border-emerald-400" />
                        <span>≤30k</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                        <span>≤75k</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-700" />
                        <span>&gt;75k</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Date Filter & Search Controls */}
        <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Date Preset & Custom Range */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
              <Calendar size={15} className="text-blue-600" />
              <span>Date Filter:</span>
            </div>

            {/* Quick Presets */}
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>

            {/* Date Inputs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase">From</span>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => {
                    setHistoryStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="text-xs text-slate-700 font-medium bg-transparent outline-none cursor-pointer"
                />
              </div>

              <span className="text-xs text-slate-400 font-bold">-</span>

              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => {
                    setHistoryEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="text-xs text-slate-700 font-medium bg-transparent outline-none cursor-pointer"
                />
              </div>
            </div>

            {(historyStartDate || historyEndDate || datePreset !== 'all') && (
              <button
                onClick={() => handlePresetChange('all')}
                className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1"
                title="Clear date filter"
              >
                <XCircle size={14} />
                Clear Date
              </button>
            )}
          </div>

          {/* Right: Search Input */}
          <div className="relative min-w-[220px] flex-1 lg:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input 
              type="text"
              placeholder="Search transactions..."
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Filter summary status badge if any filter active */}
        {(historyStartDate || historyEndDate || historySearch) && (
          <div className="flex items-center justify-between text-xs text-slate-600 bg-blue-50/60 px-3.5 py-2 rounded-xl border border-blue-100">
            <span className="font-medium">
              Showing <strong className="font-bold text-blue-900">{filteredRecentTxs.length}</strong> transaction{filteredRecentTxs.length !== 1 ? 's' : ''}
              {historyStartDate && historyEndDate ? ` from ${historyStartDate} to ${historyEndDate}` : (historyStartDate ? ` from ${historyStartDate}` : (historyEndDate ? ` up to ${historyEndDate}` : ''))}
              {historySearch ? ` matching "${historySearch}"` : ''}
            </span>
            <button
              onClick={() => {
                handlePresetChange('all');
                setHistorySearch('');
              }}
              className="text-blue-700 hover:text-blue-900 underline font-bold text-[11px]"
            >
              Reset Filters
            </button>
          </div>
        )}

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
              {filteredRecentTxs.slice(0, (historyStartDate || historyEndDate || historySearch) ? 100 : 25).map((tx) => (
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
                    {formatTxDate(tx.transaction_date || tx.created_at)}
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

      {/* Upload Financial Collections PDF Modal */}
      <AnimatePresence>
        {isPdfUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white shadow-lg shadow-amber-500/30">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold tracking-tight">Upload Financial Collections PDF</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Automated AI extraction & directory student matching powered by Gemini 3.6</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPdfUploadModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Upload Box / Action Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50 hover:bg-amber-50/30 rounded-2xl p-6 text-center transition-all cursor-pointer relative group">
                    <input 
                      type="file" 
                      accept=".pdf"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          handlePdfFileSelect(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                      <div className="p-3 bg-white shadow-md rounded-2xl text-amber-600 group-hover:scale-110 transition-transform">
                        <UploadCloud size={28} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Click to browse or drag & drop Financial Collection PDF Data Sheet
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Supports daily fee registers, bank statements, and collection reports (.pdf)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                        <FileText size={16} />
                        <span>PDF Format Templates</span>
                      </div>
                      <p className="text-[11px] text-amber-900/80 mt-1 leading-snug">
                        Upload either format — missing fields (Roll No, Mode, Remarks) are automatically converted & auto-filled with dummy text!
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <button 
                        type="button"
                        onClick={handleDownloadFormat1Pdf}
                        className="w-full py-2 px-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-extrabold transition-all flex items-center justify-between gap-1 shadow-sm"
                        title="8 Columns: S.No, Student Name, Roll / ID No, Amount, Payment Mode, Transaction ID, Date, Remarks"
                      >
                        <span className="truncate">Download Format 1 (Image 1: 8-Cols)</span>
                        <Download size={13} className="shrink-0" />
                      </button>
                      <button 
                        type="button"
                        onClick={handleDownloadFormat2Pdf}
                        className="w-full py-2 px-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[11px] font-extrabold transition-all flex items-center justify-between gap-1 shadow-sm"
                        title="4 Columns: Student, Transaction, Amount, Date"
                      >
                        <span className="truncate">Download Format 2 (Image 2: 4-Cols)</span>
                        <Download size={13} className="shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Parsing Loader */}
                {isParsingPdf && (
                  <div className="p-8 bg-blue-50/80 border border-blue-200 rounded-2xl flex flex-col items-center justify-center space-y-3 text-center">
                    <RefreshCw className="animate-spin text-blue-600" size={32} />
                    <div>
                      <p className="text-sm font-bold text-blue-900">Extracting Fee Collections with Gemini AI...</p>
                      <p className="text-xs text-blue-700 mt-0.5">Analyzing document structure, payment modes, amounts, and student IDs</p>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {pdfParseError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800">
                    <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold">{pdfParseError}</p>
                    </div>
                  </div>
                )}

                {/* Extracted Records Review Table */}
                {parsedPdfRecords.length > 0 && !isParsingPdf && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100 p-4 rounded-2xl">
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
                        <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                          Total Parsed: <span className="text-blue-600 font-mono text-sm">{parsedPdfRecords.length}</span>
                        </span>
                        <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                          Selected: <span className="text-emerald-600 font-mono text-sm">{selectedPdfRowIds.size}</span>
                        </span>
                        <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                          Total Amount: <span className="text-emerald-700 font-mono text-sm">₹{parsedPdfRecords
                            .filter(r => selectedPdfRowIds.has(r.id))
                            .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
                            .toLocaleString()}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={handleExportConvertedFormat1Pdf}
                          className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shrink-0"
                          title="Export extracted data as standardized 8-Column PDF (Image 1 Format)"
                        >
                          <Download size={13} />
                          <span>Export Converted PDF (Image 1)</span>
                        </button>

                        <div className="relative w-full sm:w-56">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            type="text"
                            placeholder="Filter extracted items..."
                            value={pdfSearchQuery}
                            onChange={e => setPdfSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white max-h-[42vh]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 bg-slate-900 text-white z-10 font-bold">
                          <tr>
                            <th className="p-3 w-10 text-center">
                              <input 
                                type="checkbox"
                                checked={selectedPdfRowIds.size === parsedPdfRecords.length && parsedPdfRecords.length > 0}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSelectedPdfRowIds(new Set(parsedPdfRecords.map(r => r.id)));
                                  } else {
                                    setSelectedPdfRowIds(new Set());
                                  }
                                }}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                            </th>
                            <th className="p-3">Matched Student in System</th>
                            <th className="p-3">PDF Raw Identifier</th>
                            <th className="p-3">Amount (₹)</th>
                            <th className="p-3">Payment Mode</th>
                            <th className="p-3">Transaction / UTR ID</th>
                            <th className="p-3">Date</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {parsedPdfRecords
                            .filter(r => 
                              !pdfSearchQuery || 
                              (r.raw_identifier && r.raw_identifier.toLowerCase().includes(pdfSearchQuery.toLowerCase())) ||
                              (r.matched_student_name && r.matched_student_name.toLowerCase().includes(pdfSearchQuery.toLowerCase())) ||
                              (r.transaction_id && r.transaction_id.toLowerCase().includes(pdfSearchQuery.toLowerCase()))
                            )
                            .map((record) => {
                              const isSelected = selectedPdfRowIds.has(record.id);
                              return (
                                <tr key={record.id} className={isSelected ? 'bg-emerald-50/40 hover:bg-emerald-50/80' : 'hover:bg-slate-50'}>
                                  <td className="p-3 text-center">
                                    <input 
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        const newSet = new Set(selectedPdfRowIds);
                                        if (newSet.has(record.id)) newSet.delete(record.id);
                                        else newSet.add(record.id);
                                        setSelectedPdfRowIds(newSet);
                                      }}
                                      className="rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <select 
                                      value={record.matched_student_id || ''}
                                      onChange={e => {
                                        const stId = Number(e.target.value);
                                        const st = students.find(s => s.id === stId);
                                        setParsedPdfRecords(prev => prev.map(p => p.id === record.id ? {
                                          ...p,
                                          matched_student_id: stId || null,
                                          matched_student_name: st ? st.name : '',
                                          matched_roll_no: st ? st.roll_no : ''
                                        } : p));
                                      }}
                                      className={cn(
                                        "w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold outline-none",
                                        record.matched_student_id 
                                          ? "border-emerald-300 bg-emerald-50/50 text-emerald-900" 
                                          : "border-rose-300 bg-rose-50/50 text-rose-900"
                                      )}
                                    >
                                      <option value="">-- Select Student --</option>
                                      {students.map(s => (
                                        <option key={s.id} value={s.id}>
                                          {s.name} ({s.roll_no || 'No Roll'})
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-3 font-semibold text-slate-800">
                                    {record.raw_identifier || 'N/A'}
                                  </td>
                                  <td className="p-3">
                                    <input 
                                      type="number"
                                      value={record.amount}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setParsedPdfRecords(prev => prev.map(p => p.id === record.id ? { ...p, amount: val } : p));
                                      }}
                                      className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <select 
                                      value={record.payment_mode}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setParsedPdfRecords(prev => prev.map(p => p.id === record.id ? { ...p, payment_mode: val } : p));
                                      }}
                                      className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold bg-white"
                                    >
                                      <option value="UPI">UPI</option>
                                      <option value="Cash">Cash</option>
                                      <option value="Bank Transfer">Bank Transfer</option>
                                      <option value="Online">Online</option>
                                      <option value="DD">DD</option>
                                      <option value="Cheque">Cheque</option>
                                    </select>
                                  </td>
                                  <td className="p-3">
                                    <input 
                                      type="text"
                                      value={record.transaction_id}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setParsedPdfRecords(prev => prev.map(p => p.id === record.id ? { ...p, transaction_id: val } : p));
                                      }}
                                      placeholder="Txn ID..."
                                      className="w-28 px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <input 
                                      type="date"
                                      value={record.transaction_date}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setParsedPdfRecords(prev => prev.map(p => p.id === record.id ? { ...p, transaction_date: val } : p));
                                      }}
                                      className="px-2 py-1 border border-slate-200 rounded-lg text-xs"
                                    />
                                  </td>
                                  <td className="p-3 text-center">
                                    <button 
                                      onClick={() => {
                                        setParsedPdfRecords(prev => prev.filter(p => p.id !== record.id));
                                        const newSet = new Set(selectedPdfRowIds);
                                        newSet.delete(record.id);
                                        setSelectedPdfRowIds(newSet);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Remove Row"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Import Status Toast */}
                {pdfImportStatus && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>{pdfImportStatus}</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button 
                  onClick={() => setIsPdfUploadModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors w-full sm:w-auto"
                >
                  Cancel
                </button>

                {parsedPdfRecords.length > 0 && (
                  <button 
                    onClick={handleBulkImportPdfRecords}
                    disabled={isImportingPdfRecords || selectedPdfRowIds.size === 0}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 w-full sm:w-auto"
                  >
                    {isImportingPdfRecords ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Importing Collections...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Confirm & Import {selectedPdfRowIds.size} Collection Records</span>
                      </>
                    )}
                  </button>
                )}
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
