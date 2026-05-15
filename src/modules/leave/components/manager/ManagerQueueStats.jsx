import React from 'react';
import { CalendarCheck, CalendarOff, Clock, Users } from 'lucide-react';
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

const ManagerQueueStats = ({ meta, loading }) => {
  const pending = meta?.pendingCount ?? 0;
  const approvedToday = meta?.approvedToday ?? 0;
  const rejectedToday = meta?.rejectedToday ?? 0;
  const onLeaveToday = meta?.onLeaveToday ?? 0;
  const teamCount = meta?.teamMemberCount;

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
      <StatCard icon={Clock} label="Pending" value={pending} sub="Awaiting your decision" />
      <StatCard icon={CalendarCheck} label="Approved today" value={approvedToday} />
      <StatCard icon={CalendarOff} label="Rejected today" value={rejectedToday} />
      <StatCard
        icon={Users}
        label="On leave today"
        value={onLeaveToday}
        sub={teamCount != null ? `${teamCount} team member${teamCount === 1 ? '' : 's'}` : undefined}
      />
    </div>
  );
};

export default ManagerQueueStats;
