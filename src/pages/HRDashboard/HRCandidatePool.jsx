import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Users, Plus, FileText, UploadCloud, Search, Clock, Filter, X, Loader2, Download, CheckCircle, AlertCircle, FileSpreadsheet, MoreVertical, Briefcase, Calendar, FileSignature, UserCheck, XCircle, ArrowRight } from 'lucide-react';

// Component for dynamic candidate status badge
const CandidateStatusBadge = ({ entry }) => {
  console.log('🔍 CandidateStatusBadge called for:', entry.name);
  console.log('   Entry type:', entry.type);
  console.log('   Entry stage:', entry.stage);
  console.log('   Original stage:', entry.original?.stage);
  console.log('   Is Ex-Employee:', entry.original?.isExEmployee);

  if (entry.original?.isExEmployee) {
    return (
      <span className="px-2 py-0.5 text-[10px] rounded-full border bg-orange-500/10 text-orange-300 border-orange-500/30">
        Ex-Employee
      </span>
    );
  }

  const stage = entry.original?.stage || entry.stage || 'applied';
  console.log('   Final stage used:', stage);
  
  const statusMap = {
    'applied': { label: 'Applied', bgColor: 'bg-blue-500/10', textColor: 'text-blue-300', borderColor: 'border-blue-500/30' },
    'screening': { label: 'Screening', bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-300', borderColor: 'border-yellow-500/30' },
    'shortlisted': { label: 'Shortlisted', bgColor: 'bg-green-500/10', textColor: 'text-green-300', borderColor: 'border-green-500/30' },
    'interview-scheduled': { label: 'Interview', bgColor: 'bg-purple-500/10', textColor: 'text-purple-300', borderColor: 'border-purple-500/30' },
    'interview-completed': { label: 'Interviewed', bgColor: 'bg-purple-500/10', textColor: 'text-purple-300', borderColor: 'border-purple-500/30' },
    'offer-extended': { label: 'Offer Extended', bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-300', borderColor: 'border-cyan-500/30' },
    'offer-accepted': { label: 'Offer Accepted', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-300', borderColor: 'border-emerald-500/30' },
    'sent-to-onboarding': { label: 'Onboarding', bgColor: 'bg-teal-500/10', textColor: 'text-teal-300', borderColor: 'border-teal-500/30' },
    'joined': { label: 'Joined', bgColor: 'bg-emerald-600/10', textColor: 'text-emerald-400', borderColor: 'border-emerald-600/30' },
    'rejected': { label: 'Rejected', bgColor: 'bg-red-500/10', textColor: 'text-red-300', borderColor: 'border-red-500/30' }
  };

  const status = statusMap[stage] || statusMap['applied'];
  console.log('   Status result:', status);

  return (
    <span className={`px-2 py-0.5 text-[10px] rounded-full border ${status.bgColor} ${status.textColor} ${status.borderColor}`}>
      {status.label}
    </span>
  );
};

const HRCandidatePool = () => {
  const navigate = useNavigate();
  const [allEntries, setAllEntries] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [filters, setFilters] = useState({
    minExperience: '',
    maxExperience: ''
  });

  // JD-based search state
  const [jdSearch, setJdSearch] = useState({
    jdId: '',
    jdData: null,
    minScore: 30,
    isSearching: false,
    searchResults: [],
    showResults: false,
    availableJDs: [],
    showCreateJD: false,
    createJDFile: null,
    createJDData: {
      jobTitle: '',
      companyName: ''
    }
  });

  const [newResume, setNewResume] = useState({
    name: '',
    email: '',
    phone: '',
    rawText: '',
    tags: ''
  });

  const [fileUpload, setFileUpload] = useState({
    file: null,
    name: '',
    email: '',
    phone: '',
    tags: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Move candidate modal state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveCandidate, setMoveCandidate] = useState(null);
  const [moveTarget, setMoveTarget] = useState('');
  const [jobPostings, setJobPostings] = useState([]);
  const [loadingJobPostings, setLoadingJobPostings] = useState(false);
  const [selectedJobPosting, setSelectedJobPosting] = useState('');
  const [interviewDetails, setInterviewDetails] = useState({
    type: 'Technical',
    scheduledDate: '',
    scheduledTime: '',
    meetingPlatform: 'Google Meet',
    meetingLink: ''
  });
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRefs = useRef({});

  const pageSize = 20;

  const normalizeResumeEntry = (resume = {}) => {
    const normalized = {
      id: resume._id,
      type: 'resume',
      name: resume.name || 'Unnamed Candidate',
      email: resume.email || '',
      phone: resume.phone || '',
      currentLocation: resume.parsedData?.location || '',
      experience: {
        years: resume.parsedData?.experience?.years ?? resume.experienceYears ?? null,
        months: resume.parsedData?.experience?.months ?? resume.experienceMonths ?? null
      },
      skills: resume.parsedData?.skills || [],
      statusLabel: resume.processingStatus || 'pending',
      statusType: 'processing',
      tags: resume.tags || [],
      source: resume.fileName || 'Resume Upload',
      rawText: resume.rawText || '',
      createdAt: resume.createdAt || resume.updatedAt,
      appliedRole: null,
      stage: null,
      // Intelligent search metadata
      relevanceScore: resume.relevanceScore || null,
      matchedSkills: resume.matchedSkills || [],
      matchReason: resume.matchReason || null,
      original: resume
    };

    return normalized;
  };

  const normalizeCandidateEntry = (candidate = {}) => {
    const normalized = {
      id: candidate._id,
      type: 'candidate',
      name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Unnamed Candidate',
      email: candidate.email || '',
      phone: candidate.phone || '',
      currentLocation: candidate.currentLocation || '',
      experience: {
        years: candidate.experience?.years ?? null,
        months: candidate.experience?.months ?? null
      },
      skills: Array.isArray(candidate.skills) ? candidate.skills : [],
      statusLabel: candidate.stage || candidate.status || 'applied',
      statusType: 'stage',
      tags: [candidate.source, candidate.appliedFor?.title].filter(Boolean),
      source: candidate.isExEmployee ? 'Ex-Employee' : (candidate.appliedFor?.title ? `Applied for ${candidate.appliedFor.title}` : 'Job Applicant'),
      rawText: '',
      createdAt: candidate.createdAt,
      appliedRole: candidate.appliedFor?.title || '',
      stage: candidate.stage || '',
      resumeUrl: candidate.resume?.url,
      original: candidate
    };

    return normalized;
  };

  const applyPagination = (dataset, targetPage = 1) => {
    const total = dataset.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(targetPage, 1), pages);
    const startIndex = (safePage - 1) * pageSize;
    setEntries(dataset.slice(startIndex, startIndex + pageSize));
    setPage(safePage);
    setTotalPages(pages);
    setTotalCount(total);
  };

  const fetchCandidatePool = async (opts = {}) => {
    setLoading(true);
    setError('');

    const targetPage = opts.page || 1;

    try {
      const resumeParams = {
        page: 1,
        limit: pageSize,
      };

      if (filters.minExperience) resumeParams.minExperience = filters.minExperience;
      if (filters.maxExperience) resumeParams.maxExperience = filters.maxExperience;

      const resumeRequest = searchQuery.trim()
        ? api.post('/resume-pool/search', {
            query: searchQuery.trim(),
            page: 1,
            limit: pageSize,
            filters: {}
          })
        : api.get('/resume-pool', { params: resumeParams });

      const candidateParams = {};
      if (searchQuery.trim()) {
        candidateParams.search = searchQuery.trim();
      }

      const [resumeResponse, candidateResponse] = await Promise.all([
        resumeRequest,
        api.get('/candidates', { params: candidateParams })
      ]);

      const resumeData = Array.isArray(resumeResponse?.data?.data) ? resumeResponse.data.data : [];
      const candidateData = Array.isArray(candidateResponse?.data?.data) ? candidateResponse.data.data : [];

      const resumeEntries = resumeData.map(normalizeResumeEntry);
      const candidateEntries = candidateData.map(normalizeCandidateEntry);

      // Include JD-matched candidates if JD search was performed
      let jdMatchedEntries = [];
      if (jdSearch.showResults && jdSearch.searchResults.length > 0) {
        // Convert JD search results to the same format as regular entries
        jdMatchedEntries = jdSearch.searchResults.map(match => ({
          ...normalizeCandidateEntry(match.candidate),
          matchScore: match.overallScore,
          overallFit: match.overallFit,
          matchedSkills: match.matchedSkills,
          relevanceExplanation: match.relevanceExplanation,
          isJDMatched: true // Flag to identify JD-matched candidates
        }));
      }

      // Combine all entries and sort appropriately
      const combined = [...candidateEntries, ...resumeEntries, ...jdMatchedEntries].sort((a, b) => {
        // Priority 1: JD-matched candidates (highest priority when JD search is active)
        if (jdSearch.showResults) {
          if (a.isJDMatched && !b.isJDMatched) return -1;
          if (!a.isJDMatched && b.isJDMatched) return 1;
          // If both are JD-matched or both are not, continue to score sorting
        }

        // Priority 2: Relevance/match scores (higher scores first)
        const aScore = a.relevanceScore || a.matchScore || 0;
        const bScore = b.relevanceScore || b.matchScore || 0;
        if (aScore !== bScore) return bScore - aScore;

        // Priority 3: Date sorting (newer first)
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setAllEntries(combined);
      applyPagination(combined, targetPage);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load candidate pool');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidatePool({ page: 1 });
    loadAvailableJDs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    fetchCandidatePool({ page: 1 });
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setTimeout(() => fetchCandidatePool({ page: 1 }), 0);
  };

  // Load available job descriptions
  const loadAvailableJDs = async () => {
    try {
      const response = await api.get('/job-descriptions', {
        params: { limit: 100 }
      });
      if (response.data.success) {
        setJdSearch(prev => ({
          ...prev,
          availableJDs: response.data.data.map(jd => ({
            id: jd._id,
            jobTitle: jd.jobTitle,
            companyName: jd.companyName || 'Unknown Company',
            parsingStatus: jd.parsingStatus
          }))
        }));
      }
    } catch (error) {
      console.error('Failed to load JDs:', error);
    }
  };

  // Poll JD parsing status
  const pollJDParsingStatus = async (jdId, maxAttempts = 30) => {
    let attempts = 0;
    
    const checkStatus = async () => {
      try {
        const response = await api.get(`/job-descriptions/${jdId}/parsing-status`);
        
        if (response.data.success && response.data.data.isReady) {
          // Parsing completed
          toast.success(`✅ JD "${response.data.data.jobTitle}" is ready for candidate matching!`);
          loadAvailableJDs(); // Refresh the JD list
          return true;
        } else if (response.data.data.parsingStatus === 'failed') {
          // Parsing failed
          toast.error(`❌ JD parsing failed: ${response.data.data.error || 'Unknown error'}`);
          loadAvailableJDs();
          return true;
        } else if (attempts < maxAttempts) {
          // Still processing, poll again
          attempts++;
          setTimeout(checkStatus, 2000); // Check every 2 seconds
          return false;
        } else {
          // Max attempts reached
          toast.warning('JD parsing is taking longer than expected. You can check back later.');
          loadAvailableJDs();
          return true;
        }
      } catch (error) {
        console.error('Error checking parsing status:', error);
        return true; // Stop polling on error
      }
    };
    
    checkStatus();
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    if (jdSearch.showResults) {
      // Handle pagination for JD search results
      applyPagination(jdSearch.searchResults, newPage);
    } else {
      applyPagination(allEntries, newPage);
    }
  };

  // JD-based search functions
  const handleJDSearch = async () => {
    if (!jdSearch.jdId && !jdSearch.jdData) {
      toast.error('Please select a Job Description or enter JD data');
      return;
    }

    setJdSearch(prev => ({ ...prev, isSearching: true }));
    setLoading(true);
    setError('');

    try {
      const searchParams = {
        minScore: jdSearch.minScore,
        maxResults: 50
      };

      if (jdSearch.jdId) {
        searchParams.jdId = jdSearch.jdId;
      } else if (jdSearch.jdData) {
        searchParams.jdData = JSON.stringify(jdSearch.jdData);
      }

      const response = await api.get('/candidates/search-by-jd', { params: searchParams });

      if (response.data.success) {
        const searchResults = response.data.data.matches.map(match => ({
          ...match.candidate,
          type: 'candidate',
          relevanceExplanation: match.relevanceExplanation,
          matchedSkills: match.matchedSkills,
          matchScore: match.overallScore,
          overallFit: match.overallFit,
          experienceMatch: match.experienceMatch,
          locationMatch: match.locationMatch
        }));

        setJdSearch(prev => ({
          ...prev,
          searchResults,
          showResults: true,
          isSearching: false
        }));

        applyPagination(searchResults, 1);
        toast.success(`Found ${searchResults.length} matching candidates`);
      }
    } catch (error) {
      console.error('JD search error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to search candidates by JD';
      
      if (errorMessage.includes('parsing not completed')) {
        toast.error('JD is still being parsed. Please wait a moment and try again.');
      } else {
        toast.error(errorMessage);
      }
      
      setError(errorMessage);
      setJdSearch(prev => ({ ...prev, isSearching: false }));
    } finally {
      setLoading(false);
    }
  };

  const clearJDSearch = () => {
    setJdSearch(prev => ({
      ...prev,
      jdId: '',
      jdData: null,
      minScore: 30,
      isSearching: false,
      searchResults: [],
      showResults: false
    }));
    fetchCandidatePool({ page: 1 });
  };

  // JD Creation Functions
  const handleCreateJD = async () => {
    if (!jdSearch.createJDFile || !jdSearch.createJDData.jobTitle.trim()) {
      toast.error('Please select a file and enter job title');
      return;
    }

    const formData = new FormData();
    formData.append('jdFile', jdSearch.createJDFile);
    formData.append('jobTitle', jdSearch.createJDData.jobTitle);
    if (jdSearch.createJDData.companyName) {
      formData.append('companyName', jdSearch.createJDData.companyName);
    }

    try {
      const response = await api.post('/job-descriptions/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const newJdId = response.data.data.jobDescriptionId;
        toast.success('Job Description uploaded! Parsing in progress...');
        
        setJdSearch(prev => ({
          ...prev,
          showCreateJD: false,
          createJDFile: null,
          createJDData: { jobTitle: '', companyName: '' },
          jdId: newJdId // Auto-select the new JD
        }));
        
        // Reload available JDs
        loadAvailableJDs();
        
        // Start polling for parsing completion
        pollJDParsingStatus(newJdId);
      }
    } catch (error) {
      console.error('JD creation error:', error);
      toast.error(error.response?.data?.error || 'Failed to create JD');
    }
  };

  const openAddModal = () => {
    setNewResume({ name: '', email: '', phone: '', rawText: '', tags: '' });
    setShowAddModal(true);
  };

  const openFileModal = () => {
    setFileUpload({ file: null, name: '', email: '', phone: '', tags: '' });
    setShowFileModal(true);
  };

  const handleAddResume = async () => {
    if (!newResume.name.trim() || !newResume.rawText.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        name: newResume.name.trim(),
        email: newResume.email.trim() || undefined,
        phone: newResume.phone.trim() || undefined,
        rawText: newResume.rawText,
        tags: newResume.tags
          ? newResume.tags.split(',').map(t => t.trim()).filter(Boolean)
          : []
      };

      const response = await api.post('/resume-pool/text', payload);

      if (response.data.success) {
        setShowAddModal(false);
        await fetchResumes({ page: 1 });
      } else {
        setError(response.data.message || 'Failed to add resume');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add resume');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async () => {
    if (!fileUpload.file) return;

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('resume', fileUpload.file);
      if (fileUpload.name) formData.append('name', fileUpload.name);
      if (fileUpload.email) formData.append('email', fileUpload.email);
      if (fileUpload.phone) formData.append('phone', fileUpload.phone);
      if (fileUpload.tags) formData.append('tags', fileUpload.tags);

      const response = await api.post('/resume-pool/file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setShowFileModal(false);
        await fetchResumes({ page: 1 });
      } else {
        setError(response.data.message || 'Failed to upload resume file');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload resume file');
    } finally {
      setSubmitting(false);
    }
  };

  const getExperienceString = (entry) => {
    if (!entry) return 'N/A';
    if (entry.type === 'candidate') {
      const years = entry.experience?.years || 0;
      const months = entry.experience?.months || 0;
      if (!years && !months) return 'N/A';
      if (!months) return `${years} yrs`;
      return `${years} yrs ${months} mo`;
    }

    const years = entry.experience?.years || 0;
    const months = entry.experience?.months || 0;
    if (!years && !months) return 'N/A';
    if (!months) return `${years} yrs`;
    return `${years} yrs ${months} mo`;
  };

  const getStatusBadge = (entry) => {
    if (!entry) return 'text-gray-400 border-gray-700';
    if (entry.type === 'candidate') {
      switch (entry.statusLabel) {
        case 'shortlisted':
        case 'interview-scheduled':
          return 'border-green-500/50 text-green-300 bg-green-500/10';
        case 'offer-extended':
        case 'offer-accepted':
          return 'border-blue-500/50 text-blue-300 bg-blue-500/10';
        case 'rejected':
          return 'border-red-500/50 text-red-300 bg-red-500/10';
        default:
          return 'border-[#A88BFF]/50 text-[#C7B6FF] bg-[#A88BFF]/10';
      }
    }

    switch (entry.statusLabel) {
      case 'completed':
        return 'border-green-500/50 text-green-300 bg-green-500/10';
      case 'failed':
        return 'border-red-500/50 text-red-300 bg-red-500/10';
      case 'processing':
        return 'border-blue-500/50 text-blue-300 bg-blue-500/10';
      default:
        return 'border-[#A88BFF]/50 text-[#C7B6FF] bg-[#A88BFF]/10';
    }
  };

  const getEntryTags = (entry) => {
    if (!entry) return [];
    if (entry.type === 'candidate') {
      const tags = entry.tags || [];
      return tags.length ? tags : [entry.original?.isExEmployee ? 'Ex-Employee' : 'Job Applicant'];
    }
    return entry.tags || [];
  };

  const openEntryModal = (entry) => {
    setSelectedEntry(entry);
  };

  const closeEntryModal = () => {
    setSelectedEntry(null);
  };

  // Load job postings for candidate movement
  const loadJobPostingsForMove = async () => {
    console.log('🔄 Loading job postings for move...');
    setLoadingJobPostings(true);
    try {
      const response = await api.get('/candidates/job-postings-for-move');
      console.log('✅ Job postings loaded:', response.data);
      setJobPostings(response.data.jobPostings || []);
    } catch (err) {
      console.error('❌ Failed to load job postings:', err);
      toast.error('Failed to load job postings');
      setJobPostings([]);
    } finally {
      setLoadingJobPostings(false);
    }
  };

  // Open move candidate modal
  const openMoveModal = async (entry, target) => {
    console.log('📂 Opening move modal for:', entry.name, 'Target:', target);
    setMoveCandidate(entry);
    setMoveTarget(target);
    setSelectedJobPosting('');
    setInterviewDetails({
      type: 'Technical',
      scheduledDate: '',
      scheduledTime: '',
      meetingPlatform: 'Google Meet',
      meetingLink: ''
    });
    
    // Load job postings if needed
    if (['applicant', 'shortlisted', 'onboarding', 'interview'].includes(target)) {
      await loadJobPostingsForMove();
    }
    
    setShowMoveModal(true);
    setOpenDropdownId(null);
  };

  // Close move candidate modal
  const closeMoveModal = () => {
    setShowMoveModal(false);
    setMoveCandidate(null);
    setMoveTarget('');
    setSelectedJobPosting('');
    setJobPostings([]);
  };

  // Handle candidate movement
  const handleMoveCandidate = async () => {
    try {
      if (!moveCandidate || !moveTarget) {
        toast.error('Invalid move operation');
        return;
      }

      // Validate job posting selection if required
      if (needsJobPosting(moveTarget) && !selectedJobPosting) {
        toast.error('Please select a job posting');
        return;
      }

      // Validate interview details if required
      if (moveTarget === 'interview') {
        if (!interviewDetails.scheduledDate || !interviewDetails.scheduledTime) {
          toast.error('Please provide interview date and time');
          return;
        }
      }

      const payload = {
        targetSection: moveTarget,
        jobPostingId: selectedJobPosting || undefined,
        interviewDetails: moveTarget === 'interview' ? interviewDetails : undefined
      };

      console.log('🚀 Moving candidate:', payload);

      await api.post(`/candidates/${moveCandidate.id}/move-to-section`, payload);
      
      toast.success(`Candidate moved to ${getMoveTargetLabel(moveTarget)} successfully`);
      closeMoveModal();
      
      // Refresh the candidate pool
      await fetchCandidatePool({ page: page });
    } catch (err) {
      console.error('❌ Failed to move candidate:', err);
      toast.error(err.response?.data?.message || 'Failed to move candidate');
    }
  };

  // Check if job posting selection is required
  const needsJobPosting = (target) => {
    return ['applicant', 'shortlisted', 'onboarding'].includes(target);
  };

  // Get label for move target
  const getMoveTargetLabel = (target) => {
    const labels = {
      'applicant': 'Applicant Pool',
      'shortlisted': 'Shortlisted',
      'interview': 'Schedule Interview',
      'offer': 'Extend Offer',
      'onboarding': 'Onboarding',
      'contract': 'Contract',
      'rejected': 'Rejected'
    };
    return labels[target] || target;
  };

  // Get dynamic status label and color for candidate
  const getCandidateStatus = (entry) => {
    console.log('🔍 getCandidateStatus called for:', entry.name);
    console.log('   Entry type:', entry.type);
    console.log('   Entry stage:', entry.stage);
    console.log('   Original stage:', entry.original?.stage);
    console.log('   Is Ex-Employee:', entry.original?.isExEmployee);
    console.log('   Full entry:', entry);

    if (entry.original?.isExEmployee) {
      return {
        label: 'Ex-Employee',
        bgColor: 'bg-orange-500/10',
        textColor: 'text-orange-300',
        borderColor: 'border-orange-500/30'
      };
    }

    const stage = entry.original?.stage || entry.stage || 'applied';
    console.log('   Final stage used:', stage);
    
    const statusMap = {
      'applied': { label: 'Applied', bgColor: 'bg-blue-500/10', textColor: 'text-blue-300', borderColor: 'border-blue-500/30' },
      'screening': { label: 'Screening', bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-300', borderColor: 'border-yellow-500/30' },
      'shortlisted': { label: 'Shortlisted', bgColor: 'bg-green-500/10', textColor: 'text-green-300', borderColor: 'border-green-500/30' },
      'interview-scheduled': { label: 'Interview', bgColor: 'bg-purple-500/10', textColor: 'text-purple-300', borderColor: 'border-purple-500/30' },
      'interview-completed': { label: 'Interviewed', bgColor: 'bg-purple-500/10', textColor: 'text-purple-300', borderColor: 'border-purple-500/30' },
      'offer-extended': { label: 'Offer Extended', bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-300', borderColor: 'border-cyan-500/30' },
      'offer-accepted': { label: 'Offer Accepted', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-300', borderColor: 'border-emerald-500/30' },
      'sent-to-onboarding': { label: 'Onboarding', bgColor: 'bg-teal-500/10', textColor: 'text-teal-300', borderColor: 'border-teal-500/30' },
      'joined': { label: 'Joined', bgColor: 'bg-emerald-600/10', textColor: 'text-emerald-400', borderColor: 'border-emerald-600/30' },
      'rejected': { label: 'Rejected', bgColor: 'bg-red-500/10', textColor: 'text-red-300', borderColor: 'border-red-500/30' }
    };

    const result = statusMap[stage] || statusMap['applied'];
    console.log('   Status result:', result);
    return result;
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside all dropdowns
      const clickedOutside = Object.values(dropdownRefs.current).every(
        ref => !ref || !ref.contains(event.target)
      );
      
      if (clickedOutside) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBulkUploadFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        setError('Please upload Excel (.xlsx, .xls) or CSV file');
        return;
      }
      setBulkUploadFile(file);
      setValidationResult(null);
      setImportResult(null);
    }
  };

  const handleValidateBulkUpload = async () => {
    if (!bulkUploadFile) {
      setError('Please select a file');
      return;
    }

    setValidating(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', bulkUploadFile);

      const response = await api.post('/candidates/bulk/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        console.log('Validation result received:', response.data.data);
        console.log('Validated data sample:', response.data.data.validatedData?.slice(0, 2));
        setValidationResult(response.data.data);
        toast.success(`Validation complete: ${response.data.data.validRows} valid rows`);
      } else {
        setError(response.data.message || 'Validation failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to validate file');
      if (err.response?.data?.errors) {
        console.error('Validation errors:', err.response.data.errors);
      }
    } finally {
      setValidating(false);
    }
  };

  const handleImportBulkCandidates = async () => {
    if (!validationResult || !validationResult.validatedData || validationResult.validatedData.length === 0) {
      setError('No validated data to import');
      return;
    }

    setImporting(true);
    setError('');

    try {
      console.log('Sending import request with validatedData:', validationResult.validatedData?.slice(0, 2));
      const response = await api.post('/candidates/bulk/import', {
        validatedData: validationResult.validatedData,
        jobMapping: {} // Can be extended to map job titles to IDs
      });

      if (response.data.success) {
        setImportResult(response.data.data);
        toast.success(`Import complete: ${response.data.data.success.length} imported`);
        setShowBulkUploadModal(false);
        setBulkUploadFile(null);
        setValidationResult(null);
        await fetchCandidatePool({ page: 1 });
      } else {
        setError(response.data.message || 'Import failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to import candidates');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/candidates/bulk/template', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'candidate_bulk_upload_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Template downloaded successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download template');
    }
  };

  return (
    <div className="min-h-screen bg-[#1E1E2A] p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-[#A88BFF]" />
            Candidate Pool
          </h1>
          <p className="text-gray-400 mt-1">
            Unified view of all applicants and uploaded resumes across roles and sources.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#A88BFF] text-white text-sm font-medium hover:bg-[#B89CFF] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Raw Text
          </button>
          <button
            onClick={() => navigate('/employee/hr/resume-parser')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E1E2A] border border-gray-700 text-gray-200 text-sm font-medium hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Resume
          </button>
          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E1E2A] border border-gray-700 text-gray-200 text-sm font-medium hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Bulk Upload
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-[#2A2A3A] rounded-2xl border border-gray-800 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, skills, text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 pr-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
              />
            </div>
            <button
              onClick={handleSearch}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#A88BFF] text-white text-sm font-medium hover:bg-[#B89CFF] transition-colors"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>

          {/* JD Search */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <FileText className="w-3 h-3" />
              JD Match
            </div>
            <div className="flex items-center gap-2">
              <select
                value={jdSearch.jdId}
                onChange={(e) => setJdSearch(prev => ({ ...prev, jdId: e.target.value }))}
                className="w-48 px-2 py-1.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-[#A88BFF]"
              >
                <option value="">Select Job Description</option>
                {jdSearch.availableJDs?.map(jd => (
                  <option key={jd.id} value={jd.id}>
                    {jd.parsingStatus === 'completed' ? '✓ ' : jd.parsingStatus === 'processing' ? '⏳ ' : jd.parsingStatus === 'failed' ? '✗ ' : ''}
                    {jd.jobTitle} - {jd.companyName}
                    {jd.parsingStatus === 'processing' ? ' (Parsing...)' : jd.parsingStatus === 'failed' ? ' (Failed)' : ''}
                  </option>
                ))}
              </select>
              {jdSearch.jdId && jdSearch.availableJDs?.find(jd => jd.id === jdSearch.jdId)?.parsingStatus === 'processing' && (
                <span className="flex items-center gap-1 text-xs text-yellow-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Parsing...
                </span>
              )}
              {jdSearch.jdId && jdSearch.availableJDs?.find(jd => jd.id === jdSearch.jdId)?.parsingStatus === 'completed' && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  Ready
                </span>
              )}
            </div>
            <input
              type="number"
              placeholder="Min Score %"
              value={jdSearch.minScore}
              onChange={(e) => setJdSearch(prev => ({ ...prev, minScore: parseInt(e.target.value) || 30 }))}
              className="w-20 px-2 py-1.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
            />
            <button
              onClick={() => setJdSearch(prev => ({ ...prev, showCreateJD: true }))}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Create JD
            </button>
            <button
              onClick={handleJDSearch}
              disabled={jdSearch.isSearching || !jdSearch.jdId || jdSearch.availableJDs?.find(jd => jd.id === jdSearch.jdId)?.parsingStatus === 'processing'}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={jdSearch.availableJDs?.find(jd => jd.id === jdSearch.jdId)?.parsingStatus === 'processing' ? 'JD is still being parsed. Please wait...' : ''}
            >
              {jdSearch.isSearching ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <FileText className="w-3 h-3" />
              )}
              JD Search
            </button>
            {jdSearch.showResults && (
              <button
                onClick={clearJDSearch}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-600 text-white text-xs font-medium hover:bg-gray-700 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Filter className="w-3 h-3" />
              Experience Range
            </div>
            <input
              type="number"
              placeholder="Min Exp (years)"
              value={filters.minExperience}
              onChange={(e) => handleFilterChange('minExperience', e.target.value)}
              className="w-24 px-2 py-1.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
            />
            <input
              type="number"
              placeholder="Max Exp (years)"
              value={filters.maxExperience}
              onChange={(e) => handleFilterChange('maxExperience', e.target.value)}
              className="w-24 px-2 py-1.5 bg-[#1E1E2A] border border-gray-700 rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* List */}
      <div className="bg-[#2A2A3A] rounded-2xl border border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Users className="w-4 h-4 text-[#A88BFF]" />
            <span>{jdSearch.showResults ? 'JD Match Results' : 'Candidate Pool'}</span>
            <span className="text-xs text-gray-500">({entries.length} shown of {totalCount})</span>
            {jdSearch.showResults && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-300 border border-green-500/30">
                JD Matched
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {jdSearch.showResults ? 'AI-powered job matching' : 'Recruiting + AI parsed resumes, combined automatically'}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#232334] text-xs uppercase text-gray-400">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Skills</th>
                {jdSearch.showResults && (
                  <>
                    <th className="px-4 py-3 text-left">Match Score</th>
                    <th className="px-4 py-3 text-left">Matched Skills</th>
                  </>
                )}
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Resume/CV</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={jdSearch.showResults ? 10 : 8} className="px-4 py-10 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#A88BFF]" />
                      <span>Loading candidate pool...</span>
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={jdSearch.showResults ? 10 : 8} className="px-4 py-10 text-center text-gray-500 text-sm">
                    No candidates found yet. Adjust filters or add resumes manually.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t border-gray-800 hover:bg-[#1E1E2A]/60 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-white font-medium flex items-center gap-2">
                          {entry.name}
                          {entry.isJDMatched && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-500/10 text-green-300 border border-green-500/30">
                              JD Match
                            </span>
                          )}
                          {entry.type === 'resume' && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                              Resume
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-300">
                        {entry.email || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-300">
                        {entry.phone || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-300">
                        {entry.currentLocation || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {(entry.skills || []).slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-[#1E1E2A] border border-gray-700 text-[11px] text-gray-200"
                          >
                            {skill}
                          </span>
                        ))}
                        {(entry.skills || []).length > 3 && (
                          <span className="text-[11px] text-gray-500">
                            +{(entry.skills.length - 3)} more
                          </span>
                        )}
                        {(!entry.skills || entry.skills.length === 0) && (
                          <span className="text-[11px] text-gray-500">No skills</span>
                        )}
                      </div>
                    </td>
                    {jdSearch.showResults && (
                      <>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${
                              entry.matchScore >= 90 ? 'text-green-400' :
                              entry.matchScore >= 75 ? 'text-yellow-400' :
                              entry.matchScore >= 60 ? 'text-orange-400' : 'text-red-400'
                            }`}>
                              {entry.matchScore}%
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              entry.overallFit === 'excellent' ? 'bg-green-500/10 text-green-300 border border-green-500/30' :
                              entry.overallFit === 'good' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30' :
                              entry.overallFit === 'average' ? 'bg-orange-500/10 text-orange-300 border border-orange-500/30' :
                              'bg-red-500/10 text-red-300 border border-red-500/30'
                            }`}>
                              {entry.overallFit}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {(entry.matchedSkills || []).slice(0, 3).map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-[11px] text-green-300"
                              >
                                {skill}
                              </span>
                            ))}
                            {(entry.matchedSkills || []).length > 3 && (
                              <span className="text-[11px] text-gray-500">
                                +{(entry.matchedSkills.length - 3)} more
                              </span>
                            )}
                            {(!entry.matchedSkills || entry.matchedSkills.length === 0) && (
                              <span className="text-[11px] text-gray-500">No matches</span>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      {entry.type === 'candidate' ? (
                        <CandidateStatusBadge entry={entry} />
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] rounded-full border bg-purple-500/10 text-purple-300 border-purple-500/30">
                          Resume
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.resumeUrl ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={entry.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/30 text-xs text-green-300 hover:bg-green-500/20 hover:border-green-500/50 transition-colors"
                            title={`View resume for ${entry.name}`}
                          >
                            <FileText className="w-3 h-3" />
                            View
                          </a>
                          <span className="text-xs text-gray-500">
                            {entry.original?.resume?.mimetype?.includes('pdf') ? 'PDF' :
                             entry.original?.resume?.mimetype?.includes('word') ? 'DOC' : 'File'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">No resume</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEntryModal(entry)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-700 text-xs text-gray-200 hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          View Details
                        </button>
                        
                        {entry.type === 'candidate' && (
                          <div className="relative" ref={el => dropdownRefs.current[entry.id] = el}>
                            <button
                              onClick={() => setOpenDropdownId(openDropdownId === entry.id ? null : entry.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-700 text-xs text-gray-200 hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors"
                            >
                              <MoreVertical className="w-3 h-3" />
                            </button>
                            
                            {openDropdownId === entry.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-[#2A2A3A] border border-gray-700 rounded-lg shadow-xl z-50 py-1">
                                <div className="px-3 py-2 border-b border-gray-700">
                                  <p className="text-xs font-medium text-gray-400">Move to</p>
                                </div>
                                
                                <button
                                  onClick={() => openMoveModal(entry, 'applicant')}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-[#1E1E2A] transition-colors"
                                >
                                  <Briefcase className="w-3 h-3 text-blue-400" />
                                  Applicant Pool
                                </button>
                                
                                <button
                                  onClick={() => openMoveModal(entry, 'shortlisted')}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-[#1E1E2A] transition-colors"
                                >
                                  <CheckCircle className="w-3 h-3 text-green-400" />
                                  Shortlisted
                                </button>
                                
                                <button
                                  onClick={() => openMoveModal(entry, 'interview')}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-[#1E1E2A] transition-colors"
                                >
                                  <Calendar className="w-3 h-3 text-purple-400" />
                                  Schedule Interview
                                </button>
                                
                                <button
                                  onClick={() => openMoveModal(entry, 'onboarding')}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-[#1E1E2A] transition-colors"
                                >
                                  <UserCheck className="w-3 h-3 text-cyan-400" />
                                  Move to Onboarding
                                </button>
                                
                                <button
                                  onClick={() => openMoveModal(entry, 'rejected')}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-[#1E1E2A] transition-colors"
                                >
                                  <XCircle className="w-3 h-3 text-red-400" />
                                  Rejected
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 text-xs text-gray-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-2 py-1 rounded border border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#A88BFF] hover:text-[#A88BFF]"
              >
                Prev
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="px-2 py-1 rounded border border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#A88BFF] hover:text-[#A88BFF]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Raw Text Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-[#2A2A3A] border border-gray-800 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#A88BFF]" />
                  Add Resume (Raw Text)
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Paste full resume text. We will auto-parse skills and experience.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Candidate Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newResume.name}
                    onChange={(e) => setNewResume(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
                    placeholder="e.g. Sarah Chen"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newResume.email}
                    onChange={(e) => setNewResume(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
                    placeholder="candidate@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={newResume.phone}
                    onChange={(e) => setNewResume(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={newResume.tags}
                  onChange={(e) => setNewResume(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
                  placeholder="e.g. Java, Backend, 6 years"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Resume Text <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={10}
                  value={newResume.rawText}
                  onChange={(e) => setNewResume(prev => ({ ...prev, rawText: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF] resize-none"
                  placeholder="Paste full resume content here..."
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Tip: You can copy-paste from PDF or Word. The system will auto-extract skills & experience.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-700 text-xs text-gray-300 hover:border-gray-500 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddResume}
                  disabled={submitting || !newResume.name.trim() || !newResume.rawText.trim()}
                  className="px-4 py-2 rounded-lg bg-[#A88BFF] text-xs text-white font-medium hover:bg-[#B89CFF] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      Add to Pool
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {showFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-[#2A2A3A] border border-gray-800 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-сenter gap-2">
                  <UploadCloud className="w-4 h-4 text-[#A88BFF]" />
                  Upload Resume File
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Upload PDF or DOCX files. We will parse them automatically.
                </p>
              </div>
              <button
                onClick={() => setShowFileModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Candidate Name (optional)
                  </label>
                  <input
                    type="text"
                    value={fileUpload.name}
                    onChange={(e) => setFileUpload(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
                    placeholder="If empty, system will try to detect"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={fileUpload.tags}
                    onChange={(e) => setFileUpload(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
                    placeholder="e.g. Backend, Senior, React"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">
                  Resume File <span className="text-red-400">*</span>
                </label>
                <label className="flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-700 rounded-xl bg-[#1E1E2A] text-gray-400 cursor-pointer hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors text-center text-xs">
                  <UploadCloud className="w-5 h-5" />
                  {fileUpload.file ? (
                    <>
                      <span className="text-gray-200 text-sm">{fileUpload.file.name}</span>
                      <span>Click to change file</span>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-200 text-sm">Click to upload PDF or DOCX</span>
                      <span>Max 10MB per file</span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFileUpload(prev => ({ ...prev, file }));
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Files are stored in the resume pool and auto-parsed for skills & experience.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFileModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-700 text-xs text-gray-300 hover:border-gray-500 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={submitting || !fileUpload.file}
                  className="px-4 py-2 rounded-lg bg-[#A88BFF] text-xs text-white font-medium hover:bg-[#B89CFF] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3 h-3" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resume Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-[#2A2A3A] border border-gray-800 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#A88BFF]" />
                  {selectedEntry.name}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedEntry.type === 'candidate'
                    ? selectedEntry.appliedRole
                      ? (selectedEntry.original?.isExEmployee ? 'Ex-Employee' : `Job Applicant • Applied for ${selectedEntry.appliedRole}`)
                      : (selectedEntry.original?.isExEmployee ? 'Ex-Employee' : 'Job Applicant')
                    : selectedEntry.source || 'Resume Pool'}
                </p>
              </div>
              <button
                onClick={closeEntryModal}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-5 py-4 overflow-y-auto max-h-[70vh]">
              {/* Left column: basic info */}
              <div className="space-y-4 lg:col-span-1">
                <div className="bg-[#1E1E2A] border border-gray-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Basic Info</h3>
                  <div className="space-y-2 text-xs text-gray-300">
                    {selectedEntry.email && (
                      <div>
                        <span className="text-gray-500">Email: </span>
                        <span>{selectedEntry.email}</span>
                      </div>
                    )}
                    {selectedEntry.phone && (
                      <div>
                        <span className="text-gray-500">Phone: </span>
                        <span>{selectedEntry.phone}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Experience: </span>
                      <span>{getExperienceString(selectedEntry)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Status: </span>
                      <span className="capitalize">{selectedEntry.statusLabel || 'pending'}</span>
                    </div>
                    {getEntryTags(selectedEntry).length > 0 && (
                      <div>
                        <span className="text-gray-500">Tags: </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {getEntryTags(selectedEntry).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-full bg-[#1E1E2A] border border-gray-700 text-[11px] text-gray-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#1E1E2A] border border-gray-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-1 text-xs">
                    {(selectedEntry.skills || []).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full bg-[#232334] text-gray-200 border border-gray-700"
                      >
                        {skill}
                      </span>
                    ))}
                    {(!selectedEntry.skills || selectedEntry.skills.length === 0) && (
                      <span className="text-gray-500">No parsed skills available.</span>
                    )}
                  </div>
                </div>

                {selectedEntry.resumeUrl && (
                  <div className="bg-[#1E1E2A] border border-gray-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Resume/CV</h3>
                    <a
                      href={selectedEntry.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 hover:bg-green-500/20 hover:border-green-500/50 transition-colors text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      <span>View Resume</span>
                    </a>
                    <p className="text-xs text-gray-500 mt-2">
                      Opens resume in a new tab
                    </p>
                  </div>
                )}

                {selectedEntry.type === 'resume' && selectedEntry.original?.aiAnalysis && (
                  <div className="bg-[#1E1E2A] border border-gray-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">AI Insights</h3>
                    <div className="space-y-2 text-xs text-gray-300">
                      {selectedEntry.original.aiAnalysis.overallFit && (
                        <div>
                          <span className="text-gray-500">Overall Fit: </span>
                          <span className="capitalize">{selectedEntry.original.aiAnalysis.overallFit}</span>
                        </div>
                      )}
                      {selectedEntry.original.aiAnalysis.keyHighlights && selectedEntry.original.aiAnalysis.keyHighlights.length > 0 && (
                        <div>
                          <span className="text-gray-500">Highlights:</span>
                          <ul className="mt-1 list-disc list-inside space-y-1">
                            {selectedEntry.original.aiAnalysis.keyHighlights.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action History Section - Only for candidates */}
                {selectedEntry.type === 'candidate' && (
                  <div className="bg-[#1E1E2A] border border-gray-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#A88BFF]" />
                      Action History
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedEntry.original?.workflowHistory && selectedEntry.original.workflowHistory.length > 0 ? (
                        selectedEntry.original.workflowHistory
                          .slice()
                          .reverse()
                          .map((action, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2 bg-[#11111C] border border-gray-800 rounded-lg">
                              <div className="w-2 h-2 rounded-full bg-[#A88BFF] mt-1.5 flex-shrink-0"></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-medium text-white">
                                    {action.fromStage} → {action.toStage}
                                  </p>
                                  <span className="text-[10px] text-gray-500">
                                    {new Date(action.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                                {action.reason && (
                                  <p className="text-[10px] text-gray-400 mt-1">
                                    {action.reason}
                                  </p>
                                )}
                                {action.skippedStages && action.skippedStages.length > 0 && (
                                  <p className="text-[10px] text-yellow-400 mt-1">
                                    Skipped: {action.skippedStages.join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-4">
                          <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">No action history available</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right column: raw text */}
              <div className="lg:col-span-2">
                {selectedEntry.type === 'resume' ? (
                  <div className="bg-[#1E1E2A] border border-gray-800 rounded-xl p-4 h-full flex flex-col">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#A88BFF]" />
                      Raw Resume Text
                    </h3>
                    <div className="flex-1 overflow-y-auto rounded-lg bg-[#11111C] border border-gray-900 p-3 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {selectedEntry.rawText || 'No raw text available.'}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#1E1E2A] border border-gray-800 rounded-xl p-4 h-full flex flex-col">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#A88BFF]" />
                      Candidate Overview
                    </h3>
                    <div className="flex-1 overflow-y-auto rounded-lg bg-[#11111C] border border-gray-900 p-3 text-xs text-gray-300 space-y-3">
                      <div>
                        <span className="text-gray-500 block mb-1">Stage</span>
                        <span className="capitalize">{selectedEntry.stage || selectedEntry.statusLabel || 'applied'}</span>
                      </div>
                      {selectedEntry.original?.professionalExperience && selectedEntry.original.professionalExperience.length > 0 && (
                        <div>
                          <span className="text-gray-500 block mb-1">Experience Highlights</span>
                          <ul className="list-disc list-inside space-y-1">
                            {selectedEntry.original.professionalExperience.slice(0, 5).map((expItem, idx) => (
                              <li key={idx}>
                                <span className="text-white">{expItem.designation || 'Role'} @ {expItem.company || 'Company'}</span>
                                {expItem.startDate && (
                                  <span className="text-gray-500 ml-1">
                                    ({new Date(expItem.startDate).toLocaleDateString()} - {expItem.currentlyWorking ? 'Present' : expItem.endDate ? new Date(expItem.endDate).toLocaleDateString() : 'Unknown'})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedEntry.original?.timeline && selectedEntry.original.timeline.length > 0 && (
                        <div>
                          <span className="text-gray-500 block mb-1">Recent Timeline</span>
                          <ul className="space-y-1">
                            {selectedEntry.original.timeline.slice(-4).reverse().map((event, idx) => (
                              <li key={idx} className="text-gray-300">
                                <span className="text-white">{event.action}</span>
                                <span className="ml-2 text-gray-500 text-[11px]">
                                  {new Date(event.timestamp).toLocaleString()}
                                </span>
                                {event.description && <div className="text-gray-400 text-[11px]">{event.description}</div>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-[#2A2A3A] border border-gray-800 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#A88BFF]" />
                  Bulk Upload Candidates
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Upload Excel or CSV file with candidate data
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setBulkUploadFile(null);
                  setValidationResult(null);
                  setImportResult(null);
                  setError('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[70vh]">
              {/* Step 1: Upload File */}
              {!validationResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1">Step 1: Upload File</h3>
                      <p className="text-xs text-gray-400">Upload your Excel or CSV file</p>
                    </div>
                    <button
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1E1E2A] border border-gray-700 text-gray-200 text-xs font-medium hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download Template
                    </button>
                  </div>

                  <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleBulkUploadFileChange}
                      className="hidden"
                      id="bulk-upload-file"
                    />
                    <label
                      htmlFor="bulk-upload-file"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <UploadCloud className="w-8 h-8 text-gray-500" />
                      <span className="text-sm text-gray-300">
                        {bulkUploadFile ? bulkUploadFile.name : 'Click to select file or drag and drop'}
                      </span>
                      <span className="text-xs text-gray-500">
                        Excel (.xlsx, .xls) or CSV files only
                      </span>
                    </label>
                  </div>

                  {bulkUploadFile && (
                    <button
                      onClick={handleValidateBulkUpload}
                      disabled={validating}
                      className="w-full px-4 py-2 rounded-lg bg-[#A88BFF] text-white text-sm font-medium hover:bg-[#B89CFF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {validating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Validate File
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Step 2: Validation Results */}
              {validationResult && !importResult && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-white mb-1">Step 2: Validation Results</h3>
                    <p className="text-xs text-gray-400">Review validation results before importing</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-[#1E1E2A] border border-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Total Rows</div>
                      <div className="text-lg font-semibold text-white">{validationResult.totalRows}</div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="text-xs text-green-400 mb-1">Valid Rows</div>
                      <div className="text-lg font-semibold text-green-300">{validationResult.validRows}</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="text-xs text-red-400 mb-1">Invalid Rows</div>
                      <div className="text-lg font-semibold text-red-300">{validationResult.invalidRows}</div>
                    </div>
                  </div>

                  {validationResult.errors && validationResult.errors.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <h4 className="text-sm font-semibold text-red-300">Errors</h4>
                      </div>
                      <div className="max-h-32 overflow-y-auto text-xs text-red-200 space-y-1">
                        {validationResult.errors.slice(0, 10).map((error, idx) => (
                          <div key={idx}>{error}</div>
                        ))}
                        {validationResult.errors.length > 10 && (
                          <div className="text-red-400">... and {validationResult.errors.length - 10} more errors</div>
                        )}
                      </div>
                    </div>
                  )}

                  {validationResult.warnings && validationResult.warnings.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <h4 className="text-sm font-semibold text-yellow-300">Warnings</h4>
                      </div>
                      <div className="max-h-32 overflow-y-auto text-xs text-yellow-200 space-y-1">
                        {validationResult.warnings.slice(0, 10).map((warning, idx) => (
                          <div key={idx}>{warning}</div>
                        ))}
                        {validationResult.warnings.length > 10 && (
                          <div className="text-yellow-400">... and {validationResult.warnings.length - 10} more warnings</div>
                        )}
                      </div>
                    </div>
                  )}

                  {validationResult.validRows > 0 && (
                    <div className="flex gap-3">
                      <button
                        onClick={handleImportBulkCandidates}
                        disabled={importing}
                        className="flex-1 px-4 py-2 rounded-lg bg-[#A88BFF] text-white text-sm font-medium hover:bg-[#B89CFF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {importing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Import {validationResult.validRows} Candidates
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setValidationResult(null);
                          setBulkUploadFile(null);
                        }}
                        className="px-4 py-2 rounded-lg bg-[#1E1E2A] border border-gray-700 text-gray-200 text-sm font-medium hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Import Results */}
              {importResult && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-white mb-1">Import Complete</h3>
                    <p className="text-xs text-gray-400">Review import results</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="text-xs text-green-400 mb-1">Imported</div>
                      <div className="text-lg font-semibold text-green-300">{importResult.success.length}</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="text-xs text-red-400 mb-1">Failed</div>
                      <div className="text-lg font-semibold text-red-300">{importResult.failed.length}</div>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <div className="text-xs text-yellow-400 mb-1">Duplicates</div>
                      <div className="text-lg font-semibold text-yellow-300">{importResult.duplicates.length}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowBulkUploadModal(false);
                      setBulkUploadFile(null);
                      setValidationResult(null);
                      setImportResult(null);
                    }}
                    className="w-full px-4 py-2 rounded-lg bg-[#A88BFF] text-white text-sm font-medium hover:bg-[#B89CFF] transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create JD Modal */}
      {jdSearch.showCreateJD && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#2A2A3A] border border-gray-800 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#A88BFF]" />
                  Create Job Description
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Upload JD file to enable AI-powered candidate matching
                </p>
              </div>
              <button
                onClick={() => setJdSearch(prev => ({ ...prev, showCreateJD: false }))}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Job Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={jdSearch.createJDData.jobTitle}
                  onChange={(e) => setJdSearch(prev => ({
                    ...prev,
                    createJDData: { ...prev.createJDData, jobTitle: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
                  placeholder="e.g. Senior Java Developer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={jdSearch.createJDData.companyName}
                  onChange={(e) => setJdSearch(prev => ({
                    ...prev,
                    createJDData: { ...prev.createJDData, companyName: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
                  placeholder="e.g. Tech Solutions Pvt Ltd"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">
                  JD File <span className="text-red-400">*</span>
                </label>
                <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-700 rounded-xl bg-[#1E1E2A] text-gray-400 cursor-pointer hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors text-center text-xs">
                  <FileText className="w-5 h-5" />
                  {jdSearch.createJDFile ? (
                    <>
                      <span className="text-gray-200 text-sm">{jdSearch.createJDFile.name}</span>
                      <span>Click to change file</span>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-200 text-sm">Click to upload JD file</span>
                      <span>PDF or DOCX (max 10MB)</span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.doc"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setJdSearch(prev => ({ ...prev, createJDFile: file }));
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                File will be parsed automatically for requirements
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setJdSearch(prev => ({ ...prev, showCreateJD: false }))}
                  className="px-4 py-2 rounded-lg border border-gray-700 text-xs text-gray-300 hover:border-gray-500 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateJD}
                  disabled={!jdSearch.createJDFile || !jdSearch.createJDData.jobTitle.trim()}
                  className="px-4 py-2 rounded-lg bg-[#A88BFF] text-xs text-white font-medium hover:bg-[#B89CFF] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" />
                  Create JD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move Candidate Modal */}
      {showMoveModal && moveCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && closeMoveModal()}>
          <div className="w-full max-w-lg bg-[#2A2A3A] border border-gray-800 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-[#A88BFF]" />
                  Move to {getMoveTargetLabel(moveTarget)}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Moving: <span className="text-white">{moveCandidate.name}</span>
                </p>
              </div>
              <button
                onClick={closeMoveModal}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="bg-[#1E1E2A] border border-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-[#A88BFF]" />
                  <span className="text-sm font-medium text-white">{moveCandidate.name}</span>
                </div>
                <p className="text-xs text-gray-400">{moveCandidate.email}</p>
                {moveCandidate.original?.appliedFor && (
                  <span className="text-xs text-gray-400">
                    for {moveCandidate.original.appliedFor.title}
                  </span>
                )}
              </div>

              {/* Job Posting Selection - for applicant and onboarding */}
              {needsJobPosting(moveTarget) && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">
                    Select Job Posting <span className="text-red-400">*</span>
                  </label>
                  {loadingJobPostings ? (
                    <div className="flex items-center justify-center py-3 bg-[#1E1E2A] border border-gray-700 rounded-lg">
                      <Loader2 className="w-4 h-4 animate-spin text-[#A88BFF] mr-2" />
                      <span className="text-xs text-gray-400">Loading job postings...</span>
                    </div>
                  ) : (
                    <>
                      <select
                        value={selectedJobPosting}
                        onChange={(e) => setSelectedJobPosting(e.target.value)}
                        className="w-full px-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#A88BFF]"
                        disabled={jobPostings.length === 0}
                      >
                        <option value="">-- Select a job posting --</option>
                        {jobPostings.map(jp => (
                          <option key={jp._id} value={jp._id}>
                            {jp.title} - {jp.department} ({jp.employmentType})
                          </option>
                        ))}
                      </select>
                      {jobPostings.length === 0 && !loadingJobPostings && (
                        <p className="text-xs text-yellow-400 mt-1">
                          ⚠️ No active job postings found. Please create a job posting first.
                        </p>
                      )}
                      {jobPostings.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {jobPostings.length} job posting{jobPostings.length !== 1 ? 's' : ''} available
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Interview Details - for interview target */}
              {moveTarget === 'interview' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Interview Type
                      </label>
                      <select
                        value={interviewDetails.type}
                        onChange={(e) => setInterviewDetails(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#A88BFF]"
                      >
                        <option value="Technical">Technical</option>
                        <option value="HR">HR</option>
                        <option value="Managerial">Managerial</option>
                        <option value="Cultural Fit">Cultural Fit</option>
                        <option value="Final Round">Final Round</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Platform
                      </label>
                      <select
                        value={interviewDetails.meetingPlatform}
                        onChange={(e) => setInterviewDetails(prev => ({ ...prev, meetingPlatform: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#A88BFF]"
                      >
                        <option value="Google Meet">Google Meet</option>
                        <option value="Microsoft Teams">Microsoft Teams</option>
                        <option value="Zoom">Zoom</option>
                        <option value="Phone">Phone</option>
                        <option value="In-Person">In-Person</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Date <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="date"
                        value={interviewDetails.scheduledDate}
                        onChange={(e) => setInterviewDetails(prev => ({ ...prev, scheduledDate: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#A88BFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Time <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="time"
                        value={interviewDetails.scheduledTime}
                        onChange={(e) => setInterviewDetails(prev => ({ ...prev, scheduledTime: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#A88BFF]"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Meeting Link
                    </label>
                    <input
                      type="url"
                      value={interviewDetails.meetingLink}
                      onChange={(e) => setInterviewDetails(prev => ({ ...prev, meetingLink: e.target.value }))}
                      placeholder="https://meet.google.com/..."
                      className="w-full px-3 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-800">
              <button
                onClick={closeMoveModal}
                className="px-4 py-2 rounded-lg bg-[#1E1E2A] border border-gray-700 text-sm text-gray-200 font-medium hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMoveCandidate}
                className="px-4 py-2 rounded-lg bg-[#A88BFF] text-sm text-white font-medium hover:bg-[#B89CFF] transition-colors flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Move Candidate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRCandidatePool;
