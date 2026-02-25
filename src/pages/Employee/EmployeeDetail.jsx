import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase, DollarSign, Edit, User } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  // Helper function to safely format salary values
  const formatSalary = (value, currency = 'USD') => {
    if (value === null || value === undefined || value === '') {
      return `${currency} 0`;
    }
    
    // Handle encrypted/hashed looking strings
    if (typeof value === 'string') {
      // Check if it looks like an encrypted hash (long string with special chars)
      if (value.length > 50 && /[:\/]/.test(value)) {
        console.warn('Detected potentially encrypted salary value:', value);
        return `${currency} 0`;
      }
      
      // Try to parse as number
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return `${currency} 0`;
      }
      value = numValue;
    }
    
    // Handle numbers
    if (typeof value === 'number') {
      return `${currency} ${value.toLocaleString()}`;
    }
    
    return `${currency} 0`;
  };

  const fetchEmployee = async () => {
    try {
      const response = await api.get(`/employees/${id}`);
      const employeeData = response.data.data;
      console.log('Employee data received:', employeeData);
      console.log('Salary data:', employeeData.salary);
      setEmployee(employeeData);
    } catch (error) {
      toast.error('Failed to load employee details');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[#A88BFF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!employee) return null;

  return (
    <div className="min-h-screen bg-[#1E1E2A] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/employees')}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Employee Details
          </h1>
          <p className="text-gray-400 mt-1">{employee.employeeCode}</p>
        </div>
        <button
          onClick={() => navigate(`/employees/${id}/edit`)}
          className="px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20 flex items-center space-x-2"
        >
          <Edit size={16} />
          <span>Edit Employee</span>
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#A88BFF] to-[#7DB539] flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-3xl">
              {employee.firstName[0]}{employee.lastName[0]}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">
              {employee.firstName} {employee.lastName}
            </h2>
            <p className="text-gray-400 mt-1">{employee.designation}</p>
            <div className="flex items-center space-x-4 mt-4">
              <div className="flex items-center space-x-2 text-gray-400">
                <Mail size={16} />
                <span>{employee.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400">
                <Phone size={16} />
                <span>{employee.phone}</span>
              </div>
            </div>
            <div className="mt-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full ${
                employee.status === 'active' 
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                  : employee.status === 'on-leave'
                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                  : 'bg-red-500/10 text-red-400 border border-red-500/30'
              }`}>
                {employee.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employment Information */}
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Briefcase size={20} />
            <span>Employment Information</span>
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Department</p>
              <p className="text-white">{employee.department?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Employment Type</p>
              <p className="text-white capitalize">
                {employee.employmentType?.replace(/-/g, ' ') || 'Full Time'}
              </p>
              {employee.hasActiveContract && (
                <span className="inline-block mt-1 px-2 py-1 text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded">
                  Active Contract
                </span>
              )}
            </div>
            {employee.contractId && (
              <div>
                <p className="text-sm text-gray-400">Contract</p>
                <button
                  onClick={() => navigate(`/contracts/${employee.contractId}`)}
                  className="text-primary-400 hover:text-primary-300 text-sm underline"
                >
                  View Contract Details
                </button>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-400">Joining Date</p>
              <p className="text-white">
                {employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Reporting Manager</p>
              <p className="text-white">
                {employee.reportingManager ? 
                  `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}` : 
                  'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Salary Information */}
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <DollarSign size={20} />
            <span>Salary Information</span>
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Currency</p>
              <p className="text-white font-medium">
                {typeof employee.salary === 'object' && employee.salary !== null 
                  ? employee.salary.currency || 'USD' 
                  : 'USD'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Basic Salary</p>
              <p className="text-white">
                {typeof employee.salary === 'object' && employee.salary !== null 
                  ? formatSalary(employee.salary.basic, employee.salary.currency) 
                  : formatSalary(employee.salary)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">HRA</p>
              <p className="text-white">
                {typeof employee.salary === 'object' && employee.salary !== null 
                  ? formatSalary(employee.salary.hra, employee.salary.currency) 
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Allowances</p>
              <p className="text-white">
                {typeof employee.salary === 'object' && employee.salary !== null 
                  ? formatSalary(employee.salary.allowances, employee.salary.currency) 
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Deductions</p>
              <p className="text-white">
                {typeof employee.salary === 'object' && employee.salary !== null 
                  ? formatSalary(employee.salary.deductions, employee.salary.currency) 
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Salary</p>
              <p className="text-white font-bold text-lg">
                {typeof employee.salary === 'object' && employee.salary !== null 
                  ? formatSalary(employee.salary.total, employee.salary.currency) 
                  : formatSalary(employee.salary)}
              </p>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Calendar size={20} />
            <span>Personal Information</span>
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Date of Birth</p>
              <p className="text-white">
                {employee.dateOfBirth ? 
                  new Date(employee.dateOfBirth).toLocaleDateString() : 
                  'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Gender</p>
              <p className="text-white capitalize">{employee.gender || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Blood Group</p>
              <p className="text-white">{employee.bloodGroup || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Marital Status</p>
              <p className="text-white capitalize">{employee.maritalStatus || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Alternate Phone</p>
              <p className="text-white">{employee.alternatePhone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Address</p>
              <p className="text-white">
                {typeof employee.address === 'object' && employee.address !== null ? (
                  [
                    employee.address.street,
                    employee.address.city,
                    employee.address.state,
                    employee.address.zipCode
                  ].filter(Boolean).join(', ') || 'N/A'
                ) : (
                  employee.address || 'N/A'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <DollarSign size={20} />
            <span>Bank Details</span>
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Account Number</p>
              <p className="text-white">
                {typeof employee.bankDetails === 'object' && employee.bankDetails !== null 
                  ? (employee.bankDetails.accountNumber || 'N/A')
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Bank Name</p>
              <p className="text-white">
                {typeof employee.bankDetails === 'object' && employee.bankDetails !== null 
                  ? (employee.bankDetails.bankName || 'N/A')
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">IFSC Code</p>
              <p className="text-white">
                {typeof employee.bankDetails === 'object' && employee.bankDetails !== null 
                  ? (employee.bankDetails.ifscCode || 'N/A')
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Account Holder Name</p>
              <p className="text-white">
                {typeof employee.bankDetails === 'object' && employee.bankDetails !== null 
                  ? (employee.bankDetails.accountHolderName || 'N/A')
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Branch</p>
              <p className="text-white">
                {typeof employee.bankDetails === 'object' && employee.bankDetails !== null 
                  ? (employee.bankDetails.branch || 'N/A')
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <User size={20} />
            <span>Emergency Contact</span>
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Name</p>
              <p className="text-white">
                {typeof employee.emergencyContact === 'object' && employee.emergencyContact !== null 
                  ? (employee.emergencyContact.name || 'N/A')
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Relationship</p>
              <p className="text-white">
                {typeof employee.emergencyContact === 'object' && employee.emergencyContact !== null 
                  ? (employee.emergencyContact.relationship || 'N/A')
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Phone</p>
              <p className="text-white">
                {typeof employee.emergencyContact === 'object' && employee.emergencyContact !== null 
                  ? (employee.emergencyContact.phone || 'N/A')
                  : (typeof employee.emergencyContact === 'string' ? employee.emergencyContact : 'N/A')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetail;
