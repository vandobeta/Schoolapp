import express from "express";
import compression from "compression";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import multer from "multer";
import { gemini } from "./src/services/gemini";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "uganda-smart-school-secret-2026";

// Initialize Database
const db = new Database("school.db");
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("temp_store = MEMORY");
db.pragma("cache_size = -2000"); // 2MB cache
db.pragma("foreign_keys = ON");

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL, -- Centre Number
    name TEXT NOT NULL,
    location TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_schools_code ON schools(code);

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT UNIQUE,
    institutionalId TEXT UNIQUE, -- e.g., U3206-S023
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password TEXT, -- For web login
    passcode TEXT, -- 6-digit for quick access
    role TEXT NOT NULL,
    schoolCode TEXT,
    unebId TEXT,
    class TEXT,
    status TEXT DEFAULT 'pending',
    welcomeNote TEXT,
    dnaEnrolled BOOLEAN DEFAULT 0,
    phoneNumber TEXT,
    certificateUrl TEXT,
    idCardFrontUrl TEXT,
    idCardBackUrl TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_users_schoolCode ON users(schoolCode);
`);

// Migration: Add columns if they don't exist
const columns = db.prepare("PRAGMA table_info(users)").all() as any[];
const columnNames = columns.map(c => c.name);

if (!columnNames.includes('uid')) {
  db.exec("ALTER TABLE users ADD COLUMN uid TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_uid ON users(uid)");
}
if (!columnNames.includes('institutionalId')) {
  db.exec("ALTER TABLE users ADD COLUMN institutionalId TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_institutionalId ON users(institutionalId)");
}
if (!columnNames.includes('status')) {
  db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'pending'");
}
if (!columnNames.includes('welcomeNote')) {
  db.exec("ALTER TABLE users ADD COLUMN welcomeNote TEXT");
}
if (!columnNames.includes('dnaEnrolled')) {
  db.exec("ALTER TABLE users ADD COLUMN dnaEnrolled BOOLEAN DEFAULT 0");
}
if (!columnNames.includes('phoneNumber')) {
  db.exec("ALTER TABLE users ADD COLUMN phoneNumber TEXT");
}
if (!columnNames.includes('certificateUrl')) {
  db.exec("ALTER TABLE users ADD COLUMN certificateUrl TEXT");
}
if (!columnNames.includes('idCardFrontUrl')) {
  db.exec("ALTER TABLE users ADD COLUMN idCardFrontUrl TEXT");
}
if (!columnNames.includes('idCardBackUrl')) {
  db.exec("ALTER TABLE users ADD COLUMN idCardBackUrl TEXT");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS teacher_affiliations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacherId TEXT NOT NULL,
    schoolId INTEGER NOT NULL,
    FOREIGN KEY (teacherId) REFERENCES users(uid),
    FOREIGN KEY (schoolId) REFERENCES schools(id)
  );
  CREATE INDEX IF NOT EXISTS idx_teacher_aff_teacherId ON teacher_affiliations(teacherId);
  CREATE INDEX IF NOT EXISTS idx_teacher_aff_schoolId ON teacher_affiliations(schoolId);

  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT NOT NULL,
    subjectId INTEGER NOT NULL,
    teacherId TEXT NOT NULL,
    schoolId INTEGER NOT NULL,
    class TEXT NOT NULL,
    FOREIGN KEY (studentId) REFERENCES users(uid),
    FOREIGN KEY (subjectId) REFERENCES subjects(id),
    FOREIGN KEY (teacherId) REFERENCES users(uid),
    FOREIGN KEY (schoolId) REFERENCES schools(id)
  );
  CREATE INDEX IF NOT EXISTS idx_enrollments_studentId ON enrollments(studentId);
  CREATE INDEX IF NOT EXISTS idx_enrollments_schoolId ON enrollments(schoolId);
  CREATE INDEX IF NOT EXISTS idx_enrollments_subjectId ON enrollments(subjectId);

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subjectId INTEGER NOT NULL,
    class TEXT NOT NULL,
    description TEXT,
    areaK TEXT NOT NULL,
    deadline DATETIME,
    FOREIGN KEY (subjectId) REFERENCES subjects(id)
  );
  CREATE INDEX IF NOT EXISTS idx_activities_subjectId ON activities(subjectId);
  CREATE INDEX IF NOT EXISTS idx_activities_class ON activities(class);

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT NOT NULL,
    aoiId INTEGER NOT NULL,
    content TEXT NOT NULL,
    grade TEXT,
    score INTEGER,
    feedback TEXT,
    isCorrected BOOLEAN DEFAULT 0,
    isMarked BOOLEAN DEFAULT 0,
    dnaVerified BOOLEAN DEFAULT 0,
    engagementTime INTEGER DEFAULT 0, -- in seconds
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (studentId) REFERENCES users(uid),
    FOREIGN KEY (aoiId) REFERENCES activities(id)
  );
  CREATE INDEX IF NOT EXISTS idx_submissions_studentId ON submissions(studentId);
  CREATE INDEX IF NOT EXISTS idx_submissions_aoiId ON submissions(aoiId);

  CREATE TABLE IF NOT EXISTS timetable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schoolCode TEXT NOT NULL,
    class TEXT NOT NULL,
    day TEXT NOT NULL, -- Monday, Tuesday, etc.
    subjectId INTEGER NOT NULL,
    startTime TEXT NOT NULL, -- HH:MM
    endTime TEXT NOT NULL, -- HH:MM
    teacherId TEXT,
    FOREIGN KEY (subjectId) REFERENCES subjects(id),
    FOREIGN KEY (teacherId) REFERENCES users(uid)
  );
  CREATE INDEX IF NOT EXISTS idx_timetable_lookup ON timetable(schoolCode, class);

  CREATE TABLE IF NOT EXISTS dna_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    vectorData TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(uid)
  );
  CREATE INDEX IF NOT EXISTS idx_dna_samples_userId ON dna_samples(userId);

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senderId TEXT NOT NULL,
    receiverId TEXT, -- 'all' or specific uid
    content TEXT NOT NULL,
    type TEXT NOT NULL, -- 'broadcast', 'direct', 'suggestion', 'welcome'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (senderId) REFERENCES users(uid)
  );
  CREATE INDEX IF NOT EXISTS idx_messages_receiverId ON messages(receiverId);

  CREATE TABLE IF NOT EXISTS forum_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    areaK TEXT NOT NULL,
    senderId TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text', -- 'text', 'video', 'audio'
    mediaUrl TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (senderId) REFERENCES users(uid)
  );
  CREATE INDEX IF NOT EXISTS idx_forum_posts_areaK ON forum_posts(areaK);

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    publisherId TEXT NOT NULL,
    title TEXT NOT NULL,
    subjectId INTEGER NOT NULL,
    class TEXT NOT NULL,
    price INTEGER NOT NULL, -- in UGX
    description TEXT,
    coverUrl TEXT,
    fileUrl TEXT,
    verified BOOLEAN DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (publisherId) REFERENCES users(uid),
    FOREIGN KEY (subjectId) REFERENCES subjects(id)
  );
  CREATE INDEX IF NOT EXISTS idx_books_subjectId ON books(subjectId);
  CREATE INDEX IF NOT EXISTS idx_books_class ON books(class);

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT NOT NULL,
    bookId INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (studentId) REFERENCES users(uid),
    FOREIGN KEY (bookId) REFERENCES books(id)
  );
  CREATE INDEX IF NOT EXISTS idx_purchases_studentId ON purchases(studentId);

  CREATE TABLE IF NOT EXISTS competency_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT NOT NULL,
    subjectId INTEGER NOT NULL,
    competencyArea TEXT NOT NULL,
    failureCount INTEGER DEFAULT 0,
    lastUpdate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(studentId, subjectId, competencyArea),
    FOREIGN KEY (studentId) REFERENCES users(uid),
    FOREIGN KEY (subjectId) REFERENCES subjects(id)
  );
  CREATE INDEX IF NOT EXISTS idx_comp_track_studentId ON competency_tracking(studentId);

  CREATE TABLE IF NOT EXISTS learning_curves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT UNIQUE NOT NULL,
    averageEngagementTime INTEGER DEFAULT 0,
    submissionCount INTEGER DEFAULT 0,
    averageScore FLOAT DEFAULT 0,
    learningPace TEXT DEFAULT 'moderate',
    strengths TEXT,
    weaknesses TEXT,
    lastAnalysis DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(uid)
  );
  CREATE INDEX IF NOT EXISTS idx_learning_curves_userId ON learning_curves(userId);

  CREATE TABLE IF NOT EXISTS lesson_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacherId TEXT NOT NULL,
    subjectId INTEGER NOT NULL,
    class TEXT NOT NULL,
    topic TEXT NOT NULL,
    competencyOutcome TEXT NOT NULL,
    duration TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacherId) REFERENCES users(uid),
    FOREIGN KEY (subjectId) REFERENCES subjects(id)
  );
  CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacherId ON lesson_plans(teacherId);

  CREATE TABLE IF NOT EXISTS exam_papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creatorId TEXT NOT NULL,
    creatorRole TEXT NOT NULL,
    creatorName TEXT NOT NULL,
    schoolCode TEXT,
    schoolName TEXT NOT NULL,
    schoolLocation TEXT,
    poBox TEXT,
    phoneContact TEXT,
    motto TEXT,
    centreNumber TEXT,
    examTitle TEXT NOT NULL,
    examType TEXT NOT NULL,
    difficultyLevel TEXT DEFAULT 'Standard NCDC',
    customInstructions TEXT,
    targetStudentWeaknesses INTEGER DEFAULT 0,
    studentWeaknessesSummary TEXT,
    subjectId INTEGER,
    subjectName TEXT NOT NULL,
    subjectCode TEXT,
    class TEXT NOT NULL,
    term TEXT NOT NULL,
    year INTEGER NOT NULL DEFAULT 2026,
    duration TEXT NOT NULL DEFAULT '2 Hours 15 Minutes',
    totalMarks INTEGER DEFAULT 100,
    topicCoverage TEXT NOT NULL,
    rulesAndRegulations TEXT,
    content TEXT NOT NULL,
    markingGuide TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creatorId) REFERENCES users(uid)
  );
  CREATE INDEX IF NOT EXISTS idx_exam_papers_creatorId ON exam_papers(creatorId);
  CREATE INDEX IF NOT EXISTS idx_exam_papers_subject ON exam_papers(subjectName);
  CREATE INDEX IF NOT EXISTS idx_exam_papers_class ON exam_papers(class);
`);

// Migration: Add columns to exam_papers if they don't exist
const examPaperColumns = db.prepare("PRAGMA table_info(exam_papers)").all() as any[];
const examPaperColumnNames = examPaperColumns.map(c => c.name);
if (!examPaperColumnNames.includes('difficultyLevel')) {
  db.exec("ALTER TABLE exam_papers ADD COLUMN difficultyLevel TEXT DEFAULT 'Standard NCDC'");
}
if (!examPaperColumnNames.includes('customInstructions')) {
  db.exec("ALTER TABLE exam_papers ADD COLUMN customInstructions TEXT");
}
if (!examPaperColumnNames.includes('targetStudentWeaknesses')) {
  db.exec("ALTER TABLE exam_papers ADD COLUMN targetStudentWeaknesses INTEGER DEFAULT 0");
}
if (!examPaperColumnNames.includes('studentWeaknessesSummary')) {
  db.exec("ALTER TABLE exam_papers ADD COLUMN studentWeaknessesSummary TEXT");
}

// Migration: Add columns to submissions if they don't exist
const submissionColumns = db.prepare("PRAGMA table_info(submissions)").all() as any[];
const submissionColumnNames = submissionColumns.map(c => c.name);

if (!submissionColumnNames.includes('engagementTime')) {
  db.exec("ALTER TABLE submissions ADD COLUMN engagementTime INTEGER DEFAULT 0");
}
if (!submissionColumnNames.includes('plagiarismRisk')) {
  db.exec("ALTER TABLE submissions ADD COLUMN plagiarismRisk TEXT DEFAULT 'low'");
}
if (!submissionColumnNames.includes('score')) {
  db.exec("ALTER TABLE submissions ADD COLUMN score INTEGER");
}
if (!submissionColumnNames.includes('isCorrected')) {
  db.exec("ALTER TABLE submissions ADD COLUMN isCorrected BOOLEAN DEFAULT 0");
}
if (!submissionColumnNames.includes('isMarked')) {
  db.exec("ALTER TABLE submissions ADD COLUMN isMarked BOOLEAN DEFAULT 0");
}

const activityColumns = db.prepare("PRAGMA table_info(activities)").all() as any[];
const activityColumnNames = activityColumns.map(c => c.name);
if (!activityColumnNames.includes('deadline')) {
  db.exec("ALTER TABLE activities ADD COLUMN deadline DATETIME");
}

// School contact, motto and PO Box migrations
const schoolCols = db.prepare("PRAGMA table_info(schools)").all() as any[];
const schoolColNames = schoolCols.map(c => c.name);
if (!schoolColNames.includes('poBox')) {
  db.exec("ALTER TABLE schools ADD COLUMN poBox TEXT");
}
if (!schoolColNames.includes('motto')) {
  db.exec("ALTER TABLE schools ADD COLUMN motto TEXT");
}
if (!schoolColNames.includes('phone')) {
  db.exec("ALTER TABLE schools ADD COLUMN phone TEXT");
}

// Seed some initial data if empty
const schoolCount = db.prepare("SELECT COUNT(*) as count FROM schools").get() as { count: number };
if (schoolCount.count === 0) {
  const insertSchool = db.prepare("INSERT INTO schools (code, name, location, poBox, motto, phone) VALUES (?, ?, ?, ?, ?, ?)");
  insertSchool.run("U3206", "St. Mary's College Kisubi", "Entebbe, Wakiso District", "P.O. Box 48, Entebbe", "Semper Ultra (Always Further)", "+256 414 321 000");
  insertSchool.run("U0013", "Gayaza High School", "Gayaza, Kampala", "P.O. Box 402, Kampala", "Never Give Up", "+256 414 567 890");
  insertSchool.run("U0004", "King's College Budo", "Wakiso District", "P.O. Box 7121, Kampala", "Gakyali Mabaga", "+256 414 771 234");
} else {
  // Update Kisubi with rich details if null
  try {
    db.prepare("UPDATE schools SET poBox = 'P.O. Box 48, Entebbe', motto = 'Semper Ultra (Always Further)', phone = '+256 414 321 000' WHERE code = 'U3206' AND (poBox IS NULL OR motto IS NULL)").run();
    db.prepare("UPDATE schools SET poBox = 'P.O. Box 402, Kampala', motto = 'Never Give Up', phone = '+256 414 567 890' WHERE code = 'U0013' AND (poBox IS NULL OR motto IS NULL)").run();
  } catch (e) {}
}

const insertSubject = db.prepare("INSERT INTO subjects (name, code) VALUES (?, ?)");
const existingSubjectNames = (db.prepare("SELECT name FROM subjects").all() as any[]).map(s => s.name);
const coreSubjects = [
  { name: "Agriculture", code: "AGRI" },
  { name: "Economics", code: "ECON" },
  { name: "Geography", code: "GEOG" },
  { name: "Physics", code: "PHYS" },
  { name: "Mathematics", code: "MATH" },
  { name: "English Language & Literature", code: "ENG" },
  { name: "Biology", code: "BIO" },
  { name: "Chemistry", code: "CHEM" },
  { name: "History & Political Education", code: "HIST" },
  { name: "Entrepreneurship Education", code: "ENTR" },
  { name: "Information & Communication Technology (ICT)", code: "ICT" },
  { name: "General Science", code: "SCI" }
];

for (const sub of coreSubjects) {
  if (!existingSubjectNames.includes(sub.name)) {
    insertSubject.run(sub.name, sub.code);
  }
}

// Seed Default Developer (Always check)
const adminPassword = "admin";
const hashedAdminPassword = bcrypt.hashSync(adminPassword, 10);
const adminUid = "dev-001";
const adminId = "ADM-0001";
const existingAdmin = db.prepare("SELECT * FROM users WHERE institutionalId = ?").get(adminId);
if (!existingAdmin) {
  db.prepare(`
    INSERT INTO users (uid, institutionalId, name, email, password, role, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(adminUid, adminId, "System Developer", "wepukhulujohnbosco4@gmail.com", hashedAdminPassword, "developer", "approved");
  console.log(`[SEED] Default Developer Created: ID=${adminId}, Password=${adminPassword}`);
} else {
  console.log(`[SEED] Default Developer already exists: ID=${adminId}`);
}

// Seed Default Publisher and Books
const publisherPassword = "admin";
const hashedPublisherPassword = bcrypt.hashSync(publisherPassword, 10);
const publisherUid = "pub-001";
const publisherId = "PUB-0001";
const existingPublisher = db.prepare("SELECT * FROM users WHERE institutionalId = ?").get(publisherId);
if (!existingPublisher) {
  db.prepare(`
    INSERT INTO users (uid, institutionalId, name, email, password, role, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(publisherUid, publisherId, "Fountain & MK Joint Publishers", "publisher@gmail.com", hashedPublisherPassword, "publisher", "approved");
  console.log(`[SEED] Default Publisher Created: ID=${publisherId}`);
}

// Seed Default Examiner
const examinerId = "EXM-0001";
const existingExaminer = db.prepare("SELECT * FROM users WHERE institutionalId = ?").get(examinerId);
if (!existingExaminer) {
  const examinerPassword = bcrypt.hashSync("admin", 10);
  db.prepare(`
    INSERT INTO users (uid, institutionalId, name, email, password, role, schoolCode, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run("exm-001", examinerId, "Senior Examiner Patrick Okello", "examiner@ncdc.go.ug", examinerPassword, "examiner", "U3206", "approved");
  console.log(`[SEED] Default Examiner Created: ID=${examinerId}, Password=admin`);
}

// Seed Default Teacher
const teacherId = "TCH-0001";
const existingTeacher = db.prepare("SELECT * FROM users WHERE institutionalId = ?").get(teacherId);
if (!existingTeacher) {
  const teacherPassword = bcrypt.hashSync("admin", 10);
  db.prepare(`
    INSERT INTO users (uid, institutionalId, name, email, password, role, schoolCode, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run("tch-001", teacherId, "Tr. Grace Nabirye", "nabirye@kisubi.sc.ug", teacherPassword, "teacher", "U3206", "approved");
  console.log(`[SEED] Default Teacher Created: ID=${teacherId}, Password=admin`);
}

const bookCount = db.prepare("SELECT COUNT(*) as count FROM books").get() as { count: number };
if (bookCount.count === 0) {
  const insertBook = db.prepare(`
    INSERT INTO books (publisherId, title, subjectId, class, price, description, coverUrl, fileUrl, verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertBook.run(publisherUid, "Lower Secondary Agriculture Learner's Book 1", 1, "S.1", 22000, "Comprehensive textbook for S.1 students studying Agriculture under the new Ugandan NCDC CBC Curriculum.", "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=200", "https://example.com/books/agriculture-s1.pdf", 1);
  insertBook.run(publisherUid, "Lower Secondary Economics Learner's Book 1", 2, "S.1", 25000, "Thorough handbook covering fundamental economic practices, market mechanisms, and local Ugandan trade structures.", "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=200", "https://example.com/books/economics-s1.pdf", 1);
  insertBook.run(publisherUid, "Lower Secondary Geography Learner's Book 1", 3, "S.1", 24000, "In-depth study of physical and human geography, detailing the environments and communities of East Africa.", "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=200", "https://example.com/books/geography-s1.pdf", 1);
  insertBook.run(publisherUid, "Lower Secondary Physics Learner's Book 1", 4, "S.1", 28000, "Clear explanations of physical phenomena, energy, force, and experimental procedures with local materials.", "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=200", "https://example.com/books/physics-s1.pdf", 1);
  console.log(`[SEED] Marketplace Books seeded.`);
}

const allUsers = db.prepare("SELECT institutionalId, role FROM users").all() as any[];
console.log(`[DEBUG] Current Users in DB: ${JSON.stringify(allUsers)}`);

// Migration: Add columns to forum_posts if they don't exist
const forumPostColumns = db.prepare("PRAGMA table_info(forum_posts)").all() as any[];
const forumPostColumnNames = forumPostColumns.map(c => c.name);

if (!forumPostColumnNames.includes('type')) {
  db.exec("ALTER TABLE forum_posts ADD COLUMN type TEXT DEFAULT 'text'");
}
if (!forumPostColumnNames.includes('mediaUrl')) {
  db.exec("ALTER TABLE forum_posts ADD COLUMN mediaUrl TEXT");
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Ensure uploads directory exists
import fs from 'fs';
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(compression());
  app.use(cors());
  app.use(express.json({ limit: '10mb' })); // Scale for larger handwriting OCR payloads
  app.use('/uploads', express.static('uploads', { maxAge: '30d' }));

  // --- Health Check Route for Low-Connectivity Polling ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), db: "connected" });
  });

  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication token missing. Please log in." });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ error: "Session invalid or expired. Please log in again." });
      }
      req.user = user;
      next();
    });
  };

  const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required." });
      }
      if (req.user.role === 'developer' || allowedRoles.includes(req.user.role)) {
        return next();
      }
      return res.status(403).json({
        error: `Access Denied: Role '${req.user.role}' is not authorized to access this resource. Allowed roles: ${allowedRoles.join(', ')}`
      });
    };
  };

  // --- Upload Route ---
  app.post("/api/upload", authenticateToken, upload.single('file'), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  // --- Auth Routes ---
  app.post("/api/auth/resolve", (req, res) => {
    let { institutionalId } = req.body;
    if (institutionalId) institutionalId = institutionalId.trim();
    const user = db.prepare("SELECT uid, name, role, status, schoolCode, institutionalId FROM users WHERE LOWER(institutionalId) = LOWER(?)").get(institutionalId) as any;
    if (user) {
      if (user.role === 'student') {
        const school = db.prepare("SELECT name FROM schools WHERE code = ?").get(user.schoolCode) as any;
        user.schoolName = school ? school.name : "N/A";
        const dos = db.prepare("SELECT name FROM users WHERE schoolCode = ? AND role = 'dos' LIMIT 1").get(user.schoolCode) as any;
        user.dosName = dos ? dos.name : "the School Board";
      }
      res.json({ exists: true, user });
    } else {
      res.json({ exists: false });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    let { 
      name, email, password, passcode, role, schoolCode, unebId, class: studentClass,
      phoneNumber, certificateUrl, idCardFrontUrl, idCardBackUrl
    } = req.body;
    
    // Trim inputs
    if (schoolCode) schoolCode = schoolCode.trim();
    if (unebId) unebId = unebId.trim();
    if (email) email = email.trim();

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const uid = Math.random().toString(36).substring(2, 15);
    
    // Construct Institutional ID
    let institutionalId = "";
    if (role === 'student') {
      // Normalize unebId: if user entered S023, take 023 to avoid double S prefixes (U3206-SS023)
      const studentNum = unebId.toString().toUpperCase().startsWith('S') ? unebId.toString().substring(1) : unebId;
      institutionalId = `${schoolCode.toUpperCase()}-S${studentNum}`;
    } else if (role === 'teacher') {
      institutionalId = `T-${schoolCode}-${Math.floor(1000 + Math.random() * 9000)}`;
    } else if (role === 'examiner') {
      institutionalId = `EXM-${Math.floor(10000 + Math.random() * 89999)}`;
    } else if (role === 'publisher') {
      institutionalId = `PUB-${Math.floor(10000 + Math.random() * 89999)}`;
    } else {
      institutionalId = `ADM-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO users (
          uid, institutionalId, name, email, password, passcode, role, schoolCode, unebId, class,
          phoneNumber, certificateUrl, idCardFrontUrl, idCardBackUrl
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        uid, institutionalId, name, email, hashedPassword, passcode, role, schoolCode, unebId, studentClass,
        phoneNumber, certificateUrl, idCardFrontUrl, idCardBackUrl
      );
      res.status(201).json({ message: "User registered. Pending approval.", institutionalId });
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Registration failed. ID or Email might be taken." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    let { institutionalId, password, passcode } = req.body;
    if (institutionalId) institutionalId = institutionalId.trim();
    console.log(`[AUTH] Login attempt for ID: ${institutionalId}`);
    
    const user = db.prepare("SELECT * FROM users WHERE LOWER(institutionalId) = LOWER(?)").get(institutionalId) as any;

    if (!user) {
      console.log(`[AUTH] User NOT found for ID: ${institutionalId}`);
      return res.status(401).json({ error: "User not found." });
    }

    console.log(`[AUTH] User found: ${user.name} (Role: ${user.role})`);

    let isValid = false;
    if (password && user.password) {
      isValid = await bcrypt.compare(password, user.password);
    } else if (passcode && user.passcode) {
      isValid = passcode === user.passcode;
    }

    if (isValid) {
      if (user.status !== 'approved' && user.role !== 'hm' && user.role !== 'dos') {
        return res.status(403).json({ error: "Account pending approval from DOS." });
      }
      const token = jwt.sign({ 
        uid: user.uid, 
        role: user.role, 
        name: user.name,
        schoolCode: user.schoolCode,
        class: user.class
      }, JWT_SECRET);

      const school = db.prepare("SELECT name FROM schools WHERE code = ?").get(user.schoolCode) as any;
      const dos = db.prepare("SELECT name FROM users WHERE schoolCode = ? AND (role = 'dos' OR role = 'hm') LIMIT 1").get(user.schoolCode) as any;

      res.json({ token, user: { 
        uid: user.uid, 
        name: user.name, 
        role: user.role, 
        status: user.status, 
        welcomeNote: user.welcomeNote,
        dnaEnrolled: !!user.dnaEnrolled,
        schoolCode: user.schoolCode,
        class: user.class,
        institutionalId: user.institutionalId,
        schoolName: school ? school.name : "N/A",
        dosName: dos ? dos.name : "the School Management"
      } });
    } else {
      res.status(401).json({ error: "Invalid credentials." });
    }
  });

  // --- User Routes ---
  app.get("/api/users/pending", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'dos' && req.user.role !== 'hm' && req.user.role !== 'developer') {
      console.log(`[AUTH] Unauthorized access to pending users by role: ${req.user.role}`);
      return res.sendStatus(403);
    }
    const users = db.prepare("SELECT * FROM users WHERE status = 'pending'").all();
    res.json(users);
  });

  app.post("/api/users/approve", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'dos' && req.user.role !== 'hm' && req.user.role !== 'developer') return res.sendStatus(403);
    const { uid, welcomeNote } = req.body;
    
    const user = db.prepare("SELECT * FROM users WHERE uid = ?").get(uid) as any;
    if (!user) return res.status(404).json({ error: "User not found" });

    db.prepare("UPDATE users SET status = 'approved', welcomeNote = ? WHERE uid = ?").run(welcomeNote, uid);
    
    // Mock Notifications
    console.log(`[NOTIFICATION] Sending approval email to ${user.email}...`);
    if (user.phoneNumber) {
      console.log(`[NOTIFICATION] Sending WhatsApp message to ${user.phoneNumber}: "Your account has been approved! ${welcomeNote}"`);
      console.log(`[NOTIFICATION] Sending SMS to ${user.phoneNumber}: "The Masterpiece: Your account is approved. ID: ${user.institutionalId}"`);
    }

    res.json({ message: "User approved." });
  });

  app.post("/api/users/promote", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'developer') return res.sendStatus(403);
    const { uid, role, schoolCode } = req.body;
    
    const user = db.prepare("SELECT * FROM users WHERE uid = ?").get(uid) as any;
    if (!user) return res.status(404).json({ error: "User not found" });

    db.prepare("UPDATE users SET role = ?, schoolCode = ?, status = 'approved' WHERE uid = ?").run(role, schoolCode, uid);
    res.json({ message: `User promoted to ${role} for school ${schoolCode}.` });
  });

  app.get("/api/users/all", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'developer') return res.sendStatus(403);
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  app.post("/api/admin/users/create", authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'developer') return res.sendStatus(403);
    const { 
      name, email, password, passcode, role, schoolCode, unebId, class: studentClass,
      phoneNumber
    } = req.body;
    
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const uid = Math.random().toString(36).substring(2, 15);
    
    // Construct Institutional ID
    let institutionalId = "";
    if (role === 'student') {
      // Normalize unebId
      const cleanId = (unebId || "").toString().toUpperCase().startsWith('S') ? unebId.toString().substring(1) : unebId;
      institutionalId = `${schoolCode.toUpperCase()}-S${cleanId || Math.floor(1000 + Math.random() * 9000)}`;
    } else if (role === 'teacher') {
      institutionalId = `T-${schoolCode}-${Math.floor(1000 + Math.random() * 9000)}`;
    } else if (role === 'examiner') {
      institutionalId = `EXM-${Math.floor(10000 + Math.random() * 89999)}`;
    } else if (role === 'publisher') {
      institutionalId = `PUB-${Math.floor(10000 + Math.random() * 89999)}`;
    } else if (role === 'dos') {
      institutionalId = `DOS-${schoolCode}-${Math.floor(100 + Math.random() * 899)}`;
    } else if (role === 'hm') {
      institutionalId = `HM-${schoolCode}-${Math.floor(100 + Math.random() * 899)}`;
    } else {
      institutionalId = `ADM-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO users (
          uid, institutionalId, name, email, password, passcode, role, schoolCode, unebId, class,
          phoneNumber, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')
      `);
      const result = stmt.run(
        uid, institutionalId, name, email, hashedPassword, passcode, role, schoolCode, unebId, studentClass,
        phoneNumber
      );
      console.log(`Admin created user: ${name} (${institutionalId}), Result:`, result);
      res.status(201).json({ message: "User created successfully.", institutionalId });
    } catch (error) {
      console.error("Admin user creation failed:", error);
      res.status(400).json({ error: "Creation failed. ID or Email might be taken." });
    }
  });

  app.post("/api/admin/seed", authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'developer') return res.sendStatus(403);
    
    try {
      // 1. Create Demo School
      const schoolCode = "DEMO01";
      const schoolName = "Masterpiece Demo Academy";
      try {
        db.prepare("INSERT INTO schools (code, name, location) VALUES (?, ?, ?)").run(schoolCode, schoolName, "Kampala, Central");
      } catch (e) {
        // School might already exist
      }

      // 2. Create Demo Subjects
      const subjects = [
        { name: "Mathematics", code: "MTH" },
        { name: "English Language", code: "ENG" },
        { name: "Physics", code: "PHY" },
        { name: "Biology", code: "BIO" },
        { name: "Chemistry", code: "CHE" },
        { name: "History", code: "HIS" },
        { name: "Geography", code: "GEO" },
        { name: "Entrepreneurship", code: "ENT" }
      ];

      for (const sub of subjects) {
        try {
          db.prepare("INSERT INTO subjects (name, code) VALUES (?, ?)").run(sub.name, sub.code);
        } catch (e) {}
      }

      // 3. Create Demo Teacher
      const teacherUid = "demo-teacher-uid";
      const teacherEmail = "teacher@demo.com";
      const hashedTeacherPass = await bcrypt.hash("password123", 10);
      try {
        db.prepare(`
          INSERT INTO users (uid, institutionalId, name, email, password, role, schoolCode, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(teacherUid, "T-DEMO01-1001", "Mr. Demo Teacher", teacherEmail, hashedTeacherPass, "teacher", schoolCode, "approved");
      } catch (e) {}

      // 4. Create Demo Students
      for (let i = 1; i <= 5; i++) {
        const studentUid = `demo-student-${i}`;
        const studentEmail = `student${i}@demo.com`;
        const studentName = `Demo Student ${i}`;
        const studentId = `${schoolCode}-S${1000 + i}`;
        const hashedPass = await bcrypt.hash("password123", 10);
        
        try {
          db.prepare(`
            INSERT INTO users (uid, institutionalId, name, email, password, role, schoolCode, class, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(studentUid, studentId, studentName, studentEmail, hashedPass, "student", schoolCode, "S.1", "approved");
          
          // Enroll in some subjects
          const subs = db.prepare("SELECT code FROM subjects LIMIT 3").all() as any[];
          for (const sub of subs) {
            db.prepare(`
              INSERT INTO enrollments (studentId, subjectCode, teacherId, schoolCode)
              VALUES (?, ?, ?, ?)
            `).run(studentUid, sub.code, teacherUid, schoolCode);
          }
        } catch (e) {}
      }

      // 5. Create Demo Activities
      const activityTypes = ["Activity of Integration", "Project", "Practical"];
      const subs = db.prepare("SELECT id, code, name FROM subjects").all() as any[];
      
      for (const sub of subs) {
        for (let i = 1; i <= 2; i++) {
          const title = `${sub.code} ${activityTypes[i % 3]} ${i}`;
          const description = `This is a demo activity for ${sub.name}. Please follow the instructions in the NCDC handbook.`;
          try {
            db.prepare(`
              INSERT INTO activities (title, description, subjectId, class, areaK)
              VALUES (?, ?, ?, ?, ?)
            `).run(title, description, sub.id, "S.1", "General Competency");
          } catch (e) {}
        }
      }

      // 6. Create Developer User
      const devEmail = "wepukhulujohnbosco4@gmail.com";
      const devInstitutionalId = "DEV-001";
      const devPassword = await bcrypt.hash("password123", 10);
      try {
        db.prepare(`
          INSERT INTO users (uid, institutionalId, name, email, password, role, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run("dev-uid-001", devInstitutionalId, "Master Developer", devEmail, devPassword, "developer", "approved");
      } catch (e) {
        // If already exists, update role to developer
        db.prepare("UPDATE users SET role = 'developer', status = 'approved' WHERE email = ?").run(devEmail);
      }

      res.json({ message: "Database seeded successfully with Demo School, Students, Subjects, Activities, and Developer account (DEV-001)." });
    } catch (error) {
      console.error("Seeding failed:", error);
      res.status(500).json({ error: "Seeding failed." });
    }
  });

  app.post("/api/admin/users/update-status", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'developer') return res.sendStatus(403);
    const { uid, status } = req.body;
    db.prepare("UPDATE users SET status = ? WHERE uid = ?").run(status, uid);
    res.json({ message: `User status updated to ${status}.` });
  });

  app.delete("/api/admin/users/:uid", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'developer') return res.sendStatus(403);
    const { uid } = req.params;
    db.prepare("DELETE FROM users WHERE uid = ?").run(uid);
    res.json({ message: "User deleted successfully." });
  });

  app.post("/api/admin/schools/create", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'developer') return res.sendStatus(403);
    const { code, name, location } = req.body;
    try {
      db.prepare("INSERT INTO schools (code, name, location) VALUES (?, ?, ?)").run(code, name, location);
      res.status(201).json({ message: "School created successfully." });
    } catch (error) {
      res.status(400).json({ error: "School code already exists." });
    }
  });

  app.delete("/api/admin/schools/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'developer') return res.sendStatus(403);
    const { id } = req.params;
    db.prepare("DELETE FROM schools WHERE id = ?").run(id);
    res.json({ message: "School deleted successfully." });
  });

  app.get("/api/admin/stats", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'developer') return res.sendStatus(403);
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const schoolCount = db.prepare("SELECT COUNT(*) as count FROM schools").get() as any;
    const submissionCount = db.prepare("SELECT COUNT(*) as count FROM submissions").get() as any;
    res.json({
      users: userCount.count,
      schools: schoolCount.count,
      submissions: submissionCount.count
    });
  });

  app.get("/api/admin/users/export", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'developer') return res.sendStatus(403);
    const users = db.prepare("SELECT institutionalId, name, email, role, schoolCode, status, class, phoneNumber, createdAt FROM users").all();
    res.json(users);
  });

  app.get("/api/admin/schools/export", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'developer') return res.sendStatus(403);
    const schools = db.prepare("SELECT code, name, location FROM schools").all();
    res.json(schools);
  });

  app.get("/api/admin/schools/:code/users", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'developer') return res.sendStatus(403);
    const { code } = req.params;
    const users = db.prepare("SELECT uid, name, email, role, status, institutionalId FROM users WHERE schoolCode = ?").all(code);
    res.json(users);
  });

  app.post("/api/admin/teachers/affiliate", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'developer') return res.sendStatus(403);
    const { teacherUid, schoolId } = req.body;
    try {
      db.prepare("INSERT INTO teacher_affiliations (teacherId, schoolId) VALUES (?, ?)").run(teacherUid, schoolId);
      res.json({ message: "Teacher affiliated with school successfully." });
    } catch (error) {
      res.status(400).json({ error: "Affiliation failed." });
    }
  });

  app.post("/api/users/dna-enroll", authenticateToken, (req: any, res) => {
    const { vectorData } = req.body;
    db.prepare("INSERT INTO dna_samples (userId, vectorData) VALUES (?, ?)").run(req.user.uid, vectorData);
    db.prepare("UPDATE users SET dnaEnrolled = 1 WHERE uid = ?").run(req.user.uid);
    res.json({ message: "DNA Enrolled successfully." });
  });

  // --- School Routes ---
  app.get("/api/schools", authenticateToken, (req, res) => {
    const schools = db.prepare("SELECT * FROM schools").all();
    res.json(schools);
  });

  app.get("/api/teacher/schools", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'teacher') return res.sendStatus(403);
    const schools = db.prepare(`
      SELECT s.* FROM schools s
      JOIN teacher_affiliations ta ON s.id = ta.schoolId
      WHERE ta.teacherId = ?
    `).all(req.user.uid);
    res.json(schools);
  });

  // --- Enrollment Routes ---
  app.get("/api/teacher/students", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'dos') return res.sendStatus(403);
    const students = db.prepare("SELECT uid, name, institutionalId, class FROM users WHERE role = 'student' AND schoolCode = ?").all(req.user.schoolCode);
    res.json(students);
  });

  app.get("/api/subjects", authenticateToken, (req, res) => {
    const subjects = db.prepare("SELECT * FROM subjects").all();
    res.json(subjects);
  });

  app.post("/api/teacher/enroll", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'teacher') return res.sendStatus(403);
    const { studentUid, subjectId, studentClass } = req.body;
    
    // Get schoolId from schoolCode
    const school = db.prepare("SELECT id FROM schools WHERE code = ?").get(req.user.schoolCode) as any;
    if (!school) return res.status(404).json({ error: "School not found" });

    try {
      const stmt = db.prepare(`
        INSERT INTO enrollments (studentId, subjectId, teacherId, schoolId, class)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(studentUid, subjectId, req.user.uid, school.id, studentClass);
      
      // Update student's primary class in users table if it's currently null or different
      db.prepare("UPDATE users SET class = ? WHERE uid = ?").run(studentClass, studentUid);

      res.status(201).json({ message: "Student enrolled successfully." });
    } catch (error) {
      res.status(400).json({ error: "Enrollment failed. Student might already be enrolled in this subject." });
    }
  });

  app.get("/api/teacher/enrollments", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'teacher') return res.sendStatus(403);
    const enrollments = db.prepare(`
      SELECT e.*, u.name as studentName, u.institutionalId as studentId, s.name as subjectName
      FROM enrollments e
      JOIN users u ON e.studentId = u.uid
      JOIN subjects s ON e.subjectId = s.id
      WHERE e.teacherId = ?
    `).all(req.user.uid);
    res.json(enrollments);
  });

  app.delete("/api/teacher/enrollments/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'teacher') return res.sendStatus(403);
    const { id } = req.params;
    db.prepare("DELETE FROM enrollments WHERE id = ? AND teacherId = ?").run(id, req.user.uid);
    res.json({ message: "Enrollment removed." });
  });

  app.get("/api/student/subjects", authenticateToken, (req: any, res) => {
    const subjects = db.prepare(`
      SELECT s.*, u.name as teacherName FROM subjects s
      JOIN enrollments e ON s.id = e.subjectId
      JOIN users u ON e.teacherId = u.uid
      WHERE e.studentId = ?
    `).all(req.user.uid);
    res.json(subjects);
  });

  // --- UNEB Export Route ---
  app.get("/api/admin/uneb-export", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'dos' && req.user.role !== 'hm') return res.sendStatus(403);
    
    // This is a simplified version of the join query
    const exportData = db.prepare(`
      SELECT 
        u.institutionalId, 
        u.name as studentName, 
        u.class,
        sub.name as subjectName,
        s.grade,
        s.feedback
      FROM users u
      JOIN enrollments e ON u.uid = e.studentId
      JOIN subjects sub ON e.subjectId = sub.id
      LEFT JOIN submissions s ON u.uid = s.studentId AND s.aoiId IN (SELECT id FROM activities WHERE subjectId = sub.id)
      WHERE u.role = 'student' AND u.schoolCode = ?
      ORDER BY u.institutionalId, sub.name
    `).all(req.user.schoolCode);

    res.json(exportData);
  });

  // --- Activity Routes ---
  app.get("/api/activities", authenticateToken, (req: any, res) => {
    try {
      let activities;
      if (req.user.role === 'student') {
        // Only show activities for subjects the student is enrolled in
        activities = db.prepare(`
          SELECT a.*, s.name as subjectName FROM activities a
          JOIN subjects s ON a.subjectId = s.id
          JOIN enrollments e ON a.subjectId = e.subjectId
          WHERE e.studentId = ? AND a.class = ?
        `).all(req.user.uid, req.user.class);
      } else {
        activities = db.prepare(`
          SELECT a.*, s.name as subjectName FROM activities a
          JOIN subjects s ON a.subjectId = s.id
        `).all();
      }
      res.json(activities);
    } catch (error: any) {
      console.error("Fetch activities error:", error);
      res.status(500).json({ error: "Failed to load curriculum activities." });
    }
  });

  app.post("/api/activities", authenticateToken, authorizeRoles('teacher', 'dos', 'developer'), (req: any, res) => {
    const { title, description, subjectId, class: activityClass, areaK, deadline } = req.body;
    if (!title || !subjectId || !activityClass) {
      return res.status(400).json({ error: "Title, subject, and class are required." });
    }
    
    try {
      const stmt = db.prepare(`
        INSERT INTO activities (title, description, subjectId, class, areaK, deadline)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(title, description, subjectId, activityClass, areaK, deadline || null);
      res.status(201).json({ message: "Activity created successfully.", id: info.lastInsertRowid });
    } catch (error: any) {
      console.error("Create activity error:", error);
      res.status(400).json({ error: error.message || "Failed to create activity." });
    }
  });

  app.delete("/api/activities/:id", authenticateToken, authorizeRoles('teacher', 'dos', 'developer'), (req: any, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM activities WHERE id = ?").run(id);
      res.json({ message: "Activity deleted successfully." });
    } catch (error: any) {
      console.error("Delete activity error:", error);
      res.status(500).json({ error: "Failed to delete activity." });
    }
  });

  // --- Submission Routes ---
  app.post("/api/submissions", authenticateToken, authorizeRoles('student', 'developer'), (req: any, res) => {
    const { aoiId, content, engagementTime, plagiarismRisk } = req.body;
    if (!aoiId || !content) {
      return res.status(400).json({ error: "Activity ID and submission content are required." });
    }
    try {
      const stmt = db.prepare("INSERT INTO submissions (studentId, aoiId, content, engagementTime, plagiarismRisk) VALUES (?, ?, ?, ?, ?)");
      const info = stmt.run(req.user.uid, aoiId, content, engagementTime || 0, plagiarismRisk || 'low');
      res.status(201).json({ message: "Submission successful.", id: info.lastInsertRowid });
    } catch (error: any) {
      console.error("Create submission error:", error);
      res.status(500).json({ error: "Failed to process submission. Please retry." });
    }
  });

  app.post("/api/submissions/:id/grade", authenticateToken, authorizeRoles('teacher', 'dos', 'examiner', 'developer'), (req: any, res) => {
    const { id } = req.params;
    const { grade, feedback } = req.body;
    if (!grade) {
      return res.status(400).json({ error: "Grade level (L1, L2, L3) is required." });
    }
    
    try {
      db.prepare("UPDATE submissions SET grade = ?, feedback = ? WHERE id = ?").run(grade, feedback || "", id);
      
      // Competency Tracking Logic
      const submission = db.prepare(`
        SELECT s.studentId, a.subjectId, a.areaK 
        FROM submissions s 
        JOIN activities a ON s.aoiId = a.id 
        WHERE s.id = ?
      `).get(id) as any;

      if (submission) {
        const { studentId, subjectId, areaK } = submission;
        
        // Initialize or update tracking
        const existing = db.prepare("SELECT * FROM competency_tracking WHERE studentId = ? AND subjectId = ? AND competencyArea = ?")
          .get(studentId, subjectId, areaK) as any;

        if (!existing) {
          db.prepare("INSERT INTO competency_tracking (studentId, subjectId, competencyArea, failureCount) VALUES (?, ?, ?, ?)")
            .run(studentId, subjectId, areaK, grade === 'L1' ? 1 : 0);
        } else {
          if (grade === 'L1') {
            db.prepare("UPDATE competency_tracking SET failureCount = failureCount + 1, lastUpdate = CURRENT_TIMESTAMP WHERE id = ?")
              .run(existing.id);
          } else if (grade === 'L3') {
            db.prepare("UPDATE competency_tracking SET failureCount = 0, lastUpdate = CURRENT_TIMESTAMP WHERE id = ?")
              .run(existing.id);
          }
        }
      }

      updateLearningCurve(submission.studentId);

      res.json({ message: "Submission graded successfully." });
    } catch (error: any) {
      console.error("Grading failed:", error);
      res.status(500).json({ error: "Grading failed." });
    }
  });

  app.get("/api/submissions", authenticateToken, (req: any, res) => {
    try {
      let submissions;
      if (req.user.role === 'teacher' || req.user.role === 'dos' || req.user.role === 'hm') {
        submissions = db.prepare(`
          SELECT s.*, u.name as studentName, u.schoolCode, a.title as activityTitle 
          FROM submissions s 
          JOIN users u ON s.studentId = u.uid 
          JOIN activities a ON s.aoiId = a.id
          WHERE u.schoolCode = ?
          ORDER BY s.timestamp DESC
        `).all(req.user.schoolCode);
      } else if (req.user.role === 'examiner' || req.user.role === 'developer') {
        submissions = db.prepare(`
          SELECT s.*, u.name as studentName, u.schoolCode, a.title as activityTitle 
          FROM submissions s 
          JOIN users u ON s.studentId = u.uid 
          JOIN activities a ON s.aoiId = a.id
          ORDER BY s.timestamp DESC
        `).all();
      } else {
        submissions = db.prepare(`
          SELECT s.*, a.title as activityTitle, a.subjectId
          FROM submissions s
          JOIN activities a ON s.aoiId = a.id
          WHERE s.studentId = ?
          ORDER BY s.timestamp DESC
        `).all(req.user.uid);
      }
      res.json(submissions);
    } catch (error: any) {
      console.error("Fetch submissions error:", error);
      res.status(500).json({ error: "Failed to fetch submissions." });
    }
  });

  // --- Messaging Routes ---
  app.get("/api/messages", authenticateToken, (req: any, res) => {
    let messages;
    if (req.user.role === 'dos' || req.user.role === 'hm') {
      messages = db.prepare('SELECT * FROM messages ORDER BY timestamp DESC').all();
    } else {
      messages = db.prepare('SELECT * FROM messages WHERE receiverId = ? OR receiverId = \'all\' ORDER BY timestamp DESC').all(req.user.uid);
    }
    res.json(messages);
  });

  app.post("/api/messages", authenticateToken, (req: any, res) => {
    const { recipientId, content, type } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    db.prepare('INSERT INTO messages (senderId, receiverId, content, type) VALUES (?, ?, ?, ?)')
      .run(req.user.uid, recipientId, content, type);
    res.json({ senderId: req.user.uid, receiverId: recipientId, content, type, timestamp: new Date().toISOString() });
  });

  // --- Forum Routes ---
  app.get("/api/forums/:areaK", authenticateToken, (req: any, res) => {
    const { areaK } = req.params;
    const posts = db.prepare(`
      SELECT fp.*, u.name as senderName, u.role as senderRole
      FROM forum_posts fp
      JOIN users u ON fp.senderId = u.uid
      WHERE fp.areaK = ?
      ORDER BY fp.timestamp ASC
    `).all(areaK);
    res.json(posts);
  });

  app.post("/api/forums/:areaK", authenticateToken, (req: any, res) => {
    const { areaK } = req.params;
    const { content, type, mediaUrl } = req.body;
    if (!content && !mediaUrl) return res.status(400).json({ error: "Content or media is required" });
    
    db.prepare('INSERT INTO forum_posts (areaK, senderId, content, type, mediaUrl) VALUES (?, ?, ?, ?, ?)')
      .run(areaK, req.user.uid, content || '', type || 'text', mediaUrl || null);
    
    const newPost = db.prepare(`
      SELECT fp.*, u.name as senderName, u.role as senderRole
      FROM forum_posts fp
      JOIN users u ON fp.senderId = u.uid
      WHERE fp.id = last_insert_rowid()
    `).get();
    
    res.status(201).json(newPost);
  });

  // --- DNA Verification Logic ---
  app.post("/api/submissions/verify-dna", authenticateToken, async (req: any, res) => {
    const { submissionId } = req.body;
    const dnaSample = db.prepare('SELECT * FROM dna_samples WHERE userId = ?').get(req.user.uid);
    if (!dnaSample) {
      return res.status(400).json({ error: 'DNA not enrolled' });
    }
    // Simulate high-confidence match
    db.prepare('UPDATE submissions SET dnaVerified = 1 WHERE id = ?').run(submissionId);
    res.json({ success: true });
  });

  // --- Secure Server-Side AI Proxy ---
  app.post("/api/ai", authenticateToken, async (req: any, res) => {
    const { action, args } = req.body;
    const aiMethod = (gemini as any)[action];
    if (!aiMethod || typeof aiMethod !== "function") {
      return res.status(400).json({ error: `Unknown AI action: ${action}` });
    }
    try {
      const result = await aiMethod(...args);
      res.json({ result });
    } catch (error: any) {
      console.error(`AI Proxy Error for ${action}:`, error);
      res.status(500).json({ error: error.message || "AI service failed" });
    }
  });

  // --- Marketplace Routes ---
  app.get("/api/books", authenticateToken, (req, res) => {
    const { subjectId, class: studentClass } = req.query;
    let query = "SELECT b.*, u.name as publisherName, s.name as subjectName FROM books b JOIN users u ON b.publisherId = u.uid JOIN subjects s ON b.subjectId = s.id";
    const params: any[] = [];
    
    if (subjectId || studentClass) {
      query += " WHERE";
      if (subjectId) {
        query += " b.subjectId = ?";
        params.push(subjectId);
      }
      if (studentClass) {
        if (subjectId) query += " AND";
        query += " b.class = ?";
        params.push(studentClass);
      }
    }
    
    const books = db.prepare(query).all(...params);
    res.json(books);
  });

  app.post("/api/books", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'publisher' && req.user.role !== 'developer') return res.sendStatus(403);
    const { title, subjectId, class: bookClass, price, description, coverUrl, fileUrl } = req.body;
    
    try {
      db.prepare(`
        INSERT INTO books (publisherId, title, subjectId, class, price, description, coverUrl, fileUrl, verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(req.user.uid, title, subjectId, bookClass, price, description, coverUrl, fileUrl, req.user.role === 'developer' ? 1 : 0);
      res.status(201).json({ message: "Book listed successfully." });
    } catch (error) {
      res.status(400).json({ error: "Failed to list book." });
    }
  });

  app.post("/api/books/purchase", authenticateToken, (req: any, res) => {
    const { bookId, amount } = req.body;
    // Simulate MoMo Payment Success
    try {
      db.prepare("INSERT INTO purchases (studentId, bookId, amount) VALUES (?, ?, ?)").run(req.user.uid, bookId, amount);
      res.json({ message: "Purchase successful. Digital key activated." });
    } catch (error) {
      res.status(400).json({ error: "Purchase failed." });
    }
  });

  app.get("/api/student/purchases", authenticateToken, (req: any, res) => {
    const purchases = db.prepare(`
      SELECT p.*, b.title, b.fileUrl FROM purchases p
      JOIN books b ON p.bookId = b.id
      WHERE p.studentId = ?
    `).all(req.user.uid);
    res.json(purchases);
  });

  // --- Competency Tracking Routes ---
  app.get("/api/student/recommendations", authenticateToken, (req: any, res) => {
    const failures = db.prepare(`
      SELECT ct.*, s.name as subjectName FROM competency_tracking ct
      JOIN subjects s ON ct.subjectId = s.id
      WHERE ct.studentId = ? AND ct.failureCount >= 3
    `).all(req.user.uid) as any[];

    const recommendations = failures.map(f => {
      const books = db.prepare(`
        SELECT b.*, u.name as publisherName FROM books b
        JOIN users u ON b.publisherId = u.uid
        WHERE b.subjectId = ? AND b.verified = 1
        LIMIT 2
      `).all(f.subjectId);
      return { ...f, recommendedBooks: books };
    });

    res.json(recommendations);
  });

  // --- Learning Curve Routes ---
  app.get("/api/student/learning-curve", authenticateToken, (req: any, res) => {
    let curve = db.prepare("SELECT * FROM learning_curves WHERE userId = ?").get(req.user.uid) as any;
    
    if (!curve) {
      // Initialize if doesn't exist
      db.prepare("INSERT INTO learning_curves (userId) VALUES (?)").run(req.user.uid);
      curve = db.prepare("SELECT * FROM learning_curves WHERE userId = ?").get(req.user.uid);
    }
    
    res.json(curve);
  });

  // Helper to re-calculate learning curve after grading
  function updateLearningCurve(userId: string) {
    const subs = db.prepare(`
      SELECT grade, engagementTime 
      FROM submissions 
      WHERE studentId = ? AND grade IS NOT NULL
    `).all(userId) as any[];

    if (subs.length === 0) return;

    const totalEngagement = subs.reduce((acc, s) => acc + (s.engagementTime || 0), 0);
    const avgEngagement = totalEngagement / subs.length;
    
    const scoreMap: Record<string, number> = { 'L1': 1, 'L2': 2, 'L3': 3 };
    const totalScore = subs.reduce((acc, s) => acc + (scoreMap[s.grade] || 2), 0);
    const avgScore = totalScore / subs.length;

    // Determine Pace
    let pace = 'moderate';
    if (avgScore >= 2.5 && avgEngagement < 600) pace = 'fast';
    else if (avgScore <= 1.5 || avgEngagement > 1800) pace = 'slow';

    // Strengths/Weaknesses
    const subjectStats = db.prepare(`
      SELECT s.name, AVG(CASE WHEN subinfo.grade = 'L3' THEN 3 WHEN subinfo.grade = 'L2' THEN 2 ELSE 1 END) as avg_s
      FROM subjects s
      JOIN activities a ON s.id = a.subjectId
      JOIN submissions subinfo ON a.id = subinfo.aoiId
      WHERE subinfo.studentId = ? AND subinfo.grade IS NOT NULL
      GROUP BY s.name
    `).all(userId) as any[];

    const strengths = subjectStats.filter(s => s.avg_s >= 2.5).map(s => s.name).join(', ');
    const weaknesses = subjectStats.filter(s => s.avg_s <= 1.5).map(s => s.name).join(', ');

    db.prepare(`
      UPDATE learning_curves 
      SET averageEngagementTime = ?, submissionCount = ?, averageScore = ?, learningPace = ?, strengths = ?, weaknesses = ?, lastAnalysis = CURRENT_TIMESTAMP
      WHERE userId = ?
    `).run(avgEngagement, subs.length, avgScore, pace, strengths, weaknesses, userId);
  }

  // --- Timetable Routes ---
  app.get("/api/timetable", authenticateToken, (req: any, res) => {
    const { schoolCode, class: userClass } = req.user;
    const timetable = db.prepare(`
      SELECT t.*, s.name as subjectName, u.name as teacherName
      FROM timetable t
      JOIN subjects s ON t.subjectId = s.id
      LEFT JOIN users u ON t.teacherId = u.uid
      WHERE t.schoolCode = ? AND t.class = ?
      ORDER BY 
        CASE t.day 
          WHEN 'Monday' THEN 1 
          WHEN 'Tuesday' THEN 2 
          WHEN 'Wednesday' THEN 3 
          WHEN 'Thursday' THEN 4 
          WHEN 'Friday' THEN 5 
          WHEN 'Saturday' THEN 6 
          WHEN 'Sunday' THEN 7 
        END, t.startTime
    `).all(schoolCode, userClass);
    res.json(timetable);
  });

  app.post("/api/admin/timetable", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'dos' && req.user.role !== 'hm' && req.user.role !== 'developer') return res.sendStatus(403);
    const { class: studentClass, day, subjectId, startTime, endTime, teacherId } = req.body;
    const schoolCode = req.user.schoolCode;
    try {
      db.prepare(`
        INSERT INTO timetable (schoolCode, class, day, subjectId, startTime, endTime, teacherId)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(schoolCode, studentClass, day, subjectId, startTime, endTime, teacherId || null);
      res.status(201).json({ message: "Timetable entry added successfully." });
    } catch (error) {
      res.status(400).json({ error: "Failed to add timetable entry." });
    }
  });

  app.delete("/api/admin/timetable/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'dos' && req.user.role !== 'hm' && req.user.role !== 'developer') return res.sendStatus(403);
    db.prepare("DELETE FROM timetable WHERE id = ?").run(req.params.id);
    res.json({ message: "Timetable entry removed." });
  });

  // --- AI Correction Route ---
  app.post("/api/submissions/:id/mark-as-corrected", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    db.prepare("UPDATE submissions SET isCorrected = 1 WHERE id = ? AND studentId = ?").run(id, req.user.uid);
    res.json({ success: true });
  });

  // --- Lesson Plan Routes ---
  app.get("/api/lesson-plans", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'dos' && req.user.role !== 'hm' && req.user.role !== 'developer') {
      return res.sendStatus(403);
    }
    try {
      const plans = db.prepare(`
        SELECT lp.*, s.name as subjectName FROM lesson_plans lp
        JOIN subjects s ON lp.subjectId = s.id
        WHERE lp.teacherId = ?
        ORDER BY lp.timestamp DESC
      `).all(req.user.uid);
      res.json(plans);
    } catch (error) {
      console.error("Get lesson plans error:", error);
      res.status(500).json({ error: "Failed to fetch lesson plans." });
    }
  });

  app.post("/api/lesson-plans", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'dos' && req.user.role !== 'hm' && req.user.role !== 'developer') {
      return res.sendStatus(403);
    }
    const { subjectId, class: planClass, topic, competencyOutcome, duration, content } = req.body;
    try {
      db.prepare(`
        INSERT INTO lesson_plans (teacherId, subjectId, class, topic, competencyOutcome, duration, content)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.user.uid, subjectId, planClass, topic, competencyOutcome, duration, content);
      res.status(201).json({ message: "Lesson plan saved successfully." });
    } catch (error) {
      console.error("Save lesson plan error:", error);
      res.status(500).json({ error: "Failed to save lesson plan." });
    }
  });

  app.delete("/api/lesson-plans/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'dos' && req.user.role !== 'hm' && req.user.role !== 'developer') {
      return res.sendStatus(403);
    }
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM lesson_plans WHERE id = ? AND teacherId = ?").run(id, req.user.uid);
      res.json({ message: "Lesson plan deleted." });
    } catch (error) {
      console.error("Delete lesson plan error:", error);
      res.status(500).json({ error: "Failed to delete lesson plan." });
    }
  });

  app.post("/api/lesson-plans/generate", authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'dos' && req.user.role !== 'hm' && req.user.role !== 'developer') {
      return res.sendStatus(403);
    }
    const { subjectId, class: planClass, topic, competencyOutcome, duration } = req.body;
    const subject = db.prepare("SELECT name FROM subjects WHERE id = ?").get(subjectId) as any;
    if (!subject) {
      return res.status(400).json({ error: "Invalid subject selected." });
    }
    try {
      const content = await gemini.generateLessonPlan({
        subject: subject.name,
        class: planClass,
        topic,
        competencyOutcome,
        duration
      });
      res.json({ content });
    } catch (error: any) {
      console.error("Gemini lesson plan generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate lesson plan." });
    }
  });

  // --- NCDC Exam Paper & Test Template Generator Routes ---
  app.get("/api/exam-papers", authenticateToken, (req: any, res) => {
    if (!['teacher', 'examiner', 'dos', 'hm', 'developer'].includes(req.user.role)) {
      return res.sendStatus(403);
    }
    try {
      let papers;
      if (req.user.role === 'examiner' || req.user.role === 'developer' || req.user.role === 'dos' || req.user.role === 'hm') {
        papers = db.prepare(`
          SELECT ep.*, s.name as dbSubjectName FROM exam_papers ep
          LEFT JOIN subjects s ON ep.subjectId = s.id
          ORDER BY ep.createdAt DESC
        `).all();
      } else {
        papers = db.prepare(`
          SELECT ep.*, s.name as dbSubjectName FROM exam_papers ep
          LEFT JOIN subjects s ON ep.subjectId = s.id
          WHERE ep.creatorId = ? OR ep.schoolCode = ?
          ORDER BY ep.createdAt DESC
        `).all(req.user.uid, req.user.schoolCode || '');
      }
      res.json(papers);
    } catch (error) {
      console.error("Get exam papers error:", error);
      res.status(500).json({ error: "Failed to fetch examination papers." });
    }
  });

  app.get("/api/exam-papers/:id", authenticateToken, (req: any, res) => {
    if (!['teacher', 'examiner', 'dos', 'hm', 'developer'].includes(req.user.role)) {
      return res.sendStatus(403);
    }
    const { id } = req.params;
    try {
      const paper = db.prepare("SELECT * FROM exam_papers WHERE id = ?").get(id);
      if (!paper) return res.status(404).json({ error: "Exam paper template not found." });
      res.json(paper);
    } catch (error) {
      console.error("Get exam paper by id error:", error);
      res.status(500).json({ error: "Failed to fetch exam paper." });
    }
  });

  app.post("/api/exam-papers", authenticateToken, (req: any, res) => {
    if (!['teacher', 'examiner', 'dos', 'hm', 'developer'].includes(req.user.role)) {
      return res.sendStatus(403);
    }
    const {
      schoolName,
      schoolLocation,
      poBox,
      phoneContact,
      motto,
      centreNumber,
      schoolCode,
      examTitle,
      examType,
      difficultyLevel,
      customInstructions,
      targetStudentWeaknesses,
      studentWeaknessesSummary,
      subjectId,
      subjectName,
      subjectCode,
      class: paperClass,
      term,
      year,
      duration,
      totalMarks,
      topicCoverage,
      rulesAndRegulations,
      content,
      markingGuide
    } = req.body;

    try {
      const insert = db.prepare(`
        INSERT INTO exam_papers (
          creatorId, creatorRole, creatorName, schoolCode, schoolName, schoolLocation,
          poBox, phoneContact, motto, centreNumber, examTitle, examType, difficultyLevel,
          customInstructions, targetStudentWeaknesses, studentWeaknessesSummary,
          subjectId, subjectName, subjectCode, class, term, year, duration, totalMarks, topicCoverage,
          rulesAndRegulations, content, markingGuide
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.uid,
        req.user.role,
        req.user.name || 'Educator',
        schoolCode || req.user.schoolCode || null,
        schoolName || "St. Mary's College Kisubi",
        schoolLocation || "Wakiso District, Uganda",
        poBox || "P.O. Box 48, Entebbe",
        phoneContact || "+256 414 321 000",
        motto || "Excellence & Knowledge",
        centreNumber || "U3206",
        examTitle || "UGANDA LOWER SECONDARY CERTIFICATE OF EDUCATION (NCDC / CBC)",
        examType || "End of Term Assessment",
        difficultyLevel || "Standard NCDC",
        customInstructions || null,
        targetStudentWeaknesses ? 1 : 0,
        studentWeaknessesSummary || null,
        subjectId || null,
        subjectName || "Agriculture",
        subjectCode || "553/1",
        paperClass || "S.2",
        term || "Term 2",
        year || 2026,
        duration || "2 Hours 15 Minutes",
        totalMarks || 100,
        topicCoverage || "General NCDC Units",
        rulesAndRegulations || "",
        content || "",
        markingGuide || ""
      );

      res.status(201).json({ id: insert.lastInsertRowid, message: "Exam paper saved successfully." });
    } catch (error) {
      console.error("Save exam paper error:", error);
      res.status(500).json({ error: "Failed to save exam paper." });
    }
  });

  app.delete("/api/exam-papers/:id", authenticateToken, (req: any, res) => {
    if (!['teacher', 'examiner', 'dos', 'hm', 'developer'].includes(req.user.role)) {
      return res.sendStatus(403);
    }
    const { id } = req.params;
    try {
      if (req.user.role === 'developer' || req.user.role === 'dos' || req.user.role === 'hm') {
        db.prepare("DELETE FROM exam_papers WHERE id = ?").run(id);
      } else {
        db.prepare("DELETE FROM exam_papers WHERE id = ? AND creatorId = ?").run(id, req.user.uid);
      }
      res.json({ message: "Exam paper deleted successfully." });
    } catch (error) {
      console.error("Delete exam paper error:", error);
      res.status(500).json({ error: "Failed to delete exam paper." });
    }
  });

  // Diagnostic Endpoint: Aggregate Student Weaknesses & Gaps for Remedial Exam Generation
  app.get("/api/exam-papers/class-weaknesses", authenticateToken, (req: any, res) => {
    if (!['teacher', 'examiner', 'dos', 'hm', 'developer'].includes(req.user.role)) {
      return res.sendStatus(403);
    }
    const { subjectName } = req.query;

    try {
      // 1. Check competency_tracking for repetitive learning hurdles
      const compGaps = db.prepare(`
        SELECT competencyArea, SUM(failureCount) as totalFailures
        FROM competency_tracking
        WHERE failureCount > 0
        GROUP BY competencyArea
        ORDER BY totalFailures DESC
        LIMIT 6
      `).all() as any[];

      // 2. Check learning_curves weaknesses
      const curves = db.prepare(`
        SELECT weaknesses FROM learning_curves WHERE weaknesses IS NOT NULL AND LENGTH(weaknesses) > 5 LIMIT 10
      `).all() as any[];

      // 3. Check submissions with L1 grade
      const lowSubmissions = db.prepare(`
        SELECT s.activityTitle, s.feedback
        FROM submissions s
        WHERE s.grade = 'L1'
        ORDER BY s.timestamp DESC
        LIMIT 8
      `).all() as any[];

      const identifiedWeaknesses: string[] = [];
      compGaps.forEach(c => {
        if (c.competencyArea) identifiedWeaknesses.push(`${c.competencyArea} (Struggling learners count: ${c.totalFailures})`);
      });

      curves.forEach(curve => {
        try {
          const parsed = JSON.parse(curve.weaknesses);
          if (Array.isArray(parsed)) {
            parsed.forEach(p => {
              if (p && !identifiedWeaknesses.includes(p)) identifiedWeaknesses.push(String(p));
            });
          } else if (typeof parsed === 'string') {
            if (!identifiedWeaknesses.includes(parsed)) identifiedWeaknesses.push(parsed);
          }
        } catch {
          if (curve.weaknesses && !identifiedWeaknesses.includes(curve.weaknesses)) {
            identifiedWeaknesses.push(curve.weaknesses);
          }
        }
      });

      lowSubmissions.forEach(sub => {
        if (sub.activityTitle && !identifiedWeaknesses.some(w => w.includes(sub.activityTitle))) {
          identifiedWeaknesses.push(`Low competency attainment in "${sub.activityTitle}"`);
        }
      });

      // Contextual fallbacks if live database is early in term
      if (identifiedWeaknesses.length === 0) {
        if (subjectName && String(subjectName).toLowerCase().includes("agri")) {
          identifiedWeaknesses.push("Difficulty calculating fertilizer application ratios (NPK) and diagnosing nutrient deficiency symptoms");
          identifiedWeaknesses.push("Inability to differentiate biological weed management from toxic agrochemical runoff");
          identifiedWeaknesses.push("Weak financial bookkeeping and cost-benefit projection for farm enterprises");
        } else if (subjectName && String(subjectName).toLowerCase().includes("math")) {
          identifiedWeaknesses.push("Formulating algebraic equations from real-life community market dilemmas");
          identifiedWeaknesses.push("Geometric scale drawing and compass-and-straightedge surveying accuracy");
          identifiedWeaknesses.push("Compound vs simple interest calculation in local SACCO loan scenarios");
        } else if (subjectName && String(subjectName).toLowerCase().includes("phys")) {
          identifiedWeaknesses.push("Confusion between current (Amperes) and voltage (Volts) in solar battery setups");
          identifiedWeaknesses.push("Interpreting non-linear velocity-time graphs from local motion experiments");
          identifiedWeaknesses.push("Explaining heat insulation efficiency in domestic energy-saving cookstoves");
        } else if (subjectName && String(subjectName).toLowerCase().includes("chem")) {
          identifiedWeaknesses.push("Balancing chemical equations and predicting reaction products in water purification");
          identifiedWeaknesses.push("Explaining saponification steps in local soap-making using domestic vegetable oils");
        } else if (subjectName && String(subjectName).toLowerCase().includes("geog")) {
          identifiedWeaknesses.push("Contour map interpretation and calculating gradient across hilly terrains");
          identifiedWeaknesses.push("Explaining environmental degradation in Lake Victoria catchment wetlands");
        } else {
          identifiedWeaknesses.push("Applying theoretical concepts to authentic local Ugandan community situations");
          identifiedWeaknesses.push("Step-by-step mathematical reasoning and units precision");
          identifiedWeaknesses.push("Distinguishing cause, effect, and practical mitigation in socio-economic scenarios");
        }
      }

      const summary = `Class diagnostic indicates primary competency deficits in: ${identifiedWeaknesses.slice(0, 4).join("; ")}. Struggling learners frequently fall below the Level 2 threshold due to superficial explanations, calculation omissions, and difficulty transferring learned principles into community case studies.`;

      res.json({
        weaknesses: identifiedWeaknesses.slice(0, 8),
        summary,
        totalIdentifiedGaps: identifiedWeaknesses.length
      });
    } catch (err: any) {
      console.error("Error fetching class weaknesses:", err);
      res.status(500).json({ error: "Failed to compile class weaknesses" });
    }
  });

  app.post("/api/exam-papers/generate", authenticateToken, async (req: any, res) => {
    if (!['teacher', 'examiner', 'dos', 'hm', 'developer'].includes(req.user.role)) {
      return res.sendStatus(403);
    }
    const {
      schoolName,
      schoolLocation,
      poBox,
      phoneContact,
      motto,
      centreNumber,
      examTitle,
      examType,
      difficultyLevel,
      customInstructions,
      targetStudentWeaknesses,
      studentWeaknessesSummary,
      subject,
      subjectCode,
      class: examClass,
      term,
      year,
      duration,
      totalMarks,
      topicCoverage,
      rulesAndRegulations,
      includeMarkingGuide
    } = req.body;

    if (!subject || !topicCoverage) {
      return res.status(400).json({ error: "Subject and topic coverage are required." });
    }

    try {
      const generated = await gemini.generateExamPaper({
        schoolName: schoolName || "St. Mary's College Kisubi",
        schoolLocation: schoolLocation || "Wakiso District, Uganda",
        poBox: poBox || "P.O. Box 48, Entebbe",
        phoneContact: phoneContact || "+256 414 321 000",
        motto: motto || "Semper Ultra (Always Further)",
        centreNumber: centreNumber || "U3206",
        examTitle: examTitle || "UGANDA LOWER SECONDARY CERTIFICATE OF EDUCATION (NCDC / CBC)",
        examType: examType || "End of Term Assessment",
        difficultyLevel: difficultyLevel || "Standard NCDC",
        customInstructions,
        targetStudentWeaknesses: Boolean(targetStudentWeaknesses),
        studentWeaknessesSummary,
        subject,
        subjectCode: subjectCode || "553/1",
        class: examClass || "S.2",
        term: term || "Term 2",
        year: year || 2026,
        duration: duration || "2 Hours 15 Minutes",
        totalMarks: totalMarks || 100,
        topicCoverage,
        rulesAndRegulations,
        includeMarkingGuide: includeMarkingGuide !== false
      });

      res.json(generated);
    } catch (error: any) {
      console.error("Generate exam paper error:", error);
      res.status(500).json({ error: error.message || "Failed to generate exam paper." });
    }
  });

  // --- Batch Synchronization for Offline / Low-Connectivity Devices ---
  app.post("/api/sync/batch", authenticateToken, (req: any, res) => {
    const { submissions: offlineSubmissions, lessonPlans: offlinePlans } = req.body;
    const results: { submissions: any[]; lessonPlans: any[]; errors: string[] } = {
      submissions: [],
      lessonPlans: [],
      errors: [],
    };

    if (Array.isArray(offlineSubmissions) && offlineSubmissions.length > 0) {
      const insertSubStmt = db.prepare(`
        INSERT INTO submissions (studentId, aoiId, content, engagementTime, plagiarismRisk)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of offlineSubmissions) {
        try {
          const studentUid = req.user.role === 'developer' && item.studentId ? item.studentId : req.user.uid;
          const info = insertSubStmt.run(
            studentUid,
            item.aoiId,
            item.content,
            item.engagementTime || 0,
            item.plagiarismRisk || 'low'
          );
          results.submissions.push({
            localId: item.localId,
            serverId: info.lastInsertRowid,
            status: "synced",
          });
        } catch (e: any) {
          console.error("Batch sync submission failed:", e);
          results.errors.push(`Submission localId ${item.localId}: ${e.message}`);
        }
      }
    }

    if (Array.isArray(offlinePlans) && offlinePlans.length > 0 && ['teacher', 'dos', 'hm', 'developer'].includes(req.user.role)) {
      const insertPlanStmt = db.prepare(`
        INSERT INTO lesson_plans (teacherId, subjectId, class, topic, competencyOutcome, duration, content)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const plan of offlinePlans) {
        try {
          const info = insertPlanStmt.run(
            req.user.uid,
            plan.subjectId,
            plan.class,
            plan.topic,
            plan.competencyOutcome,
            plan.duration,
            plan.content
          );
          results.lessonPlans.push({
            localId: plan.localId,
            serverId: info.lastInsertRowid,
            status: "synced",
          });
        } catch (e: any) {
          console.error("Batch sync lesson plan failed:", e);
          results.errors.push(`Lesson Plan localId ${plan.localId}: ${e.message}`);
        }
      }
    }

    res.json({
      success: results.errors.length === 0,
      syncedSubmissions: results.submissions.length,
      syncedPlans: results.lessonPlans.length,
      ...results,
    });
  });

  // --- Centralized Error Handling Middleware ---
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[EXPRESS APPLICATION ERROR]", err);
    if (res.headersSent) {
      return next(err);
    }
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
      error: err.message || "An unexpected server error occurred.",
      code: err.code || "INTERNAL_ERROR",
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
