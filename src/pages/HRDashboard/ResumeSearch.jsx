import React, { useState, useEffect } from 'react';
import { Search, Filter, Users, Briefcase, MapPin, Star, Clock, ChevronDown, X, Plus, Loader2 } from 'lucide-react';
import api from '../../api/axios';

const ResumeSearch = () => {
  const [searchCriteria, setSearchCriteria] = useState({
    // Job Basic Info
    jobTitle: '',
    companyName: '',
    location: '',
    employmentType: 'full-time',

    // Experience Requirements
    experienceMin: 0,
    experienceMax: 5,

    // Skills Requirements
    requiredSkills: [],
    preferredSkills: [],

    // Salary Range
    salaryMin: '',
    salaryMax: '',
    salaryCurrency: 'INR',

    // Location Preferences
    jobLocation: '',
    preferredLocations: [],
    remoteWork: 'on-site',

    // Education Requirements
    educationRequirements: [],

    // Search Settings
    maxResults: 20,
    minScore: 0
  });
  
  const [skillInput, setSkillInput] = useState('');
  const [preferredSkillInput, setPreferredSkillInput] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Common skills for auto-complete
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Angular', 'Vue.js',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'MongoDB', 'PostgreSQL',
    'MySQL', 'Redis', 'REST APIs', 'GraphQL', 'Microservices', 'Git',
    'Agile', 'Scrum', 'Machine Learning', 'Deep Learning', 'TensorFlow',
    'TypeScript', 'HTML', 'CSS', 'DevOps', 'CI/CD', 'Terraform', 'Ansible'
  ];

  const addSkill = (skill, type) => {
    if (!skill.trim()) return;
    
    const skillArray = type === 'required' ? 'requiredSkills' : 'preferredSkills';
    const currentSkills = searchCriteria[skillArray];
    
    if (!currentSkills.includes(skill.trim())) {
      setSearchCriteria(prev => ({
        ...prev,
        [skillArray]: [...currentSkills, skill.trim()]
      }));
    }
    
    if (type === 'required') {
      setSkillInput('');
    } else {
      setPreferredSkillInput('');
    }
  };

  const removeSkill = (skill, type) => {
    const skillArray = type === 'required' ? 'requiredSkills' : 'preferredSkills';
    setSearchCriteria(prev => ({
      ...prev,
      [skillArray]: prev[skillArray].filter(s => s !== skill)
    }));
  };

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    setResults([]);

    try {
      // Validate required fields
      if (searchCriteria.requiredSkills.length === 0) {
        setError('Please add at least one required skill');
        setLoading(false);
        return;
      }

      if (!searchCriteria.jobTitle.trim()) {
        setError('Please enter a job title');
        setLoading(false);
        return;
      }

      // Build JD-like payload for the backend matching service
      const jdPayload = {
        jobTitle: searchCriteria.jobTitle.trim(),
        companyName: searchCriteria.companyName.trim() || 'Company',
        location: searchCriteria.location.trim() || 'Remote',
        employmentType: searchCriteria.employmentType,
        parsedData: {
          experienceRequired: {
            minYears: searchCriteria.experienceMin,
            maxYears: searchCriteria.experienceMax
          },
          requiredSkillsSimple: searchCriteria.requiredSkills,
          preferredSkillsSimple: searchCriteria.preferredSkills,
          jobLocation: searchCriteria.jobLocation,
          preferredLocations: searchCriteria.preferredLocations,
          remoteWork: searchCriteria.remoteWork,
          salaryRange: {
            min: searchCriteria.salaryMin ? Number(searchCriteria.salaryMin) : null,
            max: searchCriteria.salaryMax ? Number(searchCriteria.salaryMax) : null,
            currency: searchCriteria.salaryCurrency
          },
          educationRequirementsSimple: searchCriteria.educationRequirements
        }
      };

      // Call the JD-based candidate search API
      const response = await api.get('/candidates/search-by-jd', {
        params: {
          jdData: JSON.stringify(jdPayload),
          minScore: searchCriteria.minScore,
          maxResults: searchCriteria.maxResults
        }
      });

      if (response.data.success) {
        console.log('Search response:', response.data.data);
        
        // Transform the response to match the expected format
        const transformedResults = response.data.data.matches.map(match => {
          const candidate = match.candidate || {};
          const experience = candidate.experience || {};
          
          // Calculate experience display
          let experienceDisplay = 'Experience not specified';
          if (experience.years !== undefined || experience.months !== undefined) {
            const years = experience.years || 0;
            const months = experience.months || 0;
            experienceDisplay = years > 0 
              ? `${years} year${years !== 1 ? 's' : ''}${months > 0 ? ` ${months} month${months !== 1 ? 's' : ''}` : ''}`
              : `${months} month${months !== 1 ? 's' : ''}`;
          }

          // Generate better summary from match data
          const summaryParts = [];
          if (match.overallFit) {
            summaryParts.push(`Overall: ${match.overallFit}`);
          }
          if (match.matchedSkillsCount > 0) {
            summaryParts.push(`Matched ${match.matchedSkillsCount} skills`);
          }
          if (match.experienceMatch?.matchType) {
            summaryParts.push(`Experience: ${match.experienceMatch.matchType.replace(/-/g, ' ')}`);
          }
          if (match.locationMatch?.matchType) {
            summaryParts.push(`Location: ${match.locationMatch.matchType.replace(/-/g, ' ')}`);
          }
          
          return {
            candidateId: match.candidateId,
            name: candidate.name || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Unknown Candidate',
            email: candidate.email || 'N/A',
            phone: candidate.phone || 'N/A',
            score: Math.round(match.overallScore || 0),
            experience: experienceDisplay,
            currentCompany: candidate.currentCompany || 'Not specified',
            currentDesignation: candidate.currentDesignation || 'Not specified',
            location: candidate.currentLocation || candidate.preferredLocation || 'Not specified',
            matchedSkills: match.matchedSkills || [],
            allSkills: candidate.skills || [],
            summary: summaryParts.length > 0 ? summaryParts.join(' • ') : match.relevanceExplanation || 'No detailed match information available',
            stage: candidate.stage || 'unknown',
            status: candidate.status || 'unknown'
          };
        });

        console.log('Transformed results:', transformedResults);
        setResults(transformedResults);
      } else {
        setError(response.data.message || 'Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.message || 'Failed to search candidates');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-500/20 border-green-500';
    if (score >= 60) return 'bg-yellow-500/20 border-yellow-500';
    if (score >= 40) return 'bg-orange-500/20 border-orange-500';
    return 'bg-red-500/20 border-red-500';
  };

  return (
    <div className="min-h-screen bg-[#1E1E2A] p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">JD-Based Candidate Matching</h1>
        <p className="text-gray-400">Create job descriptions and find perfectly matched candidates from your talent pool</p>
      </div>

      {/* Search Form */}
      <div className="bg-[#2A2A3A] rounded-2xl border border-gray-800 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Job Description Requirements</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-[#A88BFF] hover:text-[#B89CFF] transition-colors"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide Advanced' : 'Show Advanced'}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Basic Job Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Job Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={searchCriteria.jobTitle}
              onChange={(e) => setSearchCriteria(prev => ({
                ...prev,
                jobTitle: e.target.value
              }))}
              placeholder="e.g., Senior Java Developer"
              className="w-full px-4 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={searchCriteria.companyName}
              onChange={(e) => setSearchCriteria(prev => ({
                ...prev,
                companyName: e.target.value
              }))}
              placeholder="e.g., TechCorp Solutions"
              className="w-full px-4 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
            />
          </div>
        </div>

        {/* Job Location */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Job Location
          </label>
          <input
            type="text"
            value={searchCriteria.jobLocation}
            onChange={(e) => setSearchCriteria(prev => ({
              ...prev,
              jobLocation: e.target.value
            }))}
            placeholder="e.g., Noida, Mumbai, Bangalore"
            className="w-full px-4 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
          />
        </div>

        {/* Experience Requirements */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Experience Required <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Minimum Years</label>
              <input
                type="number"
                min="0"
                max="20"
                value={searchCriteria.experienceMin}
                onChange={(e) => setSearchCriteria(prev => ({
                  ...prev,
                  experienceMin: parseInt(e.target.value) || 0
                }))}
                className="w-full px-4 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Maximum Years</label>
              <input
                type="number"
                min="0"
                max="30"
                value={searchCriteria.experienceMax}
                onChange={(e) => setSearchCriteria(prev => ({
                  ...prev,
                  experienceMax: parseInt(e.target.value) || 10
                }))}
                className="w-full px-4 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Current: {searchCriteria.experienceMin} - {searchCriteria.experienceMax} years experience required
          </p>
        </div>

        {/* Required Skills */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Required Skills <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSkill(skillInput, 'required')}
              placeholder="Add required skill (e.g., Java, Spring, React)"
              className="flex-1 px-4 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
            />
            <button
              onClick={() => addSkill(skillInput, 'required')}
              className="px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Skill Pills */}
          <div className="flex flex-wrap gap-2">
            {searchCriteria.requiredSkills.map(skill => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-3 py-1 bg-[#A88BFF]/20 text-[#A88BFF] rounded-full text-sm"
              >
                {skill}
                <button
                  onClick={() => removeSkill(skill, 'required')}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Common Skills Suggestions */}
          {searchCriteria.requiredSkills.length === 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Common technical skills:</p>
              <div className="flex flex-wrap gap-2">
                {commonSkills.slice(0, 12).map(skill => (
                  <button
                    key={skill}
                    onClick={() => addSkill(skill, 'required')}
                    className="px-2 py-1 text-xs bg-[#1E1E2A] border border-gray-700 rounded text-gray-400 hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors"
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preferred Skills */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Preferred Skills (Optional)
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={preferredSkillInput}
              onChange={(e) => setPreferredSkillInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSkill(preferredSkillInput, 'preferred')}
              placeholder="Add preferred skill (e.g., Docker, AWS, Angular)"
              className="flex-1 px-4 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
            />
            <button
              onClick={() => addSkill(preferredSkillInput, 'preferred')}
              className="px-4 py-2 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {searchCriteria.preferredSkills.map(skill => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm"
              >
                {skill}
                <button
                  onClick={() => removeSkill(skill, 'preferred')}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Salary Range */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Salary Range (Annual)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Minimum (₹)</label>
              <input
                type="number"
                min="0"
                value={searchCriteria.salaryMin}
                onChange={(e) => setSearchCriteria(prev => ({
                  ...prev,
                  salaryMin: e.target.value
                }))}
                placeholder="e.g., 500000"
                className="w-full px-4 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Maximum (₹)</label>
              <input
                type="number"
                min="0"
                value={searchCriteria.salaryMax}
                onChange={(e) => setSearchCriteria(prev => ({
                  ...prev,
                  salaryMax: e.target.value
                }))}
                placeholder="e.g., 1500000"
                className="w-full px-4 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Currency</label>
              <select
                value={searchCriteria.salaryCurrency}
                onChange={(e) => setSearchCriteria(prev => ({
                  ...prev,
                  salaryCurrency: e.target.value
                }))}
                className="w-full px-4 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#A88BFF]"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
          {searchCriteria.salaryMin && searchCriteria.salaryMax && (
            <p className="text-xs text-gray-500 mt-2">
              Salary Range: ₹{Number(searchCriteria.salaryMin).toLocaleString()} - ₹{Number(searchCriteria.salaryMax).toLocaleString()} per annum
            </p>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="space-y-6 mb-6">
            {/* Employment Type and Remote Work */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Employment Type
                </label>
                <select
                  value={searchCriteria.employmentType}
                  onChange={(e) => setSearchCriteria(prev => ({
                    ...prev,
                    employmentType: e.target.value
                  }))}
                  className="w-full px-4 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#A88BFF]"
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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Work Type
                </label>
                <select
                  value={searchCriteria.remoteWork}
                  onChange={(e) => setSearchCriteria(prev => ({
                    ...prev,
                    remoteWork: e.target.value
                  }))}
                  className="w-full px-4 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#A88BFF]"
                >
                  <option value="on-site">On-site</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
            </div>

            {/* Education Requirements */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Education Requirements (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {['Bachelor of Technology', 'Bachelor of Engineering', 'Master of Computer Applications', 'Bachelor of Science', 'Master of Technology'].map(edu => (
                  <label key={edu} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={searchCriteria.educationRequirements.includes(edu)}
                      onChange={(e) => {
                        const current = searchCriteria.educationRequirements;
                        const updated = e.target.checked
                          ? [...current, edu]
                          : current.filter(item => item !== edu);
                        setSearchCriteria(prev => ({
                          ...prev,
                          educationRequirements: updated
                        }));
                      }}
                      className="w-4 h-4 text-[#A88BFF] bg-[#1E1E2A] border-gray-700 rounded focus:ring-[#A88BFF]"
                    />
                    {edu}
                  </label>
                ))}
              </div>
            </div>

            {/* Search Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Match Score (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={searchCriteria.minScore}
                  onChange={(e) => setSearchCriteria(prev => ({
                    ...prev,
                    minScore: parseInt(e.target.value) || 0
                  }))}
                  className="w-full px-4 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#A88BFF]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Results
                </label>
                <select
                  value={searchCriteria.maxResults}
                  onChange={(e) => setSearchCriteria(prev => ({
                    ...prev,
                    maxResults: parseInt(e.target.value)
                  }))}
                  className="w-full px-4 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#A88BFF]"
                >
                  <option value={10}>10 Results</option>
                  <option value={20}>20 Results</option>
                  <option value={50}>50 Results</option>
                  <option value={100}>100 Results</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Results Sorting
                </label>
                <select
                  value="score"
                  className="w-full px-4 py-2 bg-[#1E1E2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#A88BFF]"
                >
                  <option value="score">By Match Score (Best First)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={loading || searchCriteria.requiredSkills.length === 0 || !searchCriteria.jobTitle.trim()}
          className="w-full py-4 bg-gradient-to-r from-[#A88BFF] to-[#8B5CF6] text-white rounded-xl hover:from-[#B89CFF] hover:to-[#9D6EFF] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-lg shadow-lg hover:shadow-[#A88BFF]/50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Finding Best Candidates...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Find & Match Candidates
            </>
          )}
        </button>
        
        {/* Search Tips */}
        {!loading && results.length === 0 && (
          <div className="mt-4 bg-[#1E1E2A] rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-2">💡 <span className="font-semibold text-gray-300">Pro Tips:</span></p>
            <ul className="text-xs text-gray-500 space-y-1 ml-4">
              <li>• Add multiple required skills for better matching accuracy</li>
              <li>• Use preferred skills to find candidates with bonus qualifications</li>
              <li>• Adjust minimum match score to see more or fewer results</li>
              <li>• Be specific with job titles for precise candidate targeting</li>
            </ul>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-xl p-5 mb-6 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <h3 className="text-red-400 font-semibold mb-1">Search Error</h3>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError('')}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-[#2A2A3A] rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 bg-[#1E1E2A] rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-[#1E1E2A] rounded w-32 animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1E1E2A] rounded-xl border border-gray-700 p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-[#252530] rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-[#252530] rounded w-3/4 animate-pulse"></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-8 bg-[#252530] rounded animate-pulse"></div>
                      <div className="h-8 bg-[#252530] rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-[#252530] rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-[#252530] rounded w-5/6 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {!loading && !error && results.length === 0 && searchCriteria.requiredSkills.length > 0 && (
        <div className="bg-[#2A2A3A] rounded-2xl border border-gray-800 p-8 text-center">
          <div className="w-20 h-20 bg-[#A88BFF]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-[#A88BFF]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No candidates found</h3>
          <p className="text-gray-400 mb-4">
            Try adjusting your search criteria or reducing the minimum match score
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setSearchCriteria(prev => ({ ...prev, minScore: 0 }))}
              className="px-4 py-2 bg-[#A88BFF]/20 text-[#A88BFF] rounded-lg hover:bg-[#A88BFF]/30 transition-colors text-sm"
            >
              Reset Min Score
            </button>
            <button
              onClick={() => setSearchCriteria({
                jobTitle: '',
                companyName: '',
                location: '',
                employmentType: 'full-time',
                experienceMin: 0,
                experienceMax: 5,
                requiredSkills: [],
                preferredSkills: [],
                salaryMin: '',
                salaryMax: '',
                salaryCurrency: 'INR',
                jobLocation: '',
                preferredLocations: [],
                remoteWork: 'on-site',
                educationRequirements: [],
                maxResults: 20,
                minScore: 0
              })}
              className="px-4 py-2 bg-[#1E1E2A] border border-gray-700 text-gray-300 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors text-sm"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-[#2A2A3A] rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Matched Candidates</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">{results.length} candidates found</span>
              <button 
                onClick={() => setResults([])}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear Results
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {results.map((candidate, index) => (
              <div
                key={candidate.candidateId || index}
                className="bg-[#1E1E2A] rounded-xl border border-gray-700 p-6 hover:border-[#A88BFF]/50 transition-all duration-200 hover:shadow-lg hover:shadow-[#A88BFF]/10"
              >
                {/* Candidate Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#A88BFF] to-[#8B5CF6] flex items-center justify-center text-white font-semibold">
                          {candidate.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{candidate.name}</h3>
                          <p className="text-xs text-gray-500">ID: {candidate.candidateId?.toString().slice(-8)}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full border ${getScoreBgColor(candidate.score)}`}>
                        <span className={`text-sm font-bold ${getScoreColor(candidate.score)}`}>
                          {candidate.score}% Match
                        </span>
                      </div>
                    </div>
                    
                    {/* Contact Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-300 bg-[#252530] px-3 py-2 rounded-lg">
                        <span className="text-gray-500">📧</span>
                        <span className="truncate">{candidate.email}</span>
                      </div>
                      {candidate.phone !== 'N/A' && (
                        <div className="flex items-center gap-2 text-sm text-gray-300 bg-[#252530] px-3 py-2 rounded-lg">
                          <span className="text-gray-500">📱</span>
                          <span>{candidate.phone}</span>
                        </div>
                      )}
                      {candidate.location !== 'Not specified' && (
                        <div className="flex items-center gap-2 text-sm text-gray-300 bg-[#252530] px-3 py-2 rounded-lg">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span>{candidate.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-300 bg-[#252530] px-3 py-2 rounded-lg">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{candidate.experience}</span>
                      </div>
                    </div>

                    {/* Work Info */}
                    {(candidate.currentCompany !== 'Not specified' || candidate.currentDesignation !== 'Not specified') && (
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-3">
                        {candidate.currentDesignation !== 'Not specified' && (
                          <div className="flex items-center gap-2 bg-[#252530] px-3 py-1.5 rounded-lg">
                            <Briefcase className="w-3.5 h-3.5 text-[#A88BFF]" />
                            <span className="text-gray-300 font-medium">{candidate.currentDesignation}</span>
                          </div>
                        )}
                        {candidate.currentCompany !== 'Not specified' && (
                          <div className="flex items-center gap-2 bg-[#252530] px-3 py-1.5 rounded-lg">
                            <Users className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-gray-300">{candidate.currentCompany}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Matched Skills */}
                {candidate.matchedSkills && candidate.matchedSkills.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-[#A88BFF]" />
                      <p className="text-sm font-semibold text-gray-300">Matched Skills ({candidate.matchedSkills.length})</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {candidate.matchedSkills.map((skill, skillIndex) => (
                        <span
                          key={skillIndex}
                          className="px-3 py-1.5 bg-[#A88BFF]/20 text-[#A88BFF] rounded-lg text-sm font-medium border border-[#A88BFF]/30"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {candidate.summary && (
                  <div className="mb-4 bg-[#252530] rounded-lg p-4">
                    <p className="text-sm font-medium text-[#A88BFF] mb-2">Match Analysis</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{candidate.summary}</p>
                  </div>
                )}

                {/* Status Badges */}
                <div className="flex items-center gap-2 mb-4">
                  {candidate.status && candidate.status !== 'unknown' && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      candidate.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      candidate.status === 'applied' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                    </span>
                  )}
                  {candidate.stage && candidate.stage !== 'unknown' && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                      Stage: {candidate.stage.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setSelectedCandidate(candidate)}
                    className="px-5 py-2.5 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    View Full Profile
                  </button>
                  <button className="px-5 py-2.5 bg-[#1E1E2A] border border-gray-700 text-gray-300 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors text-sm font-medium">
                    Contact Candidate
                  </button>
                  <button className="px-5 py-2.5 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm font-medium">
                    Shortlist
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fadeIn">
          <div className="bg-[#2A2A3A] rounded-2xl border border-gray-800 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#2A2A3A] border-b border-gray-800 p-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#A88BFF] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-lg">
                  {selectedCandidate.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedCandidate.name}</h3>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border mt-1 ${getScoreBgColor(selectedCandidate.score)}`}>
                    <Star className="w-3 h-3" />
                    <span className={`text-sm font-bold ${getScoreColor(selectedCandidate.score)}`}>
                      {selectedCandidate.score}% Match
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="text-gray-400 hover:text-white hover:bg-[#1E1E2A] p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Information */}
              <div className="bg-[#1E1E2A] rounded-xl p-5 border border-gray-700">
                <h5 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#A88BFF]" />
                  Contact Information
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Email</span>
                    <p className="text-white mt-1 flex items-center gap-2">
                      <span className="text-lg">📧</span>
                      {selectedCandidate.email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Phone</span>
                    <p className="text-white mt-1 flex items-center gap-2">
                      <span className="text-lg">📱</span>
                      {selectedCandidate.phone || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Location</span>
                    <p className="text-white mt-1 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#A88BFF]" />
                      {selectedCandidate.location || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Experience</span>
                    <p className="text-white mt-1 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#A88BFF]" />
                      {selectedCandidate.experience || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Employment */}
              {(selectedCandidate.currentCompany !== 'Not specified' || selectedCandidate.currentDesignation !== 'Not specified') && (
                <div className="bg-[#1E1E2A] rounded-xl p-5 border border-gray-700">
                  <h5 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-green-400" />
                    Current Employment
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCandidate.currentDesignation !== 'Not specified' && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Position</span>
                        <p className="text-white mt-1 font-medium">{selectedCandidate.currentDesignation}</p>
                      </div>
                    )}
                    {selectedCandidate.currentCompany !== 'Not specified' && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Company</span>
                        <p className="text-white mt-1 font-medium">{selectedCandidate.currentCompany}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Matched Skills */}
              {selectedCandidate.matchedSkills && selectedCandidate.matchedSkills.length > 0 && (
                <div className="bg-[#1E1E2A] rounded-xl p-5 border border-gray-700">
                  <h5 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-[#A88BFF]" />
                    Matched Skills ({selectedCandidate.matchedSkills.length})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.matchedSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-2 bg-[#A88BFF]/20 text-[#A88BFF] rounded-lg text-sm font-medium border border-[#A88BFF]/40"
                      >
                        ✓ {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* All Skills */}
              {selectedCandidate.allSkills && selectedCandidate.allSkills.length > 0 && (
                <div className="bg-[#1E1E2A] rounded-xl p-5 border border-gray-700">
                  <h5 className="text-white font-semibold mb-4">All Skills ({selectedCandidate.allSkills.length})</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.allSkills.map((skill, index) => (
                      <span
                        key={index}
                        className={`px-3 py-1.5 rounded-lg text-sm ${
                          selectedCandidate.matchedSkills?.includes(skill)
                            ? 'bg-[#A88BFF]/20 text-[#A88BFF] border border-[#A88BFF]/30'
                            : 'bg-[#252530] text-gray-300 border border-gray-700'
                        }`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Match Analysis */}
              {selectedCandidate.summary && (
                <div className="bg-gradient-to-br from-[#A88BFF]/10 to-transparent rounded-xl p-5 border border-[#A88BFF]/30">
                  <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    AI Match Analysis
                  </h5>
                  <p className="text-gray-300 leading-relaxed">{selectedCandidate.summary}</p>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-3">
                {selectedCandidate.status && selectedCandidate.status !== 'unknown' && (
                  <div className="flex-1 bg-[#1E1E2A] rounded-lg p-3 border border-gray-700">
                    <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Status</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                      selectedCandidate.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      selectedCandidate.status === 'applied' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        selectedCandidate.status === 'active' ? 'bg-green-400' :
                        selectedCandidate.status === 'applied' ? 'bg-blue-400' :
                        'bg-gray-400'
                      }`}></div>
                      {selectedCandidate.status.charAt(0).toUpperCase() + selectedCandidate.status.slice(1)}
                    </span>
                  </div>
                )}
                {selectedCandidate.stage && selectedCandidate.stage !== 'unknown' && (
                  <div className="flex-1 bg-[#1E1E2A] rounded-lg p-3 border border-gray-700">
                    <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Stage</span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium bg-purple-500/20 text-purple-400">
                      {selectedCandidate.stage.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-700">
                <button className="flex-1 min-w-[150px] px-5 py-3 bg-[#A88BFF] text-white rounded-lg hover:bg-[#B89CFF] transition-colors font-medium flex items-center justify-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Schedule Interview
                </button>
                <button className="flex-1 min-w-[150px] px-5 py-3 bg-[#1E1E2A] border border-gray-700 text-gray-300 rounded-lg hover:border-[#A88BFF] hover:text-[#A88BFF] transition-colors font-medium">
                  Send Message
                </button>
                <button className="flex-1 min-w-[150px] px-5 py-3 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors font-medium flex items-center justify-center gap-2">
                  <Star className="w-4 h-4" />
                  Shortlist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeSearch;
