import React from 'react';
import { format } from 'date-fns';
import { Transaction, OrgSettings } from '../types';
import { DEFAULT_MAYA_LOGO_BASE64 } from '../assets/logoData';

interface ReceiptProps {
  transaction: Transaction;
  settings: OrgSettings | null;
}

const cleanVal = (val: any) => (val ? val.toString().replace(/^\[Auto\]\s*/, '') : '');

export default function Receipt({ transaction, settings }: ReceiptProps) {
  const orgName = settings?.name || 'MAYA GROUP OF INSTITUTIONS';
  const orgAddress = settings?.address || 'HGJ9+P36, Maharajganj,Gaziapur,Jalalabad,Uttar Prdesh-233002';
  const orgPhone = settings?.phone || '6390777701, 6390777702';

  const txDateFormatted = (() => {
    const raw = transaction?.created_at || transaction?.transaction_date;
    if (!raw) return format(new Date(), 'dd-MM-yyyy HH:mm');
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return String(raw);
      return format(d, 'dd-MM-yyyy HH:mm');
    } catch {
      return String(raw);
    }
  })();

  const txIdNum = Number(transaction?.id) || 0;
  const receiptNo = `RC-${txIdNum < 100 ? 800 + txIdNum : txIdNum}`;

  const studentNameCode = `${cleanVal(transaction.student_name || 'STUDENT').toUpperCase()} / ${cleanVal(transaction.roll_no)}`;
  const guardianName = cleanVal(transaction.guardian_name || 'N/A').toUpperCase();
  const phone = cleanVal(transaction.phone || (transaction as any).student_phone || 'N/A');
  const branch = cleanVal(transaction.branch_name || transaction.branch || 'N/A');
  const semester = cleanVal(transaction.semester_name || transaction.course || 'N/A');
  const session = cleanVal(transaction.session_name || transaction.academic_term || '2026-27');
  const academicSession = cleanVal(transaction.academic_term || '2026-2027');
  const paymentMode = cleanVal(transaction.payment_mode || 'UPI');
  const txnId = cleanVal(transaction.transaction_id || 'N/A');
  const amountPaid = (transaction.amount || 0).toFixed(2);

  return (
    <div className="p-8 md:p-10 bg-white text-slate-900 max-w-4xl mx-auto space-y-6 border border-slate-200 shadow-sm print:p-6 print:shadow-none print:border-none" id="receipt-content">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-200 gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 p-1 flex items-center justify-center shrink-0 bg-emerald-50 overflow-hidden">
            <img 
              src={(settings?.logo && typeof settings.logo === 'string' && settings.logo.trim()) ? settings.logo : DEFAULT_MAYA_LOGO_BASE64} 
              alt="Logo" 
              onError={(e: any) => { e.target.src = DEFAULT_MAYA_LOGO_BASE64; }}
              className="w-full h-full object-contain rounded-full" 
            />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase">
              {orgName}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">{orgAddress}</p>
            <p className="text-xs text-slate-600">Phone: {orgPhone}</p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            PAYMENT RECEIPT
          </h2>
          <p className="text-xs font-medium text-slate-700 mt-1">
            Date : {txDateFormatted}
          </p>
          {transaction.is_edited && (
            <div className="mt-2 inline-block px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-bold uppercase tracking-wider">
              Edited by {transaction.edited_by || 'Accountant'}
            </div>
          )}
        </div>
      </div>

      {/* Receipt No & Academic Session */}
      <div className="grid grid-cols-2 gap-8 py-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Receipt No</h4>
          <p className="text-sm text-slate-800 font-semibold mt-0.5">{receiptNo}</p>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">Academic Session</h4>
          <p className="text-sm text-slate-800 font-semibold mt-0.5">{academicSession}</p>
        </div>
      </div>

      {/* Student Details Header */}
      <div className="pt-2">
        <h3 className="text-sm font-bold text-slate-900 pb-1 border-b border-slate-900 inline-block w-full">
          Student Details
        </h3>
      </div>

      {/* 3 Column Grid layout matching user's image */}
      <div className="grid grid-cols-3 gap-y-6 gap-x-4 pt-1 text-xs">
        {/* Row 1 */}
        <div>
          <p className="text-slate-600 font-medium text-[11px]">Student Name / Code</p>
          <p className="text-slate-900 font-extrabold text-xs mt-0.5 break-words">
            {studentNameCode}
          </p>
        </div>

        <div>
          <p className="text-slate-600 font-medium text-[11px]">Father's Name</p>
          <p className="text-slate-900 font-extrabold text-xs mt-0.5 break-words">
            {guardianName}
          </p>
        </div>

        <div>
          <p className="text-slate-600 font-medium text-[11px]">Phone</p>
          <p className="text-slate-900 font-extrabold text-xs mt-0.5">
            {phone}
          </p>
        </div>

        {/* Row 2 */}
        <div>
          <p className="text-slate-600 font-medium text-[11px]">Branch</p>
          <p className="text-slate-900 font-extrabold text-xs mt-0.5">
            {branch}
          </p>
        </div>

        <div>
          <p className="text-slate-600 font-medium text-[11px]">Semester</p>
          <p className="text-slate-900 font-extrabold text-xs mt-0.5">
            {semester}
          </p>
        </div>

        <div>
          <p className="text-slate-600 font-medium text-[11px]">Session</p>
          <p className="text-slate-900 font-extrabold text-xs mt-0.5">
            {session}
          </p>
        </div>

        {/* Row 3 or Split Payment Breakdown */}
        {transaction.splitTransactions && transaction.splitTransactions.length > 1 ? (
          <div className="col-span-3 pt-2">
            <p className="text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-2">
              Payment Breakdown ({transaction.splitTransactions.length} Transactions Recorded)
            </p>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Payment Mode</th>
                    <th className="py-2 px-3">Transaction ID</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {transaction.splitTransactions.map((st, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 text-slate-900 font-bold">{cleanVal(st.payment_mode)}</td>
                      <td className="py-2 px-3 font-mono text-slate-700">{cleanVal(st.transaction_id || 'N/A')}</td>
                      <td className="py-2 px-3 text-slate-600">{st.transaction_date || 'N/A'}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">₹ {(Number(st.amount) || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-black text-slate-900 text-xs">
                  <tr>
                    <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-[11px]">Total Paid Amount</td>
                    <td className="py-2.5 px-3 text-right text-sm text-emerald-700 font-black">
                      ₹ {transaction.splitTransactions.reduce((acc, st) => acc + (Number(st.amount) || 0), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <>
            <div>
              <p className="text-slate-600 font-medium text-[11px]">Payment Mode</p>
              <p className="text-slate-900 font-extrabold text-xs mt-0.5">
                {paymentMode}
              </p>
            </div>

            <div>
              <p className="text-slate-600 font-medium text-[11px]">Transaction ID</p>
              <p className="text-slate-900 font-extrabold text-xs mt-0.5 font-mono">
                {txnId}
              </p>
            </div>

            <div>
              <p className="text-slate-600 font-medium text-[11px]">Amount Paid</p>
              <p className="text-slate-900 font-black text-sm mt-0.5">
                ₹ {amountPaid}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Signature Section */}
      <div className="pt-20 flex justify-end text-right">
        <div className="w-56 text-center">
          <p className="text-xs font-semibold text-slate-800 mb-8">Authorized Signatory</p>
          <div className="border-b border-slate-900 w-full" />
        </div>
      </div>

      {/* Software Credit Footer */}
      <div className="pt-6 border-t border-slate-100 text-center">
        <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
          Software Developed by Digital Communique Private Limited
        </p>
      </div>
    </div>
  );
}

