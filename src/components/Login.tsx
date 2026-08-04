import React, { useState, useEffect } from 'react';
import { Lock, User, ArrowRight, Download, Smartphone, CheckCircle, X, Sparkles, Share, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginProps {
  onLogin: (staff: any) => void;
  orgSettings?: any;
}

export default function Login({ onLogin, orgSettings }: LoginProps) {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn("Install prompt error:", err);
        setShowInstallGuide(true);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  const handleDownloadApk = () => {
    if (deferredPrompt) {
      handleInstallApp();
    } else {
      setShowInstallGuide(true);
    }
  };

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

  const orgName = orgSettings?.name || "MAYA GROUP OF INSTITUTIONS";
  const logoSrc = orgSettings?.logo || "/api/app-icon";

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col items-center justify-between p-4 py-8 font-sans space-y-6">
      <div />
      <div className="w-full max-w-md space-y-5">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl sm:rounded-[2rem] shadow-xl shadow-slate-200/60 p-6 sm:p-8 md:p-10 border border-slate-200/70"
        >
          {/* Logo Badge */}
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-600/10 border border-slate-100 overflow-hidden p-1">
            <img src={logoSrc} alt="Logo" className="w-full h-full object-contain rounded-xl" />
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

            <div className="pt-2">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#059669] hover:bg-[#047857] text-white py-3.5 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? 'Authenticating...' : 'SIGN IN TO CLOUD'}
                {!isLoading && <ArrowRight size={16} />}
              </button>
            </div>
          </form>
        </motion.div>

        {/* APK & Mobile Application Download Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-xl border border-slate-700/60 flex flex-col gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl p-0.5 shrink-0 flex items-center justify-center overflow-hidden border border-emerald-500/30">
              <img src={logoSrc} alt="App Icon" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                Maya Group Mobile App
                <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[9px] uppercase">
                  APK / App
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">Download & install directly with official logo icon</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadApk}
              className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download size={14} />
              Download APK
            </button>
            <button
              onClick={handleInstallApp}
              className="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-extrabold text-xs transition-all border border-slate-600 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Smartphone size={14} />
              {isInstalled ? 'App Ready' : 'Install to Phone'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-800">
            <CheckCircle size={12} className="text-emerald-400 shrink-0" />
            <span>Saves directly on Android/iOS mobile home screens with official Maya Group icon</span>
          </div>
        </motion.div>
      </div>

      {/* Mobile App Installation Guide Modal */}
      <AnimatePresence>
        {showInstallGuide && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setShowInstallGuide(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 border border-slate-700"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl p-0.5 shrink-0 flex items-center justify-center border border-emerald-500/40 shadow-lg">
                  <img src={logoSrc} alt="App Icon" className="w-full h-full object-contain rounded-lg" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Maya Group DCfeePay App
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
                    Direct Mobile App Installation
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <p className="text-slate-300">
                    Tap the browser menu button <strong className="text-white">(⋮ on Chrome / Share <Share size={12} className="inline mx-0.5 text-blue-400" /> on Safari)</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <p className="text-slate-300">
                    Select <strong className="text-emerald-400">"Install App"</strong> or <strong className="text-emerald-400">"Add to Home Screen"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <p className="text-slate-300">
                    Launch <strong className="text-white">DCfeePay</strong> directly from your phone home screen!
                  </p>
                </div>
              </div>

              <div className="pt-1 flex flex-col gap-2">
                {deferredPrompt && (
                  <button
                    onClick={handleInstallApp}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Smartphone size={16} />
                    One-Tap Install Now
                  </button>
                )}
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
                >
                  Got It, Thanks
                </button>
              </div>

              <p className="text-[10px] text-center text-slate-400 font-medium">
                100% Native Web App • Zero Package Installation Errors
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Software Developer Footer */}
      <footer className="text-center pt-4">
        <p className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">
          Software Developed by Digital Communique Private Limited
        </p>
      </footer>
    </div>
  );
}

