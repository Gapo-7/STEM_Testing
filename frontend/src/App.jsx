import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import DepartmentPage from './pages/DepartmentPage'
import DepartmentsListPage from './pages/DepartmentsListPage'
import AdminDepartmentsPage from './pages/AdminDepartmentsPage'
import RecordFormPage from './pages/RecordFormPage'
import RecordPage from './pages/RecordPage'
import {EmployeeKPIPage} from './pages/EmployeeKPIPage'
import UsersAdminPage from './pages/UsersAdminPage'
import AdaptationDashboard from './pages/AdaptationDashboard'
import AdaptationDeptPage from './pages/AdaptationDeptPage'
import AdaptationCandidateForm from './pages/AdaptationCandidateForm'
import AdaptationCandidateCard from './pages/AdaptationCandidateCard'
import ArchivePage from './pages/ArchivePage'
import FiredEmployeePage from './pages/FiredEmployeePage'

// Layout с боковой панелью для защищённых страниц
function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Публичные маршруты */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Защищённые маршруты */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/departments" element={<DepartmentsListPage />} />
              <Route path="/departments/:id" element={<DepartmentPage />} />
              <Route path="/departments/:id/records/new" element={
                <ProtectedRoute roles={['director', 'managing_director', 'department_head']}>
                  <RecordFormPage />
                </ProtectedRoute>
              } />
                <Route path="/departments/:id/records/:rid" element={<RecordPage />} />
              <Route path="/departments/:id/records/:rid/kpi" element={<EmployeeKPIPage />} />
              <Route path="/departments/:id/records/:rid/edit" element={
                <ProtectedRoute roles={['director', 'managing_director', 'department_head']}>
                  <RecordFormPage />
                </ProtectedRoute>
              } />

              <Route path="/adaptation" element={
                <ProtectedRoute roles={['director', 'managing_director', 'department_head']}>
                  <AdaptationDashboard />
                </ProtectedRoute>
              } />
              <Route path="/adaptation/:deptId" element={
                <ProtectedRoute roles={['director', 'managing_director', 'department_head']}>
                  <AdaptationDeptPage />
                </ProtectedRoute>
              } />
              <Route path="/adaptation/:deptId/new" element={
                <ProtectedRoute roles={['director', 'managing_director', 'department_head']}>
                  <AdaptationCandidateForm />
                </ProtectedRoute>
              } />
              <Route path="/adaptation/:deptId/candidates/:id" element={
                <ProtectedRoute roles={['director', 'managing_director', 'department_head']}>
                  <AdaptationCandidateCard />
                </ProtectedRoute>
              } />
              <Route path="/archive" element={
                <ProtectedRoute roles={['director', 'managing_director', 'department_head']}>
                  <ArchivePage />
                </ProtectedRoute>
              } />
              <Route path="/archive/fired/:id" element={
                <ProtectedRoute roles={['director', 'managing_director', 'department_head']}>
                  <FiredEmployeePage />
                </ProtectedRoute>
              } />

              {/* Только директор */}
              <Route path="/admin/users" element={
                <ProtectedRoute roles={['director']}>
                  <UsersAdminPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/departments" element={
                <ProtectedRoute roles={['director', 'managing_director']}>
                  <AdminDepartmentsPage />
                </ProtectedRoute>
              } />
            </Route>

            {/* Редирект с корня */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
