import { useState, useEffect } from 'react';
import { translations, LanguageType } from './translations';
import AdminConsole from './components/AdminConsole';
import QuizPortal from './components/QuizPortal';
import { motion, AnimatePresence } from 'motion/react';
import { Award, BookOpen, Sun, Moon, HelpCircle } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<LanguageType>('en');
  const [darkMode, setDarkMode] = useState(false);
  
  // 'landing' | 'admin' | 'student'
  const [view, setView] = useState<'landing' | 'admin' | 'student'>('landing');

  const t = translations[lang];

  // Sync dark class on document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className={`min-h-screen transition-colors duration-350 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans antialiased`}>
      
      {/* 1. SEAMLESS RECEPTION DECK / LANDING VIEW */}
      {view === 'landing' && (
        <div className="min-h-screen flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          
          {/* Subtle grid background effects */}
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40" />

          {/* Top header navigation widgets */}
          <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-200/50 dark:border-slate-800/50 z-10">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-md border border-indigo-500">
                Q
              </div>
              <span className="font-extrabold tracking-tight text-base font-mono uppercase">Smart Quiz Platform</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Language Selector */}
              <div className="flex bg-slate-200/50 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-350 dark:border-slate-700/50 text-xs font-bold font-mono">
                <button
                  onClick={() => setLang('en')}
                  className={`px-2 py-1 rounded-md transition-all ${lang === 'en' ? 'bg-white dark:bg-slate-750 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-850'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang('hi')}
                  className={`px-2 py-1 rounded-md transition-all ${lang === 'hi' ? 'bg-white dark:bg-slate-750 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-850'}`}
                >
                  हिन्दी
                </button>
              </div>

              {/* Theme Selector Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 bg-slate-200/50 dark:bg-slate-800 border border-slate-350 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 rounded-lg shadow-sm hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                title="Theme Toggle"
              >
                {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </button>
            </div>
          </header>

          {/* Main content body panel */}
          <main className="max-w-4xl w-full mx-auto flex flex-col items-center justify-center text-center py-12 z-10">
            
            {/* Visual intro decorations */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/40 rounded-full text-xs font-bold font-mono uppercase tracking-wide">
                <Award className="h-3.5 w-3.5" />
                V2.5 Stable Classroom Environment
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
                {t.title}
              </h1>
              
              <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium">
                {t.subtitle}
              </p>
            </motion.div>

            {/* Ingress Selector Portal Cards */}
            <div className="grid sm:grid-cols-2 gap-6 w-full max-w-2xl mt-12">
              
              {/* Teacher Console Target */}
              <motion.button
                whileHover={{ y: -6, scale: 1.01 }}
                onClick={() => setView('admin')}
                id="landing-btn-teacher"
                className="flex flex-col text-left p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all card-choice cursor-pointer"
              >
                <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/40 rounded-xl flex items-center justify-center mb-6">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.adminDashboard}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed pointer-events-none">
                  {lang === 'en'
                    ? 'Upload digital action notes or assessment papers in PDF, run optical character-generation, manage school exams calendars, and generate analytics.'
                    : 'मूल्यांकन पत्र पीडीएफ या चित्र अपलोड करें, स्वचालित व्याकरण परीक्षण बनाएं, कक्षा परीक्षा कार्यक्रमों का प्रबंधन करें और परिणाम विश्लेषण देखें।'}
                </p>
              </motion.button>

              {/* Student Portal Target */}
              <motion.button
                whileHover={{ y: -6, scale: 1.01 }}
                onClick={() => setView('student')}
                id="landing-btn-student"
                className="flex flex-col text-left p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all card-choice cursor-pointer"
              >
                <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/40 rounded-xl flex items-center justify-center mb-6">
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.studentPortal}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed pointer-events-none">
                  {lang === 'en'
                    ? 'Access live examinations, answer interactive multiple-choice questions with auto-saves, receive instant grates sheets, and print certificates.'
                    : 'सक्रिय परीक्षाओं तक पहुंचें, त्वरित मूल्यांकन के साथ बहुविकल्पीय प्रश्नों के उत्तर दें, और अपनी रिपोर्ट तथा उत्तीर्ण प्रमाणपत्र मुद्रित करें।'}
                </p>
              </motion.button>

            </div>

            {/* Quick credentials details helper text */}
            <div className="mt-10 p-3 px-4 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/65 dark:border-slate-800 text-slate-400 text-xs font-mono flex items-center gap-1.5 shadow-sm max-w-sm">
              <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
              <span>DEFAULT ADMIN: admin@example.com / Admin@123</span>
            </div>

          </main>

          {/* Symmetrical footer copyright credits */}
          <footer className="w-full max-w-4xl mx-auto text-center border-t border-slate-200/50 dark:border-slate-800/50 pt-4 text-[10px] text-slate-400/80 font-mono uppercase tracking-widest z-10">
            Smart Quiz Platform • Powered by Antigravity Full-Stack Run container
          </footer>

        </div>
      )}

      {/* 2. ADMIN PANEL INTERFACE VIEW */}
      {view === 'admin' && (
        <AdminConsole lang={lang} setLang={setLang} onExit={() => setView('landing')} />
      )}

      {/* 3. STUDENT EXAMINATION PLATFORM VIEW */}
      {view === 'student' && (
        <QuizPortal lang={lang} setLang={setLang} onExit={() => setView('landing')} />
      )}

    </div>
  );
}
