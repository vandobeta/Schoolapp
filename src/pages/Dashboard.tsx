import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { gemini } from "../services/gemini";
import { Activity, Submission, User as UserType, Subject, School, LearningCurve, TimetableEntry } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  BookOpen, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  BrainCircuit, 
  Camera,
  GraduationCap,
  ShieldCheck,
  Users,
  Fingerprint,
  Sparkles,
  Timer,
  FileText,
  TrendingUp,
  MessageSquare,
  Plus,
  UserPlus,
  Trash2,
  UserX,
  UserCheck,
  Building2,
  BarChart3,
  Ban,
  ShieldAlert,
  X,
  Download,
  Search,
  Database,
  Upload,
  Play,
  Pause,
  Video,
  ArrowRight,
  Image,
  EyeOff,
  Settings,
  Bell,
  Calendar,
  Layers,
  SearchCheck,
  BookMarked,
  FileSearch,
  BookCopy,
  Zap,
  User
} from "lucide-react";
import Markdown from 'react-markdown';
import { cn } from "../lib/utils";
import { AssessmentVisualization } from "../components/AssessmentVisualization";
import { ExamPaperGenerator } from "../components/ExamPaperGenerator";

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  if (user?.role === 'student') return <StudentDashboard />;
  if (user?.role === 'teacher' || user?.role === 'examiner') return <TeacherDashboard />;
  return <Admin />;
};

export const Activities: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'student') return <StudentActivitiesPage />;
  if (user?.role === 'teacher' || user?.role === 'examiner') return <TeacherDashboard />;
  return <Navigate to="/" />;
};

const StudentActivitiesPage: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'marked' | 'review'>('pending');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [correctionContent, setCorrectionContent] = useState<string | null>(null);
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [acts, subs, recs] = await Promise.all([
          api.activities.getAll(),
          api.submissions.getAll(),
          api.student.getRecommendations()
        ]);
        setActivities(acts || []);
        setSubmissions(subs || []);
        setRecommendations(recs || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const pendingActivities = useMemo(() => {
    return activities.filter(a => !submissions.some(s => s.aoiId === a.id));
  }, [activities, submissions]);

  const underReviewSubmissions = useMemo(() => {
    return submissions.filter(s => !s.grade);
  }, [submissions]);

  const markedSubmissions = useMemo(() => {
    return submissions.filter(s => !!s.grade);
  }, [submissions]);

  const handleAiCorrection = async (sub: Submission) => {
    setCorrectionLoading(true);
    setCorrectionContent(null);
    try {
      const activity = activities.find(a => a.id === sub.aoiId);
      const correction = await gemini.generateCorrection(
        sub.content, 
        activity?.title || "Unknown Activity", 
        sub.feedback || "Improve understanding"
      );
      setCorrectionContent(correction);
      // Mark as corrected in DB
      await api.submissions.markAsCorrected(sub.id);
      // Update local state
      setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, isCorrected: true } : s));
    } catch (err) {
      console.error(err);
    } finally {
      setCorrectionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Organizing Academic Workspace...</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Academic Integrity Center</h1>
          <p className="text-gray-500">Track pending tasks and review feedback with AI assistance.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm w-fit">
          {[
            { id: 'pending', label: 'Pending', count: pendingActivities.length },
            { id: 'review', label: 'Under Review', count: underReviewSubmissions.length },
            { id: 'marked', label: 'Marked', count: markedSubmissions.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedActivity(null);
                setSelectedSubmission(null);
                setCorrectionContent(null);
              }}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                activeTab === tab.id ? "bg-[#151619] text-white shadow-xl" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              {tab.label}
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px]",
                activeTab === tab.id ? "bg-white/10" : "bg-gray-100"
              )}>{tab.count}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'pending' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingActivities.map(act => (
                <motion.div
                  key={act.id}
                  whileHover={{ y: -5 }}
                  className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-emerald-200 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        {act.subjectName}
                      </span>
                      {act.deadline && (
                        <div className="flex items-center gap-1.5 text-orange-600">
                          <Clock size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-tight">Soon</span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{act.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-3 mb-6">{act.description}</p>
                  </div>
                  <Link
                    to="/dashboard"
                    className="w-full py-4 bg-[#151619] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all"
                  >
                    Go to Activity
                    <ArrowRight size={18} />
                  </Link>
                </motion.div>
              ))}
              {pendingActivities.length === 0 && (
                <div className="col-span-2 py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                  <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-4" />
                  <p className="text-gray-500 font-bold">Workspace Clear! All activities submitted.</p>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'review' || activeTab === 'marked') && (
            <div className="space-y-4">
              {(activeTab === 'review' ? underReviewSubmissions : markedSubmissions).map(sub => (
                <div 
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubmission(sub);
                    const act = activities.find(a => a.id === sub.aoiId);
                    if (act) setSelectedActivity(act);
                    setCorrectionContent(null);
                  }}
                  className={cn(
                    "bg-white p-6 rounded-[2rem] border transition-all cursor-pointer flex items-center gap-6",
                    selectedSubmission?.id === sub.id ? "border-emerald-500 ring-4 ring-emerald-500/5 shadow-xl" : "border-gray-100 hover:border-emerald-200 shadow-sm"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    sub.grade ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"
                  )}>
                    {sub.grade || <Clock size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-gray-900 truncate">{sub.activityTitle}</h4>
                      {sub.isCorrected && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[8px] font-bold uppercase">Corrected</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      {new Date(sub.timestamp).toLocaleDateString()} • {Math.floor(sub.engagementTime / 60)}m Focus
                    </p>
                  </div>
                  {sub.grade === 'L1' && (
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertCircle size={16} />
                      <span className="text-[10px] font-bold uppercase">Action Required</span>
                    </div>
                  )}
                  <ArrowRight size={18} className={cn(
                    "transition-transform",
                    selectedSubmission?.id === sub.id ? "translate-x-1" : "text-gray-300"
                  )} />
                </div>
              ))}
              {(activeTab === 'review' ? underReviewSubmissions : markedSubmissions).length === 0 && (
                <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                  <Layers size={40} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-bold">No submissions in this category.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <AnimatePresence mode="wait">
            {selectedSubmission ? (
              <motion.div
                key={selectedSubmission.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Submission Preview</h3>
                  <button onClick={() => {
                    setSelectedSubmission(null);
                    setSelectedActivity(null);
                    setCorrectionContent(null);
                  }} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Original Work</p>
                    <p className="text-sm text-gray-700 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">{selectedSubmission.content}</p>
                  </div>

                  {selectedSubmission.grade && (
                    <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4">
                      <div className="flex items-center justify-between text-emerald-900">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Pedagogical Review</span>
                        <div className="bg-white px-3 py-1 rounded-full text-xs font-bold">{selectedSubmission.grade}</div>
                      </div>
                      <p className="text-xs text-emerald-700 italic">"{selectedSubmission.feedback}"</p>
                      
                      {selectedSubmission.grade === 'L1' && !correctionContent && (
                        <button
                          onClick={() => handleAiCorrection(selectedSubmission)}
                          disabled={correctionLoading}
                          className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50"
                        >
                          {correctionLoading ? "Senior Guardian is working..." : "Bespoke AI Correction"}
                          <Sparkles size={16} />
                        </button>
                      )}
                    </div>
                  )}

                  {correctionContent && (
                    <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
                      <div className="flex items-center gap-2 text-blue-800">
                        <SearchCheck size={18} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Bespoke AI Correction</span>
                      </div>
                      <div className="text-xs text-blue-700 leading-relaxed overflow-y-auto max-h-80 prose prose-sm prose-blue">
                        <Markdown>{correctionContent}</Markdown>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-500/20"
              >
                <div className="p-4 bg-white/20 rounded-2xl w-fit mb-6">
                  <BookMarked size={32} className="text-emerald-100" />
                </div>
                <h3 className="text-xl font-bold mb-3">Academic Excellence</h3>
                <p className="text-sm text-emerald-100 leading-relaxed opacity-80">
                  Select a submission from the list to view detailed feedback, teacher comments, and AI-powered corrections for growth.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {recommendations.some(rec => rec.recommendedBooks && rec.recommendedBooks.length > 0) && (
            <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="text-gray-900 font-bold mb-6 flex items-center gap-3">
                <FileSearch size={20} className="text-emerald-500" />
                Study Resources
              </h3>
              <div className="space-y-4">
                {recommendations.filter(rec => rec.recommendedBooks && rec.recommendedBooks.length > 0).map(rec => (
                  <div key={rec.id} className="space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {rec.subjectName} Enhancement
                    </p>
                    {rec.recommendedBooks.map((book: any) => (
                      <div key={book.id} className="bg-gray-50 p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-emerald-50 hover:border-emerald-100 border border-transparent">
                        <div className="w-10 h-14 bg-white rounded-lg flex-shrink-0 overflow-hidden shadow-sm">
                          {book.coverUrl ? (
                            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-200">
                              <BookOpen size={16} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[12px] font-bold text-gray-900 truncate">{book.title}</h4>
                          <p className="text-[9px] text-emerald-600 font-bold uppercase">{book.price.toLocaleString()} UGX</p>
                        </div>
                        <Link 
                          to="/marketplace" 
                          className="p-2 text-gray-400 hover:text-emerald-500 transition-all"
                        >
                          <BookCopy size={16} />
                        </Link>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export const Messages: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const msgs = await api.messages.getAll();
        setMessages(msgs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, []);

  if (loading) return <div className="p-8">Loading Messages...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-gray-900">Communications</h1>
          <p className="text-gray-500">Official broadcasts and suggestions.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-black/5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {msg.type}
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  {new Date(msg.timestamp).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">{msg.content}</p>
              <div className="pt-4 border-t border-gray-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
                  {msg.senderName?.[0] || "S"}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold text-gray-900 truncate">{msg.senderName || "System"}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">{msg.senderRole || "OFFICIAL"}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const WorkTimer = ({ onTick }: { onTick: (time: number) => void }) => {
  const [time, setTime] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => {
        const next = prev + 1;
        onTick(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onTick]);

  return (
    <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest">
      Focus Time: {Math.floor(time / 60)}m {time % 60}s
    </p>
  );
};

interface HandwritingDnaCanvasProps {
  onEnroll: (vectorData: string) => void;
  isDark: boolean;
  aiLoading: boolean;
  onClose?: () => void;
}

const HandwritingDnaCanvas: React.FC<HandwritingDnaCanvasProps> = ({ onEnroll, isDark, aiLoading, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number; time: number }[]>([]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = isDark ? '#10b981' : '#059669'; // Emerald
      }
    }
  }, [isDark]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setPoints(prev => [...prev, { x, y, time: Date.now() }]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setPoints(prev => [...prev, { x, y, time: Date.now() }]);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setPoints([]);
  };

  const handleEnroll = () => {
    if (points.length < 10) {
      alert("Please write the text 'God is good' first!");
      return;
    }

    // Calculate handwriting DNA metrics
    let totalVelocity = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const dt = Math.max(1, points[i].time - points[i - 1].time);
      totalVelocity += Math.sqrt(dx * dx + dy * dy) / dt;
    }
    const avgVelocity = totalVelocity / points.length;

    let totalSlant = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      if (Math.abs(dy) > 1) {
        totalSlant += dx / dy;
      }
    }
    const avgSlant = totalSlant / points.length;

    const dnaVector = JSON.stringify({
      slant: parseFloat(avgSlant.toFixed(4)),
      pressure: 0.85,
      formation: "cursive-ug",
      strokesCount: points.length,
      averageVelocity: parseFloat(avgVelocity.toFixed(4)),
      enrolledAt: new Date().toISOString(),
      phrase: "God is good"
    });

    onEnroll(dnaVector);
  };

  return (
    <div className="space-y-6">
      <div className={cn(
        "p-4 rounded-2xl text-center text-xs font-bold uppercase tracking-widest",
        isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
      )}>
        Handwrite: <span className="underline italic text-sm font-black tracking-normal">"God is good"</span>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={180}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={cn(
            "w-full border rounded-2xl cursor-crosshair touch-none transition-all",
            isDark ? "bg-[#1f2023] border-white/10" : "bg-gray-50 border-gray-200"
          )}
        />
        {points.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-400/60 text-xs italic gap-2 text-center p-4">
            <span>Use mouse, trackpad, or touch screen to draw.</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500/50">"God is good"</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-xs">
        <button
          type="button"
          onClick={clearCanvas}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-xl transition-all",
            isDark ? "bg-white/5 text-gray-400 hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          Clear Pad
        </button>
        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
          {points.length > 0 ? `${points.length} stroke metrics captured` : "0 metrics"}
        </span>
      </div>

      <div className="flex gap-3">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "px-5 py-4 font-bold rounded-2xl transition-all text-xs uppercase tracking-widest",
              isDark ? "bg-white/5 text-gray-400 hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          disabled={aiLoading}
          onClick={handleEnroll}
          className="flex-1 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {aiLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Binding Handwriting DNA...
            </>
          ) : (
            <>
              <Fingerprint size={18} />
              Enroll Biometrics
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [tutorInput, setTutorInput] = useState("");
  const [tutorChat, setTutorChat] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [evidenceImage, setEvidenceImage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showDnaEnroll, setShowDnaEnroll] = useState(false);
  const [viewMode, setViewMode] = useState<'workspace' | 'analytics'>('workspace');
  const [isSystemDark, setIsSystemDark] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsSystemDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const [showWelcome, setShowWelcome] = useState(() => {
    if (!user?.welcomeNote) return false;
    // Prevent spamming by checking localStorage
    const seen = localStorage.getItem(`welcome_note_seen_${user.uid}`);
    return seen !== 'true';
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [showMessages, setShowMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tutoring Enhancement State
  const [tutorTurns, setTutorTurns] = useState(0);
  const [opusVideoData, setOpusVideoData] = useState<any>(null);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [showOpusModal, setShowOpusModal] = useState(false);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [learningCurve, setLearningCurve] = useState<LearningCurve | null>(null);
  
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const data = await api.student.getTimetable();
        setTimetable(data);
      } catch (err) {
        console.error("Failed to fetch timetable", err);
      }
    };
    fetchTimetable();
  }, []);

  const getNextLesson = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[currentTime.getDay()];
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    return timetable
      .filter(t => t.day === currentDay)
      .map(t => {
        const [h, m] = t.startTime.split(':').map(Number);
        return { ...t, startMinutes: h * 60 + m };
      })
      .filter(t => t.startMinutes > currentMinutes)
      .sort((a, b) => a.startMinutes - b.startMinutes)[0];
  };

  const nextLesson = getNextLesson();

  const getTimeUntilNextLesson = () => {
    if (!nextLesson) return null;
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const diff = nextLesson.startMinutes - currentMinutes;
    return diff;
  };

  const timeUntil = getTimeUntilNextLesson();

  useEffect(() => {
    if (timeUntil === 10) {
      alert(`Reminder: ${nextLesson?.subjectName} starts in 10 minutes!`);
    }
  }, [timeUntil, nextLesson]);

  const getCountdown = (deadline?: string) => {
    if (!deadline) return null;
    const end = new Date(deadline);
    const diff = end.getTime() - currentTime.getTime();
    if (diff <= 0) return "Expired";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };
  
  // Engagement Logic
  const engagementTimeRef = useRef(0);
  const handleTick = useCallback((t: number) => {
    engagementTimeRef.current = t;
  }, []);

  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  
  const filteredActivities = useMemo(() => {
    return selectedSubject 
      ? activities.filter(a => a.subjectId === selectedSubject)
      : activities;
  }, [activities, selectedSubject]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subsData, acts, submissionsData, recs, curve] = await Promise.all([
          api.student.getSubjects(),
          api.activities.getAll(),
          api.submissions.getAll(),
          api.student.getRecommendations(),
          api.student.getLearningCurve()
        ]);
        setSubjects(subsData || []);
        setActivities(acts || []);
        setSubmissions(submissionsData || []);
        setRecommendations(recs || []);
        setLearningCurve(curve || null);
        if (subsData && subsData.length > 0) setSelectedSubject(subsData[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedActivity) {
      engagementTimeRef.current = 0;
    }
  }, [selectedActivity]);

  const handleTutorQuery = async () => {
    if (!selectedActivity || !tutorInput) return;
    const userMsg = tutorInput;
    setTutorInput("");
    setTutorChat(prev => [...prev, { role: 'user', content: userMsg }]);
    setTutorLoading(true);
    setTutorTurns(prev => prev + 1);
    
    try {
      const subjectName = subjects.find(s => s.id === selectedActivity.subjectId)?.name || "Subject";
      const response = await gemini.getTutorResponse(userMsg, {
        name: user?.name || "Student",
        subject: subjectName,
        activity: selectedActivity.title,
        learningCurve: learningCurve || undefined
      });
      setTutorChat(prev => [...prev, { role: 'model', content: response || "I'm here to guide you. What part of the activity are you exploring?" }]);
      
      // Trigger Opus Agent if student continues to struggle (more than 4 turns)
      // Or if the student explicitly mentions failure/stuck
      const struggleKeywords = ['fail', 'stuck', 'don\'t understand', 'confused', 'help me', 'hard'];
      const isStrugglingExplicitly = struggleKeywords.some(kw => userMsg.toLowerCase().includes(kw));
      
      if ((tutorTurns >= 3 || isStrugglingExplicitly) && !opusVideoData && !generatingVideo) {
        setGeneratingVideo(true);
        try {
          const videoData = await gemini.generateOpusVideoTutorial({
            name: user?.name || "Student",
            subject: subjectName,
            activity: selectedActivity.title,
            struggleArea: userMsg,
            learningCurve: learningCurve || undefined
          });
          setOpusVideoData(videoData);
        } catch (err) {
          console.error("Opus Generation failed", err);
        } finally {
          setGeneratingVideo(false);
        }
      }
      
    } catch (err) {
      console.error(err);
      setTutorChat(prev => [...prev, { role: 'model', content: "I'm having trouble connecting to the Guardian AI. Please try again in a moment." }]);
    } finally {
      setTutorLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tutorChat]);

  const handleSubmission = async () => {
    if (!selectedActivity || !submissionContent) return;
    try {
      // Run Integrity Checker if online, otherwise default to offline pass
      let risk: any = { score: 0, reasons: ["Offline submission queued locally - full validation on sync"], matches: [] };
      const isForcedOffline = localStorage.getItem("force_offline_mode") === "true";
      const isOnline = navigator.onLine && !isForcedOffline;

      if (isOnline) {
        try {
          risk = await gemini.checkPlagiarism(submissionContent, selectedActivity.title);
        } catch {
          risk = { score: 0, reasons: ["Standard offline submission validation"], matches: [] };
        }
      }
      
      const res = await api.submissions.create({
        aoiId: selectedActivity.id,
        activityTitle: selectedActivity.title,
        content: submissionContent,
        engagementTime: engagementTimeRef.current,
        plagiarismRisk: risk
      });

      const subs = await api.submissions.getAll();
      setSubmissions(subs);
      setSelectedActivity(null);
      setSubmissionContent("");

      if (res?.isOffline) {
        alert(res.message || "Work saved to browser storage (IndexedDB). It will upload once connection is restored.");
      } else {
        alert("Activity submitted successfully!");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Submission failed. Please check your connection.");
    }
  };

  const handleDnaEnroll = async (vectorData: string) => {
    setAiLoading(true);
    try {
      await api.users.enrollDna(vectorData);
      setShowDnaEnroll(false);
      if (user) {
        user.dnaEnrolled = true;
        user.dnaVector = vectorData;
      }
      alert("Handwriting DNA biometrics successfully enrolled and permanently linked to your registry identifier!");
    } catch (err) {
      console.error(err);
      alert("Failed to enroll biometrics. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage) return;
    try {
      await api.messages.send({
        recipientId: "all", // Suggestions go to staff
        content: newMessage,
        type: "suggestion",
        isAnonymous,
        isViewOnce
      });
      setNewMessage("");
      setIsAnonymous(false);
      setIsViewOnce(false);
      setShowOptions(false);
      const msgs = await api.messages.getAll();
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewOnce = async (msgId: number) => {
    try {
      await api.messages.markAsViewed(msgId);
      const msgs = await api.messages.getAll();
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePurchase = async (bookId: number, price: number) => {
    try {
      await api.marketplace.purchaseBook(bookId, price);
      const recs = await api.student.getRecommendations();
      setRecommendations(recs);
      alert("Purchase successful! You can now access this book in your library.");
    } catch (err) {
      console.error(err);
      alert("Purchase failed. Please try again.");
    }
  };

  const handleOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setOcrError("Please upload an image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setOcrError("Image is too large. Max 5MB.");
      return;
    }

    setOcrLoading(true);
    setOcrError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        setEvidenceImage(result);
        try {
          const base64 = result.split(',')[1];
          const text = await gemini.ocrHandwriting(base64, file.type);
          setSubmissionContent(prev => prev ? `${prev}\n\n${text}` : text);
        } catch (err: any) {
          console.error("OCR Error:", err);
          setOcrError(err.message || "Failed to extract text.");
        } finally {
          setOcrLoading(false);
        }
      };
      reader.onerror = () => {
        setOcrError("Failed to read file.");
        setOcrLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("File reading error:", err);
      setOcrError("An unexpected error occurred.");
      setOcrLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!submissionContent) return;
    try {
      await navigator.clipboard.writeText(submissionContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const msgs = await api.messages.getAll();
        setMessages(msgs);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full">Loading...</div>;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 w-full">
        {/* Welcome Note Overlay */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-[2.5rem] p-6 md:p-10 max-w-lg w-full shadow-2xl border border-emerald-100 text-center space-y-6 mx-4">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Sparkles size={32} className="md:w-10 md:h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Official Welcome</h2>
                <div className="p-4 md:p-6 bg-emerald-50 rounded-2xl italic text-emerald-800 border border-emerald-100 text-sm md:text-base leading-relaxed">
                  "Hi, {user?.name}, Mr. {user?.dosName} warmly welcomes you to {user?.schoolName}, please keep your <span className="font-bold text-emerald-600 underline font-mono">{user?.institutionalId}</span> safe as it is the only way you can access your activities and contribute to your unrb score efficiently, don't share your identification with anyone. Thank you."
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowWelcome(false);
                  localStorage.setItem(`welcome_note_seen_${user?.uid}`, 'true');
                }}
                className="w-full py-4 bg-[#151619] text-white font-bold rounded-2xl hover:bg-black transition-all"
              >
                Start Learning
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DNA Enrollment Overlay */}
      <AnimatePresence>
        {showDnaEnroll && !showWelcome && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md transition-colors",
              isSystemDark ? "bg-[#151619]/95" : "bg-gray-100/95"
            )}
          >
            <div className={cn(
              "max-w-md w-full p-8 md:p-10 rounded-[2.5rem] shadow-2xl space-y-6 text-center border transition-all",
              isSystemDark ? "bg-[#16171a] text-white border-white/5" : "bg-white text-gray-900 border-gray-200"
            )}>
              <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40 rotate-12">
                <Fingerprint size={42} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight">Handwriting DNA</h2>
                <p className={cn("text-xs leading-relaxed", isSystemDark ? "text-gray-400" : "text-gray-500")}>
                  To guarantee academic integrity, we capture a baseline vector sample of your signature stroke behaviors. Please handwrite the phrase requested on the canvas below.
                </p>
              </div>

              <HandwritingDnaCanvas 
                onEnroll={handleDnaEnroll} 
                isDark={isSystemDark} 
                aiLoading={aiLoading} 
                onClose={() => setShowDnaEnroll(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">Deep Work Hub</h1>
          <p className="text-xs md:text-sm text-gray-500">Focus on your competencies. Your AI tutor is ready.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 self-start sm:self-auto">
          {/* View Mode Toggle */}
          <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
            <button
              onClick={() => setViewMode('workspace')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer",
                viewMode === 'workspace' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-gray-500 hover:bg-gray-50 bg-transparent"
              )}
            >
              <BookOpen size={14} />
              Workspace
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer",
                viewMode === 'analytics' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-gray-500 hover:bg-gray-50 bg-transparent"
              )}
            >
              <TrendingUp size={14} />
              My Progress
            </button>
          </div>

          <div className="px-4 py-2 md:px-5 md:py-3 bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-gray-700 text-sm md:text-base">{user?.class || "S.1"}</span>
          </div>
        </div>
      </header>

      {viewMode === 'workspace' ? (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">Your Subjects</h3>
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
              {subjects.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSubject(s.id)}
                  className={cn(
                    "whitespace-nowrap lg:whitespace-normal px-4 py-3 md:px-5 md:py-4 rounded-xl md:rounded-2xl text-left font-bold transition-all flex items-center justify-between shrink-0 lg:shrink",
                    selectedSubject === s.id ? "bg-[#151619] text-white shadow-xl" : "text-gray-500 hover:bg-gray-50 bg-gray-50/50"
                  )}
                >
                  <span className="text-xs md:text-sm">{s.name}</span>
                  {selectedSubject === s.id && <div className="hidden lg:block w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-3">
                <BookOpen size={20} className="text-emerald-500 md:w-6 md:h-6" />
                Activities of Integration
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {filteredActivities.map((act) => (
                <motion.button
                  key={act.id}
                  whileHover={{ y: -5 }}
                  onClick={() => setSelectedActivity(act)}
                  className={cn(
                    "p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] text-left transition-all border-2 relative overflow-hidden group",
                    selectedActivity?.id === act.id 
                      ? "bg-[#151619] text-white border-[#151619] shadow-2xl" 
                      : "bg-white text-gray-900 border-transparent shadow-sm hover:border-emerald-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-3xl transition-all",
                    selectedActivity?.id === act.id ? "bg-emerald-500/20" : "bg-emerald-500/5 group-hover:bg-emerald-500/10"
                  )} />
                  <p className={cn(
                    "text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] mb-2 md:mb-3",
                    selectedActivity?.id === act.id ? "text-emerald-400" : "text-emerald-600"
                  )}>
                    {act.subjectName} • {act.areaK}
                  </p>
                  <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 relative z-10 leading-tight">{act.title}</h3>
                  <p className={cn(
                    "text-xs md:text-sm line-clamp-2 relative z-10",
                    selectedActivity?.id === act.id ? "text-gray-400" : "text-gray-500"
                  )}>
                    {act.description}
                  </p>
                </motion.button>
              ))}
            </div>
          </section>

          <AnimatePresence>
            {selectedActivity && (
              <motion.section 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-black/5 space-y-6 md:space-y-8 relative"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Timer size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-2xl font-bold text-gray-900 leading-tight">{selectedActivity.title}</h2>
                      <WorkTimer key={selectedActivity.id} onTick={handleTick} />
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedActivity(null)}
                    className="self-start md:self-auto px-4 py-2 hover:bg-gray-100 rounded-xl md:rounded-2xl transition-all text-gray-400 text-xs md:text-sm font-medium border border-gray-100"
                  >
                    Close Workspace
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-10">
                  {/* Socratic Tutor */}
                  <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-8 bg-[#151619] text-white flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                          <Sparkles className="text-white" size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg leading-tight">Socratic Tutor</h3>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">AI Integrity Engine</p>
                            {learningCurve && (
                              <span className="px-2 py-0.5 bg-white/10 rounded-full text-[8px] font-bold uppercase tracking-widest text-emerald-200 border border-white/10">
                                {learningCurve.learningPace} Learner
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Online</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50 custom-scrollbar">
                      {tutorChat.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                          <MessageSquare size={48} className="text-gray-300" />
                          <p className="text-sm font-medium text-gray-500 max-w-[200px]">Start a conversation about your current activity.</p>
                        </div>
                      ) : (
                        <>
                          {tutorChat.map((chat, idx) => (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                "flex flex-col max-w-[85%]",
                                chat.role === 'user' ? "ml-auto items-end" : "items-start"
                              )}
                            >
                              <div className={cn(
                                "px-6 py-4 rounded-[2rem] text-sm leading-relaxed shadow-sm",
                                chat.role === 'user' 
                                  ? "bg-emerald-500 text-white rounded-tr-none" 
                                  : "bg-white text-gray-700 border border-gray-100 rounded-tl-none"
                              )}>
                                <Markdown>{chat.content}</Markdown>
                              </div>
                              <span className="mt-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest px-2">
                                {chat.role === 'user' ? 'You' : 'Guardian AI'}
                              </span>
                            </motion.div>
                          ))}
                          
                          {generatingVideo && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2rem] flex items-center gap-4"
                            >
                              <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center animate-pulse">
                                <Video className="text-white" size={24} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-indigo-900">Opus Agent is generating a bespoke video masterclass for you, {user?.name}...</p>
                                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">Personalizing curriculum visuals</p>
                              </div>
                            </motion.div>
                          )}

                          {opusVideoData && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-6 bg-emerald-600 text-white rounded-[2rem] shadow-xl overflow-hidden relative cursor-pointer group"
                              onClick={() => setShowOpusModal(true)}
                            >
                              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
                              <div className="relative flex items-center gap-6">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Play className="text-white fill-white" size={32} />
                                </div>
                                <div className="flex-1">
                                  <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mb-1">Bespoke Video Masterclass</p>
                                  <h4 className="text-lg font-bold leading-tight">{opusVideoData.videoTitle}</h4>
                                  <p className="text-xs text-emerald-100/70 mt-1 line-clamp-1 italic">"{opusVideoData.introduction}"</p>
                                </div>
                              </div>
                              
                              <div className="mt-6 space-y-3">
                                {opusVideoData.chapters.slice(0, 2).map((chap: any, i: number) => (
                                  <div key={i} className="flex items-center gap-3 text-[10px] bg-white/10 px-3 py-2 rounded-xl">
                                    <span className="font-mono text-emerald-300">{chap.timestamp}</span>
                                    <span className="font-bold truncate">{chap.title}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-4 flex items-center justify-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Click to Play Masterclass</span>
                              </div>
                            </motion.div>
                          )}
                        </>
                      )}
                      {tutorLoading && (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <div className="flex gap-1">
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="p-6 bg-white border-t border-gray-100">
                      <div className="relative flex items-center gap-3">
                        <input
                          type="text"
                          value={tutorInput}
                          onChange={(e) => setTutorInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleTutorQuery()}
                          placeholder="Ask for guidance, not answers..."
                          className="flex-1 px-8 py-5 bg-gray-50 border border-gray-200 rounded-[2rem] text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all pr-16"
                        />
                        <button 
                          onClick={handleTutorQuery}
                          disabled={tutorLoading || !tutorInput}
                          className="absolute right-2 p-4 bg-emerald-500 text-white rounded-[1.5rem] hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submission Area */}
                  <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col h-[600px]">
                    <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">Activity Submission</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">NCDC Curriculum Standards</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowDnaEnroll(true)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                            user?.dnaVector 
                              ? "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100/50" 
                              : "bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100"
                          )}
                        >
                          <Fingerprint size={14} />
                          {user?.dnaVector ? "DNA Verified" : "DNA Required (Click to Enroll)"}
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <FileText size={14} />
                          Submission Content
                        </label>
                        <div className="relative">
                          <textarea
                            value={submissionContent}
                            onChange={(e) => setSubmissionContent(e.target.value)}
                            placeholder="Paste your work or type your activity response here..."
                            className={cn(
                              "w-full h-48 px-8 py-6 bg-gray-50 border border-gray-200 rounded-[2rem] text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none transition-all leading-relaxed",
                              ocrLoading && "opacity-50 blur-[1px]"
                            )}
                          />
                          {ocrLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[2px] rounded-[2rem] z-10">
                              <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest animate-pulse">OCR in Progress...</p>
                              </div>
                            </div>
                          )}
                          <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 z-20">
                            {ocrError && (
                              <div className="flex items-center gap-2">
                                <div className="bg-red-50 text-red-600 text-[10px] font-bold px-3 py-1 rounded-lg border border-red-100 animate-pulse">
                                  {ocrError}
                                </div>
                                <button 
                                  onClick={() => fileInputRef.current?.click()}
                                  className="p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                                >
                                  <Plus size={10} className="rotate-45" />
                                </button>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleOcr} 
                                accept="image/*" 
                                className="hidden" 
                              />
                              <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={ocrLoading}
                                className="p-3 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-emerald-500 transition-all shadow-sm"
                              >
                                <Camera size={20} />
                              </button>
                              {submissionContent && (
                                <button 
                                  type="button"
                                  onClick={() => setSubmissionContent("")}
                                  className="p-3 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-red-500 transition-all shadow-sm"
                                >
                                  <Trash2 size={20} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <Image size={14} />
                          Handwritten Evidence (OCR)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="relative group">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleOcr}
                              disabled={ocrLoading}
                              className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                            />
                            <div className={cn(
                              "h-32 border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center gap-2 group-hover:border-emerald-400 transition-all bg-gray-50 relative overflow-hidden",
                              ocrLoading && "opacity-50"
                            )}>
                              {evidenceImage ? (
                                <img src={evidenceImage} alt="Evidence" className="h-full w-full object-cover rounded-[2rem]" />
                              ) : (
                                <>
                                  <Upload size={24} className="text-gray-300" />
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Upload Scan</span>
                                </>
                              )}
                              {ocrLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100 flex flex-col justify-center">
                            <p className="text-[10px] text-emerald-700 font-bold leading-relaxed">
                              Upload a clear photo of your handwritten work. Our AI will verify your "Stroke-DNA" to ensure authorship integrity.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 bg-gray-50 border-t border-gray-100">
                      <button 
                        onClick={handleSubmission}
                        disabled={!submissionContent || !selectedActivity}
                        className="w-full py-5 bg-[#151619] text-white font-bold rounded-[2rem] hover:bg-black transition-all shadow-xl shadow-black/20 flex items-center justify-center gap-3 group disabled:opacity-50"
                      >
                        <span>Submit for Review</span>
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-8">
          {nextLesson && (
            <section className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-125 transition-transform" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Zap size={20} className="text-emerald-300" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Next Lesson In {timeUntil}m</p>
                  </div>
                  <Bell size={18} className={cn("text-emerald-300", timeUntil && timeUntil <= 10 && "animate-bounce")} />
                </div>
                <h3 className="text-2xl font-bold mb-2">{nextLesson.subjectName}</h3>
                <div className="flex items-center gap-4 text-emerald-100 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} />
                    <span>{nextLesson.startTime} - {nextLesson.endTime}</span>
                  </div>
                  {nextLesson.teacherName && (
                    <div className="flex items-center gap-1.5 border-l border-white/20 pl-4">
                      <User size={14} />
                      <span>{nextLesson.teacherName}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Calendar size={22} className="text-emerald-500" />
              Daily Timetable
            </h2>
            <div className="space-y-4">
              {timetable.filter(t => t.day === ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentTime.getDay()]).length === 0 ? (
                <p className="text-xs text-gray-400 italic">No lessons scheduled for today.</p>
              ) : (
                timetable
                  .filter(t => t.day === ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentTime.getDay()])
                  .map((entry) => {
                    const start = entry.startTime.split(':').map(Number);
                    const now = [currentTime.getHours(), currentTime.getMinutes()];
                    const isActive = now[0] * 60 + now[1] >= start[0] * 60 + start[1] && 
                                    now[0] * 60 + now[1] < entry.endTime.split(':').map(Number)[0] * 60 + entry.endTime.split(':').map(Number)[1];
                    
                    return (
                      <div key={entry.id} className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl transition-all border",
                        isActive ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-transparent"
                      )}>
                        <div className="text-center min-w-[60px]">
                          <p className="text-[10px] font-bold text-gray-900">{entry.startTime}</p>
                          <p className="text-[8px] text-gray-400 font-bold uppercase">{entry.endTime}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm truncate">{entry.subjectName}</h4>
                          <p className="text-[10px] text-gray-400 font-medium">{entry.teacherName || 'TBA'}</p>
                        </div>
                        {isActive && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
                      </div>
                    );
                  })
              )}
            </div>
          </section>

          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Clock size={22} className="text-emerald-500" />
              Progress Feed
            </h2>
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div key={sub.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-all group">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    sub.grade ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"
                  )}>
                    {sub.grade || <Clock size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate text-sm">{sub.activityTitle}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      {new Date(sub.timestamp).toLocaleDateString()} • {Math.floor(sub.engagementTime / 60)}m Focus
                    </p>
                  </div>
                  {sub.dnaVerified && <ShieldCheck size={16} className="text-emerald-500" />}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#151619] p-8 rounded-[2.5rem] text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <h3 className="font-bold mb-6 flex items-center gap-3 text-emerald-400">
              <TrendingUp size={20} />
              Competency Radar
            </h3>
            <div className="space-y-6">
              {[
                { label: "Environment", val: 85 },
                { label: "Commerce", val: 42 },
                { label: "Health", val: 68 }
              ].map(stat => (
                <div key={stat.label}>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400">
                    <span>{stat.label}</span>
                    <span className="text-emerald-400">{stat.val}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.val}%` }}
                      className="h-full bg-emerald-500" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {recommendations.some(rec => rec.recommendedBooks && rec.recommendedBooks.length > 0) && (
            <section className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100">
              <h3 className="text-emerald-900 font-bold mb-4 flex items-center gap-2">
                <Sparkles size={20} className="text-emerald-500" />
                Recommended Resources
              </h3>
              <div className="space-y-4">
                {recommendations.filter(rec => rec.recommendedBooks && rec.recommendedBooks.length > 0).map(rec => (
                  <div key={rec.id} className="space-y-3">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                      Based on {rec.subjectName} performance
                    </p>
                    {rec.recommendedBooks.map((book: any) => (
                      <div key={book.id} className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                          {book.coverUrl ? (
                            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <BookOpen size={20} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 truncate">{book.title}</h4>
                          <p className="text-[10px] text-gray-500">{book.publisherName}</p>
                          <p className="text-xs font-bold text-emerald-600 mt-1">{book.price.toLocaleString()} UGX</p>
                        </div>
                        <button 
                          onClick={() => handlePurchase(book.id, book.price)}
                          className="px-4 py-2 bg-[#151619] text-white text-[10px] font-bold rounded-xl hover:bg-black transition-all"
                        >
                          Buy Now
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      ) : (
        <AssessmentVisualization submissions={submissions} subjects={subjects} studentMode={true} />
      )}

      {/* Messaging Module */}
      <div className="fixed bottom-8 right-8 z-40">
        <AnimatePresence>
          {showMessages && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-20 right-0 w-80 bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
            >
              <div className="p-6 bg-[#151619] text-white flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <MessageSquare size={18} />
                  Suggestions
                </h3>
                <button onClick={() => setShowMessages(false)} className="text-gray-400 hover:text-white">×</button>
              </div>
              <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50 custom-scrollbar">
                {messages.map((msg) => (
                  <div key={msg.id} className="p-3 bg-white rounded-2xl shadow-sm border border-black/5">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{msg.type}</p>
                      {msg.isAnonymous && (
                        <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter flex items-center gap-1">
                          <UserX size={8} />
                          {user?.role === 'developer' ? `From: ${msg.senderName || 'Unknown'}` : 'Anonymous'}
                        </span>
                      )}
                    </div>
                    
                    {msg.isViewOnce && !msg.isViewed ? (
                      <button 
                        onClick={() => handleViewOnce(msg.id)}
                        className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all"
                      >
                        <EyeOff size={12} />
                        View Once Message
                      </button>
                    ) : (
                      <p className="text-xs text-gray-700">
                        {msg.isViewOnce && msg.isViewed ? (
                          <span className="italic text-gray-400">[Message Expired]</span>
                        ) : msg.content}
                      </p>
                    )}
                    
                    <p className="text-[8px] text-gray-400 mt-1 font-bold uppercase tracking-widest">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-100 space-y-2">
                <AnimatePresence>
                  {showOptions && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex gap-2 mb-2"
                    >
                      <button
                        onClick={() => setIsAnonymous(!isAnonymous)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 transition-all",
                          isAnonymous ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                      >
                        <UserX size={10} />
                        Anonymous
                      </button>
                      <button
                        onClick={() => setIsViewOnce(!isViewOnce)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 transition-all",
                          isViewOnce ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                      >
                        <EyeOff size={10} />
                        View Once
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowOptions(!showOptions)}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      showOptions ? "bg-gray-200 text-gray-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    )}
                  >
                    <Plus size={14} />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Suggest a feature..."
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setShowMessages(!showMessages)}
          className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 hover:scale-110 transition-all active:scale-95"
        >
          <MessageSquare size={28} />
        </button>
      </div>

      {/* Opus Video Modal */}
      <AnimatePresence>
        {showOpusModal && opusVideoData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOpusModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-[#151619] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[80vh]"
            >
              <div className="flex-1 bg-black relative flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8">
                  <motion.div 
                    key={currentChapterIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="inline-block px-4 py-1.5 bg-emerald-500 rounded-full text-[10px] font-bold text-white uppercase tracking-widest mb-4">
                      {opusVideoData.chapters[currentChapterIndex].timestamp} • {opusVideoData.chapters[currentChapterIndex].title}
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                      {opusVideoData.chapters[currentChapterIndex].visualDescription}
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto italic leading-relaxed">
                      "{opusVideoData.chapters[currentChapterIndex].narrative}"
                    </p>
                  </motion.div>
                </div>

                <div className="p-8 bg-gradient-to-t from-black to-transparent">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <button className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all">
                        <Play size={20} fill="currentColor" />
                      </button>
                      <div className="text-white">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Opus Agent Avatar</p>
                        <p className="text-xs font-bold">{opusVideoData.avatarStyle}</p>
                      </div>
                    </div>
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentChapterIndex + 1) / opusVideoData.chapters.length) * 100}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        disabled={currentChapterIndex === 0}
                        onClick={() => setCurrentChapterIndex(prev => prev - 1)}
                        className="p-2 text-white hover:bg-white/10 rounded-lg disabled:opacity-30"
                      >
                        Prev
                      </button>
                      <button 
                        disabled={currentChapterIndex === opusVideoData.chapters.length - 1}
                        onClick={() => setCurrentChapterIndex(prev => prev + 1)}
                        className="p-2 bg-emerald-500 text-white font-bold rounded-lg disabled:opacity-30"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-80 bg-[#1a1b1e] border-l border-white/5 p-8 flex flex-col order-first md:order-last">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-white font-bold">Playlist</h3>
                  <button onClick={() => setShowOpusModal(false)} className="text-gray-500 hover:text-white">
                    <X size={24} />
                  </button>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                  {opusVideoData.chapters.map((chap: any, i: number) => (
                    <button 
                      key={i}
                      onClick={() => setCurrentChapterIndex(i)}
                      className={cn(
                        "w-full p-4 rounded-2xl flex items-start gap-4 transition-all text-left",
                        currentChapterIndex === i ? "bg-emerald-500/10 border border-emerald-500/20" : "hover:bg-white/5 opacity-40 hover:opacity-100"
                      )}
                    >
                      <span className="font-mono text-[10px] text-emerald-500 mt-0.5">{chap.timestamp}</span>
                      <div>
                        <p className="text-xs font-bold text-white mb-1">{chap.title}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-2">{chap.visualDescription}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-8 pt-8 border-t border-white/5 text-center">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">Bespoke Support</p>
                  <p className="text-[9px] text-gray-500">Curated by Opus Agent for {user?.name}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
);
};

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradingSub, setGradingSub] = useState<Submission | null>(null);
  const [grade, setGrade] = useState<"L1" | "L2" | "L3">("L1");
  const [feedback, setFeedback] = useState("");
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [aiGradingLoading, setAiGradingLoading] = useState(false);
  const [aiGradingResult, setAiGradingResult] = useState<{
    level: "L1" | "L2" | "L3";
    competencyArea: string;
    constructiveFeedback: string;
    standardizedComments: string;
    strengths: string[];
    weaknesses: string[];
  } | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [showMessages, setShowMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [activeTab, setActiveTab] = useState<"stats" | "activities" | "submissions" | "enrollment" | "planner" | "exams">(user?.role === 'examiner' ? "exams" : "stats");
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [selectedActivityForTimeline, setSelectedActivityForTimeline] = useState<string | null>(null);

  // Lesson Planner State
  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  const [plannerData, setPlannerData] = useState({
    subjectId: 0,
    class: "S.1",
    topic: "",
    competencyOutcome: "",
    duration: "80 minutes (Double)"
  });
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const [activePlanView, setActivePlanView] = useState<any | null>(null); // For Saved Plan Details modal

  // New Activity State
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newActivity, setNewActivity] = useState({
    title: "",
    description: "",
    subjectId: 0,
    class: "S.1",
    areaK: "",
    deadline: ""
  });
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  const [showWelcome, setShowWelcome] = useState(() => {
    if (!user?.welcomeNote) return false;
    const seen = localStorage.getItem(`welcome_note_seen_${user.uid}`);
    return seen !== 'true';
  });

  useEffect(() => {
    if (gradingSub) {
      setGrade(gradingSub.grade as any || "L1");
      setFeedback(gradingSub.feedback || "");
      setAiGradingResult(null);
      setGradingError(null);
    }
  }, [gradingSub]);

  // Enrollment State
  const [students, setStudents] = useState<UserType[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [enrollData, setEnrollData] = useState({ studentUid: "", subjectId: 0, studentClass: "S.1" });
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const getStudentEnrollmentCount = (uid: string) => {
    return enrollments.filter(e => e.studentUid === uid).length;
  };

  const checkCurriculumLink = () => {
    if (!enrollData.studentUid) return null;
    const count = getStudentEnrollmentCount(enrollData.studentUid);
    const isALevel = ["S.5", "S.6"].includes(enrollData.studentClass);
    
    if (isALevel) {
      if (count >= 5) return { type: 'warn', message: "A-Level suggests exactly 5 subjects (3 Principals + 2 Subsidiaries)." };
      return { type: 'info', message: `${count}/5 A-Level subjects enrolled.` };
    } else {
      if (count >= 10) return { type: 'warn', message: "O-Level (CBC) typically caps at 10 subjects." };
      if (count < 8) return { type: 'info', message: `${count}/8 minimum O-Level subjects enrolled.` };
      return { type: 'success', message: `${count} subjects enrolled. (O-Level range: 8-10)` };
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [teacherSchools, subs, msgs, studs, subjs, enrs, acts, plans] = await Promise.all([
          api.schools.getTeacherSchools(),
          api.submissions.getAll(),
          api.messages.getAll(),
          api.teacher.getStudents(),
          api.subjects.getAll(),
          api.teacher.getEnrollments(),
          api.activities.getAll(),
          api.lessonPlans.getAll()
        ]);
        setSchools(teacherSchools);
        if (teacherSchools.length > 0) setCurrentSchool(teacherSchools[0]);
        setSubmissions(subs);
        setMessages(msgs);
        setStudents(studs);
        setAllSubjects(subjs);
        setEnrollments(enrs);
        setActivities(acts);
        setLessonPlans(plans);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivityError(null);
    if (!newActivity.title || !newActivity.subjectId || !newActivity.areaK) {
      setActivityError("Title, Subject, and Area of Knowledge are required.");
      return;
    }
    setActivityLoading(true);
    try {
      await api.activities.create(newActivity);
      const updatedActs = await api.activities.getAll();
      setActivities(updatedActs);
      setNewActivity({
        title: "",
        description: "",
        subjectId: 0,
        class: "S.1",
        areaK: "",
        deadline: ""
      });
      setActiveTab("activities");
    } catch (err) {
      setActivityError("Failed to create activity.");
    } finally {
      setActivityLoading(false);
    }
  };

  const handleDeleteActivity = async (id: number) => {
    if (!confirm("Are you sure you want to delete this activity?")) return;
    try {
      await api.activities.delete(id);
      setActivities(activities.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError(null);
    if (!enrollData.studentUid || !enrollData.subjectId) {
      setEnrollError("Please select both a student and a subject.");
      return;
    }
    try {
      await api.teacher.enroll(enrollData);
      const updatedEnrollments = await api.teacher.getEnrollments();
      setEnrollments(updatedEnrollments);
      setEnrollData({ ...enrollData, studentUid: "" });
    } catch (err) {
      setEnrollError("Enrollment failed. Student might already be enrolled.");
    }
  };

  const handleRemoveEnrollment = async (id: number) => {
    try {
      await api.teacher.removeEnrollment(id);
      setEnrollments(enrollments.filter(e => e.id !== id));
      setConfirmRemoveId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateLessonPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlannerError(null);
    setGeneratedPlan(null);
    if (!plannerData.subjectId || !plannerData.topic || !plannerData.competencyOutcome) {
      setPlannerError("Please select a subject, and enter a topic and competency outcome.");
      return;
    }
    setGeneratingPlan(true);
    try {
      const res = await api.lessonPlans.generate(plannerData);
      setGeneratedPlan(res.content);
    } catch (err: any) {
      console.error(err);
      setPlannerError(err.message || "Failed to generate lesson plan.");
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleSaveLessonPlan = async () => {
    if (!generatedPlan) return;
    setPlannerError(null);
    try {
      const saveRes = await api.lessonPlans.save({
        ...plannerData,
        content: generatedPlan
      });
      const plans = await api.lessonPlans.getAll();
      setLessonPlans(plans);
      setGeneratedPlan(null);
      setPlannerData({
        subjectId: 0,
        class: "S.1",
        topic: "",
        competencyOutcome: "",
        duration: "80 minutes (Double)"
      });
      if (saveRes?.isOffline) {
        alert("Lesson plan saved to IndexedDB offline storage! It will sync to the school server when connected.");
      } else {
        alert("Lesson plan saved successfully!");
      }
    } catch (err: any) {
      console.error(err);
      setPlannerError(err.message || "Failed to save lesson plan.");
    }
  };

  const handleDeleteLessonPlan = async (id: number) => {
    if (!confirm("Are you sure you want to delete this lesson plan?")) return;
    try {
      await api.lessonPlans.delete(id);
      setLessonPlans(lessonPlans.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const [recipientId, setRecipientId] = useState("all");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studs = await api.teacher.getStudents();
        setStudents(studs);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStudents();
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage) return;
    try {
      await api.messages.send({
        recipientId,
        content: newMessage,
        type: recipientId === "all" ? "broadcast" : "direct",
        isAnonymous,
        isViewOnce
      });
      setNewMessage("");
      setIsAnonymous(false);
      setIsViewOnce(false);
      setShowOptions(false);
      const msgs = await api.messages.getAll();
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewOnce = async (msgId: number) => {
    try {
      await api.messages.markAsViewed(msgId);
      const msgs = await api.messages.getAll();
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGradeSubmission = async () => {
    if (!gradingSub || !grade) return;
    setGradingLoading(true);
    setGradingError(null);
    try {
      await api.submissions.grade(gradingSub.id, { grade, feedback });
      const updatedSubmissions = await api.submissions.getAll();
      setSubmissions(updatedSubmissions);
      setGradingSub(null);
      setGrade("L1");
      setFeedback("");
      setAiGradingResult(null);
    } catch (err: any) {
      console.error("Grading failed:", err);
      setGradingError(err.message || "Failed to finalize grade.");
    } finally {
      setGradingLoading(false);
    }
  };

  const handleAiGradeSuggestion = async () => {
    if (!gradingSub) return;
    setAiGradingLoading(true);
    setAiGradingResult(null);
    try {
      const result = await gemini.gradeSubmission(gradingSub.content, gradingSub.activityTitle);
      setAiGradingResult(result);
      
      if (result.level) setGrade(result.level);
      
      // We append the AI feedback to the current feedback if it exists
      const aiFeedback = `[AI Analysis - ${result.competencyArea}]\n${result.constructiveFeedback}\n\nStandardized Comment: ${result.standardizedComments}`;
      setFeedback(prev => prev ? `${prev}\n\n---\n${aiFeedback}` : aiFeedback);
    } catch (err) {
      console.error("AI Grading failed:", err);
    } finally {
      setAiGradingLoading(false);
    }
  };

  const [analyzingEngagement, setAnalyzingEngagement] = useState(false);
  const [engagementReport, setEngagementReport] = useState<string | null>(null);

  const handleAnalyzeEngagement = async () => {
    setAnalyzingEngagement(true);
    try {
      const report = await gemini.analyzeEngagementGap({
        name: "Class",
        class: "S.3",
        submissions: filteredSubmissions
      });
      setEngagementReport(report || "No significant engagement gaps detected.");
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingEngagement(false);
    }
  };

  const filteredSubmissions = currentSchool 
    ? submissions.filter(s => s.schoolCode === currentSchool.code)
    : submissions;

  const statsData = [
    { name: 'Level 1', value: filteredSubmissions.filter(s => s.grade === 'L1').length },
    { name: 'Level 2', value: filteredSubmissions.filter(s => s.grade === 'L2').length },
    { name: 'Level 3', value: filteredSubmissions.filter(s => s.grade === 'L3').length },
    { name: 'Pending', value: filteredSubmissions.filter(s => !s.grade).length },
  ];

  const uniqueActivities = Array.from(new Set(filteredSubmissions.map(s => s.activityTitle)));
  const timelineSubmissions = selectedActivityForTimeline 
    ? filteredSubmissions
        .filter(s => s.activityTitle === selectedActivityForTimeline)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : [];

  if (loading) return <div>Loading Command Center...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Welcome Note Overlay */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-[2.5rem] p-6 md:p-10 max-w-lg w-full shadow-2xl border border-emerald-100 text-center space-y-6 mx-4">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Sparkles size={32} className="md:w-10 md:h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Official Welcome</h2>
                <div className="p-4 md:p-6 bg-emerald-50 rounded-2xl italic text-emerald-800 border border-emerald-100 text-sm md:text-base leading-relaxed">
                  "Hi, Teacher {user?.name}, Mr. {user?.dosName} warmly welcomes you to {user?.schoolName}, please use the Pedagogy Command Center to manage your students and activities efficiently. Thank you for your commitment to excellence."
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowWelcome(false);
                  localStorage.setItem(`welcome_note_seen_${user?.uid}`, 'true');
                }}
                className="w-full py-4 bg-[#151619] text-white font-bold rounded-2xl hover:bg-black transition-all"
              >
                Access Command Center
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-8 w-full">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Pedagogical Command Center</h1>
          <p className="text-sm text-gray-500">Review student work and provide NCDC-standard feedback.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to="/forums" 
            className="hidden md:flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Users size={18} />
            Area K Forums
          </Link>
          {schools.length > 1 && (
          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm self-start sm:self-auto">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Switch School:</span>
            {schools.map(s => (
              <button
                key={s.id}
                onClick={() => setCurrentSchool(s)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  currentSchool?.id === s.id ? "bg-[#151619] text-white shadow-lg" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                {s.code}
              </button>
            ))}
          </div>
        )}
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab("stats")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              activeTab === "stats" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("activities")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              activeTab === "activities" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            Activities
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              activeTab === "submissions" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            Submissions
          </button>
          <button
            onClick={() => setActiveTab("enrollment")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              activeTab === "enrollment" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            Enrollment
          </button>
          <button
            onClick={() => setActiveTab("planner")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              activeTab === "planner" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            Lesson Planner
          </button>
          <button
            onClick={() => setActiveTab("exams")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
              activeTab === "exams" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <Sparkles size={13} className="text-amber-300" />
            Exam Generator
          </button>
        </div>
      </header>

      {activeTab === "submissions" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
          <div className="xl:col-span-2 space-y-6">
            <section className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-3 text-sm md:text-base">
                  <FileText size={20} className="text-emerald-500 md:w-5 md:h-5" />
                  Recent Submissions
                </h2>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                  {filteredSubmissions.length} Total
                </span>
              </div>
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto custom-scrollbar">
                {filteredSubmissions.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 italic text-sm">No submissions yet for this school.</div>
                ) : (
                  filteredSubmissions.map((sub) => (
                    <div 
                      key={sub.id} 
                      onClick={() => setGradingSub(sub)}
                      className={cn(
                        "p-4 md:p-6 flex items-center gap-4 md:gap-6 cursor-pointer transition-all hover:bg-gray-50",
                        gradingSub?.id === sub.id ? "bg-emerald-50/50" : ""
                      )}
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-gray-400 text-sm md:text-base">
                        {sub.studentName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm md:text-base truncate">{sub.studentName}</h4>
                        <p className="text-[10px] md:text-xs text-gray-500 truncate">{sub.activityTitle}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {sub.engagementTime > 0 && (
                            <div className="flex items-center gap-1">
                              <Timer size={10} className="text-emerald-500" />
                              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">
                                {Math.floor(sub.engagementTime / 60)}m {sub.engagementTime % 60}s focus
                              </span>
                            </div>
                          )}
                          {sub.plagiarismRisk && (
                            <div className={cn(
                              "flex items-center gap-1 px-1.5 py-0.5 rounded-md",
                              sub.plagiarismRisk === 'high' ? "bg-red-50 text-red-600" :
                              sub.plagiarismRisk === 'medium' ? "bg-orange-50 text-orange-600" :
                              "bg-emerald-50 text-emerald-600"
                            )}>
                              <ShieldAlert size={10} />
                              <span className="text-[8px] font-bold uppercase tracking-widest">
                                {sub.plagiarismRisk} Risk
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn(
                          "text-[8px] md:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 md:px-3 md:py-1 rounded-full inline-block",
                          sub.grade ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                        )}>
                          {sub.grade || "Pending"}
                        </p>
                        <p className="text-[8px] md:text-[10px] text-gray-400 mt-1">{new Date(sub.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Submission Timeline Visualization */}
            <section className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-3 text-sm md:text-base">
                  <Timer size={20} className="text-emerald-500 md:w-5 md:h-5" />
                  Submission Timeline
                </h2>
                <select 
                  className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={selectedActivityForTimeline || ""}
                  onChange={(e) => setSelectedActivityForTimeline(e.target.value)}
                >
                  <option value="">Select Activity</option>
                  {uniqueActivities.map(act => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </div>
              <div className="p-6 md:p-8">
                {!selectedActivityForTimeline ? (
                  <div className="text-center py-12 text-gray-400 italic text-sm">
                    Select an activity to view the submission progression timeline.
                  </div>
                ) : timelineSubmissions.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 italic text-sm">
                    No submissions found for this activity.
                  </div>
                ) : (
                  <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-100 before:to-transparent">
                    {timelineSubmissions.map((sub) => (
                      <div key={sub.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        {/* Icon */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            sub.grade === 'L3' ? "bg-emerald-500" : sub.grade === 'L2' ? "bg-blue-500" : sub.grade === 'L1' ? "bg-orange-500" : "bg-gray-300"
                          )} />
                        </div>
                        {/* Content */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
                          <div className="flex items-center justify-between space-x-2 mb-1">
                            <div className="font-bold text-gray-900 text-sm">{sub.studentName}</div>
                            <time className="font-mono text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                              {new Date(sub.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </time>
                          </div>
                          <div className="text-gray-500 text-xs mb-2">
                            Submitted on {new Date(sub.timestamp).toLocaleDateString()}
                          </div>
                          {sub.grade ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest",
                                  sub.grade === 'L3' ? "bg-emerald-100 text-emerald-700" : sub.grade === 'L2' ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                                )}>
                                  Grade: {sub.grade}
                                </span>
                                <span className="text-[9px] text-gray-400 italic">
                                  Graded at {new Date(sub.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              {sub.feedback && (
                                <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-xl italic border-l-2 border-emerald-500">
                                  "{sub.feedback.slice(0, 100)}..."
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-full">
                              Awaiting Grading
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {gradingSub ? (
                <motion.section 
                  key="grading"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-emerald-100 space-y-4 md:space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-sm md:text-base truncate pr-2">Grading: {gradingSub.studentName}</h3>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={handleAiGradeSuggestion}
                        disabled={aiGradingLoading}
                        title="Get AI Grading Suggestion"
                        className={cn(
                          "p-2 bg-emerald-50 text-emerald-600 rounded-lg md:rounded-xl hover:bg-emerald-100 transition-all",
                          aiGradingLoading && "animate-pulse"
                        )}
                      >
                        <BrainCircuit size={16} className="md:w-5 md:h-5" />
                      </button>
                      <button onClick={() => setGradingSub(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={16} className="md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Submission Content</span>
                    {gradingSub.engagementTime > 0 && (
                      <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg">
                        <Timer size={12} className="text-emerald-500" />
                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                          Focus: {Math.floor(gradingSub.engagementTime / 60)}m {gradingSub.engagementTime % 60}s
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-xl md:rounded-2xl text-xs md:text-sm text-gray-600 max-h-[150px] md:max-h-[200px] overflow-auto border border-gray-100 leading-relaxed">
                    {gradingSub.content}
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">NCDC Level</label>
                    <div className="flex gap-2">
                      {["L1", "L2", "L3"].map((l) => (
                        <button
                          key={l}
                          onClick={() => setGrade(l as any)}
                          className={cn(
                            "flex-1 py-2 md:py-3 rounded-lg md:rounded-xl font-bold transition-all text-xs md:text-sm",
                            grade === l ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          )}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pedagogical Feedback</label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full h-24 md:h-32 p-3 md:p-4 bg-gray-50 border border-gray-200 rounded-xl md:rounded-2xl text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                      placeholder="Provide constructive feedback..."
                    />
                  </div>

                  {aiGradingResult && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-3"
                    >
                      <div className="flex items-center gap-2 text-emerald-700">
                        <BrainCircuit size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">AI Analysis: {aiGradingResult.competencyArea}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase">Strengths</p>
                          <ul className="text-[10px] text-emerald-800 list-disc list-inside">
                            {aiGradingResult.strengths.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase">Weaknesses</p>
                          <ul className="text-[10px] text-emerald-800 list-disc list-inside">
                            {aiGradingResult.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-emerald-200">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Standardized Comment</p>
                        <p className="text-[11px] text-emerald-900 italic">"{aiGradingResult.standardizedComments}"</p>
                      </div>
                    </motion.div>
                  )}

                  {gradingError && (
                    <div className="p-3 md:p-4 bg-red-50 border border-red-100 text-red-600 text-[10px] md:text-xs font-bold rounded-xl md:rounded-2xl flex items-center gap-3">
                      <AlertCircle size={14} className="md:w-4 md:h-4" />
                      {gradingError}
                    </div>
                  )}

                  <button 
                    onClick={handleGradeSubmission}
                    disabled={gradingLoading}
                    className="w-full py-3 md:py-4 bg-[#151619] text-white font-bold rounded-xl md:rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50 text-xs md:text-sm"
                  >
                    {gradingLoading ? "Finalizing..." : "Finalize Grade"}
                  </button>
                </motion.section>
              ) : (
                <section className="bg-[#151619] p-8 rounded-[2.5rem] text-white space-y-6">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
                    <TrendingUp size={32} />
                  </div>
                  <h3 className="text-xl font-bold">Class Health</h3>
                  <p className="text-sm text-gray-400">Select a submission to start grading and see AI suggestions based on UNEB standards.</p>
                  <button 
                    onClick={handleAnalyzeEngagement}
                    disabled={analyzingEngagement}
                    className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                  >
                    <BrainCircuit size={20} />
                    {analyzingEngagement ? "Analyzing Gaps..." : "AI Engagement Analysis"}
                  </button>
                </section>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {activeTab === "enrollment" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-black/5 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <Plus size={24} className="text-emerald-500" />
                Enroll Student
              </h2>
              <form onSubmit={handleEnroll} className="space-y-4">
                {enrollError && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl flex items-center gap-3">
                    <AlertCircle size={16} />
                    {enrollError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Student</label>
                  <select
                    value={enrollData.studentUid}
                    onChange={(e) => {
                      const uid = e.target.value;
                      const student = students.find(s => s.uid === uid);
                      setEnrollData({ 
                        ...enrollData, 
                        studentUid: uid,
                        studentClass: student?.class || enrollData.studentClass 
                      });
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map(s => (
                      <option key={s.uid} value={s.uid}>{s.name} ({s.institutionalId})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Subject</label>
                  <select
                    value={enrollData.subjectId}
                    onChange={(e) => setEnrollData({ ...enrollData, subjectId: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={0}>-- Choose Subject --</option>
                    {allSubjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Class</label>
                  <select
                    value={enrollData.studentClass}
                    onChange={(e) => setEnrollData({ ...enrollData, studentClass: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="S.1">S.1</option>
                    <option value="S.2">S.2</option>
                    <option value="S.3">S.3</option>
                    <option value="S.4">S.4</option>
                    <option value="S.5">S.5</option>
                    <option value="S.6">S.6</option>
                  </select>
                </div>

                {enrollData.studentUid && (
                  <div className={cn(
                    "p-4 rounded-2xl text-[10px] font-bold border flex items-center gap-2",
                    checkCurriculumLink()?.type === 'warn' ? "bg-amber-50 border-amber-100 text-amber-600" :
                    checkCurriculumLink()?.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                    "bg-blue-50 border-blue-100 text-blue-600"
                  )}>
                    <AlertCircle size={14} />
                    <span className="uppercase tracking-widest">{checkCurriculumLink()?.message}</span>
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                >
                  Enroll Student
                </button>
              </form>
            </section>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-[2.5rem] shadow-xl border border-black/5 overflow-hidden">
              <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-3">
                  <GraduationCap size={22} className="text-emerald-500" />
                  Active Enrollments
                </h2>
                <span className="px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {enrollments.length} Students
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] border-b border-gray-100">
                      <th className="px-8 py-6">Student</th>
                      <th className="px-8 py-6">Subject</th>
                      <th className="px-8 py-6">Class</th>
                      <th className="px-8 py-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {enrollments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-12 text-center text-gray-400 italic">No enrollments managed by you yet.</td>
                      </tr>
                    ) : (
                      enrollments.map((e) => (
                        <tr key={e.id} className="hover:bg-gray-50/50 transition-all">
                          <td className="px-8 py-6">
                            <div className="font-bold text-gray-900">{e.studentName}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{e.studentId}</div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              {e.subjectName}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-xs font-bold text-gray-600">{e.class}</td>
                          <td className="px-8 py-6">
                            <button
                              onClick={() => handleRemoveEnrollment(e.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === "activities" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-black/5 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <Plus size={24} className="text-emerald-500" />
                New Activity
              </h2>
              <form onSubmit={handleCreateActivity} className="space-y-4">
                {activityError && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl flex items-center gap-3">
                    <AlertCircle size={16} />
                    {activityError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Title</label>
                  <input
                    type="text"
                    value={newActivity.title}
                    onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., Photosynthesis Experiment"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subject</label>
                  <select
                    value={newActivity.subjectId}
                    onChange={(e) => setNewActivity({ ...newActivity, subjectId: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={0}>-- Select Subject --</option>
                    {allSubjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target Class</label>
                  <select
                    value={newActivity.class}
                    onChange={(e) => setNewActivity({ ...newActivity, class: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {["S.1", "S.2", "S.3", "S.4", "S.5", "S.6"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Area of Knowledge</label>
                  <input
                    type="text"
                    value={newActivity.areaK}
                    onChange={(e) => setNewActivity({ ...newActivity, areaK: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., Biology"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Deadline</label>
                  <input
                    type="date"
                    value={newActivity.deadline}
                    onChange={(e) => setNewActivity({ ...newActivity, deadline: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</label>
                  <textarea
                    value={newActivity.description}
                    onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                    className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    placeholder="Detailed instructions..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={activityLoading}
                  className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {activityLoading ? "Creating..." : "Create Activity"}
                </button>
              </form>
            </section>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-[2.5rem] shadow-xl border border-black/5 overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-3 text-lg">
                  <FileText size={24} className="text-emerald-500" />
                  Activity Repository
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {activities.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 italic">No activities created yet.</div>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="p-6 hover:bg-gray-50 transition-all flex items-center justify-between group">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                            {act.subjectName} • {act.class}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{act.areaK}</span>
                        </div>
                        <h4 className="font-bold text-gray-900">{act.title}</h4>
                        <p className="text-xs text-gray-500 line-clamp-1">{act.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Deadline</p>
                          <p className="text-xs font-bold text-gray-700">{act.deadline ? new Date(act.deadline).toLocaleDateString() : "No date"}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteActivity(act.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === "planner" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Generator Form */}
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-black/5 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <Sparkles size={24} className="text-emerald-500" />
                NCDC Lesson Planner
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                Generate high-quality lesson plans aligned with Ugandan National Curriculum Development Centre (NCDC) competency outcomes, using pedagogical framework structures.
              </p>
              
              <form onSubmit={handleGenerateLessonPlan} className="space-y-4">
                {plannerError && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl flex items-center gap-3">
                    <AlertCircle size={16} />
                    {plannerError}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Subject</label>
                  <select
                    value={plannerData.subjectId}
                    onChange={(e) => setPlannerData({ ...plannerData, subjectId: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={0}>-- Select Subject --</option>
                    {allSubjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target Class</label>
                  <select
                    value={plannerData.class}
                    onChange={(e) => setPlannerData({ ...plannerData, class: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {["S.1", "S.2", "S.3", "S.4", "S.5", "S.6"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lesson Topic / Title</label>
                  <input
                    type="text"
                    value={plannerData.topic}
                    onChange={(e) => setPlannerData({ ...plannerData, topic: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., Soil Erosion & Conservation"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">NCDC Competency Outcome</label>
                  <textarea
                    value={plannerData.competencyOutcome}
                    onChange={(e) => setPlannerData({ ...plannerData, competencyOutcome: e.target.value })}
                    className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    placeholder="e.g., Learner understands the causes of soil erosion and can formulate local mitigation measures."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lesson Duration</label>
                  <select
                    value={plannerData.duration}
                    onChange={(e) => setPlannerData({ ...plannerData, duration: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="40 minutes (Single)">40 minutes (Single Lesson)</option>
                    <option value="80 minutes (Double)">80 minutes (Double Lesson)</option>
                    <option value="120 minutes">120 minutes (Triple Lesson)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={generatingPlan}
                  className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generatingPlan ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Designing Syllabus...
                    </>
                  ) : (
                    <>
                      <BrainCircuit size={18} />
                      Generate Lesson Plan
                    </>
                  )}
                </button>
              </form>
            </section>
          </div>

          {/* Right Column: Generation Result OR Repository List */}
          <div className="lg:col-span-2 space-y-6">
            {generatedPlan ? (
              <section className="bg-white rounded-[2.5rem] shadow-xl border border-emerald-100 overflow-hidden flex flex-col h-[700px]">
                <div className="p-8 border-b border-emerald-50 bg-emerald-50/20 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                      <Sparkles className="text-emerald-500" />
                      AI Generated Lesson Plan
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Preview your NCDC-aligned pedagogical outline before saving</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveLessonPlan}
                      className="px-5 py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 size={14} />
                      Save Plan
                    </button>
                    <button
                      onClick={() => setGeneratedPlan(null)}
                      className="px-5 py-2.5 bg-gray-100 text-gray-600 font-bold text-xs rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2"
                    >
                      <X size={14} />
                      Discard
                    </button>
                  </div>
                </div>
                <div className="p-8 overflow-y-auto flex-1 prose prose-emerald max-w-none bg-gray-50/30">
                  <div className="markdown-body">
                    <Markdown>{generatedPlan}</Markdown>
                  </div>
                </div>
              </section>
            ) : (
              <section className="bg-white rounded-[2.5rem] shadow-xl border border-black/5 overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 flex items-center gap-3 text-lg">
                    <BookOpen size={24} className="text-emerald-500" />
                    Saved Lesson Plans Repository
                  </h2>
                  <span className="px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    {lessonPlans.length} Plans
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {lessonPlans.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 italic">
                      No saved lesson plans yet. Use the generator to create your first curriculum aligned lesson plan!
                    </div>
                  ) : (
                    lessonPlans.map((plan) => (
                      <div key={plan.id} className="p-6 hover:bg-gray-50 transition-all flex items-center justify-between group">
                        <div className="space-y-1 pr-4 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                              {plan.subjectName} • {plan.class}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {plan.duration}
                            </span>
                          </div>
                          <h4 className="font-bold text-gray-900">{plan.topic}</h4>
                          <p className="text-xs text-gray-500 line-clamp-1 italic">
                            Competency: "{plan.competencyOutcome}"
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            onClick={() => setActivePlanView(plan)}
                            className="px-4 py-2 bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 text-xs font-bold rounded-xl transition-all"
                          >
                            View Plan
                          </button>
                          <button 
                            onClick={() => handleDeleteLessonPlan(plan.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {activeTab === "exams" && (
        <div className="space-y-6">
          <ExamPaperGenerator />
        </div>
      )}

      {activeTab === "stats" && (
        <div className="space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-black/5 flex items-center gap-4 md:gap-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-100 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center">
                <Users size={24} className="md:w-8 md:h-8" />
              </div>
              <div>
                <p className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">My Students</p>
                <h3 className="text-2xl md:text-4xl font-bold text-gray-900">{enrollments.length}</h3>
              </div>
            </div>
            <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-black/5 flex items-center gap-4 md:gap-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 text-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center">
                <FileText size={24} className="md:w-8 md:h-8" />
              </div>
              <div>
                <p className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">Submissions</p>
                <h3 className="text-2xl md:text-4xl font-bold text-gray-900">{filteredSubmissions.length}</h3>
              </div>
            </div>
            <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-black/5 flex items-center gap-4 md:gap-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-amber-100 text-amber-600 rounded-xl md:rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={24} className="md:w-8 md:h-8" />
              </div>
              <div>
                <p className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">Graded</p>
                <h3 className="text-2xl md:text-4xl font-bold text-gray-900">{filteredSubmissions.filter(s => s.grade).length}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 text-lg mb-6 flex items-center gap-2">
              <TrendingUp className="text-emerald-500" size={22} />
              Curriculum & Term Competency Trends (Aggregate)
            </h3>
            <AssessmentVisualization submissions={submissions} subjects={allSubjects} studentMode={false} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <section className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-black/5">
              <h3 className="text-sm md:text-base font-bold text-gray-900 mb-6 flex items-center gap-3">
                <BarChart3 size={18} className="text-emerald-500" />
                Grading Distribution
              </h3>
              <div className="h-[250px] md:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#F9FAFB' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {statsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="bg-[#151619] p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
              <h3 className="text-sm md:text-base font-bold mb-6 flex items-center gap-3 text-emerald-400">
                <Sparkles size={18} />
                Performance Overview
              </h3>
              <div className="h-[250px] md:h-[300px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', borderRadius: '12px', border: 'none', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {statsData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Saved Lesson Plan Details Modal */}
      <AnimatePresence>
        {activePlanView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[80vh]"
            >
              <div className="p-8 bg-[#151619] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <BookOpen className="text-emerald-400 animate-pulse" />
                  <div>
                    <h3 className="text-xl font-bold">{activePlanView.topic}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {activePlanView.subjectName} • {activePlanView.class} • {activePlanView.duration}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActivePlanView(null)} 
                  className="text-gray-400 hover:text-white text-2xl font-bold transition-all p-2"
                >
                  ×
                </button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 prose prose-emerald max-w-none bg-gray-50/30">
                <div className="markdown-body">
                  <Markdown>{activePlanView.content}</Markdown>
                </div>
              </div>
              <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
                <button 
                  onClick={() => setActivePlanView(null)}
                  className="px-8 py-3 bg-[#151619] text-white font-bold rounded-xl hover:bg-black transition-all"
                >
                  Close Lesson Plan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmRemoveId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
                <h3 className="text-xl font-bold text-gray-900">Remove Enrollment?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone. The student will lose access to this subject's activities.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmRemoveId(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleRemoveEnrollment(confirmRemoveId)}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Engagement Analysis Modal */}
      <AnimatePresence>
        {engagementReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-[#151619] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="text-emerald-400" />
                  <h3 className="text-xl font-bold">AI Engagement Insights</h3>
                </div>
                <button onClick={() => setEngagementReport(null)} className="text-gray-400 hover:text-white">×</button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto prose prose-emerald prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {engagementReport}
                </div>
              </div>
              <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button 
                  onClick={() => setEngagementReport(null)}
                  className="px-8 py-3 bg-[#151619] text-white font-bold rounded-xl hover:bg-black transition-all"
                >
                  Acknowledge Insights
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Messaging Module */}
      <div className="fixed bottom-8 right-8 z-40">
        <AnimatePresence>
          {showMessages && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-20 right-0 w-80 bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
            >
              <div className="p-6 bg-[#151619] text-white flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <MessageSquare size={18} />
                  Communication Hub
                </h3>
                <button onClick={() => setShowMessages(false)} className="text-gray-400 hover:text-white">×</button>
              </div>
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Recipient</label>
                <select 
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Broadcast to All Students</option>
                  {students.map(s => (
                    <option key={s.uid} value={s.uid}>{s.name} ({s.class})</option>
                  ))}
                </select>
              </div>
              <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50 custom-scrollbar">
                {messages.map((msg) => (
                  <div key={msg.id} className="p-3 bg-white rounded-2xl shadow-sm border border-black/5">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{msg.type}</p>
                      {msg.isAnonymous && (
                        <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter flex items-center gap-1">
                          <UserX size={8} />
                          {user?.role === 'developer' ? `From: ${msg.senderName || 'Unknown'}` : 'Anonymous'}
                        </span>
                      )}
                    </div>
                    
                    {msg.isViewOnce && !msg.isViewed ? (
                      <button 
                        onClick={() => handleViewOnce(msg.id)}
                        className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all"
                      >
                        <EyeOff size={12} />
                        View Once Message
                      </button>
                    ) : (
                      <p className="text-xs text-gray-700">
                        {msg.isViewOnce && msg.isViewed ? (
                          <span className="italic text-gray-400">[Message Expired]</span>
                        ) : msg.content}
                      </p>
                    )}
                    
                    <p className="text-[8px] text-gray-400 mt-1 font-bold uppercase tracking-widest">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-100 space-y-2">
                <AnimatePresence>
                  {showOptions && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex gap-2 mb-2"
                    >
                      <button
                        onClick={() => setIsAnonymous(!isAnonymous)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 transition-all",
                          isAnonymous ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                      >
                        <UserX size={10} />
                        Anonymous
                      </button>
                      <button
                        onClick={() => setIsViewOnce(!isViewOnce)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 transition-all",
                          isViewOnce ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                      >
                        <EyeOff size={10} />
                        View Once
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowOptions(!showOptions)}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      showOptions ? "bg-gray-200 text-gray-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    )}
                  >
                    <Plus size={14} />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Send message..."
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setShowMessages(!showMessages)}
          className="w-16 h-16 bg-[#151619] text-white rounded-full flex items-center justify-center shadow-2xl shadow-black/40 hover:scale-110 transition-all active:scale-95"
        >
          <MessageSquare size={28} />
        </button>
      </div>
    </div>
  </div>
);
};

export const Admin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<UserType[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [stats, setStats] = useState({ users: 0, schools: 0, submissions: 0 });
  const [loading, setLoading] = useState(true);
  const [welcomeNote, setWelcomeNote] = useState("");
  const [approvingUid, setApprovingUid] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "all" | "schools" | "stats">("pending");
  const [promotingUid, setPromotingUid] = useState<string | null>(null);
  const [promotionData, setPromotionData] = useState({ role: "dos", schoolCode: "" });
  const [viewingSchoolUsers, setViewingSchoolUsers] = useState<string | null>(null);
  const [schoolUsers, setSchoolUsers] = useState<UserType[]>([]);
  
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateSchoolModal, setShowCreateSchoolModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    name: "", email: "", password: "", passcode: "", role: "student", schoolCode: "", unebId: "", class: "S.1", phoneNumber: ""
  });
  const [newSchool, setNewSchool] = useState({
    name: "", code: "", location: "", centerNumber: ""
  });
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);
  const [confirmDeleteSchoolId, setConfirmDeleteSchoolId] = useState<number | null>(null);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [recipientId, setRecipientId] = useState("all");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const msgs = await api.messages.getAll();
        setMessages(msgs);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage) return;
    try {
      await api.messages.send({
        recipientId,
        content: newMessage,
        type: recipientId === "all" ? "broadcast" : "direct",
        isAnonymous,
        isViewOnce
      });
      setNewMessage("");
      setIsAnonymous(false);
      setIsViewOnce(false);
      setShowOptions(false);
      const msgs = await api.messages.getAll();
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewOnce = async (msgId: number) => {
    try {
      await api.messages.markAsViewed(msgId);
      const msgs = await api.messages.getAll();
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !['dos', 'hm', 'developer'].includes(currentUser.role)) {
        setLoading(false);
        return;
      }
      
      try {
        const pending = await api.users.getPending();
        setPendingUsers(pending);
        if (currentUser?.role === 'developer') {
          const [all, schs, st] = await Promise.all([
            api.users.getAll(),
            api.schools.getAll(),
            api.admin.getStats()
          ]);
          setAllUsers(all);
          setSchools(schs);
          setStats(st);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      await api.users.create(newUser);
      const all = await api.users.getAll();
      setAllUsers(all);
      setShowCreateUserModal(false);
      setNewUser({
        name: "", email: "", password: "", passcode: "", role: "student", schoolCode: "", unebId: "", class: "S.1", phoneNumber: ""
      });
    } catch (err: any) {
      setModalError(err.message || "Failed to create user.");
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      await api.schools.create(newSchool);
      const schs = await api.schools.getAll();
      setSchools(schs);
      setShowCreateSchoolModal(false);
      setNewSchool({
        name: "", code: "", location: "", centerNumber: ""
      });
    } catch (err: any) {
      setModalError(err.message || "Failed to create school.");
    }
  };

  const handleApprove = async (uid: string) => {
    try {
      await api.users.approve(uid, welcomeNote || "Welcome to the Masterpiece!");
      setPendingUsers(pendingUsers.filter(u => u.uid !== uid));
      if (currentUser?.role === 'developer') {
        const all = await api.users.getAll();
        setAllUsers(all);
      }
      setApprovingUid(null);
      setWelcomeNote("");
    } catch (err) {
      console.error(err);
    }
  };

  const handlePromote = async (uid: string) => {
    try {
      await api.users.promote(uid, promotionData.role, promotionData.schoolCode);
      const all = await api.users.getAll();
      setAllUsers(all);
      setPromotingUid(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (uid: string, status: string) => {
    try {
      await api.users.updateStatus(uid, status);
      const all = await api.users.getAll();
      setAllUsers(all);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    try {
      await api.users.delete(uid);
      setAllUsers(allUsers.filter(u => u.uid !== uid));
      setConfirmDeleteUid(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSchool = async (id: number) => {
    try {
      await api.schools.delete(id);
      setSchools(schools.filter(s => s.id !== id));
      setConfirmDeleteSchoolId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnebExport = async () => {
    try {
      const data = await api.admin.getUnebExport();
      const csvContent = "data:text/csv;charset=utf-8," + 
        "Institutional ID,Student Name,Class,Subject,Grade,Feedback\n" +
        data.map((row: any) => Object.values(row).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `UNEB_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportUsers = async () => {
    try {
      const data = await api.admin.exportUsers();
      const headers = Object.keys(data[0]).join(",");
      const csvContent = "data:text/csv;charset=utf-8," + 
        headers + "\n" +
        data.map((row: any) => Object.values(row).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Users_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportSchools = async () => {
    try {
      const data = await api.admin.exportSchools();
      const headers = Object.keys(data[0]).join(",");
      const csvContent = "data:text/csv;charset=utf-8," + 
        headers + "\n" +
        data.map((row: any) => Object.values(row).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Schools_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedData = async () => {
    try {
      const res = await api.admin.seed();
      // Refresh stats
      const st = await api.admin.getStats();
      setStats(st);
      const all = await api.users.getAll();
      setAllUsers(all);
      const schs = await api.schools.getAll();
      setSchools(schs);
      setConfirmSeed(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewSchoolUsers = async (code: string) => {
    try {
      const users = await api.schools.getUsers(code);
      setSchoolUsers(users);
      setViewingSchoolUsers(code);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-emerald-500 font-bold animate-pulse">Initializing Institutional Intelligence...</div>;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 w-full">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">Institutional Intelligence</h1>
          <p className="text-xs md:text-sm text-gray-500">Manage school identity and monitor teacher performance.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link 
            to="/forums" 
            className="hidden md:flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Users size={18} />
            Area K Forums
          </Link>
          {currentUser?.role === 'developer' && (
            <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm overflow-x-auto max-w-full scrollbar-hide">
              {["pending", "all", "schools", "stats"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-bold transition-all capitalize whitespace-nowrap",
                    activeTab === tab ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
          <button 
            onClick={handleUnebExport}
            className="px-4 py-2 md:px-6 md:py-3 bg-[#151619] text-white font-bold rounded-xl md:rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/20 text-[10px] md:text-sm"
          >
            <FileText size={16} className="md:w-[18px] md:h-[18px]" />
            Export UNEB CSV
          </button>
        </div>
      </header>

      {/* Stats Section */}
      {activeTab === "stats" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-black/5 flex items-center gap-4 md:gap-6"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-100 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center">
              <Users size={24} className="md:w-8 md:h-8" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Users</p>
              <h3 className="text-2xl md:text-4xl font-bold text-gray-900">{stats.users}</h3>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-black/5 flex items-center gap-4 md:gap-6"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 text-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center">
              <Building2 size={24} className="md:w-8 md:h-8" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Schools</p>
              <h3 className="text-2xl md:text-4xl font-bold text-gray-900">{stats.schools}</h3>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-black/5 flex items-center gap-4 md:gap-6"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 bg-amber-100 text-amber-600 rounded-xl md:rounded-2xl flex items-center justify-center">
              <FileText size={24} className="md:w-8 md:h-8" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Submissions</p>
              <h3 className="text-2xl md:text-4xl font-bold text-gray-900">{stats.submissions}</h3>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="sm:col-span-2 md:col-span-3 bg-emerald-50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4 md:gap-6 text-center sm:text-left">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-500 text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                <Database size={24} className="md:w-8 md:h-8" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900">Database Stress Test</h3>
                <p className="text-xs md:text-sm text-gray-500">Seed the system with a demo school, students, and activities to verify performance.</p>
              </div>
            </div>
            <button 
              onClick={() => setConfirmSeed(true)}
              className="w-full sm:w-auto px-6 py-3 md:px-8 md:py-4 bg-emerald-500 text-white font-bold rounded-xl md:rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 whitespace-nowrap text-xs md:text-base"
            >
              Seed Demo Data
            </button>
          </motion.div>
        </div>
      )}

      {/* Main Content Area */}
      <section className="bg-white rounded-[2.5rem] shadow-xl border border-black/5 overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-3">
            {activeTab === "pending" && <Users size={22} className="text-emerald-500" />}
            {activeTab === "all" && <ShieldCheck size={22} className="text-emerald-500" />}
            {activeTab === "schools" && <Building2 size={22} className="text-emerald-500" />}
            {activeTab === "stats" && <BarChart3 size={22} className="text-emerald-500" />}
            {activeTab === "pending" ? "Registration Office" : 
             activeTab === "all" ? "User Authority Management" : 
             activeTab === "schools" ? "Institutional Registry" : "System Analytics"}
          </h2>
          
          <div className="flex items-center gap-3">
            {activeTab === "all" && (
              <button 
                onClick={handleExportUsers}
                className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2"
              >
                <Download size={14} />
                Export Users
              </button>
            )}
            {activeTab === "schools" && (
              <button 
                onClick={handleExportSchools}
                className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2"
              >
                <Download size={14} />
                Export Schools
              </button>
            )}
            {activeTab === "all" && (
              <button 
                onClick={() => {
                  setModalError(null);
                  setShowCreateUserModal(true);
                }}
                className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2"
              >
                <Plus size={14} />
                Create User
              </button>
            )}
            {activeTab === "schools" && (
              <button 
                onClick={() => {
                  setModalError(null);
                  setShowCreateSchoolModal(true);
                }}
                className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2"
              >
                <Plus size={14} />
                Create School
              </button>
            )}
            <span className="px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
              {activeTab === "pending" ? `${pendingUsers.length} Pending` : 
               activeTab === "all" ? `${allUsers.length} Total Users` : 
               activeTab === "schools" ? `${schools.length} Schools` : "Live Stats"}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === "pending" && (
            <div className="divide-y divide-gray-100">
              {/* Desktop Table View */}
              <table className="w-full text-left hidden md:table">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] border-b border-gray-100">
                    <th className="px-8 py-6">Identity</th>
                    <th className="px-8 py-6">Role</th>
                    <th className="px-8 py-6">School</th>
                    <th className="px-8 py-6">Institutional ID</th>
                    <th className="px-8 py-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pendingUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-gray-400 italic">No pending registrations.</td>
                    </tr>
                  ) : (
                    pendingUsers.map((u) => (
                      <React.Fragment key={u.uid}>
                        <tr className="hover:bg-gray-50/50 transition-all">
                          <td className="px-8 py-6">
                            <div className="font-bold text-gray-900">{u.name}</div>
                            <div className="text-xs text-gray-400">{u.email}</div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-xs font-bold text-gray-600">{u.schoolCode}</span>
                          </td>
                          <td className="px-8 py-6 text-gray-600 font-mono text-sm">{u.institutionalId}</td>
                          <td className="px-8 py-6">
                            <button
                              onClick={() => setApprovingUid(u.uid)}
                              className="px-5 py-2.5 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                        {approvingUid === u.uid && (
                          <tr className="bg-emerald-50/30">
                            <td colSpan={5} className="px-8 py-6">
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-6"
                              >
                                {(u.role === 'examiner' || u.role === 'publisher') && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</p>
                                      <p className="font-bold text-gray-900">{u.phoneNumber || 'Not provided'}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Certificate</p>
                                      <a href={u.certificateUrl} target="_blank" rel="noreferrer" className="text-emerald-600 font-bold hover:underline text-sm">View Certificate</a>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID Card Front</p>
                                      <a href={u.idCardFrontUrl} target="_blank" rel="noreferrer" className="text-emerald-600 font-bold hover:underline text-sm">View ID Front</a>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID Card Back</p>
                                      <a href={u.idCardBackUrl} target="_blank" rel="noreferrer" className="text-emerald-600 font-bold hover:underline text-sm">View ID Back</a>
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Custom Welcome Note</label>
                                  <input
                                    type="text"
                                    value={welcomeNote}
                                    onChange={(e) => setWelcomeNote(e.target.value)}
                                    placeholder={`e.g., Welcome to ${u.class || 'the school'}, ${u.name.split(' ')[0]}!`}
                                    className="w-full px-6 py-4 bg-white border border-emerald-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                  />
                                </div>
                                <div className="flex gap-3">
                                  <button 
                                    onClick={() => handleApprove(u.uid)}
                                    className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                  >
                                    Confirm Approval
                                  </button>
                                  <button 
                                    onClick={() => setApprovingUid(null)}
                                    className="px-6 py-3 bg-white border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-100">
                {pendingUsers.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 italic text-sm">No pending registrations.</div>
                ) : (
                  pendingUsers.map((u) => (
                    <div key={u.uid} className="p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{u.name}</div>
                          <div className="text-[10px] text-gray-400">{u.email}</div>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[8px] font-bold uppercase tracking-wider">
                          {u.role}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-[10px]">
                        <div>
                          <p className="text-gray-400 font-bold uppercase tracking-widest mb-1">School</p>
                          <p className="text-gray-600 font-bold">{u.schoolCode}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-bold uppercase tracking-widest mb-1">Inst. ID</p>
                          <p className="text-gray-600 font-mono">{u.institutionalId}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setApprovingUid(approvingUid === u.uid ? null : u.uid)}
                        className="w-full py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-500/20"
                      >
                        {approvingUid === u.uid ? "Close Review" : "Review Request"}
                      </button>

                      <AnimatePresence>
                        {approvingUid === u.uid && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 pt-4 border-t border-gray-100 overflow-hidden"
                          >
                            {(u.role === 'examiner' || u.role === 'publisher') && (
                              <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-gray-400 font-bold uppercase">Phone</span>
                                  <span className="font-bold text-gray-900">{u.phoneNumber || 'N/A'}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <a href={u.certificateUrl} target="_blank" rel="noreferrer" className="px-2 py-1 bg-white border border-emerald-100 text-emerald-600 rounded-lg text-[8px] font-bold">Cert</a>
                                  <a href={u.idCardFrontUrl} target="_blank" rel="noreferrer" className="px-2 py-1 bg-white border border-emerald-100 text-emerald-600 rounded-lg text-[8px] font-bold">ID Front</a>
                                  <a href={u.idCardBackUrl} target="_blank" rel="noreferrer" className="px-2 py-1 bg-white border border-emerald-100 text-emerald-600 rounded-lg text-[8px] font-bold">ID Back</a>
                                </div>
                              </div>
                            )}
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Welcome Note</label>
                              <input
                                type="text"
                                value={welcomeNote}
                                onChange={(e) => setWelcomeNote(e.target.value)}
                                placeholder="Custom message..."
                                className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs outline-none"
                              />
                            </div>
                            <button 
                              onClick={() => handleApprove(u.uid)}
                              className="w-full py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs"
                            >
                              Confirm Approval
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "all" && (
            <div className="divide-y divide-gray-100">
              {/* Desktop Table View */}
              <table className="w-full text-left hidden md:table">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] border-b border-gray-100">
                    <th className="px-8 py-6">Identity</th>
                    <th className="px-8 py-6">Current Role</th>
                    <th className="px-8 py-6">School</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allUsers.map((u) => (
                    <React.Fragment key={u.uid}>
                      <tr className="hover:bg-gray-50/50 transition-all">
                        <td className="px-8 py-6">
                          <div className="font-bold text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-xs font-bold text-gray-600">{u.schoolCode || 'N/A'}</td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            u.status === 'approved' ? "bg-emerald-100 text-emerald-700" : 
                            u.status === 'suspended' ? "bg-amber-100 text-amber-700" :
                            u.status === 'banned' ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                          )}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setPromotingUid(u.uid);
                                setPromotionData({ role: u.role, schoolCode: u.schoolCode || "" });
                              }}
                              className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                              title="Modify Authority"
                            >
                              <ShieldAlert size={16} />
                            </button>
                            {u.status === 'approved' ? (
                              <button
                                onClick={() => handleUpdateStatus(u.uid, 'suspended')}
                                className="p-2 bg-amber-100 text-amber-600 rounded-xl hover:bg-amber-200 transition-all"
                                title="Suspend User"
                              >
                                <UserX size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(u.uid, 'approved')}
                                className="p-2 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-all"
                                title="Approve/Unsuspend"
                              >
                                <UserCheck size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleUpdateStatus(u.uid, 'banned')}
                              className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all"
                              title="Ban User"
                            >
                              <Ban size={16} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteUid(u.uid)}
                              className="p-2 bg-gray-100 text-red-500 rounded-xl hover:bg-red-50 transition-all"
                              title="Delete User"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {promotingUid === u.uid && (
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-8 py-6">
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end"
                            >
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assign Role</label>
                                <select
                                  value={promotionData.role}
                                  onChange={(e) => setPromotionData({ ...promotionData, role: e.target.value })}
                                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                  <option value="student">Student</option>
                                  <option value="teacher">Teacher</option>
                                  <option value="dos">Director of Studies (DOS)</option>
                                  <option value="hm">Headteacher (HM)</option>
                                  <option value="examiner">National Examiner</option>
                                  <option value="publisher">Book Publisher</option>
                                  <option value="developer">Developer</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assign School Code</label>
                                <input
                                  type="text"
                                  value={promotionData.schoolCode}
                                  onChange={(e) => setPromotionData({ ...promotionData, schoolCode: e.target.value.toUpperCase() })}
                                  placeholder="e.g., U3206"
                                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                />
                              </div>
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => handlePromote(u.uid)}
                                  className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all"
                                >
                                  Save Changes
                                </button>
                                <button 
                                  onClick={() => setPromotingUid(null)}
                                  className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-100">
                {allUsers.map((u) => (
                  <div key={u.uid} className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{u.name}</div>
                        <div className="text-[10px] text-gray-400">{u.email}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[8px] font-bold uppercase tracking-wider">
                          {u.role}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider",
                          u.status === 'approved' ? "bg-emerald-100 text-emerald-700" : 
                          u.status === 'suspended' ? "bg-amber-100 text-amber-700" :
                          u.status === 'banned' ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                        )}>
                          {u.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setPromotingUid(promotingUid === u.uid ? null : u.uid);
                          setPromotionData({ role: u.role, schoolCode: u.schoolCode || "" });
                        }}
                        className="flex-1 py-2 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-lg flex items-center justify-center gap-2"
                      >
                        <ShieldAlert size={14} />
                        Authority
                      </button>
                      <div className="flex gap-2">
                        {u.status === 'approved' ? (
                          <button
                            onClick={() => handleUpdateStatus(u.uid, 'suspended')}
                            className="p-2 bg-amber-100 text-amber-600 rounded-lg"
                          >
                            <UserX size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(u.uid, 'approved')}
                            className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"
                          >
                            <UserCheck size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateStatus(u.uid, 'banned')}
                          className="p-2 bg-red-100 text-red-600 rounded-lg"
                        >
                          <Ban size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteUid(u.uid)}
                          className="p-2 bg-gray-100 text-red-500 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {promotingUid === u.uid && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 pt-4 border-t border-gray-100 overflow-hidden"
                        >
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Role</label>
                            <select
                              value={promotionData.role}
                              onChange={(e) => setPromotionData({ ...promotionData, role: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
                            >
                              <option value="student">Student</option>
                              <option value="teacher">Teacher</option>
                              <option value="dos">DOS</option>
                              <option value="hm">Headteacher</option>
                              <option value="examiner">Examiner</option>
                              <option value="publisher">Publisher</option>
                              <option value="developer">Developer</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">School Code</label>
                            <input
                              type="text"
                              value={promotionData.schoolCode}
                              onChange={(e) => setPromotionData({ ...promotionData, schoolCode: e.target.value.toUpperCase() })}
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono outline-none"
                            />
                          </div>
                          <button 
                            onClick={() => handlePromote(u.uid)}
                            className="w-full py-2 bg-emerald-500 text-white font-bold rounded-lg text-xs"
                          >
                            Save Changes
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "schools" && (
            <div className="divide-y divide-gray-100">
              {/* Desktop Table View */}
              <table className="w-full text-left hidden md:table">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] border-b border-gray-100">
                    <th className="px-8 py-6">School Name</th>
                    <th className="px-8 py-6">Centre Number</th>
                    <th className="px-8 py-6">Location</th>
                    <th className="px-8 py-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {schools.map((s) => (
                    <React.Fragment key={s.id}>
                      <tr className="hover:bg-gray-50/50 transition-all">
                        <td className="px-8 py-6 font-bold text-gray-900">{s.name}</td>
                        <td className="px-8 py-6 font-mono text-emerald-600 font-bold">{s.code}</td>
                        <td className="px-8 py-6 text-gray-500 text-sm">{s.location}</td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleViewSchoolUsers(s.code)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="View Affiliated Users"
                            >
                              <Search size={18} />
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteSchoolId(s.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete School"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {viewingSchoolUsers === s.code && (
                        <tr className="bg-emerald-50/20">
                          <td colSpan={4} className="px-8 py-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Affiliated Users ({s.code})</h4>
                                <button onClick={() => setViewingSchoolUsers(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {schoolUsers.length === 0 ? (
                                  <p className="text-xs text-gray-400 italic">No users affiliated with this school.</p>
                                ) : (
                                  schoolUsers.map(u => (
                                    <div key={u.uid} className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                                      <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                                      <p className="text-[10px] text-gray-400 font-mono">{u.institutionalId}</p>
                                      <div className="mt-2 flex items-center justify-between">
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[8px] font-bold uppercase tracking-wider">{u.role}</span>
                                        <span className={cn(
                                          "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider",
                                          u.status === 'approved' ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                                        )}>{u.status}</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-100">
                {schools.map((s) => (
                  <div key={s.id} className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{s.name}</div>
                        <div className="text-[10px] text-emerald-600 font-mono font-bold">{s.code}</div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleViewSchoolUsers(s.code)}
                          className="p-2 text-emerald-600 bg-emerald-50 rounded-lg"
                        >
                          <Search size={16} />
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteSchoolId(s.id)}
                          className="p-2 text-red-500 bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500">
                      <span className="font-bold uppercase tracking-widest text-gray-400 mr-2">Location:</span>
                      {s.location}
                    </div>
                    <AnimatePresence>
                      {viewingSchoolUsers === s.code && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 pt-4 border-t border-gray-100 overflow-hidden"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Users ({s.code})</h4>
                            <button onClick={() => setViewingSchoolUsers(null)}><X size={12} /></button>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            {schoolUsers.length === 0 ? (
                              <p className="text-[10px] text-gray-400 italic">No users found.</p>
                            ) : (
                              schoolUsers.map(u => (
                                <div key={u.uid} className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                                  <p className="font-bold text-gray-900 text-[10px]">{u.name}</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-[8px] text-gray-400 font-mono">{u.institutionalId}</span>
                                    <span className="text-[8px] font-bold text-emerald-600 uppercase">{u.role}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Messaging Module */}
      <div className="fixed bottom-8 right-8 z-50">
        <AnimatePresence>
          {showMessages && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-20 right-0 w-80 bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
            >
              <div className="p-6 bg-[#151619] text-white flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <MessageSquare size={18} />
                  System Messages
                </h3>
                <button onClick={() => setShowMessages(false)} className="text-gray-400 hover:text-white">×</button>
              </div>
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Recipient</label>
                <select 
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Broadcast to All Users</option>
                  {allUsers.map(u => (
                    <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50 custom-scrollbar">
                {messages.map((msg) => (
                  <div key={msg.id} className="p-3 bg-white rounded-2xl shadow-sm border border-black/5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                        {msg.isAnonymous ? (
                          <span className="flex items-center gap-1">
                            <UserX size={10} />
                            {currentUser?.role === 'developer' ? `Anonymous (${msg.senderName})` : 'Anonymous'}
                          </span>
                        ) : (
                          msg.senderName || msg.type
                        )}
                      </p>
                      {msg.isViewOnce && (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest flex items-center gap-1",
                          msg.isViewed ? "bg-gray-100 text-gray-400" : "bg-orange-100 text-orange-600"
                        )}>
                          <EyeOff size={8} />
                          {msg.isViewed ? "Opened" : "View Once"}
                        </span>
                      )}
                    </div>
                    {msg.isViewOnce && !msg.isViewed ? (
                      <button 
                        onClick={() => handleViewOnce(msg.id)}
                        className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all"
                      >
                        <EyeOff size={12} />
                        View Once Message
                      </button>
                    ) : (
                      <p className="text-xs text-gray-700">
                        {msg.isViewOnce && msg.isViewed ? (
                          <span className="italic text-gray-400">[Message Expired]</span>
                        ) : msg.content}
                      </p>
                    )}
                    <p className="text-[8px] text-gray-400 mt-1 font-bold uppercase tracking-widest">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-100">
                <AnimatePresence>
                  {showOptions && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mb-4 p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white rounded-lg border border-gray-200">
                            <UserX size={14} className="text-gray-500" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Anonymous Mode</span>
                        </div>
                        <button
                          onClick={() => setIsAnonymous(!isAnonymous)}
                          className={cn(
                            "w-8 h-4 rounded-full transition-all relative",
                            isAnonymous ? "bg-emerald-500" : "bg-gray-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                            isAnonymous ? "right-0.5" : "left-0.5"
                          )} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white rounded-lg border border-gray-200">
                            <EyeOff size={14} className="text-gray-500" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">View Once</span>
                        </div>
                        <button
                          onClick={() => setIsViewOnce(!isViewOnce)}
                          className={cn(
                            "w-8 h-4 rounded-full transition-all relative",
                            isViewOnce ? "bg-orange-500" : "bg-gray-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                            isViewOnce ? "right-0.5" : "left-0.5"
                          )} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      showOptions ? "bg-[#151619] text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                    )}
                  >
                    <Settings size={14} />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type message..."
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setShowMessages(!showMessages)}
          className="w-16 h-16 bg-[#151619] text-white rounded-full flex items-center justify-center shadow-2xl shadow-black/40 hover:scale-110 transition-all active:scale-95"
        >
          <MessageSquare size={28} />
        </button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-[#151619] text-white flex items-center justify-between">
                <h3 className="text-xl font-bold">Create New User</h3>
                <button onClick={() => setShowCreateUserModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateUser} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {modalError && (
                  <div className="md:col-span-2 p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl flex items-center gap-3">
                    <AlertCircle size={16} />
                    {modalError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                  <input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                  <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="dos">DOS</option>
                    <option value="hm">Headteacher</option>
                    <option value="examiner">Examiner</option>
                    <option value="publisher">Publisher</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">School Code</label>
                  <input required type="text" value={newUser.schoolCode} onChange={e => setNewUser({...newUser, schoolCode: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Password (Web)</label>
                  <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Passcode (6-digit)</label>
                  <input type="text" maxLength={6} value={newUser.passcode} onChange={e => setNewUser({...newUser, passcode: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="md:col-span-2 flex gap-4 pt-4">
                  <button type="submit" className="flex-1 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">Create User Account</button>
                  <button type="button" onClick={() => setShowCreateUserModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showCreateSchoolModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-[#151619] text-white flex items-center justify-between">
                <h3 className="text-xl font-bold">Register New School</h3>
                <button onClick={() => setShowCreateSchoolModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateSchool} className="p-8 space-y-6">
                {modalError && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl flex items-center gap-3">
                    <AlertCircle size={16} />
                    {modalError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Centre Number (Code)</label>
                  <input required type="text" value={newSchool.code} onChange={e => setNewSchool({...newSchool, code: e.target.value.toUpperCase()})} placeholder="e.g., U3206" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">School Name</label>
                  <input required type="text" value={newSchool.name} onChange={e => setNewSchool({...newSchool, name: e.target.value})} placeholder="e.g., St. Mary's College Kisubi" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location</label>
                  <input required type="text" value={newSchool.location} onChange={e => setNewSchool({...newSchool, location: e.target.value})} placeholder="e.g., Entebbe" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">Register School</button>
                  <button type="button" onClick={() => setShowCreateSchoolModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
);
};



