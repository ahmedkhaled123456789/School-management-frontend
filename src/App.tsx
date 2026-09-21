import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { Toaster } from 'sonner';
import { SessionWatcher } from './components/auth/SessionWatcher';
import { store } from './store';
import { queryClient } from './lib/queryClient';
import { NotFoundPage, ProtectedRoute, RoleRedirect } from './components/auth/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { TeacherLayout } from './components/layout/TeacherLayout';
import { StudentLayout } from './components/layout/StudentLayout';
import { LoginPage } from './pages/Login';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminStudents } from './pages/admin/Students';
import { AdminStudentDetail } from './pages/admin/StudentDetail';
import { AdminTeachers } from './pages/admin/Teachers';
import { AdminTeacherDetail } from './pages/admin/TeacherDetail';
import { AdminPrograms } from './pages/admin/Programs';
import { AdminSubjects } from './pages/admin/Subjects';
import { AdminClassLevels } from './pages/admin/ClassLevels';
import { AdminAcademicYears } from './pages/admin/AcademicYears';
import { AdminAcademicTerms } from './pages/admin/AcademicTerms';
import { AdminYearGroups } from './pages/admin/YearGroups';
import { AdminExamResults } from './pages/admin/ExamResults';
import { AdminProfile } from './pages/admin/Profile';
import { AdminParents } from './pages/admin/Parents';
import { AdminFeesGroups } from './pages/admin/FeesGroups';
import { AdminExpenses } from './pages/admin/Expenses';
import { TeacherDashboard } from './pages/teacher/Dashboard';
import { TeacherExams } from './pages/teacher/Exams';
import { TeacherExamBuilder } from './pages/teacher/ExamBuilder';
import { TeacherExamDetail } from './pages/teacher/ExamDetail';
import { TeacherQuestions } from './pages/teacher/Questions';
import { TeacherProfile } from './pages/teacher/Profile';
import { StudentDashboard } from './pages/student/Dashboard';
import { StudentProfilePage } from './pages/student/Profile';
import { StudentExams } from './pages/student/Exams';
import { StudentExamRunner } from './pages/student/ExamRunner';
import { StudentResults } from './pages/student/Results';
import { StudentResultDetail } from './pages/student/ResultDetail';

export function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SessionWatcher>
          <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{ style: { fontFamily: '"Plus Jakarta Sans", sans-serif' } }} />
            
          <Routes>
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/:role" element={<LoginPage />} />

            {/* Admin */}
            <Route element={<ProtectedRoute allow="admin" />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="students" element={<AdminStudents />} />
                <Route path="students/:studentID" element={<AdminStudentDetail />} />
                <Route path="teachers" element={<AdminTeachers />} />
                <Route path="teachers/:teacherID" element={<AdminTeacherDetail />} />
                <Route path="programs" element={<AdminPrograms />} />
                <Route path="subjects" element={<AdminSubjects />} />
                <Route path="classes" element={<AdminClassLevels />} />
                <Route path="academic-years" element={<AdminAcademicYears />} />
                <Route path="academic-terms" element={<AdminAcademicTerms />} />
                <Route path="year-groups" element={<AdminYearGroups />} />
                <Route path="exam-results" element={<AdminExamResults />} />
                <Route path="profile" element={<AdminProfile />} />
                <Route path="parents" element={<AdminParents />} />
                <Route path="fees-groups" element={<AdminFeesGroups />} />
                <Route path="expenses" element={<AdminExpenses />} />
              </Route>
            </Route>

            {/* Teacher */}
            <Route element={<ProtectedRoute allow="teacher" />}>
              <Route path="/teacher" element={<TeacherLayout />}>
                <Route index element={<TeacherDashboard />} />
                <Route path="exams" element={<TeacherExams />} />
                <Route path="exams/new" element={<TeacherExamBuilder />} />
                <Route path="exams/:examID" element={<TeacherExamDetail />} />
                <Route path="questions" element={<TeacherQuestions />} />
                <Route path="profile" element={<TeacherProfile />} />
              </Route>
            </Route>

            {/* Student */}
            <Route element={<ProtectedRoute allow="student" />}>
              {/* Distraction-free exam runner lives outside the dashboard chrome. */}
              <Route path="/student/exams/:examID/take" element={<StudentExamRunner />} />
              <Route path="/student" element={<StudentLayout />}>
                <Route index element={<StudentDashboard />} />
                <Route path="profile" element={<StudentProfilePage />} />
                <Route path="exams" element={<StudentExams />} />
                <Route path="results" element={<StudentResults />} />
                <Route path="results/:resultID" element={<StudentResultDetail />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </SessionWatcher>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>);

}