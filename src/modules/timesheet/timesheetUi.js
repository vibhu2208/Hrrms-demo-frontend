/** Shared layout + status tokens for Timesheet module (matches Leave theme). */
export { surface } from '../leave/leaveUi';

export const ATTENDANCE_STATUS = {
  present: { label: 'Present', badge: 'badge-success' },
  paid_leave: { label: 'Paid leave', badge: 'badge-info' },
  unpaid_leave: { label: 'Unpaid leave', badge: 'badge-warning' },
  half_day_leave: { label: 'Half day', badge: 'badge-info' },
  holiday: { label: 'Holiday', badge: 'badge-default' },
  week_off: { label: 'Week off', badge: 'badge-default' },
  training: { label: 'Training', badge: 'badge-info' },
  internal: { label: 'Internal', badge: 'badge-default' }
};

export const TIMESHEET_WEEK_STATUS = {
  draft: {
    label: 'Draft',
    badge: 'badge-default',
    message: 'Fill your week and submit when ready.'
  },
  submitted: {
    label: 'Submitted',
    badge: 'badge-warning',
    message: 'Awaiting manager approval.'
  },
  sent_back: {
    label: 'Sent back',
    badge: 'badge-danger',
    message: 'Update the highlighted days and submit again.'
  },
  partially_approved: {
    label: 'Partially approved',
    badge: 'badge-info',
    message: 'Some entries are approved; others may still be in review.'
  },
  fully_approved: {
    label: 'Fully approved',
    badge: 'badge-success',
    message: 'This week has been approved.'
  },
  locked: {
    label: 'Locked',
    badge: 'badge-default',
    message: 'This timesheet period is locked.'
  }
};

export function resolveWeekStatusKey(overallStatus, workSentBack) {
  const st = String(overallStatus || 'draft').toLowerCase();
  if (workSentBack && (st === 'partially_approved' || st === 'submitted')) {
    return 'sent_back';
  }
  return st;
}

export const TIMESHEET_STATUS = {
  draft: { label: 'Draft', badge: 'badge-default' },
  submitted: { label: 'Submitted', badge: 'badge-warning' },
  partially_approved: { label: 'Partially approved', badge: 'badge-info' },
  sent_back: { label: 'Sent back', badge: 'badge-danger' },
  fully_approved: { label: 'Fully approved', badge: 'badge-success' },
  approved: { label: 'Approved', badge: 'badge-success' },
  locked: { label: 'Locked', badge: 'badge-default' },
  rejected: { label: 'Rejected', badge: 'badge-danger' }
};

export const SLICE_STATUS = {
  draft: { label: 'Draft', badge: 'badge-default' },
  submitted: { label: 'Submitted', badge: 'badge-warning' },
  under_review: { label: 'Under review', badge: 'badge-info' },
  approved: { label: 'Approved', badge: 'badge-success' },
  sent_back: { label: 'Sent back', badge: 'badge-danger' },
  locked: { label: 'Locked', badge: 'badge-default' }
};

export function timesheetStatusMeta(status) {
  const key = String(status || 'submitted')
    .toLowerCase()
    .replace(/\s+/g, '_');
  return TIMESHEET_STATUS[key] || { label: status || 'Unknown', badge: 'badge-default' };
}

export function sliceStatusMeta(status) {
  const key = String(status || 'draft').toLowerCase();
  return SLICE_STATUS[key] || { label: status || 'Unknown', badge: 'badge-default' };
}

export function formatTimesheetWeek(periodStart, periodEnd) {
  const from = new Date(periodStart);
  const to = new Date(periodEnd);
  if (Number.isNaN(from.getTime())) return '—';
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  if (Number.isNaN(to.getTime()) || from.toDateString() === to.toDateString()) {
    return from.toLocaleDateString(undefined, opts);
  }
  return `${from.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${to.toLocaleDateString(undefined, opts)}`;
}

export function formatHours(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return '—';
  return `${v.toFixed(v % 1 === 0 ? 0 : 1)}h`;
}

export function entryDayKey(entryDate) {
  if (!entryDate) return '';
  if (typeof entryDate === 'string') {
    const m = entryDate.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = new Date(entryDate);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}
