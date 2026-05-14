import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { Toaster } from 'react-hot-toast';
import HomeRedirect from './components/HomeRedirect';
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import EmployeeDashboardLayout from './layouts/EmployeeDashboardLayout';

// Auth Pages
import LoginLanding from './pages/LoginLanding';
import CompanySelect from './pages/CompanySelect';
import CompanyLogin from './pages/CompanyLogin';
import SPCManagementLogin from './pages/SPCManagementLogin';

// Public Pages
import CareersPage from './pages/Public/CareersPage';
import CandidateDocuments from './pages/CandidateDocuments';
import DocumentUpload from './pages/Public/DocumentUpload';
import PayslipUpload from './pages/Public/PayslipUpload';
import Unauthorized from './pages/Unauthorized';
import DebugAuth from './components/DebugAuth';

// Admin Pages
import Dashboard from './pages/Dashboard';
import CandidateList from './pages/Candidates/CandidateList';
import HRManagement from './pages/Admin/HRManagement';
import HRActivityHistory from './pages/Admin/HRActivityHistory';

import PendingApprovals from './pages/ApprovalWorkflow/PendingApprovals';

import DepartmentManagement from './pages/Admin/DepartmentManagement';


// HR Pages
import JobDesk from './pages/JobDesk';
import ViewApplicants from './pages/ViewApplicants';
import CandidateTimeline from './pages/CandidateTimeline';
import Onboarding from './pages/Employee/Onboarding';
import Offboarding from './pages/Employee/Offboarding';
import EmployeeList from './pages/Employee/EmployeeList';
import EmployeeAdd from './pages/Employee/EmployeeAdd';
import EmployeeEdit from './pages/Employee/EmployeeEdit';
import EmployeeDetail from './pages/Employee/EmployeeDetail';
import EmployeeProfile from './pages/Employee/EmployeeProfile';
import BulkEmployeeUpload from './pages/Employee/BulkEmployeeUpload';
import ResumeSearch from './pages/HRDashboard/ResumeSearch';
import ResumeParser from './pages/HRDashboard/ResumeParser';
import HRCandidatePool from './pages/HRDashboard/HRCandidatePool';
import DocumentVerification from './pages/HR/DocumentVerification';

// Contract Management Pages
import ContractDashboard from './pages/Contracts/ContractDashboard';
import ContractList from './pages/Contracts/ContractList';
import ContractCreate from './pages/Contracts/ContractCreate';
import ContractDetail from './pages/Contracts/ContractDetail';

// SPC Project Management Pages
import ProjectDashboard from './components/SPC/ProjectDashboard';
import ManagerDashboard from './components/SPC/ManagerDashboard';
import ManagerProjects from './components/SPC/ManagerProjects';
import HRDashboard from './components/SPC/HRDashboard';
import EmployeeDashboard from './components/SPC/EmployeeDashboard';
import SPCProtectedRoute from './components/SPC/SPCProtectedRoute';

// Manager Pages
import ManagerHome from './pages/ManagerDashboard/SPCManagerHome';
import ManagerScheduleMeeting from './pages/ManagerDashboard/ScheduleMeeting';
import ManagerAnnouncements from './pages/ManagerDashboard/Announcements';
import ManagerTeamReports from './pages/ManagerDashboard/TeamReports';

// Admin Additional Pages
import AdminScheduleMeeting from './pages/Admin/ScheduleMeeting';
import AdminAnnouncements from './pages/Admin/Announcements';
import AdminTeamReports from './pages/Admin/TeamReports';
import AdminEmailConfig from './pages/Admin/EmailConfig';
import EmployeeLeaveDashboard from './modules/leave/pages/EmployeeLeaveDashboard';
import ManagerLeaveQueue from './modules/leave/pages/ManagerLeaveQueue';
import AdminLeaveConfig from './modules/leave/pages/AdminLeaveConfig';
import AdminLeaveTypes from './modules/leave/pages/AdminLeaveTypes';
import AdminLeaveAllocations from './modules/leave/pages/AdminLeaveAllocations';
import AdminLeaveHolidays from './modules/leave/pages/AdminLeaveHolidays';
import EmployeeTimesheetPage from './modules/timesheet/pages/EmployeeTimesheetPage';
import ManagerApprovalQueue from './modules/timesheet/pages/ManagerApprovalQueue';
import ManagerBulkUpload from './modules/timesheet/pages/ManagerBulkUpload';
import AdminTimesheetView from './modules/timesheet/pages/AdminTimesheetView';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 5000,
              style: {
                background: '#1e293b',
                color: '#f1f5f9',
                border: '1px solid #334155',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#f1f5f9',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#f1f5f9',
                },
              },
            }}
          />
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginLanding />} />
          <Route path="/login/company-select" element={<CompanySelect />} />
          <Route path="/login/spc-management" element={<SPCManagementLogin />} />
          <Route path="/login/:companySlug" element={<CompanyLogin />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/jobs" element={<CareersPage />} />
          <Route path="/candidate-documents" element={<CandidateDocuments />} />
          <Route path="/public/upload-documents/:token" element={<DocumentUpload />} />
          <Route path="/public/upload-payslip/:token" element={<PayslipUpload />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/debug" element={<DebugAuth />} />
          
          {/* Block SuperAdmin routes - Not available in SPC demo */}
          <Route path="/super-admin/*" element={<Navigate to="/unauthorized" replace />} />
          
          {/* Root redirect based on role */}
          <Route path="/" element={<HomeRedirect />} />

          {/* HR SPC Routes */}
          <Route
            path="/spc/hr/dashboard"
            element={
              <SPCProtectedRoute allowedRoles={['hr']} requireProject={false}>
                <DashboardLayout>
                  <HRDashboard user={{ email: 'hr@company.com', role: 'hr' }} />
                </DashboardLayout>
              </SPCProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute roles={['admin', 'company_admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="candidates" element={<CandidateList />} />
            <Route path="departments" element={<DepartmentManagement />} />
            <Route path="hr-management" element={<HRManagement />} />
            <Route path="hr-activity-history" element={<HRActivityHistory />} />
            <Route path="approvals/pending" element={<PendingApprovals />} />
            <Route path="schedule-meeting" element={<AdminScheduleMeeting />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="team-reports" element={<AdminTeamReports />} />
            <Route path="email-config" element={<AdminEmailConfig />} />
            {/* SPC Project Management Routes - Available for both admin and company_admin */}
            <Route 
              path="spc/admin" 
              element={
                <SPCProtectedRoute allowedRoles={['admin', 'company_admin']} requireProject={false}>
                  <ProjectDashboard userRole="company_admin" />
                </SPCProtectedRoute>
              } 
            />
          </Route>

          {/* Manager Routes */}
          <Route
            path="/manager/*"
            element={
              <ProtectedRoute roles={['manager']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<ManagerHome />} />
            <Route path="schedule-meeting" element={<ManagerScheduleMeeting />} />
            <Route path="announcements" element={<ManagerAnnouncements />} />
            <Route path="team-reports" element={<ManagerTeamReports />} />
            <Route path="leave" element={<ManagerLeaveQueue />} />
            <Route path="timesheet" element={<ManagerApprovalQueue />} />
            <Route path="timesheet/upload" element={<ManagerBulkUpload />} />
            <Route path="timesheet/fill" element={<EmployeeTimesheetPage />} />
            {/* SPC Project Management Routes */}
            <Route 
              path="spc/manager" 
              element={
                <SPCProtectedRoute allowedRoles={['manager']} requireProject={true}>
                  <ManagerDashboard user={undefined} />
                </SPCProtectedRoute>
              } 
            />
            <Route 
              path="spc/projects" 
              element={
                <SPCProtectedRoute allowedRoles={['manager']} requireProject={false}>
                  <ManagerProjects />
                </SPCProtectedRoute>
              } 
            />
          </Route>

          {/* HR Routes */}
          <Route
            path="/employee/*"
            element={
              <ProtectedRoute roles={['hr', 'company_admin']}>
                <EmployeeDashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="profile" element={<EmployeeProfile />} />
            <Route path="hr/candidate-pool" element={<HRCandidatePool />} />
            <Route path="hr/resume-search" element={<ResumeSearch />} />
            <Route path="hr/resume-parser" element={<ResumeParser />} />
            <Route path="hr/document-verification" element={<DocumentVerification />} />
            <Route path="leave" element={<EmployeeLeaveDashboard />} />
            <Route path="timesheet" element={<EmployeeTimesheetPage />} />
          </Route>

          <Route
            path="/leave/*"
            element={
              <ProtectedRoute roles={['employee', 'hr', 'manager', 'admin', 'company_admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<EmployeeLeaveDashboard />} />
            <Route path="apply" element={<EmployeeLeaveDashboard />} />
            <Route path="history" element={<EmployeeLeaveDashboard />} />
          </Route>

          <Route
            path="/timesheet/*"
            element={
              <ProtectedRoute roles={['employee', 'hr', 'manager', 'admin', 'company_admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<EmployeeTimesheetPage />} />
          </Route>

          <Route
            path="/admin/leave/*"
            element={
              <ProtectedRoute roles={['admin', 'company_admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminLeaveConfig />} />
            <Route path="types" element={<AdminLeaveTypes />} />
            <Route path="allocations" element={<AdminLeaveAllocations />} />
            <Route path="holidays" element={<AdminLeaveHolidays />} />
          </Route>

          <Route
            path="/admin/timesheet"
            element={
              <ProtectedRoute roles={['admin', 'company_admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminTimesheetView />} />
          </Route>

          <Route
            path="/job-desk/*"
            element={
              <ProtectedRoute roles={['hr', 'company_admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<JobDesk />} />
            <Route path=":jobId/applicants" element={<ViewApplicants />} />
          </Route>

          <Route
            path="/candidates/*"
            element={
              <ProtectedRoute roles={['hr', 'company_admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path=":candidateId/timeline" element={<CandidateTimeline />} />
          </Route>

          <Route
            path="/employees/*"
            element={
              <ProtectedRoute roles={['hr', 'admin', 'company_admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<EmployeeList />} />
            <Route path="add" element={<EmployeeAdd />} />
            <Route path="bulk-upload" element={<BulkEmployeeUpload />} />
            <Route path=":id/edit" element={<EmployeeEdit />} />
            <Route path=":id" element={<EmployeeDetail />} />
            <Route path="onboarding" element={<Onboarding />} />
            <Route path="offboarding" element={<Offboarding />} />
          </Route>

          {/* Employee SPC Routes */}
          <Route
            path="/employee/*"
            element={
              <ProtectedRoute roles={['employee', 'hr', 'admin', 'company_admin']}>
                <EmployeeDashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route 
              path="spc/employee" 
              element={
                <SPCProtectedRoute allowedRoles={['employee']} requireProject={true}>
                  <EmployeeDashboard user={undefined} />
                </SPCProtectedRoute>
              } 
            />
          </Route>

          {/* Contract Management Routes */}
          <Route
            path="/contracts/*"
            element={
              <ProtectedRoute roles={['hr', 'admin', 'company_admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ContractList />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute roles={['admin', 'company_admin']}>
                  <ContractDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="create" element={<ContractCreate />} />
            <Route path=":id" element={<ContractDetail />} />
          </Route>
          </Routes>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
