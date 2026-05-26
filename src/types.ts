export interface Admin {
  id: string;
  email: string;
  fullName: string;
}

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface Question {
  id: string;
  quizId: string;
  questionText: string;
  options: string[];
  correctOption: number; // 0-indexed index of option (0 to 4)
  explanation: string;
  marks: number;
  negativeMarks: number;
  difficulty: DifficultyLevel;
  tags: string[];
}

export interface Quiz {
  id: string;
  title: string;
  slug: string;
  subject: string;
  className: string;
  description: string;
  timeLimit: number; // in minutes
  passingMarks: number; // score needed to pass
  publishDate: string; // ISO format
  expiryDate: string; // ISO format
  isPublished: boolean;
  createdAt: string;
  questionsCount: number;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  className: string;
  phone?: string;
  registeredAt: string;
}

export interface Attempt {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  studentRoll: string;
  studentClass: string;
  answers: Record<string, number>; // questionId -> chosen index
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  totalQuestions: number;
  score: number; // total marks obtained
  totalPossibleMarks: number;
  percentage: number;
  grade: string;
  rank?: number;
  passed: boolean;
  timeTakenSeconds: number;
  attemptedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface ExtractResponse {
  quizInfo: {
    title: string;
    subject: string;
    className: string;
    description: string;
  };
  questions: Omit<Question, 'id' | 'quizId'>[];
  providerUsed: string;
}
