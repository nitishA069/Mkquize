import fs from 'fs';
import path from 'path';
import { Quiz, Question, Attempt, AuditLog } from '../src/types';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

interface DatabaseSchema {
  quizzes: Quiz[];
  questions: Question[];
  attempts: Attempt[];
  auditLogs: AuditLog[];
  admin: {
    email: string;
    passwordHash: string; // Since we default to clear text or simple match for local sandbox
    fullName: string;
  };
}

// Initial seed data to make the charts and tables immediately gorgeous
const initialSeedData: DatabaseSchema = {
  admin: {
    email: 'admin@example.com',
    passwordHash: 'Admin@123', // Matches requested credentials
    fullName: 'Prof. Nitish Narayana'
  },
  quizzes: [
    {
      id: 'quiz-science-101',
      title: 'Class 10 - General Science Assessment',
      slug: 'class-10-general-science-assessment',
      subject: 'Science',
      className: 'Class 10A',
      description: 'Covers Chemical Reactions, Acids & Bases, and Metals/Non-Metals chapters.',
      timeLimit: 15,
      passingMarks: 60,
      publishDate: new Date(Date.now() - 3600000 * 24 * 5).toISOString(), // 5 days ago
      expiryDate: new Date(Date.now() + 3600000 * 24 * 30).toISOString(),
      isPublished: true,
      createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      questionsCount: 4
    },
    {
      id: 'quiz-hindi-grammar',
      title: 'कक्षा 8 - सामान्य हिन्दी व्याकरण',
      slug: 'class-8-hindi-grammar',
      subject: 'Hindi',
      className: 'Class 8B',
      description: 'संज्ञा, सर्वनाम, विशेषण और संधि विच्छेद पर आधारित बहुविकल्पीय प्रश्न।',
      timeLimit: 10,
      passingMarks: 50,
      publishDate: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), // 2 days ago
      expiryDate: new Date(Date.now() + 3600000 * 24 * 15).toISOString(),
      isPublished: true,
      createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      questionsCount: 3
    }
  ],
  questions: [
    {
      id: 'q-sc-1',
      quizId: 'quiz-science-101',
      questionText: 'What is the pH level of pure water at room temperature?',
      options: ['pH 5', 'pH 7', 'pH 9', 'pH 14'],
      correctOption: 1, // pH 7
      explanation: 'Pure water is neutral and has a hydrogen ion concentration of 10^-7 M, resulting in a pH of 7.',
      marks: 4,
      negativeMarks: 1,
      difficulty: 'Easy',
      tags: ['Acids & Bases', 'Chemistry']
    },
    {
      id: 'q-sc-2',
      quizId: 'quiz-science-101',
      questionText: 'Which of the following gases is released when reactive metals react with diluted hydrochloric acid?',
      options: ['Oxygen', 'Hydrogen', 'Carbon Dioxide', 'Nitrogen'],
      correctOption: 1, // Hydrogen
      explanation: 'Metals displace hydrogen from dilute acids, releasing Hydrogen gas (H2) which burns with a pop sound.',
      marks: 4,
      negativeMarks: 1,
      difficulty: 'Medium',
      tags: ['Chemical Reactions', 'Chemistry']
    },
    {
      id: 'q-sc-3',
      quizId: 'quiz-science-101',
      questionText: 'Which of the following organelles is known as the powerhouse of the cell?',
      options: ['Chloroplast', 'Mitochondria', 'Lysosome', 'Ribosome'],
      correctOption: 1, // Mitochondria
      explanation: 'Mitochondria perform cellular respiration, converting glucose into ATP energy packets for biological tasks.',
      marks: 4,
      negativeMarks: 0,
      difficulty: 'Easy',
      tags: ['Biology', 'Cells']
    },
    {
      id: 'q-sc-4',
      quizId: 'quiz-science-101',
      questionText: 'What is the speed of light in vacuum?',
      options: ['3 x 10^5 m/s', '3 x 10^6 m/s', '3 x 10^8 m/s', '1.5 x 10^8 m/s'],
      correctOption: 2, // 3 x 10^8 m/s
      explanation: 'Light travels at its maximum speed in a vacuum, which is approximately 299,792,458 meters per second (3 x 10^8 m/s).',
      marks: 5,
      negativeMarks: 1,
      difficulty: 'Hard',
      tags: ['Physics', 'Optics']
    },
    // Hindi Quiz Questions
    {
      id: 'q-hi-1',
      quizId: 'quiz-hindi-grammar',
      questionText: 'निम्नलिखित में से कौन-सा शब्द "भाववाचक संज्ञा" का उदाहरण है?',
      options: ['राम', 'हिमालय', 'सुंदरता', 'दूध'],
      correctOption: 2, // सुंदरता
      explanation: 'जिस संज्ञा शब्द से किसी भाव, गुण, दशा या अवस्था का बोध हो, उसे भाववाचक संज्ञा कहते हैं। "सुंदरता" एक गुण/भाव है।',
      marks: 5,
      negativeMarks: 0,
      difficulty: 'Easy',
      tags: ['संज्ञा', 'व्याकरण']
    },
    {
      id: 'q-hi-2',
      quizId: 'quiz-hindi-grammar',
      questionText: '"रमेश" का सही संधि विच्छेद क्या होगा?',
      options: ['रम + ईश', 'रमा + ईश', 'रमा + इश', 'रमे + श'],
      correctOption: 1, // रमा + ईश
      explanation: 'रमेश = रमा (आ) + ईश (ई)। यह गुण स्वर संधि का उदाहरण है, जहाँ आ + ई मिलकर ए बनाते हैं।',
      marks: 5,
      negativeMarks: 1,
      difficulty: 'Medium',
      tags: ['संधि विच्छेद', 'व्याकरण']
    },
    {
      id: 'q-hi-3',
      quizId: 'quiz-hindi-grammar',
      questionText: 'जो शब्द संज्ञा की विशेषता बताते हैं, उन्हें क्या कहते हैं?',
      options: ['क्रिया', 'सर्वनाम', 'विशेषण', 'अव्यय'],
      correctOption: 2, // विशेषण
      explanation: 'संज्ञा या सर्वनाम की विशेषता (गुण, दोष, संख्या, परिमाण आदि) बताने वाले शब्दों को विशेषण कहते हैं।',
      marks: 5,
      negativeMarks: 0,
      difficulty: 'Easy',
      tags: ['विशेषण', 'व्याकरण']
    }
  ],
  attempts: [
    {
      id: 'att-1',
      quizId: 'quiz-science-101',
      quizTitle: 'Class 10 - General Science Assessment',
      studentId: 'st-1',
      studentName: 'Aryan Sharma',
      studentRoll: 'Class 10 - Roll 04',
      studentClass: 'Class 10A',
      answers: {
        'q-sc-1': 1, // correct
        'q-sc-2': 1, // correct
        'q-sc-3': 1, // correct
        'q-sc-4': 2  // correct
      },
      correctCount: 4,
      wrongCount: 0,
      unansweredCount: 0,
      totalQuestions: 4,
      score: 17, // 4+4+4+5
      totalPossibleMarks: 17,
      percentage: 100,
      grade: 'A+',
      rank: 1,
      passed: true,
      timeTakenSeconds: 380,
      attemptedAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString()
    },
    {
      id: 'att-2',
      quizId: 'quiz-science-101',
      quizTitle: 'Class 10 - General Science Assessment',
      studentId: 'st-2',
      studentName: 'Priya Patel',
      studentRoll: 'Class 10 - Roll 18',
      studentClass: 'Class 10A',
      answers: {
        'q-sc-1': 1, // correct (4)
        'q-sc-2': 0, // wrong (-1)
        'q-sc-3': 1, // correct (4)
        'q-sc-4': 2  // correct (5)
      },
      correctCount: 3,
      wrongCount: 1,
      unansweredCount: 0,
      totalQuestions: 4,
      score: 12, // 4 -1 + 4 + 5 = 12 / 17
      totalPossibleMarks: 17,
      percentage: 70.5,
      grade: 'B',
      rank: 2,
      passed: true,
      timeTakenSeconds: 490,
      attemptedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
    },
    {
      id: 'att-3',
      quizId: 'quiz-science-101',
      quizTitle: 'Class 10 - General Science Assessment',
      studentId: 'st-3',
      studentName: 'Rahul Verma',
      studentRoll: 'Class 10 - Roll 23',
      studentClass: 'Class 10A',
      answers: {
        'q-sc-1': 0, // wrong (-1)
        'q-sc-2': 0, // wrong (-1)
        'q-sc-3': 1, // correct (4)
        'q-sc-4': -1 // unanswered (0)
      },
      correctCount: 1,
      wrongCount: 2,
      unansweredCount: 1,
      totalQuestions: 4,
      score: 2, // -1 -1 + 4 = 2 / 17
      totalPossibleMarks: 17,
      percentage: 11.7,
      grade: 'F',
      rank: 3,
      passed: false,
      timeTakenSeconds: 610,
      attemptedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
    },
    {
      id: 'att-4',
      quizId: 'quiz-hindi-grammar',
      quizTitle: 'कक्षा 8 - सामान्य हिन्दी व्याकरण',
      studentId: 'st-4',
      studentName: 'Sneha Kumari',
      studentRoll: 'Class 8 - Roll 32',
      studentClass: 'Class 8B',
      answers: {
        'q-hi-1': 2, // correct (5)
        'q-hi-2': 1, // correct (5)
        'q-hi-3': 2  // correct (5)
      },
      correctCount: 3,
      wrongCount: 0,
      unansweredCount: 0,
      totalQuestions: 3,
      score: 15,
      totalPossibleMarks: 15,
      percentage: 100,
      grade: 'A+',
      rank: 1,
      passed: true,
      timeTakenSeconds: 220,
      attemptedAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString()
    }
  ],
  auditLogs: [
    {
      id: 'log-1',
      action: 'System Initialized',
      details: 'Smart Quiz Platform schema and multi-lingual sample quizzes generated successfully.',
      timestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      type: 'success'
    },
    {
      id: 'log-2',
      action: 'Sample Quiz Created',
      details: 'Published "Class 10 - General Science Assessment" with 4 automated questions.',
      timestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      type: 'info'
    },
    {
      id: 'log-3',
      action: 'Sample Quiz Created',
      details: 'Published "कक्षा 8 - सामान्य हिन्दी व्याकरण" inside Hindi syllabus.',
      timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      type: 'info'
    }
  ]
};

// Ensure direct folder mapping
function initDB() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialSeedData, null, 2), 'utf-8');
    console.log('Database initialized with structured seed data');
  }
}

// Global invocation
initDB();

export function readDB(): DatabaseSchema {
  try {
    initDB();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading database file:', error);
    return initialSeedData;
  }
}

export function writeDB(data: DatabaseSchema): boolean {
  try {
    initDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing database file:', error);
    return false;
  }
}

export function addAuditLog(action: string, details: string, type: AuditLog['type'] = 'info') {
  const db = readDB();
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action,
    details,
    timestamp: new Date().toISOString(),
    type
  };
  db.auditLogs.unshift(newLog);
  // Cap at 100 for storage efficacy
  if (db.auditLogs.length > 100) {
    db.auditLogs = db.auditLogs.slice(0, 100);
  }
  writeDB(db);
}
