import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getMyPermissions } from '../api/superAdmin';
import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  BarChart3,
  Shield,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  UserCheck,
  FileText,
  DollarSign,
  Server,
  Eye,
  CreditCard,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

const SuperAdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [userPermissions, setUserPermissions] = useState(null);
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchUserPermissions();
  }, []);

  const fetchUserPermissions = async () => {
    try {
      const response = await getMyPermissions();
      console.log('🔍 Raw API response:', response);
      
      // Handle the nested response structure
      const userData = response.data?.data || response.data;
      console.log('📊 Processed user data:', userData);
      
      if (userData && userData.modules && userData.internalRole) {
        setUserPermissions(userData);
        console.log('✅ User permissions loaded successfully:', userData.internalRole);
        console.log('📋 Available modules:', userData.modules);
      } else {
        console.warn('⚠️ Invalid API response structure:', userData);
        throw new Error('Invalid API response structure - missing modules or internalRole');
      }
    } catch (error) {
      console.error('❌ Error fetching user permissions:', error);
      
      // Enhanced fallback for super admin users
      if (user?.role === 'superadmin') {
        console.warn('⚠️ Using emergency fallback for super admin');
        const fallbackPermissions = {
          internalRole: 'super_admin',
          roleDefinition: { name: 'Super Admin (Owner)' },
          permissions: {},
          modules: ['analytics_monitoring', 'client_management', 'package_management', 'subscription_billing', 'role_management', 'audit_logs', 'system_config', 'data_management']
        };
        setUserPermissions(fallbackPermissions);
        console.log('🔄 Fallback permissions set:', fallbackPermissions);
      } else {
        console.error('❌ Non-super admin user with permission error, denying access');
      }
    }
  };

  // All possible menu items with their required modules
  const allMenuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/super-admin/dashboard',
      description: 'System overview and metrics',
      requiredModule: 'analytics_monitoring'
    },
    {
      title: 'Client Management',
      icon: Users,
      path: '/super-admin/clients',
      description: 'Manage client accounts and subscriptions',
      requiredModule: 'client_management'
    },
    {
      title: 'Package Management',
      icon: Package,
      path: '/super-admin/packages',
      description: 'Create and manage subscription packages',
      requiredModule: 'package_management'
    },
    {
      title: 'Subscription & Billing',
      icon: DollarSign,
      path: '/super-admin/subscriptions',
      description: 'Manage subscriptions and billing',
      requiredModule: 'subscription_billing'
    },
    {
      title: 'Invoice Center',
      icon: CreditCard,
      path: '/super-admin/invoices',
      description: 'Manage invoices and payments',
      requiredModule: 'subscription_billing'
    },
    {
      title: 'Revenue Dashboard',
      icon: TrendingUp,
      path: '/super-admin/revenue',
      description: 'Revenue analytics and insights',
      requiredModule: 'subscription_billing'
    },
    {
      title: 'Billing Alerts',
      icon: AlertTriangle,
      path: '/super-admin/billing-alerts',
      description: 'Renewal and payment alerts',
      requiredModule: 'subscription_billing'
    },
    {
      title: 'User Management',
      icon: UserCheck,
      path: '/super-admin/roles',
      description: 'Manage all system users and permissions',
      requiredModule: 'role_management'
    },
    {
      title: 'Audit Logs',
      icon: FileText,
      path: '/super-admin/audit',
      description: 'View audit trails and security logs',
      requiredModule: 'audit_logs'
    },
    {
      title: 'Analytics & Reports',
      icon: BarChart3,
      path: '/super-admin/analytics',
      description: 'System analytics and reporting',
      requiredModule: 'analytics_monitoring'
    },
    {
      title: 'System Configuration',
      icon: Settings,
      path: '/super-admin/config',
      description: 'System-wide settings and configuration',
      requiredModule: 'system_config'
    },
    {
      title: 'Data Management',
      icon: Server,
      path: '/super-admin/data',
      description: 'Data backups and management',
      requiredModule: 'data_management'
    }
  ];

  // Filter menu items based on user permissions - PERMANENT SOLUTION
  const menuItems = allMenuItems.filter(item => {
    if (!userPermissions || !userPermissions.modules) {
      console.log('🚫 No user permissions or modules available for filtering');
      return false; // No fallback here - API must work properly
    }
    const hasAccess = userPermissions.modules.includes(item.requiredModule);
    console.log(`🔍 Menu item "${item.title}" (${item.requiredModule}): ${hasAccess ? '✅ ALLOWED' : '❌ DENIED'}`);
    return hasAccess;
  });

  console.log('📋 Final menu items:', menuItems.map(item => item.title));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActivePath = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${sidebarCollapsed ? 'w-16' : 'w-64'} ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col`}>
        
        {/* Sidebar Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Super Admin
                </h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  System Control Panel
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Desktop collapse toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:block p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto sidebar-scroll">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2 py-3' : 'px-3 py-3'} text-left rounded-lg transition-colors duration-200 group relative ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                }`}
                title={sidebarCollapsed ? item.title : ''}
              >
                <Icon className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'} ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                }`} />
                {!sidebarCollapsed && (
                  <div className="flex-1">
                    <div className={`font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                      {item.title}
                    </div>
                    <div className={`text-xs ${
                      isActive 
                        ? 'text-blue-500 dark:text-blue-500' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {item.description}
                    </div>
                  </div>
                )}
                {/* Tooltip for collapsed state */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.title}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-lg ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
          } relative group`}>
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {user?.email}
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {userPermissions?.roleDefinition?.name || 'Super Administrator'}
                </p>
              </div>
            )}
            {/* Tooltip for collapsed state */}
            {sidebarCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                {user?.email}
              </div>
            )}
          </div>
          
          <button
            onClick={handleLogout}
            className={`w-full mt-3 flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-sm rounded-lg transition-colors duration-200 group relative ${
              theme === 'dark' 
                ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            title={sidebarCollapsed ? 'Sign Out' : ''}
          >
            <LogOut className={`w-4 h-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
            {!sidebarCollapsed && 'Sign Out'}
            {/* Tooltip for collapsed state */}
            {sidebarCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                Sign Out
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Top Header */}
        <header className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 py-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="hidden md:flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search clients, packages..."
                    className={`pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              
              <div className={`text-right hidden sm:block ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <p className="text-sm font-medium">System Status</p>
                <p className="text-xs text-green-500">All Systems Operational</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
