export type Role = 'student' | 'teacher' | 'dos' | 'hm' | 'developer' | 'examiner' | 'publisher';

export interface School {
  id: number;
  code: string; // Centre Number
  name: string;
  location?: string;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  role: Role;
  status: 'pending' | 'approved' | 'suspended' | 'banned';
  schoolCode?: string;
  unebId?: string;
  class?: string;
  dnaEnrolled?: boolean;
  dnaVector?: string;
  welcomeNote?: string;
  schoolName?: string;
  dosName?: string;
  phoneNumber?: string;
  certificateUrl?: string;
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  institutionalId?: string;
}

export interface Enrollment {
  id: number;
  studentId: string;
  subjectId: number;
  teacherId: string;
  schoolId: number;
  class: string;
}

export interface Activity {
  id: number;
  title: string;
  subjectId: number;
  subjectName?: string;
  class: string;
  description: string;
  areaK: string;
  deadline?: string;
}

export interface Submission {
  id: number;
  studentId: string;
  studentName?: string;
  schoolCode?: string;
  aoiId: number;
  activityTitle?: string;
  content: string;
  grade?: 'L1' | 'L2' | 'L3';
  score?: number;
  feedback?: string;
  isCorrected?: boolean;
  isMarked?: boolean;
  dnaVerified: boolean;
  plagiarismRisk?: 'low' | 'medium' | 'high';
  engagementTime: number;
  timestamp: string;
}

export interface TimetableEntry {
  id: number;
  schoolCode: string;
  class: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  subjectId: number;
  subjectName?: string;
  startTime: string;
  endTime: string;
  teacherId?: string;
  teacherName?: string;
}

export interface Message {
  id: number;
  senderId: string;
  senderName?: string;
  receiverId: string;
  content: string;
  type: 'broadcast' | 'direct' | 'suggestion' | 'welcome';
  isAnonymous?: boolean;
  isViewOnce?: boolean;
  isViewed?: boolean;
  timestamp: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  currentSchool?: School;
}

export interface LearningCurve {
  userId: string;
  averageEngagementTime: number;
  submissionCount: number;
  averageScore: number;
  learningPace: 'slow' | 'moderate' | 'fast';
  strengths: string;
  weaknesses: string;
  lastAnalysis: string;
}

export interface ExamPaper {
  id: number;
  creatorId: string;
  creatorRole: Role;
  creatorName: string;
  centreNumber?: string;
  schoolCode?: string;
  schoolName: string;
  schoolLocation?: string;
  poBox?: string;
  phoneContact?: string;
  motto?: string;
  examTitle: string;
  examType: string;
  difficultyLevel?: string;
  customInstructions?: string;
  targetStudentWeaknesses?: boolean;
  studentWeaknessesSummary?: string;
  subjectId?: number;
  subjectName: string;
  subjectCode?: string;
  class: string;
  term: string;
  year: number;
  duration: string;
  totalMarks: number;
  topicCoverage: string;
  rulesAndRegulations?: string;
  content: string;
  markingGuide?: string;
  createdAt: string;
}

export interface GenerateExamContext {
  schoolName: string;
  schoolLocation: string;
  poBox?: string;
  phoneContact?: string;
  motto?: string;
  centreNumber?: string;
  examTitle: string;
  examType: string;
  difficultyLevel?: string;
  customInstructions?: string;
  targetStudentWeaknesses?: boolean;
  studentWeaknessesSummary?: string;
  subject: string;
  subjectCode?: string;
  class: string;
  term: string;
  year?: number;
  duration: string;
  totalMarks?: number;
  topicCoverage: string;
  rulesAndRegulations?: string;
  includeMarkingGuide?: boolean;
}
