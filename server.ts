import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Load variables from template env
dotenv.config();

import { readDB, writeDB, addAuditLog } from './server/db';
import { getAIProvider } from './server/parser';
import { Quiz, Question, Attempt, Student } from './src/types';

const app = express();
const PORT = 3000;

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to calculate Grade
function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

// ----------------------------------------------------
// 1. AUTHENTICATION ENDPOINTS
// ----------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDB();

  if (email === db.admin.email && password === db.admin.passwordHash) {
    addAuditLog('Teacher Login', `Successful login of ${db.admin.fullName} (${email})`, 'success');
    return res.json({
      success: true,
      token: 'jwt-admin-token-mock',
      user: {
        email: db.admin.email,
        fullName: db.admin.fullName,
        role: 'admin'
      }
    });
  }

  addAuditLog('Failed Login Attempt', `Unrecognized credentials for ${email}`, 'warning');
  return res.status(401).json({ success: false, message: 'Invalid teacher credentials.' });
});

app.get('/api/auth/me', (req, res) => {
  const db = readDB();
  // Simply mock successful retrieval for simplicity of the preview app
  return res.json({
    email: db.admin.email,
    fullName: db.admin.fullName,
    role: 'admin'
  });
});

// ----------------------------------------------------
// 2. QUIZ CRUD ENDPOINTS
// ----------------------------------------------------
app.get('/api/quizzes', (req, res) => {
  const db = readDB();
  res.json({ quizzes: db.quizzes });
});

// Retrieve single quiz details with full list of questions
app.get('/api/quizzes/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const quiz = db.quizzes.find(q => q.id === id);
  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found' });
  }
  const questions = db.questions.filter(q => q.quizId === id);
  res.json({ quiz, questions });
});

// Create/Publish Quiz
app.post('/api/quizzes', (req, res) => {
  const { quizInfo, questions } = req.body;
  const db = readDB();

  const quizId = `quiz-${Date.now()}`;
  const slug = quizInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const newQuiz: Quiz = {
    id: quizId,
    title: quizInfo.title,
    slug,
    subject: quizInfo.subject || 'General',
    className: quizInfo.className || 'Class General',
    description: quizInfo.description || '',
    timeLimit: Number(quizInfo.timeLimit) || 15,
    passingMarks: Number(quizInfo.passingMarks) || 50,
    publishDate: quizInfo.publishDate || new Date().toISOString(),
    expiryDate: quizInfo.expiryDate || new Date(Date.now() + 3600000 * 24 * 30).toISOString(),
    isPublished: quizInfo.isPublished !== undefined ? quizInfo.isPublished : false,
    questionsCount: questions.length,
    createdAt: new Date().toISOString()
  };

  const newQuestions: Question[] = questions.map((q: any, idx: number) => ({
    id: `q-${quizId}-${idx}-${Math.floor(Math.random() * 1000)}`,
    quizId: quizId,
    questionText: q.questionText,
    options: q.options,
    correctOption: Number(q.correctOption),
    explanation: q.explanation || '',
    marks: Number(q.marks) || 4,
    negativeMarks: Number(q.negativeMarks) || 0,
    difficulty: q.difficulty || 'Medium',
    tags: q.tags || []
  }));

  db.quizzes.unshift(newQuiz);
  db.questions.push(...newQuestions);

  writeDB(db);
  addAuditLog('Quiz Created', `Quiz "${newQuiz.title}" successfully compiled and integrated.`, 'success');
  res.json({ success: true, quiz: newQuiz });
});

// Update/Edit fully
app.put('/api/quizzes/:id', (req, res) => {
  const { id } = req.params;
  const { quizInfo, questions } = req.body;
  const db = readDB();

  const quizIndex = db.quizzes.findIndex(q => q.id === id);
  if (quizIndex === -1) {
    return res.status(404).json({ message: 'Quiz not found' });
  }

  // Update headers
  db.quizzes[quizIndex] = {
    ...db.quizzes[quizIndex],
    title: quizInfo.title,
    subject: quizInfo.subject,
    className: quizInfo.className,
    description: quizInfo.description,
    timeLimit: Number(quizInfo.timeLimit),
    passingMarks: Number(quizInfo.passingMarks),
    publishDate: quizInfo.publishDate,
    expiryDate: quizInfo.expiryDate,
    isPublished: quizInfo.isPublished,
    questionsCount: questions.length
  };

  // Re-map questions
  // Remove existing
  db.questions = db.questions.filter(q => q.quizId !== id);
  // Add updated
  const updatedQuestions: Question[] = questions.map((q: any, idx: number) => ({
    id: q.id || `q-${id}-${idx}-${Math.floor(Math.random() * 1000)}`,
    quizId: id,
    questionText: q.questionText,
    options: q.options,
    correctOption: Number(q.correctOption),
    explanation: q.explanation || '',
    marks: Number(q.marks) || 4,
    negativeMarks: Number(q.negativeMarks) || 0,
    difficulty: q.difficulty || 'Medium',
    tags: q.tags || []
  }));

  db.questions.push(...updatedQuestions);
  writeDB(db);

  addAuditLog('Quiz Updated', `Quiz metadata and ${questions.length} questions modified.`, 'info');
  res.json({ success: true, quiz: db.quizzes[quizIndex] });
});

// Toggle Publish Header
app.patch('/api/quizzes/:id/publish', (req, res) => {
  const { id } = req.params;
  const { isPublished } = req.body;
  const db = readDB();

  const quiz = db.quizzes.find(q => q.id === id);
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

  quiz.isPublished = isPublished;
  writeDB(db);

  addAuditLog(
    isPublished ? 'Quiz Published' : 'Quiz Suspended',
    `Quiz "${quiz.title}" has been taken ${isPublished ? 'live standard' : 'offline as draft'}.`,
    isPublished ? 'success' : 'warning'
  );

  res.json({ success: true, quiz });
});

// Mirror/Duplicate Quiz
app.post('/api/quizzes/:id/duplicate', (req, res) => {
  const { id } = req.params;
  const db = readDB();

  const quiz = db.quizzes.find(q => q.id === id);
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

  const dupQuizId = `quiz-${Date.now()}`;
  const dupQuiz: Quiz = {
    ...quiz,
    id: dupQuizId,
    title: `${quiz.title} (Copy)`,
    slug: `${quiz.slug}-copy-${Date.now().toString().slice(-4)}`,
    isPublished: false,
    createdAt: new Date().toISOString()
  };

  const originalQuestions = db.questions.filter(q => q.quizId === id);
  const dupQuestions: Question[] = originalQuestions.map((q, idx) => ({
    ...q,
    id: `q-${dupQuizId}-${idx}-${Math.floor(Math.random() * 1000)}`,
    quizId: dupQuizId
  }));

  db.quizzes.unshift(dupQuiz);
  db.questions.push(...dupQuestions);
  writeDB(db);

  addAuditLog('Quiz Duplicated', `Quiz "${quiz.title}" cloned into draft "${dupQuiz.title}".`, 'info');
  res.json({ success: true, quiz: dupQuiz });
});

// Delete Quiz
app.delete('/api/quizzes/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();

  const quiz = db.quizzes.find(q => q.id === id);
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

  db.quizzes = db.quizzes.filter(q => q.id !== id);
  db.questions = db.questions.filter(q => q.quizId !== id);
  db.attempts = db.attempts.filter(a => a.quizId !== id);

  writeDB(db);
  addAuditLog('Quiz Deleted', `Quiz "${quiz.title}" and associated questions/student attempts deleted.`, 'warning');
  res.json({ success: true });
});

// ----------------------------------------------------
// 3. SECURE AI EXTRACTION ENGINE
// ----------------------------------------------------
app.post('/api/quizzes/extract', async (req, res) => {
  const { text, fileData } = req.body;
  if ((!text || text.trim().length === 0) && !fileData) {
    return res.status(400).json({ success: false, message: 'PDF, image, or text material is empty' });
  }

  try {
    const provider = getAIProvider();
    let result;
    let detailsStr = '';

    if (fileData && fileData.base64 && fileData.mimeType) {
      console.log('Server received Base64 file for extraction, size:', fileData.base64.length, 'Type:', fileData.mimeType);
      result = await provider.extractQuizFromFile(fileData.base64, fileData.mimeType);
      detailsStr = `Direct file upload (${fileData.mimeType})`;
    } else {
      result = await provider.extractQuizFromText(text);
      detailsStr = `pasted text material (Length: ${text.length} chars)`;
    }

    let providerName = 'Rule-Based Pattern Engine';
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' && process.env.GEMINI_API_KEY.trim() !== '') {
      providerName = 'Google Gemini 3.5-Flash';
    } else if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'MY_OPENROUTER_API_KEY' && process.env.OPENROUTER_API_KEY.trim() !== '') {
      providerName = 'OpenRouter Integration';
    }

    addAuditLog(
      'Text Extracted',
      `Parsed ${detailsStr} using ${providerName} pipeline.`,
      'success'
    );

    res.json({
      success: true,
      quizInfo: result.quizInfo,
      questions: result.questions,
      providerUsed: providerName
    });
  } catch (error: any) {
    console.error('Quiz Extraction Process failure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract. ' + (error?.message || 'Server error occurred.')
    });
  }
});

// ----------------------------------------------------
// 4. STUDENT ASSESSMENT ATTEMPT ENDPOINTS
// ----------------------------------------------------
app.get('/api/student/quizzes', (req, res) => {
  const db = readDB();
  // Filter active, non-expired published quizzes
  const now = new Date();
  const activeQuizzes = db.quizzes.filter(q => {
    const start = new Date(q.publishDate);
    const end = new Date(q.expiryDate);
    return q.isPublished && now >= start && now <= end;
  });
  res.json({ quizzes: activeQuizzes });
});

// Start & Save Student Quiz Attempt
app.post('/api/attempts', (req, res) => {
  const { quizId, studentData, answers, timeTakenSeconds } = req.body;
  const db = readDB();

  const quiz = db.quizzes.find(q => q.id === quizId);
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

  const questions = db.questions.filter(q => q.quizId === quizId);

  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  let obtainedScore = 0;
  let totalPossibleScore = 0;

  questions.forEach(q => {
    const chosen = answers[q.id];
    totalPossibleScore += q.marks;

    if (chosen === undefined || chosen === -1 || chosen === null) {
      unansweredCount++;
    } else if (Number(chosen) === q.correctOption) {
      correctCount++;
      obtainedScore += q.marks;
    } else {
      wrongCount++;
      obtainedScore -= (q.negativeMarks || 0);
    }
  });

  // Zero-floor obtained marks
  if (obtainedScore < 0) obtainedScore = 0;

  const percentage = totalPossibleScore > 0 ? Number(((obtainedScore / totalPossibleScore) * 100).toFixed(1)) : 0;
  const grade = calculateGrade(percentage);
  const passed = percentage >= quiz.passingMarks;

  const attemptId = `att-${Date.now()}`;
  const newAttempt: Attempt = {
    id: attemptId,
    quizId,
    quizTitle: quiz.title,
    studentId: `st-${studentData.rollNumber}-${Date.now()}`,
    studentName: studentData.name,
    studentRoll: studentData.rollNumber,
    studentClass: studentData.className,
    answers,
    correctCount,
    wrongCount,
    unansweredCount,
    totalQuestions: questions.length,
    score: obtainedScore,
    totalPossibleMarks: totalPossibleScore,
    percentage,
    grade,
    passed,
    timeTakenSeconds: Number(timeTakenSeconds) || 0,
    attemptedAt: new Date().toISOString()
  };

  db.attempts.push(newAttempt);
  writeDB(db);

  addAuditLog(
    'Quiz Submitted',
    `Student "${studentData.name}" (${studentData.rollNumber}) submitted quiz "${quiz.title}". Score: ${obtainedScore}/${totalPossibleScore} (${percentage}%). Passed: ${passed ? 'YES' : 'NO'}.`,
    passed ? 'success' : 'warning'
  );

  // Compute live ranking within this quiz submissions
  const allQuizAttempts = db.attempts
    .filter(a => a.quizId === quizId)
    .sort((a, b) => b.score - a.score || a.timeTakenSeconds - b.timeTakenSeconds);
  const rank = allQuizAttempts.findIndex(a => a.id === attemptId) + 1;

  res.json({
    success: true,
    attempt: {
      ...newAttempt,
      rank
    }
  });
});

// Single Attempt Details
app.get('/api/attempts/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const attempt = db.attempts.find(a => a.id === id);
  if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

  // Get total rank
  const allQuizAttempts = db.attempts
    .filter(a => a.quizId === attempt.quizId)
    .sort((a, b) => b.score - a.score || a.timeTakenSeconds - b.timeTakenSeconds);
  const rank = allQuizAttempts.findIndex(a => a.id === id) + 1;

  res.json({
    attempt: {
      ...attempt,
      rank
    }
  });
});

// Delete student attempt record
app.delete('/api/attempts/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();

  const attempt = db.attempts.find(a => a.id === id);
  if (!attempt) {
    return res.status(404).json({ success: false, message: 'Attempt record not found.' });
  }

  db.attempts = db.attempts.filter(a => a.id !== id);
  writeDB(db);

  addAuditLog(
    'Attempt Deleted',
    `Permanently deleted assessment score attempt of student "${attempt.studentName}" for quiz "${attempt.quizTitle}".`,
    'warning'
  );

  res.json({ success: true, message: 'Student attempt record successfully deleted.' });
});

// Leaderboard for special quiz
app.get('/api/leaderboards/:quizId', (req, res) => {
  const { quizId } = req.params;
  const db = readDB();
  const allQuizAttempts = db.attempts
    .filter(a => a.quizId === quizId)
    .sort((a, b) => b.score - a.score || a.timeTakenSeconds - b.timeTakenSeconds)
    .slice(0, 10); // Top 10

  res.json({ leaderboard: allQuizAttempts });
});

// ----------------------------------------------------
// 5. DEEP ANALYTICS ENDPOINT
// ----------------------------------------------------
app.get('/api/analytics', (req, res) => {
  const db = readDB();

  const totalQuizzes = db.quizzes.length;
  // Unique students by roll number + class
  const studentSet = new Set(db.attempts.map(a => `${a.studentRoll}-${a.studentClass}`));
  const totalStudents = studentSet.size;
  const totalAttempts = db.attempts.length;

  let averageScore = 0;
  let passCount = 0;
  if (totalAttempts > 0) {
    const totalPercentageSum = db.attempts.reduce((sum, a) => sum + a.percentage, 0);
    averageScore = Number((totalPercentageSum / totalAttempts).toFixed(1));
    passCount = db.attempts.filter(a => a.passed).length;
  }
  const passRate = totalAttempts > 0 ? Number(((passCount / totalAttempts) * 100).toFixed(1)) : 0;

  // Recharts: subjectPerformance
  const subjectMap: Record<string, { totalPct: number; count: number; passes: number }> = {};
  db.attempts.forEach(att => {
    const qHeader = db.quizzes.find(q => q.id === att.quizId);
    const sub = qHeader ? qHeader.subject : 'General';
    if (!subjectMap[sub]) {
      subjectMap[sub] = { totalPct: 0, count: 0, passes: 0 };
    }
    subjectMap[sub].totalPct += att.percentage;
    subjectMap[sub].count += 1;
    if (att.passed) subjectMap[sub].passes += 1;
  });
  const subjectPerformance = Object.entries(subjectMap).map(([subject, stats]) => ({
    subject,
    avgScore: Number((stats.totalPct / stats.count).toFixed(1)),
    count: stats.count,
    passRate: Number(((stats.passes / stats.count) * 100).toFixed(1))
  }));

  // Recharts: difficultySpread
  const diffSpreadMap: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };
  db.questions.forEach(q => {
    if (diffSpreadMap[q.difficulty] !== undefined) {
      diffSpreadMap[q.difficulty]++;
    }
  });
  const difficultySpread = Object.entries(diffSpreadMap).map(([difficulty, count]) => ({
    difficulty,
    count
  }));

  // Recharts: classAverages
  const classMap: Record<string, { totalPct: number; count: number }> = {};
  db.attempts.forEach(att => {
    if (!classMap[att.studentClass]) {
      classMap[att.studentClass] = { totalPct: 0, count: 0 };
    }
    classMap[att.studentClass].totalPct += att.percentage;
    classMap[att.studentClass].count += 1;
  });
  const classAverages = Object.entries(classMap).map(([className, stats]) => ({
    className,
    average: Number((stats.totalPct / stats.count).toFixed(1))
  }));

  // Recharts: attemptTrajectory (last 10 unique submission dates with metrics)
  const trajectoryMap: Record<string, { count: number; sumPct: number }> = {};
  db.attempts.forEach(att => {
    // Simple slice date "YYYY-MM-DD"
    const dateStr = att.attemptedAt.split('T')[0];
    if (!trajectoryMap[dateStr]) {
      trajectoryMap[dateStr] = { count: 0, sumPct: 0 };
    }
    trajectoryMap[dateStr].count++;
    trajectoryMap[dateStr].sumPct += att.percentage;
  });
  const attemptTrajectory = Object.entries(trajectoryMap)
    .sort(([d1], [d2]) => d1.localeCompare(d2))
    .map(([date, stats]) => ({
      date,
      count: stats.count,
      average: Number((stats.sumPct / stats.count).toFixed(1))
    }))
    .slice(-10);

  // Weak questions identification
  // For each question, compile all submissions where student answered and evaluate accuracy
  const questionAccuracyList = db.questions.map(q => {
    let attemptedCount = 0;
    let correctCount = 0;

    db.attempts.forEach(att => {
      if (att.quizId === q.quizId) {
        const studentChoice = att.answers[q.id];
        if (studentChoice !== undefined && studentChoice !== -1 && studentChoice !== null) {
          attemptedCount++;
          if (Number(studentChoice) === q.correctOption) {
            correctCount++;
          }
        }
      }
    });

    const accuracy = attemptedCount > 0 ? Number(((correctCount / attemptedCount) * 100).toFixed(1)) : 100;
    const quizName = db.quizzes.find(qu => qu.id === q.quizId)?.title || 'Quiz';

    return {
      id: q.id,
      questionText: q.questionText,
      quizName,
      difficulty: q.difficulty,
      accuracy,
      attemptedCount
    };
  });

  const weakQuestions = questionAccuracyList
    .filter(qa => qa.attemptedCount > 0 && qa.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  // Top high performers list
  const topPerformers = db.attempts
    .sort((a, b) => b.score - a.score || a.timeTakenSeconds - b.timeTakenSeconds)
    .slice(0, 5);

  res.json({
    summary: {
      totalQuizzes,
      totalStudents,
      totalAttempts,
      averageScore,
      passRate
    },
    subjectPerformance,
    difficultySpread,
    classAverages,
    attemptTrajectory,
    weakQuestions,
    topPerformers
  });
});

// ----------------------------------------------------
// 6. SYSTEM BACKUP & RESTORE AUDITS
// ----------------------------------------------------
app.get('/api/db/backup', (req, res) => {
  const db = readDB();
  res.json({ success: true, db });
});

app.post('/api/db/restore', (req, res) => {
  const { backupData } = req.body;
  if (!backupData || !backupData.quizzes || !backupData.questions) {
    return res.status(400).json({ success: false, message: 'Invalid database backup structure.' });
  }

  const success = writeDB(backupData);
  if (success) {
    addAuditLog('System Restored', 'Teacher successfully restored database state from backup file.', 'success');
    return res.json({ success: true, message: 'System state successfully restored' });
  }
  res.status(500).json({ success: false, message: 'Failed writing backup to file' });
});

// ----------------------------------------------------
// 7. AUDIT LOGS ENDPOINT
// ----------------------------------------------------
app.get('/api/audit-logs', (req, res) => {
  const db = readDB();
  res.json({ auditLogs: db.auditLogs });
});

// ----------------------------------------------------
// VITE AND STATIC ASSET HANDLING (Full Stack Guidelines)
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA fallback handling
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server starting robustly on http://localhost:${PORT}`);
  });
}

startServer();
