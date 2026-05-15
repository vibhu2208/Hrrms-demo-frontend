import React, { useMemo } from 'react';
import { Inbox, Loader2 } from 'lucide-react';
import {
  entryDayKey,
  formatHours,
  formatTimesheetWeek,
  sliceStatusMeta,
  surface,
  timesheetStatusMeta
} from '../../timesheetUi';

const SummaryChip = ({ label, value }) => (
  <div className="rounded-lg border theme-border px-3 py-2 min-w-0">
    <p className="text-[10px] uppercase tracking-wide theme-text-secondary">{label}</p>
    <p className="text-sm font-semibold theme-text tabular-nums mt-0.5">{value}</p>
  </div>
);

const TimesheetDetailPanel = ({
  loading,
  detail,
  employeeName,
  periodStart,
  periodEnd,
  overallStatus,
  legacy,
  onApprove,
  onSendBack,
  acting
}) => {
  const entries = detail?.entries || [];
  const summary = detail?.summary;

  const sendBackDayOptions = useMemo(() => {
    const keys = new Set();
    entries.forEach((e) => {
      const type = e.entryType || 'work';
      if (!['work', 'training', 'internal'].includes(type)) return;
      if (!['submitted', 'under_review'].includes(String(e.sliceStatus || '').toLowerCase())) return;
      const k = entryDayKey(e.entryDate);
      if (k) keys.add(k);
    });
    return [...keys].sort();
  }, [entries]);

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin theme-text-secondary" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="card py-14 text-center">
        <Inbox className="mx-auto h-10 w-10 theme-text-secondary opacity-50" />
        <p className="mt-3 text-sm font-medium theme-text">Select a timesheet</p>
        <p className={`${surface.muted} mt-1 max-w-xs mx-auto`}>
          Choose an item from the queue to review entries and take action.
        </p>
      </div>
    );
  }

  const statusMeta = timesheetStatusMeta(overallStatus);
  const readOnly = legacy;

  return (
    <div className="card !p-0 overflow-hidden lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:flex lg:flex-col">
      <div className={`${surface.section} border-b theme-border shrink-0`}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={surface.sectionTitle}>{employeeName}</h2>
          <span className={`badge ${statusMeta.badge} text-[10px]`}>{statusMeta.label}</span>
          {legacy ? <span className="badge badge-warning text-[10px]">Legacy</span> : null}
        </div>
        <p className={surface.sectionSub}>{formatTimesheetWeek(periodStart, periodEnd)}</p>

        {summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
            <SummaryChip label="Worked" value={formatHours(summary.totalWorkedHours)} />
            <SummaryChip label="Payable" value={formatHours(summary.totalPayableHours)} />
            <SummaryChip label="Leave days" value={summary.leaveDays ?? 0} />
            <SummaryChip label="Missing (wd)" value={summary.missingEntryDays ?? 0} />
            <SummaryChip label="Overtime" value={formatHours(summary.overtimeHours)} />
            <SummaryChip label="Send-backs" value={summary.sentBackCount ?? 0} />
          </div>
        ) : null}

        {!readOnly ? (
          <div className="flex flex-wrap gap-2 mt-4">
            <button type="button" className={surface.btnPrimary} disabled={acting} onClick={onApprove}>
              Approve week
            </button>
            <button
              type="button"
              className="btn-secondary !border-amber-500/30 !text-amber-100/90 hover:!bg-amber-500/10"
              disabled={acting || !sendBackDayOptions.length}
              onClick={onSendBack}
            >
              Send back day
            </button>
          </div>
        ) : (
          <p className="text-xs text-amber-500/90 mt-3">Legacy records are read-only in this queue.</p>
        )}
      </div>

      <div className="overflow-auto flex-1 min-h-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 theme-surface border-b theme-border z-10">
            <tr className="text-[11px] uppercase tracking-wide theme-text-secondary">
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-left font-medium">Project</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-right font-medium">Worked</th>
              <th className="px-4 py-2 text-right font-medium">Payable</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center theme-text-secondary text-sm">
                  No entries for this week.
                </td>
              </tr>
            ) : (
              entries.map((row) => {
                const sm = sliceStatusMeta(row.sliceStatus);
                return (
                  <tr key={row._id} className="border-b theme-border/60 hover:bg-white/[0.02]">
                    <td className="px-4 py-2 theme-text whitespace-nowrap">
                      {new Date(row.entryDate).toLocaleDateString(undefined, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })}
                    </td>
                    <td className="px-4 py-2 theme-text-secondary max-w-[8rem] truncate">
                      {row.projectName || '—'}
                    </td>
                    <td className="px-4 py-2 theme-text-secondary capitalize">{row.entryType || '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums theme-text">
                      {formatHours(row.workedHours ?? row.hours)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums theme-text">
                      {formatHours(row.payableHours ?? row.hours)}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`badge ${sm.badge} text-[10px]`}>{sm.label}</span>
                      {row.sentBackReason ? (
                        <p className="text-[10px] theme-text-secondary mt-1 line-clamp-2">{row.sentBackReason}</p>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimesheetDetailPanel;
