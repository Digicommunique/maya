import React, { useState } from 'react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (staff: any) => void;
  orgSettings?: any;
}

export default function Login({ onLogin, orgSettings }: LoginProps) {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Generates initials from organization name (e.g., "MAYA GROUP OF INSTITUTIONS" -> "MG")
  const getInitials = (name: string) => {
    if (!name) return "DC";
    const cleaned = name.replace(/\b(of|and|the|private|limited|ltd|pvt|in|for|to)\b/gi, '').trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return "DC";
  };

  const orgName = orgSettings?.name || "MAYA GROUP OF INSTITUTIONS";
  const initials = getInitials(orgName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, password })
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }

      if (res.ok) {
        onLogin(data.staff);
      } else {
        setError(data.details || data.message || data.error || 'Invalid credentials');
      }
    } catch (err: any) {
      console.error("Login fetch error:", err);
      setError(err.message === 'Failed to fetch' ? 'Cannot connect to server. Please check your internet.' : (err.message || 'Connection error. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-100 overflow-hidden border border-slate-100/80 p-8 sm:p-12 text-center"
        >
          {/* Logo / Initials Icon */}
          <div className="w-24 h-24 bg-[#0fa968] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-md shadow-emerald-500/10">
            <span className="text-white text-3xl font-extrabold tracking-wider font-sans">
              {initials}
            </span>
          </div>

          {/* Institution Header Information */}
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 uppercase max-w-xs mx-auto leading-tight" title={orgName}>
            {orgName}
          </h1>
          
          <div className="mt-2 mb-8">
            <span className="text-emerald-500 font-bold text-lg tracking-normal block">
              DCfeePay
            </span>
            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1 block">
              DIGITAL COMMUNIQUE PRIVATE LIMITED
            </span>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block ml-1">
                USER IDENTIFICATION
              </label>
              <input 
                type="text"
                required
                value={staffId}
                onChange={e => setStaffId(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-700 text-base font-medium placeholder:text-slate-400"
                placeholder="Enter Username"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block ml-1">
                ACCESS PIN
              </label>
              <input 
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-700 text-base font-medium placeholder:text-slate-400"
                placeholder="Enter PIN"
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0fa968] hover:bg-[#0d945b] active:scale-[0.98] text-white py-4.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-md shadow-emerald-500/10 disabled:opacity-50 mt-2 cursor-pointer flex items-center justify-center"
            >
              {isLoading ? 'SIGNING IN...' : 'SIGN IN TO CLOUD'}
            </button>
          </form>
        </motion.div>
        
        {/* Footer copyright */}
        <p className="text-center mt-8 text-slate-400 text-xs font-medium">
          &copy; {new Date().getFullYear()} {orgName}. All rights reserved.
        </p>
      </div>
    </div>
  );
}

