import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, FileWarning } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, sub }) => (
  <div className="card !p-4 flex items-start gap-3 min-w-0">
    <div className="rounded-lg border theme-border theme-surface p-2 shrink-0">
      <Icon className="h-4 w-4 theme-text-secondary" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide theme-text-secondary">{label}</p>
      <p className="text-xl font-semibold theme-text tabular-nums mt-0.5">{value}</p>
      {sub ? <p className="text-[11px] theme-text-secondary mt-0.5">{sub}</p> : null}
    </div>
  </div>
);

const ManagerTimesheetQueueStats = ({ meta, loading }) => {
  const pending = meta?.pendingCount ?? 0;
  const approvedThisWeek = meta?.approvedThisWeek ?? 0;
  const sentBack = meta?.sentBackCount ?? 0;
  const draftPending = meta?.draftPendingSubmission ?? 0;

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card !p-4 h-[5.5rem] animate-pulse theme-surface" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard icon={Clock} label="Awaiting review" value={pending} sub="Submitted or partial" />
      <StatCard icon={CheckCircle2} label="Approved this week" value={approvedThisWeek} />
      <StatCard icon={AlertTriangle} label="With send-backs" value={sentBack} sub="Needs correction" />
      <StatCard icon={FileWarning} label="Draft (this week)" value={draftPending} sub="Not yet submitted" />
    </div>
  );
};

export default ManagerTimesheetQueueStats;
