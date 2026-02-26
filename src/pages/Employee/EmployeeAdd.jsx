import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const EmployeeAdd = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employeeCode: '', 
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'male',
    bloodGroup: '',
    maritalStatus: 'single',
    alternatePhone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    department: '',
    designation: '',
    joiningDate: '',
    employmentType: 'full-time',
    status: 'active', 
    salary: {
      currency: 'USD',
      basic: '',
      hra: '',
      allowances: '',
      deductions: '',
      total: ''
    },
    bankDetails: {
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      accountHolderName: '',
      branch: ''
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    }
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data);
    } catch (error) {
      toast.error('Failed to load departments');
    }
  };

  const calculateTotalSalary = (basic, hra, allowances, deductions) => {
    const basicNum = parseFloat(basic) || 0;
    const hraNum = parseFloat(hra) || 0;
    const allowancesNum = parseFloat(allowances) || 0;
    const deductionsNum = parseFloat(deductions) || 0;
    return basicNum + hraNum + allowancesNum - deductionsNum;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      if (parent === 'salary') {
        setFormData(prev => {
          const updatedSalary = {
            ...prev.salary,
            [child]: value
          };

          // Auto-calculate total salary when salary fields change
          const total = calculateTotalSalary(
            updatedSalary.basic,
            updatedSalary.hra,
            updatedSalary.allowances,
            updatedSalary.deductions
          );

          return {
            ...prev,
            salary: {
              ...updatedSalary,
              total: total.toString()
            }
          };
        });
      } else {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.department || !formData.designation || !formData.joiningDate) {
      toast.error('Please fill in all required fields');
      setLoading(false);
      return;
    }

    // Prepare data for backend (convert salary fields to numbers and handle enum fields)
    const submitData = {
      ...formData,
      ...(formData.employeeCode && formData.employeeCode.trim() ? { employeeCode: formData.employeeCode } : {}),
      // Handle enum fields - only include if they have valid values
      ...(formData.gender && formData.gender.trim() ? { gender: formData.gender } : {}),
      ...(formData.bloodGroup && formData.bloodGroup.trim() ? { bloodGroup: formData.bloodGroup } : {}),
      ...(formData.maritalStatus && formData.maritalStatus.trim() ? { maritalStatus: formData.maritalStatus } : {}),
      salary: {
        currency: formData.salary.currency || 'USD',
        basic: parseFloat(formData.salary.basic) || 0,
        hra: parseFloat(formData.salary.hra) || 0,
        allowances: parseFloat(formData.salary.allowances) || 0,
        deductions: parseFloat(formData.salary.deductions) || 0,
        total: parseFloat(formData.salary.total) || 0
      }
    };

    try {
      const response = await api.post('/employees', submitData);
      toast.success('Employee added successfully');
      console.log('Employee created:', response.data);
      navigate('/employees');
    } catch (error) {
      console.error('Employee creation error details:', error);
      
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.status === 400) {
        toast.error('Please check all required fields and try again');
      } else if (error.response?.status === 401) {
        toast.error('You are not authorized to add employees');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. Admin or HR permissions required');
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please check if MongoDB is running and properly connected.');
      } else {
        toast.error('Failed to add employee. Please try again.');
      }
      console.error('Employee creation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1E1E2A] space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/employees')}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Add New Employee
            </h1>
            <p className="text-gray-400 mt-1">Fill in the employee details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/employees/bulk-upload')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E1E2A] border border-gray-700 text-gray-200 text-sm font-medium hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors"
            title="Bulk Upload Employees"
          >
            <Upload size={18} />
            <span>Bulk Upload</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#A88BFF] rounded-full"></span>
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Employee Code *
              </label>
              <input
                type="text"
                name="employeeCode"
                value={formData.employeeCode}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
                placeholder="Leave blank for auto-generation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date of Birth (Optional)
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Gender (Optional)
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Blood Group (Optional)
              </label>
              <select
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Marital Status (Optional)
              </label>
              <select
                name="maritalStatus"
                value={formData.maritalStatus}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Alternate Phone (Optional)
              </label>
              <input
                type="tel"
                name="alternatePhone"
                value={formData.alternatePhone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#A88BFF] rounded-full"></span>
            Address Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Street Address
              </label>
              <input
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                City
              </label>
              <input
                type="text"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                State
              </label>
              <input
                type="text"
                name="address.state"
                value={formData.address.state}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                name="address.zipCode"
                value={formData.address.zipCode}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Country
              </label>
              <input
                type="text"
                name="address.country"
                value={formData.address.country}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#A88BFF] rounded-full"></span>
            Employment Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Department *
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Designation *
              </label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Joining Date *
              </label>
              <input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Employment Type (Optional)
              </label>
              <select
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              >
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="consultant">Consultant</option>
                <option value="intern">Intern</option>
                <option value="contract-based">Contract Based</option>
                <option value="deliverable-based">Deliverable Based</option>
                <option value="rate-based">Rate Based</option>
                <option value="hourly-based">Hourly Based</option>
              </select>
            </div>
          </div>
        </div>

        {/* Salary Details */}
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#A88BFF] rounded-full"></span>
            Salary Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Currency
              </label>
              <select
                name="salary.currency"
                value={formData.salary.currency}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="INR">INR - Indian Rupee</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="JPY">JPY - Japanese Yen</option>
                <option value="CNY">CNY - Chinese Yuan</option>
                <option value="SGD">SGD - Singapore Dollar</option>
                <option value="AED">AED - UAE Dirham</option>
                <option value="SAR">SAR - Saudi Riyal</option>
                <option value="MYR">MYR - Malaysian Ringgit</option>
                <option value="THB">THB - Thai Baht</option>
                <option value="PHP">PHP - Philippine Peso</option>
                <option value="IDR">IDR - Indonesian Rupiah</option>
                <option value="VND">VND - Vietnamese Dong</option>
                <option value="HKD">HKD - Hong Kong Dollar</option>
                <option value="KRW">KRW - South Korean Won</option>
                <option value="CHF">CHF - Swiss Franc</option>
                <option value="SEK">SEK - Swedish Krona</option>
                <option value="NOK">NOK - Norwegian Krone</option>
                <option value="DKK">DKK - Danish Krone</option>
                <option value="PLN">PLN - Polish Zloty</option>
                <option value="CZK">CZK - Czech Koruna</option>
                <option value="HUF">HUF - Hungarian Forint</option>
                <option value="RUB">RUB - Russian Ruble</option>
                <option value="TRY">TRY - Turkish Lira</option>
                <option value="ZAR">ZAR - South African Rand</option>
                <option value="BRL">BRL - Brazilian Real</option>
                <option value="MXN">MXN - Mexican Peso</option>
                <option value="ARS">ARS - Argentine Peso</option>
                <option value="CLP">CLP - Chilean Peso</option>
                <option value="COP">COP - Colombian Peso</option>
                <option value="PEN">PEN - Peruvian Sol</option>
                <option value="UYU">UYU - Uruguayan Peso</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Basic Salary
              </label>
              <input
                type="number"
                name="salary.basic"
                value={formData.salary.basic}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                HRA
              </label>
              <input
                type="number"
                name="salary.hra"
                value={formData.salary.hra}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Allowances
              </label>
              <input
                type="number"
                name="salary.allowances"
                value={formData.salary.allowances}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Deductions
              </label>
              <input
                type="number"
                name="salary.deductions"
                value={formData.salary.deductions}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Total Salary (Auto-calculated)
              </label>
              <input
                type="number"
                name="salary.total"
                value={formData.salary.total}
                className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300 cursor-not-allowed"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#A88BFF] rounded-full"></span>
            Bank Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Account Number
              </label>
              <input
                type="text"
                name="bankDetails.accountNumber"
                value={formData.bankDetails.accountNumber}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bank Name
              </label>
              <input
                type="text"
                name="bankDetails.bankName"
                value={formData.bankDetails.bankName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                IFSC Code
              </label>
              <input
                type="text"
                name="bankDetails.ifscCode"
                value={formData.bankDetails.ifscCode}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Account Holder Name
              </label>
              <input
                type="text"
                name="bankDetails.accountHolderName"
                value={formData.bankDetails.accountHolderName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Branch
              </label>
              <input
                type="text"
                name="bankDetails.branch"
                value={formData.bankDetails.branch}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#A88BFF] rounded-full"></span>
            Emergency Contact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                name="emergencyContact.name"
                value={formData.emergencyContact.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Relationship
              </label>
              <input
                type="text"
                name="emergencyContact.relationship"
                value={formData.emergencyContact.relationship}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone
              </label>
              <input
                type="tel"
                name="emergencyContact.phone"
                value={formData.emergencyContact.phone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="px-6 py-2.5 text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700 hover:text-white hover:border-gray-600 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg shadow-[#A88BFF]/20"
          >
            <Save size={18} />
            <span>{loading ? 'Saving...' : 'Save Employee'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeAdd;
