import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Shield, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.email, formData.password);

    if (result.success) {
      const userData = JSON.parse(localStorage.getItem('user'));
      
      // Verify this is actually a super admin
      if (userData?.role === 'superadmin') {
        toast.success('Welcome back, Super Admin!');
        navigate('/super-admin/dashboard');
      } else {
        toast.error('Access denied. Super Admin credentials required.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else {
      // Handle specific error scenarios with detailed messages
      const errorMessage = result.message?.toLowerCase() || '';
      
      if (errorMessage.includes('invalid credentials') || errorMessage.includes('password')) {
        toast.error('Invalid Super Admin email or password. Please check your credentials and try again.');
      } else if (errorMessage.includes('not found')) {
        toast.error('No Super Admin account found with this email address.');
      } else if (errorMessage.includes('deactivated') || errorMessage.includes('inactive')) {
        toast.error('Your Super Admin account has been deactivated. Please contact system administrator.');
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        toast.error('Network error. Please check your internet connection and try again.');
      } else {
        toast.error(result.message || 'Super Admin login failed. Please try again.');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to login options
        </button>

        {/* Logo and Welcome Message */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 border-2 border-purple-500/20">
              <Shield size={32} className="text-purple-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Super Admin Login</h1>
          <p className="text-gray-400">System administrators only</p>
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
                  placeholder="admin@system.com"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In as Super Admin'}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <p className="text-sm text-purple-300 text-center">
            <Shield size={16} className="inline mr-2" />
            This is a restricted area. All activities are logged and monitored.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
