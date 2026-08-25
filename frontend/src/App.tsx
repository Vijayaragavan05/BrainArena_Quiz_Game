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

export default function App() {
  // For GitHub Pages project site https://<username>.github.io/BrainArena/
  const basename = import.meta.env.BASE_URL !== '/' ? import.meta.env.BASE_URL.replace(/\/$/, '') : undefined;
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename={basename}>
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
