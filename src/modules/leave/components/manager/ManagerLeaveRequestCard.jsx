import React from 'react';
import { Calendar, User } from 'lucide-react';
import { formatLeaveDateRange, leaveStatusMeta, surface } from '../../leaveUi';

const ManagerLeaveRequestCard = ({ row, onApprove, onReject, disabled }) => {
  const meta = leaveStatusMeta(row.status);
  const appliedAt = row.createdAt
    ? new Date(row.createdAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : '—';

  return (
    <article className="card !p-0 overflow-hidden transition-colors hover:border-[var(--color-primary)]/25">
      <div className="flex flex-col lg:flex-row lg:items-stretch">
        <div className="flex-1 min-w-0 px-4 py-3 sm:px-5 sm:py-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full border theme-border theme-surface flex items-center justify-center shrink-0">
              <User className="h-4 w-4 theme-text-secondary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold theme-text">{row.requesterName}</h3>
                <span className={`badge ${meta.badge} text-[10px]`}>{meta.label}</span>
                {row.legacy ? (
                  <span className="badge badge-warning text-[10px]">Legacy</span>
                ) : null}
              </div>
              <p className="text-xs theme-text-secondary mt-0.5">{row.leaveTypeName}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 theme-text-secondary">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="theme-text font-medium">Dates: </span>
                {formatLeaveDateRange(row.fromDate, row.toDate)}
              </span>
            </div>
            <p className="theme-text-secondary sm:text-right">
              <span className="theme-text font-medium">Duration: </span>
              {row.durationDays != null ? `${row.durationDays} day(s)` : '—'}
              {row.halfDay ? ' (half day)' : ''}
            </p>
            <p className="theme-text-secondary sm:col-span-2">
              <span className="theme-text font-medium">Applied: </span>
              {appliedAt}
            </p>
          </div>

          {row.reason ? (
            <p className="text-xs theme-text-secondary rounded-md border theme-border px-3 py-2 line-clamp-3">
              {row.reason}
            </p>
          ) : (
            <p className="text-xs theme-text-secondary italic">No reason provided</p>
          )}
        </div>

        <div className="border-t lg:border-t-0 lg:border-l theme-border px-4 py-3 sm:px-5 flex flex-row lg:flex-col gap-2 lg:justify-center lg:min-w-[9.5rem] shrink-0">
          {row.legacy ? (
            <p className="text-[11px] text-amber-500/90 lg:col-span-2">Read-only legacy record</p>
          ) : (
            <>
              <button
                type="button"
                className={`${surface.btnPrimary} !w-full !py-2`}
                disabled={disabled}
                onClick={() => onApprove(row)}
              >
                Approve
              </button>
              <button
                type="button"
                className="btn-secondary !w-full !py-2 !border-red-500/30 !text-red-200/90 hover:!bg-red-500/10"
                disabled={disabled}
                onClick={() => onReject(row)}
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
};

export default ManagerLeaveRequestCard;
