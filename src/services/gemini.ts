import { GoogleGenAI } from "@google/genai";
import { LearningCurve, GenerateExamContext } from "../types";

const isBrowser = typeof window !== 'undefined';

let ai: any = null;
if (!isBrowser) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
}

async function callAI(action: string, args: any[]): Promise<any> {
  const token = localStorage.getItem("token");
  const API_BASE = "/api";
  const res = await fetch(`${API_BASE}/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, args }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `AI request failed for ${action}`);
  }
  const data = await res.json();
  return data.result;
}

export const gemini = {
  // Socratic Tutoring for AoI
  getTutorResponse: async (prompt: string, context: { name: string; subject: string; activity: string; learningCurve?: LearningCurve }): Promise<string> => {
    if (isBrowser) return callAI("getTutorResponse", [prompt, context]);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are the 'Masterpiece Socratic Tutor' for the Ugandan 2026 NCDC Curriculum. 
        Student Name: ${context.name}. Subject: ${context.subject}. Activity: ${context.activity}.
        ${context.learningCurve ? `Student Learning Curve Profile: 
         Pace: ${context.learningCurve.learningPace} learner. 
         Avg Engagement: ${Math.round(context.learningCurve.averageEngagementTime / 60)} minutes per activity.
         Strengths: ${context.learningCurve.strengths || 'None recorded yet'}.
         Weaknesses: ${context.learningCurve.weaknesses || 'None recorded yet'}.
         Adjust your complexity and support based on this curve.` : ''}
        NEVER provide direct answers. Guide the student through their 'Activity of Integration'. 
        Use Ugandan metaphors (matooke stalls, Boda stages) to explain concepts. 
        Ask questions to help them think about local community resources.`,
      },
    });
    return response.text || "";
  },

  // OCR for handwritten work
  ocrHandwriting: async (base64Image: string, mimeType: string = "image/jpeg"): Promise<string> => {
    if (isBrowser) return callAI("ocrHandwriting", [base64Image, mimeType]);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType } },
            { 
              text: `You are the specialized 'Google AI Vision OCR' engine. 
              Analyze this image of a handwritten Ugandan school assignment with extreme precision.
              Extract every word accurately, maintaining the original layout and structure.
              Identify mathematical symbols, scientific diagrams, and tabular data.
              If a word is ambiguous, provide the most likely correction based on the educational context of the Ugandan 2026 CBC curriculum.
              Return ONLY the extracted text content.` 
            }
          ]
        },
      });
      return response.text || "No text could be extracted from the image.";
    } catch (error) {
      console.error("Gemini OCR Error:", error);
      throw new Error("Failed to process image with AI. Please ensure the image is clear and try again.");
    }
  },

  // Grading Assistant for Teachers
  gradeSubmission: async (content: string, activity: string): Promise<any> => {
    if (isBrowser) return callAI("gradeSubmission", [content, activity]);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Activity Title: ${activity}\nStudent Submission Content: ${content}`,
        config: {
          responseMimeType: "application/json",
          systemInstruction: `You are an expert Ugandan UNEB examiner for the 2026 CBC (Competency Based Curriculum). 
          Assess the student work based on NCDC standards. 
          Return a JSON object with the following structure:
          {
            "level": "L1" | "L2" | "L3",
            "competencyArea": "string (e.g., Area K1: Critical Thinking)",
            "constructiveFeedback": "string (detailed feedback for the student)",
            "standardizedComments": "string (official-sounding comments for the report card)",
            "strengths": ["string"],
            "weaknesses": ["string"]
          }
          Level 1 (L1): Basic understanding, needs significant support.
          Level 2 (L2): Good understanding, meets most criteria.
          Level 3 (L3): Excellent understanding, exceeds criteria.`,
        },
      });
      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Gemini Grading Error:", error);
      throw new Error("Failed to generate AI grading suggestion.");
    }
  },

  // Cross-Subject Correlation Analysis
  analyzeEngagementGap: async (studentData: { name: string; class: string; submissions: any[] }): Promise<string> => {
    if (isBrowser) return callAI("analyzeEngagementGap", [studentData]);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: JSON.stringify(studentData),
      config: {
        systemInstruction: `You are a Ugandan School Market Analyst and Pedagogical Specialist. 
        Analyze the student's engagement across different subjects. 
        Identify if the student is 'Lazy' in one subject but 'High Effort' in another. 
        Pinpoint interest gaps rather than character flaws. 
        If performance is below Level 2 in a subject, recommend a 'Verified Author' textbook from the marketplace. 
        Use social proof like '20 students in your class bought this book this week'.`,
      },
    });
    return response.text || "";
  },

  // Integrity Checker - Plagiarism Risk
  checkPlagiarism: async (content: string, activity: string): Promise<string> => {
    if (isBrowser) return callAI("checkPlagiarism", [content, activity]);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Activity: ${activity}\nStudent Submission: ${content}`,
        config: {
          systemInstruction: `You are the 'Integrity Checker' for Ugandan school assignments. 
          Analyze the student's work for 'AI-generated' patterns or lack of original thought. 
          If the student cannot explain the 'Why' behind their conclusion, flag it as 'high'. 
          Return ONLY one of these strings: 'low', 'medium', 'high'.`,
        },
      });
      const risk = response.text?.toLowerCase().trim() || "low";
      return ['low', 'medium', 'high'].includes(risk) ? risk : "low";
    } catch (error) {
      console.error("Gemini Integrity Error:", error);
      return "low"; // Default to low on error to not block student
    }
  },

  // Opus Agent: Bespoke Video Generation Simulation
  generateOpusVideoTutorial: async (context: { name: string; subject: string; activity: string; struggleArea: string; learningCurve?: LearningCurve }): Promise<any> => {
    if (isBrowser) return callAI("generateOpusVideoTutorial", [context]);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `The student ${context.name} is struggling with ${context.struggleArea} in ${context.subject} (${context.activity}). 
        ${context.learningCurve ? `Curve: ${context.learningCurve.learningPace} learner, Strengths: ${context.learningCurve.strengths}` : ''}`,
        config: {
          responseMimeType: "application/json",
          systemInstruction: `You are the 'Opus Agent', an advanced educational media AI. 
          Your task is to generate a 'bespoke' video script and visual board for a student who is failing to grasp a concept.
          Student Name: ${context.name}.
          Subject: ${context.subject}.
          Concept: ${context.struggleArea}.
          ${context.learningCurve ? `Persona: This student is a ${context.learningCurve.learningPace} learner. Tailor the script's speed and depth accordingly.` : ''}
          
          Return a JSON object:
          {
            "videoTitle": "string",
            "introduction": "string (personalized with student name)",
            "chapters": [
              { "timestamp": "0:00", "title": "string", "narrative": "string", "visualDescription": "string" }
            ],
            "closing": "string",
            "avatarStyle": "string (e.g., 'A friendly tech-mentor', 'A grandmotherly math-wiz')"
          }
          Use highly personalized and encouraging language. 
          Quote the student's previous queries or struggle points if possible (simulated here as the struggleArea). 
          Keep it contextually relevant to the 2026 Ugandan CBC curriculum.`,
        },
      });
      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Opus Agent Error:", error);
      throw new Error("Failed to generate bespoke tutorial.");
    }
  },

  // AI Correction for Poorly Performed Activities
  generateCorrection: async (submission: string, activity: string, teacherFeedback: string): Promise<string> => {
    if (isBrowser) return callAI("generateCorrection", [submission, activity, teacherFeedback]);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Activity: ${activity}\nOriginal Submission: ${submission}\nTeacher Feedback: ${teacherFeedback}`,
        config: {
          systemInstruction: `You are the 'Senior Pedagogical Guardian'. 
          A student has performed poorly on their 'Activity of Integration'.
          Your goal is to provide a comprehensive AI correction that doesn't just give the answer, but explains the 'Why' using the NCDC 2026 CBC standards.
          Break down the correction into:
          1. Concept Mastery: What was missed?
          2. Step-by-Step Resolution: How to correctly approach the problem.
          3. Socratic Self-Check: Questions for the student to verify their new understanding.
          Use Ugandan examples and encouraging language.`,
        },
      });
      return response.text || "I'm unable to generate a correction at this moment.";
    } catch (error) {
      console.error("Gemini Correction Error:", error);
      throw new Error("Failed to generate AI correction.");
    }
  },

  // Generate NCDC Aligned Lesson Plan
  generateLessonPlan: async (context: {
    subject: string;
    class: string;
    topic: string;
    competencyOutcome: string;
    duration: string;
  }): Promise<string> => {
    if (isBrowser) return callAI("generateLessonPlan", [context]);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Subject: ${context.subject}\nClass: ${context.class}\nTopic: ${context.topic}\nNCDC Competency Outcome: ${context.competencyOutcome}\nDuration: ${context.duration}`,
        config: {
          systemInstruction: `You are an expert Ugandan NCDC (National Curriculum Development Centre) Pedagogical Designer and Curriculum Specialist.
          Generate a detailed, professional, and practical lesson plan for the Ugandan 2026 CBC (Competency Based Curriculum).
          
          The lesson plan MUST include the following structured sections:
          1. LESSON DETAILS (Subject, Class, Topic, Duration, Competency Outcome)
          2. LEARNING OBJECTIVES (Clear, measurable cognitive, psychomotor, or affective objectives)
          3. KEY CONCEPTS & GENERIC SKILLS (e.g., critical thinking, communication, co-operation, etc.)
          4. INSTRUCTIONAL MATERIALS (Local, accessible resources, e.g., diagrams, banana fibers, bottle caps)
          5. LESSON STEPS:
             - Introduction (Hook, link to previous knowledge, approx 10% of time)
             - Body/Main Activity (Student-centered activity, group work, teacher facilitation, approx 70% of time)
             - Conclusion (Reflection, summary, self-assessment, approx 20% of time)
          6. ASSESSMENT CRITERIA & OUTCOMES (How to check if the competency was achieved, e.g., Level 1, Level 2, Level 3 rubrics)
          
          Use rich Markdown with clear headings, tables, bullet points, and callouts to make it highly readable and visually distinct.
          Always use realistic Ugandan context, names, and local environment where applicable.`,
        },
      });
      return response.text || "Failed to generate lesson plan.";
    } catch (error) {
      console.error("Gemini Lesson Planner Error:", error);
      throw new Error("Failed to generate lesson plan aligned with NCDC competencies.");
    }
  },

  // Generate NCDC Examination Paper & Test Template Aligned with Topics & Local Context
  generateExamPaper: async (context: GenerateExamContext): Promise<{ content: string; markingGuide: string }> => {
    if (isBrowser) return callAI("generateExamPaper", [context]);
    
    // If AI client is not available or key missing, use high-fidelity Ugandan NCDC generator
    if (!ai || !process.env.GEMINI_API_KEY) {
      return buildLocalPersonalizedExamPaper(context);
    }

    try {
      const prompt = `Generate an official, comprehensive Ugandan Lower Secondary Competency-Based Curriculum (NCDC CBC 2026) examination paper and marking guide.

SCHOOL DETAILS FOR COVER PAGE & HEADERS:
- School Name: ${context.schoolName}
- Location & Local Community Environment: ${context.schoolLocation}
- P.O. Box: ${context.poBox || "P.O. Box 7062, Kampala"}
- Telephone / Contact: ${context.phoneContact || "+256 414 000 000"}
- School Motto: ${context.motto || "Excellence in Service and Knowledge"}
- Centre Number: ${context.centreNumber || "U0023"}

EXAMINATION SPECIFICATIONS:
- Examination Title: ${context.examTitle || "UGANDA LOWER SECONDARY CERTIFICATE OF EDUCATION (NCDC / CBC)"}
- Assessment / Exam Type: ${context.examType || "End of Term Examination"} (e.g. Topical Test, Weekly Test, Beginning of Term Examination, Mid-Term Examination, End of Term Examination, UNEB Mock Examination)
- Difficulty Level: ${context.difficultyLevel || "Standard NCDC (Balanced CBC Level 1–3)"}
- Subject: ${context.subject} (Paper Code: ${context.subjectCode || "NCDC-CBC"})
- Class: ${context.class}
- Term: ${context.term}
- Year: ${context.year || 2026}
- Duration / Time Allowed: ${context.duration || "2 Hours 15 Minutes"}
- Total Marks: ${context.totalMarks || 100}
- Current Curriculum Topic Coverage (Focus syllabus units): ${context.topicCoverage}
- Examiner Custom Grounding Instructions & Key Focus Areas: ${context.customInstructions ? context.customInstructions : "Grounded in standard NCDC syllabus syllabus outcomes and authentic local community scenarios."}
- Remedial / Weakness Targeting Mode: ${context.targetStudentWeaknesses ? "ENABLED - Customised to diagnose and expose student weaknesses" : "DISABLED - Standard balanced assessment"}
${context.targetStudentWeaknesses ? `- Documented Student Weaknesses & Learning Gaps to Target:\n"${context.studentWeaknessesSummary || "Misunderstanding core concepts, calculation errors, superficial answers without local evidence"}"` : ""}
- Instructions to Candidates / Rules: ${context.rulesAndRegulations || "Standard NCDC examination rules"}
- Include Marking Guide: ${context.includeMarkingGuide !== false ? "Yes" : "No"}`;

      const systemInstruction = `You are a Senior UNEB / NCDC (National Curriculum Development Centre) Chief Examiner and Assessment Design Specialist for the Ugandan 2026 Lower Secondary Competency-Based Curriculum (CBC).
Generate a formal, authentic, comprehensive examination paper and complete marking guide aligned strictly with NCDC standards.

CRITICAL REQUIREMENTS:
1. EXAM TYPE & COVER PAGE BANNER:
Clearly state the assessment type in the cover banner: "${context.examType || 'Examination'}".
- If "Topical Test": Focus intensively on the specified topic unit "${context.topicCoverage}" with targeted formative items.
- If "Weekly Test": Focus on continuous weekly competencies and quick diagnostics.
- If "Beginning of Term Examination (BOT)": Balance revision of previous competencies with foundational checks for the new term.
- If "Mid-Term Examination (MOT)": Comprehensive half-term benchmark assessment.
- If "End of Term Examination (EOT)" or "Mock Examination": Rigorous summative assessment matching full UNEB paper format.

2. DIFFICULTY LEVEL ADJUSTMENT: "${context.difficultyLevel || 'Standard NCDC'}"
- If "Foundation / Remedial": Scaffolded questions with guiding prompts, clear structure, accessible vocabulary to build confidence for struggling learners.
- If "Standard NCDC": Balanced CBC alignment, typical UNEB style, standard Level 1-3 spread.
- If "Challenging / Distinction": Rigorous multi-step problem solving, deep critical evaluation, non-routine scenarios.
- If "Adaptive / Differentiated": Tiered sub-items progressing from accessible entry-points to advanced open-ended extension questions.

3. CUSTOM GROUNDING & TOPICAL FOCUS:
${context.customInstructions ? `Strictly adhere to the examiner's custom instructions: "${context.customInstructions}". Anchor questions specifically in these designated topics, case studies, or competencies.` : `Anchor every scenario directly in the school's specified geographic location and local socio-economic environment: "${context.schoolLocation}".`}

4. WEAKNESS DIAGNOSTIC & REMEDIAL EXPOSURE:
${context.targetStudentWeaknesses ? `REMEDIAL & WEAKNESS TARGETING MODE IS ACTIVE:
The examiner has requested this exam to diagnose and expose student weaknesses:
"${context.studentWeaknessesSummary || 'Struggles with practical calculations, weak problem-solving, confusing cause and effect'}".
- You MUST design questions that specifically trigger and test these known stumbling blocks, revealing common misconceptions and poor thinking habits so weak students are exposed and given clear room for remediation.
- In the Teacher's Marking Scheme, include a dedicated "DIAGNOSTIC & REMEDIAL GUIDANCE FOR WEAK LEARNERS" table with: (a) Common error/misconception, (b) Root cause, and (c) Specific corrective teaching intervention.` : ''}

5. LOCAL UGANDAN CONTEXTUALISATION:
Anchor EVERY scenario directly in "${context.schoolLocation}". Use authentic Ugandan community features, crops (matooke, coffee, cassava, maize), local markets, SACCOs, boda-boda operations, environmental dilemmas, and authentic Ugandan names (Kato, Babirye, Okello, Atim, Mukasa, Akello, Kiconco, Mugisha, Chebet). NEVER use generic or foreign contexts.

6. EXAMINATION PAPER STRUCTURE (Separated by delimiter '===MARKING_GUIDE==='):
PART 1: THE STUDENT EXAMINATION PAPER
- Official Cover Header (School Name, P.O. Box, District, Examination Title, Assessment Type, Difficulty Level, Subject & Paper Code, Class, Term, Year, Time Allowed).
- Instructions to Candidates (7-8 formal examination rules and regulations).
- Candidate Identification Box (Candidate Name, Random / Index Number, Stream, Signature, Date).
- For Examiner's Use Only Grid (Summary scoring table).
- SECTION A (40 MARKS): Short Structured Competency Items (3-4 scenario items with lined response spaces).
- SECTION B (60 MARKS): Extended Activities of Integration (AOI) (2-3 authentic community tasks; answer any TWO, 30 marks each).

PART 2: (After '===MARKING_GUIDE===')
THE TEACHER & EXAMINER MARKING SCHEME & NCDC RUBRICS
- Detailed model answers, step-by-step calculations, and point breakdown for Section A.
- Detailed scoring criteria for Section B.
- The official NCDC 3-Level Assessment Rubric (Level 1: Basic 1.0-1.5, Level 2: Competent 1.6-2.4, Level 3: Exemplary 2.5-3.0).
${context.targetStudentWeaknesses ? '- DIAGNOSTIC REMEDIATION GUIDE FOR WEAK LEARNERS (Specific teacher interventions for each exposed gap).' : ''}`;

      let response: any;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: { systemInstruction }
        });
      } catch (e) {
        console.warn("gemini-3.8-flash failed, trying gemini-2.5-flash fallback:", e);
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { systemInstruction }
        });
      }

      const text = response.text || "";
      if (!text || text.length < 100) {
        return buildLocalPersonalizedExamPaper(context);
      }

      const parts = text.split("===MARKING_GUIDE===");
      const content = parts[0]?.trim() || text;
      const markingGuide = parts[1]?.trim() || "See detailed marks allocation in the examination paper.";

      return { content, markingGuide };
    } catch (error) {
      console.error("Gemini Exam Generator Error, serving local engine template:", error);
      return buildLocalPersonalizedExamPaper(context);
    }
  }
};

export const generateExamPaper = gemini.generateExamPaper;

export function buildLocalPersonalizedExamPaper(context: GenerateExamContext): { content: string; markingGuide: string } {
  const schoolName = (context.schoolName || "ST. MARY'S COLLEGE KISUBI").toUpperCase();
  const location = context.schoolLocation || "Wakiso District, Central Uganda";
  const poBox = context.poBox || "P.O. Box 48, Entebbe";
  const contact = context.phoneContact || "+256 414 321 000";
  const motto = context.motto || "Semper Ultra (Always Further)";
  const centreNo = context.centreNumber || "U3206";
  const examTitle = (context.examTitle || "UGANDA LOWER SECONDARY CERTIFICATE OF EDUCATION (NCDC / CBC)").toUpperCase();
  const examType = (context.examType || "End of Term Assessment").toUpperCase();
  const difficulty = context.difficultyLevel || "Standard NCDC";
  const subject = context.subject || "Agriculture";
  const subjectCode = context.subjectCode || "553/1";
  const cls = context.class || "S.2";
  const term = context.term || "Term 2";
  const year = context.year || 2026;
  const duration = context.duration || "2 Hours 15 Minutes";
  const totalMarks = context.totalMarks || 100;
  const coverage = context.topicCoverage || "Principles of Soil Conservation, Plant Nutrition, and Integrated Farm Waste Recycling";
  const customInstructions = context.customInstructions;
  const isWeaknessTargeted = Boolean(context.targetStudentWeaknesses);
  const weaknessSummary = context.studentWeaknessesSummary || "Misunderstanding core principles, calculation inaccuracies, superficial community problem-solving";
  
  const rules = context.rulesAndRegulations || `1. This paper consists of two Sections: Section A and Section B.
2. Answer ALL questions in Section A and any TWO questions from Section B.
3. Write your responses clearly in the spaces provided or on additional ruled paper.
4. Candidates are expected to apply scientific and critical problem-solving skills to real challenges in ${location}.
5. Mathematical tables, rulers, and silent non-programmable scientific calculators may be used.
6. Mobile phones, programmable smartwatches, and unauthorized revision notes are strictly prohibited.
7. Fill in your Candidate Name, Assessment Index Number, Stream, and Signature on the cover page.`;

  const paperContent = `
# ${schoolName}
**${poBox} • ${location} • Tel: ${contact}**
*Motto: "${motto}"*
**CENTRE NUMBER: ${centreNo}**

---

### **${examTitle}**
### **${examType} • ${year}**
## **${subject.toUpperCase()} • ${subjectCode}**
### **CLASS: ${cls} • ${term.toUpperCase()}**
**DIFFICULTY LEVEL: ${difficulty.toUpperCase()} • TIME ALLOWED: ${duration} • TOTAL: ${totalMarks} MARKS**
${isWeaknessTargeted ? `\n> **SPECIAL DIAGNOSTIC FOCUS:** *This assessment is customized to diagnose identified competency gaps, expose common student misconceptions, and provide targeted room for improvement.*\n` : ""}
${customInstructions ? `\n> **EXAMINER'S FOCUS EMPHASIS:** *${customInstructions}*\n` : ""}

---

### **INSTRUCTIONS TO CANDIDATES (EXAM RULES & REGULATIONS)**
${rules}

---

### **CANDIDATE IDENTIFICATION DETAILS**
| Field | Candidate's Entry |
| :--- | :--- |
| **Candidate Name** | __________________________________________________________________ |
| **Assessment Random Number** | ________________________ **Stream / Class:** ____________________ |
| **Candidate's Signature** | ________________________ **Date:** ______________________________ |

---

### **FOR EXAMINER'S USE ONLY**
| Section | Question / Item | Maximum Score | Marks Scored | Level Achieved (L1 / L2 / L3) | Examiner's Signature |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **A** | Item 1 | 10 | | | |
| **A** | Item 2 | 10 | | | |
| **A** | Item 3 | 10 | | | |
| **A** | Item 4 | 10 | | | |
| **B** | Item 5 | 30 | | | |
| **B** | Item 6 | 30 | | | |
| **TOTAL** | | **${totalMarks}** | | | |

---

## **SECTION A (40 MARKS)**
*Answer **ALL** questions in this section. All questions carry equal marks.*

### **Item 1: Community Resource & Soil Health Investigation** [10 Marks]
In **${location}**, farmer Mukasa noticed that during the recent torrential seasonal rains, topsoil from his hillside farm was washed down into the valley, silting the local stream and leaving behind rocky, infertile subsoil. Furthermore, yields of staple food crops have fallen by over 45% over the past two harvesting seasons despite applying synthetic nitrogen fertilizer.

*(a)* Drawing upon your learning in **${coverage}**, explain two key human practices common in **${location}** that have aggravated this soil degradation. [04 marks]
*Candidate's Response:*
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________

*(b)* Design a 3-step practical soil conservation and nutrient restoration plan utilizing locally accessible materials that Mukasa and other smallholder farmers in **${location}** can implement immediately without high capital expenditure. [06 marks]
*Candidate's Response:*
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________

---

### **Item 2: Local Market Quality Control & Post-Harvest Preservation** [10 Marks]
At the central market in **${location}**, vendors handling perishable fresh produce face heavy post-harvest losses due to inadequate storage temperatures, humid conditions, and pest infestation during prolonged storage. Over 30 crates of farm produce spoil every week, causing financial distress and organic waste accumulation near local trading stalls.

*(a)* Identify two primary biological or environmental factors responsible for the rapid spoilage of fresh farm produce in **${location}**'s climatic conditions. [04 marks]
*Candidate's Response:*
____________________________________________________________________________________
____________________________________________________________________________________

*(b)* Recommend a low-cost, zero-electricity evaporative cooling or natural preservation technique that vendors in **${location}** can construct using charcoal, damp sand, or local pottery. Explain the scientific principle behind its operation. [06 marks]
*Candidate's Response:*
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________

---

### **Item 3: Quantitative Resource Assessment & Economic Viability** [10 Marks]
A youth cooperative registered in **${location}** intends to set up an enterprise aligned with **${coverage}**. They received a community seed grant of UGX 1,500,000. Their projected monthly input costs include:
- Raw local materials: UGX 450,000
- Transportation via local logistics/boda boda network: UGX 180,000
- Packaging and quality testing: UGX 120,000
- Labor and handling: UGX 250,000

The cooperative produces 250 units per month, sold at UGX 6,000 per unit to retail kiosks across **${location}**.

*(a)* Calculate the total monthly operating costs and determine the net profit generated by the cooperative per month. [04 marks]
*Candidate's Response:*
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________

*(b)* Suggest two practical strategies the youth cooperative can adopt to mitigate market competition from imported goods while preserving ecological balance in **${location}**. [06 marks]
*Candidate's Response:*
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________

---

### **Item 4: Environmental Impact & Public Safety Inquiry** [10 Marks]
Residents living near a developing trading hub in **${location}** have raised urgent concerns regarding unsegregated disposal of non-biodegradable plastics and chemical runoff into local community water sources. Children and domestic animals have begun suffering from water-borne and respiratory ailments.

*(a)* Explain how toxic runoff impacts the biological equilibrium of community wetlands and aquifers in **${location}**. [04 marks]
*Candidate's Response:*
____________________________________________________________________________________
____________________________________________________________________________________

*(b)* As a student of ${subject} under the NCDC Competency Curriculum, write a 4-point awareness advisory for the Local Council I (LC1) chairperson of **${location}** advocating for community-led waste separation and bio-digesting. [06 marks]
*Candidate's Response:*
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________

---

## **SECTION B (60 MARKS)**
*Answer any **TWO** questions from this section. Each question carries **30 Marks**.*

### **Item 5: Activity of Integration (AOI) — Comprehensive Community Solution** [30 Marks]
#### **Scenario Context:**
The District Executive Committee of **${location}** has observed rising youth unemployment alongside severe environmental degradation stemming from unsustainable resource exploitation. The District Education Officer (DEO) and Community Development Officer (CDO) have announced an open competition inviting Senior Secondary learners from **${schoolName}** to submit a comprehensive Project Proposal addressing:
1. Sustainable resource utilization based on **${coverage}**.
2. Community wealth creation and youth skills development.
3. Resilience against climate variability in **${location}**.

#### **Your Task:**
As the Chairperson of the Student Innovation & Science Club at **${schoolName}**, draft a structured Project Proposal (approx. 350-450 words) to present before the District Committee.

Your proposal MUST include:
1. **Project Title & Geographical Focus**: Clear title explicitly tailored to **${location}**.
2. **Problem Analysis**: Clear diagnostic of the existing local bottleneck.
3. **Proposed Innovation / Practical Solution**: Step-by-step technological or biological methodology utilizing locally available resources.
4. **Implementation Matrix**: Phased milestones (Month 1 to Month 6).
5. **Community Impact & Risk Mitigation**: Expected benefits for households in **${location}** and safety measures.

*Candidate's Response:*
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________

---

### **Item 6: Activity of Integration (AOI) — Investigative Field Audit & Action Plan** [30 Marks]
#### **Scenario Context:**
A prominent commercial venture established in the vicinity of **${location}** has been accused by community elders of causing negative environmental externalities (soil compaction, depletion of local water tables, and disruption of traditional crop pollination). However, the enterprise employs over 80 local residents and contributes significantly to the township revenue base.

#### **Your Task:**
Assuming the role of an independent Junior Environmental & Agricultural Inspector commissioned by the Town Council of **${location}**, write a formal Assessment Audit Report to be presented at an upcoming stakeholder mediation town hall.

Your report MUST encompass:
1. **Executive Summary**: Overview of the conflict between economic gains and ecological stability in **${location}**.
2. **Scientific & Practical Evaluation**: Detailed assessment grounded in **${subject}** principles regarding the reported environmental disruptions.
3. **Balanced Remediation Measures**: 3 actionable, win-win technical interventions that allow the enterprise to continue operations sustainably without degrading the local ecosystem.
4. **Monitoring & Accountability Framework**: Continuous assessment metrics to ensure long-term compliance.

*Candidate's Response:*
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________
____________________________________________________________________________________
`;

  const markingScheme = `
# **${schoolName}**
## **TEACHER & EXAMINER MARKING SCHEME & NCDC SCORING RUBRICS**
### **${examTitle} • ${subject.toUpperCase()} (${cls}, ${term})**

---

### **SECTION A MARKING GUIDE (40 MARKS)**

#### **Item 1: Community Resource & Soil Health Investigation (10 Marks)**
- **Part (a) [04 marks]:**
  * Award [02 marks] for each correctly identified human practice aggravating soil degradation in **${location}** (e.g. continuous monoculture, cultivating along steep slopes without contour bunds or terracing, overgrazing by local livestock, improper synthetic fertilizer overuse causing soil acidification).
  * Award maximum [04 marks].
- **Part (b) [06 marks]:**
  * Step 1: Physical barrier installation — digging fanya juu/fanya chini terraces or planting vetiver/elephant grass along slope contours [02 marks].
  * Step 2: Biological restoration — applying seasoned farmyard compost, mulch, or green manure (e.g. Mucuna, Calliandra) to restore organic carbon and microbial life [02 marks].
  * Step 3: Cultural practices — crop rotation with nitrogen-fixing indigenous legumes (beans, cowpeas, groundnuts) and agro-forestry integration [02 marks].

#### **Item 2: Local Market Quality Control & Post-Harvest Preservation (10 Marks)**
- **Part (a) [04 marks]:**
  * High ambient temperatures and elevated relative humidity accelerating microbial respiration and decay [02 marks].
  * Mechanical bruising during transportation and poor ventilation encouraging ethylene gas accumulation [02 marks].
- **Part (b) [06 marks]:**
  * Identification of Charcoal Cooler or Zero-Energy Cool Chamber (ZECC) [02 marks].
  * Scientific Explanation: As water evaporates from wet charcoal or sand pores, it absorbs latent heat of vaporization from the chamber interior, reducing internal temperatures by 5°C - 10°C and maintaining 85%+ relative humidity [03 marks].
  * Feasibility with local materials in **${location}** [01 mark].

#### **Item 3: Quantitative Resource Assessment (10 Marks)**
- **Part (a) [04 marks]:**
  * Total Operating Costs = 450,000 + 180,000 + 120,000 + 250,000 = UGX 1,000,000 [02 marks].
  * Total Revenue = 250 units × UGX 6,000 = UGX 1,500,000.
  * Net Monthly Profit = UGX 1,500,000 - UGX 1,000,000 = UGX 500,000 [02 marks].
- **Part (b) [06 marks]:**
  * Strategy 1: Local community brand identity emphasizing freshness, organic certification, and neighborhood direct delivery [03 marks].
  * Strategy 2: Value-addition (processing, vacuum sealing, solar dehydrating) to extend shelf-life and command premium pricing [03 marks].

#### **Item 4: Environmental Impact & Public Safety Inquiry (10 Marks)**
- **Part (a) [04 marks]:**
  * Infiltration of heavy metals and microplastics disrupts soil microbial flora and causes eutrophication in aquatic food chains [02 marks].
  * Bioaccumulation in domestic drinking water leads to human toxicity and chronic livestock illness [02 marks].
- **Part (b) [06 marks]:**
  * 4-point advisory for LC1: (1) Community clean-up Saturdays (Bulungi Bwansi), (2) Central colored sorting bins for plastic vs organic waste, (3) Bylaws penalizing wetland dumping, (4) Communal biogas digestion for organic waste [06 marks - 1.5 marks each].

---

### **SECTION B: NCDC 3-LEVEL COMPETENCY ASSESSMENT RUBRIC (30 MARKS PER ITEM)**

Evaluated across four NCDC core dimensions:

| Dimension | Max Score | Level 1 (Basic / Emerging) [Score: 1 - 3] | Level 2 (Competent / Proficient) [Score: 4 - 6] | Level 3 (Exceptional / Mastery) [Score: 7 - 8] |
| :--- | :---: | :--- | :--- | :--- |
| **1. Relevance & Contextualisation** | 8 | Identifies generic issues with minimal or incorrect reference to **${location}**. | Clearly links problems to the geography, ecology, and economy of **${location}**. | In-depth, nuanced understanding of **${location}**'s local realities with authentic community terminology. |
| **2. Scientific & Pedagogical Rigor** | 8 | Superficially mentions ${subject} concepts; contains conceptual inaccuracies. | Accurately applies ${subject} principles and ${coverage} competencies. | Sophisticated integration of scientific principles with rigorous, verifiable calculations and logic. |
| **3. Practical Viability & Methodology** | 8 | Solution is unrealistic, overly expensive, or relies on unavailable technology. | Practical, workable solution utilizing accessible local materials and existing infrastructure. | Highly innovative, sustainable, cost-effective model with phased matrix and risk contingencies. |
| **4. Communication & Presentation** | 6 | Disorganized, lacks structure, difficult to follow. [1 - 2 marks] | Well-structured report/proposal with appropriate sections and professional tone. [3 - 4 marks] | Exemplary presentation, compelling advocacy, clear diagrams or tables, and flawless professional diction. [5 - 6 marks] |

**Mark Conversion Guide:**
- Score 25 - 30: **Level 3 (High Competency - Mastery achieved)**
- Score 15 - 24: **Level 2 (Competency Achieved - Proficient)**
- Score 01 - 14: **Level 1 (Emerging Competency - Needs remedial support)**

${isWeaknessTargeted ? `
---

### **TEACHER'S DIAGNOSTIC & REMEDIAL INTERVENTION MATRIX**
*(Generated to expose learner misconceptions, address recorded learning gaps, and structure corrective feedback)*

| Competency Area / Weakness | Common Student Error / Pitfall Exposed | Root Misconception | Targeted Remedial Action & Scaffolding |
| :--- | :--- | :--- | :--- |
| **Quantitative & Bookkeeping Analysis** | Omitting fixed costs, adding percentage margins incorrectly, confusion in profit vs revenue | Confusing gross revenue with disposable earnings; weakness in basic decimal/currency operations | Give students 3 mini-scenario bookkeeping drills with physical receipts from local retail markets before attempting multi-step items. |
| **Environmental Cause & Effect** | Superficial statements like "water gets dirty" without naming biological mechanisms | Recalling textbook slogans without linking biochemical cycles to human health | Conduct a hands-on jar filtration and sedimentation demonstration using muddy runoff water from the school compound. |
| **Methodology & Feasibility in AOI** | Recommending imported high-tech machinery instead of accessible local materials | Belief that modern science only exists in factory-manufactured equipment | Task students to audit local community crafts (pottery, charcoal insulation, bamboo scaffolding) and document the science behind them. |
| **Scientific Reasoning & Units Precision** | Stating values without units (e.g. "500,000" instead of "UGX 500,000" or "10" instead of "10 kg/ha") | Carelessness in unit standardization | Enforce a strict "No Units = Zero" rule during peer-marking sessions to train rigorous precision. |
` : ""}
`;

  return { content: paperContent.trim(), markingGuide: markingScheme.trim() };
}
