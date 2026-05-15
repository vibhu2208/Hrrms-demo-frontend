import api from './axios';

export const fetchLeaveTypes = async (params = {}) => (await api.get('/leave/types', { params })).data;
export const createLeaveType = async (payload) => (await api.post('/leave/types', payload)).data;
export const updateLeaveType = async (id, payload) => (await api.put(`/leave/types/${id}`, payload)).data;

export const fetchMyLeaveBalances = async () => (await api.get('/leave/allocations/me')).data;
export const fetchLeaveAllocationsSummary = async (params = {}) =>
  (await api.get('/leave/allocations/summary', { params })).data;
export const fetchLeaveAllocationsRecent = async (params = {}) =>
  (await api.get('/leave/allocations/recent', { params })).data;
export const bulkAllocateLeave = async (payload) => (await api.post('/leave/allocations/bulk', payload)).data;
export const overrideLeaveAllocation = async (id, payload) => (await api.patch(`/leave/allocations/${id}/override`, payload)).data;

export const applyLeaveRequest = async (payload) => (await api.post('/leave/requests', payload)).data;
export const fetchLeaveHistory = async () => (await api.get('/leave/requests/history')).data;
export const withdrawLeaveRequest = async (id) => (await api.patch(`/leave/requests/${id}/withdraw`)).data;
export const fetchManagerLeaveQueue = async (params = {}) =>
  (await api.get('/leave/requests/manager/queue', { params })).data;
export const fetchManagerTeamLeaveCalendar = async (params = {}) =>
  (await api.get('/leave/requests/manager/team-calendar', { params })).data;
export const actionLeaveRequest = async (id, payload) => (await api.patch(`/leave/requests/${id}/action`, payload)).data;
export const fetchEscalatedLeaves = async () => (await api.get('/leave/requests/admin/escalations')).data;
export const fetchAdminLeaveOverview = async (params = {}) =>
  (await api.get('/leave/requests/admin/overview', { params })).data;
export const adminOverrideLeave = async (id, payload) => (await api.patch(`/leave/requests/${id}/override`, payload)).data;

export const fetchHolidays = async (params = {}) => (await api.get('/leave/holidays', { params })).data;
export const createHoliday = async (payload) => (await api.post('/leave/holidays', payload)).data;
export const updateHoliday = async (id, payload) => (await api.patch(`/leave/holidays/${id}`, payload)).data;
export const deleteHoliday = async (id) => (await api.delete(`/leave/holidays/${id}`)).data;
