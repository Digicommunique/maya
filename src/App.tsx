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
import Login from './components/Login';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [orgSettings, setOrgSettings] = useState<any>(null);

  const fetchOrgSettings = () => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.settings) {
          setOrgSettings(data.settings);
        }
      })
      .catch(err => console.error("Error fetching org settings in App.tsx:", err));
  };

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

  const activeTab = location.pathname.split('/')[1] || 'dashboard';

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Student Directory', icon: Users },
    { id: 'collection', label: 'Record Payment', icon: CreditCard },
    { id: 'plans', label: 'Fee Plans', icon: PlusCircle },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (!user) return false;
    if (user.role === 'accountant') {
      return ['dashboard', 'collection'].includes(item.id);
    }
    if (user.role === 'staff') {
      return ['dashboard', 'students', 'collection', 'reports'].includes(item.id);
    }
    return true; // Admin sees everything
  });

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
            <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-[#1E293B]">
              {/* Sidebar */}
              <aside 
                className={cn(
                  "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
                  !isSidebarOpen && "-translate-x-full lg:hidden"
                )}
              >
                <div className="h-full flex flex-col">
                  <div className="p-6 flex items-center gap-3">
                    {orgSettings?.logo ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-slate-50 border border-slate-200 p-1 flex-shrink-0">
                        <img src={orgSettings.logo} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 flex-shrink-0">
                        <CreditCard size={24} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h1 className="font-bold text-lg leading-tight truncate" title={orgSettings?.name || "DCEDUPayFee"}>
                        {orgSettings?.name || "DCEDUPayFee"}
                      </h1>
                      <p className="text-xs text-slate-500 font-medium tracking-tight">by Digital Communique</p>
                    </div>
                  </div>

                  <nav className="flex-1 px-4 space-y-1 mt-4">
                    {menuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigate(`/${item.id}`);
                          if (isMobile) setIsSidebarOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                          activeTab === item.id 
                            ? "bg-emerald-50 text-emerald-700 font-semibold" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <item.icon size={20} className={cn(
                          "transition-colors",
                          activeTab === item.id ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                        )} />
                        <span>{item.label}</span>
                        {activeTab === item.id && (
                          <motion.div 
                            layoutId="active-pill"
                            className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600"
                          />
                        )}
                      </button>
                    ))}
                  </nav>

                  <div className="p-4 border-t border-slate-100">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <LogOut size={20} />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                </div>
              </aside>

              {/* Main Content */}
              <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className="p-2 hover:bg-slate-100 rounded-lg lg:hidden"
                    >
                      {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <h2 className="text-lg font-bold text-slate-800 capitalize">
                      {menuItems.find(m => m.id === activeTab)?.label}
                    </h2>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="hidden md:block text-right">
                      <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{user.role}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold uppercase">
                      {user.name.substring(0, 2)}
                    </div>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={location.pathname}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard setActiveTab={(tab) => navigate(`/${tab}`)} user={user} />} />
                        <Route path="/students" element={<StudentDirectory />} />
                        <Route path="/collection" element={<FeeCollection />} />
                        <Route path="/plans" element={<FeePlans />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </main>
            </div>
          )
        }
      />
    </Routes>
  );
}
