/** Calendar helpers for manager team leave view */

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toLocalDateKey(d) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
}

export function eachDayInMonth(year, monthIndex) {
  const days = [];
  const last = new Date(year, monthIndex + 1, 0).getDate();
  for (let d = 1; d <= last; d += 1) {
    days.push(new Date(year, monthIndex, d));
  }
  return days;
}

export function leaveSpansDate(leave, date) {
  const start = new Date(leave.fromDate);
  const end = new Date(leave.toDate);
  const cell = new Date(date);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  cell.setHours(12, 0, 0, 0);
  return cell >= start && cell <= end;
}

export function holidayOnDate(holiday, date, viewYear) {
  const ref = new Date(holiday.date);
  if (Number.isNaN(ref.getTime())) return false;
  if (holiday.isRecurringYearly) {
    return ref.getMonth() === date.getMonth() && ref.getDate() === date.getDate();
  }
  return (
    ref.getFullYear() === viewYear &&
    ref.getMonth() === date.getMonth() &&
    ref.getDate() === date.getDate()
  );
}

export const LEAVE_STATUS_DOT = {
  pending: 'bg-amber-400/80',
  approved: 'bg-emerald-400/70',
  rejected: 'bg-red-400/60'
};
