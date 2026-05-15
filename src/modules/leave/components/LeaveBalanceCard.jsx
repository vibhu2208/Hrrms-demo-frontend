import React from 'react';
import { availableBalance } from '../leaveUi';

const LeaveBalanceCard = ({ allocation }) => {
  const name = allocation.leaveTypeId?.name || 'Leave type';
  const allocated = Number(allocation.totalAllocated || 0);
  const used = Number(allocation.used || 0);
  const pending = Number(allocation.pending || 0);
  const available = availableBalance(allocation);
  const usedPct = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
  const pendingPct = allocated > 0 ? Math.min(100 - usedPct, Math.round((pending / allocated) * 100)) : 0;
  const lowBalance = available <= 1 && allocated > 0;

  return (
    <div
      className={`rounded-lg border theme-border theme-surface p-4 ${lowBalance ? 'ring-1 ring-amber-500/30' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold theme-text truncate">{name}</h3>
          {lowBalance ? (
            <p className="text-[11px] text-amber-500/90 mt-0.5">Low balance</p>
          ) : (
            <p className="text-[11px] theme-text-secondary mt-0.5">Annual allocation</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-semibold theme-text leading-none">{available}</p>
          <p className="text-[10px] theme-text-secondary uppercase tracking-wide mt-0.5">available</p>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--color-border)] overflow-hidden flex">
        <div
          className="h-full bg-[var(--color-primary)] opacity-80"
          style={{ width: `${usedPct}%` }}
          title={`Used ${used}`}
        />
        <div
          className="h-full bg-amber-500/50"
          style={{ width: `${pendingPct}%` }}
          title={`Pending ${pending}`}
        />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[10px] uppercase tracking-wide theme-text-secondary">Allocated</dt>
          <dd className="text-sm font-medium theme-text mt-0.5">{allocated}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide theme-text-secondary">Used</dt>
          <dd className="text-sm font-medium theme-text mt-0.5">{used}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide theme-text-secondary">Pending</dt>
          <dd className="text-sm font-medium theme-text mt-0.5">{pending}</dd>
        </div>
      </dl>
    </div>
  );
};

export default LeaveBalanceCard;
