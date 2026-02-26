import React, { useEffect, useState } from 'react';
import {
  Plus, CheckCircle, Circle, Clock, FileText, Calendar,
  Users, AlertCircle, Eye, Edit, Send, CheckSquare,
  Filter, Search, MoreHorizontal, Mail, Phone, X, Briefcase,
  MapPin, DollarSign, Building, FileEdit, Trash2, Copy, Save, Check, SkipForward,
  ShieldCheck, ShieldX, Loader2, RefreshCw, UserCheck
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { config } from '../../config/api.config';
import { useAuth } from '../../context/AuthContext';

// New comprehensive onboarding status labels - includes approval statuses
const statusLabels = {
  'preboarding': { label: 'Pre-boarding', color: 'bg-blue-500', icon: Circle },
  'pending_approval': { label: 'Pending Approval', color: 'bg-amber-500', icon: Clock },
  'approval_rejected': { label: 'On Hold', color: 'bg-orange-600', icon: ShieldX },
  'offer_sent': { label: 'Offer Sent', color: 'bg-yellow-500', icon: Mail },
  'offer_accepted': { label: 'Offer Accepted', color: 'bg-green-500', icon: CheckCircle },
  'docs_pending': { label: 'Documents Pending', color: 'bg-orange-500', icon: FileText },
  'docs_verified': { label: 'Documents Verified', color: 'bg-emerald-500', icon: CheckSquare },
  'ready_for_joining': { label: 'Ready for Joining', color: 'bg-purple-500', icon: Calendar },
  'completed': { label: 'Completed', color: 'bg-green-600', icon: CheckCircle },
  'rejected': { label: 'Rejected', color: 'bg-red-500', icon: AlertCircle }
};

// Approval status labels for display
const approvalStatusLabels = {
  'not_requested': { label: 'Not Requested', color: 'bg-gray-500', textColor: 'text-gray-400' },
  'pending': { label: 'Pending Admin Approval', color: 'bg-amber-500', textColor: 'text-amber-400' },
  'approved': { label: 'Approved', color: 'bg-green-500', textColor: 'text-green-400' },
  'rejected': { label: 'Rejected - On Hold', color: 'bg-red-500', textColor: 'text-red-400' }
};

const OnboardingProgressBar = ({ status, onSkipStage, itemId, canEdit = true }) => {
  const steps = [
    'preboarding', 'offer_sent', 'offer_accepted', 
    'docs_pending', 'docs_verified', 'ready_for_joining', 'completed'
  ];
  
  const currentIndex = steps.indexOf(status);
  const isRejected = status === 'rejected';
  
  const handleSkip = async (targetStep) => {
    if (!window.confirm(`Skip to ${statusLabels[targetStep].label} stage?`)) {
      return;
    }
    if (onSkipStage && itemId) {
      await onSkipStage(itemId, targetStep);
    }
  };
  
  return (
    <div className="mb-4">
      <div className="flex items-center space-x-2 mb-2">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex || status === 'completed';
          const isCurrent = idx === currentIndex && !isRejected;
          const isLast = idx === steps.length - 1;
          const stepInfo = statusLabels[step];
          const canSkip = !isCompleted && !isCurrent && idx > currentIndex && status !== 'rejected' && status !== 'completed';
          
          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                  isRejected ? 'bg-red-500 text-white' :
                  isCompleted ? 'bg-green-500 text-white' : 
                  isCurrent ? `${stepInfo.color} text-white animate-pulse` : 
                  'bg-gray-700 text-gray-400'
                }`}>
                  {React.createElement(stepInfo.icon, { size: 16 })}
                </div>
                <div className={`mt-1 text-xs font-medium text-center max-w-20 ${
                  isRejected ? 'text-red-400' :
                  isCompleted ? 'text-green-400' : 
                  isCurrent ? 'text-blue-400' : 'text-gray-500'
                }`}>
                  {stepInfo.label}
                </div>
                {/* Skip button for future stages - only for users who can edit */}
                {canSkip && onSkipStage && canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSkip(step);
                    }}
                    className="mt-1 text-xs text-primary-400 hover:text-primary-300 flex items-center space-x-1"
                    title={`Skip to ${stepInfo.label}`}
                  >
                    <SkipForward size={10} />
                    <span>Skip</span>
                  </button>
                )}
              </div>
              {!isLast && (
                <div className={`mx-2 h-0.5 w-12 transition-all duration-300 ${
                  isRejected ? 'bg-red-500' :
                  isCompleted ? 'bg-green-500' : 'bg-gray-700'
                }`}></div>
              )}
            </div>
          );
        })}
      </div>
      
    </div>
  );
};

const Onboarding = () => {
  const { user } = useAuth();

  // Check if user is admin (view-only access)
  const isAdminViewOnly = user?.role === 'company_admin';
  const canEdit = !isAdminViewOnly; // Only HR can edit, admin can only view

  const [activeTab, setActiveTab] = useState('onboarding'); // 'onboarding' or 'templates'
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState({});
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [verifyingDoc, setVerifyingDoc] = useState(null);
  
  // Template states
  const [templates, setTemplates] = useState([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFilter, setTemplateFilter] = useState({ status: '', category: '', search: '' });
  
  // Send Offer Modal states
  const [showSendOfferModal, setShowSendOfferModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    if (activeTab === 'onboarding') {
      fetchList();
    } else if (activeTab === 'templates') {
      fetchTemplates();
    }
  }, [activeTab, filterStatus, filterDepartment, searchTerm, templateFilter]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterDepartment) params.append('department', filterDepartment);
      if (searchTerm) params.append('search', searchTerm);
      // Add timestamp to prevent caching
      params.append('_t', Date.now());
      
      console.log('🔍 Fetching onboarding list with params:', params.toString());
      const res = await api.get(`/onboarding?${params.toString()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      console.log('📦 Onboarding API Response:', res?.data);
      console.log('📋 Onboarding List Data:', res?.data?.data);
      console.log('📊 List Length:', res?.data?.data?.length);
      
      setList(res?.data?.data || []);
      setSummary(res?.data?.summary || {});
      
      if (res?.data?.data?.length === 0) {
        console.warn('⚠️ No onboarding records returned from API');
      }
    } catch (e) {
      console.error('❌ Error fetching onboarding list:', e);
      toast.error(e?.response?.data?.message || 'Failed to load onboarding list');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus, notes = '') => {
    try {
      await api.put(`/onboarding/${id}/status`, { status: newStatus, notes });
      toast.success('Status updated successfully');
      fetchList();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update status');
    }
  };

  const handleSkipStage = async (id, targetStatus) => {
    try {
      await api.put(`/onboarding/${id}/status`, { 
        status: targetStatus, 
        notes: `Stage skipped to ${statusLabels[targetStatus]?.label || targetStatus}` 
      });
      toast.success(`Skipped to ${statusLabels[targetStatus]?.label || targetStatus} stage`);
      fetchList();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to skip stage');
    }
  };

  const sendOffer = async (id, offerDetails) => {
    try {
      // Debug: Log the data being sent
      console.log('📤 Sending offer data:', offerDetails);
      
      // Validate required fields before sending
      const requiredFields = ['clientName', 'location', 'projectName', 'employmentStartDate', 'contractEndDate', 'monthlySalary'];
      const missingFields = requiredFields.filter(field => !offerDetails[field] || (typeof offerDetails[field] === 'string' && offerDetails[field].trim() === ''));
      
      if (missingFields.length > 0) {
        console.error('❌ Missing required fields:', missingFields);
        toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }
      
      // Use current origin to ensure correct URL in all environments
      const currentUrl = window.location.origin;
      const response = await api.post(`/onboarding/${id}/send-offer`, {
        ...offerDetails,
        frontendUrl: currentUrl
      });
      
      console.log('✅ Offer sent successfully:', response.data);
      
      // Check for email warnings
      if (response.data.data.emailWarning) {
        console.warn('⚠️ Email warning:', response.data.data.emailWarning);
        toast.success('Offer processed, but email may have failed. Check console for details.');
      } else {
        toast.success('Offer sent successfully');
      }
      
      fetchList();
    } catch (e) {
      console.error('❌ Failed to send offer:', e.response?.data);
      const errorMessage = e?.response?.data?.message || 'Failed to send offer';
      
      // Show more specific error messages
      if (e?.response?.data?.requiredFields) {
        toast.error(`Missing required fields: ${e.response.data.requiredFields.join(', ')}`);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const setJoiningDate = async (id, joiningDate, notifyTeams = true) => {
    try {
      await api.post(`/onboarding/${id}/set-joining-date`, { joiningDate, notifyTeams });
      toast.success('Joining date set and teams notified');
      fetchList();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to set joining date');
    }
  };

  const completeOnboarding = async (id) => {
    if (!confirm('Are you sure you want to complete this onboarding? This will create an employee record.')) {
      return;
    }


    try {

      const response = await api.post(`/onboarding/${id}/complete`);
      if (response.data.success) {
        toast.success(response.data.message || 'Onboarding completed successfully');
        fetchList();
      } else {
        // Handle validation errors
        if (response.data.errors && response.data.errors.length > 0) {
          const errorMessages = response.data.errors.join(', ');
          toast.error(`Validation failed: ${errorMessages}`);
        } else {
          toast.error(response.data.message || 'Failed to complete onboarding');
        }
      }
    } catch (e) {
      console.error('Error completing onboarding:', e);
      
      // Handle validation errors (400 status)
      if (e?.response?.status === 400) {
        const errors = e?.response?.data?.errors || [];
        const warnings = e?.response?.data?.warnings || [];
        
        if (errors.length > 0) {
          toast.error(`Validation failed: ${errors.join(', ')}`);
        } else if (warnings.length > 0) {
          toast.error(`Warnings: ${warnings.join(', ')}`);
        } else {
          toast.error(e?.response?.data?.message || 'Validation failed');
        }
      } else {
        // Handle server errors (500 status)
        const errorMessage = e?.response?.data?.error || e?.response?.data?.message || 'Failed to complete onboarding process';
        toast.error(errorMessage);
      }
    }
  };

  const requestDocuments = async (id) => {
    try {
      const currentUrl = window.location.origin; 
      const uploadUrl = `${currentUrl}/public/upload-documents`;

      const res = await api.post(`/onboarding/${id}/request-documents`, {
        frontendUrl: currentUrl,
        uploadBaseUrl: uploadUrl,
        // Don't pass apiBaseUrl as it might contain placeholders
      });
      toast.success(`Document request email sent to ${res.data.data.sentTo}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to send document request');
    }
  };

  // Request approval from admin before sending offer
  const requestApproval = async (id) => {
    try {
      const res = await api.post(`/onboarding/${id}/request-approval`, {
        notes: 'Requesting approval to send offer letter'
      });
      toast.success(res.data.message || 'Approval request sent to admin');
      fetchList();
    } catch (e) {
      const errorMessage = e?.response?.data?.message || 'Failed to request approval';
      toast.error(errorMessage);
      
      // If approval is already pending, just refresh the list
      if (e?.response?.data?.message?.includes('already pending')) {
        fetchList();
      }
    }
  };

  const handleAcceptDocument = async (docId) => {
    setVerifyingDoc(docId);
    try {
      const response = await api.put(`/onboarding/${selectedOnboarding._id}/documents/${docId}/verify`, {
        action: 'approve',
        notes: 'Document verified and accepted'
      });

      if (response.data.success) {
        toast.success('Document accepted successfully!');
        fetchList();
        if (selectedOnboarding) {
          const updatedOnboarding = list.find(o => o._id === selectedOnboarding._id);
          setSelectedOnboarding(updatedOnboarding);
        }
      } else {
        toast.error(response.data.message || 'Failed to accept document');
      }
    } catch (error) {
      console.error('Error accepting document:', error);
      toast.error('Failed to accept document');
    } finally {
      setVerifyingDoc(null);
    }
  };

  const handleRejectDocument = (doc) => {
    setSelectedDocument(doc);
    setRejectionNotes('');
    setShowRejectModal(true);
  };

  const submitRejection = async () => {
    if (!rejectionNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setVerifyingDoc(selectedDocument._id);
    try {
      const response = await api.put(`/onboarding/${selectedOnboarding._id}/documents/${selectedDocument._id}/verify`, {
        action: 'reject',
        notes: rejectionNotes
      });

      if (response.data.success) {
        toast.success('Document rejected and email sent to candidate');
        setShowRejectModal(false);
        setSelectedDocument(null);
        setRejectionNotes('');
        fetchList();
        if (selectedOnboarding) {
          const updatedOnboarding = list.find(o => o._id === selectedOnboarding._id);
          setSelectedOnboarding(updatedOnboarding);
        }
      } else {
        toast.error(response.data.message || 'Failed to reject document');
      }
    } catch (error) {
      console.error('Error rejecting document:', error);
      toast.error('Failed to reject document');
    } finally {
      setVerifyingDoc(null);
    }
  };

  const fetchTemplates = async () => {
    setTemplateLoading(true);
    try {
      const params = new URLSearchParams();
      if (templateFilter.status) params.append('status', templateFilter.status);
      if (templateFilter.category) params.append('category', templateFilter.category);
      if (templateFilter.search) params.append('search', templateFilter.search);
      
      const response = await api.get(`/offer-templates?${params.toString()}`);
      setTemplates(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load offer templates');
      console.error(error);
    } finally {
      setTemplateLoading(false);
    }
  };

  const saveTemplate = async (templateData) => {
    try {
      if (editingTemplate) {
        await api.put(`/offer-templates/${editingTemplate._id}`, templateData);
        toast.success('Template updated successfully');
      } else {
        await api.post('/offer-templates', templateData);
        toast.success('Template created successfully');
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save template');
    }
  };

  const deleteTemplate = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await api.delete(`/offer-templates/${id}`);
      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const duplicateTemplate = async (template) => {
    try {
      const newTemplate = {
        ...template,
        name: `${template.name} (Copy)`,
        isDefault: false
      };
      delete newTemplate._id;
      delete newTemplate.createdAt;
      delete newTemplate.updatedAt;
      
      await api.post('/offer-templates', newTemplate);
      toast.success('Template duplicated successfully');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to duplicate template');
    }
  };

  const updateTemplateStatus = async (id, status) => {
    try {
      await api.put(`/offer-templates/${id}/status`, { status });
      toast.success(`Template ${status === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to update template status');
    }
  };

  const filteredList = list;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#1E1E2A] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Employee Onboarding</h1>
          <p className="text-gray-400 mt-1">Manage comprehensive candidate onboarding process</p>
        </div>
        <div className="flex items-center space-x-3">
          {activeTab === 'onboarding' && summary.overdue > 0 && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-red-900/20 border border-red-800 rounded-lg">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-sm text-red-400">{summary.overdue} Overdue</span>
            </div>
          )}
          {activeTab === 'onboarding' && (
            <span className="text-sm text-gray-400">
              Total: {summary.total || 0}
            </span>
          )}
          {activeTab === 'templates' && (
            <button
              onClick={() => {
                setEditingTemplate(null);
                setShowTemplateModal(true);
              }}
              className="px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20 flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Create Template</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="card p-1">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('onboarding')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'onboarding'
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#1E1E2A]'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Users size={18} />
              <span>Onboarding List</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'templates'
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#1E1E2A]'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <FileEdit size={18} />
              <span>Offer Templates</span>
            </div>
          </button>
        </div>
      </div>

      {/* Onboarding Tab Content */}
      {activeTab === 'onboarding' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(summary.byStatus || {}).map(([status, count]) => {
              const statusInfo = statusLabels[status];
              if (!statusInfo) return null;
              
              return (
                <div key={status} className="card p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${statusInfo.color}`}>
                      {React.createElement(statusInfo.icon, { size: 20, className: 'text-white' })}
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">{statusInfo.label}</p>
                      <p className="text-xl font-bold text-white">{count}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field w-64"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field w-48"
          >
            <option value="">All Status</option>
            {Object.entries(statusLabels).map(([status, info]) => (
              <option key={status} value={status}>{info.label}</option>
            ))}
          </select>
          
          <button
            onClick={() => {
              setFilterStatus('');
              setFilterDepartment('');
              setSearchTerm('');
            }}
            className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Onboarding List */}
      <div className="space-y-4">
        {filteredList.map((item) => (
          <OnboardingCard
            key={item._id}
            item={item}
            canEdit={canEdit}
            onUpdateStatus={updateStatus}
            onSendOffer={sendOffer}
            onSetJoiningDate={setJoiningDate}
            onComplete={completeOnboarding}
            onOpenSendOfferModal={(candidate) => {
              setSelectedCandidate(candidate);
              setShowSendOfferModal(true);
            }}
            onViewDetails={(onboarding) => {
              setSelectedOnboarding(onboarding);
              setShowDetailsModal(true);
            }}
            onRequestDocuments={requestDocuments}
            onSkipStage={handleSkipStage}
            onRequestApproval={requestApproval}
          />
        ))}
      </div>

      {filteredList.length === 0 && (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">No onboarding records found</p>
          <p className="text-gray-500 text-sm mt-2">
            {searchTerm || filterStatus ? 'Try adjusting your filters' : 'Candidates will appear here when sent to onboarding'}
          </p>
        </div>
      )}

          {/* Details Modal */}
          {showDetailsModal && selectedOnboarding && (
            <OnboardingDetailsModal 
              onboarding={selectedOnboarding}
              onClose={() => {
                setShowDetailsModal(false);
                setSelectedOnboarding(null);
              }}
              verifyingDoc={verifyingDoc}
              onAcceptDocument={handleAcceptDocument}
              onRejectDocument={handleRejectDocument}
            />
          )}

          {/* Rejection Modal */}
          <RejectionModal
            isOpen={showRejectModal}
            onClose={() => {
              setShowRejectModal(false);
              setSelectedDocument(null);
              setRejectionNotes('');
            }}
            document={selectedDocument}
            rejectionNotes={rejectionNotes}
            setRejectionNotes={setRejectionNotes}
            onSubmit={submitRejection}
            isSubmitting={verifyingDoc !== null}
          />
        </>
      )}

      {/* Templates Tab Content */}
      {activeTab === 'templates' && (
        <TemplatesSection
          templates={templates}
          loading={templateLoading}
          filter={templateFilter}
          setFilter={setTemplateFilter}
          onEdit={(template) => {
            setEditingTemplate(template);
            setShowTemplateModal(true);
          }}
          onDelete={deleteTemplate}
          onDuplicate={duplicateTemplate}
          onUpdateStatus={updateTemplateStatus}
        />
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
          onSave={saveTemplate}
        />
      )}

      {/* Send Offer Modal */}
      {showSendOfferModal && selectedCandidate && (
        <SendOfferModal
          candidate={selectedCandidate}
          onClose={() => {
            setShowSendOfferModal(false);
            setSelectedCandidate(null);
          }}
          onSend={sendOffer}
        />
      )}
    </div>
  );
};

// Onboarding Card Component
const OnboardingCard = ({ item, onUpdateStatus, onSendOffer, onSetJoiningDate, onComplete, onViewDetails, onOpenSendOfferModal, onRequestDocuments, onSkipStage, onRequestApproval, canEdit = true }) => {
  const [showActions, setShowActions] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [joiningDateInput, setJoiningDateInput] = useState('');
  const [requestingApproval, setRequestingApproval] = useState(false);
  const statusInfo = statusLabels[item.status] || statusLabels['preboarding'];
  
  // Get approval status info
  const approvalStatus = item.approvalStatus?.status || 'not_requested';
  const approvalInfo = approvalStatusLabels[approvalStatus] || approvalStatusLabels['not_requested'];
  
  // Check if approval is required and granted
  const isApprovalGranted = approvalStatus === 'approved';
  const isApprovalPending = approvalStatus === 'pending';
  const isApprovalRejected = approvalStatus === 'rejected';
  const canRequestApproval = (item.status === 'preboarding' && approvalStatus === 'not_requested') || 
                             (item.status === 'approval_rejected' && approvalStatus === 'rejected');
  
  const handleRequestApproval = async () => {
    if (!window.confirm('Request admin approval before sending offer letter? This will send a notification to the admin.')) {
      return;
    }
    setRequestingApproval(true);
    try {
      await onRequestApproval(item._id);
    } finally {
      setRequestingApproval(false);
    }
  };
  
  const getNextActions = () => {
    switch (item.status) {
      case 'preboarding':
        // If approval is granted, allow sending offer
        if (isApprovalGranted) {
          return [
            { label: 'Send Offer', action: () => onOpenSendOfferModal(item), color: 'btn-primary' }
          ];
        }
        // If approval is pending, no actions
        if (isApprovalPending) {
          return [];
        }
        // Otherwise, show request approval button
        return [];
      case 'pending_approval':
        return []; // Waiting for admin action
      case 'approval_rejected':
        return []; // HR can re-request via button below
      case 'offer_sent':
        return [
          { label: 'Mark Accepted', action: () => onUpdateStatus(item._id, 'offer_accepted'), color: 'btn-success' },
          { label: 'Mark Rejected', action: () => onUpdateStatus(item._id, 'rejected'), color: 'btn-danger' }
        ];
      case 'offer_accepted':
        return [
          { label: 'Request Documents', action: () => onUpdateStatus(item._id, 'docs_pending'), color: 'px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20' }
        ];
      case 'docs_pending':
        return [
          { label: 'Verify Documents', action: () => onUpdateStatus(item._id, 'docs_verified'), color: 'btn-success' }
        ];
      case 'docs_verified':
        return [
          { label: 'Set Joining Date', action: () => handleSetJoiningDate(), color: 'px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20' }
        ];
      case 'ready_for_joining':
        return [
          { label: 'Complete Onboarding', action: () => onComplete(item._id), color: 'btn-success' }
        ];
      default:
        return [];
    }
  };

  const handleSetJoiningDate = () => {
    setShowDatePicker(true);
    // Set default to today's date
    const today = new Date().toISOString().split('T')[0];
    setJoiningDateInput(today);
  };

  const handleDateSubmit = () => {
    if (joiningDateInput) {
      onSetJoiningDate(item._id, joiningDateInput);
      setShowDatePicker(false);
      setJoiningDateInput('');
    }
  };

  const nextActions = getNextActions();

  return (
    <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-white">{item.candidateName}</h3>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} text-white`}>
              {React.createElement(statusInfo.icon, { size: 12, className: 'mr-1' })}
              {statusInfo.label}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <Mail size={14} />
              <span>{item.candidateEmail}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone size={14} />
              <span>{item.candidatePhone}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users size={14} />
              <span>{item.position}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewDetails(item)}
            className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors text-sm"
          >
            <Eye size={16} />
          </button>
          {canEdit && (
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors text-sm"
              >
                <MoreHorizontal size={16} />
              </button>
              {showActions && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                  {nextActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        action.action();
                        setShowActions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!canEdit && (
            <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
              View Only
            </div>
          )}
        </div>
      </div>

      <OnboardingProgressBar
        status={item.status}
        onSkipStage={onSkipStage}
        itemId={item._id}
        canEdit={canEdit}
      />

      {/* Approval Status Indicator - Show when in preboarding or approval-related states */}
      {(item.status === 'preboarding' || item.status === 'pending_approval' || item.status === 'approval_rejected') && (
        <div className={`mb-4 p-3 rounded-lg border ${
          isApprovalGranted ? 'bg-green-900/20 border-green-800' :
          isApprovalPending ? 'bg-amber-900/20 border-amber-800' :
          isApprovalRejected ? 'bg-red-900/20 border-red-800' :
          'bg-blue-900/20 border-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isApprovalGranted ? (
                <ShieldCheck size={16} className="text-green-400" />
              ) : isApprovalPending ? (
                <Clock size={16} className="text-amber-400 animate-pulse" />
              ) : isApprovalRejected ? (
                <ShieldX size={16} className="text-red-400" />
              ) : (
                <AlertCircle size={16} className="text-blue-400" />
              )}
              <span className={`text-sm font-medium ${approvalInfo.textColor}`}>
                {isApprovalGranted ? 'Admin Approved - Ready to send offer' :
                 isApprovalPending ? 'Waiting for Admin Approval...' :
                 isApprovalRejected ? `Approval Rejected: ${item.approvalStatus?.rejectionReason || 'No reason provided'}` :
                 'Admin approval required before sending offer'}
              </span>
            </div>
            
            {/* Request Approval / Re-Request Button */}
            {canEdit && canRequestApproval && (
              <button
                onClick={handleRequestApproval}
                disabled={requestingApproval}
                className="btn-primary btn-sm flex items-center space-x-1"
              >
                {requestingApproval ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Requesting...</span>
                  </>
                ) : (
                  <>
                    {isApprovalRejected ? <RefreshCw size={14} /> : <UserCheck size={14} />}
                    <span>{isApprovalRejected ? 'Re-Request Approval' : 'Request Approval'}</span>
                  </>
                )}
              </button>
            )}
          </div>
          
          {/* Show approval details if available */}
          {item.approvalStatus?.requestedAt && (
            <div className="mt-2 text-xs text-gray-400">
              Requested: {new Date(item.approvalStatus.requestedAt).toLocaleString()}
              {item.approvalStatus.approvedAt && ` • Approved: ${new Date(item.approvalStatus.approvedAt).toLocaleString()}`}
              {item.approvalStatus.rejectedAt && ` • Rejected: ${new Date(item.approvalStatus.rejectedAt).toLocaleString()}`}
            </div>
          )}
        </div>
      )}

      {item.joiningDate && (
        <div className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <Calendar size={16} className="text-green-400" />
            <span className="text-sm text-green-400">
              Joining Date: {new Date(item.joiningDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {item.offer?.expiryDate && item.status === 'offer_sent' && (
        <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock size={16} className="text-yellow-400" />
            <span className="text-sm text-yellow-400">
              Offer expires: {new Date(item.offer.expiryDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          ID: {item.onboardingId} • Created: {new Date(item.createdAt).toLocaleDateString()}
        </div>
        
        <div className="flex items-center space-x-2">
          {nextActions.slice(0, 2).map((action, idx) => (
            <button
              key={idx}
              onClick={action.action}
              className={`${action.color} text-sm`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Joining Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Set Joining Date</h3>
              <button
                onClick={() => {
                  setShowDatePicker(false);
                  setJoiningDateInput('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Joining Date
                </label>
                <input
                  type="date"
                  value={joiningDateInput}
                  onChange={(e) => setJoiningDateInput(e.target.value)}
                  className="w-full px-4 py-2 bg-[#2A2A3A] border border-dark-700 rounded-lg text-white focus:border-primary-600 focus:outline-none"
                />
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleDateSubmit}
                  className="flex-1 px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20"
                  disabled={!joiningDateInput}
                >
                  <Calendar size={16} className="mr-2" />
                  Set Date
                </button>
                <button
                  onClick={() => {
                    setShowDatePicker(false);
                    setJoiningDateInput('');
                  }}
                  className="flex-1 px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Onboarding Details Modal Component
const OnboardingDetailsModal = ({ onboarding, onClose, verifyingDoc, onAcceptDocument, onRejectDocument }) => {
  const statusInfo = statusLabels[onboarding.status];
  
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getDocumentHref = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const backendBaseUrl = config.apiBaseUrl.replace('/api', '');
    if (url.startsWith('/uploads/')) return `${backendBaseUrl}${url}`;
    if (url.startsWith('/')) return url;
    return `${backendBaseUrl}/uploads/${url}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 border border-dark-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-900 border-b border-dark-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{onboarding.candidateName}</h2>
            <p className="text-gray-400 mt-1">Onboarding ID: {onboarding.onboardingId}</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors p-2"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Current Status</h3>
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${statusInfo.color}`}>
                {React.createElement(statusInfo.icon, { size: 24, className: 'text-white' })}
              </div>
              <div>
                <p className="text-white font-medium">{statusInfo.label}</p>
                <p className="text-gray-400 text-sm">Updated: {formatDate(onboarding.updatedAt)}</p>
              </div>
            </div>
            <div className="mt-4">
              <OnboardingProgressBar status={onboarding.status} />
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <Mail size={18} className="text-primary-500 mt-1" />
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white">{onboarding.candidateEmail}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Phone size={18} className="text-primary-500 mt-1" />
                <div>
                  <p className="text-gray-400 text-sm">Phone</p>
                  <p className="text-white">{onboarding.candidatePhone}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Briefcase size={18} className="text-primary-500 mt-1" />
                <div>
                  <p className="text-gray-400 text-sm">Position</p>
                  <p className="text-white">{onboarding.position}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Building size={18} className="text-primary-500 mt-1" />
                <div>
                  <p className="text-gray-400 text-sm">Department</p>
                  <p className="text-white">{onboarding.department?.name || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Offer Details */}
          {onboarding.offer && (
            <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Offer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <Briefcase size={18} className="text-primary-500 mt-1" />
                  <div>
                    <p className="text-gray-400 text-sm">Offered Designation</p>
                    <p className="text-white">{onboarding.offer.offeredDesignation || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <DollarSign size={18} className="text-primary-500 mt-1" />
                  <div>
                    <p className="text-gray-400 text-sm">Offered CTC</p>
                    <p className="text-white">{formatCurrency(onboarding.offer.offeredCTC)}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Calendar size={18} className="text-primary-500 mt-1" />
                  <div>
                    <p className="text-gray-400 text-sm">Start Date</p>
                    <p className="text-white">{formatDate(onboarding.offer.startDate)}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Clock size={18} className="text-primary-500 mt-1" />
                  <div>
                    <p className="text-gray-400 text-sm">Offer Sent</p>
                    <p className="text-white">{formatDate(onboarding.offer.sentAt)}</p>
                  </div>
                </div>
                {onboarding.offer.expiryDate && (
                  <div className="flex items-start space-x-3">
                    <AlertCircle size={18} className="text-yellow-500 mt-1" />
                    <div>
                      <p className="text-gray-400 text-sm">Offer Expires</p>
                      <p className="text-white">{formatDate(onboarding.offer.expiryDate)}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Salary Breakdown */}
              {onboarding.offer.salary && (
                <div className="mt-4 p-4 bg-[#2A2A3A] rounded-lg">
                  <p className="text-sm font-medium text-gray-400 mb-3">Salary Breakdown</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Basic</p>
                      <p className="text-white font-medium">{formatCurrency(onboarding.offer.salary.basic)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">HRA</p>
                      <p className="text-white font-medium">{formatCurrency(onboarding.offer.salary.hra)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Allowances</p>
                      <p className="text-white font-medium">{formatCurrency(onboarding.offer.salary.allowances)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-white font-medium">{formatCurrency(onboarding.offer.salary.total)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Joining Date */}
          {onboarding.joiningDate && (
            <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Joining Information</h3>
              <div className="flex items-start space-x-3">
                <Calendar size={18} className="text-primary-500 mt-1" />
                <div>
                  <p className="text-gray-400 text-sm">Joining Date</p>
                  <p className="text-white font-medium text-lg">{formatDate(onboarding.joiningDate)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Audit Trail */}
          {onboarding.auditTrail && onboarding.auditTrail.length > 0 && (
            <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Activity Timeline</h3>
              <div className="space-y-3">
                {onboarding.auditTrail.slice().reverse().map((audit, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 bg-[#2A2A3A] rounded-lg">
                    <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{audit.action.replace(/_/g, ' ').toUpperCase()}</p>
                      <p className="text-gray-400 text-sm">{audit.description}</p>
                      <p className="text-gray-500 text-xs mt-1">{formatDate(audit.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {onboarding.documents && onboarding.documents.length > 0 && (
            <div className="bg-[#2A2A3A] rounded-xl border border-gray-800 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Documents</h3>
              <div className="space-y-3">
                {onboarding.documents.map((doc, idx) => (
                  <div key={idx} className="p-4 bg-[#2A2A3A] rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <FileText size={18} className="text-primary-500" />
                        <div>
                          <p className="text-white font-medium">{doc.name}</p>
                          <p className="text-gray-400 text-sm">{doc.type}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        doc.status === 'verified' ? 'bg-green-500/20 text-green-400' :
                        doc.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        doc.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {doc.status || 'uploaded'}
                      </span>
                    </div>
                    
                    {doc.rejectionReason && (
                      <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                        <strong>Rejection Reason:</strong> {doc.rejectionReason}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {doc.url && (
                          <a
                            href={getDocumentHref(doc.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-primary-400 hover:text-primary-300 flex items-center space-x-1"
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </a>
                        )}
                      </div>
                      
                      {doc.status !== 'verified' && doc.url && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onAcceptDocument(doc._id)}
                            disabled={verifyingDoc === doc._id}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            <Check size={14} />
                            <span>{verifyingDoc === doc._id ? 'Processing...' : 'Accept'}</span>
                          </button>
                          <button
                            onClick={() => onRejectDocument(doc)}
                            disabled={verifyingDoc === doc._id}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            <X size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-dark-900 border-t border-dark-700 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Templates Section Component
const TemplatesSection = ({ templates, loading, filter, setFilter, onEdit, onDelete, onDuplicate, onUpdateStatus }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="input-field w-64"
            />
          </div>
          
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="input-field w-40"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>

          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="input-field w-40"
          >
            <option value="">All Categories</option>
            <option value="full-time">Full Time</option>
            <option value="part-time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
            <option value="executive">Executive</option>
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div key={template._id} className="card p-4 hover:border-primary-500 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">{template.name}</h3>
                <p className="text-sm text-gray-400 line-clamp-2">{template.description}</p>
              </div>
              {template.isDefault && (
                <span className="px-2 py-1 bg-primary-500/20 text-primary-400 text-xs font-medium rounded">
                  Default
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Category:</span>
                <span className="text-white capitalize">{template.category}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Status:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  template.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  template.status === 'inactive' ? 'bg-gray-500/20 text-gray-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {template.status}
                </span>
              </div>
              {template.usageCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Used:</span>
                  <span className="text-white">{template.usageCount} times</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEdit(template)}
                className="flex-1 px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors text-sm py-2"
              >
                <Edit size={14} className="inline mr-1" />
                Edit
              </button>
              <button
                onClick={() => onDuplicate(template)}
                className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors p-2"
                title="Duplicate"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => onUpdateStatus(template._id, template.status === 'active' ? 'inactive' : 'active')}
                className={`px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors p-2 ${template.status === 'active' ? 'text-yellow-400' : 'text-green-400'}`}
                title={template.status === 'active' ? 'Deactivate' : 'Activate'}
              >
                {template.status === 'active' ? <Clock size={16} /> : <CheckCircle size={16} />}
              </button>
              <button
                onClick={() => onDelete(template._id)}
                className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors p-2 text-red-400 hover:bg-red-500/10"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <FileEdit size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">No templates found</p>
          <p className="text-gray-500 text-sm mt-2">
            {filter.search || filter.status || filter.category
              ? 'Try adjusting your filters'
              : 'Create your first offer template to get started'}
          </p>
        </div>
      )}
    </>
  );
};

// Template Modal Component
const TemplateModal = ({ template, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    category: template?.category || 'full-time',
    subject: template?.subject || '',
    content: template?.content || '',
    status: template?.status || 'draft',
    isDefault: template?.isDefault || false,
    variables: template?.variables || [],
    expiryDays: template?.expiryDays || 1,
    reminderDays: template?.reminderDays || []
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Template name is required';
    if (!formData.subject.trim()) newErrors.subject = 'Email subject is required';
    if (!formData.content.trim()) newErrors.content = 'Template content is required';
    if (formData.expiryDays < 1) newErrors.expiryDays = 'Expiry days must be at least 1';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const insertVariable = (variable) => {
    setFormData({
      ...formData,
      content: formData.content + `{{${variable}}}`
    });
  };

  const availableVariables = [
    'candidateName', 'candidateEmail', 'position', 'department',
    'offeredCTC', 'startDate', 'joiningDate', 'companyName',
    'hrName', 'hrEmail', 'hrPhone'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 border border-dark-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-900 border-b border-dark-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {template ? 'Edit Template' : 'Create New Template'}
            </h2>
            <p className="text-gray-400 mt-1">Design your offer letter template</p>
          </div>
          <button onClick={onClose} className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors p-2">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`input-field w-full ${errors.name ? 'border-red-500' : ''}`}
                placeholder="e.g., Full-Time Offer Letter"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field w-full"
              >
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
                <option value="executive">Executive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field w-full"
              rows="2"
              placeholder="Brief description of this template"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Subject *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className={`input-field w-full ${errors.subject ? 'border-red-500' : ''}`}
              placeholder="e.g., Offer Letter - {{position}} at {{companyName}}"
            />
            {errors.subject && <p className="text-red-400 text-sm mt-1">{errors.subject}</p>}
          </div>

          {/* Template Content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Template Content *
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">Insert Variable:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      insertVariable(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="input-field text-xs py-1"
                >
                  <option value="">Select...</option>
                  {availableVariables.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className={`input-field w-full font-mono text-sm ${errors.content ? 'border-red-500' : ''}`}
              rows="12"
              placeholder="Dear {{candidateName}},&#10;&#10;We are pleased to offer you the position of {{position}} at {{companyName}}...&#10;&#10;Use {{variableName}} to insert dynamic content."
            />
            {errors.content && <p className="text-red-400 text-sm mt-1">{errors.content}</p>}
            <p className="text-xs text-gray-500 mt-1">
              Use double curly braces for variables, e.g., {`{{candidateName}}`}
            </p>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input-field w-full"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Offer Expiry (Days) *
              </label>
              <input
                type="number"
                min="1"
                value={formData.expiryDays}
                onChange={(e) => setFormData({ ...formData, expiryDays: parseInt(e.target.value) })}
                className={`input-field w-full ${errors.expiryDays ? 'border-red-500' : ''}`}
              />
              {errors.expiryDays && <p className="text-red-400 text-sm mt-1">{errors.expiryDays}</p>}
            </div>

            <div className="flex items-center pt-8">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-300">Set as Default</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-dark-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20 flex items-center space-x-2"
            >
              <Save size={18} />
              <span>{template ? 'Update Template' : 'Create Template'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Send Offer Modal Component
const SendOfferModal = ({ candidate, onClose, onSend }) => {
  const [formData, setFormData] = useState({
    candidateName: candidate.candidateName || '',
    salary: '',
    templateId: '',
    designation: candidate.position || '',
    startDate: '',
    // New fields for manual input
    clientName: '',
    location: '',
    contractEndDate: '',
    monthlySalary: '',
    projectName: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplatePreview, setSelectedTemplatePreview] = useState(null);

  // Fetch available templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const response = await api.get('/offer-templates', {
          params: { status: 'active' }
        });
        const availableTemplates = response.data.data || [];
        setTemplates(availableTemplates);

        // Set default template if available
        const defaultTemplate = availableTemplates.find(t => t.isDefault);
        if (defaultTemplate) {
          setFormData(prev => ({ ...prev, templateId: defaultTemplate._id }));
        } else if (availableTemplates.length > 0) {
          setFormData(prev => ({ ...prev, templateId: availableTemplates[0]._id }));
        }
      } catch (error) {
        console.error('Failed to load templates:', error);

        // Provide fallback templates for testing when backend is not available
        const fallbackTemplates = [
          {
            _id: 'default-template-1',
            name: 'Full-Time Offer Template',
            category: 'full-time',
            description: 'Standard full-time employment offer template',
            subject: '🎉 Congratulations! Offer Letter - {{position}} at {{companyName}}',
            content: `Dear {{candidateName}},

We are thrilled to extend an offer for the position of {{position}} at {{companyName}}!

OFFER DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Position: {{position}}
Department: {{department}}
Employment Type: Full-Time
Annual CTC: ₹{{offeredCTC}}
Proposed Start Date: {{startDate}}

This offer is valid until {{expiryDate}}. Please confirm your acceptance by replying to this email.

We look forward to welcoming you to our team!

Best regards,
{{hrName}}
{{companyName}}
{{hrEmail}} | {{hrPhone}}`,
            status: 'active',
            isDefault: true,
            expiryDays: 7,
            version: '1.0',
            usageCount: 0
          },
          {
            _id: 'default-template-2',
            name: 'Internship Offer Template',
            category: 'intern',
            description: 'Internship offer template with stipend details',
            subject: 'Welcome Aboard! Internship Offer - {{position}} at {{companyName}}',
            content: `Dear {{candidateName}},

Congratulations! We are excited to offer you an internship position as {{position}} at {{companyName}}.

INTERNSHIP DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Position: {{position}}
Department: {{department}}
Type: Internship
Monthly Stipend: ₹{{offeredCTC}}
Start Date: {{startDate}}

LEARNING OPPORTUNITIES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Work on real-world projects
• Learn from experienced professionals
• Mentorship and guidance

ACCEPTANCE DEADLINE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please confirm your acceptance by {{expiryDate}} by replying to this email.

We're excited to have you join our team!

Best regards,
{{hrName}}
{{companyName}}
{{hrEmail}} | {{hrPhone}}`,
            status: 'active',
            isDefault: false,
            expiryDays: 7,
            version: '1.0',
            usageCount: 0
          }
        ];

        setTemplates(fallbackTemplates);
        setFormData(prev => ({ ...prev, templateId: fallbackTemplates[0]._id }));

        // Only show error toast if it's not a 404 (endpoint doesn't exist)
        if (error.response?.status !== 404) {
          toast.error('Failed to load email templates, using default templates');
        } else {
          console.warn('⚠️ Offer templates API not available, using fallback templates for testing');
        }
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!formData.candidateName.trim()) {
      newErrors.candidateName = 'Candidate name is required';
    }
    if (!formData.salary || formData.salary <= 0) {
      newErrors.salary = 'Valid salary is required';
    }
    if (!formData.templateId) {
      newErrors.templateId = 'Please select an email template';
    }
    if (!formData.designation.trim()) {
      newErrors.designation = 'Designation is required';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    // New field validations
    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client organization is required';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Work location is required';
    }
    if (!formData.contractEndDate) {
      newErrors.contractEndDate = 'Contract end date is required';
    }
    if (!formData.monthlySalary || formData.monthlySalary <= 0) {
      newErrors.monthlySalary = 'Valid monthly salary is required';
    }
    if (!formData.projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const offerData = {
        templateId: formData.templateId,
        // New form fields as per backend requirements
        clientName: formData.clientName,
        location: formData.location,
        employmentStartDate: formData.startDate,
        contractEndDate: formData.contractEndDate,
        monthlySalary: formData.monthlySalary,
        projectName: formData.projectName,
        // Keep existing offerDetails for backward compatibility
        offerDetails: {
          designation: formData.designation,
          offeredCTC: parseFloat(formData.salary),
          ctc: parseFloat(formData.salary),
          salary: parseFloat(formData.salary),
          startDate: formData.startDate,
          projectName: formData.projectName
        }
      };
      
      console.log('📤 Preparing to send offer with data:', offerData);
      await onSend(candidate._id, offerData);
      onClose();
    } catch (error) {
      console.error('❌ Error in handleSubmit:', error);
      toast.error('Failed to send offer');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateId) => {
    setFormData({ ...formData, templateId });
    const template = templates.find(t => t._id === templateId);
    setSelectedTemplatePreview(template);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 border border-dark-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-900 border-b border-dark-700 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-white">Send Offer Letter Email</h2>
            <p className="text-gray-400 text-sm mt-1">Select a template and fill in the offer details</p>
          </div>
          <button onClick={onClose} className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors p-2">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Candidate Info */}
          <div className="bg-[#2A2A3A] p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Position:</span>
              <span className="text-white font-medium">{candidate.position}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Email:</span>
              <span className="text-white">{candidate.candidateEmail}</span>
            </div>
            {candidate.department && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Department:</span>
                <span className="text-white">{candidate.department.name || candidate.department}</span>
              </div>
            )}
          </div>

          {/* Email Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Email Template *
            </label>
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-400 text-sm">Loading templates...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-yellow-400 text-sm">
                  No active templates available. Please create an offer template first.
                </p>
              </div>
            ) : (
              <>
                <select
                  value={formData.templateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className={`input-field w-full ${errors.templateId ? 'border-red-500' : ''}`}
                >
                  <option value="">Select a template...</option>
                  {templates.map((template) => (
                    <option key={template._id} value={template._id}>
                      {template.name} - {template.category} 
                      {template.isDefault && ' (Default)'}
                    </option>
                  ))}
                </select>
                {errors.templateId && (
                  <p className="text-red-400 text-sm mt-1">{errors.templateId}</p>
                )}
                {selectedTemplatePreview && (
                  <div className="mt-2 p-3 bg-[#2A2A3A] rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Template Preview:</p>
                    <p className="text-sm text-white font-medium mb-1">{selectedTemplatePreview.subject}</p>
                    <p className="text-xs text-gray-500">{selectedTemplatePreview.description}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Candidate Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Candidate Name *
            </label>
            <input
              type="text"
              value={formData.candidateName}
              onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
              className={`input-field w-full ${errors.candidateName ? 'border-red-500' : ''}`}
              placeholder="Enter candidate's full name"
            />
            {errors.candidateName && (
              <p className="text-red-400 text-sm mt-1">{errors.candidateName}</p>
            )}
          </div>

          {/* Designation */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Designation *
            </label>
            <input
              type="text"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className={`input-field w-full ${errors.designation ? 'border-red-500' : ''}`}
              placeholder="e.g., Senior Software Engineer"
            />
            {errors.designation && (
              <p className="text-red-400 text-sm mt-1">{errors.designation}</p>
            )}
          </div>

          {/* Salary */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Annual CTC (₹) *
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              className={`input-field w-full ${errors.salary ? 'border-red-500' : ''}`}
              placeholder="e.g., 500000"
            />
            {errors.salary && (
              <p className="text-red-400 text-sm mt-1">{errors.salary}</p>
            )}
            {formData.salary && (
              <p className="text-gray-400 text-xs mt-1">
                ₹{parseFloat(formData.salary).toLocaleString('en-IN')} per annum
              </p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Employment Start Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className={`input-field w-full ${errors.startDate ? 'border-red-500' : ''}`}
            />
            {errors.startDate && (
              <p className="text-red-400 text-sm mt-1">{errors.startDate}</p>
            )}
          </div>

          {/* New Fields Section */}
          <div className="border-t border-dark-700 pt-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Building className="mr-2" size={18} />
              Additional Offer Details
            </h3>
            
            {/* Client Organization */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Client Organization *
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className={`input-field w-full ${errors.clientName ? 'border-red-500' : ''}`}
                placeholder="e.g., International Agency, Client Company Name"
              />
              {errors.clientName && (
                <p className="text-red-400 text-sm mt-1">{errors.clientName}</p>
              )}
            </div>

            {/* Project Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                className={`input-field w-full ${errors.projectName ? 'border-red-500' : ''}`}
                placeholder="e.g., Typhoid Fever Surveillance Project"
              />
              {errors.projectName && (
                <p className="text-red-400 text-sm mt-1">{errors.projectName}</p>
              )}
            </div>

            {/* Work Location */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Work Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className={`input-field w-full ${errors.location ? 'border-red-500' : ''}`}
                placeholder="e.g., Mokokchung, Nagaland"
              />
              {errors.location && (
                <p className="text-red-400 text-sm mt-1">{errors.location}</p>
              )}
            </div>

            {/* Contract End Date */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contract End Date *
              </label>
              <input
                type="date"
                value={formData.contractEndDate}
                onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
                className={`input-field w-full ${errors.contractEndDate ? 'border-red-500' : ''}`}
              />
              {errors.contractEndDate && (
                <p className="text-red-400 text-sm mt-1">{errors.contractEndDate}</p>
              )}
            </div>

            {/* Monthly Salary */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Monthly Salary (CTC) *
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formData.monthlySalary}
                onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                className={`input-field w-full ${errors.monthlySalary ? 'border-red-500' : ''}`}
                placeholder="e.g., 40000"
              />
              {errors.monthlySalary && (
                <p className="text-red-400 text-sm mt-1">{errors.monthlySalary}</p>
              )}
              {formData.monthlySalary && (
                <p className="text-gray-400 text-xs mt-1">
                  Rs. {parseFloat(formData.monthlySalary).toLocaleString('en-IN')}/- per month
                </p>
              )}
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-blue-400 text-sm">
              <Mail size={14} className="inline mr-1" />
              <strong>Note:</strong> The offer email will be sent to {candidate.candidateEmail} using the selected template.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-dark-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-200 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-all shadow-lg shadow-[#A88BFF]/20 flex items-center space-x-2"
              disabled={loading || loadingTemplates || templates.length === 0}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail size={18} />
                  <span>Send Offer Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Rejection Notes Modal
const RejectionModal = ({ isOpen, onClose, document, rejectionNotes, setRejectionNotes, onSubmit, isSubmitting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2A2A3A] rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Reject Document</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-gray-300 mb-2">Document: <strong>{document?.name || document?.type}</strong></p>
            <p className="text-gray-400 text-sm">Please provide a reason for rejecting this document. The candidate will receive an email with your notes.</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Rejection Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              placeholder="e.g., Document is not clear, please upload a better quality scan..."
              className="w-full px-3 py-2 bg-[#1E1E2A] border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={4}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#1E1E2A] hover:bg-dark-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!rejectionNotes.trim() || isSubmitting}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending...' : 'Reject & Send Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
