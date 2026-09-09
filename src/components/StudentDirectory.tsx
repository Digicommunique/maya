import React, { useState, useEffect, useMemo } from 'react';
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
  Users,
  Upload,
  MessageCircle,
  Share2,
  History,
  Printer,
  FileDown,
  Loader2,
  UserCheck
} from 'lucide-react';
import { safeFetchJson } from '../utils/api';
import { motion, AnimatePresence } from 'motion/react';
import { Student, FeePlan, Branch, Semester, Session, OrgSettings } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { formatAppDate, formatDateDDMMYYYY } from '../utils/dateFormat';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';
import Receipt from './Receipt';
import CourseSessionStudentBreakdown from './CourseSessionStudentBreakdown';

export default function StudentDirectory({ user }: { user?: any }) {
  const isAccountant = user?.role === 'accountant';
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<FeePlan[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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

  const [importStatus, setImportStatus] = useState<{
    isOpen: boolean;
    total: number;
    processed: number;
    successCount: number;
    failCount: number;
    errors: string[];
  } | null>(null);

  const [studentTxs, setStudentTxs] = useState<any[]>([]);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [printingTx, setPrintingTx] = useState<any | null>(null);

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
    const orgName = orgSettings?.name || 'MAYA GROUP OF INSTITUTIONS';
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
    setIsLoading(true);
    Promise.all([
      safeFetchJson('/api/students', undefined, []),
      safeFetchJson('/api/fee-plans', undefined, []),
      safeFetchJson('/api/settings', undefined, null)
    ]).then(([studentsData, plansData, settingsData]) => {
      const rawStudents = Array.isArray(studentsData) ? studentsData : [];
      // Sort students so latest enrolled/added student appears at the top
      rawStudents.sort((a: any, b: any) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (timeA && timeB && !isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
          return timeB - timeA;
        }
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        return idB - idA;
      });
      setStudents(rawStudents);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setBranches(settingsData?.branches || []);
      setSemesters(settingsData?.semesters || []);
      setSessions(settingsData?.sessions || []);
      setOrgSettings(settingsData?.settings || settingsData || null);
    }).catch(err => {
      console.error("fetchData error:", err);
      setStudents([]);
      setPlans([]);
      setBranches([]);
      setSemesters([]);
      setSessions([]);
    }).finally(() => {
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
    const method = editingStudent ? 'PUT' : 'POST';

    const payload: any = {
      ...newStudent
    };

    if (editingStudent) {
      payload.edited_by = 'Accountant';
      payload.previous_data = {
        name: editingStudent.name,
        guardian_name: editingStudent.guardian_name,
        roll_no: editingStudent.roll_no,
        phone: editingStudent.phone,
        plan_name: editingStudent.plan_name,
        branch_name: editingStudent.branch_name,
        semester_name: editingStudent.semester_name,
        session_name: editingStudent.session_name,
        plan_id: editingStudent.plan_id,
        branch_id: editingStudent.branch_id,
        semester_id: editingStudent.semester_id,
        session_id: editingStudent.session_id
      };
    }

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(async res => {
      if (res.ok) {
        fetchData();
        setIsModalOpen(false);
        setEditingStudent(null);
        setNewStudent({
          name: '', guardian_name: '', roll_no: '', phone: '',
          plan_id: '', branch_id: '', semester_id: '', session_id: ''
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(editingStudent ? 'Update failed' : (errData.message || 'Roll Number already exists'));
      }
    });
  };

  const safeFormatDate = (dateVal: any, pattern?: string) => {
    return formatAppDate(dateVal, true);
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

  const startView = async (student: Student) => {
    setViewingStudent(student);
    setIsViewModalOpen(true);
    setStudentTxs([]);

    try {
      const res = await fetch('/api/transactions');
      const allTxs = await res.json();
      if (Array.isArray(allTxs)) {
        const filtered = allTxs.filter((t: any) => t.student_id === student.id || (student.roll_no && t.roll_no === student.roll_no));
        // Sort ascending chronologically
        filtered.sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || a.transaction_date).getTime();
          const dateB = new Date(b.created_at || b.transaction_date).getTime();
          return dateA - dateB;
        });

        // Calculate running total and running balance
        let runningTotal = 0;
        const matchedPlan = plans.find(p => p.id === student.plan_id);
        const planTotal = matchedPlan?.total_amount || 0;

        const withLedger = filtered.map((t: any) => {
          runningTotal += Number(t.amount || 0);
          return {
            ...t,
            running_paid: runningTotal,
            running_balance: planTotal - runningTotal
          };
        });

        setStudentTxs(withLedger);
      }
    } catch (err) {
      console.error("Failed to load student transactions:", err);
    }
  };

  const deleteStudent = (id: number) => {
    if (confirm('Are you sure? This will delete all records for this student.')) {
      fetch(`/api/students/${id}`, { method: 'DELETE' }).then(fetchData);
    }
  };

  const filteredStudents = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    const result = (students || []).filter(s => {
      const matchesSearch = !searchLower || 
        (s.name || '').toLowerCase().includes(searchLower) || 
        (s.roll_no || '').toLowerCase().includes(searchLower) ||
        (s.phone || '').includes(searchLower);
      
      const matchesPlan = filters.plan === 'all' || Number(s.plan_id) === Number(filters.plan);
      const matchesBranch = filters.branch === 'all' || Number(s.branch_id) === Number(filters.branch);
      const matchesSemester = filters.semester === 'all' || Number(s.semester_id) === Number(filters.semester);

      return matchesSearch && matchesPlan && matchesBranch && matchesSemester;
    });

    return result.sort((a: any, b: any) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA && timeB && !isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
        return timeB - timeA;
      }
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      return idB - idA;
    });
  }, [students, search, filters]);

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

  const resolvePlan = (name: string, currentPlans: FeePlan[]) => {
    if (!name) return currentPlans[0]?.id?.toString() || '';
    const cleanName = name.toString().trim();
    const existing = currentPlans.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
    return existing ? existing.id.toString() : (currentPlans[0]?.id?.toString() || '');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so same file can be uploaded again
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          alert("The uploaded CSV/Excel file appears to be empty.");
          return;
        }

        // Initialize status
        setImportStatus({
          isOpen: true,
          total: data.length,
          processed: 0,
          successCount: 0,
          failCount: 0,
          errors: []
        });

        // Fetch fresh settings & plans to make sure we have the latest master data
        const [plansRes, settingsRes] = await Promise.all([
          fetch('/api/fee-plans').then(r => r.json()),
          fetch('/api/settings').then(r => r.json())
        ]);

        let currentPlans = Array.isArray(plansRes) ? plansRes : plans;
        let currentBranches = settingsRes?.branches || branches;
        let currentSemesters = settingsRes?.semesters || semesters;
        let currentSessions = settingsRes?.sessions || sessions;

        // Keep local copies
        let activeBranches = [...currentBranches];
        let activeSemesters = [...currentSemesters];
        let activeSessions = [...currentSessions];

        const findValue = (row: any, possibleKeys: string[]) => {
          for (const key of Object.keys(row)) {
            const normalizedKey = key.trim().toLowerCase();
            if (possibleKeys.map(k => k.toLowerCase()).includes(normalizedKey)) {
              return row[key];
            }
          }
          return '';
        };

        // 1. Gather all unique branches, semesters, and sessions needed
        const uniqueBranchesNeeded = new Set<string>();
        const uniqueSemestersNeeded = new Set<string>();
        const uniqueSessionsNeeded = new Set<string>();

        data.forEach((row: any) => {
          const br = findValue(row, ['branch', 'stream', 'branch_name']);
          const sem = findValue(row, ['semester', 'sem', 'semester_name']);
          const sess = findValue(row, ['session', 'academic session', 'year', 'session_name']);
          
          if (br && br.toString().trim()) uniqueBranchesNeeded.add(br.toString().trim());
          if (sem && sem.toString().trim()) uniqueSemestersNeeded.add(sem.toString().trim());
          if (sess && sess.toString().trim()) uniqueSessionsNeeded.add(sess.toString().trim());
        });

        // Add default auto fallbacks if needed
        uniqueBranchesNeeded.add('[Auto] General');
        uniqueSemestersNeeded.add('[Auto] Semester 1');
        uniqueSessionsNeeded.add('[Auto] 2025-2026');

        // Create missing master data in parallel
        let masterCreated = false;
        const branchCreatePromises = Array.from(uniqueBranchesNeeded).filter(
          b => !activeBranches.some(ext => ext.name.toLowerCase() === b.toLowerCase())
        ).map(bName => fetch('/api/settings/branch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: bName })
        }));

        const semCreatePromises = Array.from(uniqueSemestersNeeded).filter(
          s => !activeSemesters.some(ext => ext.name.toLowerCase() === s.toLowerCase())
        ).map(sName => fetch('/api/settings/semester', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: sName })
        }));

        const sessCreatePromises = Array.from(uniqueSessionsNeeded).filter(
          ss => !activeSessions.some(ext => ext.name.toLowerCase() === ss.toLowerCase())
        ).map(ssName => fetch('/api/settings/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: ssName })
        }));

        if (branchCreatePromises.length > 0 || semCreatePromises.length > 0 || sessCreatePromises.length > 0) {
          masterCreated = true;
          await Promise.all([...branchCreatePromises, ...semCreatePromises, ...sessCreatePromises]);
        }

        if (masterCreated) {
          const freshSettings = await fetch('/api/settings').then(r => r.json()).catch(() => null);
          if (freshSettings) {
            activeBranches = freshSettings.branches || activeBranches;
            activeSemesters = freshSettings.semesters || activeSemesters;
            activeSessions = freshSettings.sessions || activeSessions;
            setBranches(activeBranches);
            setSemesters(activeSemesters);
            setSessions(activeSessions);
          }
        }

        // 2. Prepare student payloads
        const studentPayloads: any[] = [];
        data.forEach((row: any) => {
          let studentName = findValue(row, ['name', 'student name', 'student', 'full name']);
          let rollNo = findValue(row, ['roll no', 'roll number', 'id', 'rollno', 'roll_no']);
          let guardian = findValue(row, ['guardian', 'guardian name', 'father name', 'father\'s name', 'guardian_name']);
          let phoneNum = findValue(row, ['phone', 'phone number', 'contact', 'mobile', 'phone_number']);
          let progName = findValue(row, ['program', 'fee plan', 'course', 'plan', 'fee_plan', 'program_name']);
          let brName = findValue(row, ['branch', 'stream', 'branch_name']);
          let semName = findValue(row, ['semester', 'sem', 'semester_name']);
          let sessName = findValue(row, ['session', 'academic session', 'year', 'session_name']);

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

          if (!guardian || !guardian.toString().trim()) {
            guardian = `[Auto] Guardian of ${studentName.replace(/^\[Auto\]\s*/, '')}`;
          } else {
            guardian = guardian.toString().trim();
          }

          if (!phoneNum || !phoneNum.toString().trim()) {
            phoneNum = `[Auto] 98${Math.floor(10000000 + Math.random() * 90000000)}`;
          } else {
            phoneNum = phoneNum.toString().trim();
          }

          if (!progName || !progName.toString().trim()) {
            progName = `[Auto] ${currentPlans[0]?.name || 'Standard Plan'}`;
          } else {
            progName = progName.toString().trim();
          }

          const cleanBranch = brName && brName.toString().trim() ? brName.toString().trim() : '[Auto] General';
          const cleanSem = semName && semName.toString().trim() ? semName.toString().trim() : '[Auto] Semester 1';
          const cleanSess = sessName && sessName.toString().trim() ? sessName.toString().trim() : '[Auto] 2025-2026';

          const matchedPlanId = resolvePlan(progName, currentPlans);
          const matchedBranchId = (activeBranches.find(b => b.name.toLowerCase() === cleanBranch.toLowerCase())?.id || '').toString();
          const matchedSemesterId = (activeSemesters.find(s => s.name.toLowerCase() === cleanSem.toLowerCase())?.id || '').toString();
          const matchedSessionId = (activeSessions.find(s => s.name.toLowerCase() === cleanSess.toLowerCase())?.id || '').toString();

          studentPayloads.push({
            name: studentName,
            guardian_name: guardian,
            roll_no: rollNo,
            phone: phoneNum,
            plan_id: matchedPlanId,
            branch_id: matchedBranchId,
            semester_id: matchedSemesterId,
            session_id: matchedSessionId,
            merge_duplicate: true
          });
        });

        // 3. Post to /api/students/bulk in batches of 250 for instant response
        const batchSize = 250;
        let successCount = 0;
        let failCount = 0;
        let processed = 0;
        const allErrors: string[] = [];

        for (let i = 0; i < studentPayloads.length; i += batchSize) {
          const chunk = studentPayloads.slice(i, i + batchSize);
          try {
            const bulkRes = await fetch('/api/students/bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ students: chunk })
            });

            if (bulkRes.ok) {
              const resData = await bulkRes.json();
              successCount += resData.successCount || 0;
              failCount += resData.failCount || 0;
              if (Array.isArray(resData.errors)) {
                allErrors.push(...resData.errors);
              }
            } else {
              const errObj = await bulkRes.json().catch(() => ({}));
              failCount += chunk.length;
              allErrors.push(`Batch upload failed: ${errObj.message || 'Server error'}`);
            }
          } catch (err: any) {
            failCount += chunk.length;
            allErrors.push(`Batch network error: ${err.message || 'Connection lost'}`);
          }

          processed += chunk.length;
          setImportStatus({
            isOpen: true,
            total: studentPayloads.length,
            processed,
            successCount,
            failCount,
            errors: allErrors
          });
        }

        // Trigger parent update
        fetchData();
        try {
          window.dispatchEvent(new CustomEvent('org-settings-updated'));
        } catch (e) {
          const evt = document.createEvent('Event');
          evt.initEvent('org-settings-updated', true, true);
          window.dispatchEvent(evt);
        }

      } catch (err: any) {
        alert(`Failed to read the file (CSV/Excel): ${err.message || err}`);
      }
    };
    reader.readAsArrayBuffer(file);
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

  const isAuto = (val: any) => val && val.toString().startsWith('[Auto]');
  const cleanVal = (val: any) => val ? val.toString().replace(/^\[Auto\]\s*/, '') : '';

  const shareWhatsAppReminder = (student: Student) => {
    const phone = cleanVal(student.phone || '');
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const totalDue = Number(student.total_due || 0);
    const totalPaid = Number(student.total_paid || 0);
    const pendingBalance = totalDue - totalPaid;

    const msg = `🚩 *FEE REMINDER*\n*MAYA GROUP OF INSTITUTIONS*\n\nDear Parent / Student,\n*Student Name:* ${cleanVal(student.name)}\n*Roll No:* ${cleanVal(student.roll_no)}\n*Branch:* ${cleanVal(student.branch_name)} (${cleanVal(student.semester_name)})\n\nThis is a gentle reminder regarding the outstanding college fee balance:\nTotal Program Fee: ₹${totalDue.toLocaleString()}\nTotal Amount Paid: ₹${totalPaid.toLocaleString()}\n*Pending Due Balance: ₹${pendingBalance.toLocaleString()}*\n\nPlease kindly clear the due amount at your earliest convenience.\n\nRegards,\nAccounts Department\nMaya Group of Institutions`;

    const encodedMsg = encodeURIComponent(msg);
    const targetPhone = cleanPhone ? (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone) : '';
    
    if (targetPhone) {
      window.open(`https://wa.me/${targetPhone}?text=${encodedMsg}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
    }
  };

  const shareWhatsAppProfile = (student: Student) => {
    const phone = cleanVal(student.phone || '');
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    const msg = `📋 *STUDENT PROFILE DETAILS*\n*MAYA GROUP OF INSTITUTIONS*\n\n*Name:* ${cleanVal(student.name)}\n*Roll No:* ${cleanVal(student.roll_no)}\n*Father's Name:* ${cleanVal(student.guardian_name)}\n*Phone:* ${phone}\n*Branch:* ${cleanVal(student.branch_name)}\n*Semester:* ${cleanVal(student.semester_name)}\n*Session:* ${cleanVal(student.session_name)}\n*Fee Plan:* ${cleanVal(student.plan_name)}\n*Total Paid:* ₹${(student.total_paid || 0).toLocaleString()}\n*Pending Due:* ₹${((student.total_due || 0) - (student.total_paid || 0)).toLocaleString()}`;

    const encodedMsg = encodeURIComponent(msg);
    const targetPhone = cleanPhone ? (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone) : '';
    
    if (targetPhone) {
      window.open(`https://wa.me/${targetPhone}?text=${encodedMsg}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Student Directory</h3>
          <p className="text-slate-500 text-sm">Manage enrollment and student profiles</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <label className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer flex-1 sm:flex-initial">
            <Upload size={17} className="text-blue-600 shrink-0" />
            <span className="truncate">Import (CSV/Excel)</span>
            <input 
              type="file" 
              accept=".csv, .xlsx, .xls, .txt, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
              className="hidden" 
              onChange={handleImportExcel} 
            />
          </label>
          <button 
            onClick={exportExcel}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex-1 sm:flex-initial"
          >
            <FileSpreadsheet size={17} className="text-emerald-600 shrink-0" />
            <span className="truncate">Export Excel</span>
          </button>
          <button 
            onClick={exportPDF}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex-1 sm:flex-initial"
          >
            <FileText size={17} className="text-violet-600 shrink-0" />
            <span className="truncate">PDF Report</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 w-full sm:w-auto"
          >
            <UserPlus size={17} className="shrink-0" />
            <span>Enroll New</span>
          </button>
        </div>
      </div>

      {/* Course-wise and Session-wise Student Breakdown */}
      <CourseSessionStudentBreakdown students={students} />

      {/* Filters */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center flex-wrap gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name, roll no or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-xs sm:text-sm"
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full sm:w-auto sm:flex sm:items-center">
          <select 
            value={filters.plan}
            onChange={e => setFilters({...filters, plan: e.target.value})}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-full sm:w-auto min-w-[120px]"
          >
            <option value="all">All Programs</option>
            {(plans || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select 
            value={filters.branch}
            onChange={e => setFilters({...filters, branch: e.target.value})}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-full sm:w-auto min-w-[120px]"
          >
            <option value="all">All Branches</option>
            {(branches || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <select 
            value={filters.semester}
            onChange={e => setFilters({...filters, semester: e.target.value})}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-full sm:w-auto min-w-[120px]"
          >
            <option value="all">All Semesters</option>
            {(semesters || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guardian</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Program</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Branch</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Semester</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Session</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrolled By</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group text-slate-700">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm",
                        isAuto(student.name) ? "bg-amber-50 text-amber-600 font-mono" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {cleanVal(student.name).charAt(0)}
                      </div>
                      <div>
                        <p className={cn(
                          "font-bold text-sm flex items-center flex-wrap gap-1",
                          isAuto(student.name) ? "text-amber-600 italic font-medium font-mono" : "text-slate-900"
                        )}>
                          {cleanVal(student.name)}
                          {isAuto(student.name) && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[8px] font-bold tracking-normal not-italic uppercase">Auto</span>
                          )}
                          {student.is_edited && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[8px] font-bold uppercase tracking-wider shadow-sm">
                              Edited by {student.edited_by || 'Accountant'}
                            </span>
                          )}
                        </p>
                        <p className="text-xs font-semibold text-slate-400">
                          Roll: <span className={cn(isAuto(student.roll_no) ? "text-amber-600 italic font-mono font-medium" : "")}>{cleanVal(student.roll_no)}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className={cn(
                      "text-sm font-semibold",
                      isAuto(student.guardian_name) ? "text-amber-600 italic font-mono font-medium" : "text-slate-700"
                    )}>
                      {cleanVal(student.guardian_name)}
                    </p>
                    <p className={cn(
                      "text-xs",
                      isAuto(student.phone) ? "text-amber-500 italic font-mono" : "text-slate-400"
                    )}>
                      {cleanVal(student.phone)}
                    </p>
                  </td>
                  <td className="py-4 px-6 text-sm font-semibold text-slate-700">
                    {cleanVal(student.plan_name)}
                  </td>
                  <td className="py-4 px-6 text-sm">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-semibold",
                      isAuto(student.branch_name) ? "bg-amber-100 text-amber-700 font-mono" : "bg-slate-100 text-slate-700"
                    )}>
                      {cleanVal(student.branch_name)}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-semibold",
                      isAuto(student.semester_name) ? "bg-amber-100 text-amber-700 font-mono" : "bg-slate-100 text-slate-700"
                    )}>
                      {cleanVal(student.semester_name)}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-semibold",
                      isAuto(student.session_name) ? "bg-amber-100 text-amber-700 font-mono" : "bg-slate-100 text-slate-700"
                    )}>
                      {cleanVal(student.session_name)}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 inline-flex items-center gap-1">
                      <UserCheck size={12} className="text-emerald-600 shrink-0" />
                      {cleanVal(student.created_by || (student.edited_by ? `Edited: ${student.edited_by}` : 'Accountant'))}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => shareWhatsAppReminder(student)}
                        title="Send WhatsApp Fee Reminder"
                        className="p-1.5 text-emerald-600 bg-emerald-50/80 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        <MessageCircle size={15} />
                      </button>
                      <button 
                        onClick={() => shareWhatsAppProfile(student)}
                        title="Share Student Details on WhatsApp"
                        className="p-1.5 text-blue-600 bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Share2 size={15} />
                      </button>
                      <button 
                        onClick={() => startView(student)}
                        title="View Profile"
                        className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <Eye size={15} />
                      </button>
                      <button 
                        onClick={() => startEdit(student)}
                        title="Edit Student"
                        className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        <Edit3 size={15} />
                      </button>
                      {!isAccountant && (
                        <button 
                          onClick={() => deleteStudent(student.id)}
                          title="Delete Student"
                          className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-emerald-600 gap-2">
                      <Loader2 size={32} className="animate-spin" />
                      <p className="font-semibold text-xs text-slate-500">Loading Student Directory...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Users size={48} className="mb-4 opacity-20" />
                      <p className="font-medium">No students found matching your criteria</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enroll Modal */}
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
                <h4 className="text-lg font-bold text-slate-900">Student Directory Import Progress</h4>
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
                  <span className="text-xs font-medium">Successfully Enrolled</span>
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
                  {importStatus.processed < importStatus.total ? 'Importing...' : 'Done & Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

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

              <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                {viewingStudent.is_edited && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider">
                        Edited by {viewingStudent.edited_by || 'Accountant'}
                      </span>
                      {viewingStudent.edited_at && (
                        <span className="text-[11px] font-semibold text-amber-700">
                          {new Date(viewingStudent.edited_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    
                    {viewingStudent.previous_data && (
                      <div className="mt-3 pt-3 border-t border-amber-200/60">
                        <p className="text-xs font-bold text-amber-900 mb-2 uppercase tracking-wide">
                          Audit History: Before Editing vs After Editing
                        </p>
                        <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-amber-100/70 text-amber-900 font-bold">
                                <th className="p-2 border-b border-amber-200">Field</th>
                                <th className="p-2 border-b border-amber-200 text-rose-700 bg-rose-50/50">Before Editing</th>
                                <th className="p-2 border-b border-amber-200 text-emerald-700 bg-emerald-50/50">After Editing</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-100 font-medium">
                              {[
                                { label: 'Name', key: 'name', current: viewingStudent.name },
                                { label: 'Roll No', key: 'roll_no', current: viewingStudent.roll_no },
                                { label: 'Guardian', key: 'guardian_name', current: viewingStudent.guardian_name },
                                { label: 'Phone', key: 'phone', current: viewingStudent.phone },
                                { label: 'Program', key: 'plan_name', current: viewingStudent.plan_name },
                                { label: 'Branch', key: 'branch_name', current: viewingStudent.branch_name },
                                { label: 'Semester', key: 'semester_name', current: viewingStudent.semester_name },
                                { label: 'Session', key: 'session_name', current: viewingStudent.session_name },
                              ].map(f => {
                                const prevVal = cleanVal(viewingStudent.previous_data[f.key] || 'N/A');
                                const currVal = cleanVal(f.current || 'N/A');
                                const changed = prevVal !== currVal;
                                return (
                                  <tr key={f.key} className={changed ? 'bg-amber-50/80 font-bold' : ''}>
                                    <td className="p-2 font-semibold text-slate-700">{f.label}</td>
                                    <td className="p-2 text-rose-700 bg-rose-50/30 font-mono">{prevVal}</td>
                                    <td className="p-2 text-emerald-700 bg-emerald-50/30 font-mono">{currVal}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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

                {/* Student Payment Ledger & Date-wise Payment History */}
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <History size={16} className="text-blue-600" />
                        Student Payment Ledger & Payment History
                      </h4>
                      <p className="text-xs text-slate-500">Date-wise chronological record of all fee payments received</p>
                    </div>
                    {studentTxs.length > 0 && (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold">
                        {studentTxs.length} Payment{studentTxs.length > 1 ? 's' : ''} Recorded
                      </span>
                    )}
                  </div>

                  {studentTxs.length > 0 ? (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                            <th className="p-3">Payment Date</th>
                            <th className="p-3">Term / Sem</th>
                            <th className="p-3">Txn / UPI ID</th>
                            <th className="p-3">Payment Mode</th>
                            <th className="p-3 text-right">Amount Paid</th>
                            <th className="p-3 text-right">Running Total</th>
                            <th className="p-3 text-right">Balance Due</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {studentTxs.map((tx: any, idx: number) => {
                            const txDateStr = tx.transaction_date || tx.created_at;
                            return (
                              <tr key={tx.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                                  <div className="font-bold text-slate-800">{formatAppDate(txDateStr)}</div>
                                  <div className="text-[10px] font-mono text-slate-500 font-medium mt-0.5">{formatDateDDMMYYYY(txDateStr)}</div>
                                </td>
                                <td className="p-3">{tx.academic_term || 'Sem 1'}</td>
                                <td className="p-3 font-mono text-slate-600">{tx.transaction_id || 'CASH'}</td>
                                <td className="p-3">{tx.payment_mode || 'Cash'}</td>
                                <td className="p-3 text-right font-bold text-emerald-600">₹{(Number(tx.amount) || 0).toLocaleString()}</td>
                                <td className="p-3 text-right font-bold text-slate-800">₹{(Number(tx.running_paid) || 0).toLocaleString()}</td>
                                <td className="p-3 text-right font-bold text-slate-900">₹{(Number(tx.running_balance) || 0).toLocaleString()}</td>
                                <td className="p-3 text-center">
                                  {tx.is_edited ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                                      Edited by {tx.edited_by || 'Accountant'}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                      Verified
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => {
                                      const normalizedTx = {
                                        ...tx,
                                        student_name: tx.student_name || viewingStudent?.name,
                                        roll_no: tx.roll_no || viewingStudent?.roll_no,
                                        guardian_name: tx.guardian_name || viewingStudent?.guardian_name,
                                        phone: tx.phone || viewingStudent?.phone,
                                        branch_name: tx.branch_name || viewingStudent?.branch_name || branches.find(b => b.id === viewingStudent?.branch_id)?.name,
                                        semester_name: tx.semester_name || viewingStudent?.semester_name || semesters.find(s => s.id === viewingStudent?.semester_id)?.name,
                                        session_name: tx.session_name || viewingStudent?.session_name || sessions.find(s => s.id === viewingStudent?.session_id)?.name,
                                        academic_term: tx.academic_term || viewingStudent?.session_name || '2026-27'
                                      };
                                      setPrintingTx(normalizedTx);
                                    }}
                                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-all border border-slate-200 inline-flex items-center gap-1"
                                  >
                                    <Printer size={10} />
                                    Receipt
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      No fee payment transactions recorded yet for this student.
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => shareWhatsAppReminder(viewingStudent)}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border border-emerald-200"
                    >
                      <MessageCircle size={15} />
                      WhatsApp Reminder
                    </button>
                    <button 
                      onClick={() => shareWhatsAppProfile(viewingStudent)}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border border-blue-200"
                    >
                      <Share2 size={15} />
                      Share Profile
                    </button>
                  </div>
                  <button 
                    onClick={() => setIsViewModalOpen(false)}
                    className="px-8 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 text-xs transition-all"
                  >
                    Close Profile
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
                  <Receipt transaction={printingTx} settings={orgSettings} />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3 shrink-0 print:hidden">
                <button 
                  onClick={triggerPrintReceipt}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-md"
                >
                  <Printer size={16} />
                  Print Receipt
                </button>
                <button 
                  onClick={downloadReceiptPDF}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-700 transition-all shadow-md"
                >
                  <FileDown size={16} />
                  Download PDF
                </button>
                <button 
                  onClick={shareWhatsAppReceipt}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-md"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
                <button 
                  onClick={() => setPrintingTx(null)}
                  className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all"
                >
                  Close
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
    </div>
  );
}
