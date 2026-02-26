import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, Briefcase, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import JobCreateModal from '../components/JobCreateModal';

const JobDesk = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  // Refresh jobs when component becomes visible (handles tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchJobs();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      // Add cache-busting parameter
      const response = await api.get('/jobs', {
        params: { _t: Date.now() },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      console.log('📋 Jobs API Response:', response.data);
      console.log('📊 Jobs Data:', response.data.data);
      console.log('📈 Jobs Count:', response.data.data?.length);
      
      if (response.data.success && response.data.data) {
        setJobs(response.data.data);
      } else {
        console.warn('⚠️ Unexpected response format:', response.data);
        setJobs([]);
      }
    } catch (error) {
      console.error('❌ Error fetching jobs:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to load job postings');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJobCreated = (newJob) => {
    setJobs(prev => [newJob, ...prev]);
    setShowCreateModal(false);
  };

  const handleJobUpdated = (updatedJob) => {
    setJobs(prev => prev.map(job => job._id === updatedJob._id ? updatedJob : job));
    setShowCreateModal(false);
    setEditingJob(null);
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setShowCreateModal(true);
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job posting?')) {
      return;
    }

    try {
      await api.delete(`/jobs/${jobId}`);
      setJobs(prev => prev.filter(job => job._id !== jobId));
      toast.success('Job posting deleted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete job posting');
    }
  };

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      const response = await api.put(`/jobs/${jobId}/status`, { status: newStatus });
      setJobs(prev => prev.map(job => 
        job._id === jobId ? response.data.data : job
      ));
      toast.success(`Job status updated to ${newStatus}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update job status');
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const badges = {
      active: 'badge-success',
      draft: 'badge-warning',
      closed: 'badge-danger',
      'on-hold': 'badge-info',
      archived: 'bg-gray-600 text-gray-300'
    };
    return badges[status] || 'badge-default';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={location.pathname.includes('/hr/recruitment')
          ? "w-12 h-12 border-4 border-[#A88BFF] border-t-transparent rounded-full animate-spin"
          : "w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ backgroundColor: location.pathname.includes('/hr/recruitment') ? '#1E1E2A' : undefined }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Job Desk</h1>
          <p className="text-gray-400 mt-1">Manage job postings and positions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchJobs()}
            className={location.pathname.includes('/hr/recruitment') 
              ? "bg-[#2A2A3A] text-white px-4 py-2.5 rounded-xl border border-gray-700 hover:border-[#A88BFF] transition-all flex items-center space-x-2"
              : "btn-outline flex items-center space-x-2"}
            title="Refresh jobs"
          >
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className={location.pathname.includes('/hr/recruitment') 
              ? "bg-gradient-to-r from-[#A88BFF] to-[#8B6FE8] text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg transition-all flex items-center space-x-2"
              : "btn-primary flex items-center space-x-2"}
          >
            <Plus size={20} />
            <span>Post New Job</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={location.pathname.includes('/hr/recruitment') 
        ? "bg-[#2A2A3A] rounded-2xl p-6 border border-gray-800" 
        : "card"}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={location.pathname.includes('/hr/recruitment')
                ? "w-full bg-[#1E1E2A] text-white pl-10 pr-4 py-2.5 rounded-xl border border-gray-700 focus:border-[#A88BFF] focus:outline-none transition-colors"
                : "input-field pl-10"}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={location.pathname.includes('/hr/recruitment')
              ? "bg-[#1E1E2A] text-white px-4 py-2.5 rounded-xl border border-gray-700 focus:border-[#A88BFF] focus:outline-none transition-colors md:w-48"
              : "input-field md:w-48"}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
            <option value="on-hold">On Hold</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Job Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.map((job) => (
          <div key={job._id} className={location.pathname.includes('/hr/recruitment')
            ? "bg-[#2A2A3A] rounded-2xl p-6 border border-gray-800 hover:border-[#A88BFF] transition-all cursor-pointer"
            : "card hover:border-primary-600 transition-colors cursor-pointer"}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={location.pathname.includes('/hr/recruitment')
                  ? "w-12 h-12 bg-gradient-to-br from-[#A88BFF]/20 to-[#8B6FE8]/20 rounded-xl flex items-center justify-center"
                  : "w-12 h-12 bg-primary-600/20 rounded-lg flex items-center justify-center"}>
                  <Briefcase size={24} className={location.pathname.includes('/hr/recruitment') ? "text-[#A88BFF]" : "text-primary-500"} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                  <p className="text-sm text-gray-400">{job.department?.name}</p>
                </div>
              </div>
              <select
                value={job.status}
                onChange={(e) => handleStatusChange(job._id, e.target.value)}
                className={`badge ${getStatusBadge(job.status)} cursor-pointer hover:opacity-80`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundImage: 'none'
                }}
              >
                <option value="draft" className="bg-gray-800 text-white">Draft</option>
                <option value="active" className="bg-gray-800 text-white">Active</option>
                <option value="on-hold" className="bg-gray-800 text-white">On Hold</option>
                <option value="closed" className="bg-gray-800 text-white">Closed</option>
                <option value="archived" className="bg-gray-800 text-white">Archived</option>
              </select>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-400">
                <span className="font-medium text-gray-300 w-24">Location:</span>
                <span>{job.location}</span>
              </div>
              <div className="flex items-center text-sm text-gray-400">
                <span className="font-medium text-gray-300 w-24">Type:</span>
                <span className="capitalize">{job.employmentType?.replace('-', ' ')}</span>
              </div>
              <div className="flex items-center text-sm text-gray-400">
                <span className="font-medium text-gray-300 w-24">Experience:</span>
                <span>{job.experience?.min}-{job.experience?.max} years</span>
              </div>
              <div className="flex items-center text-sm text-gray-400">
                <span className="font-medium text-gray-300 w-24">Openings:</span>
                <span>{job.openings}</span>
              </div>
              <div className="flex items-center text-sm text-gray-400">
                <span className="font-medium text-gray-300 w-24">Applications:</span>
                <span>{job.applications}</span>
              </div>
              
              {/* Employment Type Specific Information */}
              {(job.employmentType === 'contract-based' || job.employmentType === 'consultant') && (
                <div className="flex items-center text-sm text-gray-400">
                  <span className="font-medium text-gray-300 w-24">Duration:</span>
                  <span>{job.contractDuration || 'Not specified'}</span>
                </div>
              )}
              
              {job.employmentType === 'hourly-based' && (
                <>
                  <div className="flex items-center text-sm text-gray-400">
                    <span className="font-medium text-gray-300 w-24">Hourly Rate:</span>
                    <span>${job.hourlyRate || 'Not specified'}/hr</span>
                  </div>
                  {job.workHours && (
                    <div className="flex items-center text-sm text-gray-400">
                      <span className="font-medium text-gray-300 w-24">Hours/Week:</span>
                      <span>{job.workHours}</span>
                    </div>
                  )}
                </>
              )}
              
              {job.employmentType === 'deliverable-based' && (
                <>
                  <div className="flex items-center text-sm text-gray-400">
                    <span className="font-medium text-gray-300 w-24">Deliverables:</span>
                    <span>{job.deliverables?.length || 0} items</span>
                  </div>
                  {job.contractDuration && (
                    <div className="flex items-center text-sm text-gray-400">
                      <span className="font-medium text-gray-300 w-24">Timeline:</span>
                      <span>{job.contractDuration}</span>
                    </div>
                  )}
                </>
              )}
              
              {job.employmentType === 'rate-based' && (
                <div className="flex items-center text-sm text-gray-400">
                  <span className="font-medium text-gray-300 w-24">Rate:</span>
                  <span>${job.rateAmount || 'Not specified'}/{job.ratePeriod || 'period'}</span>
                </div>
              )}
            </div>

            <div className={location.pathname.includes('/hr/recruitment')
              ? "flex items-center space-x-2 pt-4 border-t border-gray-700"
              : "flex items-center space-x-2 pt-4 border-t border-dark-800"}>
              <button 
                onClick={() => {
                  if (location.pathname.includes('/hr/recruitment')) {
                    navigate(`/employee/hr/recruitment/${job._id}/applicants`);
                  } else {
                    navigate(`/job-desk/${job._id}/applicants`);
                  }
                }}
                className={location.pathname.includes('/hr/recruitment')
                  ? "flex-1 bg-[#1E1E2A] text-white text-sm py-2 rounded-xl border border-gray-700 hover:border-[#A88BFF] transition-all flex items-center justify-center space-x-1"
                  : "flex-1 btn-outline text-sm py-2 flex items-center justify-center space-x-1"}
              >
                <Eye size={16} />
                <span>View</span>
              </button>
              <button 
                onClick={() => handleEdit(job)}
                className={location.pathname.includes('/hr/recruitment')
                  ? "flex-1 bg-[#1E1E2A] text-white text-sm py-2 rounded-xl border border-gray-700 hover:border-[#A88BFF] transition-all flex items-center justify-center space-x-1"
                  : "flex-1 btn-outline text-sm py-2 flex items-center justify-center space-x-1"}
              >
                <Edit size={16} />
                <span>Edit</span>
              </button>
              <button 
                onClick={() => handleDelete(job._id)}
                className={location.pathname.includes('/hr/recruitment')
                  ? "bg-[#1E1E2A] text-red-400 text-sm py-2 px-3 rounded-xl border border-gray-700 hover:border-red-500 hover:bg-red-500/10 transition-all"
                  : "btn-outline text-sm py-2 px-3 text-red-500 hover:bg-red-500/10"}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <div className="text-center py-12">
          <Briefcase size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No job postings found</p>
        </div>
      )}

      {/* Job Creation/Edit Modal */}
      <JobCreateModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingJob(null);
        }}
        onJobCreated={handleJobCreated}
        onJobUpdated={handleJobUpdated}
        editingJob={editingJob}
      />
    </div>
  );
};

export default JobDesk;
