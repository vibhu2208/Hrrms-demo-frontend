import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
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

    console.log('🔐 Login.jsx: Starting login attempt', { email: formData.email });
    
    try {
      const result = await login(formData.email, formData.password);
      console.log('📊 Login.jsx: Login result received:', result);

      if (result.success) {
        toast.success('Login successful!');
        
        // Get user from localStorage to check role
        const userData = JSON.parse(localStorage.getItem('user'));
        
        // Role-based redirection
        if (userData?.role === 'superadmin') {
          navigate('/super-admin/dashboard');
        } else if (userData?.role === 'employee') {
          navigate('/employee/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        console.log('❌ Login.jsx: Login failed, processing error message:', result.message);
        
        // Handle specific error scenarios with detailed messages
        const errorMessage = result.message?.toLowerCase() || '';
        
        let toastMessage = '';
        if (errorMessage.includes('invalid credentials') || errorMessage.includes('password')) {
          toastMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (errorMessage.includes('not found')) {
          toastMessage = 'No account found with this email address. Please contact your administrator.';
        } else if (errorMessage.includes('deactivated') || errorMessage.includes('inactive')) {
          toastMessage = 'Your account has been deactivated. Please contact your administrator.';
        } else if (errorMessage.includes('company')) {
          toastMessage = 'Company access issue. Please select the correct company or contact admin.';
        } else if (errorMessage.includes('database') || errorMessage.includes('server')) {
          toastMessage = 'Server error. Please try again later or contact support.';
        } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
          toastMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          toastMessage = result.message || 'Login failed. Please try again.';
        }
        
        console.log('🍞 Login.jsx: Showing toast message:', toastMessage);
        toast.error(toastMessage);
      }
    } catch (error) {
      console.error('💥 Login.jsx: Unexpected error during login:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }

    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    
    const result = await googleLogin(credentialResponse.credential);
    
    if (result.success) {
      toast.success('Login successful!');
      
      // Get user from localStorage to check role
      const userData = JSON.parse(localStorage.getItem('user'));
      
      // Role-based redirection
      if (userData?.role === 'superadmin') {
        navigate('/super-admin/dashboard');
      } else if (userData?.role === 'employee') {
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

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
        <div className="w-full max-w-md">
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
          <p className="text-gray-400">Sign in to your HRMS account</p>
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
              <Link
                to="/forgot-password"
                className="text-sm text-primary-500 hover:text-primary-400"
              >
                Forgot password?
              </Link>
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
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-500 hover:text-primary-400">
            Contact Admin
          </Link>
        </p>
      </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default Login;
