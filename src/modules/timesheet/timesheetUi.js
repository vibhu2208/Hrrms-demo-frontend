/** Shared layout + status tokens for Timesheet module (matches Leave theme). */
export { surface } from '../leave/leaveUi';

/** Premium dark timesheet UI tokens */
export const ts = {
  page: 'min-h-[calc(100vh-4rem)] pb-28',
  elevated:
    'rounded-xl border border-white/[0.06] bg-[#161F33]/90 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-sm',
  elevatedSoft: 'rounded-xl border border-white/[0.04] bg-[#131B2E]/70',
  stickyHeader:
    'sticky top-0 z-30 -mx-1 px-1 py-3 mb-4 rounded-xl border border-white/[0.06] bg-[#0f172a]/85 backdrop-blur-xl shadow-lg',
  stickyDays:
    'sticky top-[72px] z-20 rounded-xl border border-white/[0.05] bg-[#141B2E]/95 backdrop-blur-md px-3 py-2',
  hourInput:
    'w-full h-9 rounded-md text-center text-sm font-semibold tabular-nums bg-[#0B1220] border border-white/[0.08] text-slate-100 placeholder:text-slate-600 transition-all duration-150 hover:border-white/15 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/35 focus:border-[var(--color-primary)]/50 disabled:opacity-35 disabled:cursor-not-allowed',
  hourInputWarn:
    'ring-1 ring-amber-400/35 border-amber-400/40 bg-amber-500/[0.06]',
  select:
    'w-full rounded-md text-sm bg-[#0B1220] border border-white/[0.08] text-slate-100 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/35 disabled:opacity-40',
  label: 'text-[10px] font-semibold uppercase tracking-wider text-slate-500',
  title: 'text-xl sm:text-2xl font-bold text-slate-50 tracking-tight',
  subtitle: 'text-sm text-slate-400 mt-0.5',
  statChip:
    'inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#141B2E]/80 px-3 py-2 text-xs',
  bottomBar:
    'fixed bottom-0 left-0 lg:left-64 right-0 z-40 border-t border-white/[0.08] bg-[#0f172a]/92 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.4)]',
  footerInner: 'max-w-[1600px] mx-auto px-5 py-3 flex items-center justify-between gap-6',
  gridCols:
    'grid grid-cols-[minmax(200px,228px)_repeat(7,minmax(76px,1fr))_72px] gap-x-2',
  btnPrimary:
    'btn-primary !py-2.5 !px-6 !text-sm !font-semibold !rounded-lg shadow-lg shadow-blue-500/15 disabled:opacity-50',
  btnDraft:
    'rounded-lg border border-white/12 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.06] hover:text-slate-100 transition-colors disabled:opacity-40',
  btnSecondary:
    'rounded-lg border border-white/10 bg-[#1A2438] px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-[#222F48] transition-colors',
  btnGhost:
    'rounded-lg px-2.5 py-2 text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] transition-colors disabled:opacity-40',
  btnIcon:
    'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-[#141B2E] text-slate-300 hover:bg-[#1C2740] hover:text-white transition-colors'
};

export const ATTENDANCE_STATUS = {
  present: { label: 'Present', badge: 'badge-success' },
  paid_leave: { label: 'Paid leave', badge: 'badge-info' },
  unpaid_leave: { label: 'Unpaid leave', badge: 'badge-warning' },
  half_day_leave: { label: 'Half day', badge: 'badge-info' },
  holiday: { label: 'Holiday', badge: 'badge-danger' },
  week_off: { label: 'Week off', badge: 'badge-default' },
  training: { label: 'Training', badge: 'badge-info' },
  internal: { label: 'Internal', badge: 'badge-default' }
};

/** Compact attendance pill styling (status color coding) */
export const ATTENDANCE_PILL = {
  present: {
    label: 'Present',
    dot: 'bg-emerald-400',
    shell: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
  },
  paid_leave: {
    label: 'Paid leave',
    dot: 'bg-blue-400',
    shell: 'bg-blue-500/10 border-blue-500/25 text-blue-200'
  },
  unpaid_leave: {
    label: 'Unpaid leave',
    dot: 'bg-amber-400',
    shell: 'bg-amber-500/10 border-amber-500/25 text-amber-200'
  },
  half_day_leave: {
    label: 'Half day',
    dot: 'bg-sky-400',
    shell: 'bg-sky-500/10 border-sky-500/25 text-sky-200'
  },
  holiday: {
    label: 'Holiday',
    dot: 'bg-rose-400',
    shell: 'bg-rose-500/10 border-rose-500/25 text-rose-200'
  },
  week_off: {
    label: 'Week off',
    dot: 'bg-slate-400',
    shell: 'bg-slate-500/10 border-slate-500/25 text-slate-300'
  },
  training: {
    label: 'Training',
    dot: 'bg-violet-400',
    shell: 'bg-violet-500/10 border-violet-500/25 text-violet-200'
  },
  internal: {
    label: 'Internal',
    dot: 'bg-slate-400',
    shell: 'bg-slate-500/10 border-slate-500/25 text-slate-300'
  }
};

export function attendancePillMeta(status) {
  const key = String(status || 'present').toLowerCase();
  return ATTENDANCE_PILL[key] || ATTENDANCE_PILL.present;
}

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

/** Coerce Mongo/ObjectId/populated refs to a stable string id for selects and lookups. */
export function normalizeRefId(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'object') {
    if (value._id != null) return String(value._id);
    if (value.id != null) return String(value.id);
    return '';
  }
  return String(value);
}

export function formatTimesheetWeek(periodStart, periodEnd) {
  const from = new Date(periodStart);
  const to = new Date(periodEnd);
  if (Number.isNaN(from.getTime())) return '—';
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  if (Number.isNaN(to.getTime()) || from.toDateString() === to.toDateString()) {
    return from.toLocaleDateString(undefined, opts);
  }
  return `${from.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} - ${to.toLocaleDateString(undefined, opts)}`;
}

export function formatHours(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return '—';
  return `${v.toFixed(v % 1 === 0 ? 0 : 1)}h`;
}

export function formatLastSaved(date) {
  if (!date || Number.isNaN(date.getTime())) return null;
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'Saved just now';
  if (mins < 60) return `Last saved ${mins} min${mins === 1 ? '' : 's'} ago`;
  return `Last saved at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
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
