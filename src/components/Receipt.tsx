import React from 'react';
import { format } from 'date-fns';
import { Transaction, OrgSettings } from '../types';
import { CheckCircle2 } from 'lucide-react';

interface ReceiptProps {
  transaction: Transaction;
  settings: OrgSettings | null;
}

export default function Receipt({ transaction, settings }: ReceiptProps) {
  return (
    <div className="p-12 space-y-8 bg-white" id="receipt-content">
      {/* Receipt Header */}
      <div className="flex items-center justify-between pb-8 border-b border-slate-100">
        <div className="flex items-center gap-4">
          {settings?.logo && <img src={settings.logo} alt="Logo" className="w-16 h-16 object-contain" />}
          <div>
            <h2 className="text-2xl font-black text-slate-900">{settings?.name || 'EduFee Pro'}</h2>
            <p className="text-xs text-slate-500 max-w-[200px]">{settings?.address}</p>
            <p className="text-xs text-slate-500">PH: {settings?.phone}</p>
          </div>
        </div>
        <div className="text-right">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Receipt No</h4>
          <p className="text-lg font-bold text-slate-900">#REC-{1000 + transaction.id}</p>
          <p className="text-xs text-slate-500 mt-1">
            {transaction.created_at ? format(new Date(transaction.created_at), 'dd MMM yyyy • hh:mm a') : format(new Date(), 'dd MMM yyyy • hh:mm a')}
          </p>
        </div>
      </div>

      {/* Receipt Body */}
      <div className="grid grid-cols-2 gap-12">
        <div className="space-y-4">
          <div>
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Details</h5>
            <p className="text-lg font-bold text-slate-900 mt-1">{transaction.student_name}</p>
            <p className="text-sm text-slate-600 font-medium">Father's Name: {transaction.guardian_name}</p>
            <p className="text-sm text-slate-600">Roll No: {transaction.roll_no}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Course/Semester</h5>
              <p className="text-sm font-bold text-slate-800">{transaction.semester_name}</p>
            </div>
            <div>
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Branch</h5>
              <p className="text-sm font-bold text-slate-800">{transaction.branch_name}</p>
            </div>
          </div>
          <div>
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Year/Term</h5>
            <p className="text-sm font-bold text-slate-800">{transaction.academic_term}</p>
          </div>
        </div>
        <div className="space-y-4 text-right">
          <div>
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Mode</h5>
            <p className="text-sm font-bold text-slate-800 mt-1">{transaction.payment_mode}</p>
          </div>
          <div>
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Details</h5>
            <p className="text-sm font-mono text-slate-800">ID: {transaction.transaction_id || 'N/A'}</p>
            {transaction.transaction_date && (
              <p className="text-sm text-slate-800 mt-1">Date: {format(new Date(transaction.transaction_date), 'dd MMM yyyy')}</p>
            )}
          </div>
          {transaction.bank_account && (
            <div>
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bank Account</h5>
              <p className="text-sm font-bold text-slate-800">{transaction.bank_account}</p>
            </div>
          )}
        </div>
      </div>

      {/* Amount Box */}
      <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-500">Total Amount Paid</h4>
          <p className="text-xs text-slate-400 mt-1 italic">Amount in words: {transaction.amount} Rupees Only</p>
        </div>
        <p className="text-4xl font-black text-emerald-600">₹{(transaction.amount || 0).toLocaleString()}</p>
      </div>

      <div className="pt-12 flex items-center justify-between text-slate-400">
        <div className="text-center w-48">
          <div className="h-px bg-slate-200 mb-2" />
          <p className="text-[10px] font-bold uppercase tracking-widest">Student Signature</p>
        </div>
        <div className="text-center w-48">
          <div className="h-px bg-slate-200 mb-2" />
          <p className="text-[10px] font-bold uppercase tracking-widest">Authorized Signatory</p>
        </div>
      </div>
    </div>
  );
}
