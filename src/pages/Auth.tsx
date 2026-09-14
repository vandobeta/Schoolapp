import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { School } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { LogIn, UserPlus, ShieldCheck, Fingerprint, Key, Mail, User as UserIcon, ChevronLeft } from "lucide-react";
import { cn } from "../lib/utils";

export const Login: React.FC = () => {
  const [step, setStep] = useState<"resolve" | "authenticate">("resolve");
  const [institutionalId, setInstitutionalId] = useState("");
  const [password, setPassword] = useState("");
  const [passcode, setPasscode] = useState("");
  const [role, setRole] = useState<string>("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [glowColor, setGlowColor] = useState<"none" | "blue" | "golden">("none");
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (institutionalId.match(/^U\d+/i)) {
      setGlowColor("blue");
    } else if (institutionalId.match(/^EXM/i) || institutionalId.match(/^PUB/i)) {
      setGlowColor("golden");
    } else {
      setGlowColor("none");
    }
  }, [institutionalId]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const cleanId = institutionalId.trim();
    try {
      const { exists, user } = await api.auth.resolve(cleanId);
      if (exists) {
        setRole(user.role);
        setStep("authenticate");
      } else {
        setError("ID not recognized. Please register first.");
      }
    } catch (err: any) {
      setError(err.message || "Resolution failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const cleanId = institutionalId.trim();
    try {
      const { user, token } = await api.auth.login({ 
        institutionalId: cleanId, 
        password: role !== 'student' ? password : null,
        passcode: role === 'student' ? passcode : null
      });
      login(user, token);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4 relative">
      <button 
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-black/5 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-all z-50"
      >
        <ChevronLeft size={16} className="text-emerald-500" />
        Back to Home
      </button>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-black/5"
      >
        <div className="p-6 md:p-10 bg-[#151619] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="relative z-10 flex items-center gap-4 mb-2">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <ShieldCheck size={28} className="md:w-8 md:h-8" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Identity Resolver</h1>
              <p className="text-xs text-gray-400">Ugandan Smart School System</p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10">
          <AnimatePresence mode="wait">
            {step === "resolve" ? (
              <motion.form 
                key="resolve"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleResolve} 
                className="space-y-8"
              >
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Unique Institutional ID</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      required
                      value={institutionalId}
                      onChange={(e) => setInstitutionalId(e.target.value)}
                      className={cn(
                        "w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl transition-all font-mono text-sm outline-none",
                        glowColor === "blue" && "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]",
                        glowColor === "golden" && "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]",
                        glowColor === "none" && "border-gray-200 focus:ring-2 focus:ring-emerald-500"
                      )}
                      placeholder="e.g., U3206-S023"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 italic">Format: [Centre Number]-S[Student Number]</p>
                </div>

                {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {loading ? "Resolving..." : (
                    <>
                      <span>Identify Me</span>
                      <LogIn size={18} />
                    </>
                  )}
                </button>

                <div className="text-center space-y-2">
                  <Link to="/register" className="block text-sm text-emerald-600 font-bold hover:underline">
                    New User? Register here
                  </Link>
                  <Link to="/staff/login" className="block text-xs text-gray-500 hover:text-emerald-600 transition-colors">
                    Staff/Admin Login
                  </Link>
                </div>
              </motion.form>
            ) : (
              <motion.form 
                key="authenticate"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin} 
                className="space-y-8"
              >
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                    {institutionalId[0]}
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Welcome back</p>
                    <p className="text-sm font-bold text-gray-900">{institutionalId}</p>
                  </div>
                </div>

                {role === 'student' ? (
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">6-Digit Passcode</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="password"
                        maxLength={6}
                        required
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono text-center text-xl tracking-[0.5em]"
                        placeholder="••••••"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Staff Password</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )}

                {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("resolve")}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {loading ? "Verifying..." : "Access Dashboard"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export const StaffLogin: React.FC = () => {
  const [institutionalId, setInstitutionalId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const cleanId = institutionalId.trim();
    try {
      const { user, token } = await api.auth.login({ 
        institutionalId: cleanId, 
        password,
        passcode: null
      });
      if (user.role === 'student') {
        throw new Error("Students must use the standard login portal.");
      }
      login(user, token);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4 relative">
      <button 
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-black/5 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-all z-50"
      >
        <ChevronLeft size={16} className="text-amber-500" />
        Back to Home
      </button>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-black/5"
      >
        <div className="p-6 md:p-10 bg-[#151619] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="relative z-10 flex items-center gap-4 mb-2">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <ShieldCheck size={28} className="md:w-8 md:h-8" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Staff Gateway</h1>
              <p className="text-xs text-gray-400">Administrative Access Panel</p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Staff ID</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  required
                  value={institutionalId}
                  onChange={(e) => setInstitutionalId(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-mono text-sm"
                  placeholder="e.g., ADM-0001"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Password</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? "Verifying..." : (
                <>
                  <span>Authorize Access</span>
                  <LogIn size={18} />
                </>
              )}
            </button>

            <div className="text-center">
              <Link to="/login" className="text-xs text-gray-500 hover:text-amber-600 transition-colors">
                Student Portal
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export const Register: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    passcode: "",
    role: "student",
    schoolCode: "",
    unebId: "",
    class: "S.1",
    phoneNumber: "",
    certificateUrl: "",
    idCardFrontUrl: "",
    idCardBackUrl: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isProfessional = formData.role === 'examiner' || formData.role === 'publisher';
    const maxStep = isProfessional ? 4 : 3;

    if (step < maxStep) {
      setStep((step + 1) as any);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.auth.register(formData);
      setGeneratedId(res.institutionalId);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4 relative">
      <button 
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-black/5 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-all z-50"
      >
        <ChevronLeft size={16} className="text-emerald-500" />
        Back to Home
      </button>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-black/5"
      >
        <div className="p-6 md:p-10 bg-[#151619] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <UserPlus size={28} className="md:w-8 md:h-8" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Onboarding Module</h1>
              <p className="text-xs text-gray-400">Digital Registration Office</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((s) => {
              const isProfessional = formData.role === 'examiner' || formData.role === 'publisher';
              if (s === 4 && !isProfessional) return null;
              return (
                <div 
                  key={s} 
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-500",
                    step >= s ? "bg-emerald-500 w-6" : "bg-white/20"
                  )} 
                />
              );
            })}
          </div>
        </div>

        {success ? (
          <div className="p-8 md:p-16 text-center space-y-8">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <ShieldCheck size={40} className="md:w-12 md:h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Registration Complete!</h2>
              <p className="text-sm text-gray-500">Your Institutional ID is:</p>
              <div className="p-4 md:p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-emerald-200 font-mono text-xl md:text-2xl font-bold text-emerald-600 tracking-wider">
                {generatedId}
              </div>
            </div>
            <p className="text-xs md:text-sm text-gray-400 max-w-md mx-auto">
              Your profile is now in a <span className="text-orange-500 font-bold">Pending</span> state. 
              The Director of Studies (DOS) will review your application. 
              Please keep your ID and passcode safe.
            </p>
            <button 
              onClick={() => navigate("/login")}
              className="w-full sm:w-auto px-8 py-4 bg-[#151619] text-white font-bold rounded-2xl hover:bg-black transition-all"
            >
              Return to Gateway
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8">
            {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100">{error}</div>}

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Mail className="text-emerald-500" size={20} />
                    <h3 className="font-bold text-gray-900">Step 1: Identity & Recovery</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="e.g., Isaac Newton"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email (for OTP/Recovery)</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="e.g., isaac@school.ug"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Fingerprint className="text-emerald-500" size={20} />
                    <h3 className="font-bold text-gray-900">Step 2: Security Credentials</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="dos">Director of Studies (DOS)</option>
                        <option value="hm">Headteacher (HM)</option>
                        <option value="examiner">National Examiner</option>
                        <option value="publisher">Book Publisher</option>
                      </select>
                    </div>
                    {formData.role === 'student' ? (
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">6-Digit Passcode</label>
                        <input
                          type="password"
                          maxLength={6}
                          required
                          value={formData.passcode}
                          onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono tracking-[0.5em] text-center"
                          placeholder="••••••"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Staff Password</label>
                        <input
                          type="password"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="••••••••"
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="text-emerald-500" size={20} />
                    <h3 className="font-bold text-gray-900">Step 3: Institutional Profiling</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {formData.role !== 'publisher' && (
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">School Centre Number (e.g., U0013)</label>
                        <input
                          type="text"
                          required={formData.role !== 'examiner'}
                          value={formData.schoolCode}
                          onChange={(e) => setFormData({ ...formData, schoolCode: e.target.value.toUpperCase() })}
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                          placeholder="e.g., U0013"
                        />
                      </div>
                    )}
                    {formData.role === 'student' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Student Number (e.g., S023)</label>
                          <input
                            type="text"
                            required
                            value={formData.unebId}
                            onChange={(e) => setFormData({ ...formData, unebId: e.target.value })}
                            className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="e.g., S023"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Class</label>
                          <select
                            value={formData.class}
                            onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                            className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                            {["S.1", "S.2", "S.3", "S.4", "S.5", "S.6"].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
              {step === 4 && (
                <motion.div 
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="text-amber-500" size={20} />
                    <h3 className="font-bold text-gray-900">Step 4: Professional Verification</h3>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl mb-6">
                    <p className="text-xs text-amber-700 leading-relaxed">
                      As a <strong>{formData.role}</strong>, your account requires manual verification by the system administrators. 
                      Please provide valid links to your professional credentials.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Phone Number (MoMo)</label>
                      <input
                        type="tel"
                        required
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="+256..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Certificate URL/Path</label>
                      <input
                        type="text"
                        required
                        value={formData.certificateUrl}
                        onChange={(e) => setFormData({ ...formData, certificateUrl: e.target.value })}
                        className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Link to certificate"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ID Card Front URL</label>
                      <input
                        type="text"
                        required
                        value={formData.idCardFrontUrl}
                        onChange={(e) => setFormData({ ...formData, idCardFrontUrl: e.target.value })}
                        className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Link to ID front"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ID Card Back URL</label>
                      <input
                        type="text"
                        required
                        value={formData.idCardBackUrl}
                        onChange={(e) => setFormData({ ...formData, idCardBackUrl: e.target.value })}
                        className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Link to ID back"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-4 pt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((step - 1) as any)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                >
                  Previous
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {loading ? "Processing..." : (step === 3 && formData.role !== 'examiner' && formData.role !== 'publisher') || step === 4 ? "Complete Registration" : "Next Step"}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

