import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  FileText, 
  Download, 
  Printer, 
  Sparkles, 
  BookOpen, 
  School, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Copy, 
  Clock, 
  GraduationCap, 
  ShieldAlert, 
  Layers, 
  Trash2, 
  RefreshCw,
  Eye,
  Edit3,
  Sliders,
  Award
} from "lucide-react";
import { ExamPaper, GenerateExamContext } from "../types";
import { generateExamPaper } from "../services/gemini";
import { exportExamToDocx } from "../lib/examDocxExport";
import { 
  FileText, 
  Download, 
  Printer, 
  Sparkles, 
  BookOpen, 
  School, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Copy, 
  Clock, 
  GraduationCap, 
  ShieldAlert, 
  Layers, 
  Trash2, 
  RefreshCw,
  Eye,
  Edit3,
  Sliders,
  Award,
  Target,
  Activity,
  Gauge,
  HelpCircle
} from "lucide-react";

const UGANDAN_SUBJECTS = [
  { name: "Agriculture", code: "553/1", icon: "🌱", defaultTopic: "Soil conservation, organic manuring, and indigenous poultry management in Central Uganda" },
  { name: "Geography", code: "273/1", icon: "🌍", defaultTopic: "Drainage systems in East Africa, Lake Victoria catchment conservation, and climate resilience in Kasese" },
  { name: "Physics", code: "535/1", icon: "⚡", defaultTopic: "Solar energy installation, electrical circuits, and domestic wiring safety in peri-urban settings" },
  { name: "Mathematics", code: "456/1", icon: "📐", defaultTopic: "Financial mathematics, loan interest calculations in SACCOs, and geometric surveying of school grounds" },
  { name: "Biology", code: "553/2", icon: "🔬", defaultTopic: "Infectious disease prevention, hygiene in boarding schools, and digestive system adaptation in ruminants" },
  { name: "Chemistry", code: "545/1", icon: "🧪", defaultTopic: "Water purification methods, hard water treatment in borehole water, and soap making using locally available oils" },
  { name: "English Language & Literature", code: "112/1", icon: "📖", defaultTopic: "Functional writing (speech drafting for environmental day), argumentative essay on youth agribusiness" },
  { name: "History & Political Education", code: "241/1", icon: "🏛️", defaultTopic: "Pre-colonial governance systems, Buganda agreement of 1900, and civic responsibilities in modern Uganda" },
  { name: "Entrepreneurship Education", code: "285/1", icon: "💼", defaultTopic: "Business plan development for a roadside juice processing enterprise, bookkeeping, and customer relations" },
  { name: "Information & Communication Technology (ICT)", code: "840/1", icon: "💻", defaultTopic: "Word processing of school gazettes, spreadsheet budgeting for sports day, and internet safety" }
];

const EXAM_TYPE_OPTIONS = [
  { id: "Topical Test", label: "Topical Test", desc: "Formative assessment focused on a specific syllabus unit" },
  { id: "Weekly Assessment Test", label: "Weekly Assessment Test", desc: "Continuous weekly diagnostic and progress check" },
  { id: "Beginning of Term Assessment", label: "Beginning of Term (B.O.T)", desc: "Baseline test assessing prerequisite and past competencies" },
  { id: "Mid-Term Examination", label: "Mid-Term Examination (M.O.T)", desc: "Summative progress assessment across half-term units" },
  { id: "End of Term Assessment", label: "End of Term (E.O.T)", desc: "Full official summative assessment aligned with UNEB style" },
  { id: "Mock UNEB Examination", label: "UNEB Mock Examination", desc: "Full simulation of final Lower Secondary Certificate papers" },
  { id: "Custom", label: "Custom Exam Title...", desc: "Specify your own institutional assessment naming" }
];

const DIFFICULTY_LEVELS = [
  { 
    id: "Foundation / Remedial", 
    label: "Foundation / Remedial", 
    desc: "Scaffolded prompts, guided hints, accessible vocabulary for struggling learners to build confidence."
  },
  { 
    id: "Standard NCDC", 
    label: "Standard NCDC (Balanced)", 
    desc: "Official UNEB CBC style balancing Level 1 (Basic), Level 2 (Competent), and Level 3 (Exemplary)." 
  },
  { 
    id: "Challenging / Distinction", 
    label: "Challenging / Distinction", 
    desc: "Non-routine scenarios, higher-order critical reasoning, and multi-variable integration." 
  },
  { 
    id: "Adaptive / Differentiated", 
    label: "Adaptive / Differentiated", 
    desc: "Tiered sub-questions starting with accessible entry-points progressing to complex investigations." 
  }
];

const STANDARD_RULES = `1. This examination paper consists of Section A (Short Item Assessment) and Section B (Extended Activity of Integration).
2. Answer ALL questions in Section A and any TWO questions from Section B.
3. All answers must be written neatly in the examination answer booklet provided.
4. Candidates must apply real-life problem-solving skills rooted in Ugandan local contexts.
5. Mathematical tables, formula booklets, and silent non-programmable electronic calculators may be used where applicable.
6. Mobile phones, programmable smartwatches, and unauthorized revision notes are STRICTLY PROHIBITED in the examination room.
7. Fill in your Candidate Name, Random/Index Number, and School Centre Code clearly on the cover page.`;

export const ExamPaperGenerator: React.FC = () => {
  const { user } = useAuth();
  const isAuthorized = user && ['teacher', 'examiner', 'dos', 'hm', 'developer'].includes(user.role);

  // Form State
  const [schoolName, setSchoolName] = useState("St. Mary's College Kisubi");
  const [schoolLocation, setSchoolLocation] = useState("Entebbe, Wakiso District, Uganda");
  const [poBox, setPoBox] = useState("P.O. Box 48, Entebbe");
  const [phoneContact, setPhoneContact] = useState("+256 414 321 000 / +256 772 123 456");
  const [motto, setMotto] = useState("Semper Ultra (Always Further)");
  const [centreNumber, setCentreNumber] = useState("U3206");
  const [examTitle, setExamTitle] = useState("UGANDA LOWER SECONDARY CERTIFICATE OF EDUCATION (NCDC / CBC)");
  
  // Configurable Exam Types
  const [examTypePreset, setExamTypePreset] = useState("End of Term Assessment");
  const [customExamType, setCustomExamType] = useState("");
  const currentExamType = examTypePreset === "Custom" ? (customExamType || "Custom Assessment") : examTypePreset;

  const [selectedSubject, setSelectedSubject] = useState("Agriculture");
  const [subjectCode, setSubjectCode] = useState("553/1");
  const [targetClass, setTargetClass] = useState("S.2");
  const [term, setTerm] = useState("Term 2");
  const [year, setYear] = useState(2026);
  const [duration, setDuration] = useState("2 Hours 15 Minutes");
  const [totalMarks, setTotalMarks] = useState(100);
  const [topicCoverage, setTopicCoverage] = useState(UGANDAN_SUBJECTS[0].defaultTopic);
  
  // Custom Instruction & Grounding
  const [customInstructions, setCustomInstructions] = useState("");
  
  // Configurable Difficulty
  const [difficultyLevel, setDifficultyLevel] = useState("Standard NCDC");

  // Student Weakness Diagnostics & Customization
  const [targetStudentWeaknesses, setTargetStudentWeaknesses] = useState(false);
  const [studentWeaknessesSummary, setStudentWeaknessesSummary] = useState("");
  const [detectedGaps, setDetectedGaps] = useState<string[]>([]);
  const [isFetchingWeaknesses, setIsFetchingWeaknesses] = useState(false);

  // Left Config Panel Tab: "general" | "instructions" | "weaknesses" | "rules"
  const [configTab, setConfigTab] = useState<"general" | "instructions" | "weaknesses" | "rules">("general");

  const [rulesAndRegulations, setRulesAndRegulations] = useState(STANDARD_RULES);
  const [includeMarkingGuide, setIncludeMarkingGuide] = useState(true);

  // Generation & Editor State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string | null>(null);
  const [generatedPaper, setGeneratedPaper] = useState<Partial<ExamPaper> | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"cover" | "paper" | "marking" | "raw">("cover");
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [savedPapers, setSavedPapers] = useState<ExamPaper[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable paper content
  const [editableContent, setEditableContent] = useState("");
  const [editableMarkingGuide, setEditableMarkingGuide] = useState("");
  const printableAreaRef = useRef<HTMLDivElement>(null);

  // Load saved papers and initialize school from user info if available
  useEffect(() => {
    if (user?.schoolCode) {
      fetch(`/api/schools/${user.schoolCode}`)
        .then(res => res.ok ? res.json() : null)
        .then(sch => {
          if (sch) {
            if (sch.name) setSchoolName(sch.name);
            if (sch.location) setSchoolLocation(sch.location);
            if (sch.poBox) setPoBox(sch.poBox);
            if (sch.phone) setPhoneContact(sch.phone);
            if (sch.motto) setMotto(sch.motto);
            if (sch.code) setCentreNumber(sch.code);
          }
        })
        .catch(() => {});
    }

    loadSavedPapers();
  }, [user]);

  const loadSavedPapers = async () => {
    setIsLoadingSaved(true);
    try {
      const res = await fetch("/api/exam-papers");
      if (res.ok) {
        const data = await res.json();
        setSavedPapers(data);
      }
    } catch (e) {
      console.error("Failed to load exam papers:", e);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleSubjectChange = (subjName: string) => {
    setSelectedSubject(subjName);
    const found = UGANDAN_SUBJECTS.find(s => s.name === subjName);
    if (found) {
      setSubjectCode(found.code);
      setTopicCoverage(found.defaultTopic);
    }
    // If weakness targeting is active, refresh the diagnostic gaps for this subject
    if (targetStudentWeaknesses) {
      fetchClassWeaknesses(subjName);
    }
  };

  const fetchClassWeaknesses = async (subjectToFetch = selectedSubject) => {
    setIsFetchingWeaknesses(true);
    try {
      const res = await fetch(`/api/exam-papers/class-weaknesses?subjectName=${encodeURIComponent(subjectToFetch)}&class=${encodeURIComponent(targetClass)}`);
      if (res.ok) {
        const data = await res.json();
        setDetectedGaps(data.weaknesses || []);
        if (!studentWeaknessesSummary || studentWeaknessesSummary.includes("Class diagnostic indicates")) {
          setStudentWeaknessesSummary(data.summary || "");
        }
        setStatusMessage({ 
          type: "info", 
          text: `Retrieved ${data.weaknesses?.length || 0} diagnosed learning gaps for ${subjectToFetch} (${targetClass}).` 
        });
      }
    } catch (err) {
      console.error("Failed to fetch class weaknesses:", err);
    } finally {
      setIsFetchingWeaknesses(false);
    }
  };

  const handleToggleWeaknessTargeting = (enabled: boolean) => {
    setTargetStudentWeaknesses(enabled);
    if (enabled && detectedGaps.length === 0) {
      fetchClassWeaknesses();
    }
  };

  const handleGenerate = async () => {
    if (!topicCoverage.trim()) {
      setStatusMessage({ type: "error", text: "Please provide the topic coverage or syllabus focus." });
      return;
    }

    setIsGenerating(true);
    setStatusMessage(null);
    setGenerationStep("Analyzing NCDC syllabus coverage, difficulty settings & Ugandan contextual cues...");

    const context: GenerateExamContext = {
      schoolName,
      schoolLocation,
      poBox,
      phoneContact,
      motto,
      centreNumber,
      examTitle,
      examType: currentExamType,
      difficultyLevel,
      customInstructions: customInstructions.trim() || undefined,
      targetStudentWeaknesses,
      studentWeaknessesSummary: targetStudentWeaknesses ? (studentWeaknessesSummary.trim() || detectedGaps.join("; ")) : undefined,
      subject: selectedSubject,
      subjectCode,
      class: targetClass,
      term,
      year: Number(year),
      duration,
      totalMarks: Number(totalMarks),
      topicCoverage,
      rulesAndRegulations,
      includeMarkingGuide
    };

    try {
      setGenerationStep(
        targetStudentWeaknesses 
          ? "Synthesizing diagnostic questions targeted at diagnosed learner weaknesses..."
          : "Drafting CBC Section A & Activity of Integration via NCDC Chief Examiner engine..."
      );
      const result = await generateExamPaper(context);

      const paperObj: Partial<ExamPaper> = {
        ...context,
        subjectName: selectedSubject,
        content: result.content,
        markingGuide: result.markingGuide || "",
        createdAt: new Date().toISOString()
      };

      setGeneratedPaper(paperObj);
      setEditableContent(result.content);
      setEditableMarkingGuide(result.markingGuide || "");
      setActiveViewTab("paper");
      setStatusMessage({ 
        type: "success", 
        text: `Generated ${currentExamType} with verified NCDC standards and ${difficultyLevel} difficulty!` 
      });
    } catch (err: any) {
      console.error("Exam generation failed:", err);
      setStatusMessage({ type: "error", text: err.message || "Failed to generate exam paper. Please check connection." });
    } finally {
      setIsGenerating(false);
      setGenerationStep(null);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!generatedPaper) return;
    setIsSaving(true);
    try {
      const payload = {
        ...generatedPaper,
        difficultyLevel,
        customInstructions: customInstructions.trim() || null,
        targetStudentWeaknesses,
        studentWeaknessesSummary: studentWeaknessesSummary.trim() || null,
        content: editableContent,
        markingGuide: editableMarkingGuide
      };

      const res = await fetch("/api/exam-papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Failed to persist exam paper to database.");
      }

      const saved = await res.json();
      setStatusMessage({ type: "success", text: `Exam paper saved successfully to the school repository! (ID: #${saved.id})` });
      loadSavedPapers();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to save paper." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!generatedPaper) return;
    try {
      setStatusMessage({ type: "info", text: "Packaging Microsoft Word (.DOCX) document..." });
      const currentData: Partial<ExamPaper> = {
        ...generatedPaper,
        difficultyLevel,
        customInstructions: customInstructions.trim() || undefined,
        targetStudentWeaknesses,
        studentWeaknessesSummary: studentWeaknessesSummary.trim() || undefined,
        content: editableContent,
        markingGuide: editableMarkingGuide
      };
      await exportExamToDocx(currentData, includeMarkingGuide);
      setStatusMessage({ type: "success", text: "Exam paper downloaded as formatted Microsoft Word (.docx) document!" });
    } catch (e: any) {
      console.error("DOCX export failed:", e);
      setStatusMessage({ type: "error", text: "Failed to export Word document: " + e.message });
    }
  };
  const handleLoadSavedIntoView = (paper: ExamPaper) => {
    setGeneratedPaper(paper);
    setSchoolName(paper.schoolName);
    setSchoolLocation(paper.schoolLocation || "");
    setPoBox(paper.poBox || "");
    setPhoneContact(paper.phoneContact || "");
    setMotto(paper.motto || "");
    setCentreNumber(paper.centreNumber || "");
    
    // Exam Type handling
    const matchingPreset = EXAM_TYPE_OPTIONS.find(o => o.id === paper.examType);
    if (matchingPreset) {
      setExamTypePreset(paper.examType);
      setCustomExamType("");
    } else {
      setExamTypePreset("Custom");
      setCustomExamType(paper.examType);
    }

    setSelectedSubject(paper.subjectName);
    setSubjectCode(paper.subjectCode || "553/1");
    setTargetClass(paper.class);
    setTerm(paper.term);
    setYear(paper.year || 2026);
    setDuration(paper.duration || "2 Hours 15 Minutes");
    setTotalMarks(paper.totalMarks || 100);
    setTopicCoverage(paper.topicCoverage);
    setDifficultyLevel(paper.difficultyLevel || "Standard NCDC");
    setCustomInstructions(paper.customInstructions || "");
    setTargetStudentWeaknesses(Boolean(paper.targetStudentWeaknesses));
    setStudentWeaknessesSummary(paper.studentWeaknessesSummary || "");
    setRulesAndRegulations(paper.rulesAndRegulations || STANDARD_RULES);
    setEditableContent(paper.content);
    setEditableMarkingGuide(paper.markingGuide || "");
    setActiveViewTab("paper");
    setStatusMessage({ type: "info", text: `Loaded saved exam paper: ${paper.subjectName} (${paper.class}) - ${paper.examType}` });
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white rounded-2xl border border-gray-200 text-center">
        <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Restricted Assessment Generator</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          The NCDC Examination Paper & Test Template Generator is strictly provisioned for users with the 
          <strong> Teacher</strong>, <strong>Examiner</strong>, <strong>Director of Studies (DOS)</strong>, or <strong>Head Teacher (HM)</strong> roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner & Persona Badge */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Award size={14} />
                NCDC 2026 CBC Certified Generator
              </span>
              <span className="px-3 py-1 bg-white/10 text-gray-300 rounded-full text-xs font-semibold">
                Role: {user.role.toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              NCDC Examination & Test Template Generator
            </h1>
            <p className="text-gray-300 text-sm mt-2 max-w-2xl leading-relaxed">
              Generate standardized Ugandan Competency-Based Assessment papers complete with custom school headers, 
              P.O. Box credentials, strict examination rules, Activity of Integration (AOI), 
              and authentic local context questions. Download as <strong>Word (.docx)</strong> or print ready-to-use <strong>PDFs</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const el = document.getElementById("saved-papers-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <BookOpen size={16} className="text-emerald-400" />
              <span>Saved Papers ({savedPapers.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Feedback */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl text-sm flex items-center justify-between border transition-all ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          statusMessage.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
          'bg-sky-50 text-sky-800 border-sky-200'
        }`}>
          <div className="flex items-center gap-3">
            {statusMessage.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600" /> :
             statusMessage.type === 'error' ? <AlertCircle size={18} className="text-rose-600" /> :
             <RefreshCw size={18} className="text-sky-600 animate-spin" />}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Parameters on Left, Real-time Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input Form & Configuration Tabs (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-5">
            
            {/* Header & Configuration Sub-Tabs */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Sliders size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Examination Parameters</h3>
                    <p className="text-[11px] text-gray-500">Configure institutional header, topics & diagnostics</p>
                  </div>
                </div>
                {targetStudentWeaknesses && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1 animate-pulse">
                    <Target size={12} /> Weakness Mode
                  </span>
                )}
              </div>

              {/* Sub-Tabs */}
              <div className="grid grid-cols-4 gap-1 bg-gray-100 p-1 rounded-2xl mt-4 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setConfigTab("general")}
                  className={`py-2 px-1.5 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${
                    configTab === "general" 
                      ? "bg-white text-emerald-800 shadow-sm font-extrabold" 
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <School size={14} />
                  <span className="truncate">General</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfigTab("instructions")}
                  className={`py-2 px-1.5 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${
                    configTab === "instructions" 
                      ? "bg-white text-emerald-800 shadow-sm font-extrabold" 
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Edit3 size={14} />
                  <span className="truncate">Grounding</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfigTab("weaknesses")}
                  className={`py-2 px-1.5 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 relative ${
                    configTab === "weaknesses" 
                      ? "bg-white text-emerald-800 shadow-sm font-extrabold" 
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Activity size={14} />
                  <span className="truncate">Weakness</span>
                  {targetStudentWeaknesses && (
                    <span className="absolute top-1 right-2 w-2 h-2 bg-emerald-500 rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setConfigTab("rules")}
                  className={`py-2 px-1.5 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${
                    configTab === "rules" 
                      ? "bg-white text-emerald-800 shadow-sm font-extrabold" 
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Gauge size={14} />
                  <span className="truncate">Difficulty</span>
                </button>
              </div>
            </div>

            {/* TAB 1: GENERAL & INSTITUTIONAL BRANDING */}
            {configTab === "general" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <School size={14} />
                    School Institutional Branding
                  </h4>

                  <div className="grid grid-cols-1 gap-3 text-xs">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">School Name (Official Header)</label>
                      <input
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="e.g. St. Mary's College Kisubi"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">P.O. Box & Postal Address</label>
                        <input
                          type="text"
                          value={poBox}
                          onChange={(e) => setPoBox(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          placeholder="P.O. Box 48, Entebbe"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">Centre Number</label>
                        <input
                          type="text"
                          value={centreNumber}
                          onChange={(e) => setCentreNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                          placeholder="e.g. U3206"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">District / Location</label>
                        <input
                          type="text"
                          value={schoolLocation}
                          onChange={(e) => setSchoolLocation(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          placeholder="Wakiso District, Uganda"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">Telephone Contact</label>
                        <input
                          type="text"
                          value={phoneContact}
                          onChange={(e) => setPhoneContact(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          placeholder="+256 414 321 000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">School Motto</label>
                      <input
                        type="text"
                        value={motto}
                        onChange={(e) => setMotto(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none italic"
                        placeholder="Semper Ultra (Always Further)"
                      />
                    </div>
                  </div>
                </div>

                {/* Academic & Examination Details */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <GraduationCap size={14} />
                    Examination Level & Assessment Type
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Subject</label>
                      <select
                        value={selectedSubject}
                        onChange={(e) => handleSubjectChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                      >
                        {UGANDAN_SUBJECTS.map(s => (
                          <option key={s.name} value={s.name}>{s.icon} {s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Paper Code</label>
                      <input
                        type="text"
                        value={subjectCode}
                        onChange={(e) => setSubjectCode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                        placeholder="553/1"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Class Level</label>
                      <select
                        value={targetClass}
                        onChange={(e) => setTargetClass(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
                      >
                        <option value="S.1">Senior One (S.1)</option>
                        <option value="S.2">Senior Two (S.2)</option>
                        <option value="S.3">Senior Three (S.3)</option>
                        <option value="S.4">Senior Four (S.4)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Academic Term</label>
                      <select
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                      >
                        <option value="Term 1">Term 1</option>
                        <option value="Term 2">Term 2</option>
                        <option value="Term 3">Term 3</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-gray-700 font-semibold mb-1">
                        Examination Format & Type (Shown on Cover Page)
                      </label>
                      <select
                        value={examTypePreset}
                        onChange={(e) => setExamTypePreset(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                      >
                        {EXAM_TYPE_OPTIONS.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label} — {opt.desc}</option>
                        ))}
                      </select>
                    </div>

                    {examTypePreset === "Custom" && (
                      <div className="col-span-2 animate-in fade-in">
                        <label className="block text-gray-700 font-semibold mb-1">Custom Exam Title / Type</label>
                        <input
                          type="text"
                          value={customExamType}
                          onChange={(e) => setCustomExamType(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          placeholder="e.g. Special Holiday Revision Test or Inter-House Mock"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Time Allowed</label>
                      <input
                        type="text"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="2 Hours 15 Minutes"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Total Marks</label>
                      <input
                        type="number"
                        value={totalMarks}
                        onChange={(e) => setTotalMarks(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOM GROUNDING & TOPIC COVERAGE */}
            {configTab === "instructions" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                      <MapPin size={14} />
                      Curriculum Topic Coverage
                    </h4>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      NCDC Syllabus
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Specify the primary curriculum units or syllabus chapters being evaluated.
                  </p>
                  <textarea
                    value={topicCoverage}
                    onChange={(e) => setTopicCoverage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. Principles of soil conservation, organic manuring, and indigenous poultry management in Central Uganda"
                  />
                </div>

                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                      <Edit3 size={14} />
                      Examiner Custom Grounding & Context
                    </h4>
                    <span className="text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Custom Scenarios
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Add custom instructions to ground test items around specific Ugandan communities, practical farm or lab trials, or cross-cutting issues.
                  </p>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. Ground Section B Item 5 on a real farm in Luweero District tackling drought and soil exhaustion; incorporate cost-benefit analysis for youth agribusiness and indigenous seed preservation."
                  />

                  {/* Suggested Contextual Chips */}
                  <div className="pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Quick Context Grounding Ideas:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Peri-urban community challenge",
                        "Climate change & flood resilience",
                        "Agribusiness SACCO model",
                        "Household renewable energy",
                        "Indigenous technology adaptation"
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            setCustomInstructions(prev => 
                              prev ? `${prev.trim()}. Also emphasize: ${chip}.` : `Emphasize authentic context: ${chip}.`
                            );
                          }}
                          className="px-2.5 py-1 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 text-gray-700 text-[10px] rounded-lg transition-all"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: WEAKNESS REMEDIATION & STUDENT GAP TARGETING */}
            {configTab === "weaknesses" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                        <Target size={15} className="text-emerald-700" />
                        Target Student Weaknesses in this Assessment
                      </h4>
                      <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
                        Summarizes student weaknesses and tailors test items so weak learners get exposed to difficult areas, providing measurable room for improvement.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={targetStudentWeaknesses}
                        onChange={(e) => handleToggleWeaknessTargeting(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {targetStudentWeaknesses && (
                    <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-xs">
                      <span className="text-emerald-800 font-semibold text-[11px]">
                        {isFetchingWeaknesses ? "Analyzing learning curve telemetry..." : `Diagnosed: ${detectedGaps.length} critical gaps identified`}
                      </span>
                      <button
                        type="button"
                        onClick={() => fetchClassWeaknesses()}
                        disabled={isFetchingWeaknesses}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                      >
                        <RefreshCw size={11} className={isFetchingWeaknesses ? "animate-spin" : ""} />
                        <span>Refresh Telemetry</span>
                      </button>
                    </div>
                  )}
                </div>

                {targetStudentWeaknesses && (
                  <div className="space-y-3 animate-in fade-in">
                    {detectedGaps.length > 0 && (
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                          Identified Class Diagnostic Gaps:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {detectedGaps.map((gap, idx) => (
                            <span 
                              key={idx}
                              className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[10px] font-medium flex items-center gap-1"
                            >
                              <AlertCircle size={10} className="text-rose-600" />
                              <span>{gap}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Teacher's Diagnostic Summary & Focus Areas
                      </label>
                      <p className="text-[10px] text-gray-500 mb-1.5">
                        These notes guide the AI to expose these specific misconceptions and provide structured scaffolding in the marking guide.
                      </p>
                      <textarea
                        value={studentWeaknessesSummary}
                        onChange={(e) => setStudentWeaknessesSummary(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="e.g. Learners struggle to differentiate between soil structure and soil texture; difficulty computing fertilizer application ratios; inadequate problem solving in real-life erosion control scenarios."
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: DIFFICULTY & CANDIDATE RULES */}
            {configTab === "rules" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Configurable Difficulty */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <Gauge size={14} />
                    Configurable Assessment Difficulty
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Calibrate the cognitive rigor and scaffolding of the assessment items.
                  </p>

                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {DIFFICULTY_LEVELS.map((lvl) => {
                      const isSelected = difficultyLevel === lvl.id;
                      return (
                        <div
                          key={lvl.id}
                          onClick={() => setDifficultyLevel(lvl.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all text-xs flex items-start gap-2.5 ${
                            isSelected
                              ? "bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500 text-emerald-950"
                              : "bg-white border-gray-200 hover:border-gray-300 text-gray-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="difficultyLevel"
                            checked={isSelected}
                            onChange={() => setDifficultyLevel(lvl.id)}
                            className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <p className="font-bold text-gray-900">{lvl.label}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{lvl.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rules & Regulations */}
                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <ShieldAlert size={14} />
                    Instructions to Candidates (Rules)
                  </h4>
                  <textarea
                    value={rulesAndRegulations}
                    onChange={(e) => setRulesAndRegulations(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-[11px] border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-gray-700"
                  />
                </div>

                {/* Marking Guide Toggle */}
                <div className="pt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeMarkingGuide}
                      onChange={(e) => setIncludeMarkingGuide(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <span>Include Confidential Teacher Marking Scheme & NCDC Rubrics</span>
                  </label>
                </div>
              </div>
            )}

            {/* Quick Status Bar & Generate Action Button */}
            <div className="pt-2 space-y-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                <span>Type: <strong className="text-gray-800">{currentExamType}</strong></span>
                <span>Level: <strong className="text-gray-800">{difficultyLevel}</strong></span>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={18} className="animate-spin text-emerald-200" />
                    <span>{generationStep || "Synthesizing NCDC Paper..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="text-emerald-200 group-hover:rotate-12 transition-transform" />
                    <span>Generate NCDC Examination Paper</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Paper View & Action Bar (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {generatedPaper ? (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              
              {/* Action Toolbar */}
              <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 bg-gray-200/70 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveViewTab("cover")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeViewTab === "cover" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Cover Page
                  </button>
                  <button
                    onClick={() => setActiveViewTab("paper")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeViewTab === "paper" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Questions & Scenarios
                  </button>
                  {editableMarkingGuide && (
                    <button
                      onClick={() => setActiveViewTab("marking")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeViewTab === "marking" ? "bg-white text-emerald-800 shadow-sm" : "text-emerald-700 hover:text-emerald-900"
                      }`}
                    >
                      Marking Guide
                    </button>
                  )}
                  <button
                    onClick={() => setActiveViewTab("raw")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeViewTab === "raw" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Edit / Raw
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadDocx}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    title="Export styled Word Document"
                  >
                    <Download size={14} />
                    <span>Download (.docx)</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    title="Print or Save as PDF"
                  >
                    <Printer size={14} />
                    <span>Print / PDF</span>
                  </button>

                  <button
                    onClick={handleSaveToDatabase}
                    disabled={isSaving}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    title="Save to School Examination Repository"
                  >
                    <Save size={14} />
                    <span>{isSaving ? "Saving..." : "Save"}</span>
                  </button>

                  <button
                    onClick={handleCopy}
                    className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                    title="Copy Text"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              {/* Printable & Screen Paper Body */}
              <div ref={printableAreaRef} className="p-6 sm:p-10 max-h-[750px] overflow-y-auto space-y-6 text-gray-900 font-sans print:max-h-none print:p-0">
                
                {/* COVER PAGE VIEW */}
                {(activeViewTab === "cover" || activeViewTab === "paper") && (
                  <div className="border-4 border-double border-gray-900 p-6 sm:p-8 rounded-2xl bg-white space-y-5 print:border-black print:rounded-none">
                    {/* Header */}
                    <div className="text-center space-y-1">
                      <h2 className="text-xl sm:text-2xl font-black tracking-wide text-gray-900 uppercase">
                        {schoolName}
                      </h2>
                      <p className="text-xs text-gray-700 font-medium">
                        {poBox} • {schoolLocation} • Tel: {phoneContact}
                      </p>
                      <p className="text-xs italic text-gray-600">
                        "{motto}"
                      </p>
                      <div className="inline-block px-3 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-bold font-mono mt-1">
                        CENTRE NUMBER: {centreNumber}
                      </div>
                    </div>

                    <div className="border-t-2 border-b-2 border-gray-900 py-3 text-center space-y-1">
                      <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-gray-900">
                        {examTitle}
                      </h3>
                      <p className="text-xs font-black text-gray-800 uppercase tracking-wide">
                        {generatedPaper?.examType || currentExamType} • {year}
                      </p>
                      <h4 className="text-lg font-black text-emerald-950 uppercase pt-1">
                        {selectedSubject} ({subjectCode})
                      </h4>
                      <p className="text-xs font-bold text-gray-700">
                        CLASS: {targetClass} • {term.toUpperCase()}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <p className="text-xs font-bold text-gray-900">
                          TIME ALLOWED: {duration} &nbsp;|&nbsp; MAXIMUM MARKS: {totalMarks} MARKS
                        </p>
                        {(generatedPaper?.difficultyLevel || difficultyLevel) && (
                          <span className="px-2 py-0.5 bg-gray-100 border border-gray-400 rounded text-[10px] uppercase font-extrabold text-gray-800">
                            DIFFICULTY: {generatedPaper?.difficultyLevel || difficultyLevel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Diagnostic Weakness Alert Banner if active */}
                    {(generatedPaper?.targetStudentWeaknesses || targetStudentWeaknesses) && (
                      <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-left space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold text-xs">
                          <Target size={14} className="text-emerald-700" />
                          <span>DIAGNOSTIC & REMEDIAL EXPOSURE SPECIFICATION:</span>
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                          {generatedPaper?.studentWeaknessesSummary || studentWeaknessesSummary || "Targeted questions designed to identify and remediate persistent student gaps in competency, core concepts, and application."}
                        </p>
                      </div>
                    )}

                    {/* Custom Examiner Focus Highlights if provided */}
                    {(generatedPaper?.customInstructions || customInstructions.trim()) && (
                      <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl text-left text-xs text-amber-900">
                        <span className="font-bold">Examiner Focus & Grounding: </span>
                        <span>{generatedPaper?.customInstructions || customInstructions}</span>
                      </div>
                    )}

                    {/* Candidate Entry Box */}
                    <div className="border border-gray-400 p-4 rounded-xl space-y-2.5 bg-gray-50/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-bold whitespace-nowrap">Candidate Name:</span>
                          <span className="border-b border-dotted border-gray-500 flex-1 min-h-[18px]"></span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold whitespace-nowrap">Index / Random No:</span>
                          <span className="border-b border-dotted border-gray-500 flex-1 min-h-[18px]"></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold whitespace-nowrap">Stream / Class:</span>
                          <span className="border-b border-dotted border-gray-500 flex-1 min-h-[18px]"></span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold whitespace-nowrap">Candidate Signature:</span>
                          <span className="border-b border-dotted border-gray-500 flex-1 min-h-[18px]"></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold whitespace-nowrap">Date:</span>
                          <span className="border-b border-dotted border-gray-500 flex-1 min-h-[18px]"></span>
                        </div>
                      </div>
                    </div>

                    {/* Rules & Instructions */}
                    <div className="space-y-1.5 text-xs text-gray-800">
                      <p className="font-bold uppercase tracking-wider text-gray-900">Instructions to Candidates:</p>
                      <ol className="list-decimal pl-5 space-y-1 leading-relaxed text-[11px]">
                        {rulesAndRegulations.split("\n").map((rule, idx) => (
                          <li key={idx}>{rule.replace(/^\d+\.\s*/, '')}</li>
                        ))}
                      </ol>
                    </div>

                    {/* Examiner's Score Grid */}
                    <div className="pt-2">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-900 mb-1">For Examiner's Use Only:</p>
                      <table className="w-full text-[11px] border border-gray-400 text-center">
                        <thead>
                          <tr className="bg-gray-100 font-bold border-b border-gray-400">
                            <th className="p-1 border-r border-gray-400">Section</th>
                            <th className="p-1 border-r border-gray-400">Item / Question</th>
                            <th className="p-1 border-r border-gray-400">Max Mark</th>
                            <th className="p-1 border-r border-gray-400">Mark Scored</th>
                            <th className="p-1 border-r border-gray-400">NCDC Level (1-3)</th>
                            <th className="p-1">Examiner Initials</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-300">
                            <td className="p-1 border-r border-gray-300 font-semibold">Section A</td>
                            <td className="p-1 border-r border-gray-300">Item 1 - 4</td>
                            <td className="p-1 border-r border-gray-300">40</td>
                            <td className="p-1 border-r border-gray-300"></td>
                            <td className="p-1 border-r border-gray-300"></td>
                            <td className="p-1"></td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="p-1 border-r border-gray-300 font-semibold">Section B</td>
                            <td className="p-1 border-r border-gray-300">Item 5 (AOI)</td>
                            <td className="p-1 border-r border-gray-300">30</td>
                            <td className="p-1 border-r border-gray-300"></td>
                            <td className="p-1 border-r border-gray-300"></td>
                            <td className="p-1"></td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="p-1 border-r border-gray-300 font-semibold">Section B</td>
                            <td className="p-1 border-r border-gray-300">Item 6 (AOI)</td>
                            <td className="p-1 border-r border-gray-300">30</td>
                            <td className="p-1 border-r border-gray-300"></td>
                            <td className="p-1 border-r border-gray-300"></td>
                            <td className="p-1"></td>
                          </tr>
                          <tr className="bg-gray-100 font-bold">
                            <td colSpan={2} className="p-1 border-r border-gray-400 text-right pr-2">TOTAL</td>
                            <td className="p-1 border-r border-gray-400">{totalMarks}</td>
                            <td className="p-1 border-r border-gray-400"></td>
                            <td className="p-1 border-r border-gray-400"></td>
                            <td className="p-1"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* QUESTIONS & SCENARIOS BODY */}
                {activeViewTab === "paper" && (
                  <div className="space-y-6 pt-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        Examination Items & Activities
                      </span>
                      <span className="text-xs text-emerald-600 font-semibold">
                        NCDC Competency-Based Assessment
                      </span>
                    </div>

                    <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed space-y-4">
                      {editableContent.split("\n\n").map((block, bIdx) => {
                        const trimmed = block.trim();
                        if (trimmed.startsWith("# ") || trimmed.startsWith("## ")) {
                          return (
                            <h3 key={bIdx} className="text-base font-bold text-gray-900 border-b border-gray-300 pb-1 mt-6">
                              {trimmed.replace(/^#+\s*/, '')}
                            </h3>
                          );
                        } else if (trimmed.startsWith("### ")) {
                          return (
                            <h4 key={bIdx} className="text-sm font-bold text-emerald-900 mt-4">
                              {trimmed.replace(/^#+\s*/, '')}
                            </h4>
                          );
                        } else if (trimmed.startsWith("**Item") || trimmed.startsWith("Item ")) {
                          return (
                            <div key={bIdx} className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 my-3">
                              <p className="font-semibold text-gray-900">{trimmed}</p>
                            </div>
                          );
                        } else {
                          return (
                            <p key={bIdx} className="text-xs leading-relaxed whitespace-pre-line">
                              {trimmed}
                            </p>
                          );
                        }
                      })}
                    </div>
                  </div>
                )}

                {/* MARKING GUIDE VIEW */}
                {activeViewTab === "marking" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-1">
                        <CheckCircle2 size={18} className="text-emerald-600" />
                        <span>Confidential: Examiner Marking Scheme & NCDC Rubrics</span>
                      </div>
                      <p className="text-xs text-emerald-700">
                        This guide uses the official NCDC 3-Level Competency Grid (Level 1: Basic/Needs Guidance, Level 2: Substantial/Competent, Level 3: Outstanding/Mastery).
                      </p>
                    </div>

                    <div className="p-6 bg-white border border-gray-200 rounded-2xl text-xs space-y-4 font-mono leading-relaxed whitespace-pre-wrap">
                      {editableMarkingGuide}
                    </div>
                  </div>
                )}

                {/* RAW / EDIT TAB */}
                {activeViewTab === "raw" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <Edit3 size={14} />
                          Editable Exam Paper Content (Markdown)
                        </label>
                        <span className="text-[11px] text-gray-500">Changes reflect instantly in exports</span>
                      </div>
                      <textarea
                        value={editableContent}
                        onChange={(e) => setEditableContent(e.target.value)}
                        rows={14}
                        className="w-full px-4 py-3 text-xs font-mono border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        Editable Marking Scheme & Rubrics
                      </label>
                      <textarea
                        value={editableMarkingGuide}
                        onChange={(e) => setEditableMarkingGuide(e.target.value)}
                        rows={10}
                        className="w-full px-4 py-3 text-xs font-mono border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center flex flex-col items-center justify-center space-y-4 h-full min-h-[460px]">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                <FileText size={32} />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="font-bold text-gray-900 text-lg">No Exam Paper Generated Yet</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Select your school details, subject, class, and curriculum coverage on the left panel, 
                  then click <strong>"Generate NCDC Examination Paper"</strong> to view the live printable template and export to DOCX.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="pt-4 border-t border-gray-100 w-full">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Quick NCDC Curriculum Topic Presets:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {UGANDAN_SUBJECTS.slice(0, 4).map(sub => (
                    <button
                      key={sub.name}
                      onClick={() => handleSubjectChange(sub.name)}
                      className="px-3 py-1.5 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-xl text-xs text-gray-700 transition-all flex items-center gap-1.5"
                    >
                      <span>{sub.icon}</span>
                      <span className="font-medium">{sub.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved Papers Repository Section */}
      <div id="saved-papers-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <BookOpen size={20} className="text-emerald-600" />
              <span>School Examination & Assessment Paper Repository</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Access previously generated test templates, print copies, or export Word documents.
            </p>
          </div>
          <button
            onClick={loadSavedPapers}
            disabled={isLoadingSaved}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw size={14} className={isLoadingSaved ? "animate-spin" : ""} />
            <span>Refresh Archive</span>
          </button>
        </div>

        {savedPapers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedPapers.map(p => (
              <div 
                key={p.id}
                className="p-5 rounded-2xl border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all bg-gray-50/50 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-extrabold uppercase tracking-wide">
                      {p.class} • {p.term}
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                      {p.subjectCode || "NCDC"}
                    </span>
                  </div>

                  {/* Badges for Exam Type & Config */}
                  <div className="flex flex-wrap items-center gap-1">
                    {p.examType && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9px] font-bold">
                        {p.examType}
                      </span>
                    )}
                    {p.difficultyLevel && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9px] font-bold">
                        {p.difficultyLevel}
                      </span>
                    )}
                    {p.targetStudentWeaknesses && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold flex items-center gap-1">
                        <Target size={10} /> Weakness Remediated
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-gray-900 text-sm group-hover:text-emerald-700 transition-colors">
                    {p.subjectName}
                  </h3>
                  <p className="text-[11px] text-gray-500 line-clamp-2">
                    {p.topicCoverage}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {p.schoolName} • Centre {p.centreNumber || "U3206"}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleLoadSavedIntoView(p)}
                      className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                      title="Load into Preview & Edit"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => exportExamToDocx(p, true)}
                      className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                      title="Download as DOCX"
                    >
                      <Download size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteSaved(p.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      title="Delete from archive"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400 text-xs">
            No saved examination papers in the repository yet. Generate and click "Save" to build your school bank.
          </div>
        )}
      </div>
    </div>
  );
};
