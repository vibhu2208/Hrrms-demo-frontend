import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Calendar, Clock, User, Menu, Shield } from 'lucide-react';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const isManager = user?.role === 'manager';

  const navItems = isManager ? [
    { id: 'home', label: 'Home', icon: Home, path: '/employee/dashboard' },
    { id: 'manager', label: 'Manager', icon: Shield, path: '/employee/manager/home' },
    { id: 'leave', label: 'Leave', icon: Calendar, path: '/leave' },
    { id: 'attendance', label: 'Time', icon: Clock, path: '/timesheet' },
    { id: 'profile', label: 'Me', icon: User, path: '/employee/profile' },
    { id: 'more', label: 'More', icon: Menu, path: '/employee/team' }
  ] : [
    { id: 'home', label: 'Home', icon: Home, path: '/employee/dashboard' },
    { id: 'leave', label: 'Leave', icon: Calendar, path: '/leave' },
    { id: 'attendance', label: 'Time', icon: Clock, path: '/timesheet' },
    { id: 'profile', label: 'Me', icon: User, path: '/employee/profile' },
    { id: 'more', label: 'More', icon: Menu, path: '/employee/team' }
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#2A2A3A] border-t border-gray-800 md:hidden z-50">
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all min-w-[60px] ${
                active ? 'text-[#A88BFF]' : 'text-gray-400'
              }`}
            >
              <Icon className={`w-6 h-6 mb-1 ${active ? 'text-[#A88BFF]' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
              {active && (
                <div className="w-8 h-1 bg-[#A88BFF] rounded-full mt-1"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
