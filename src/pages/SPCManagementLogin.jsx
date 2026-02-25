import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Briefcase, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { config } from '../config/api.config';

const SPC_COMPANY_NAME = 'SPC Management';

const SPCManagementLogin = () => {
  const navigate = useNavigate();
  const { login, updateUser } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    const fetchSpcCompany = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/auth/companies`);
        if (response.data.success) {
          const company = response.data.data.find((item) => item.companyName === SPC_COMPANY_NAME);
          if (!company) {
            toast.error('SPC Management company not found');
            navigate('/login');
            return;
          }

          const companyData = {
            id: company.companyId || company._id,
            name: company.companyName,
            code: company.companyCode,
            databaseName: company.tenantDatabaseName || company.databaseName
          };
          setSelectedCompany(companyData);
          localStorage.setItem('selectedCompany', JSON.stringify(companyData));
        }
      } catch (error) {
        console.error('Error fetching SPC company:', error);
        toast.error('Failed to load SPC company');
        navigate('/login');
      } finally {
        setLoadingCompany(false);
      }
    };

    fetchSpcCompany();
  }, [navigate]);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    const result = await login(formData.email, formData.password, selectedCompany?.id);

    if (result.success) {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser?.role === 'company_admin') {
        const updatedUser = { ...storedUser, role: 'admin' };
        updateUser(updatedUser);
      }

      toast.success('Login successful!');
      const userData = JSON.parse(localStorage.getItem('user'));

      if (userData?.role === 'hr') {
        navigate('/job-desk');
      } else {
        navigate('/dashboard');
      }
    } else {
      // Handle specific error scenarios with detailed messages
      const errorMessage = result.message?.toLowerCase() || '';
      
      if (errorMessage.includes('invalid credentials') || errorMessage.includes('password')) {
        toast.error('Invalid email or password. Please check your credentials and try again.');
      } else if (errorMessage.includes('not found in')) {
        toast.error('User not found in SPC Management. Please select the correct company or contact your administrator.');
      } else if (errorMessage.includes('not found') && !errorMessage.includes('company')) {
        toast.error('No account found with this email address. Please contact your administrator.');
      } else if (errorMessage.includes('deactivated') || errorMessage.includes('inactive')) {
        toast.error('Your account has been deactivated. Please contact your administrator.');
      } else if (errorMessage.includes('company not found') || errorMessage.includes('inactive')) {
        toast.error('SPC Management company not found or inactive. Please contact support.');
      } else if (errorMessage.includes('database') || errorMessage.includes('accessing company')) {
        toast.error('Error accessing SPC Management database. Please try again or contact support.');
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        toast.error('Network error. Please check your internet connection and try again.');
      } else {
        toast.error(result.message || 'Login failed. Please try again.');
      }
    }

    setLoading(false);
  };

  if (loadingCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading SPC Management...</p>
        </div>
      </div>
    );
  }

  if (!selectedCompany) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to login options
        </button>

        <div className="card mb-6">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/10 mr-4">
              <Briefcase size={24} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-white font-semibold">{selectedCompany.name}</h3>
              <p className="text-sm text-gray-400">Code: {selectedCompany.code}</p>
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/logo2.png"
              alt="Company Logo"
              className="h-16 w-auto rounded-2xl shadow-md border-2 border-white/10"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SPC Management Login</h1>
          <p className="text-gray-400">Sign in with your SPC credentials</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  placeholder="you@spc.com"
                  required
                />
              </div>
            </div>

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

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base font-medium"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SPCManagementLogin;
