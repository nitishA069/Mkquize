export interface LanguageMap {
  title: string;
  subtitle: string;
  adminLogin: string;
  studentPortal: string;
  adminDashboard: string;
  email: string;
  password: string;
  login: string;
  logout: string;
  hindi: string;
  english: string;
  uploadQuiz: string;
  totalQuizzes: string;
  totalStudents: string;
  totalAttempts: string;
  avgScore: string;
  passRate: string;
  quizzes: string;
  students: string;
  attempts: string;
  leaderboard: string;
  analytics: string;
  auditLogs: string;
  createQuiz: string;
  selectLanguage: string;
  titlePlaceholder: string;
  subject: string;
  className: string;
  timeLimit: string;
  passingMarks: string;
  publishDate: string;
  expiryDate: string;
  description: string;
  extractPdf: string;
  reviewQuestions: string;
  publish: string;
  unpublish: string;
  edit: string;
  delete: string;
  duplicate: string;
  actions: string;
  status: string;
  published: string;
  draft: string;
  noQuizzes: string;
  studentName: string;
  rollNumber: string;
  phoneOptional: string;
  startQuiz: string;
  quizPortal: string;
  questionNumber: string;
  timeLeft: string;
  submitQuiz: string;
  confirmSubmit: string;
  areYouSureSubmit: string;
  next: string;
  prev: string;
  markForReview: string;
  unmarkForReview: string;
  resultTitle: string;
  score: string;
  correct: string;
  wrong: string;
  unanswered: string;
  percentage: string;
  grade: string;
  rank: string;
  downloadCertificate: string;
  downloadPdf: string;
  printResult: string;
  home: string;
  feedbackPassed: string;
  feedbackFailed: string;
  easy: string;
  medium: string;
  hard: string;
  difficulty: string;
  explanation: string;
  correctAnswer: string;
  options: string;
  tags: string;
  reviewsNeeded: string;
  bulkUpload: string;
  backupRestore: string;
  backupSuccess: string;
  restoreSuccess: string;
  weakQuestions: string;
  topPerformers: string;
}

export type LanguageType = 'en' | 'hi';

export const translations: Record<LanguageType, LanguageMap> = {
  en: {
    title: "Smart Quiz Platform for Teachers",
    subtitle: "Automated Quiz Generator & Result Hub",
    adminLogin: "Teacher Login",
    studentPortal: "Student Quiz Portal",
    adminDashboard: "Teacher Console",
    email: "Email Address",
    password: "Password",
    login: "Log In",
    logout: "Sign Out",
    hindi: "हिन्दी",
    english: "English",
    uploadQuiz: "Generate Quiz from PDF",
    totalQuizzes: "Total Quizzes",
    totalStudents: "Active Students",
    totalAttempts: "Total Submissions",
    avgScore: "Average Score",
    passRate: "Passing Rate",
    quizzes: "Quizzes",
    students: "Students",
    attempts: "Quiz Attempts",
    leaderboard: "Leaderboard",
    analytics: "Deep Insights",
    auditLogs: "Audit Trail",
    createQuiz: "Create Quiz Parameters",
    selectLanguage: "Select Language Mode",
    titlePlaceholder: "Enter Quiz Title",
    subject: "Subject",
    className: "Class / Section",
    timeLimit: "Time Limit (Minutes)",
    passingMarks: "Passing Score (%)",
    publishDate: "Publish Date",
    expiryDate: "Expiry Date",
    description: "Brief Description",
    extractPdf: "Extract & Generate Quiz",
    reviewQuestions: "Verify Generated Questions",
    publish: "Publish Assessment",
    unpublish: "Revert to Draft",
    edit: "Edit Question",
    delete: "Remove",
    duplicate: "Duplicate",
    actions: "Actions",
    status: "Status",
    published: "Active / Live",
    draft: "In Review / Draft",
    noQuizzes: "No quizzes available yet. Generate or make one!",
    studentName: "Student Full Name",
    rollNumber: "Roll / ID Number",
    phoneOptional: "Phone Number (Optional)",
    startQuiz: "Enter Examination Room",
    quizPortal: "Interactive Examination",
    questionNumber: "Question",
    timeLeft: "Time Remaining",
    submitQuiz: "Submit Answers",
    confirmSubmit: "Confirm Submission",
    areYouSureSubmit: "Are you sure you want to finalize and submit your assessment?",
    next: "Next Question",
    prev: "Previous",
    markForReview: "Flag for Review",
    unmarkForReview: "Unflag Question",
    resultTitle: "Quiz Performance scorecard",
    score: "Marks Obtained",
    correct: "Correct Answers",
    wrong: "Incorrect Answers",
    unanswered: "Left Unanswered",
    percentage: "Percentage Marks",
    grade: "Performance Grade",
    rank: "Standard Class Rank",
    downloadCertificate: "Generate Passing Certificate",
    downloadPdf: "Download Score Sheet",
    printResult: "Print Transcript",
    home: "Back to Home",
    feedbackPassed: "Excellent! You have successfully passed the assessment.",
    feedbackFailed: "You did not achieve the passing score. Keep practicing and try again!",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    difficulty: "Difficulty",
    explanation: "Feedback Explanation",
    correctAnswer: "Verified Key",
    options: "Choices",
    tags: "Topic Tags",
    reviewsNeeded: "Requires Correction",
    bulkUpload: "Bulk Upload (PDF Series)",
    backupRestore: "System Backup & Restore",
    backupSuccess: "Database checkpoint successfully backed up!",
    restoreSuccess: "System successfully restored from backup!",
    weakQuestions: "Weak Topics / FAQs",
    topPerformers: "Top Scorers",
  },
  hi: {
    title: "शिक्षकों के लिए स्मार्ट क्विज प्लेटफॉर्म",
    subtitle: "स्वचालित क्विज जनरेटर और परिणाम केंद्र",
    adminLogin: "शिक्षक लॉगिन",
    studentPortal: "छात्र क्विज पोर्टल",
    adminDashboard: "शिक्षक कंसोल",
    email: "ईमेल पता",
    password: "पासवर्ड",
    login: "लॉग इन करें",
    logout: "साइन आउट",
    hindi: "हिन्दी",
    english: "English",
    uploadQuiz: "PDF से क्विज बनाएं",
    totalQuizzes: "कुल क्विज",
    totalStudents: "सक्रिय छात्र",
    totalAttempts: "कुल सबमिशन",
    avgScore: "औसत स्कोर",
    passRate: "उत्तीर्ण दर",
    quizzes: "क्विज",
    students: "विद्यार्थी",
    attempts: "क्विज प्रयास",
    leaderboard: "लीडरबोर्ड",
    analytics: "गहन विश्लेषण",
    auditLogs: "ऑडिट लॉग",
    createQuiz: "क्विज मापदंडों का निर्धारण",
    selectLanguage: "भाषा मोड चुनें",
    titlePlaceholder: "क्विज का शीर्षक दर्ज करें",
    subject: "विषय",
    className: "कक्षा / अनुभाग",
    timeLimit: "समय सीमा (मिनट)",
    passingMarks: "न्यूनतम उत्तीर्ण अंक (%)",
    publishDate: "प्रकाशन तिथि",
    expiryDate: "समाप्ति तिथि",
    description: "संक्षिप्त विवरण",
    extractPdf: "निकालें और क्विज बनाएं",
    reviewQuestions: "उत्पन्न प्रश्नों की समीक्षा करें",
    publish: "क्विज प्रकाशित करें",
    unpublish: "ड्राफ्ट में वापस लें",
    edit: "प्रश्न संपादित करें",
    delete: "हटाएं",
    duplicate: "समान प्रतिलिपि बनाएं",
    actions: "कार्रवाई",
    status: "स्थिति",
    published: "सक्रिय / लाइव",
    draft: "समीक्षा के अधीन / ड्राफ्ट",
    noQuizzes: "अभी तक कोई क्विज उपलब्ध नहीं है। एक बनाएं!",
    studentName: "छात्र का पूरा नाम",
    rollNumber: "रोल / आईडी नंबर",
    phoneOptional: "फोन नंबर (वैकल्पिक)",
    startQuiz: "परीक्षा कक्ष में प्रवेश करें",
    quizPortal: "इंटरैक्टिव परीक्षा",
    questionNumber: "प्रश्न",
    timeLeft: "शेष समय",
    submitQuiz: "उत्तर जमा करें",
    confirmSubmit: "जमा करने की पुष्टि करें",
    areYouSureSubmit: "क्या आप वाकई अपने मूल्यांकन को अंतिम रूप देकर जमा करना चाहते हैं?",
    next: "अगला प्रश्न",
    prev: "पिछला",
    markForReview: "समीक्षा के लिए चिह्नित करें",
    unmarkForReview: "चिह्न हटाएँ",
    resultTitle: "क्विज प्रदर्शन स्कोरकार्ड",
    score: "प्राप्त अंक",
    correct: "सही उत्तर",
    wrong: "गलत उत्तर",
    unanswered: "बिना उत्तर छोड़े गए",
    percentage: "प्राप्त प्रतिशत",
    grade: "प्रदर्शन ग्रेड",
    rank: "कक्षा रैंक",
    downloadCertificate: "उत्तीर्ण प्रमाण पत्र बनाएं",
    downloadPdf: "स्कोर शीट डाउनलोड करें",
    printResult: "ट्रांसक्रिप्ट प्रिंट करें",
    home: "मुख्य पृष्ठ पर जाएं",
    feedbackPassed: "उत्कृष्ट! आपने सफलतापूर्वक परीक्षा उत्तीर्ण की है।",
    feedbackFailed: "आपने उत्तीर्ण अंक प्राप्त नहीं किए। अभ्यास जारी रखें!",
    easy: "सरल",
    medium: "मध्यम",
    hard: "कठिन",
    difficulty: "कठिनाई स्तर",
    explanation: "प्रतिक्रिया स्पष्टीकरण",
    correctAnswer: "सत्यापित उत्तर",
    options: "विकल्प",
    tags: "विषय टैग",
    reviewsNeeded: "संशोधन की आवश्यकता है",
    bulkUpload: "बल्क पीडीएफ अपलोड",
    backupRestore: "सिस्टम बैकअप और पुनर्स्थापना",
    backupSuccess: "डेटाबेस बैकअप सफलतापूर्वक सहेज लिया गया!",
    restoreSuccess: "सिस्टम सफलतापूर्वक पुनर्स्थापित कर लिया गया!",
    weakQuestions: "कमजोर विषय / अक्सर पूछे जाने वाले प्रश्न",
    topPerformers: "शीर्ष स्कोरर",
  }
};
