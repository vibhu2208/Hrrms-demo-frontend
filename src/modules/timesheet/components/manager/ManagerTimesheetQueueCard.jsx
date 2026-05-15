import React from 'react';
import { Calendar, Clock, User } from 'lucide-react';
import {
  formatHours,
  formatTimesheetWeek,
  surface,
  timesheetStatusMeta
} from '../../timesheetUi';

const ManagerTimesheetQueueCard = ({ row, selected, onSelect, disabled }) => {
  const meta = timesheetStatusMeta(row.overallStatus);
  const summary = row.summary || {};
  const submittedAt = row.submittedAt
    ? new Date(row.submittedAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : '—';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(row)}
      className={`w-full text-left card !p-0 overflow-hidden transition-colors ${
        selected ? 'ring-2 ring-[var(--color-primary)]/60 border-[var(--color-primary)]/40' : 'hover:border-[var(--color-primary)]/25'
      }`}
    >
      <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full border theme-border theme-surface flex items-center justify-center shrink-0">
            <User className="h-4 w-4 theme-text-secondary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold theme-text">{row.employeeName}</h3>
              <span className={`badge ${meta.badge} text-[10px]`}>{meta.label}</span>
              {row.legacy ? <span className="badge badge-warning text-[10px]">Legacy</span> : null}
              {summary.hasSentBack ? (
                <span className="badge badge-danger text-[10px]">Sent back</span>
              ) : null}
            </div>
            <p className="text-xs theme-text-secondary mt-0.5 flex items-center gap-1.5">
              <Calendar className="h-3 w-3 shrink-0" />
              {formatTimesheetWeek(row.periodStart, row.periodEnd)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <p className="theme-text-secondary">
            <span className="theme-text font-medium">Worked </span>
            {formatHours(summary.totalWorkedHours)}
          </p>
          <p className="theme-text-secondary">
            <span className="theme-text font-medium">Payable </span>
            {formatHours(summary.totalPayableHours)}
          </p>
          <p className="theme-text-secondary">
            <span className="theme-text font-medium">Leave </span>
            {summary.leaveDays ?? 0}d
          </p>
          <p className="theme-text-secondary flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="theme-text font-medium">Submitted </span>
            {submittedAt}
          </p>
        </div>

        {summary.projectNames?.length ? (
          <p className="text-[11px] theme-text-secondary truncate">
            <span className="theme-text font-medium">Projects: </span>
            {summary.projectNames.join(', ')}
          </p>
        ) : null}
      </div>
    </button>
  );
};

export default ManagerTimesheetQueueCard;
