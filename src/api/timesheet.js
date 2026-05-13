import api from './axios';

export const fetchWeekTimesheet = async (params) => (await api.get('/timesheet/week', { params })).data;
export const upsertTimesheetEntries = async (payload) => (await api.post('/timesheet/entries', payload)).data;
export const submitTimesheet = async (timesheetId) => (await api.patch(`/timesheet/${timesheetId}/submit`)).data;

export const fetchManagerTimesheetQueue = async () => (await api.get('/timesheet/manager/queue')).data;
export const fetchTimesheetDetail = async (timesheetId) => (await api.get(`/timesheet/${timesheetId}/detail`)).data;
export const approveWholeWeek = async (timesheetId) => (await api.patch(`/timesheet/${timesheetId}/approve-week`)).data;
export const sendBackParticularDay = async (timesheetId, payload) =>
  (await api.patch(`/timesheet/${timesheetId}/send-back-day`, payload)).data;
export const actionTimesheetSlice = async (timesheetId, payload) =>
  (await api.patch(`/timesheet/slices/${timesheetId}/action`, payload)).data;
export const lockTimesheet = async (timesheetId) => (await api.patch(`/timesheet/${timesheetId}/lock`)).data;
export const unlockTimesheet = async (timesheetId, payload) =>
  (await api.patch(`/timesheet/${timesheetId}/unlock`, payload)).data;

export const previewBulkUpload = async (csv) => (await api.post('/timesheet/upload/preview', { csv })).data;
export const commitBulkUpload = async (payload) => (await api.post('/timesheet/upload/commit', payload)).data;
