import React, { useState, useEffect, FormEvent } from 'react';
import { translations, LanguageType } from '../translations';
import { Quiz, Question, Attempt, AuditLog, ExtractResponse } from '../types';
import { extractTextFromPdf, extractTextFromImage } from '../utils/pdfReader';
import QuestionFormItem from './QuestionFormItem';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import * as XLSX from 'xlsx';
import { 
  Sliders, Plus, AlertTriangle, CloudRain, Trash2, Calendar, BookOpen, 
  UserCheck, ShieldAlert, CheckCircle, UploadCloud, Copy, Eye, BarChart3, 
  Database, RefreshCw, FileSpreadsheet, Lock, HelpCircle, Save, EyeOff, Search,
  Award, X
} from 'lucide-react';

interface AdminConsoleProps {
  lang: LanguageType;
  setLang: (l: LanguageType) => void;
  onExit: () => void;
}

export default function AdminConsole({ lang, setLang, onExit }: AdminConsoleProps) {
  const t = translations[lang];

  // Auth States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Active Menu
  // 'dashboard' | 'builder' | 'quizzes' | 'attempts' | 'safety'
  const [currentMenu, setCurrentMenu] = useState<'dashboard' | 'builder' | 'quizzes' | 'attempts' | 'safety'>('dashboard');

  // Business States
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // SEARCH AND FILTERS
  const [quizSearch, setQuizSearch] = useState('');
  const [attemptSearch, setAttemptSearch] = useState('');

  // QUIZ BUILDER STATES
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [fileToProcess, setFileToProcess] = useState<File | null>(null);
  const [extractionMethod, setExtractionMethod] = useState<'digital' | 'ocr' | 'paste'>('digital');
  const [pastedText, setPastedText] = useState('');
  
  // Custom manual metadata fields
  const [mQuizTitle, setMQuizTitle] = useState('');
  const [mSubject, setMSubject] = useState('');
  const [mClass, setMClass] = useState('');
  const [mDescription, setMDescription] = useState('');
  const [mTimeLimit, setMTimeLimit] = useState(15);
  const [mPassingMarks, setMPassingMarks] = useState(60);
  const [mPublishDate, setMPublishDate] = useState(new Date().toISOString().slice(0, 16));
  const [mExpiryDate, setMExpiryDate] = useState(new Date(Date.now() + 3600000 * 24 * 30).toISOString().slice(0, 16));
  const [extractedQuestions, setExtractedQuestions] = useState<Omit<Question, 'id' | 'quizId'>[]>([]);
  const [editorIdx, setEditorIdx] = useState<number | null>(null);
  const [aiProviderUsed, setAiProviderUsed] = useState('');

  // Editing quiz state for existing quizzes
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  // Single Attempt Modal Lookup
  const [inspectAttempt, setInspectAttempt] = useState<Attempt | null>(null);

  // Colors database schema
  const COLOR_PALETTE = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const resetFormFields = () => {
    setEditingQuizId(null);
    setMQuizTitle('');
    setMSubject('');
    setMClass('');
    setMDescription('');
    setMTimeLimit(15);
    setMPassingMarks(60);
    setMPublishDate(new Date().toISOString().slice(0, 16));
    setMExpiryDate(new Date(Date.now() + 3600000 * 24 * 30).toISOString().slice(0, 16));
    setExtractedQuestions([]);
    setFileToProcess(null);
    setPastedText('');
    setOcrStatus('');
    setUploadProgress(0);
    setEditorIdx(null);
    setAiProviderUsed('');
  };

  // Initialize checks
  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadTeacherConsoleData();
    }
  }, [isLoggedIn, currentMenu]);

  const checkSession = async () => {
    const localToken = localStorage.getItem('teacher_token');
    if (localToken) {
      setIsLoggedIn(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('teacher_token', data.token);
        setIsLoggedIn(true);
      } else {
        setAuthError(data.message || 'Login failed.');
      }
    } catch (_) {
      setAuthError('Connection failed.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('teacher_token');
    setIsLoggedIn(false);
  };

  const loadTeacherConsoleData = async () => {
    try {
      setLoading(true);
      const resQuiz = await fetch('/api/quizzes');
      const dataQuiz = await resQuiz.json();
      setQuizzes(dataQuiz.quizzes || []);

      if (currentMenu === 'dashboard') {
        const resStats = await fetch('/api/analytics');
        const dataStats = await resStats.json();
        setAnalytics(dataStats);
      } else if (currentMenu === 'attempts') {
        const resStats = await fetch('/api/analytics');
        const dataStats = await resStats.json();
        setAttempts(dataStats.topPerformers || []); // Default list
        // Alternatively reload full DB schema
        const resBackup = await fetch('/api/db/backup');
        const dataBackup = await resBackup.json();
        if (dataBackup.success) {
          setAttempts(dataBackup.db.attempts || []);
        }
      } else if (currentMenu === 'safety') {
        const resAudit = await fetch('/api/audit-logs');
        const dataAudit = await resAudit.json();
        setAuditLogs(dataAudit.auditLogs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // EXTRACTION PIPELINE TRIGGER
  // ----------------------------------------------------
  const handleExtractPress = async () => {
    if (extractionMethod === 'paste') {
      if (!pastedText.trim()) {
        alert('Please paste some text questions first.');
        return;
      }
    } else {
      if (!fileToProcess) {
        alert('Please upload a PDF or Image question sheet first.');
        return;
      }
    }

    setUploadProgress(0);
    setOcrStatus('Preparing extraction pipeline...');
    setLoading(true);

    try {
      let response;

      if (extractionMethod === 'paste') {
        setOcrStatus('Calling secure Server AI Extraction Engine...');
        response = await fetch('/api/quizzes/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: pastedText })
        });
      } else {
        let extractedText = '';
        if (extractionMethod === 'digital') {
          setOcrStatus('Reading Digital PDF characters locally in browser...');
          extractedText = await extractTextFromPdf(fileToProcess, (pct) => {
            setUploadProgress(pct);
          });
        } else {
          setOcrStatus('Bootstrapping Optical Character Recognition (OCR)...');
          extractedText = await extractTextFromImage(fileToProcess, (status, pct) => {
            setOcrStatus(`OCR: ${status} (${pct}%)`);
            setUploadProgress(pct);
          });
        }

        if (!extractedText || !extractedText.trim()) {
          throw new Error('No characters could be gathered from the uploaded file.');
        }

        setUploadProgress(90);
        setOcrStatus('Structuring raw characters via parser engine...');
        
        response = await fetch('/api/quizzes/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: extractedText })
        });
        setUploadProgress(100);
      }

      setOcrStatus('Analyzing secure quiz payload structure...');

      const data: ExtractResponse = await response.json();
      if (response.ok && (data as any).success) {
        setOcrStatus('Assessment extracted beautifully!');
        setMQuizTitle(data.quizInfo.title);
        setMSubject(data.quizInfo.subject);
        setMClass(data.quizInfo.className);
        setMDescription(data.quizInfo.description);
        setExtractedQuestions(data.questions);
        setAiProviderUsed(data.providerUsed);
      } else {
        throw new Error((data as any).message || 'Extraction process failed on backend.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error during extraction: ' + err.message);
      setOcrStatus('Failed to generate.');
    } finally {
      setLoading(false);
    }
  };

  // CRUD OPERATIONS
  const handleTogglePublished = async (quizId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/quizzes/${quizId}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !currentStatus })
      });
      if (res.ok) {
        alert(currentStatus ? 'Quiz status shifted to Draft.' : 'Quiz is now published and set LIVE!');
        loadTeacherConsoleData();
      } else {
        const err = await res.json().catch(() => ({ message: 'Cannot save changes' }));
        alert(`Error toggling status: ${err.message || 'Validation failure on server.'}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message || err}`);
    }
  };

  const handleDuplicateQuiz = async (quizId: string) => {
    if (confirm('Create a mirror copy of this quiz as draft?')) {
      try {
        const res = await fetch(`/api/quizzes/${quizId}/duplicate`, { method: 'POST' });
        if (res.ok) {
          alert('Quiz successfully duplicated as Draft!');
          loadTeacherConsoleData();
        } else {
          const err = await res.json().catch(() => ({ message: 'Cannot duplicate quiz' }));
          alert(`Duplication failed: ${err.message}`);
        }
      } catch (err: any) {
        alert(`Network error: ${err.message || err}`);
      }
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (confirm('CRITICAL ACTION: Are you sure you want to delete this quiz, its questions, and all student score logs? This cannot be undone.')) {
      try {
        const res = await fetch(`/api/quizzes/${quizId}`, { method: 'DELETE' });
        if (res.ok) {
          alert('Quiz and associated assessments/attempts deleted successfully.');
          if (editingQuizId === quizId) {
            resetFormFields();
          }
          loadTeacherConsoleData();
        } else {
          const err = await res.json().catch(() => ({ message: 'Cannot delete quiz' }));
          alert(`Deletion failed: ${err.message}`);
        }
      } catch (err: any) {
        alert(`Network error: ${err.message || err}`);
      }
    }
  };

  const handleDeleteAttempt = async (attemptId: string) => {
    if (confirm('Are you sure you want to permanently delete this student score log? This action cannot be reverted.')) {
      try {
        setLoading(true);
        const res = await fetch(`/api/attempts/${attemptId}`, { method: 'DELETE' });
        if (res.ok) {
          alert('Student attempt record deleted successfully.');
          loadTeacherConsoleData();
        } else {
          const err = await res.json().catch(() => ({ message: 'Cannot delete record' }));
          alert(`Deletion failed: ${err.message}`);
        }
      } catch (err: any) {
        alert(`Network error: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // QUIZ SAVING (NEW OR UPDATE)
  const handleSaveQuizToDB = async (isToPublish: boolean) => {
    if (!mQuizTitle.trim() || extractedQuestions.length === 0) {
      alert('Quiz title must be set and at least 1 question must exist in editor grid.');
      return;
    }

    let publishIso = new Date().toISOString();
    let expiryIso = new Date(Date.now() + 3600000 * 24 * 30).toISOString();

    try {
      if (mPublishDate) {
        const d = new Date(mPublishDate);
        if (!isNaN(d.getTime())) publishIso = d.toISOString();
      }
    } catch (_) {}

    try {
      if (mExpiryDate) {
        const d = new Date(mExpiryDate);
        if (!isNaN(d.getTime())) expiryIso = d.toISOString();
      }
    } catch (_) {}

    const payload = {
      quizInfo: {
        title: mQuizTitle,
        subject: mSubject || 'General',
        className: mClass || 'Class 10',
        description: mDescription || '',
        timeLimit: Number(mTimeLimit) || 15,
        passingMarks: Number(mPassingMarks) || 50,
        publishDate: publishIso,
        expiryDate: expiryIso,
        isPublished: isToPublish
      },
      questions: extractedQuestions
    };

    try {
      setLoading(true);
      let res;
      if (editingQuizId) {
        res = await fetch(`/api/quizzes/${editingQuizId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/quizzes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        alert(isToPublish ? 'Quiz has been compiled and set LIVE instantly!' : 'Quiz saved successfully.');
        resetFormFields();
        // Sync & refresh console list
        loadTeacherConsoleData();
        setCurrentMenu('quizzes');
      } else {
        const err = await res.json().catch(() => ({ message: 'Validation/Server error.' }));
        alert(`Save failed: ${err.message || 'Please check input payload.'}`);
      }
    } catch (err: any) {
      alert(`Save failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Launch editing form for an existing quiz
  const handleLaunchEditForm = async (quizId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/quizzes/${quizId}`);
      const data = await res.json();
      if (res.ok) {
        const q = data.quiz;
        setEditingQuizId(q.id);
        setMQuizTitle(q.title);
        setMSubject(q.subject);
        setMClass(q.className);
        setMDescription(q.description);
        setMTimeLimit(q.timeLimit);
        setMPassingMarks(q.passingMarks);
        setMPublishDate(new Date(q.publishDate).toISOString().slice(0, 16));
        setMExpiryDate(new Date(q.expiryDate).toISOString().slice(0, 16));
        setExtractedQuestions(data.questions);
        setAiProviderUsed('Manual Override / Pre-existing');
        setFileToProcess(null);
        setPastedText('');
        setOcrStatus('');
        setUploadProgress(0);
        setEditorIdx(null);
        setCurrentMenu('builder');
      }
    } catch (_) {
      alert('Could not fetch quiz details.');
    } finally {
      setLoading(false);
    }
  };

  // Excel Excel Data
  const handleExportAttemptsExcel = () => {
    try {
      const flattened = attempts.map(att => ({
        'Student Name': att.studentName,
        'Roll Number': att.studentRoll,
        'Class Section': att.studentClass,
        'Quiz Title': att.quizTitle,
        'Marks Score': `${att.score} / ${att.totalPossibleMarks}`,
        'Passed (%)': `${att.percentage}%`,
        'Grade Awarded': att.grade,
        'Status Result': att.passed ? 'PASSED' : 'FAILED',
        'Time Taken (s)': att.timeTakenSeconds,
        'Date Timestamp': new Date(att.attemptedAt).toLocaleString()
      }));

      const ws = XLSX.utils.json_to_sheet(flattened);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Submissions Audit');
      XLSX.writeFile(wb, `Classroom-Quiz-Audit-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      alert('Excel export crashed.');
    }
  };

  // Database Backup download
  const handleDownloadBackup = async () => {
    try {
      const res = await fetch('/api/db/backup');
      const data = await res.json();
      if (res.ok && data.success) {
        const str = JSON.stringify(data.db, null, 2);
        const blob = new Blob([str], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Smart-Quiz-DB-Backup-${Date.now()}.json`;
        a.click();
      }
    } catch (_) {}
  };

  const handleRestoreBackup = async () => {
    const content = prompt('Paste your full exported backup JSON content here to overwrite system state:');
    if (!content) return;

    try {
      const parsed = JSON.parse(content.trim());
      const res = await fetch('/api/db/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupData: parsed })
      });
      const ret = await res.json();
      if (res.ok && ret.success) {
        alert(t.restoreSuccess);
        loadTeacherConsoleData();
      } else {
        alert(ret.message || 'Restore failed.');
      }
    } catch (err) {
      alert('Invalid JSON content pasted.');
    }
  };

  // Question editing handlers inside Builder form accordion
  const handleUpdateExtractedQuestion = (idx: number, updated: Omit<Question, 'id' | 'quizId'>) => {
    const list = [...extractedQuestions];
    list[idx] = updated;
    setExtractedQuestions(list);
  };

  const handleAddNewQuestionToForm = () => {
    const newQ: Omit<Question, 'id' | 'quizId'> = {
      questionText: 'New Question Prompt',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctOption: 0,
      explanation: 'Explanation of selected key answer',
      marks: 4,
      negativeMarks: 1,
      difficulty: 'Medium',
      tags: ['Custom']
    };
    setExtractedQuestions([...extractedQuestions, newQ]);
    setEditorIdx(extractedQuestions.length); // auto-open editor
  };

  const handleRemoveQuestionFromForm = (idx: number) => {
    const list = extractedQuestions.filter((_, i) => i !== idx);
    setExtractedQuestions(list);
    setEditorIdx(null);
  };

  // FILTER LOGIC
  const filteredQuizzes = quizzes.filter(q => 
    q.title?.toLowerCase().includes(quizSearch.toLowerCase()) ||
    q.subject?.toLowerCase().includes(quizSearch.toLowerCase()) ||
    q.className?.toLowerCase().includes(quizSearch.toLowerCase())
  );

  const filteredAttempts = attempts.filter(a => 
    a.studentName?.toLowerCase().includes(attemptSearch.toLowerCase()) ||
    a.studentRoll?.toLowerCase().includes(attemptSearch.toLowerCase()) ||
    a.quizTitle?.toLowerCase().includes(attemptSearch.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      
      {/* 1. AUTHENTICATOR OVERLAY */}
      {!isLoggedIn ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-2xl space-y-6" id="teacher-login-card">
            
            <div className="text-center space-y-2">
              <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto border border-indigo-200">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t.adminLogin}</h2>
              <p className="text-xs text-slate-400 font-mono">Teacher Console Access Panel</p>
            </div>

            {authError && (
              <div className="p-3.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 flex items-center gap-2" id="login-error-alert">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                {authError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-1.5">{t.email}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  id="admin-email-input"
                  placeholder="admin@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-1.5">{t.password}</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  id="admin-password-input"
                  placeholder="Admin@123"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm font-sans"
                />
              </div>

              <button
                type="submit"
                id="btn-admin-login"
                className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all text-sm uppercase tracking-wide cursor-pointer"
              >
                {t.login}
              </button>
            </form>

            <div className="border-t border-slate-100 pt-4 text-center">
              <button onClick={onExit} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest">
                Return to Portals Selection
              </button>
            </div>

          </div>
        </div>
      ) : (
        
        // 2. PRIMARY TEACHER WORKSPACE
        <div className="flex-1 flex flex-col md:flex-row">
          
          {/* SIDEBAR NAVIGATION */}
          <aside className="w-full md:w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col justify-between">
            <div>
              {/* App banner */}
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-white uppercase font-mono">{t.adminDashboard}</h3>
                  <p className="text-[10px] text-indigo-400 italic font-mono uppercase mt-0.5">Control deck Active</p>
                </div>
                <Award className="h-5 w-5 text-indigo-400" />
              </div>

              {/* Sidebar Menu options */}
              <div className="p-4 space-y-1.5">
                <button
                  onClick={() => setCurrentMenu('dashboard')}
                  id="menu-btn-dashboard"
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${currentMenu === 'dashboard' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                  <BarChart3 className="h-4.5 w-4.5" />
                  {t.analytics}
                </button>

                <button
                  onClick={() => {
                    resetFormFields();
                    setCurrentMenu('builder');
                  }}
                  id="menu-btn-builder"
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${currentMenu === 'builder' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                  <Plus className="h-4.5 w-4.5" />
                  {t.uploadQuiz}
                </button>

                <button
                  onClick={() => setCurrentMenu('quizzes')}
                  id="menu-btn-quizzes"
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${currentMenu === 'quizzes' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                  <BookOpen className="h-4.5 w-4.5" />
                  {t.quizzes}
                </button>

                <button
                  onClick={() => setCurrentMenu('attempts')}
                  id="menu-btn-attempts"
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${currentMenu === 'attempts' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                  <UserCheck className="h-4.5 w-4.5" />
                  {t.attempts}
                </button>

                <button
                  onClick={() => setCurrentMenu('safety')}
                  id="menu-btn-audit"
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${currentMenu === 'safety' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                  <Sliders className="h-4.5 w-4.5" />
                  Audit & Backup
                </button>
              </div>
            </div>

            {/* Logout drawer */}
            <div className="p-4 border-t border-slate-800 space-y-3">
              <div className="flex bg-slate-850 rounded-lg p-0.5 border border-slate-800">
                <button
                  onClick={() => setLang('en')}
                  className={`flex-1 py-1 text-xs font-bold rounded transition-all ${lang === 'en' ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-600/50' : 'text-slate-400 hover:text-white'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang('hi')}
                  className={`flex-1 py-1 text-xs font-bold rounded transition-all ${lang === 'hi' ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-600/50' : 'text-slate-400 hover:text-white'}`}
                >
                  HI
                </button>
              </div>

              <button
                onClick={handleLogout}
                id="btn-teacher-logout"
                className="w-full py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-rose-950 hover:text-rose-400 border border-slate-700 hover:border-rose-900/50 transition-all font-semibold text-xs uppercase text-center block cursor-pointer"
              >
                {t.logout}
              </button>
            </div>
          </aside>

          {/* MAIN WORKSPACE BODY */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            
            {/* Top minibar */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h1 className="text-xl font-black text-slate-900 uppercase font-mono tracking-tight">
                {currentMenu === 'dashboard' && t.analytics}
                {currentMenu === 'builder' && (editingQuizId ? 'Edit Quiz Mode' : t.uploadQuiz)}
                {currentMenu === 'quizzes' && 'Class Assessments Directory'}
                {currentMenu === 'attempts' && t.attempts}
                {currentMenu === 'safety' && 'Backup Audit Ledger'}
              </h1>
              
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>Examiner: ADMIN</span>
                <span className="h-4 border-l border-slate-300" />
                <button onClick={onExit} className="text-indigo-600 font-bold hover:underline">Exit Console</button>
              </div>
            </header>

            {/* CONTENT MODULE SHELL */}
            <main className="p-6 max-w-6xl w-full mx-auto space-y-6">
              
              {loading && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono rounded-xl flex items-center gap-3 animate-pulse">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading database models and compiling charts...
                </div>
              )}

              {/* ----------------------------------------------------
                  DASHBOARD / DEEP ANALYTICS CONTENT MODULE
                  ---------------------------------------------------- */}
              {currentMenu === 'dashboard' && analytics && (
                <div className="space-y-6" id="dashboard-module-view">
                  
                  {/* Cards Stats row */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{t.totalQuizzes}</p>
                      <p className="text-3xl font-black text-slate-900 mt-1">{analytics.summary.totalQuizzes}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{t.totalStudents}</p>
                      <p className="text-3xl font-black text-slate-900 mt-1">{analytics.summary.totalStudents}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{t.totalAttempts}</p>
                      <p className="text-3xl font-black text-slate-900 mt-1">{analytics.summary.totalAttempts}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{t.avgScore}</p>
                      <p className="text-3xl font-black text-indigo-600 mt-1">{analytics.summary.averageScore}%</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center col-span-2 lg:col-span-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{t.passRate}</p>
                      <p className="text-3xl font-black text-emerald-600 mt-1">{analytics.summary.passRate}%</p>
                    </div>
                  </div>

                  {/* High Quality Charts Grids */}
                  <div className="grid md:grid-cols-2 gap-6" id="dashboard-charts-grid">
                    
                    {/* Line Chart submission trends */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="border-b border-slate-100 pb-2">
                        <h4 className="text-sm font-bold text-slate-900">Quiz Submission Trajectory</h4>
                        <p className="text-[10px] text-slate-400 font-mono">Completed paper attempts logged over time</p>
                      </div>
                      <div className="h-64">
                        {analytics.attemptTrajectory?.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No historical traces available.</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analytics.attemptTrajectory}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} />
                              <YAxis tick={{fontSize: 10}} tickLine={false} />
                              <Tooltip contentStyle={{fontSize: 12, borderRadius: 10}} />
                              <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} name="Submissions" activeDot={{ r: 8 }} />
                              <Line type="monotone" dataKey="average" stroke="#10b981" strokeWidth={2} name="Avg Score %" />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Class average performance bar chart */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="border-b border-slate-100 pb-2">
                        <h4 className="text-sm font-bold text-slate-900">Class Performance Averages</h4>
                        <p className="text-[10px] text-slate-400 font-mono">Mean assessment scores achieved sorted by classroom sections</p>
                      </div>
                      <div className="h-64">
                        {analytics.classAverages?.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No class average maps available.</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.classAverages}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="className" tick={{fontSize: 10}} tickLine={false} />
                              <YAxis unit="%" domain={[0, 100]} tick={{fontSize: 10}} tickLine={false} />
                              <Tooltip contentStyle={{fontSize: 12, borderRadius: 10}} />
                              <Bar dataKey="average" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Class Average Score %">
                                {analytics.classAverages.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Difficulty spread Pie chart */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="border-b border-slate-100 pb-2">
                        <h4 className="text-sm font-bold text-slate-900">Difficulty Levels Spread</h4>
                        <p className="text-[10px] text-slate-400 font-mono">Distribution of Easy, Medium, Hard MCQs pooled inside database</p>
                      </div>
                      <div className="h-64 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex-1 w-full h-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analytics.difficultySpread}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="count"
                                nameKey="difficulty"
                              >
                                {analytics.difficultySpread?.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.difficulty === 'Easy' ? '#10b981' : entry.difficulty === 'Medium' ? '#f59e0b' : '#ef4444'} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-2 text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 bg-emerald-500 rounded-full" />
                            <span>Easy Questions</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 bg-amber-50 rounded-full border border-amber-400" />
                            <span>Medium Questions</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 bg-rose-500 rounded-full" />
                            <span>Hard Questions</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subject Performance Radar stats */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="border-b border-slate-100 pb-2">
                        <h4 className="text-sm font-bold text-slate-900">Syllabus Performance metrics</h4>
                        <p className="text-[10px] text-slate-400 font-mono">Comparing pass rates and average scores across subjects</p>
                      </div>
                      <div className="h-64">
                        {analytics.subjectPerformance?.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No subject stats compiled.</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.subjectPerformance} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" domain={[0, 100]} unit="%" tick={{fontSize: 10}} />
                              <YAxis dataKey="subject" type="category" tick={{fontSize: 10}} tickLine={false} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="avgScore" fill="#4f46e5" name="Average Score %" radius={[0, 4, 4, 0]} />
                              <Bar dataKey="passRate" fill="#10b981" name="Pass Rate %" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Diagnostic details row: Weak topic areas + Top scorers */}
                  <div className="grid md:grid-cols-2 gap-6">
                    
                    {/* Weak Questions */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        <HelpCircle className="h-4 w-4 text-rose-500" />
                        <h4 className="text-sm font-bold text-slate-900">{t.weakQuestions}</h4>
                      </div>
                      {analytics.weakQuestions?.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-6 text-center">Marvelous! Question pass accuracy remains globally above thresholds (60%).</p>
                      ) : (
                        <div className="space-y-3.5">
                          {analytics.weakQuestions.map((wq: any) => (
                            <div key={wq.id} className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl space-y-1 text-xs">
                              <div className="flex justify-between items-center text-[10px] text-rose-800 font-bold uppercase font-mono">
                                <span>{wq.quizName}</span>
                                <span className="bg-rose-100 px-1.5 py-0.5 rounded">Accuracy: {wq.accuracy}%</span>
                              </div>
                              <p className="font-semibold text-slate-800 leading-normal line-clamp-2">{wq.questionText}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Top Scorer List */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <h4 className="text-sm font-bold text-slate-900">{t.topPerformers}</h4>
                      </div>
                      {analytics.topPerformers?.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-6 text-center">No quiz attempt registers found.</p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {analytics.topPerformers.map((perf: any, idx: number) => (
                            <div key={perf.id} className="py-2.5 flex items-center justify-between text-xs font-sans">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-400 font-mono">#{idx + 1}</span>
                                <div>
                                  <p className="font-bold text-slate-800">{perf.studentName}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{perf.quizTitle}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-indigo-600">{perf.score} / {perf.totalPossibleMarks}</p>
                                <p className="text-[9px] text-slate-400 uppercase font-mono font-bold leading-none mt-0.5">GRADE {perf.grade}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              )}

              {/* ----------------------------------------------------
                  PDF EXTRACTION ENGINE & BUILDER MODULE
                  ---------------------------------------------------- */}
              {currentMenu === 'builder' && (
                <div className="space-y-6" id="builder-module-view">
                  
                  {/* Digital PDF parsing dropcard */}
                  {!editingQuizId && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                      <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{t.uploadQuiz}</h3>
                          <p className="text-xs text-slate-400 font-mono">Deep Unicode Reader Pipeline</p>
                        </div>
                        
                        {/* Selector method toggler */}
                        <div className="flex bg-slate-100 border border-slate-200 p-0.5 rounded-lg text-xs font-bold font-mono">
                          <button
                            onClick={() => {
                              setExtractionMethod('digital');
                              setFileToProcess(null);
                            }}
                            className={`px-3 py-1.5 rounded-md ${extractionMethod === 'digital' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                          >
                            Digital PDF
                          </button>
                          <button
                            onClick={() => {
                              setExtractionMethod('ocr');
                              setFileToProcess(null);
                            }}
                            className={`px-3 py-1.5 rounded-md ${extractionMethod === 'ocr' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                          >
                            Image OCR Scan
                          </button>
                          <button
                            onClick={() => {
                              setExtractionMethod('paste');
                              setFileToProcess(null);
                            }}
                            className={`px-3 py-1.5 rounded-md ${extractionMethod === 'paste' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                          >
                            Copy-Paste Text
                          </button>
                        </div>
                      </div>

                      {/* Content representation conditional on toggled method */}
                      {extractionMethod === 'paste' ? (
                        <div className="space-y-4">
                          <label className="block text-xs font-extrabold text-slate-500 font-mono uppercase tracking-wider">
                            Paste Exam Paper, Structured MCQs, or Unstructured Text Below
                          </label>
                          <textarea
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            placeholder={`Example English/Hindi formats supported natively:
Q1. What is the value of force if mass is 5kg and acceleration is 2 m/s²?
A) 5 N
B) 10 N
C) 7 N
D) 2.5 N
Answer: B

प्रश्न २। निम्नलिखित में से कौन सा एक अभाज्य संख्या (Prime Number) है?
क) ४
ख) ६
ग) २
घ) ९
उत्तर: ग`}
                            rows={8}
                            className="w-full font-mono text-sm p-4 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50/30 transition-all shadow-inner placeholder:text-slate-300 min-h-[180px]"
                          />
                          <button
                            onClick={handleExtractPress}
                            disabled={loading || !pastedText.trim()}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                          >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Construct Quiz From Pasted Text
                          </button>
                          {ocrStatus && (
                            <p className="text-center text-xs font-mono font-bold text-indigo-600">{ocrStatus}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Drag area */}
                          <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer relative">
                            <input
                              type="file"
                              accept={extractionMethod === 'digital' ? '.pdf' : 'image/*,.pdf'}
                              onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  setFileToProcess(e.target.files[0]);
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <UploadCloud className="h-10 w-10 text-indigo-500 mx-auto mb-3" />
                            <h4 className="text-slate-800 font-bold mb-1">
                              {fileToProcess ? fileToProcess.name : 'Select or drop your examination sheet here'}
                            </h4>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                              Supports {extractionMethod === 'digital' ? 'Native PDF papers' : 'Image scans, screenshots, JPG, PNG papers'} up to 25MB. Hindi and English native text supported.
                            </p>
                          </div>

                          {/* extraction trigger panel progress */}
                          {fileToProcess && (
                            <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono font-bold text-indigo-600">{ocrStatus || 'File Ready for Processing'}</span>
                                {uploadProgress > 0 && <span className="font-mono font-bold">{uploadProgress}%</span>}
                              </div>
                              
                              {uploadProgress > 0 && (
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-600 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                                </div>
                              )}

                              <button
                                onClick={handleExtractPress}
                                disabled={loading}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                              >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                {t.extractPdf}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Form accordion review edits */}
                  {extractedQuestions.length > 0 && (
                    <div className="space-y-6">
                      
                      {/* Form headers summary */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{t.createQuiz}</h3>
                            <span className="p-1 px-2.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase font-mono mt-1 inline-block">AI PIPELINE: {aiProviderUsed}</span>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm('Discard changes and return?')) {
                                resetFormFields();
                                setCurrentMenu('quizzes');
                              }
                            }}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800 uppercase tracking-widest uppercase cursor-pointer"
                          >
                            Discard Quiz
                          </button>
                        </div>

                        {/* Text Parameter inputs */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">{lang === 'en' ? 'Quiz Title' : 'शीर्षक'}</label>
                            <input
                              type="text"
                              value={mQuizTitle}
                              onChange={e => setMQuizTitle(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-sans font-semibold text-slate-800 cursor-text"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">{t.subject}</label>
                            <input
                              type="text"
                              value={mSubject}
                              onChange={e => setMSubject(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-sans text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">{t.className}</label>
                            <input
                              type="text"
                              value={mClass}
                              onChange={e => setMClass(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-sans text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">{t.timeLimit}</label>
                            <input
                              type="number"
                              value={mTimeLimit}
                              onChange={e => setMTimeLimit(Number(e.target.value))}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-sans text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">{t.passingMarks}</label>
                            <input
                              type="number"
                              value={mPassingMarks}
                              onChange={e => setMPassingMarks(Number(e.target.value))}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-sans text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">{t.publishDate}</label>
                            <input
                              type="datetime-local"
                              value={mPublishDate}
                              onChange={e => setMPublishDate(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">{t.expiryDate}</label>
                            <input
                              type="datetime-local"
                              value={mExpiryDate}
                              onChange={e => setMExpiryDate(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono text-slate-800"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">{t.description}</label>
                          <textarea
                            value={mDescription}
                            onChange={e => setMDescription(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-sans text-slate-800 resize-none"
                          />
                        </div>
                      </div>

                      {/* List editor of questions */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-base font-black uppercase tracking-wide text-slate-400 font-mono">{t.reviewQuestions} ({extractedQuestions.length})</h4>
                          <button
                            onClick={handleAddNewQuestionToForm}
                            id="btn-add-question"
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg uppercase flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add MCQ Question
                          </button>
                        </div>

                        <div className="space-y-4">
                          {extractedQuestions.map((q, idx) => (
                            <QuestionFormItem
                              key={idx}
                              q={q}
                              idx={idx}
                              isEditing={editorIdx === idx}
                              onToggleEdit={() => setEditorIdx(editorIdx === idx ? null : idx)}
                              onRemove={() => handleRemoveQuestionFromForm(idx)}
                              onUpdate={(updated) => handleUpdateExtractedQuestion(idx, updated)}
                              lang={lang}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Bottom action trigger bar */}
                      <div className="flex gap-4 p-5 rounded-2xl border border-slate-200 bg-white">
                        <button
                          onClick={() => handleSaveQuizToDB(false)}
                          id="btn-save-draft"
                          className="flex-1 py-3 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl uppercase tracking-wide cursor-pointer transition-all border border-slate-200"
                        >
                          Save as Draft
                        </button>
                        <button
                          onClick={() => handleSaveQuizToDB(true)}
                          id="btn-save-publish"
                          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl uppercase tracking-wide cursor-pointer transition-all shadow-md"
                        >
                          Compile & Publish Assessment
                        </button>
                      </div>

                    </div>
                  )}

                </div>
              )}

              {/* ----------------------------------------------------
                  QUIZ LIST / CRUD OPERATORS MODULE
                  ---------------------------------------------------- */}
              {currentMenu === 'quizzes' && (
                <div className="space-y-6" id="quizzes-module-view">
                  
                  {/* search and controls */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3.5 top-3 text-slate-400 h-4.5 w-4.5" />
                      <input
                        type="text"
                        placeholder="Search quizzes by title, subject, target classroom..."
                        value={quizSearch}
                        onChange={e => setQuizSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                      />
                    </div>
                  </div>

                  {filteredQuizzes.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                      <HelpCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-slate-500">No matching quizzes found in classroom index.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4" id="quizzes-list-grid">
                      {filteredQuizzes.map(quiz => (
                        <div key={quiz.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded font-mono">{quiz.subject}</span>
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase rounded font-mono">{quiz.className}</span>
                              <span className={`h-1.5 w-1.5 rounded-full ${quiz.isPublished ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                              <span className="text-[10px] text-slate-400 font-semibold">{quiz.isPublished ? 'Live' : 'Draft'}</span>
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 leading-snug">{quiz.title}</h4>
                            <p className="text-xs text-slate-400 font-mono">Created: {new Date(quiz.createdAt).toLocaleDateString()} | Questions count: {quiz.questionsCount}</p>
                          </div>

                          {/* Trigger actions */}
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => handleTogglePublished(quiz.id, quiz.isPublished)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase ${quiz.isPublished ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'}`}
                            >
                              {quiz.isPublished ? 'Suspend' : 'Publish'}
                            </button>
                            <button
                              onClick={() => handleLaunchEditForm(quiz.id)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-bold rounded-lg uppercase border border-slate-200 transition-all cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDuplicateQuiz(quiz.id)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg uppercase border border-slate-200 cursor-pointer"
                            >
                              Duplicate
                            </button>
                            <button
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                              title="Delete Quiz"
                              id={`btn-crud-del-${quiz.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}

              {/* ----------------------------------------------------
                  STUDENT LOG MODULE
                  ---------------------------------------------------- */}
              {currentMenu === 'attempts' && (
                <div className="space-y-6" id="attempts-module-view">
                  
                  {/* Search and XLS trigger */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px] relative">
                      <Search className="absolute left-3 top-2.5 text-slate-400 h-4.5 w-4.5" />
                      <input
                        type="text"
                        placeholder="Search student profile name, roll id, assessment..."
                        value={attemptSearch}
                        onChange={e => setAttemptSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <button
                      onClick={handleExportAttemptsExcel}
                      id="btn-export-sheet"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white uppercase rounded-lg flex items-center gap-1.5 cursor-pointer shadow border-b-2 border-emerald-800"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      {lang === 'en' ? 'Export Classroom Registry (XLS)' : 'क्लासरूम रजिस्ट्री निर्यात करें (XLS)'}
                    </button>
                  </div>

                  {/* Scroller table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-mono text-slate-400 uppercase font-black">
                            <th className="p-4">Student Profile</th>
                            <th className="p-4">Class</th>
                            <th className="p-4">Quiz Title</th>
                            <th className="p-4 text-center">Score Ratio</th>
                            <th className="p-4 text-center">Grade</th>
                            <th className="p-4 text-center">Outcome</th>
                            <th className="p-4 text-center border-l border-slate-100">Report</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100" id="submission-table-body">
                          {filteredAttempts.map(att => (
                            <tr key={att.id} className="hover:bg-slate-50/50">
                              <td className="p-4">
                                <p className="font-bold text-slate-800 text-sm leading-tight">{att.studentName}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Roll: {att.studentRoll}</p>
                              </td>
                              <td className="p-4 font-semibold text-slate-600">{att.studentClass}</td>
                              <td className="p-4 text-slate-700 font-semibold">{att.quizTitle}</td>
                              <td className="p-4 text-center">
                                <p className="font-mono text-sm font-bold text-indigo-600">{att.score} / {att.totalPossibleMarks}</p>
                                <p className="text-[9px] text-slate-400 font-mono">({att.percentage}%)</p>
                              </td>
                              <td className="p-4 text-center font-black text-slate-800 text-base">{att.grade}</td>
                              <td className="p-4 text-center">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${att.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                  {att.passed ? 'Pass' : 'Fail'}
                                </span>
                              </td>
                              <td className="p-4 text-center border-l border-slate-100">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => setInspectAttempt(att)}
                                    id={`btn-view-grade-${att.id}`}
                                    className="p-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded text-indigo-700 font-bold transition-all"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAttempt(att.id)}
                                    id={`btn-del-attempt-${att.id}`}
                                    className="p-1 px-2 text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded transition-all cursor-pointer"
                                    title="Delete Student Attempt Log"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* ----------------------------------------------------
                  AUDIT LEDGERS & DATA BACKUPS
                  ---------------------------------------------------- */}
              {currentMenu === 'safety' && (
                <div className="space-y-6" id="safety-module-view">
                  
                  {/* Backup row actions */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <Database className="h-4.5 w-4.5 text-indigo-600" />
                          Database Checkpoints
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">Download your full school classroom record database to build local backups or run custom migrations. Saved as a single JSON file.</p>
                      </div>
                      <button
                        onClick={handleDownloadBackup}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl uppercase tracking-wider shadow cursor-pointer text-center block"
                      >
                        Download DB Backup Checkpoint
                      </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <Sliders className="h-4.5 w-4.5 text-indigo-600" />
                          Overwrite Restore Point
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">Paste a previously downloaded database JSON contents back into system memory to restore all questions, attempts, and teacher audits.</p>
                      </div>
                      <button
                        onClick={handleRestoreBackup}
                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl uppercase tracking-wider shadow cursor-pointer text-center block"
                      >
                        Restore DB from check file
                      </button>
                    </div>
                  </div>

                  {/* Audit Ledger List */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <ShieldAlert className="h-4.5 w-4.5 text-indigo-600" />
                      <h4 className="text-sm font-bold text-slate-900">Safety Audit trail records</h4>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-2 space-y-2.5">
                      {auditLogs.map(log => {
                        let colorClass = 'text-slate-600 bg-slate-50 border-slate-200';
                        if (log.type === 'success') colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                        else if (log.type === 'warning') colorClass = 'text-amber-750 bg-amber-50 border-amber-100';
                        else if (log.type === 'error') colorClass = 'text-rose-700 bg-rose-50 border-rose-100';

                        return (
                          <div key={log.id} className={`p-3 rounded-lg border flex items-start gap-3 text-xs ${colorClass}`}>
                            <div className="flex-1 mt-0.5">
                              <p className="font-bold flex items-center justify-between">
                                <span className="uppercase text-[10px] tracking-wide">{log.action}</span>
                                <span className="font-mono text-[9px] text-slate-400 italic font-normal">{new Date(log.timestamp).toLocaleString()}</span>
                              </p>
                              <p className="text-slate-600 leading-normal mt-1">{log.details}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </main>
          </div>

        </div>
      )}

      {/* 3. PROFILE ATTEMPT INSPECTION POPUP MODAL */}
      {inspectAttempt && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border-2 border-slate-200 max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl mx-4 relative" id="inspect-modal-card">
            
            <button
              onClick={() => setInspectAttempt(null)}
              className="absolute top-4 right-4 p-1.5 bg-slate-100 text-slate-505 hover:bg-slate-200 rounded-full cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="border-b border-slate-100 pb-4 mb-5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${inspectAttempt.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {inspectAttempt.passed ? 'PASSED / उत्तीर्ण' : 'FAILED / अनुत्तीर्ण'}
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{inspectAttempt.studentName} Score Transcript</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Class: {inspectAttempt.studentClass} | Roll ID: {inspectAttempt.studentRoll} | Assigned: {inspectAttempt.grade}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center text-xs bg-slate-50 p-4 border border-slate-100 rounded-xl mb-6">
              <div>
                <p className="text-slate-400 font-mono uppercase">Marks Awarded</p>
                <p className="text-xl font-black text-indigo-600 mt-1">{inspectAttempt.score} / {inspectAttempt.totalPossibleMarks}</p>
              </div>
              <div>
                <p className="text-slate-400 font-mono uppercase">Accuracy (%)</p>
                <p className="text-xl font-black text-slate-800 mt-1">{inspectAttempt.percentage}%</p>
              </div>
              <div>
                <p className="text-slate-400 font-mono uppercase">Time Spent</p>
                <p className="text-xl font-black text-slate-800 mt-1">{Math.floor(inspectAttempt.timeTakenSeconds / 60)}m {inspectAttempt.timeTakenSeconds % 60}s</p>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-400 uppercase font-mono tracking-widest mb-3">Verification and Responses log:</p>
            <div className="space-y-4">
              {/* Note: since questions aren't directly stored in the attempt itself, we show details */}
              <div className="p-4 bg-slate-100 rounded-lg text-xs leading-relaxed text-slate-600 space-y-2">
                <div className="flex justify-between border-b pb-1">
                  <span>✔ Correct responses count:</span>
                  <span className="font-bold text-emerald-600">{inspectAttempt.correctCount}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>✘ Incorrect responses count:</span>
                  <span className="font-bold text-rose-600">{inspectAttempt.wrongCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>❓ Left unanswered:</span>
                  <span className="font-bold text-slate-400">{inspectAttempt.unansweredCount}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setInspectAttempt(null)}
              className="w-full mt-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-center text-xs uppercase cursor-pointer"
            >
              Close inspector board
            </button>

          </div>
        </div>
      )}

      {/* FOOTER BAR */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-[10px] text-slate-400 font-mono uppercase">
        © Smart Quiz Platform for Teachers | Cloud Native Assessment Workspace
      </footer>

    </div>
  );
}
