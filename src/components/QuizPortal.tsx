import { useState, useEffect, useRef } from 'react';
import { translations, LanguageType } from '../translations';
import { Quiz, Question, Attempt } from '../types';
import { ArrowLeft, ArrowRight, Award, CheckCircle2, AlertTriangle, FileText, Printer, Clock, Eye, RefreshCw, X } from 'lucide-react';
import jsPDF from 'jspdf';

interface QuizPortalProps {
  lang: LanguageType;
  setLang: (l: LanguageType) => void;
  onExit: () => void;
}

export default function QuizPortal({ lang, setLang, onExit }: QuizPortalProps) {
  const t = translations[lang];

  // System States
  const [activeQuizzes, setActiveQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  // Student details
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [phone, setPhone] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  // Active quiz taking states
  const [examStarted, setExamStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Completed / Results State
  const [attemptResult, setAttemptResult] = useState<Attempt | null>(null);
  const [leaderboard, setLeaderboard] = useState<Attempt[]>([]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Tracking randomized orders to preserve grading mapping if enabled
  const questionOrderRef = useRef<number[]>([]);
  const optionsOrderRef = useRef<Record<string, number[]>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load quizzes
  useEffect(() => {
    fetchActiveQuizzes();
  }, []);

  const fetchActiveQuizzes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/student/quizzes');
      const data = await res.json();
      if (res.ok) {
        setActiveQuizzes(data.quizzes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Launch exam
  const handleLaunchRegister = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setStudentClass(quiz.className); // Default match
  };

  const handleStartQuiz = async () => {
    if (!studentName.trim() || !rollNumber.trim() || !studentClass.trim()) {
      alert('Please fill out all required details before entering the exam.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/quizzes/${selectedQuiz?.id}`);
      const data = await res.json();
      if (res.ok) {
        let loadedQs: Question[] = data.questions || [];

        // Apply randomization mappings if requested
        if (randomizeQuestions) {
          const indices = Array.from({ length: loadedQs.length }, (_, i) => i);
          // Shuffle
          for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
          }
          questionOrderRef.current = indices;
          loadedQs = indices.map(idx => loadedQs[idx]);
        } else {
          questionOrderRef.current = loadedQs.map((_, i) => i);
        }

        // Parse option index maps
        const optMaps: Record<string, number[]> = {};
        loadedQs.forEach(q => {
          const optsLength = q.options.length;
          const indices = Array.from({ length: optsLength }, (_, i) => i);
          if (randomizeOptions) {
            for (let i = indices.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [indices[i], indices[j]] = [indices[j], indices[i]];
            }
          }
          optMaps[q.id] = indices;
        });
        optionsOrderRef.current = optMaps;

        setQuestions(loadedQs);
        setTimeLeft((selectedQuiz?.timeLimit || 15) * 60);
        setIsRegistered(true);
        setExamStarted(true);
        setCurrentIdx(0);
        setSelectedAnswers({});
        setFlaggedQuestions({});
        setAttemptResult(null);

        // Try fullscreen if selected
        if (fullscreen) {
          try {
            document.documentElement.requestFullscreen();
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error(err);
      alert('Could not start the quiz session. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Timer effect
  useEffect(() => {
    if (examStarted && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (examStarted && timeLeft === 0) {
      // Auto submit
      handleSubmitExam(true);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [examStarted, timeLeft]);

  // Submit assessment
  const handleSubmitExam = async (autoSubmitObj = false) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowSubmitConfirm(false);

    const submissionAnswers: Record<string, number> = {};
    // Map choices back to the correct original indices
    questions.forEach(q => {
      const selectedOffset = selectedAnswers[q.id]; // The index list item clicked in UI
      if (selectedOffset === undefined || selectedOffset === -1) {
        submissionAnswers[q.id] = -1; // Unanswered
      } else {
        // Map back
        const optsMap = optionsOrderRef.current[q.id] || [];
        const originalIndex = optsMap[selectedOffset] !== undefined ? optsMap[selectedOffset] : selectedOffset;
        submissionAnswers[q.id] = originalIndex;
      }
    });

    try {
      setLoading(true);
      const consumedSeconds = (selectedQuiz!.timeLimit * 60) - timeLeft;

      const response = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: selectedQuiz?.id,
          studentData: {
            name: studentName,
            rollNumber,
            className: studentClass,
            phone
          },
          answers: submissionAnswers,
          timeTakenSeconds: consumedSeconds
        })
      });

      const data = await response.json();
      if (response.ok) {
        setAttemptResult(data.attempt);
        setExamStarted(false);
        // Load quiz leaderboard
        fetchLeaderboard(selectedQuiz!.id);

        if (document.fullscreenElement) {
          try {
            document.exitFullscreen();
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error(err);
      alert('Network failure occurred during submission submit. Retrying...');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (quizId: string) => {
    try {
      const res = await fetch(`/api/leaderboards/${quizId}`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (_) {}
  };

  // Fullscreen helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  // PDF Certificate Generator
  const generateCertificate = () => {
    if (!attemptResult) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Outer rich borders
    doc.setDrawColor(212, 175, 55); // Rich Gold Color
    doc.setLineWidth(3);
    doc.rect(8, 8, 281, 194); // Outer Frame

    doc.setDrawColor(15, 23, 42); // Navy Dark
    doc.setLineWidth(1.5);
    doc.rect(12, 12, 273, 186); // Inner Frame

    // Header Decorative Ornaments
    doc.setFillColor(15, 23, 42);
    doc.rect(138, 20, 20, 4);

    // Title / Subject Banner
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(15, 23, 42); // Primary Navy
    doc.text('CERTIFICATE OF ACHIEVEMENT', 148, 40, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    doc.text('THIS CERTIFICATE IS PROUDLY PRESENTED TO', 148, 55, { align: 'center' });

    // Name Calligraphy
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(212, 175, 55);
    doc.text(attemptResult.studentName.toUpperCase(), 148, 75, { align: 'center' });

    // Decorative divider line under name
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.8);
    doc.line(80, 82, 216, 82);

    // Context details
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text(`for successfully completing the classroom assessment:`, 148, 95, { align: 'center' });

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(`"${attemptResult.quizTitle}"`, 148, 110, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Conducted in Class: ${attemptResult.studentClass} | Roll ID: ${attemptResult.studentRoll}`,
      148,
      122,
      { align: 'center' }
    );

    // Score Metadata Cards
    doc.setFillColor(248, 250, 252);
    doc.rect(50, 132, 196, 25, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Final Score: ${attemptResult.score} / ${attemptResult.totalPossibleMarks}`, 60, 147);
    doc.text(`Percentage: ${attemptResult.percentage}%`, 122, 147);
    doc.text(`Grade Earned: ${attemptResult.grade}`, 188, 147);

    // Signatures
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.line(40, 178, 100, 178);
    doc.text('Authorized Examiner', 70, 184, { align: 'center' });

    doc.line(196, 178, 256, 178);
    doc.text('Date of Verification', 226, 184, { align: 'center' });
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(new Date(attemptResult.attemptedAt).toLocaleDateString(), 226, 175, { align: 'center' });

    // Gold Ribbon / Medal Seal Graphic Core in vectors
    doc.setFillColor(212, 175, 55);
    doc.circle(148, 172, 10, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('PASS', 148, 174, { align: 'center' });

    doc.save(`Certificate-${attemptResult.studentName.replace(/\s+/g, '-')}.pdf`);
  };

  // Plain Results Sheet PDF
  const generateTranscript = () => {
    if (!attemptResult) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('ASSESSMENT TRANSCRIPT', 20, 25);
    doc.setFontSize(12);
    doc.text(`Student: ${attemptResult.studentName}`, 20, 40);
    doc.text(`Roll Number: ${attemptResult.studentRoll}`, 20, 48);
    doc.text(`Class: ${attemptResult.studentClass}`, 20, 56);
    doc.text(`Quiz Attempted: ${attemptResult.quizTitle}`, 20, 64);
    doc.text(`Date & Time: ${new Date(attemptResult.attemptedAt).toLocaleString()}`, 20, 72);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 80, 190, 80);

    doc.text(`Total Questions: ${attemptResult.totalQuestions}`, 20, 92);
    doc.text(`Correct Answers: ${attemptResult.correctCount}`, 20, 100);
    doc.text(`Wrong Answers: ${attemptResult.wrongCount}`, 20, 108);
    doc.text(`Unanswered Items: ${attemptResult.unansweredCount}`, 20, 116);
    doc.text(`Final Grades Score: ${attemptResult.score} / ${attemptResult.totalPossibleMarks} (${attemptResult.percentage}%)`, 20, 126);
    doc.text(`Assigned Grade: ${attemptResult.grade}`, 20, 134);
    
    doc.save(`Result-Sheet-${attemptResult.studentRoll}.pdf`);
  };

  // Helper formats
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200">
      
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Award className="h-6 w-6 text-indigo-600" id="portal-logo" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{t.studentPortal}</h1>
            <p className="text-xs text-slate-500 font-mono">Live Session Ingress</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 sm:mt-0">
          {/* LAN TOGGLER */}
          <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button
              onClick={() => setLang('en')}
              id="lang-btn-en"
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${lang === 'en' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
            >
              English
            </button>
            <button
              onClick={() => setLang('hi')}
              id="lang-btn-hi"
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${lang === 'hi' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
            >
              हिन्दी
            </button>
          </div>

          <button
            onClick={onExit}
            id="portal-exit-btn"
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all border border-slate-200"
          >
            {t.home}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">

        {/* 1. QUIZ SELECTOR HUB */}
        {!selectedQuiz && !attemptResult && (
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center sm:text-left">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t.studentPortal}</h2>
              <p className="text-slate-600 mt-2 max-w-2xl">
                {lang === 'en' 
                  ? 'Verify your active course schedule, select an eligible assessment below, register your profile credentials, and begin.'
                  : 'कक्षा परीक्षा कैलेंडर की जांच करें, नीचे उपलब्ध क्विज पर क्लिक करें, अपना विवरण दर्ज करें और परीक्षा शुरू करें।'}
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4" id="portal-loading">
                <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
                <p className="text-sm font-mono text-slate-500">Retrieving official examinee channels...</p>
              </div>
            ) : activeQuizzes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center" id="portal-no-quiz">
                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900">{lang === 'en' ? 'No Active Exams Live' : 'कोई सक्रिय परीक्षा लाइव नहीं है'}</h3>
                <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">
                  {lang === 'en'
                    ? 'Teachers have not published any assessments for today or the published period has elapsed.'
                    : 'शिक्षकों ने आज के लिए कोई क्विज प्रकाशित नहीं किया है या परीक्षा की समय सीमा समाप्त हो गई है।'}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6" id="quiz-options-grid">
                {activeQuizzes.map(quiz => (
                  <div key={quiz.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between" id={`quiz-card-${quiz.id}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full">{quiz.subject}</span>
                        <span className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full">{quiz.className}</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 leading-snug">{quiz.title}</h3>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{quiz.description || 'No description provided.'}</p>

                      <div className="grid grid-cols-2 gap-4 my-4 pt-4 border-t border-slate-100 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-xs font-mono text-slate-400 uppercase">{t.timeLimit}</p>
                          <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3.5 w-3.5 text-indigo-500" />
                            {quiz.timeLimit} mins
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-mono text-slate-400 uppercase">{t.passingMarks}</p>
                          <p className="text-sm font-bold text-slate-700 mt-0.5">{quiz.passingMarks}%</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLaunchRegister(quiz)}
                      id={`btn-launch-quiz-${quiz.id}`}
                      className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-sm transition-all text-sm uppercase tracking-wide mt-2"
                    >
                      {t.startQuiz}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. REGISTRATION CARD */}
        {selectedQuiz && !examStarted && !attemptResult && (
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <button
              onClick={() => setSelectedQuiz(null)}
              id="back-to-selector"
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              {lang === 'en' ? 'Back to exam catalog' : 'क्विज सूची पर वापस जाएं'}
            </button>

            <div className="text-center mb-6">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold uppercase">{selectedQuiz.subject}</span>
              <h3 className="text-xl font-bold text-slate-900 mt-3">{selectedQuiz.title}</h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">Registration of Attendance Identity</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.studentName} *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aryan Sharma"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  id="student-name-input"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.rollNumber} *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Roll 24"
                    value={rollNumber}
                    onChange={e => setRollNumber(e.target.value)}
                    id="student-roll-input"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.className} *</label>
                  <input
                    type="text"
                    required
                    value={studentClass}
                    onChange={e => setStudentClass(e.target.value)}
                    id="student-class-input"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.phoneOptional}</label>
                <input
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  id="student-phone-input"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm shadow-sm"
                />
              </div>

              {/* Randomization preferences */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mt-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-700">{lang === 'en' ? 'Randomize Questions' : 'प्रश्नों का क्रम बदलें'}</p>
                    <p className="text-slate-400">Rearrange standard questions layout</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={e => setRandomizeQuestions(e.target.checked)}
                    id="chk-random-questions"
                    className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <div>
                    <p className="font-semibold text-slate-700">{lang === 'en' ? 'Shuffle Options' : 'विकल्प अव्यवस्थित करें'}</p>
                    <p className="text-slate-400">Randomize A, B, C, D distribution order</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={randomizeOptions}
                    onChange={e => setRandomizeOptions(e.target.checked)}
                    id="chk-random-options"
                    className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <button
                onClick={handleStartQuiz}
                id="btn-confirm-start"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-center shadow-lg transition-all text-sm uppercase tracking-wider mt-4"
              >
                {lang === 'en' ? 'Acquire Admission Ticket & Start' : 'प्रवेश पत्र प्राप्त करें और शुरू करें'}
              </button>
            </div>
          </div>
        )}

        {/* 3. ACTIVE EXAMINATION TERMINAL */}
        {examStarted && selectedQuiz && questions.length > 0 && (
          <div className="grid lg:grid-cols-4 gap-6" id="exam-viewport">
            
            {/* Main Question Panel (3/4 widths) */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Exam floating metadata header */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="px-2.5 py-0.5 text-xs font-bold uppercase bg-indigo-50 text-indigo-700 rounded decoration-indigo-600">{selectedQuiz.subject}</span>
                  <p className="text-sm font-semibold text-slate-500 mt-1">{t.questionNumber} {currentIdx + 1} / {questions.length}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-mono text-sm font-bold ${timeLeft < 120 ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-200'}`} id="countdown-clock">
                    <Clock className="h-4 w-4" />
                    {formatTime(timeLeft)}
                  </div>
                  <button
                    onClick={toggleFullscreen}
                    title="Fullscreen Toggle"
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                  >
                    <Eye className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Question Text Box */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <span className="text-xs font-bold text-slate-400 font-mono">MARKS: +{questions[currentIdx].marks} | NEG: -{questions[currentIdx].negativeMarks}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${questions[currentIdx].difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700' : questions[currentIdx].difficulty === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{questions[currentIdx].difficulty}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-normal" id="question-prompt">
                    {questions[currentIdx].questionText}
                  </h3>
                </div>

                {/* Options list selection box */}
                <div className="space-y-3.5" id="choices-list">
                  {questions[currentIdx].options.map((opt, i) => {
                    const optsMap = optionsOrderRef.current[questions[currentIdx].id] || [];
                    const displayIndex = optsMap[i] !== undefined ? optsMap[i] : i;
                    const letter = String.fromCharCode(65 + i);

                    const isSelected = selectedAnswers[questions[currentIdx].id] === i;

                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedAnswers(prev => ({
                            ...prev,
                            [questions[currentIdx].id]: i
                          }));
                        }}
                        id={`option-btn-${i}`}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3.5 cursor-pointer ${isSelected ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-medium' : 'border-slate-200 hover:bg-slate-50'}`}
                      >
                        <div className={`mt-0.5 h-6 w-6 rounded-lg flex items-center justify-center font-mono font-bold text-sm border-2 ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-600 bg-slate-50'}`}>
                          {letter}
                        </div>
                        <span className="text-base flex-1 pt-0.5">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Clear Answer Anchor */}
                {selectedAnswers[questions[currentIdx].id] !== undefined && (
                  <button
                    onClick={() => {
                      setSelectedAnswers(prev => {
                        const copy = { ...prev };
                        delete copy[questions[currentIdx].id];
                        return copy;
                      });
                    }}
                    id="btn-clear-selection"
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                  >
                    Clear answer selection
                  </button>
                )}
              </div>

              {/* Progress and bottom Navigation */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentIdx === 0}
                  id="btn-nav-prev"
                  className="px-5 py-3 border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold rounded-xl text-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t.prev}
                </button>

                {/* Mark/Flag element */}
                <button
                  onClick={() => {
                    const qId = questions[currentIdx].id;
                    setFlaggedQuestions(prev => ({
                      ...prev,
                      [qId]: !prev[qId]
                    }));
                  }}
                  id="btn-flag-review"
                  className={`px-5 py-3 font-semibold rounded-xl text-sm transition-all border cursor-pointer ${flaggedQuestions[questions[currentIdx].id] ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                >
                  {flaggedQuestions[questions[currentIdx].id] ? t.unmarkForReview : t.markForReview}
                </button>

                {currentIdx < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                    id="btn-nav-next"
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {t.next}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
                    id="btn-nav-submit"
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-md"
                  >
                    {t.submitQuiz}
                  </button>
                )}
              </div>

            </div>

            {/* Sidebar question grid map (1/4 width) */}
            <div className="space-y-6">
              
              {/* Stats card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono">Exam Dashboard Map</h4>

                <div className="grid grid-cols-2 gap-3 text-center text-xs">
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                    <p className="font-mono text-lg font-bold text-indigo-600">{Object.keys(selectedAnswers).length}</p>
                    <p className="text-slate-400 lowercase italic">Answered</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                    <p className="font-mono text-lg font-bold text-amber-500">{Object.keys(flaggedQuestions).filter(k => flaggedQuestions[k]).length}</p>
                    <p className="text-slate-400 lowercase italic">Flagged</p>
                  </div>
                </div>

                {/* Progress ratio */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs text-slate-500 font-medium font-mono">
                    <span>Progress Tracker</span>
                    <span>{Math.round((Object.keys(selectedAnswers).length / questions.length) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${(Object.keys(selectedAnswers).length / questions.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Grid Box */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <p className="text-xs font-bold text-slate-500 font-mono">Jump to Question:</p>
                <div className="grid grid-cols-5 gap-2" id="gridmap-keys">
                  {questions.map((q, idx) => {
                    const isAnswered = selectedAnswers[q.id] !== undefined;
                    const isFlagged = flaggedQuestions[q.id];
                    const isActive = currentIdx === idx;

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIdx(idx)}
                        id={`grid-key-${idx}`}
                        className={`aspect-square rounded-xl text-center text-sm font-bold flex items-center justify-center transition-all cursor-pointer ${isActive ? 'ring-2 ring-indigo-600 text-indigo-600 font-extrabold scale-105' : ''} ${isFlagged ? 'bg-amber-100 text-amber-800 border border-amber-300' : isAnswered ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Immediate Exit Prompt danger */}
              <button
                onClick={() => {
                  if (confirm('Warning: progress will be lost and exam will fail if you exit now.')) {
                    setExamStarted(false);
                    setSelectedQuiz(null);
                  }
                }}
                className="w-full text-center text-xs text-rose-500 hover:text-rose-700 font-bold"
              >
                Abort assessment and exit
              </button>

            </div>

          </div>
        )}

        {/* 4. SUBMIT CONFIRMATION MODAL */}
        {showSubmitConfirm && selectedQuiz && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-transparent backdrop-blur-md transition-all">
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl mx-4 relative">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center space-y-4">
                <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{t.confirmSubmit}</h3>
                <p className="text-sm text-slate-500">
                  {t.areYouSureSubmit}
                </p>

                {/* Submits stats check */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-left text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>Total Questions:</span>
                    <span className="font-bold">{questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Answered:</span>
                    <span className="font-bold text-indigo-600">{Object.keys(selectedAnswers).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unanswered leftover:</span>
                    <span className={`font-bold ${questions.length - Object.keys(selectedAnswers).length > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {questions.length - Object.keys(selectedAnswers).length}
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => setShowSubmitConfirm(false)}
                    id="modal-cancel-submit"
                    className="flex-1 py-3 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Go Back / Review
                  </button>
                  <button
                    onClick={() => handleSubmitExam(false)}
                    id="modal-confirm-submit"
                    className="flex-1 py-3 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all cursor-pointer shadow-md"
                  >
                    {t.submitQuiz}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. VISUALLY SPLENDID GRADED REPORT SHEET */}
        {attemptResult && (
          <div className="space-y-8" id="result-page-view">
            
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1.5 text-center md:text-left">
                <span className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded ${attemptResult.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {attemptResult.passed ? 'PASSED / उत्तीर्ण' : 'FAILED / अनुत्तीर्ण'}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t.resultTitle}</h2>
                <p className="text-slate-500 text-sm font-mono">{attemptResult.studentName} | Roll: {attemptResult.studentRoll} | Class: {attemptResult.studentClass}</p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {attemptResult.passed && (
                  <button
                    onClick={generateCertificate}
                    id="btn-cert-certificate"
                    className="flex items-center gap-1.5 px-4.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all shadow cursor-pointer uppercase tracking-wider"
                  >
                    <Award className="h-4.5 w-4.5" />
                    {t.downloadCertificate}
                  </button>
                )}
                <button
                  onClick={generateTranscript}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow cursor-pointer"
                >
                  <FileText className="h-4.5 w-4.5" />
                  {t.downloadPdf}
                </button>
                <button
                  onClick={() => window.print()}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-all"
                  title="Print results page"
                >
                  <Printer className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Score grids statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="results-analytics-cards">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center shadow-sm">
                <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wide">FINAL SCORE</p>
                <p className="text-3xl font-black text-indigo-600 mt-1">{attemptResult.score}<span className="text-sm text-slate-400 font-normal"> / {attemptResult.totalPossibleMarks} Marks</span></p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">({attemptResult.percentage}%)</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center shadow-sm">
                <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wide">GRADE AWARDED</p>
                <p className="text-4.5xl font-black text-slate-900 mt-0.5">{attemptResult.grade}</p>
                <p className="text-xs text-slate-500 font-semibold uppercase mt-0.5">{t.status}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center shadow-sm">
                <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wide">COMPILATION MAP</p>
                <div className="flex justify-center items-center gap-2 text-xs font-bold font-mono mt-2.5">
                  <span className="text-emerald-600">{attemptResult.correctCount}✔</span>
                  <span className="text-rose-600">{attemptResult.wrongCount}✘</span>
                  <span className="text-slate-400">{attemptResult.unansweredCount}❓</span>
                </div>
                <p className="text-[10px] text-slate-400 italic lowercase font-normal mt-2">Questions count: {attemptResult.totalQuestions}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center shadow-sm">
                <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wide">EXAM RANKING</p>
                <p className="text-3.5xl font-black text-indigo-600 mt-1">#{attemptResult.rank || '1'}</p>
                <p className="text-xs text-slate-400 italic">Position on classroom deck</p>
              </div>

            </div>

            {/* Educational reviews feedback box */}
            <div className="grid lg:grid-cols-3 gap-8">
              
              {/* Question list review (2/3 col) */}
              <div className="lg:col-span-2 space-y-6">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight border-b border-slate-200 pb-2">Verification & Explanations Index</h3>
                
                {questions.map((q, idx) => {
                  const studentPick = attemptResult.answers[q.id];
                  const wasAnswered = studentPick !== undefined && studentPick !== -1 && studentPick !== null;
                  const isCorrect = wasAnswered && Number(studentPick) === q.correctOption;

                  return (
                    <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                      
                      {/* Badge stats */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <span className="text-xs font-bold text-slate-400 font-mono">QUESTION {idx + 1}</span>
                        {wasAnswered ? (
                          isCorrect ? (
                            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded flex items-center gap-1">✔ CORRECT</span>
                          ) : (
                            <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded flex items-center gap-1">✘ INCORRECT</span>
                          )
                        ) : (
                          <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 rounded">UNANSWERED</span>
                        )}
                      </div>

                      <h4 className="text-base sm:text-lg font-bold text-slate-900">{q.questionText}</h4>

                      {/* Displaying options */}
                      <div className="space-y-2">
                        {q.options.map((opt, oIdx) => {
                          const isOptionCorrect = oIdx === q.correctOption;
                          const wasSelectedByStudent = Number(studentPick) === oIdx;

                          let choiceStyle = 'border-slate-100 bg-slate-50 text-slate-600';
                          if (isOptionCorrect) {
                            choiceStyle = 'border-emerald-300 bg-emerald-50 text-emerald-950 font-semibold';
                          } else if (wasSelectedByStudent && !isCorrect) {
                            choiceStyle = 'border-rose-300 bg-rose-50 text-rose-950';
                          }

                          return (
                            <div key={oIdx} className={`p-3.5 rounded-xl border text-sm flex items-start gap-3 ${choiceStyle}`}>
                              <span className="font-mono font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                              <span className="flex-1">{opt}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Scientific AI-Explanation */}
                      <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-xs text-slate-700 leading-relaxed">
                        <p className="font-bold text-indigo-950 uppercase tracking-wide mb-1 font-mono">Expert Explanation:</p>
                        {q.explanation || 'No explanations provided by examiner.'}
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Sidebar score boards (1/3 col) */}
              <div className="space-y-6">
                
                {/* Congratulations ribbon card */}
                <div className="bg-gradient-to-br from-indigo-950 to-slate-900 p-6 rounded-2xl text-white border border-indigo-950 relative overflow-hidden shadow">
                  <div className="absolute top-0 right-0 p-8 opacity-10 uppercase text-9xl font-black">
                    {attemptResult.passed ? '🏆' : '📚'}
                  </div>
                  
                  <h4 className="text-lg font-bold tracking-tight">
                    {attemptResult.passed ? 'Congratulations!' : 'Keep Practicing!'}
                  </h4>
                  <p className="text-xs text-indigo-300 mt-2 leading-relaxed">
                    {attemptResult.passed ? t.feedbackPassed : t.feedbackFailed}
                  </p>
                </div>

                {/* Scoreboards lists */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Top Performance Deck
                  </h4>

                  <div className="space-y-3">
                    {leaderboard.map((lead, idx) => {
                      const isCurrent = lead.studentRoll === attemptResult.studentRoll;

                      return (
                        <div key={lead.id} className={`p-3 rounded-lg border flex items-center justify-between text-xs ${isCurrent ? 'bg-indigo-50 border-indigo-300 font-semibold' : 'border-slate-100 bg-slate-50'}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-400">#{idx + 1}</span>
                            <div>
                              <p className="text-slate-800 font-bold">{lead.studentName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">Roll: {lead.studentRoll}</p>
                            </div>
                          </div>
                          <span className="font-bold text-indigo-600">{lead.score}/{lead.totalPossibleMarks} Marks</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setAttemptResult(null);
                    setSelectedQuiz(null);
                  }}
                  id="btn-return-selector"
                  className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl text-sm transition-all shadow hover:bg-slate-800 text-center block"
                >
                  Return to Dashboard
                </button>

              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}
