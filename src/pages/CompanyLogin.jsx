import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Building2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { config } from '../config/api.config';

const CompanyLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { companySlug } = useParams(); // Get company slug from URL
  const { login, googleLogin } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(true);

  useEffect(() => {
    const fetchCompanyBySlug = async () => {
      try {
        // First try to get from localStorage
        const storedCompany = JSON.parse(localStorage.getItem('selectedCompany') || 'null');
        
        if (storedCompany && storedCompany.name.toLowerCase().replace(/\s+/g, '-') === companySlug) {
          setSelectedCompany(storedCompany);
          setLoadingCompany(false);
          return;
        }
        
        // If not in localStorage, fetch from API
        const response = await axios.get(`${config.apiBaseUrl}/auth/companies`);
        if (response.data.success) {
          const company = response.data.data.find(c => 
            c.companyName.toLowerCase().replace(/\s+/g, '-') === companySlug
          );
          
          if (company) {
            const companyData = {
              id: company.companyId || company._id,
              name: company.companyName,
              code: company.companyCode,
              databaseName: company.tenantDatabaseName || company.databaseName
            };
            setSelectedCompany(companyData);
            localStorage.setItem('selectedCompany', JSON.stringify(companyData));
          } else {
            toast.error('Company not found');
            navigate('/login/company-select');
          }
        }
      } catch (error) {
        console.error('Error fetching company:', error);
        toast.error('Failed to load company');
        navigate('/login/company-select');
      } finally {
        setLoadingCompany(false);
      }
    };
    
    if (companySlug) {
      fetchCompanyBySlug();
    } else {
      toast.error('Please select a company first');
      navigate('/login/company-select');
    }
  }, [companySlug, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log('🔐 CompanyLogin.jsx: Login attempt:', {
      email: formData.email,
      companyId: selectedCompany?.id,
      companyName: selectedCompany?.name
    });

    // Add company ID to login request for specific database authentication
    const result = await login(formData.email, formData.password, selectedCompany?.id);

    console.log('📊 CompanyLogin.jsx: Login result:', result);

    if (result.success) {
      toast.success('Login successful!');
      
      const userData = JSON.parse(localStorage.getItem('user'));
      
      // Role-based redirection for multi-tenant users
      if (userData?.role === 'employee' || userData?.role === 'manager' || userData?.role === 'hr') {
        // Employee, Manager, and HR use employee portal
        navigate('/employee/dashboard');
      } else if (userData?.role === 'company_admin' || userData?.role === 'admin') {
        // Admin use admin dashboard
        navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      console.log('❌ CompanyLogin.jsx: Login failed, processing error message:', result.message);
      
      // Handle specific error scenarios with detailed messages
      const errorMessage = result.message?.toLowerCase() || '';
      
      let toastMessage = '';
      if (errorMessage.includes('invalid credentials') || errorMessage.includes('password')) {
        toastMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (errorMessage.includes('not found in')) {
        toastMessage = 'User not found in this company. Please select the correct company or contact your administrator.';
      } else if (errorMessage.includes('not found') && !errorMessage.includes('company')) {
        toastMessage = 'No account found with this email address. Please contact your administrator.';
      } else if (errorMessage.includes('deactivated') || errorMessage.includes('inactive')) {
        toastMessage = 'Your account has been deactivated. Please contact your administrator.';
      } else if (errorMessage.includes('company not found') || errorMessage.includes('inactive')) {
        toastMessage = 'Company not found or inactive. Please select a valid company.';
      } else if (errorMessage.includes('database') || errorMessage.includes('accessing company')) {
        toastMessage = 'Error accessing company database. Please try again or contact support.';
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        toastMessage = 'Network error. Please check your internet connection and try again.';
      } else {
        toastMessage = result.message || 'Login failed. Please try again.';
      }
      
      console.log('🍞 CompanyLogin.jsx: Showing toast message:', toastMessage);
      toast.error(toastMessage);
    }

    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    
    const result = await googleLogin(credentialResponse.credential, selectedCompany?.databaseName);
    
    if (result.success) {
      toast.success('Login successful!');
      
      const userData = JSON.parse(localStorage.getItem('user'));
      
      if (userData?.role === 'employee') {
        navigate('/employee/dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      // Handle specific Google login error scenarios
      const errorMessage = result.message?.toLowerCase() || '';
      
      if (errorMessage.includes('no account found')) {
        toast.error('No account found with this Google email. Please contact your administrator to create an account.');
      } else if (errorMessage.includes('deactivated') || errorMessage.includes('inactive')) {
        toast.error('Your account has been deactivated. Please contact your administrator.');
      } else if (errorMessage.includes('invalid google token')) {
        toast.error('Invalid Google authentication. Please try again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        toast.error('Network error during Google login. Please check your internet connection and try again.');
      } else {
        toast.error(result.message || 'Google login failed. Please try again.');
      }
    }
    
    setLoading(false);
  };

  const handleGoogleError = () => {
    toast.error('Google login failed. Please try again.');
  };

  const handleChangeCompany = () => {
    localStorage.removeItem('selectedCompany');
    navigate('/login/company-select');
  };

  if (loadingCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading company...</p>
        </div>
      </div>
    );
  }

  if (!selectedCompany) {
    return null;
  }

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <button
            onClick={handleChangeCompany}
            className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Change company
          </button>

          {/* Company Info */}
          <div className="card mb-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-500/10 mr-4">
                <Building2 size={24} className="text-primary-500" />
              </div>
              <div>
                <h3 className="text-white font-semibold">{selectedCompany.name}</h3>
                <p className="text-sm text-gray-400">Code: {selectedCompany.code}</p>
              </div>
            </div>
          </div>

          {/* Logo and Welcome Message */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img 
                src="/logo2.png" 
                alt="Company Logo" 
                className="h-16 w-auto rounded-2xl shadow-md border-2 border-white/10" 
              />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400">Sign in to your account</p>
          </div>

          {/* Login Form */}
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={20} className="text-gray-500" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field pl-10"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={20} className="text-gray-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input-field pl-10 pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-600 bg-dark-800 border-dark-700 rounded focus:ring-primary-600"
                  />
                  <span className="ml-2 text-sm text-gray-400">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-primary-500 hover:text-primary-400"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-dark-900 text-gray-400">Or continue with</span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_black"
                size="large"
                width="100%"
                text="signin_with"
              />
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-400 mt-6">
            Need help?{' '}
            <button className="text-primary-500 hover:text-primary-400">
              Contact your HR department
            </button>
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default CompanyLogin;
