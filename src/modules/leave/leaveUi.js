/** Shared layout + status tokens for Leave module (matches index.css theme). */

export const surface = {
  page: 'space-y-5',
  sectionTitle: 'text-sm font-semibold theme-text',
  sectionSub: 'text-xs theme-text-secondary mt-0.5',
  card: 'card !p-0 overflow-hidden',
  section: 'px-4 py-3 sm:px-5 sm:py-4',
  muted: 'text-xs theme-text-secondary',
  label: 'block text-[11px] font-medium uppercase tracking-wide theme-text-secondary mb-1.5',
  hint: 'text-[11px] theme-text-secondary mt-1',
  input: 'input-field !py-2 !px-3 !text-sm !rounded-md',
  select: 'input-field !py-2 !px-3 !text-sm !rounded-md cursor-pointer',
  textarea: 'input-field !py-2 !px-3 !text-sm !rounded-md min-h-[88px] resize-y',
  btnPrimary: 'btn-primary !py-2.5 !px-5 !text-sm w-full sm:w-auto',
  btnSecondary: 'btn-secondary !py-2 !px-4 !text-sm',
  btnGhost: 'btn-outline !py-1.5 !px-3 !text-sm',
  divider: 'border-t theme-border'
};

export const LEAVE_STATUS = {
  pending: { label: 'Pending', badge: 'badge-warning' },
  approved: { label: 'Approved', badge: 'badge-success' },
  rejected: { label: 'Rejected', badge: 'badge-danger' },
  cancelled: { label: 'Cancelled', badge: 'badge-default' },
  withdrawn: { label: 'Withdrawn', badge: 'badge-default' },
  draft: { label: 'Draft', badge: 'badge-default' }
};

export function leaveStatusMeta(status) {
  const key = (status || 'pending').toLowerCase();
  return LEAVE_STATUS[key] || { label: status || 'Unknown', badge: 'badge-default' };
}

export function formatLeaveDateRange(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime())) return '—';
  const sameDay = from.toDateString() === to.toDateString();
  if (sameDay) return from.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${from.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${to.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/** Approximate working days for UI preview (inclusive calendar days; half-day = 0.5). */
export function previewLeaveDays(fromDate, toDate, halfDay) {
  if (!fromDate || !toDate) return null;
  if (halfDay) return 0.5;
  const start = new Date(`${fromDate}T12:00:00`);
  const end = new Date(`${toDate}T12:00:00`);
  if (end < start) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

export function availableBalance(allocation) {
  return Number((allocation.totalAllocated - allocation.used - allocation.pending).toFixed(2));
}

export const HOLIDAY_TYPE_META = {
  national: { label: 'National', badge: 'badge-info' },
  regional: { label: 'Regional', badge: 'badge-warning' },
  company: { label: 'Company', badge: 'badge-default' },
  optional: { label: 'Optional', badge: 'badge-default' }
};

/** Active holidays expanded to calendar dates for a given year (local calendar). */
export function holidaysInCalendarYear(holidays, year) {
  const items = [];
  for (const h of holidays || []) {
    if ((h.status || 'active') === 'inactive') continue;
    const ref = new Date(h.date);
    if (Number.isNaN(ref.getTime())) continue;
    let displayDate;
    if (h.isRecurringYearly) {
      displayDate = new Date(year, ref.getMonth(), ref.getDate());
    } else if (ref.getFullYear() === year) {
      displayDate = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    } else {
      continue;
    }
    displayDate.setHours(0, 0, 0, 0);
    items.push({ ...h, displayDate });
  }
  return items.sort((a, b) => a.displayDate - b.displayDate);
}

export function formatHolidayDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
