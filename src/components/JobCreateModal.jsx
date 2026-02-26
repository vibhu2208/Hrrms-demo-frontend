import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const JobCreateModal = ({ isOpen, onClose, onJobCreated, onJobUpdated, editingJob }) => {
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    employmentType: 'full-time',
    experience: { min: '', max: '' },
    salary: { min: '', max: '', currency: 'USD' },
    description: '',
    requirements: [''],
    responsibilities: [''],
    skills: [''],
    openings: 1,
    closingDate: '',
    status: 'draft',
    // Employment type specific fields
    contractDuration: '',
    hourlyRate: '',
    deliverables: [''],
    rateAmount: '',
    ratePeriod: 'monthly',
    workHours: ''
  });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      if (editingJob) {
        setFormData({
          title: editingJob.title || '',
          department: editingJob.department?._id || '',
          location: editingJob.location || '',
          employmentType: editingJob.employmentType || 'full-time',
          experience: editingJob.experience || { min: '', max: '' },
          salary: editingJob.salary || { min: '', max: '', currency: 'USD' },
          description: editingJob.description || '',
          requirements: editingJob.requirements?.length > 0 ? editingJob.requirements : [''],
          responsibilities: editingJob.responsibilities?.length > 0 ? editingJob.responsibilities : [''],
          skills: editingJob.skills?.length > 0 ? editingJob.skills : [''],
          openings: editingJob.openings || 1,
          closingDate: editingJob.closingDate ? editingJob.closingDate.split('T')[0] : '',
          status: editingJob.status || 'draft',
          // Employment type specific fields
          contractDuration: editingJob.contractDuration || '',
          hourlyRate: editingJob.hourlyRate || '',
          deliverables: editingJob.deliverables?.length > 0 ? editingJob.deliverables : [''],
          rateAmount: editingJob.rateAmount || '',
          ratePeriod: editingJob.ratePeriod || 'monthly',
          workHours: editingJob.workHours || ''
        });
      } else {
        setFormData({
          title: '',
          department: '',
          location: '',
          employmentType: 'full-time',
          experience: { min: '', max: '' },
          salary: { min: '', max: '', currency: 'USD' },
          description: '',
          requirements: [''],
          responsibilities: [''],
          skills: [''],
          openings: 1,
          closingDate: '',
          status: 'draft',
          // Employment type specific fields
          contractDuration: '',
          hourlyRate: '',
          deliverables: [''],
          rateAmount: '',
          ratePeriod: 'monthly',
          workHours: ''
        });
      }
    }
  }, [isOpen, editingJob]);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      toast.error(`Failed to load departments: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleArrayFieldChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayField = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayField = (field, index) => {
    if (formData[field].length > 1) {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = 'Job title is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        requirements: formData.requirements.filter(req => req.trim() !== ''),
        responsibilities: formData.responsibilities.filter(resp => resp.trim() !== ''),
        skills: formData.skills.filter(skill => skill.trim() !== ''),
        deliverables: formData.deliverables.filter(del => del.trim() !== ''),
        experience: {
          min: formData.experience.min ? Number(formData.experience.min) : undefined,
          max: formData.experience.max ? Number(formData.experience.max) : undefined
        },
        salary: {
          min: formData.salary.min ? Number(formData.salary.min) : undefined,
          max: formData.salary.max ? Number(formData.salary.max) : undefined,
          currency: formData.salary.currency
        },
        hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : undefined,
        rateAmount: formData.rateAmount ? Number(formData.rateAmount) : undefined,
        openings: Number(formData.openings),
        closingDate: formData.closingDate || undefined
      };

      let response;
      if (editingJob) {
        response = await api.put(`/jobs/${editingJob._id}`, submitData);
        toast.success('Job posting updated successfully');
        onJobUpdated(response.data.data);
      } else {
        response = await api.post('/jobs', submitData);
        toast.success('Job posting created successfully');
        onJobCreated(response.data.data);
      }
      onClose();

      setFormData({
        title: '',
        department: '',
        location: '',
        employmentType: 'full-time',
        experience: { min: '', max: '' },
        salary: { min: '', max: '', currency: 'USD' },
        description: '',
        requirements: [''],
        responsibilities: [''],
        skills: [''],
        openings: 1,
        closingDate: '',
        status: 'draft',
        // Employment type specific fields
        contractDuration: '',
        hourlyRate: '',
        deliverables: [''],
        rateAmount: '',
        ratePeriod: 'monthly',
        workHours: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${editingJob ? 'update' : 'create'} job posting`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-dark-800">
          <h2 className="text-2xl font-bold text-white">{editingJob ? 'Edit Job Posting' : 'Post New Job'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Job Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className={`input-field ${errors.title ? 'border-red-500' : ''}`}
                placeholder="e.g. Senior Software Developer"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Department *
              </label>
              <select
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                className={`input-field ${errors.department ? 'border-red-500' : ''}`}
              >
                <option value="">Select Department</option>
                {departments.length > 0 ? (
                  departments.filter(dept => dept.isActive !== false).map(dept => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No departments available - please create departments first
                  </option>
                )}
              </select>
              {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className={`input-field ${errors.location ? 'border-red-500' : ''}`}
                placeholder="e.g. New York, NY"
              />
              {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Employment Type
              </label>
              <select
                value={formData.employmentType}
                onChange={(e) => handleChange('employmentType', e.target.value)}
                className="input-field"
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
                Openings
              </label>
              <input
                type="number"
                min="1"
                value={formData.openings}
                onChange={(e) => handleChange('openings', e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Closing Date
              </label>
              <input
                type="date"
                value={formData.closingDate}
                onChange={(e) => handleChange('closingDate', e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="input-field"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
              <p className="text-gray-400 text-xs mt-1">
                Only "Active" jobs will be visible on the careers page
              </p>
            </div>
          </div>

          {/* Employment Type Specific Fields */}
          {(formData.employmentType === 'contract-based' || formData.employmentType === 'contract') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contract Duration *
                </label>
                <select
                  value={formData.contractDuration}
                  onChange={(e) => handleChange('contractDuration', e.target.value)}
                  className="input-field"
                >
                  <option value="">Select Duration</option>
                  <option value="3-months">3 Months</option>
                  <option value="6-months">6 Months</option>
                  <option value="12-months">12 Months</option>
                  <option value="24-months">24 Months</option>
                  <option value="project-based">Project Based</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Contract Amount (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.salary.min}
                  onChange={(e) => handleChange('salary', { ...formData.salary, min: e.target.value })}
                  className="input-field"
                  placeholder="e.g. 50000"
                />
              </div>
            </div>
          )}

          {formData.employmentType === 'hourly-based' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hourly Rate (USD) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => handleChange('hourlyRate', e.target.value)}
                  className="input-field"
                  placeholder="e.g. 25.50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expected Work Hours/Week
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formData.workHours}
                  onChange={(e) => handleChange('workHours', e.target.value)}
                  className="input-field"
                  placeholder="e.g. 40"
                />
              </div>
            </div>
          )}

          {formData.employmentType === 'deliverable-based' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Deliverables *
              </label>
              {formData.deliverables.map((deliverable, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={deliverable}
                    onChange={(e) => handleArrayFieldChange('deliverables', index, e.target.value)}
                    className="input-field flex-1"
                    placeholder="e.g. Complete UI design for mobile app"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayField('deliverables', index)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    disabled={formData.deliverables.length === 1}
                  >
                    <Minus size={20} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayField('deliverables')}
                className="flex items-center space-x-2 text-primary-500 hover:text-primary-400 transition-colors"
              >
                <Plus size={16} />
                <span>Add Deliverable</span>
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Total Project Amount (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.salary.min}
                    onChange={(e) => handleChange('salary', { ...formData.salary, min: e.target.value })}
                    className="input-field"
                    placeholder="e.g. 15000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Project Timeline
                  </label>
                  <select
                    value={formData.contractDuration}
                    onChange={(e) => handleChange('contractDuration', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select Timeline</option>
                    <option value="1-month">1 Month</option>
                    <option value="3-months">3 Months</option>
                    <option value="6-months">6 Months</option>
                    <option value="custom">Custom Timeline</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {formData.employmentType === 'rate-based' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rate Amount (USD) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rateAmount}
                  onChange={(e) => handleChange('rateAmount', e.target.value)}
                  className="input-field"
                  placeholder="e.g. 1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rate Period *
                </label>
                <select
                  value={formData.ratePeriod}
                  onChange={(e) => handleChange('ratePeriod', e.target.value)}
                  className="input-field"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="per-project">Per Project</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Min Experience (years)
              </label>
              <input
                type="number"
                min="0"
                value={formData.experience.min}
                onChange={(e) => handleChange('experience', { ...formData.experience, min: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Experience (years)
              </label>
              <input
                type="number"
                min="0"
                value={formData.experience.max}
                onChange={(e) => handleChange('experience', { ...formData.experience, max: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Min Salary
              </label>
              <input
                type="number"
                min="0"
                value={formData.salary.min}
                onChange={(e) => handleChange('salary', { ...formData.salary, min: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Salary
              </label>
              <input
                type="number"
                min="0"
                value={formData.salary.max}
                onChange={(e) => handleChange('salary', { ...formData.salary, max: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Currency
              </label>
              <select
                value={formData.salary.currency}
                onChange={(e) => handleChange('salary', { ...formData.salary, currency: e.target.value })}
                className="input-field"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Job Description *
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className={`input-field ${errors.description ? 'border-red-500' : ''}`}
              placeholder="Describe the role, team, and what the candidate will be doing..."
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Requirements
            </label>
            {formData.requirements.map((req, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={req}
                  onChange={(e) => handleArrayFieldChange('requirements', index, e.target.value)}
                  className="input-field flex-1"
                  placeholder="e.g. Bachelor's degree in Computer Science"
                />
                <button
                  type="button"
                  onClick={() => removeArrayField('requirements', index)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  disabled={formData.requirements.length === 1}
                >
                  <Minus size={20} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayField('requirements')}
              className="flex items-center space-x-2 text-primary-500 hover:text-primary-400 transition-colors"
            >
              <Plus size={16} />
              <span>Add Requirement</span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Responsibilities
            </label>
            {formData.responsibilities.map((resp, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={resp}
                  onChange={(e) => handleArrayFieldChange('responsibilities', index, e.target.value)}
                  className="input-field flex-1"
                  placeholder="e.g. Develop and maintain web applications"
                />
                <button
                  type="button"
                  onClick={() => removeArrayField('responsibilities', index)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  disabled={formData.responsibilities.length === 1}
                >
                  <Minus size={20} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayField('responsibilities')}
              className="flex items-center space-x-2 text-primary-500 hover:text-primary-400 transition-colors"
            >
              <Plus size={16} />
              <span>Add Responsibility</span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Skills
            </label>
            {formData.skills.map((skill, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={skill}
                  onChange={(e) => handleArrayFieldChange('skills', index, e.target.value)}
                  className="input-field flex-1"
                  placeholder="e.g. React, Node.js, MongoDB"
                />
                <button
                  type="button"
                  onClick={() => removeArrayField('skills', index)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  disabled={formData.skills.length === 1}
                >
                  <Minus size={20} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayField('skills')}
              className="flex items-center space-x-2 text-primary-500 hover:text-primary-400 transition-colors"
            >
              <Plus size={16} />
              <span>Add Skill</span>
            </button>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-dark-800">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Creating...' : 'Create Job Posting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobCreateModal;
