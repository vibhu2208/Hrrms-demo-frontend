import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        let parsedUser = JSON.parse(storedUser);
        
        // PERMANENT ROLE FIX: Normalize admin role to company_admin
        if (parsedUser && parsedUser.role === 'admin' && (parsedUser.email?.includes('admin') || parsedUser.email?.includes('@spc') || parsedUser.email?.includes('@company'))) {
          parsedUser = { ...parsedUser, role: 'company_admin' };
          localStorage.setItem('user', JSON.stringify(parsedUser));
        }
        
        setUser(parsedUser);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password, companyId = null) => {
    console.log('🔐 AuthContext: Starting login attempt', { email, companyId });
    
    try {
      console.log('📡 AuthContext: Making API request to /auth/login');
      const response = await api.post('/auth/login', { 
        email, 
        password,
        ...(companyId && { companyId })
      });
      
      console.log('✅ AuthContext: Login API response received', response.data);
      const { token, user } = response.data.data;

      // PERMANENT ROLE FIX: Normalize admin role to company_admin
      let normalizedUser = user;
      if (user && user.role === 'admin' && (user.email?.includes('admin') || user.email?.includes('@spc') || user.email?.includes('@company'))) {
        normalizedUser = { ...user, role: 'company_admin' };
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      
      // Apply user's theme preference
      if (normalizedUser.themePreference) {
        localStorage.setItem('theme', normalizedUser.themePreference);
      }
      
      setToken(token);
      setUser(normalizedUser);

      console.log('✅ AuthContext: Login successful, returning success');
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Login error caught:', error);
      console.error('❌ AuthContext: Error response:', error.response);
      
      // Handle different types of errors more specifically
      if (!error.response) {
        // Network error or server not reachable
        return {
          success: false,
          message: 'Network error. Please check your internet connection and try again.'
        };
      }
      
      const status = error.response.status;
      const message = error.response.data?.message || 'Login failed';
      
      console.log('❌ AuthContext: Processing error - Status:', status, 'Message:', message);
      
      // Handle specific HTTP status codes
      let errorResult;
      switch (status) {
        case 400:
          errorResult = {
            success: false,
            message: message.includes('Please provide') ? message : 'Invalid request. Please check your input.'
          };
          break;
        case 401:
          errorResult = {
            success: false,
            message: message
          };
          break;
        case 403:
          errorResult = {
            success: false,
            message: message.includes('deactivated') ? message : 'Access denied. Your account may not have permission to access this resource.'
          };
          break;
        case 404:
          errorResult = {
            success: false,
            message: message.includes('Company') ? message : 'User not found. Please check your credentials.'
          };
          break;
        case 500:
          errorResult = {
            success: false,
            message: 'Server error. Please try again later or contact support.'
          };
          break;
        default:
          errorResult = {
            success: false,
            message: message || 'Login failed'
          };
      }
      
      console.log('❌ AuthContext: Returning error result:', errorResult);
      return errorResult;
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { token, user } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setToken(token);
      setUser(user);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const googleLogin = async (credential) => {
    try {
      const response = await api.post('/auth/google', { credential });
      const { token, user } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Apply user's theme preference
      if (user.themePreference) {
        localStorage.setItem('theme', user.themePreference);
      }
      
      setToken(token);
      setUser(user);

      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      
      // Handle different types of errors more specifically
      if (!error.response) {
        // Network error or server not reachable
        return {
          success: false,
          message: 'Network error during Google login. Please check your internet connection and try again.'
        };
      }
      
      const status = error.response.status;
      const message = error.response.data?.message || 'Google login failed';
      
      // Handle specific HTTP status codes
      switch (status) {
        case 400:
          return {
            success: false,
            message: message.includes('credential') ? 'Invalid Google credential. Please try again.' : 'Invalid request.'
          };
        case 401:
          return {
            success: false,
            message: message.includes('token') ? 'Invalid Google token. Please try again.' : message
          };
        case 404:
          return {
            success: false,
            message: message.includes('account') ? message : 'Google login failed. Please contact support.'
          };
        case 403:
          return {
            success: false,
            message: message.includes('deactivated') ? message : 'Access denied for Google login.'
          };
        case 500:
          return {
            success: false,
            message: 'Server error during Google login. Please try again later.'
          };
        default:
          return {
            success: false,
            message: message || 'Google login failed'
          };
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    token,
    loading,
    login,
    googleLogin,
    register,
    logout,
    updateUser,
    isAuthenticated: !!token
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
