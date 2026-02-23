import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserPlus,
  UserMinus,
  Search,
  X,
  FileText,
  User,
  Upload,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Building,
  History,
  FileText as FileContract,
  FolderOpen,
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState({});

  // PERMANENT ROLE FIX
  // Normalize admin role to company_admin (should be fixed in AuthContext, but double-check here)
  let normalizedUser = user;
  if (user && user.role === 'admin' && (user.email?.includes('admin') || user.email?.includes('@spc') || user.email?.includes('@company'))) {
    normalizedUser = { ...user, role: 'company_admin' };
    // Update localStorage if not already fixed
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.role === 'admin') {
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    }
  }
  
  // Use normalized user for all checks
  const effectiveUser = normalizedUser || user;

  const isAdmin = effectiveUser?.role === 'admin' || effectiveUser?.role === 'company_admin';
  const isHR = effectiveUser?.role === 'hr' || effectiveUser?.role === 'company_admin';

  const isActive = (path) => location.pathname === path;

  const toggleMenu = (key) => {
    setExpandedMenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isMenuActive = (item) => {
    if (item.children) {
      return item.children.some(child => isActive(child.path));
    }
    return isActive(item.path);
  };

  const hrMenuItems = [
    {
      key: 'projects',
      label: 'Projects',
      icon: FolderOpen,
      path: '/spc/hr/dashboard'
    },
    {
      key: 'jobdesk',
      label: 'Job Desk',
      icon: Briefcase,
      path: '/job-desk'
    },
    {
      key: 'employees',
      label: 'Employees',
      icon: User,
      path: '/employees',
      children: [
        { label: 'All Employees', path: '/employees' },
        { label: 'Add Employee', path: '/employees/add' },
        { label: 'Bulk Upload', path: '/employees/bulk-upload' },
        { label: 'Onboarding', path: '/employees/onboarding' },
        { label: 'Offboarding', path: '/employees/offboarding' }
      ]
    },
    {
      key: 'candidate-pool',
      label: 'Candidate Pool',
      icon: Users,
      path: '/employee/hr/candidate-pool'
    },
    {
      key: 'resume-parser',
      label: 'Resume Parser',
      icon: FileText,
      path: '/employee/hr/resume-parser'
    },
    {
      key: 'resume-search',
      label: 'Resume Search',
      icon: Search,
      path: '/employee/hr/resume-search'
    },
    {
      key: 'document-verification',
      label: 'Document Verification',
      icon: ShieldCheck,
      path: '/employee/hr/document-verification'
    },
    {
      key: 'contracts',
      label: 'Contracts',
      icon: FileContract,
      path: '/contracts',
      children: [
        { label: 'All Contracts', path: '/contracts' },
        { label: 'Create Contract', path: '/contracts/create' }
      ]
    }
  ];

  const adminMenuItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard'
    },
    {
      key: 'projects',
      label: 'Projects',
      icon: FolderOpen,
      path: '/spc/admin'
    },
    {
      key: 'candidates',
      label: 'Candidates',
      icon: Users,
      path: '/candidates'
    },
    {
      key: 'pending-approvals',
      label: 'Pending Approvals',
      icon: ShieldCheck,
      path: '/approvals/pending'
    },
    {
      key: 'departments',
      label: 'Departments',
      icon: Building,
      path: '/departments'
    }
  ];

  const managerMenuItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/manager/dashboard'
    },
    {
      key: 'my-projects',
      label: 'My Projects',
      icon: Briefcase,
      path: '/manager/spc/projects'
    },
    {
      key: 'schedule-meeting',
      label: 'Schedule Meeting',
      icon: Users,
      path: '/manager/schedule-meeting'
    },
    {
      key: 'announcements',
      label: 'Announcements',
      icon: FileText,
      path: '/manager/announcements'
    },
    {
      key: 'team-reports',
      label: 'Team Reports',
      icon: History,
      path: '/manager/team-reports'
    }
  ];


  let menuItems = [];
  if (effectiveUser?.role === 'company_admin') {
    menuItems = [
      ...adminMenuItems,
      {
        key: 'hr-management',
        label: 'HR Management',
        icon: Users,
        path: '/hr-management'
      },
      {
        key: 'hr-activity-history',
        label: 'HR Activity History',
        icon: History,
        path: '/hr-activity-history'
      },
      {
        key: 'contracts',
        label: 'Contracts',
        icon: FileContract,
        path: '/contracts',
        children: [
          { label: 'Dashboard', path: '/contracts/dashboard' },
          { label: 'All Contracts', path: '/contracts' },
          { label: 'Create Contract', path: '/contracts/create' }
        ]
      },
      {
        key: 'employees',
        label: 'Employee Management',
        icon: User,
        path: '/employees',
        children: [
          { label: 'All Employees', path: '/employees' },
          { label: 'Add Employee', path: '/employees/add' },
          { label: 'Bulk Upload', path: '/employees/bulk-upload' },
          { label: 'Onboarding', path: '/employees/onboarding' },
          { label: 'Offboarding', path: '/employees/offboarding' }
        ]
      }
    ];
  } else if (effectiveUser?.role === 'manager') {
    menuItems = managerMenuItems;
  } else if (isHR) {
    menuItems = hrMenuItems;
  } else if (isAdmin) {
    menuItems = [
      ...adminMenuItems,
      {
        key: 'contracts',
        label: 'Contracts',
        icon: FileContract,
        path: '/contracts',
        children: [
          { label: 'Dashboard', path: '/contracts/dashboard' },
          { label: 'All Contracts', path: '/contracts' },
          { label: 'Create Contract', path: '/contracts/create' }
        ]
      },
      {
        key: 'employees',
        label: 'Employee Management',
        icon: User,
        path: '/employees',
        children: [
          { label: 'All Employees', path: '/employees' },
          { label: 'Add Employee', path: '/employees/add' },
          { label: 'Bulk Upload', path: '/employees/bulk-upload' },
          { label: 'Onboarding', path: '/employees/onboarding' },
          { label: 'Offboarding', path: '/employees/offboarding' }
        ]
      }
    ];
  } else {
    menuItems = [];
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen theme-surface border-r theme-border z-50 transition-transform duration-300 overflow-y-auto overflow-x-hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 w-64`}
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Logo */}
        <div className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b theme-border theme-surface"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-center w-full py-2">
            <span className="text-4xl font-black font-sans bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent tracking-wider">
              HRMS
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3">
          {menuItems.map((item) => (
            <div key={item.key} className="mb-1">
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.key)}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isMenuActive(item)
                        ? 'sidebar-menu-item active'
                        : 'sidebar-menu-item'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </div>
                    {expandedMenus[item.key] ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </button>
                  {expandedMenus[item.key] && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children.map((child, index) => (
                        <Link
                          key={index}
                          to={child.path}
                          className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            isActive(child.path)
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }`}
                        >
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item.path)
                    ? 'sidebar-menu-item active'
                    : 'sidebar-menu-item'}`}
                  onMouseEnter={(e) => e.currentTarget.classList.add('hover:bg-gray-800', 'hover:text-white')}
                  onMouseLeave={(e) => e.currentTarget.classList.remove('hover:bg-gray-800', 'hover:text-white')}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
