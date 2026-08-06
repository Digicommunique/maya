import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings as SettingsIcon, 
  CreditCard, 
  FileText, 
  PlusCircle,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { cn } from './lib/utils';
import Dashboard from './components/Dashboard';
import StudentDirectory from './components/StudentDirectory';
import FeePlans from './components/FeePlans';
import Settings from './components/Settings';
import FeeCollection from './components/FeeCollection';
import Reports from './components/Reports';
import { safeFetchJson } from './utils/api';
import Login from './components/Login';
import { DEFAULT_MAYA_LOGO_BASE64 } from './assets/logoData';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [orgSettings, setOrgSettings] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('dc_org_settings');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const fetchOrgSettings = () => {
    safeFetchJson('/api/settings')
      .then(data => {
        if (data && data.settings) {
          setOrgSettings(data.settings);
          localStorage.setItem('dc_org_settings', JSON.stringify(data.settings));
        }
      })
      .catch(err => console.error("Error fetching org settings in App.tsx:", err));
  };

  useEffect(() => {
    if (orgSettings?.name) {
      document.title = orgSettings.name;
    } else {
      document.title = "DCEDUPayFee";
    }
  }, [orgSettings]);

  useEffect(() => {
    const savedUser = localStorage.getItem('dc_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsInitialized(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    fetchOrgSettings();
    const handleSettingsUpdate = () => {
      fetchOrgSettings();
    };
    window.addEventListener('org-settings-updated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('org-settings-updated', handleSettingsUpdate);
    };
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('dc_user', JSON.stringify(userData));
    if (userData.role === 'accountant') {
      navigate('/collection');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('dc_user');
    navigate('/login');
  };

  if (!isInitialized) return null;

  const activeTab = location.pathname.split('/')[1] || (user?.role === 'accountant' ? 'collection' : 'dashboard');

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'collection', label: 'Record Fee Payment', icon: CreditCard },
    { id: 'students', label: 'Enroll Student', icon: Users },
    { id: 'plans', label: 'Fee Plans', icon: PlusCircle },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (!user) return false;
    if (user.role === 'accountant') {
      return ['collection', 'students'].includes(item.id);
    }
    if (user.role === 'staff') {
      return ['collection', 'students', 'reports'].includes(item.id);
    }
    return true; // Admin sees everything
  });

  // Strict route protection for Accountants
  if (user && user.role === 'accountant') {
    const allowedTabs = ['collection', 'students'];
    if (!allowedTabs.includes(activeTab)) {
      return <Navigate to="/collection" replace />;
    }
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} orgSettings={orgSettings} />} 
      />
      
      <Route
        path="/*"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : (
            <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-[#1E293B] relative">
              {/* Mobile Sidebar Backdrop Overlay */}
              <AnimatePresence>
                {isMobile && isSidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden cursor-pointer"
                  />
                )}
              </AnimatePresence>

              {/* Sidebar */}
              <aside 
                className={cn(
                  "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
                  !isSidebarOpen && "-translate-x-full lg:hidden"
                )}
              >
                <div className="h-full flex flex-col">
                  <div className="p-5 sm:p-6 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-slate-50 border border-slate-200 p-1 flex-shrink-0">
                        <img 
                          src={(orgSettings?.logo && typeof orgSettings.logo === 'string' && orgSettings.logo.trim() && orgSettings.logo !== '/logo.jpg' && orgSettings.logo !== '/api/app-icon') ? orgSettings.logo : DEFAULT_MAYA_LOGO_BASE64} 
                          alt="Logo" 
                          onError={(e: any) => { e.target.src = DEFAULT_MAYA_LOGO_BASE64; }}
                          className="w-full h-full object-contain" 
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h1 className="font-bold text-base sm:text-lg leading-tight truncate" title={orgSettings?.name || "DCEDUPayFee"}>
                          {orgSettings?.name || "DCEDUPayFee"}
                        </h1>
                        <p className="text-[11px] text-slate-500 font-medium tracking-tight truncate">by Digital Communique</p>
                      </div>
                    </div>
                    {isMobile && (
                      <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 lg:hidden rounded-lg hover:bg-slate-100"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>

                  <nav className="flex-1 px-3 sm:px-4 space-y-1 mt-2 sm:mt-4 overflow-y-auto">
                    {menuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigate(`/${item.id}`);
                          if (isMobile) setIsSidebarOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 group text-sm",
                          activeTab === item.id 
                            ? "bg-emerald-50 text-emerald-700 font-semibold" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <item.icon size={19} className={cn(
                          "transition-colors shrink-0",
                          activeTab === item.id ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                        )} />
                        <span className="truncate">{item.label}</span>
                        {activeTab === item.id && (
                          <motion.div 
                            layoutId="active-pill"
                            className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"
                          />
                        )}
                      </button>
                    ))}
                  </nav>

                  <div className="p-3 sm:p-4 border-t border-slate-100">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors text-sm"
                    >
                      <LogOut size={19} className="shrink-0" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                </div>
              </aside>

              {/* Main Content */}
              <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl lg:hidden focus:outline-none"
                      aria-label="Toggle Navigation Menu"
                    >
                      {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <h2 className="text-base sm:text-lg font-bold text-slate-800 capitalize truncate">
                      {menuItems.find(m => m.id === activeTab)?.label}
                    </h2>
                  </div>
                  
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate max-w-[150px]">{user.name}</p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{user.role}</p>
                    </div>
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs sm:text-sm uppercase shrink-0">
                      {user.name.substring(0, 2)}
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all text-xs font-semibold shrink-0 cursor-pointer shadow-2xs active:scale-95"
                      title="Sign Out"
                    >
                      <LogOut size={16} className="shrink-0" />
                      <span className="hidden sm:inline">Logout</span>
                    </button>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 flex flex-col justify-between min-h-[calc(100vh-4rem)]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={location.pathname}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1"
                    >
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard setActiveTab={(tab) => navigate(`/${tab}`)} user={user} />} />
                        <Route path="/students" element={<StudentDirectory user={user} />} />
                        <Route path="/collection" element={<FeeCollection user={user} />} />
                        <Route path="/plans" element={<FeePlans user={user} />} />
                        <Route path="/reports" element={<Reports user={user} />} />
                        <Route path="/settings" element={<Settings user={user} />} />
                        <Route path="/" element={<Navigate to={user?.role === 'accountant' ? "/collection" : "/dashboard"} replace />} />
                        <Route path="*" element={<Navigate to={user?.role === 'accountant' ? "/collection" : "/dashboard"} replace />} />
                      </Routes>
                    </motion.div>
                  </AnimatePresence>

                  <footer className="mt-8 pt-4 border-t border-slate-200/60 text-center text-slate-400 text-[10px] sm:text-xs font-semibold tracking-wide uppercase">
                    Software Developed by Digital Communique Private Limited
                  </footer>
                </div>
              </main>
            </div>
          )
        }
      />
    </Routes>
  );
}
