import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Zap, 
  Clock, 
  ArrowRight, 
  AlertCircle,
  BarChart3,
  Smartphone,
  User,
  GraduationCap,
  Briefcase,
  Building2,
  Crown,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  Maximize,
  Minimize,
  ClipboardCheck,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';

const roles = [
  { id: 'student', name: 'Student', icon: GraduationCap, color: 'from-blue-500/20 to-cyan-500/20' },
  { id: 'teacher', name: 'Teacher', icon: User, color: 'from-emerald-500/20 to-teal-500/20' },
  { id: 'dos', name: 'DOS', icon: Briefcase, color: 'from-purple-500/20 to-pink-500/20' },
  { id: 'hm', name: 'Headmaster', icon: Building2, color: 'from-orange-500/20 to-amber-500/20' },
  { id: 'director', name: 'Director', icon: Crown, color: 'from-indigo-500/20 to-violet-500/20' },
  { id: 'examiner', name: 'Examiner', icon: ClipboardCheck, color: 'from-pink-500/20 to-rose-500/20' },
  { id: 'publisher', name: 'Publisher', icon: BookOpen, color: 'from-amber-500/20 to-yellow-500/20' },
];

const roleContent: Record<string, { before: string[], after: string[] }> = {
  dos: {
    before: [
      "Typing marks manually into computer only for formulas to break.",
      "Drafting complex timetables by hand for days.",
      "Chasing teachers for attendance and lesson plans.",
      "Checking for coverage manually across all classes.",
      "Responsible for poor performance even when teachers don't play their role.",
      "Printing hundreds of pages manually for every assessment.",
      "Organizing UNEB 20% marks for NCDC manually."
    ],
    after: [
      "Automated grading with 100% formula integrity.",
      "Dynamic AI-powered timetabling in seconds.",
      "Real-time digital attendance tracking.",
      "Centralized digital lesson plan repository.",
      "Automated coverage reports and teacher performance analytics.",
      "Digital exports and paperless assessments.",
      "One-click UNEB/NCDC 20% data synchronization."
    ]
  },
  teacher: {
    before: [
      "Manual grading of 100+ scripts every weekend.",
      "Writing repetitive feedback in every student notebook.",
      "Tracking individual competency levels on paper.",
      "Manual lesson plan drafting from scratch.",
      "Chasing students for AoI submissions manually."
    ],
    after: [
      "AI-assisted grading with standardized NCDC levels.",
      "Automated feedback generation tailored to each student.",
      "Real-time competency tracking dashboard.",
      "AI-powered lesson planning based on NCDC standards.",
      "Automated submission reminders and digital collection."
    ]
  },
  student: {
    before: [
      "Using generic AI that gives direct answers (no learning).",
      "Manual tracking of AoI projects and deadlines.",
      "Limited access to local Ugandan curriculum resources.",
      "No clear path for competency improvement.",
      "Heavy bags filled with physical notebooks."
    ],
    after: [
      "Socratic AI Tutor that guides without giving direct answers.",
      "Automated project tracking and digital portfolios.",
      "Localized Ugandan resources and metaphors.",
      "Clear competency roadmap and personalized growth.",
      "Digital access to all materials on any device."
    ]
  },
  hm: {
    before: [
      "Blind to actual classroom coverage and teacher output.",
      "Manual financial tracking and fee collection errors.",
      "Physical book piracy leading to revenue loss.",
      "Difficulty in verifying teacher attendance and performance."
    ],
    after: [
      "Real-time coverage dashboard for the entire school.",
      "Automated financial reporting and MoMo integration.",
      "Digital Rights Management (DRM) for all school books.",
      "Verified teacher performance metrics and digital logs."
    ]
  },
  director: {
    before: [
      "Revenue loss from book piracy and counterfeiting.",
      "High administrative overhead and manual processes.",
      "Lack of national curriculum compliance visibility.",
      "Difficulty in scaling school operations efficiently."
    ],
    after: [
      "Closed-loop marketplace revenue and protected authorship.",
      "Streamlined admin with 90% cost reduction.",
      "100% NCDC compliance visibility across all branches.",
      "Data-driven school scaling and ROI analytics."
    ]
  },
  examiner: {
    before: [
      "Chasing centers for script parcels and manual tallying.",
      "Manual moderation of coursework marks leading to standard grading errors.",
      "Difficulty in spotting handwriting anomalies or copy-pasted student assignments.",
      "Lack of centralized verification of NCDC 20% continuous assessment."
    ],
    after: [
      "Real-time digital submission review with secure, encrypted biometrics.",
      "Automatic digital verification of NCDC and UNEB competency compliance.",
      "Secure digital logs with handwriting DNA authentication and plagiarism risk analytics.",
      "100% tamper-proof continuous assessment records synced with the national backbone."
    ]
  },
  publisher: {
    before: [
      "Heavy print book piracy in local markets causing severe revenue loss.",
      "No reliable way to prevent illegal photocopying of physical syllabus books.",
      "Completely blind to real-time school demand, classroom usage, and textbook adoption metrics.",
      "High distribution costs to deliver physical textbooks to remote schools."
    ],
    after: [
      "Secure Digital Rights Management (DRM) preventing illegal distribution.",
      "Closed-loop micro-billing and direct, real-time Mobile Money revenue streams.",
      "Direct mapping of student performance metrics to dynamically suggest matching certified textbooks.",
      "Instant, serverless delivery of verified syllabus materials to any registered school terminal."
    ]
  }
};

const LandingPage = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isAfter, setIsAfter] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 font-sans selection:bg-emerald-500/30 overflow-hidden relative">
      
      {/* Liquid Glass Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#111,_#050505)]" />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 180, 270, 360],
            x: [0, 100, 0, -100, 0],
            y: [0, -50, 0, 50, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] opacity-20"
          style={{
            background: 'radial-gradient(circle at center, #10b981 0%, transparent 50%)',
            filter: 'blur(80px)'
          }}
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [360, 270, 180, 90, 0],
            x: [0, -100, 0, 100, 0],
            y: [0, 50, 0, -50, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-20%] right-[-20%] w-[140%] h-[140%] opacity-10"
          style={{
            background: 'radial-gradient(circle at center, #3b82f6 0%, transparent 50%)',
            filter: 'blur(80px)'
          }}
        />
        <div className="absolute inset-0 backdrop-blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-4 min-h-screen md:h-screen flex flex-col overflow-y-auto md:overflow-hidden custom-scrollbar">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-4 md:mb-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20 text-sm">
              G
            </div>
            <h1 className="text-xl font-bold tracking-tighter text-white">GEDE <span className="text-emerald-500">Masterpiece</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleFullscreen}
              className="p-2 bg-white/5 border border-white/10 text-slate-400 hover:text-emerald-400 hover:bg-white/10 rounded-xl transition-all shadow-sm flex items-center justify-center group"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
            <Link to="/login" className="text-xs font-bold text-slate-400 hover:text-white transition-colors">Login</Link>
            <Link to="/register" className="px-5 py-1.5 bg-white text-black rounded-full text-xs font-bold hover:scale-105 transition-transform">Join Now</Link>
          </div>
        </header>

        <main className="flex-1 min-h-0 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {!selectedRole ? (
              <motion.div 
                key="role-selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-8"
              >
                <div className="space-y-2">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest"
                  >
                    <ShieldCheck size={12} /> NCDC 2026 CBC Ready
                  </motion.div>
                  <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                    Choose Your <span className="text-emerald-500">Perspective</span>
                  </h2>
                  <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base">
                    Experience how GEDE transforms the Ugandan education landscape for your specific role.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4 max-w-6xl mx-auto">
                  {roles.map((role, i) => (
                    <motion.button
                      key={role.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      onClick={() => setSelectedRole(role.id)}
                      className={`group relative p-4 md:p-6 rounded-[1.5rem] border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all flex flex-col items-center gap-3 overflow-hidden`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                      <div className="relative z-10 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <role.icon size={20} />
                      </div>
                      <span className="relative z-10 font-bold text-[10px] md:text-xs uppercase tracking-widst">{role.name}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="role-content"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto w-full max-h-full flex flex-col"
              >
                <button 
                  onClick={() => { setSelectedRole(null); setIsAfter(false); }}
                  className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold text-[10px] uppercase tracking-widest"
                >
                  <ChevronLeft size={14} /> Back to Roles
                </button>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col bg-opacity-40">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    {React.createElement(roles.find(r => r.id === selectedRole)!.icon, { size: 100 })}
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 shrink-0">
                    <div>
                      <h3 className="text-emerald-500 font-bold uppercase tracking-widest text-[10px] mb-1">Perspective: {roles.find(r => r.id === selectedRole)?.name}</h3>
                      <h4 className="text-3xl font-bold text-white leading-tight">The <span className="italic">{isAfter ? 'Masterpiece' : 'Struggle'}</span></h4>
                    </div>

                    <div className="bg-white/10 p-1 rounded-xl flex gap-1 border border-white/5">
                      <button 
                        onClick={() => setIsAfter(false)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${!isAfter ? 'bg-white text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                      >
                        Before
                      </button>
                      <button 
                        onClick={() => setIsAfter(true)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${isAfter ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
                      >
                        After
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 min-h-0">
                    <div className="overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                      <AnimatePresence mode="wait">
                        <motion.div 
                          key={isAfter ? 'after' : 'before'}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-3"
                        >
                          {(isAfter ? roleContent[selectedRole].after : roleContent[selectedRole].before).map((item, i) => (
                            <div key={i} className="flex items-start gap-3 group">
                              <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isAfter ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500/50'}`} />
                              <p className={`text-xs md:text-sm leading-relaxed ${isAfter ? 'text-slate-200' : 'text-slate-400'}`}>
                                {item}
                              </p>
                            </div>
                          ))}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <div className="relative flex flex-col">
                      <div className={`absolute inset-0 bg-gradient-to-br ${isAfter ? 'from-emerald-500/20 to-teal-500/20' : 'from-red-500/10 to-orange-500/10'} blur-3xl opacity-50`} />
                      <div className="relative bg-white/5 border border-white/10 p-6 rounded-[1.5rem] flex-1 flex flex-col justify-center items-center text-center space-y-4">
                        {isAfter ? (
                          <>
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                              <Zap size={32} />
                            </div>
                            <div className="space-y-1">
                              <h5 className="text-xl font-bold text-white">100% Digital Mastery</h5>
                              <p className="text-slate-400 text-xs px-4">Automated, secure, and compliant with Ugandan standards.</p>
                            </div>
                            <Link to="/register" className="w-full py-3 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20">
                              Get Started Now
                            </Link>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500/50">
                              <XCircle size={32} />
                            </div>
                            <div className="space-y-1">
                              <h5 className="text-xl font-bold text-slate-300">The Manual Burden</h5>
                              <p className="text-slate-500 text-xs px-4">Inefficient, error-prone, and overwhelming for educators.</p>
                            </div>
                            <button onClick={() => setIsAfter(true)} className="w-full py-3 bg-white/10 text-white text-sm font-bold rounded-xl hover:bg-white/20 transition-all border border-white/10">
                              See the Solution
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="mt-4 pt-4 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
          <p className="text-[8px] text-slate-500 uppercase tracking-[0.2em] font-bold">© 2026 GEDE Platform • Ugandan Education Backbone</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-slate-500">
              <ShieldCheck size={12} />
              <span className="text-[8px] uppercase font-bold tracking-widest">UNEB Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Smartphone size={12} />
              <span className="text-[8px] uppercase font-bold tracking-widest">MoMo Integrated</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
