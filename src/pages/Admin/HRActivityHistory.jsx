import React, { useEffect, useState } from 'react';
import {
  History, Search, Filter, Calendar, User, Activity, TrendingUp,
  Users, Clock, FileText, UserPlus, Send, CheckCircle, XCircle,
  Briefcase, Download, RefreshCw, ChevronDown, ChevronUp, Upload
} from 'lucide-react';
import { getHRActivityHistory, getHRActivityStats, createTestHRActivityLog } from '../../api/hrActivityHistory';
import toast from 'react-hot-toast';

const HRActivityHistory = () => {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    hrUserId: '',
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50
  });
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    pages: 1
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('📋 Frontend: Fetching HR activity history with filters:', filters);

      const [historyRes, statsRes] = await Promise.all([
        getHRActivityHistory(filters),
        getHRActivityStats({
          startDate: filters.startDate,
          endDate: filters.endDate
        })
      ]);

      console.log('📊 Frontend: Received HR activity data:', {
        activitiesCount: historyRes.data.activities?.length || 0,
        pagination: historyRes.data.pagination,
        stats: statsRes.data
      });

      setActivities(historyRes.data.activities || []);
      setPagination(historyRes.data.pagination || pagination);
      setStats(statsRes.data || null);
    } catch (error) {
      console.error('❌ Frontend: Error fetching HR activity history:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to load HR activity history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page on filter change
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getActionIcon = (action) => {
    const iconMap = {
      'send_to_onboarding': Send,
      'employee_created': UserPlus,
      'employee_updated': User,
      'employee_deleted': XCircle,
      'onboarding_completed': CheckCircle,
      'onboarding_status_changed': Activity,
      'document_verified': CheckCircle,
      'document_rejected': XCircle,
      'offer_sent': Send,
      'offer_accepted': CheckCircle,
      'candidate_shortlisted': Users,
      'candidate_rejected': XCircle,
      'interview_scheduled': Calendar,
      'interview_feedback_added': FileText,
      'job_posting_created': Briefcase,
      'job_posting_updated': Briefcase,
      'job_posting_closed': XCircle,
      'bulk_upload': Upload,
      'user_created': UserPlus,
      'user_updated': User,
      'user_deactivated': XCircle,
      'department_created': Briefcase,
      'department_updated': Briefcase,
      'leave_approved': CheckCircle,
      'leave_rejected': XCircle,
      'attendance_marked': CheckCircle,
      'other': Activity
    };
    return iconMap[action] || Activity;
  };

  const getActionColor = (action) => {
    return 'text-gray-200 bg-gray-700/40 border-gray-600/60';
  };

  const formatActionName = (action) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now - then) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return formatDate(date);
  };

  return (
    <div className="min-h-screen bg-[#1E1E2A] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <History className="w-8 h-8 text-gray-200" />
            HR Activity History
          </h1>
          <p className="text-gray-400 mt-1">Track all HR activities and timeline</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2A2A3A] text-white text-sm font-medium hover:bg-[#3A3A4A] border border-gray-700 transition-colors"
          >
            <Filter size={18} />
            <span>Filters</span>
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2A2A3A] text-white text-sm font-medium hover:bg-[#3A3A4A] border border-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={async () => {
              try {
                await createTestHRActivityLog();
                toast.success('Test HR activity log created!');
                fetchData(); // Refresh the list
              } catch (error) {
                toast.error('Failed to create test log');
                console.error('Test log error:', error);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2A2A3A] text-white text-sm font-medium hover:bg-[#3A3A4A] border border-gray-700 transition-colors"
          >
            <Activity size={18} />
            <span>Test Log</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#2A2A3A] p-6 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-2">Total Activities</p>
                <p className="text-3xl font-bold text-white">{stats.totalActivities || 0}</p>
              </div>
              <div className="p-3 bg-[#1E1E2A] rounded-xl border border-gray-700">
                <Activity className="h-8 w-8 text-gray-200" />
              </div>
            </div>
          </div>

          <div className="bg-[#2A2A3A] p-6 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-2">Active HR Users</p>
                <p className="text-3xl font-bold text-white">{stats.totalHRUsers || 0}</p>
              </div>
              <div className="p-3 bg-[#1E1E2A] rounded-xl border border-gray-700">
                <Users className="h-8 w-8 text-gray-200" />
              </div>
            </div>
          </div>

          <div className="bg-[#2A2A3A] p-6 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-2">Action Types</p>
                <p className="text-3xl font-bold text-white">{stats.activitiesByAction?.length || 0}</p>
              </div>
              <div className="p-3 bg-[#1E1E2A] rounded-xl border border-gray-700">
                <TrendingUp className="h-8 w-8 text-gray-200" />
              </div>
            </div>
          </div>

          <div className="bg-[#2A2A3A] p-6 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-2">Top Active HR</p>
                <p className="text-3xl font-bold text-white">{stats.topActiveHR?.length || 0}</p>
              </div>
              <div className="p-3 bg-[#1E1E2A] rounded-xl border border-gray-700">
                <User className="h-8 w-8 text-gray-200" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Action Type</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all cursor-pointer"
              >
                <option value="">All Actions</option>
                <option value="send_to_onboarding">Send to Onboarding</option>
                <option value="employee_created">Employee Created</option>
                <option value="employee_updated">Employee Updated</option>
                <option value="onboarding_completed">Onboarding Completed</option>
                <option value="document_verified">Document Verified</option>
                <option value="offer_sent">Offer Sent</option>
                <option value="candidate_shortlisted">Candidate Shortlisted</option>
                <option value="job_posting_created">Job Posting Created</option>
                <option value="bulk_upload">Bulk Upload</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Entity Type</label>
              <select
                value={filters.entityType}
                onChange={(e) => handleFilterChange('entityType', e.target.value)}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all cursor-pointer"
              >
                <option value="">All Entities</option>
                <option value="employee">Employee</option>
                <option value="candidate">Candidate</option>
                <option value="onboarding">Onboarding</option>
                <option value="job_posting">Job Posting</option>
                <option value="user">User</option>
                <option value="department">Department</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-4 py-2.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* Activities Timeline */}
      <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 border-4 border-gray-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading activity history...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
              <History className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No activities found</h3>
            <p className="text-sm text-gray-400">
              {Object.values(filters).some(v => v && v !== '1' && v !== '50') 
                ? 'Try adjusting your filters to see more activities.'
                : 'HR activities will appear here once they start performing actions.'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-800">
              {activities.map((activity, index) => {
                const ActionIcon = getActionIcon(activity.action);
                const actionColor = getActionColor(activity.action);

                return (
                  <div key={activity._id || index} className="p-6 hover:bg-[#1E1E2A]/60 transition-colors relative">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 p-3 rounded-lg border ${actionColor}`}>
                        <ActionIcon size={20} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-semibold text-white">
                                {formatActionName(activity.action)}
                              </h3>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${actionColor}`}>
                                {activity.entityType}
                              </span>
                            </div>
                            <p className="text-gray-400 text-sm mb-2">{activity.description}</p>
                            {activity.entityName && (
                              <p className="text-gray-300 text-sm font-medium">
                                {activity.entityType === 'employee' && '👤 '}
                                {activity.entityType === 'candidate' && '🎯 '}
                                {activity.entityType === 'onboarding' && '📋 '}
                                {activity.entityType === 'job_posting' && '💼 '}
                                {activity.entityName}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm text-gray-400 mb-1">
                              {formatRelativeTime(activity.timestamp)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(activity.timestamp)}
                            </p>
                          </div>
                        </div>

                        {/* HR User Info */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800">
                          <div className="h-8 w-8 rounded-full bg-[#1E1E2A] border border-gray-700 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              {activity.hrName?.charAt(0) || activity.hrEmail?.charAt(0) || 'H'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {activity.hrName || activity.hrEmail || 'Unknown HR'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {activity.hrEmail}
                            </p>
                          </div>
                        </div>

                        {/* Metadata */}
                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-800">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(activity.metadata).slice(0, 3).map(([key, value]) => (
                                <span key={key} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-700/50 text-gray-300">
                                  <span className="text-gray-500 mr-1">{key}:</span>
                                  <span>{String(value)}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="p-6 border-t border-gray-800 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} activities
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 rounded-lg bg-[#1E1E2A] text-white border border-gray-700 hover:bg-[#2A2A3A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-400">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="px-4 py-2 rounded-lg bg-[#1E1E2A] text-white border border-gray-700 hover:bg-[#2A2A3A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HRActivityHistory;
