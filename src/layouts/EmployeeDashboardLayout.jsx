import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase,
  User,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Users,
  Search,
  FileText,
  ShieldCheck,
  Calendar,
  Clock
} from 'lucide-react';

const EmployeeDashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const isHR = user?.role === 'hr';

  // HR Navigation - allowed features
  const hrNavigation = [
    { name: 'Job Desk', href: '/job-desk', icon: Briefcase },
    { name: 'Onboarding', href: '/employees/onboarding', icon: Users },
    { name: 'Candidate Pool', href: '/employee/hr/candidate-pool', icon: Users },
    { name: 'Resume Parser', href: '/employee/hr/resume-parser', icon: FileText },
    { name: 'Resume Search', href: '/employee/hr/resume-search', icon: Search },
    { name: 'Document Verification', href: '/employee/hr/document-verification', icon: ShieldCheck },
    { name: 'Leave', href: '/employee/leave', icon: Calendar },
    { name: 'Timesheet', href: '/employee/timesheet', icon: Clock },
    { name: 'My Profile', href: '/employee/profile', icon: User },
  ];
  const navigation = isHR ? hrNavigation : [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-[#1E1E2A]">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-[#2A2A3A] border-r border-gray-800 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 w-64 ${sidebarCollapsed ? 'md:w-16' : 'md:w-[260px]'}`}
      >
        <div className="h-full px-2 py-4 overflow-y-auto md:px-2">
          {/* Logo */}
          <div className={`flex items-center mb-6 px-1 ${sidebarCollapsed ? 'md:justify-center' : 'justify-between px-3'}`}>
            <div className={`flex items-center min-w-0 ${sidebarCollapsed ? 'md:justify-center' : 'space-x-3'}`}>
              <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-[#A88BFF] to-[#8B6FE8] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <div className={`min-w-0 ${sidebarCollapsed ? 'md:hidden' : ''}`}>
                <h1 className="text-lg font-bold text-white truncate">HRMS Portal</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex shrink-0 p-1.5 rounded-lg text-gray-400 hover:bg-[#1E1E2A] hover:text-white"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <div key={item.name} className="relative group/nav">
                  <Link
                    to={item.href}
                    className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      sidebarCollapsed ? 'md:justify-center md:px-2' : ''
                    } ${
                      active
                        ? 'bg-gradient-to-r from-[#A88BFF] to-[#8B6FE8] text-white shadow-lg'
                        : 'text-gray-400 hover:bg-[#1E1E2A] hover:text-white'
                    }`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${sidebarCollapsed ? 'md:mr-0' : 'mr-3'}`} />
                    <span className={sidebarCollapsed ? 'md:hidden' : ''}>{item.name}</span>
                  </Link>
                  {sidebarCollapsed && (
                    <div className="hidden md:block pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover/nav:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      <span className="rounded-md bg-gray-900 text-white text-xs px-2 py-1 shadow-lg">
                        {item.name}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-[260px]'
        }`}
      >
        {/* Top Navigation */}
        <header className="sticky top-0 z-30 bg-[#2A2A3A] border-b border-gray-800">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left side */}
              <div className="flex items-center">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
                      setSidebarCollapsed((c) => !c);
                    } else {
                      setSidebarOpen((o) => !o);
                    }
                  }}
                  className="p-2 rounded-xl text-gray-400 hover:bg-[#1E1E2A] hover:text-white transition-colors"
                  title="Menu"
                >
                  {sidebarOpen ? <X className="w-5 h-5 md:hidden" /> : <Menu className="w-5 h-5 md:hidden" />}
                  <Menu className="w-5 h-5 hidden md:block" />
                </button>
              </div>

              {/* Right side */}
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button className="p-2 rounded-xl text-gray-400 hover:bg-[#1E1E2A] hover:text-white transition-colors relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[#A88BFF] rounded-full"></span>
                </button>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="flex items-center space-x-3 px-3 py-2 rounded-xl text-gray-300 hover:bg-[#1E1E2A] transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-[#A88BFF] to-[#8B6FE8] rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-[#2A2A3A] border border-gray-700">
                      <div className="py-1">
                        <Link
                          to="/employee/profile"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#1E1E2A] rounded-lg transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <User className="w-4 h-4 inline mr-2" />
                          My Profile
                        </Link>
                        <hr className="my-1 border-gray-700" />
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#1E1E2A] rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4 inline mr-2" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default EmployeeDashboardLayout;
