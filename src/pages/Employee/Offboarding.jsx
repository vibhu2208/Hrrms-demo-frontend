import React, { useEffect, useState, useRef } from 'react';
import { 
  Plus, CheckCircle, Circle, Clock, User, Calendar, FileText, 
  Search, Filter, Eye, Edit, Trash2, X, MoreVertical, CheckSquare,
  AlertCircle, Briefcase, DollarSign, Package, Users, ArrowRight,
  Phone, Mail, MapPin, Building, CreditCard, Settings, Download
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

// Stage labels matching the backend model
const stageLabels = [
  { key: 'exitDiscussion', label: 'Exit Discussion' },
  { key: 'assetReturn', label: 'Asset Return' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'finalSettlement', label: 'Final Settlement' },
  { key: 'success', label: 'Completed' }
];

const statusLabels = {
  'in-progress': { label: 'In Progress', color: 'bg-blue-500', badge: 'badge-info' },
  'completed': { label: 'Completed', color: 'bg-green-500', badge: 'badge-success' },
  'cancelled': { label: 'Cancelled', color: 'bg-red-500', badge: 'badge-danger' }
};

const resignationTypeLabels = {
  'voluntary': 'Voluntary',
  'involuntary': 'Involuntary',
  'retirement': 'Retirement',
  'contract-end': 'Contract End'
};

const resignationReasonToTypeMap = {
  voluntary_resignation: 'voluntary',
  involuntary_termination: 'involuntary',
  retirement: 'retirement',
  contract_end: 'contract-end'
};

const StageProgress = ({ stages, currentStage, status }) => {
  const stageArray = stages || stageLabels.map(s => s.key);
  const currentIndex = stageArray.indexOf(currentStage);
  
  return (
    <div className="flex items-center space-x-1 overflow-x-auto pb-2">
      {stageArray.map((stage, idx) => {
        const done = status === 'completed' || idx < currentIndex;
        const current = idx === currentIndex && status !== 'completed';
        const isLast = idx === stageArray.length - 1;
        
        return (
          <div key={stage} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                done ? 'bg-green-500 text-white' : 
                current ? 'bg-blue-500 text-white animate-pulse' : 
                'bg-gray-700 text-gray-400'
              }`}>
                {done ? <CheckCircle size={18} /> : current ? <Clock size={18} /> : <Circle size={18} />}
              </div>
              <div className={`mt-1 text-xs font-medium text-center max-w-[80px] ${
                done ? 'text-green-400' : current ? 'text-blue-400' : 'text-gray-500'
              }`}>
                {stageLabels.find(x => x.key === stage)?.label || stage}
              </div>
            </div>
            {!isLast && (
              <div className={`mx-2 h-0.5 w-12 transition-all duration-300 ${
                done ? 'bg-green-500' : 'bg-gray-700'
              }`}></div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const Offboarding = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ total: 0, inProgress: 0, completed: 0, cancelled: 0 });
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStage, setFilterStage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExitInterviewModal, setShowExitInterviewModal] = useState(false);
  const [showClearanceModal, setShowClearanceModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [selectedOffboarding, setSelectedOffboarding] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchList();
  }, [filterStatus, filterStage, searchTerm, currentPage]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterStage) params.append('stage', filterStage);
      if (searchTerm) params.append('search', searchTerm);
      params.append('page', currentPage);
      params.append('limit', '10');
      
      const res = await api.get(`/offboarding?${params.toString()}`);
      const offboardingList = res?.data?.data || [];
      
      // If employees are not populated, fetch them separately
      const employeesMap = new Map();
      const employeeIdsToFetch = [];
      
      offboardingList.forEach(item => {
        if (item.employee && typeof item.employee === 'string') {
          // Employee is just an ID string
          employeeIdsToFetch.push(item.employee);
        } else if (item.employee && item.employee._id) {
          // Employee is already an object with _id
          employeesMap.set(item.employee._id.toString(), item.employee);
        } else if (item.employee && item.employee.firstName) {
          // Already populated with data
          employeesMap.set((item.employee._id || item.employeeId || '').toString(), item.employee);
        } else if (item.employeeId && typeof item.employeeId === 'string') {
          // Check employeeId field as fallback
          employeeIdsToFetch.push(item.employeeId);
        }
      });
      
      // Fetch missing employee data from /employees endpoint
      if (employeeIdsToFetch.length > 0) {
        try {
          const uniqueIds = [...new Set(employeeIdsToFetch)];
          
          // Fetch all employees and match by ID
          const employeesRes = await api.get('/employees');
          if (employeesRes?.data?.data) {
            employeesRes.data.data.forEach(emp => {
              if (uniqueIds.includes(emp._id.toString())) {
                employeesMap.set(emp._id.toString(), emp);
              }
            });
          }
        } catch (err) {
          console.error('Error fetching employee details:', err);
        }
      }
      
      // Merge employee data back into offboarding items
      const processedList = offboardingList.map(item => {
        const employeeId = item.employee?._id?.toString() || 
                          (typeof item.employee === 'string' ? item.employee : null) ||
                          item.employeeId?.toString() || 
                          null;
        
        if (employeeId && employeesMap.has(employeeId)) {
          item.employee = employeesMap.get(employeeId);
        } else if (item.employee && typeof item.employee === 'object' && !item.employee.firstName) {
          // Employee object exists but missing data - try to fetch
          const id = item.employee._id || item.employee;
          if (id && employeesMap.has(id.toString())) {
            item.employee = employeesMap.get(id.toString());
          }
        }
        
        return item;
      });
      
      setList(processedList);
      setSummary(res?.data?.summary || {});
      setTotalPages(res?.data?.pagination?.pages || 1);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load offboarding list');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      // Fetch all employees (backend already filters out ex-employees, but we'll double-check)
      const res = await api.get('/employees');
      const allEmployees = res?.data?.data || [];
      
      // Fetch active offboarding records to get employee IDs that are already being offboarded
      const offboardingRes = await api.get('/offboarding', {
        params: {
          status: 'in-progress', // Only check in-progress offboardings
          limit: 1000 // Get all to check all employees
        }
      });
      
      const activeOffboardings = offboardingRes?.data?.data || [];
      const offboardingEmployeeIds = new Set();
      
      // Extract employee IDs from active offboarding records
      activeOffboardings.forEach(offboarding => {
        const employeeId = offboarding.employee?._id?.toString() || 
                          (typeof offboarding.employee === 'string' ? offboarding.employee : null) ||
                          offboarding.employeeId?.toString() || 
                          null;
        if (employeeId) {
          offboardingEmployeeIds.add(employeeId);
        }
      });
      
      // Filter out employees who are already in offboarding AND ex-employees (safety check)
      const availableEmployees = allEmployees.filter(emp => {
        const empId = emp._id?.toString();
        // Exclude if: already in offboarding, is ex-employee, or is not active
        const isExcluded = !empId || 
                          offboardingEmployeeIds.has(empId) || 
                          emp.isExEmployee === true || 
                          emp.isActive === false;
        
        return !isExcluded;
      });
      
      console.log(`Employee filtering: ${allEmployees.length} total, ${availableEmployees.length} available after filtering`);
      setEmployees(availableEmployees);
      
      if (availableEmployees.length === 0) {
        if (allEmployees.length === 0) {
          toast.error('No employees found. Please add employees first.');
        } else {
          toast.warning('All employees are currently in offboarding process.');
        }
      } else if (availableEmployees.length < allEmployees.length) {
        const excludedCount = allEmployees.length - availableEmployees.length;
        console.log(`${excludedCount} employee(s) excluded - already in offboarding`);
      }
      
      return availableEmployees;
    } catch (e) {
      console.error('Error fetching employees:', e);
      toast.error('Failed to load employees');
      return [];
    }
  };

  const fetchOffboardingDetails = async (id) => {
    try {
      const res = await api.get(`/offboarding/${id}`);
      setSelectedOffboarding(res?.data?.data);
      return res?.data?.data;
    } catch (e) {
      toast.error('Failed to load offboarding details');
      return null;
    }
  };

  const initiateOffboarding = async (formData) => {
    try {
      // Map form fields to backend expected format
      const selectedReason = formData.reason;
      const mappedResignationType = resignationReasonToTypeMap[selectedReason] || formData.resignationType || 'voluntary';
      const payload = {
        employeeId: formData.employeeId,
        lastWorkingDate: formData.lastWorkingDay || formData.lastWorkingDate,
        resignationType: mappedResignationType,
        reason: selectedReason || formData.resignationType || mappedResignationType
      };

      await api.post('/offboarding', payload);
      toast.success('Offboarding initiated successfully');
      setShowInitiateModal(false);
      fetchList();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to initiate offboarding');
    }
  };

  const updateOffboarding = async (id, data) => {
    try {
      await api.put(`/offboarding/${id}`, data);
      toast.success('Offboarding updated successfully');
      setShowEditModal(false);
      fetchList();
      if (selectedOffboarding?._id === id) {
        fetchOffboardingDetails(id);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update offboarding');
    }
  };

  const advanceStage = async (id) => {
    try {
      await api.post(`/offboarding/${id}/advance`);
      toast.success('Stage advanced successfully');
      fetchList();
      if (selectedOffboarding?._id === id) {
        fetchOffboardingDetails(id);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to advance stage');
    }
  };

  const cancelOffboarding = async (id, reason) => {
    try {
      await api.put(`/offboarding/${id}/cancel`, { reason });
      toast.success('Offboarding cancelled successfully');
      fetchList();
      if (selectedOffboarding?._id === id) {
        setShowDetailsModal(false);
        setSelectedOffboarding(null);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to cancel offboarding');
    }
  };

  const deleteOffboarding = async (id) => {
    if (!window.confirm('Are you sure you want to delete this offboarding record?')) {
      return;
    }
    try {
      await api.delete(`/offboarding/${id}`);
      toast.success('Offboarding deleted successfully');
      fetchList();
      if (selectedOffboarding?._id === id) {
        setShowDetailsModal(false);
        setSelectedOffboarding(null);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to delete offboarding');
    }
  };

  const scheduleExitInterview = async (id, data) => {
    try {
      await api.post(`/offboarding/${id}/exit-interview/schedule`, data);
      toast.success('Exit interview scheduled successfully');
      fetchList();
      if (selectedOffboarding?._id === id) {
        fetchOffboardingDetails(id);
      }
      setShowExitInterviewModal(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to schedule exit interview');
    }
  };

  const completeExitInterview = async (id, feedback) => {
    try {
      await api.post(`/offboarding/${id}/exit-interview/complete`, { feedback });
      toast.success('Exit interview completed successfully');
      fetchList();
      if (selectedOffboarding?._id === id) {
        fetchOffboardingDetails(id);
      }
      setShowExitInterviewModal(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to complete exit interview');
    }
  };

  const updateClearance = async (id, department, cleared, notes) => {
    try {
      await api.post(`/offboarding/${id}/clearance`, { department, cleared, notes });
      toast.success(`${department.toUpperCase()} clearance updated successfully`);
      fetchList();
      if (selectedOffboarding?._id === id) {
        fetchOffboardingDetails(id);
      }
      setShowClearanceModal(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update clearance');
    }
  };

  const recordAssetReturn = async (id, asset, condition) => {
    try {
      await api.post(`/offboarding/${id}/assets/return`, { asset, condition });
      toast.success('Asset return recorded successfully');
      fetchList();
      if (selectedOffboarding?._id === id) {
        fetchOffboardingDetails(id);
      }
      setShowAssetModal(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to record asset return');
    }
  };

  const processSettlement = async (id, amount, paymentStatus) => {
    try {
      await api.post(`/offboarding/${id}/settlement`, { amount, paymentStatus });
      toast.success('Settlement processed successfully');
      fetchList();
      if (selectedOffboarding?._id === id) {
        fetchOffboardingDetails(id);
      }
      setShowSettlementModal(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to process settlement');
    }
  };

  const handleViewDetails = async (item) => {
    const details = await fetchOffboardingDetails(item._id);
    if (details) {
      setShowDetailsModal(true);
    }
  };

  const handleEdit = async (item) => {
    const details = await fetchOffboardingDetails(item._id);
    if (details) {
      setShowEditModal(true);
    }
  };

  if (loading && list.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E1E2A] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Offboarding</h1>
          <p className="text-gray-400 mt-1">Manage employee exit process</p>
        </div>
        <button 
          onClick={async () => {
            await fetchEmployees();
            setShowInitiateModal(true);
          }}
          className="px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20 flex items-center gap-2 w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Initiate Offboarding</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-500">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total</p>
              <p className="text-xl font-bold text-white">{summary.total || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-yellow-500">
              <Clock size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">In Progress</p>
              <p className="text-xl font-bold text-white">{summary.inProgress || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-green-500">
              <CheckCircle size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Completed</p>
              <p className="text-xl font-bold text-white">{summary.completed || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-500">
              <X size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Cancelled</p>
              <p className="text-xl font-bold text-white">{summary.cancelled || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2 flex-1 min-w-[250px]">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee name, email, or code..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="input-field w-full"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="input-field w-48"
          >
            <option value="all">All Status</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={filterStage}
            onChange={(e) => {
              setFilterStage(e.target.value);
              setCurrentPage(1);
            }}
            className="input-field w-48"
          >
            <option value="">All Stages</option>
            {stageLabels.map(stage => (
              <option key={stage.key} value={stage.key}>{stage.label}</option>
            ))}
          </select>
          
          <button
            onClick={() => {
              setFilterStatus('all');
              setFilterStage('');
              setSearchTerm('');
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors text-sm"
          >
            <Filter size={16} className="mr-2" />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Offboarding List */}
      <div className="space-y-4">
        {list.map((item) => (
          <OffboardingCard
            key={item._id}
            item={item}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onAdvanceStage={advanceStage}
            onCancel={cancelOffboarding}
            onDelete={deleteOffboarding}
            onScheduleExitInterview={(id) => {
              setSelectedOffboarding(item);
              setShowExitInterviewModal(true);
            }}
            onUpdateClearance={(id) => {
              setSelectedOffboarding(item);
              setShowClearanceModal(true);
            }}
            onRecordAsset={(id) => {
              setSelectedOffboarding(item);
              setShowAssetModal(true);
            }}
            onProcessSettlement={(id) => {
              setSelectedOffboarding(item);
              setShowSettlementModal(true);
            }}
          />
        ))}
      </div>

      {/* Empty State */}
      {list.length === 0 && !loading && (
        <div className="text-center py-12 card">
          <Users size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">No offboarding records found</p>
          <p className="text-gray-500 text-sm mt-2">
            {searchTerm || filterStatus !== 'all' || filterStage ? 'Try adjusting your filters' : 'Initiate an offboarding process to get started'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-gray-400 px-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      {showInitiateModal && (
        <InitiateOffboardingModal
          employees={employees}
          onClose={() => setShowInitiateModal(false)}
          onSubmit={initiateOffboarding}
        />
      )}

      {showDetailsModal && selectedOffboarding && (
        <OffboardingDetailsModal
          offboarding={selectedOffboarding}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOffboarding(null);
          }}
          onRefresh={() => fetchOffboardingDetails(selectedOffboarding._id)}
          onEdit={() => {
            setShowDetailsModal(false);
            setShowEditModal(true);
          }}
          onAdvanceStage={advanceStage}
          onScheduleExitInterview={() => setShowExitInterviewModal(true)}
          onUpdateClearance={() => setShowClearanceModal(true)}
          onRecordAsset={() => setShowAssetModal(true)}
          onProcessSettlement={() => setShowSettlementModal(true)}
          onCancel={cancelOffboarding}
          onDelete={deleteOffboarding}
        />
      )}

      {showEditModal && selectedOffboarding && (
        <EditOffboardingModal
          offboarding={selectedOffboarding}
          onClose={() => {
            setShowEditModal(false);
            setSelectedOffboarding(null);
          }}
          onSave={(data) => updateOffboarding(selectedOffboarding._id, data)}
        />
      )}

      {showExitInterviewModal && selectedOffboarding && (
        <ExitInterviewModal
          offboarding={selectedOffboarding}
          employees={employees}
          onClose={() => {
            setShowExitInterviewModal(false);
          }}
          onSchedule={(data) => scheduleExitInterview(selectedOffboarding._id, data)}
          onComplete={(feedback) => completeExitInterview(selectedOffboarding._id, feedback)}
        />
      )}

      {showClearanceModal && selectedOffboarding && (
        <ClearanceModal
          offboarding={selectedOffboarding}
          onClose={() => {
            setShowClearanceModal(false);
          }}
          onUpdate={(department, cleared, notes) => updateClearance(selectedOffboarding._id, department, cleared, notes)}
        />
      )}

      {showAssetModal && selectedOffboarding && (
        <AssetReturnModal
          offboarding={selectedOffboarding}
          onClose={() => {
            setShowAssetModal(false);
          }}
          onRecord={(asset, condition) => recordAssetReturn(selectedOffboarding._id, asset, condition)}
        />
      )}

      {showSettlementModal && selectedOffboarding && (
        <SettlementModal
          offboarding={selectedOffboarding}
          onClose={() => {
            setShowSettlementModal(false);
          }}
          onProcess={(amount, paymentStatus) => processSettlement(selectedOffboarding._id, amount, paymentStatus)}
        />
      )}
    </div>
  );
};

// Offboarding Card Component
const OffboardingCard = ({ 
  item, 
  onViewDetails, 
  onEdit, 
  onAdvanceStage, 
  onCancel, 
  onDelete,
  onScheduleExitInterview,
  onUpdateClearance,
  onRecordAsset,
  onProcessSettlement
}) => {
  const [showActions, setShowActions] = useState(false);
  
  // Handle employee data - could be an object, ID string, or null
  let employee = {};
  if (item.employee) {
    if (typeof item.employee === 'string') {
      // Employee is just an ID, we can't display details without fetching
      employee = { _id: item.employee };
    } else if (typeof item.employee === 'object') {
      employee = item.employee;
    }
  }
  
  // Also check for employeeId as fallback
  if (!employee.firstName && item.employeeId) {
    if (typeof item.employeeId === 'object' && item.employeeId.firstName) {
      employee = item.employeeId;
    }
  }
  
  const statusInfo = statusLabels[item.status] || statusLabels['in-progress'];
  
  // Get employee display name
  const getEmployeeName = () => {
    if (employee.firstName && employee.lastName) {
      return `${employee.firstName} ${employee.lastName}`;
    }
    if (employee.firstName) {
      return employee.firstName;
    }
    if (employee.name) {
      return employee.name;
    }
    if (item.employeeName) {
      return item.employeeName;
    }
    return 'Employee Name Not Available';
  };
  
  // Get employee email
  const getEmployeeEmail = () => {
    return employee.email || item.employeeEmail || 'Email not available';
  };
  
  // Get employee code
  const getEmployeeCode = () => {
    return employee.employeeCode || item.employeeCode || 'N/A';
  };

  return (
    <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl hover:border-[#A88BFF]/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#A88BFF] to-[#7DB539] flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">
                {employee.firstName?.[0] || employee.name?.[0] || 'E'}
                {employee.lastName?.[0] || ''}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {getEmployeeName()}
              </h3>
              <p className="text-sm text-gray-400">{getEmployeeEmail()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-xs text-gray-500">Employee Code</p>
              <p className="text-sm text-gray-300">{getEmployeeCode()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Department</p>
              <p className="text-sm text-gray-300">
                {employee.department?.name || employee.departmentId?.name || item.departmentName || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Resignation Type</p>
              <p className="text-sm text-gray-300 capitalize">
                {resignationTypeLabels[item.resignationType] || item.resignationType || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Last Working Date</p>
              <p className="text-sm text-gray-300">
                {item.lastWorkingDate ? new Date(item.lastWorkingDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <span className={`badge ${statusInfo.badge}`}>
            {statusInfo.label}
          </span>
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400"
            >
              <MoreVertical size={18} />
            </button>
            {showActions && (
              <div className="absolute right-0 top-10 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    onViewDetails(item);
                    setShowActions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Eye size={16} />
                  <span>View Details</span>
                </button>
                <button
                  onClick={() => {
                    onEdit(item);
                    setShowActions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Edit size={16} />
                  <span>Edit</span>
                </button>
                {item.status === 'in-progress' && (
                  <>
                    <button
                      onClick={() => {
                        onAdvanceStage(item._id);
                        setShowActions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <ArrowRight size={16} />
                      <span>Advance Stage</span>
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this offboarding?')) {
                          const reason = prompt('Please provide a reason for cancellation:');
                          if (reason) {
                            onCancel(item._id, reason);
                          }
                        }
                        setShowActions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <X size={16} />
                      <span>Cancel</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this offboarding record?')) {
                      onDelete(item._id);
                    }
                    setShowActions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center space-x-2 rounded-b-lg"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <StageProgress 
          stages={item.stages}
          currentStage={item.currentStage}
          status={item.status}
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        <div className="text-sm text-gray-400">
          Created: {new Date(item.createdAt).toLocaleDateString()}
        </div>
        {item.status === 'in-progress' && (
          <button
            onClick={() => onAdvanceStage(item._id)}
            className="px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20 text-sm"
          >
            Advance Stage
          </button>
        )}
      </div>
    </div>
  );
};

// Initiate Offboarding Modal
const InitiateOffboardingModal = ({ employees, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    employeeId: '',
    reason: '',
    lastWorkingDay: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowEmployeeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter employees based on search term
  const filteredEmployees = employees?.filter(emp => {
    if (!searchTerm) return true; // Show all employees if search is empty
    const searchLower = searchTerm.toLowerCase();
    return (
      (emp.firstName || '').toLowerCase().includes(searchLower) ||
      (emp.lastName || '').toLowerCase().includes(searchLower) ||
      (emp.email || '').toLowerCase().includes(searchLower) ||
      (emp.employeeCode || '').toLowerCase().includes(searchLower) ||
      `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase().includes(searchLower)
    );
  }) || [];

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setFormData({ ...formData, employeeId: employee._id });
    setSearchTerm(`${employee.firstName || ''} ${employee.lastName || ''} - ${employee.email || ''} (${employee.employeeCode || ''})`);
    setShowEmployeeDropdown(false);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowEmployeeDropdown(true);
    setHighlightedIndex(-1);
    if (e.target.value === '') {
      setSelectedEmployee(null);
      setFormData({ ...formData, employeeId: '' });
    }
  };

  const handleKeyDown = (e) => {
    if (!showEmployeeDropdown || filteredEmployees.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredEmployees.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredEmployees[highlightedIndex]) {
          handleEmployeeSelect(filteredEmployees[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowEmployeeDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.reason || !formData.lastWorkingDay) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    await onSubmit(formData);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#2A2A3A] rounded-2xl border border-gray-800 p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Initiate Offboarding</h2>
            <p className="text-sm text-gray-400 mt-1">Start the offboarding process for an employee</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Employee <span className="text-red-400">*</span>
            </label>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowEmployeeDropdown(true)}
                  placeholder="Search by name, email, or employee code..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
                  disabled={!employees || employees.length === 0}
                />
              </div>
              
              {/* Employee Dropdown */}
              {showEmployeeDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-[#1E1E2A] border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp, index) => (
                      <div
                        key={emp._id}
                        onClick={() => handleEmployeeSelect(emp)}
                        className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-700 last:border-b-0 ${
                          index === highlightedIndex ? 'bg-[#A88BFF] text-white' : 'hover:bg-[#2A2A3A]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-[#A88BFF] rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {(emp.firstName?.[0] || emp.email?.[0] || '?').toUpperCase()}
                            </div>
                            <div>
                              <div className="text-white font-medium">
                                {emp.firstName || ''} {emp.lastName || ''}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {emp.email || ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-400 text-sm">
                              {emp.employeeCode || ''}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {emp.department?.name || emp.department || ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-400 text-center">
                      {searchTerm ? `No employees found matching "${searchTerm}"` : 'No employees available'}
                    </div>
                  )}
                </div>
              )}
            </div>
            {(!employees || employees.length === 0) && (
              <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-yellow-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  All employees are currently in offboarding process or no employees found.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all cursor-pointer"
              required
            >
              <option value="" className="bg-[#1E1E2A] text-gray-400">Select Reason</option>
              <option value="voluntary_resignation" className="bg-[#1E1E2A] text-white">Voluntary Resignation</option>
              <option value="involuntary_termination" className="bg-[#1E1E2A] text-white">Involuntary Termination</option>
              <option value="retirement" className="bg-[#1E1E2A] text-white">Retirement</option>
              <option value="contract_end" className="bg-[#1E1E2A] text-white">Contract End</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Last Working Day <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={formData.lastWorkingDay}
              onChange={(e) => setFormData({ ...formData, lastWorkingDay: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF] focus:border-transparent transition-all"
              required
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-2.5 text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700 hover:text-white hover:border-gray-600 transition-all"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-5 py-2.5 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#A88BFF]/20"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Initiate Offboarding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Offboarding Details Modal
const OffboardingDetailsModal = ({ 
  offboarding, 
  onClose, 
  onRefresh,
  onEdit,
  onAdvanceStage,
  onScheduleExitInterview,
  onUpdateClearance,
  onRecordAsset,
  onProcessSettlement,
  onCancel,
  onDelete
}) => {
  const employee = offboarding.employee || {};
  const clearance = offboarding.clearanceSummary || offboarding.clearance || {};

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {employee.firstName} {employee.lastName}
            </h2>
            <p className="text-gray-400 mt-1">Offboarding Details</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Employee Information */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Employee Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-gray-300">{employee.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Employee Code</p>
                <p className="text-sm text-gray-300">{employee.employeeCode || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="text-sm text-gray-300">{employee.department?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Designation</p>
                <p className="text-sm text-gray-300">{employee.designation || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Working Date</p>
                <p className="text-sm text-gray-300">
                  {offboarding.lastWorkingDate ? new Date(offboarding.lastWorkingDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Resignation Type</p>
                <p className="text-sm text-gray-300 capitalize">
                  {resignationTypeLabels[offboarding.resignationType] || offboarding.resignationType || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Stage Progress */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Stage Progress</h3>
            <StageProgress 
              stages={offboarding.stages}
              currentStage={offboarding.currentStage}
              status={offboarding.status}
            />
          </div>

          {/* Clearance Status */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Clearance Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['hr', 'finance', 'it', 'admin'].map(dept => (
                <div key={dept} className="card p-4">
                  <p className="text-sm font-medium text-gray-300 mb-2 capitalize">{dept}</p>
                  <div className={`badge ${clearance[dept]?.cleared ? 'badge-success' : 'badge-warning'}`}>
                    {clearance[dept]?.cleared ? 'Cleared' : 'Pending'}
                  </div>
                  {clearance[dept]?.clearedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(clearance[dept].clearedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Exit Interview */}
          {offboarding.exitInterview && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Exit Interview</h3>
              <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-4 shadow-xl">
                {offboarding.exitInterview.completed ? (
                  <div>
                    <p className="text-sm text-green-400 mb-2">Completed</p>
                    {offboarding.exitInterview.feedback && (
                      <p className="text-sm text-gray-300">{offboarding.exitInterview.feedback}</p>
                    )}
                  </div>
                ) : offboarding.exitInterview.scheduledDate ? (
                  <p className="text-sm text-gray-300">
                    Scheduled for {new Date(offboarding.exitInterview.scheduledDate).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">Not scheduled</p>
                )}
              </div>
            </div>
          )}

          {/* Final Settlement */}
          {offboarding.finalSettlement && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Final Settlement</h3>
              <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-4 shadow-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="text-sm text-gray-300">
                      {offboarding.finalSettlement.amount 
                        ? `₹${offboarding.finalSettlement.amount.toLocaleString()}` 
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payment Status</p>
                    <p className="text-sm text-gray-300 capitalize">
                      {offboarding.finalSettlement.paymentStatus || 'Pending'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {offboarding.status === 'in-progress' && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-700">
              <button onClick={() => onAdvanceStage(offboarding._id)} className="px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20">
                Advance Stage
              </button>
              <button onClick={onScheduleExitInterview} className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors">
                Schedule Exit Interview
              </button>
              <button onClick={onUpdateClearance} className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors">
                Update Clearance
              </button>
              <button onClick={onRecordAsset} className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors">
                Record Asset Return
              </button>
              <button onClick={onProcessSettlement} className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors">
                Process Settlement
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Edit Offboarding Modal
const EditOffboardingModal = ({ offboarding, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    lastWorkingDate: offboarding.lastWorkingDate ? new Date(offboarding.lastWorkingDate).toISOString().split('T')[0] : '',
    reason: offboarding.reason || '',
    notes: offboarding.notes || ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSave(formData);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Edit Offboarding</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Last Working Date
            </label>
            <input
              type="date"
              value={formData.lastWorkingDate}
              onChange={(e) => setFormData({ ...formData, lastWorkingDate: e.target.value })}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field w-full"
              rows="4"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Exit Interview Modal
const ExitInterviewModal = ({ offboarding, employees, onClose, onSchedule, onComplete }) => {
  const [scheduledDate, setScheduledDate] = useState('');
  const [conductedBy, setConductedBy] = useState('');
  const [feedback, setFeedback] = useState('');

  if (offboarding.exitInterview?.completed) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Exit Interview</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <p className="text-green-400">Exit interview completed</p>
            {offboarding.exitInterview.feedback && (
              <div>
                <p className="text-sm text-gray-400 mb-2">Feedback:</p>
                <p className="text-sm text-gray-300">{offboarding.exitInterview.feedback}</p>
              </div>
            )}
            <button onClick={onClose} className="px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20 w-full">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Exit Interview</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {offboarding.exitInterview?.scheduledDate ? (
          <div className="space-y-4">
            <p className="text-gray-300">
              Scheduled for {new Date(offboarding.exitInterview.scheduledDate).toLocaleDateString()}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Feedback
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="input-field w-full"
                rows="4"
                placeholder="Enter exit interview feedback..."
              />
            </div>
            <button
              onClick={() => onComplete(feedback)}
              className="px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20 w-full"
            >
              Complete Interview
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <button
              onClick={() => onSchedule({ scheduledDate, conductedBy })}
              className="px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20 w-full"
            >
              Schedule Interview
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Clearance Modal
const ClearanceModal = ({ offboarding, onClose, onUpdate }) => {
  const [department, setDepartment] = useState('hr');
  const [cleared, setCleared] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(department, cleared, notes);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Update Clearance</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="input-field w-full"
            >
              <option value="hr">HR</option>
              <option value="finance">Finance</option>
              <option value="it">IT</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={cleared}
                onChange={(e) => setCleared(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-300">Mark as Cleared</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field w-full"
              rows="3"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20"
            >
              Update Clearance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Asset Return Modal
const AssetReturnModal = ({ offboarding, onClose, onRecord }) => {
  const [assetId, setAssetId] = useState('');
  const [condition, setCondition] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!assetId || !condition) {
      toast.error('Please fill all required fields');
      return;
    }
    onRecord(assetId, condition);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Record Asset Return</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Asset ID
            </label>
            <input
              type="text"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="input-field w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Condition
            </label>
            <textarea
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="input-field w-full"
              rows="3"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20"
            >
              Record Return
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Settlement Modal
const SettlementModal = ({ offboarding, onClose, onProcess }) => {
  const [amount, setAmount] = useState(offboarding.finalSettlement?.amount || '');
  const [paymentStatus, setPaymentStatus] = useState(offboarding.finalSettlement?.paymentStatus || 'pending');

  const handleSubmit = (e) => {
    e.preventDefault();
    onProcess(parseFloat(amount), paymentStatus);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Process Settlement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Settlement Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Payment Status
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="input-field w-full"
            >
              <option value="pending">Pending</option>
              <option value="processed">Processed</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20"
            >
              Process Settlement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Offboarding;
