import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Filter, Upload, Users, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data.data);
    } catch (error) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await api.delete(`/employees/${id}`);
        toast.success('Employee deleted successfully');
        fetchEmployees();
      } catch (error) {
        if (error.response?.status === 403) {
          toast.error('HR users are not authorized to delete employees. Please contact an admin for this action.');
        } else {
          toast.error('Failed to delete employee');
        }
      }
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const badges = {
      active: 'badge-success',
      inactive: 'badge-default',
      'on-leave': 'badge-warning',
      terminated: 'badge-danger'
    };
    return badges[status] || 'badge-default';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#1E1E2A]">
        <div className="w-12 h-12 border-4 border-[#A88BFF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E1E2A] space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-[#A88BFF]" />
            Employees
          </h1>
          <p className="text-gray-400 mt-1">Manage your workforce</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to="/employees/bulk-upload" 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E1E2A] border border-gray-700 text-gray-200 text-sm font-medium hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors"
          >
            <Upload size={18} />
            <span>Bulk Upload</span>
          </Link>
          <Link 
            to="/employees/add" 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#A88BFF] text-white text-sm font-medium hover:bg-[#B89CFF] transition-colors shadow-lg shadow-[#A88BFF]/20"
          >
            <Plus size={18} />
            <span>Add Employee</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by name, email, or employee code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all cursor-pointer md:w-48"
            >
              <option value="all" className="bg-[#1E1E2A]">All Status</option>
              <option value="active" className="bg-[#1E1E2A]">Active</option>
              <option value="inactive" className="bg-[#1E1E2A]">Inactive</option>
              <option value="on-leave" className="bg-[#1E1E2A]">On Leave</option>
              <option value="terminated" className="bg-[#1E1E2A]">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#232334] border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[200px]">
                  Employee
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[120px]">
                  Employee Code
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[120px]">
                  Department
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[120px]">
                  Designation
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[200px]">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[120px]">
                  Phone
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[100px]">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[120px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredEmployees.map((employee) => (
                <tr key={employee._id} className="hover:bg-[#1E1E2A]/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#A88BFF] to-[#7DB539] flex items-center justify-center shadow-lg">
                          <span className="text-sm font-bold text-white">
                            {employee.firstName?.[0]}{employee.lastName?.[0]}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {employee.firstName} {employee.lastName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{employee.employeeCode}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{employee.department?.name || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{employee.designation || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{employee.email}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{employee.phone || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full ${
                        employee.status === 'active' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                          : employee.status === 'inactive'
                          ? 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
                          : employee.status === 'on-leave'
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {employee.status === 'active' && <CheckCircle size={12} className="text-green-400" />}
                        {employee.status}
                      </span>
                      {employee.hasActiveContract && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          Contract
                        </span>
                      )}
                      {employee.employmentType && employee.employmentType.startsWith('contract-') && !employee.hasActiveContract && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                          Contract (Pending)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/employees/${employee._id}`}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 border border-blue-500/30 transition-all"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        to={`/employees/${employee._id}/edit`}
                        className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300 border border-yellow-500/30 transition-all"
                        title="Edit Employee"
                      >
                        <Edit size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(employee._id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/30 transition-all"
                        title="Delete Employee"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No employees found</h3>
            <p className="text-sm text-gray-400">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Get started by adding your first employee.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeList;
