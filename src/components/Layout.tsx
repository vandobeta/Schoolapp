import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOffline } from "../context/OfflineContext";
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  MessageSquare,
  ChevronLeft,
  AlertCircle,
  X,
  Maximize,
  Minimize,
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  CheckCircle2,
  CloudUpload,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { 
    isOnline, 
    isSyncing, 
    stats, 
    syncNow, 
    refreshCache, 
    isOfflineModeForced, 
    toggleForceOffline,
    syncError 
  } = useOffline();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [showOfflineModal, setShowOfflineModal] = React.useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = React.useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(!!document.fullscreenElement);

  React.useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleBack = () => {
    if (location.pathname === "/dashboard") {
      setShowLogoutConfirm(true);
    } else {
      navigate(-1);
    }
  };

  const handleManualSync = async () => {
    setSyncStatusMsg("Synchronizing queued offline data with server...");
    const res = await syncNow();
    if (res.success) {
      setSyncStatusMsg(res.synced > 0 ? `Successfully synchronized ${res.synced} item(s)!` : "All local data is already up to date.");
    } else {
      setSyncStatusMsg(res.errors[0] || "Sync failed. Please check network connection.");
    }
    setTimeout(() => setSyncStatusMsg(null), 4000);
  };

  const handleCacheRefresh = async () => {
    setSyncStatusMsg("Downloading latest curriculum activities to IndexedDB...");
    await refreshCache();
    setSyncStatusMsg("Offline curriculum cache updated!");
    setTimeout(() => setSyncStatusMsg(null), 3000);
  };

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["student", "teacher", "dos", "hm", "examiner", "publisher", "developer"] },
    { name: "Activities", path: "/activities", icon: BookOpen, roles: ["student", "teacher", "dos", "hm", "examiner", "developer"] },
    { name: "Exam Generator", path: "/exam-generator", icon: FileText, roles: ["teacher", "examiner", "dos", "hm", "developer"] },
    { name: "Forums", path: "/forums", icon: Users, roles: ["teacher", "dos", "hm", "examiner", "publisher", "developer"] },
    { name: "Admin", path: "/admin", icon: ShieldCheck, roles: ["dos", "hm", "developer"] },
    { name: "Messages", path: "/messages", icon: MessageSquare, roles: ["student", "teacher", "dos", "hm", "examiner", "publisher", "developer"] },
  ];

  const getPageTitle = () => {
    const item = menuItems.find(i => i.path === location.pathname);
    return item ? item.name : "GEDE Masterpiece";
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col lg:flex-row pb-20 lg:pb-0">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-[#151619] text-white flex flex-col z-[70] transition-transform duration-300 lg:relative lg:translate-x-0 lg:w-64",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-emerald-400">GEDE</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">Smart School Plugin</p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.filter(item => item.roles.includes(user?.role || "")).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                location.pathname === item.path 
                  ? "bg-emerald-500/10 text-emerald-400" 
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Offline Quick Hub in Sidebar */}
        <div className="p-4 mx-3 mb-2 bg-white/5 border border-white/10 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              ) : (
                <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              )}
              <span className="text-xs font-bold text-gray-200">
                {isOnline ? "Online Mode" : "Offline Active"}
              </span>
            </div>
            <button
              onClick={() => setShowOfflineModal(true)}
              className="text-[10px] text-emerald-400 hover:underline font-bold"
            >
              Manage
            </button>
          </div>
          <p className="text-[11px] text-gray-400 leading-tight">
            {stats.cachedActivities} activities cached in IndexedDB
          </p>
          {stats.pendingSyncCount > 0 && (
            <div className="mt-2 text-[10px] text-amber-400 font-semibold flex items-center gap-1">
              <CloudUpload size={12} />
              <span>{stats.pendingSyncCount} pending sync</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-600"
            >
              <LayoutDashboard size={20} />
            </button>
            <button 
              onClick={handleBack}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-xl transition-all text-gray-600 font-bold text-xs"
            >
              <ChevronLeft size={18} className="text-emerald-600" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-4 w-[1px] bg-gray-200 hidden sm:block" />
            <h2 className="font-bold text-gray-900 text-sm md:text-base truncate max-w-[150px] md:max-w-none">
              {getPageTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Offline / Online Pill Button */}
            <button
              onClick={() => setShowOfflineModal(true)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm border",
                isOnline
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
              )}
              title="IndexedDB Offline Storage Status"
            >
              {isOnline ? (
                <>
                  <Wifi size={14} className="text-emerald-600" />
                  <span className="hidden md:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} className="text-amber-600" />
                  <span className="hidden md:inline">Offline Mode</span>
                </>
              )}
              {stats.pendingSyncCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                  {stats.pendingSyncCount}
                </span>
              )}
            </button>

            <button 
              onClick={toggleFullscreen}
              className="p-2.5 bg-gray-50 border border-gray-100 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm flex items-center justify-center group"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-gray-900">{user?.name}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{user?.role}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20 border-2 border-white">
              {user?.name?.[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Offline Banner when offline */}
        {!isOnline && (
          <div className="bg-amber-500 text-slate-900 px-4 py-2 text-xs font-semibold flex items-center justify-between border-b border-amber-600/20 shadow-inner">
            <div className="flex items-center gap-2">
              <Database size={15} className="text-slate-950 flex-shrink-0" />
              <span>
                <strong>Low-Connectivity Mode Active:</strong> You are accessing curriculum activities from browser IndexedDB. New submissions are securely queued locally and will auto-sync when connection restores.
              </span>
            </div>
            <button
              onClick={() => setShowOfflineModal(true)}
              className="underline font-bold text-slate-950 hover:text-black ml-4 whitespace-nowrap text-xs"
            >
              Storage Hub
            </button>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#151619] border-t border-white/10 px-6 py-3 flex items-center justify-between z-50 backdrop-blur-lg bg-opacity-90">
        {menuItems.filter(item => item.roles.includes(user?.role || "")).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              location.pathname === item.path 
                ? "text-emerald-400" 
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <item.icon size={20} className={cn(location.pathname === item.path && "scale-110")} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.name}</span>
          </Link>
        ))}
        <button
          onClick={() => setShowOfflineModal(true)}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-amber-400 transition-all"
        >
          <Database size={20} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Offline</span>
        </button>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex flex-col items-center gap-1 text-red-400/60 hover:text-red-400 transition-all"
        >
          <LogOut size={20} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Exit</span>
        </button>
      </nav>

      {/* Offline Storage Hub Modal */}
      <AnimatePresence>
        {showOfflineModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Offline & Low-Connectivity Hub</h3>
                    <p className="text-xs text-gray-500">Browser IndexedDB Storage (`GEDE_Masterpiece_Offline_DB`)</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOfflineModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status banner */}
              <div className={cn(
                "p-4 rounded-2xl flex items-start gap-3 border",
                isOnline ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"
              )}>
                {isOnline ? <Wifi size={20} className="text-emerald-600 mt-0.5" /> : <WifiOff size={20} className="text-amber-600 mt-0.5" />}
                <div>
                  <h4 className="font-bold text-sm">
                    {isOnline ? "Connected to School Network" : "Running in Offline / Low-Bandwidth Mode"}
                  </h4>
                  <p className="text-xs opacity-90 mt-0.5">
                    {isOnline 
                      ? "Activities and submissions sync in real-time. Background copies are saved to IndexedDB for offline protection."
                      : "You can view cached curriculum activities and submit work offline. Pending submissions will automatically upload once a connection is detected."}
                  </p>
                </div>
              </div>

              {/* Status Message */}
              {syncStatusMsg && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-blue-600" />
                  <span>{syncStatusMsg}</span>
                </div>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-center">
                  <p className="text-xs text-gray-500 font-medium">Activities</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{stats.cachedActivities}</p>
                  <span className="text-[10px] text-emerald-600 font-bold">Cached</span>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-center">
                  <p className="text-xs text-gray-500 font-medium">Submissions</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{stats.cachedSubmissions}</p>
                  <span className="text-[10px] text-emerald-600 font-bold">Local</span>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-center">
                  <p className="text-xs text-gray-500 font-medium">Pending Sync</p>
                  <p className="text-xl font-bold text-amber-600 mt-1">{stats.pendingSyncCount}</p>
                  <span className="text-[10px] text-amber-600 font-bold">In Queue</span>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-200">
                  <div>
                    <p className="text-xs font-bold text-gray-800">Simulate Offline Mode</p>
                    <p className="text-[11px] text-gray-500">Test how the platform performs in rural, zero-connectivity schools</p>
                  </div>
                  <button
                    onClick={toggleForceOffline}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                      isOfflineModeForced 
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    )}
                  >
                    {isOfflineModeForced ? "Forced Offline (ON)" : "Simulate (OFF)"}
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCacheRefresh}
                    disabled={!isOnline || isSyncing}
                    className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={cn(isSyncing && "animate-spin")} />
                    <span>Download Latest Cache</span>
                  </button>

                  <button
                    onClick={handleManualSync}
                    disabled={!isOnline || isSyncing || stats.pendingSyncCount === 0}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:shadow-none"
                  >
                    <CloudUpload size={14} />
                    <span>Sync Pending ({stats.pendingSyncCount})</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">Confirm Logout</h3>
                <p className="text-sm text-gray-500">Are you sure you want to exit the GEDE Masterpiece platform?</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
