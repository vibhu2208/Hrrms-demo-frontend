import React, { useMemo } from 'react';
import { AlertTriangle, CalendarClock, Clock, Sparkles } from 'lucide-react';
import { availableBalance, surface } from '../leaveUi';

const LeaveInsightsBar = ({ balances = [], history = [] }) => {
  const insights = useMemo(() => {
    const items = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lowTypes = balances.filter((b) => {
      const avail = availableBalance(b);
      return b.totalAllocated > 0 && avail <= 1;
    });
    if (lowTypes.length) {
      items.push({
        icon: AlertTriangle,
        tone: 'text-amber-500/90',
        title: 'Low balance',
        text: `${lowTypes.map((b) => b.leaveTypeId?.name || 'Leave').join(', ')} — plan ahead.`
      });
    }

    const pendingCount = history.filter((h) => h.status === 'pending').length;
    if (pendingCount) {
      items.push({
        icon: Clock,
        tone: 'text-blue-400/90',
        title: 'Pending approval',
        text: `${pendingCount} request${pendingCount === 1 ? '' : 's'} awaiting manager action.`
      });
    }

    const upcoming = history.filter((h) => {
      if (h.status !== 'approved' && h.status !== 'pending') return false;
      const from = new Date(h.fromDate);
      return !Number.isNaN(from.getTime()) && from >= today;
    });
    if (upcoming.length) {
      const next = upcoming.sort((a, b) => new Date(a.fromDate) - new Date(b.fromDate))[0];
      items.push({
        icon: CalendarClock,
        tone: 'theme-text-secondary',
        title: 'Upcoming leave',
        text: `${next.leaveTypeId?.name || 'Leave'} from ${new Date(next.fromDate).toLocaleDateString()}.`
      });
    }

    if (!items.length && balances.length) {
      items.push({
        icon: Sparkles,
        tone: 'theme-text-secondary',
        title: 'All clear',
        text: 'No pending actions. Submit leave when you need time off.'
      });
    }

    return items.slice(0, 3);
  }, [balances, history]);

  if (!insights.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {insights.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="rounded-lg border theme-border theme-surface px-4 py-3 flex gap-3 items-start"
          >
            <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${item.tone}`} />
            <div className="min-w-0">
              <p className="text-xs font-semibold theme-text">{item.title}</p>
              <p className={`${surface.muted} mt-0.5 leading-snug`}>{item.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LeaveInsightsBar;
