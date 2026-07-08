import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Search,
  Calendar,
  Filter,
  Printer
} from 'lucide-react';
import { Transaction } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import Receipt from './Receipt';
import { OrgSettings } from '../types';

export default function Reports() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [activeView, setActiveView] = useState<'collections' | 'ledger'>('collections');
  const [printingTx, setPrintingTx] = useState<Transaction | null>(null);

  useEffect(() => {
    fetch('/api/transactions')
      .then(res => res.json())
      .then(data => Array.isArray(data) ? setTransactions(data) : setTransactions([]));
    
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data.settings));
      
    fetch('/api/ledger')
      .then(res => res.json())
      .then(data => Array.isArray(data) ? setLedger(data) : setLedger([]));
  }, []);

  const handlePrint = (tx: Transaction) => {
    setPrintingTx(tx);
    // Give it a bit more time to render the receipt component
    setTimeout(() => {
      window.print();
      // We don't immediately clear it to ensure print dialog picks it up
      // but we need to clear it eventually so it doesn't stay in the DOM
      setTimeout(() => setPrintingTx(null), 1000);
    }, 500);
  };

  const filteredTransactions = (transactions || []).filter(tx => {
    const matchesSearch = 
      tx.student_name?.toLowerCase().includes(search.toLowerCase()) || 
      tx.transaction_id?.toLowerCase().includes(search.toLowerCase()) ||
      tx.roll_no?.toLowerCase().includes(search.toLowerCase());
    
    const txDate = new Date(tx.created_at);
    const matchesFrom = !dateRange.from || txDate >= new Date(dateRange.from);
    const matchesTo = !dateRange.to || txDate <= new Date(dateRange.to);

    return matchesSearch && matchesFrom && matchesTo;
  });

  const filteredLedger = (ledger || []).filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.roll_no.toLowerCase().includes(search.toLowerCase())
  );

  const exportExcel = () => {
    const data = filteredTransactions.map(tx => ({
      Date: format(new Date(tx.created_at), 'yyyy-MM-dd'),
      Student: tx.student_name,
      'Roll No': tx.roll_no,
      Amount: tx.amount,
      Mode: tx.payment_mode,
      'Txn ID': tx.transaction_id,
      Term: tx.academic_term
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collections");
    XLSX.writeFile(wb, `Collections_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Financial Collections Report", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Date', 'Student', 'Roll No', 'Amount', 'Mode', 'Txn ID']],
      body: filteredTransactions.map(tx => [
        format(new Date(tx.created_at), 'yyyy-MM-dd'),
        tx.student_name,
        tx.roll_no,
        `Rs. ${tx.amount}`,
        tx.payment_mode,
        tx.transaction_id || '-'
      ]),
    });
    doc.save(`Collections_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const totalAmount = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Financial Intelligence</h3>
          <p className="text-slate-500 text-sm">Global collections tracking and student ledger auditing</p>
        </div>
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

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-6">
        <div className="flex-1 min-w-[300px] space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Search UTR / Student / Receipt</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Enter bank reference or student name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From Date</label>
          <input 
            type="date"
            value={dateRange.from}
            onChange={e => setDateRange({...dateRange, from: e.target.value})}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To Date</label>
          <input 
            type="date"
            value={dateRange.to}
            onChange={e => setDateRange({...dateRange, to: e.target.value})}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>

        <div className="bg-emerald-50 px-6 py-2.5 rounded-xl border border-emerald-100 text-center min-w-[100px]">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Results</p>
          <p className="text-xl font-black text-emerald-700">{filteredTransactions.length}</p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={exportExcel}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 flex items-center gap-2 text-xs font-bold"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" />
            EXCEL
          </button>
          <button 
            onClick={exportPDF}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 flex items-center gap-2 text-xs font-bold"
          >
            <FileText size={16} className="text-violet-600" />
            PDF
          </button>
        </div>
      </div>

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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeView === 'collections' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt / Date</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Payer</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bank Ref (UTR/TXN)</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900">DC-{1000 + tx.id}</p>
                      <p className="text-xs text-emerald-600 font-medium">{format(new Date(tx.created_at), 'yyyy-MM-dd')}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-800">{tx.student_name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tx.academic_term} | {tx.payment_mode}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-mono text-slate-600">{tx.transaction_id || 'CASH_PAYMENT'}</p>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <p className="text-lg font-black text-emerald-700">₹{(tx.amount || 0).toLocaleString()}</p>
                    </td>
                    <td className="py-4 px-6 text-right print:hidden">
                      <button 
                        onClick={() => handlePrint(tx)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Print Receipt"
                      >
                        <Printer size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLedger.map(item => {
                  const balance = (item.total_due || 0) - (item.total_paid || 0);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500 font-medium">ROLL: {item.roll_no}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm font-medium text-slate-700">{item.plan_name || 'No Plan'}</p>
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
                    </tr>
                  );
                })}
                {filteredLedger.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400">
                      No student records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Hidden Receipt for Printing */}
      {printingTx && (
        <div className="fixed inset-0 z-[9999] bg-white print:block" style={{ display: 'none' }}>
          <Receipt transaction={printingTx} settings={settings} />
        </div>
      )}

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: A4;
            margin: 10mm;
          }
          #root { visibility: hidden !important; }
          #receipt-content, #receipt-content * { visibility: visible !important; }
          #receipt-content { 
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}} />
    </div>
  );
}
