import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { RequireRole } from './components/RequireRole';
import { TeacherLayout } from './layouts/TeacherLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { QuizzesPage } from './pages/QuizzesPage';
import { QuizEditorPage } from './pages/QuizEditorPage';
import { TeacherLiveSelectPage } from './pages/TeacherLiveSelectPage';
import { TeacherLivePage } from './pages/TeacherLivePage';
import { TeacherAnalyticsPage } from './pages/TeacherAnalyticsPage';
import { TeacherAnalyticsDetailPage } from './pages/TeacherAnalyticsDetailPage';
import { ImportQuestionsPage } from './pages/ImportQuestionsPage';
import { QuestionBankPage } from './pages/QuestionBankPage';
import { TeacherAIPage } from './pages/TeacherAIPage';
import { StudentLivePage } from './pages/StudentLivePage';
import { StudentReportsPage } from './pages/StudentReportsPage';
import { StudentResultsPage } from './pages/StudentResultsPage';
import { IS_DEMO } from './services/api';

export default function App() {
  // For GitHub Pages project site https://<username>.github.io/BrainArena/
  const basename = import.meta.env.BASE_URL !== '/' ? import.meta.env.BASE_URL.replace(/\/$/, '') : undefined;
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename={basename}>
        {IS_DEMO && (
          <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-amber-500/95 px-4 py-1.5 text-center text-[12px] font-semibold text-amber-950">
            DEMO MODE — no backend connected. Data is mocked locally and not saved. Set VITE_API_URL to enable live features.
          </div>
        )}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/teacher"
            element={
              <RequireRole role="teacher">
                <TeacherLayout />
              </RequireRole>
            }
          >
            <Route index element={<TeacherDashboard />} />
            <Route path="quizzes" element={<QuizzesPage />} />
            <Route path="quizzes/:id" element={<QuizEditorPage />} />
            <Route path="import" element={<ImportQuestionsPage />} />
            <Route path="question-bank" element={<QuestionBankPage />} />
            <Route path="ai" element={<TeacherAIPage />} />
            <Route path="live" element={<TeacherLiveSelectPage />} />
            <Route path="live/:quizId" element={<TeacherLivePage />} />
            <Route path="analytics" element={<TeacherAnalyticsPage />} />
            <Route path="analytics/:quizId" element={<TeacherAnalyticsDetailPage />} />
          </Route>

          <Route
            path="/student"
            element={
              <RequireRole role="student">
                <StudentLayout />
              </RequireRole>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="join" element={<StudentLivePage />} />
            <Route path="reports" element={<StudentReportsPage />} />
            <Route path="results/:resultId" element={<StudentResultsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
