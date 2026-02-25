import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Mail, Phone, Calendar, MapPin, Building, Briefcase } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const EmployeeEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    employeeCode: '',
    designation: '',
    department: '',
    dateOfJoining: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    maritalStatus: '',
    employmentType: 'full-time',
    reportingManager: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    },
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
    }
  });

  useEffect(() => {
    fetchEmployee();
    fetchDepartments();
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const response = await api.get(`/employees/${id}`);
      const employee = response.data.data;
      
      // Handle department - check both department._id and departmentId
      const departmentId = employee.department?._id || employee.departmentId || employee.department || '';
      
      // Handle address structure
      const addressData = typeof employee.address === 'object' && employee.address !== null 
        ? employee.address 
        : { street: employee.address || '', city: '', state: '', zipCode: '', country: '' };
      
      // Handle emergency contact structure
      const emergencyContactData = typeof employee.emergencyContact === 'object' && employee.emergencyContact !== null 
        ? employee.emergencyContact 
        : { name: employee.emergencyContact || '', relationship: '', phone: '' };
      
      // Handle salary structure
      const salaryData = typeof employee.salary === 'object' && employee.salary !== null 
        ? employee.salary 
        : { currency: 'USD', basic: employee.salary || '', hra: '', allowances: '', deductions: '', total: employee.salary || '' };
      
      // Handle bank details structure
      const bankDetailsData = typeof employee.bankDetails === 'object' && employee.bankDetails !== null 
        ? employee.bankDetails 
        : { accountNumber: '', bankName: '', ifscCode: '', accountHolderName: '', branch: '' };
      
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        alternatePhone: employee.alternatePhone || '',
        employeeCode: employee.employeeCode || '',
        designation: employee.designation || '',
        department: departmentId,
        dateOfJoining: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : '',
        dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
        gender: employee.gender || '',
        bloodGroup: employee.bloodGroup || '',
        maritalStatus: employee.maritalStatus || '',
        employmentType: employee.employmentType || 'full-time',
        reportingManager: employee.reportingManager || '',
        address: addressData,
        emergencyContact: emergencyContactData,
        status: employee.status || 'active',
        salary: salaryData,
        bankDetails: bankDetailsData
      });
    } catch (error) {
      toast.error('Failed to load employee details');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Failed to load departments');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      console.log('Current formData before update:', formData);
      console.log('Current salary.currency:', formData.salary.currency);
      
      // Prepare update data with proper handling of nested objects and empty fields
      const updateData = {
        ...formData,
        // Handle department field
        department: formData.department || null,
        // Handle reporting manager field
        reportingManager: formData.reportingManager?.trim() || null,
        // Handle nested objects - only send if they have meaningful data
        address: (formData.address.street || formData.address.city || formData.address.state || formData.address.zipCode) 
          ? formData.address 
          : null,
        emergencyContact: (formData.emergencyContact.name || formData.emergencyContact.phone || formData.emergencyContact.relationship) 
          ? formData.emergencyContact 
          : null,
        // Handle salary - ensure numeric values
        salary: {
          currency: formData.salary.currency || 'USD',
          basic: parseFloat(formData.salary.basic) || 0,
          hra: parseFloat(formData.salary.hra) || 0,
          allowances: parseFloat(formData.salary.allowances) || 0,
          deductions: parseFloat(formData.salary.deductions) || 0,
          total: parseFloat(formData.salary.total) || 0
        },
        // Handle bank details - only send if they have meaningful data
        bankDetails: (formData.bankDetails.accountNumber || formData.bankDetails.bankName || formData.bankDetails.ifscCode) 
          ? formData.bankDetails 
          : null
      };
      
      console.log('Final updateData being sent:', updateData);
      console.log('updateData.salary.currency:', updateData.salary.currency);
      
      const response = await api.put(`/employees/${id}`, updateData);
      console.log('Update response:', response.data);
      toast.success('Employee updated successfully');
      navigate('/employees');
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    console.log('Field changed:', name, 'to:', value);
    
    // Handle nested object updates
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      console.log('Nested field update:', parent, child, value);
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Calculate total salary when salary components change
  const calculateTotalSalary = () => {
    const basic = parseFloat(formData.salary.basic) || 0;
    const hra = parseFloat(formData.salary.hra) || 0;
    const allowances = parseFloat(formData.salary.allowances) || 0;
    const deductions = parseFloat(formData.salary.deductions) || 0;
    return basic + hra + allowances - deductions;
  };
  
  // Update total salary when components change
  React.useEffect(() => {
    const total = calculateTotalSalary();
    if (total !== parseFloat(formData.salary.total)) {
      setFormData(prev => ({
        ...prev,
        salary: {
          ...prev.salary,
          total: total.toString()
        }
      }));
    }
  }, [formData.salary.basic, formData.salary.hra, formData.salary.allowances, formData.salary.deductions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[#A88BFF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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
              Edit Employee
            </h1>
            <p className="text-gray-400 mt-1">Update employee information</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <User size={20} />
            <span>Personal Information</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Alternate Phone
              </label>
              <input
                type="tel"
                name="alternatePhone"
                value={formData.alternatePhone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Date of Birth
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Blood Group
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Marital Status
              </label>
              <select
                name="maritalStatus"
                value={formData.maritalStatus}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              >
                <option value="">Select Marital Status</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-md font-medium text-gray-300 mb-3">Address Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
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
                <label className="block text-sm font-medium text-gray-300 mb-1">
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
                <label className="block text-sm font-medium text-gray-300 mb-1">
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
                <label className="block text-sm font-medium text-gray-300 mb-1">
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
            </div>
            <div className="mt-4">
              <h3 className="text-md font-medium text-gray-300 mb-3">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Contact Name
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
                  <label className="block text-sm font-medium text-gray-300 mb-1">
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
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Contact Phone
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
          </div>
        </div>

        {/* Employment Information */}
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Briefcase size={20} />
            <span>Employment Information</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Employee Code *
              </label>
              <input
                type="text"
                name="employeeCode"
                value={formData.employeeCode}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Date of Joining *
              </label>
              <input
                type="date"
                name="dateOfJoining"
                value={formData.dateOfJoining}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Employment Type
              </label>
              <select
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              >
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Reporting Manager
              </label>
              <input
                type="text"
                name="reportingManager"
                value={formData.reportingManager}
                onChange={handleChange}
                placeholder="Manager's email or name"
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on-leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Salary Information */}
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Building size={20} />
            <span>Salary Information</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Basic Salary
              </label>
              <input
                type="number"
                name="salary.basic"
                value={formData.salary.basic}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                HRA (House Rent Allowance)
              </label>
              <input
                type="number"
                name="salary.hra"
                value={formData.salary.hra}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Other Allowances
              </label>
              <input
                type="number"
                name="salary.allowances"
                value={formData.salary.allowances}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Deductions
              </label>
              <input
                type="number"
                name="salary.deductions"
                value={formData.salary.deductions}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Total Salary
              </label>
              <input
                type="number"
                name="salary.total"
                value={formData.salary.total}
                readOnly
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Automatically calculated (Basic + HRA + Allowances - Deductions)</p>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Building size={20} />
            <span>Bank Details</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
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

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20 flex items-center space-x-2"
          >
            <Save size={20} />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeEdit;
