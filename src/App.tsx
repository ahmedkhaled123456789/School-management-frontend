import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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
import { AdminHome, AdminOrStaffProfile } from './pages/admin/StaffHome';
import { AdminAdministrators } from './pages/admin/Administrators';
import { AdminStaff } from './pages/admin/Staff';
import { AdminAuditLog } from './pages/admin/AuditLog';
import { AdminSettings } from './pages/admin/Settings';
import { RequirePermission } from './components/auth/RequirePermission';
import { PERMISSIONS } from './lib/permissions';
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
import { AdminParents } from './pages/admin/Parents';
import { AdminExpenses } from './pages/admin/Expenses';
import { AdminSections } from './pages/admin/academics/Sections';
import { AdminSectionDetail } from './pages/admin/academics/SectionDetail';
import { AdminTimetable } from './pages/admin/academics/Timetable';
import { AdminRooms } from './pages/admin/academics/Rooms';
import { AdminSchoolDay } from './pages/admin/academics/SchoolDay';
import { TeacherTimetable } from './pages/teacher/Timetable';
import { TeacherMySections } from './pages/teacher/MySections';
import { StudentTimetablePage } from './pages/student/Timetable';
import { MockDbSync } from './components/sections/MockDbSync';
import { AdminReports } from './pages/admin/reports/Reports';
import { AdminBranding } from './pages/admin/Branding';
import { BrandingProvider } from './components/branding/BrandingProvider';
import { AdminInvoices } from './pages/admin/finance/Invoices';
import { AdminInvoiceDetail } from './pages/admin/finance/InvoiceDetail';
import { AdminPayments } from './pages/admin/finance/Payments';
import { AdminFinanceReports } from './pages/admin/finance/Reports';
import { AdminFeeStructures } from './pages/admin/finance/FeeStructures';
import { AdminFeeItems } from './pages/admin/finance/FeeItems';
import { AdminDiscounts } from './pages/admin/finance/Discounts';
import { AdminInvoicePrint, AdminReceiptPrint, ParentInvoicePrint, ParentReceiptPrint } from './pages/print/FinancePrint';
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
import { ParentLayout } from './components/layout/ParentLayout';
import { ParentDashboard } from './pages/parent/Dashboard';
import { ParentChildDetail } from './pages/parent/ChildDetail';
import { ParentProfilePage } from './pages/parent/Profile';
import { ModulePlaceholder } from './pages/ModulePlaceholder';
import { AdminAttendance } from './pages/admin/attendance/Attendance';
import { AdminAttendanceGate } from './pages/admin/attendance/Gate';
import { RegisterPage } from './pages/attendance/RegisterPage';
import { AdminStaffAttendance } from './pages/admin/hr/StaffAttendance';
import { AdminHealth } from './pages/admin/health/Health';
import { AdminStudentHealth } from './pages/admin/health/StudentHealth';
import { TeacherAttendance } from './pages/teacher/Attendance';
import { StudentAttendancePage } from './pages/student/Attendance';
import { ParentAttendancePage } from './pages/parent/Attendance';
import { InboxPage } from './pages/communication/Inbox';
import { AdminAnnouncements } from './pages/admin/communication/Announcements';
import { AdminOutbox } from './pages/admin/communication/Outbox';
import { AdminEvents } from './pages/admin/events/Events';
import { AdminEventDetail } from './pages/admin/events/EventDetail';
import { ParentCanteenPage, ParentEventsPage, ParentTransportPage, StudentAnnouncementsPage, StudentCertificatesPage, StudentLibraryPage } from './pages/family/FamilyPages';
import { AdminLibrary } from './pages/admin/library/Library';
import { AdminTransport } from './pages/admin/transport/Transport';
import { AdminContracts, AdminLeave, AdminPerformance } from './pages/admin/hr/HrPages';
import { AdminCanteen } from './pages/admin/canteen/Canteen';
import { AdminHostel } from './pages/admin/hostel/Hostel';
import { TeacherLeave } from './pages/teacher/Leave';
import { AdminAdmissions } from './pages/admin/admissions/Admissions';
import { AdminApplicationDetail } from './pages/admin/admissions/ApplicationDetail';
import { AdminCertificates } from './pages/admin/certificates/Certificates';
import { ApplyPage, VerifyPage } from './pages/public/PublicPages';
import { ADMIN_NAV, PARENT_NAV, STUDENT_NAV, TEACHER_NAV, plannedRoutes, type NavEntry } from './components/layout/navigation';

/** Placeholder pages for the planned modules listed in a portal's sidebar. */
function plannedModuleRoutes(nav: NavEntry[]) {
  return plannedRoutes(nav).map((item) => {
    const page = <Route key={item.path} path={item.path} element={<ModulePlaceholder module={item.module!} page={item.label} />} />;
    return item.permission ?
    <Route key={item.path} element={<RequirePermission permission={item.permission} />}>{page}</Route> :
    page;
  });
}

export function App() {
  return (
    <BrandingProvider>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SessionWatcher>
          <MockDbSync />
          <Toaster
              position="top-right"
              // below the 64px header so toasts never cover the bell / user menu
              offset={76}
              richColors
              closeButton
              toastOptions={{ style: { fontFamily: 'var(--font-sans)' } }} />
            
          <Routes>
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/:role" element={<LoginPage />} />
            {/* public: no sign-in */}
            <Route path="/apply" element={<ApplyPage />} />
            <Route path="/verify" element={<VerifyPage />} />

            {/* Finance print pages (admin portal, finance permission), no dashboard chrome */}
            <Route element={<ProtectedRoute allow="admin" />}>
              <Route element={<RequirePermission permission={PERMISSIONS.FINANCE_MANAGE} />}>
                <Route path="/admin/finance/invoices/:invoiceId/print" element={<AdminInvoicePrint />} />
                <Route path="/admin/finance/payments/:paymentId/print" element={<AdminReceiptPrint />} />
              </Route>
            </Route>

            {/* Admin */}
            <Route element={<ProtectedRoute allow="admin" />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminHome />} />
                <Route path="profile" element={<AdminOrStaffProfile />} />
                <Route path="reports" element={<AdminReports />} />

                {/* each section is limited to the roles that hold its permission */}
                <Route element={<RequirePermission permission={PERMISSIONS.STUDENTS_READ} />}>
                  <Route path="students" element={<AdminStudents />} />
                  <Route path="students/:studentID" element={<AdminStudentDetail />} />
                  <Route path="parents" element={<AdminParents />} />
                  <Route path="attendance" element={<AdminAttendance />} />
                  <Route path="attendance/register" element={<RegisterPage />} />
                  <Route path="attendance/gate" element={<AdminAttendanceGate />} />
                  <Route path="health" element={<AdminHealth />} />
                  <Route path="health/:studentId" element={<AdminStudentHealth />} />
                  <Route path="communication/announcements" element={<AdminAnnouncements />} />
                  <Route path="communication/messages" element={<InboxPage />} />
                  <Route path="communication/outbox" element={<AdminOutbox />} />
                  <Route path="events" element={<AdminEvents />} />
                  <Route path="events/:eventId" element={<AdminEventDetail />} />
                  <Route path="admissions" element={<AdminAdmissions />} />
                  <Route path="admissions/:applicationId" element={<AdminApplicationDetail />} />
                  <Route path="certificates" element={<AdminCertificates />} />
                  <Route path="library" element={<AdminLibrary />} />
                  <Route path="transport" element={<AdminTransport />} />
                  <Route path="canteen" element={<AdminCanteen />} />
                  <Route path="hostel" element={<AdminHostel />} />
                </Route>
                <Route element={<RequirePermission permission={PERMISSIONS.TEACHERS_MANAGE} />}>
                  <Route path="teachers" element={<AdminTeachers />} />
                  <Route path="teachers/:teacherID" element={<AdminTeacherDetail />} />
                </Route>
                <Route element={<RequirePermission permission={PERMISSIONS.ACADEMICS_MANAGE} />}>
                  <Route path="programs" element={<AdminPrograms />} />
                  <Route path="subjects" element={<AdminSubjects />} />
                  <Route path="classes" element={<AdminClassLevels />} />
                  <Route path="academic-years" element={<AdminAcademicYears />} />
                  <Route path="academic-terms" element={<AdminAcademicTerms />} />
                  <Route path="year-groups" element={<AdminYearGroups />} />
                  <Route path="exam-results" element={<AdminExamResults />} />
                  <Route path="academics/sections" element={<AdminSections />} />
                  <Route path="academics/sections/:sectionId" element={<AdminSectionDetail />} />
                  <Route path="academics/timetable" element={<AdminTimetable />} />
                  <Route path="academics/rooms" element={<AdminRooms />} />
                  <Route path="academics/school-day" element={<AdminSchoolDay />} />
                </Route>
                <Route element={<RequirePermission permission={PERMISSIONS.FINANCE_MANAGE} />}>
                  <Route path="expenses" element={<AdminExpenses />} />
                  <Route path="finance/invoices" element={<AdminInvoices />} />
                  <Route path="finance/invoices/:invoiceId" element={<AdminInvoiceDetail />} />
                  <Route path="finance/payments" element={<AdminPayments />} />
                  <Route path="finance/reports" element={<AdminFinanceReports />} />
                  <Route path="finance/fee-structures" element={<AdminFeeStructures />} />
                  <Route path="finance/fee-items" element={<AdminFeeItems />} />
                  <Route path="finance/discounts" element={<AdminDiscounts />} />
                  {/* old link */}
                  <Route path="fees-groups" element={<Navigate to="/admin/finance/fee-items" replace />} />
                </Route>
                <Route element={<RequirePermission permission={PERMISSIONS.ADMINS_MANAGE} />}>
                  <Route path="administrators" element={<AdminAdministrators />} />
                </Route>
                <Route element={<RequirePermission permission={PERMISSIONS.STAFF_MANAGE} />}>
                  <Route path="staff" element={<AdminStaff />} />
                  <Route path="hr/attendance" element={<AdminStaffAttendance />} />
                  <Route path="hr/contracts" element={<AdminContracts />} />
                  <Route path="hr/leave" element={<AdminLeave />} />
                  <Route path="hr/performance" element={<AdminPerformance />} />
                </Route>
                <Route element={<RequirePermission permission={PERMISSIONS.AUDIT_READ} />}>
                  <Route path="audit-log" element={<AdminAuditLog />} />
                </Route>
                <Route element={<RequirePermission permission={PERMISSIONS.SETTINGS_MANAGE} />}>
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="branding" element={<AdminBranding />} />
                </Route>
                {plannedModuleRoutes(ADMIN_NAV)}
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
                <Route path="timetable" element={<TeacherTimetable />} />
                <Route path="sections" element={<TeacherMySections />} />
                <Route path="attendance" element={<TeacherAttendance />} />
                <Route path="attendance/register" element={<RegisterPage />} />
                <Route path="profile" element={<TeacherProfile />} />
                <Route path="messages" element={<InboxPage />} />
                <Route path="leave" element={<TeacherLeave />} />
                {plannedModuleRoutes(TEACHER_NAV)}
              </Route>
            </Route>

            {/* Student */}
            <Route element={<ProtectedRoute allow="student" />}>
              {/* Distraction-free exam runner lives outside the dashboard chrome. */}
              <Route path="/student/exams/:examID/take" element={<StudentExamRunner />} />
              <Route path="/student" element={<StudentLayout />}>
                <Route index element={<StudentDashboard />} />
                <Route path="profile" element={<StudentProfilePage />} />
                <Route path="timetable" element={<StudentTimetablePage />} />
                <Route path="attendance" element={<StudentAttendancePage />} />
                <Route path="announcements" element={<StudentAnnouncementsPage />} />
                <Route path="certificates" element={<StudentCertificatesPage />} />
                <Route path="library" element={<StudentLibraryPage />} />
                <Route path="exams" element={<StudentExams />} />
                <Route path="results" element={<StudentResults />} />
                <Route path="results/:resultID" element={<StudentResultDetail />} />
                {plannedModuleRoutes(STUDENT_NAV)}
              </Route>
            </Route>

            {/* Parent */}
            <Route element={<ProtectedRoute allow="parent" />}>
              <Route path="/parent" element={<ParentLayout />}>
                <Route index element={<ParentDashboard />} />
                <Route path="children/:studentId" element={<ParentChildDetail />} />
                <Route path="profile" element={<ParentProfilePage />} />
                <Route path="attendance" element={<ParentAttendancePage />} />
                <Route path="messages" element={<InboxPage />} />
                <Route path="events" element={<ParentEventsPage />} />
                <Route path="transport" element={<ParentTransportPage />} />
                <Route path="canteen" element={<ParentCanteenPage />} />
                {plannedModuleRoutes(PARENT_NAV)}
              </Route>
              {/* printable documents: outside the dashboard chrome */}
              <Route path="/parent/children/:studentId/invoices/:invoiceId/print" element={<ParentInvoicePrint />} />
              <Route path="/parent/children/:studentId/receipts/:paymentId/print" element={<ParentReceiptPrint />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </SessionWatcher>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
    </BrandingProvider>);

}