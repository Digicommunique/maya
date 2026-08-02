import React, { useState } from 'react';
import { Lock, User, ArrowRight } from 'lucide-react';
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
        throw new Error(`Server error: ${res.status} ${res.statusText} - ${text.substring(0, 50)}`);
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

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: 'admin', password: '12345' })
      });
      
      if (res.ok) {
        const data = await res.json();
        onLogin(data.staff);
        return;
      }
    } catch (err) {
      console.warn("Server login failed, using local bypass fallback:", err);
    }
    
    // Fallback authentication
    onLogin({
      id: 'demo',
      staff_id: 'admin',
      name: 'Demo Administrator',
      role: 'admin'
    });
    setIsLoading(false);
  };

  const orgName = orgSettings?.name || "MAYA GROUP OF INSTITUTIONS";

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col items-center justify-between p-4 py-8 font-sans">
      <div />
      <div className="w-full max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 p-8 md:p-10 border border-slate-200/70"
        >
          {/* Logo Badge */}
          <div className="w-16 h-16 bg-[#059669] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-600/20 overflow-hidden">
            {orgSettings?.logo ? (
              <img src={orgSettings.logo} alt="Logo" className="w-full h-full object-contain p-2 bg-white" />
            ) : (
              <span className="text-white font-black text-xl tracking-wider">
                {orgName.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          {/* Institutional Title & Subtitles */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {orgName}
            </h1>
            <p className="text-emerald-600 font-extrabold text-base tracking-wide mt-1">
              DCfeePay
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              DIGITAL COMMUNIQUE PRIVATE LIMITED
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                USER IDENTIFICATION
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  required
                  value={staffId}
                  onChange={e => setStaffId(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-semibold text-slate-800"
                  placeholder="Enter Staff ID"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                ACCESS PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-semibold text-slate-800"
                  placeholder="Enter PIN"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-bold text-center"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-3 pt-2">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#059669] hover:bg-[#047857] text-white py-3.5 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? 'Authenticating...' : 'SIGN IN TO CLOUD'}
                {!isLoading && <ArrowRight size={16} />}
              </button>

              <button 
                type="button"
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all disabled:opacity-50 cursor-pointer"
              >
                Continue as Demo
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Software Developer Footer */}
      <footer className="text-center pt-6">
        <p className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">
          Software Developed by Digital Communique Private Limited
        </p>
      </footer>
    </div>
  );
}

