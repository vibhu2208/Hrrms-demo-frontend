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
  CalendarDays,
  Clock3,
  Menu,
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen, collapsed = false, setCollapsed }) => {
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
    },
    {
      key: 'leave',
      label: 'Leave',
      icon: CalendarDays,
      path: '/leave'
    },
    {
      key: 'timesheet',
      label: 'Timesheet',
      icon: Clock3,
      path: '/timesheet'
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
    },
    {
      key: 'admin-leave',
      label: 'Leave Admin',
      icon: CalendarDays,
      path: '/admin/leave',
      children: [
        { label: 'Overview', path: '/admin/leave' },
        { label: 'Leave Types', path: '/admin/leave/types' },
        { label: 'Allocations', path: '/admin/leave/allocations' },
        { label: 'Holidays', path: '/admin/leave/holidays' }
      ]
    },
    {
      key: 'admin-timesheet',
      label: 'Timesheet Admin',
      icon: Clock3,
      path: '/admin/timesheet'
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
    },
    {
      key: 'manager-leave',
      label: 'Leave Approvals',
      icon: CalendarDays,
      path: '/manager/leave'
    },
    {
      key: 'manager-my-leave',
      label: 'My Leave',
      icon: CalendarDays,
      path: '/leave/apply'
    },
    {
      key: 'manager-timesheet',
      label: 'Timesheet Queue',
      icon: Clock3,
      path: '/manager/timesheet'
    },
    {
      key: 'manager-timesheet-fill',
      label: 'Fill Team Timesheet',
      icon: Clock3,
      path: '/manager/timesheet/fill'
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
        className={`fixed top-0 left-0 h-screen theme-surface border-r theme-border z-50 overflow-y-auto overflow-x-hidden transition-[transform,width] duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 w-64 ${collapsed ? 'lg:w-16' : 'lg:w-64'}`}
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Logo */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between h-16 px-2 lg:px-2 border-b theme-border theme-surface gap-1"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div
            className={`flex flex-1 items-center justify-center py-2 min-w-0 ${
              collapsed ? 'lg:justify-center' : ''
            }`}
          >
            <span
              className={`text-4xl font-black font-sans bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent tracking-wider truncate ${
                collapsed ? 'lg:hidden' : ''
              }`}
            >
              HRMS
            </span>
            <span
              className={`hidden text-xl font-black font-sans bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent ${
                collapsed ? 'lg:inline' : ''
              }`}
            >
              H
            </span>
          </div>
          {setCollapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex shrink-0 p-1.5 rounded-md theme-text-secondary hover:opacity-80"
              style={{ color: 'var(--color-textSecondary)' }}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu size={18} />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-4 ${collapsed ? 'lg:px-1.5' : 'px-3'}`}>
          {menuItems.map((item) => (
            <div key={item.key} className="mb-1 relative group/item">
              {item.children ? (
                <div>
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.key)}
                    className={`flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      collapsed ? 'lg:justify-center lg:px-2' : 'justify-between'
                    } ${
                      isMenuActive(item)
                        ? 'sidebar-menu-item active'
                        : 'sidebar-menu-item'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <div className={`flex items-center ${collapsed ? 'lg:space-x-0' : 'space-x-3'}`}>
                      <item.icon size={20} className="shrink-0" />
                      <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                    </div>
                    <span className={collapsed ? 'lg:hidden' : ''}>
                      {expandedMenus[item.key] ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </span>
                  </button>
                  {expandedMenus[item.key] && (
                    <div
                      className={`ml-6 mt-1 space-y-1 ${
                        collapsed
                          ? 'lg:absolute lg:left-full lg:top-0 lg:ml-2 lg:w-48 lg:rounded-lg lg:p-2 lg:shadow-lg lg:z-[60] lg:border theme-surface theme-border'
                          : ''
                      }`}
                      style={
                        collapsed
                          ? {
                              backgroundColor: 'var(--color-surface)',
                              borderColor: 'var(--color-border)',
                            }
                          : undefined
                      }
                    >
                      {item.children.map((child, index) => (
                        <Link
                          key={index}
                          to={child.path}
                          onClick={() => {
                            setIsOpen(false);
                            if (collapsed) toggleMenu(item.key);
                          }}
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
                  {collapsed && (
                    <div className="hidden lg:block pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 pl-2 opacity-0 group-hover/item:opacity-100 transition-opacity z-[55] whitespace-nowrap">
                      <span className="rounded-md bg-gray-900 text-white text-xs px-2 py-1 shadow-lg">
                        {item.label}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    to={item.path}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      collapsed ? 'lg:justify-center lg:px-2' : 'space-x-3'
                    } ${isActive(item.path) ? 'sidebar-menu-item active' : 'sidebar-menu-item'}`}
                    title={collapsed ? item.label : undefined}
                    onClick={() => setIsOpen(false)}
                    onMouseEnter={(e) => e.currentTarget.classList.add('hover:bg-gray-800', 'hover:text-white')}
                    onMouseLeave={(e) => e.currentTarget.classList.remove('hover:bg-gray-800', 'hover:text-white')}
                  >
                    <item.icon size={20} className="shrink-0" />
                    <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                  </Link>
                  {collapsed && (
                    <div className="hidden lg:block pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover/item:opacity-100 transition-opacity z-[55] whitespace-nowrap">
                      <span className="rounded-md bg-gray-900 text-white text-xs px-2 py-1 shadow-lg">
                        {item.label}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
