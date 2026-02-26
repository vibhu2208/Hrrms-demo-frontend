/**
 * Employment Type Constants
 * Centralized definition of all employment types used across the frontend
 */

// Standard employment types used across all components
export const EMPLOYMENT_TYPES = [
  'full-time',
  'part-time', 
  'consultant',
  'intern',
  'contract-based',
  'deliverable-based',
  'rate-based',
  'hourly-based'
];

// Employment type options for dropdowns
export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full-time', label: 'Full Time' },
  { value: 'part-time', label: 'Part Time' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'intern', label: 'Intern' },
  { value: 'contract-based', label: 'Contract Based' },
  { value: 'deliverable-based', label: 'Deliverable Based' },
  { value: 'rate-based', label: 'Rate Based' },
  { value: 'hourly-based', label: 'Hourly Based' }
];

// Employment type styling for badges/chips
export const EMPLOYMENT_TYPE_STYLES = {
  'full-time': 'bg-blue-500/10 text-blue-300 border border-blue-500/30',
  'part-time': 'bg-green-500/10 text-green-300 border border-green-500/30',
  'consultant': 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30',
  'intern': 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30',
  'contract-based': 'bg-orange-500/10 text-orange-300 border border-orange-500/30',
  'deliverable-based': 'bg-purple-500/10 text-purple-300 border border-purple-500/30',
  'rate-based': 'bg-pink-500/10 text-pink-300 border border-pink-500/30',
  'hourly-based': 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
};

// Get employment type label
export const getEmploymentTypeLabel = (type) => {
  const option = EMPLOYMENT_TYPE_OPTIONS.find(opt => opt.value === type);
  return option ? option.label : type?.replace('-', ' ') || 'Unknown';
};

// Get employment type style
export const getEmploymentTypeStyle = (type) => {
  return EMPLOYMENT_TYPE_STYLES[type] || 'bg-gray-500/10 text-gray-300 border border-gray-500/30';
};

// Validate employment type
export const isValidEmploymentType = (type) => {
  return EMPLOYMENT_TYPES.includes(type);
};

// Employment type categories
export const EMPLOYMENT_TYPE_CATEGORIES = {
  permanent: ['full-time', 'part-time'],
  contract: ['contract-based', 'deliverable-based', 'rate-based', 'hourly-based'],
  temporary: ['consultant', 'intern']
};

// Get employment type category
export const getEmploymentTypeCategory = (type) => {
  for (const [category, types] of Object.entries(EMPLOYMENT_TYPE_CATEGORIES)) {
    if (types.includes(type)) {
      return category;
    }
  }
  return 'other';
};
