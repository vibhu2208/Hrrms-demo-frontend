import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Loader2
} from 'lucide-react';
import { fetchManagerTeamLeaveCalendar } from '../../../../api/leave';
import { formatLeaveDateRange, leaveStatusMeta, surface } from '../../leaveUi';
import {
  eachDayInMonth,
  holidayOnDate,
  leaveSpansDate,
  LEAVE_STATUS_DOT,
  toLocalDateKey
} from '../../managerQueueUi';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ManagerTeamLeaveCalendar = ({ embedded = false }) => {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLeave, setSelectedLeave] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchManagerTeamLeaveCalendar({
          year: viewYear,
          month: viewMonth + 1
        });
        if (!cancelled) {
          setLeaves(res.data?.leaves || []);
          setHolidays(res.data?.holidays || []);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load team calendar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [viewYear, viewMonth]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  });

  const days = useMemo(() => eachDayInMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const padding = Array.from({ length: firstDow }, (_, i) => i);

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...leaves]
      .filter((l) => new Date(l.fromDate) >= today || leaveSpansDate(l, today))
      .sort((a, b) => new Date(a.fromDate) - new Date(b.fromDate))
      .slice(0, 6);
  }, [leaves]);

  const shiftMonth = (delta) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedLeave(null);
  };

  const weekStrip = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toLocalDateKey(d);
      const dayLeaves = leaves.filter((l) => leaveSpansDate(l, d));
      const dayHolidays = holidays.filter((h) => holidayOnDate(h, d, viewYear));
      return { date: d, key, leaves: dayLeaves, holidays: dayHolidays };
    });
  }, [leaves, holidays, viewYear]);

  return (
    <div className={embedded ? '' : surface.card}>
      <div
        className={`${embedded ? 'pb-4' : surface.section} ${
          embedded ? '' : 'border-b theme-border'
        } flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}
      >
        {!embedded ? (
          <div>
            <h2 className={`${surface.sectionTitle} flex items-center gap-2`}>
              <CalendarDays className="h-4 w-4 theme-text-secondary" />
              Team leave calendar
            </h2>
            <p className={surface.sectionSub}>Plan coverage, spot overlaps, and review upcoming time off.</p>
          </div>
        ) : (
          <p className="text-sm theme-text-secondary">Browse team leave and holidays by month.</p>
        )}
        <div className="flex items-center gap-1 rounded-lg border theme-border theme-surface p-0.5 shrink-0">
          <button type="button" className={surface.btnGhost} onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8rem] text-center text-sm font-medium theme-text px-2">{monthLabel}</span>
          <button type="button" className={surface.btnGhost} onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={`${embedded ? '' : surface.section} grid grid-cols-1 xl:grid-cols-[1fr_220px] gap-4`}>
        <div className="min-w-0 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm theme-text-secondary gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading calendar…
            </div>
          ) : error ? (
            <p className="text-sm text-red-300 py-4">{error}</p>
          ) : (
            <>
              <div className="overflow-x-auto -mx-1 px-1">
                <p className="text-[11px] font-medium uppercase tracking-wide theme-text-secondary mb-2">
                  This week
                </p>
                <div className="flex gap-2 min-w-[32rem]">
                  {weekStrip.map((cell) => {
                    const isToday = toLocalDateKey(cell.date) === toLocalDateKey(new Date());
                    return (
                      <div
                        key={cell.key}
                        className={`flex-1 min-w-[4.5rem] rounded-lg border px-2 py-2 ${
                          isToday ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5' : 'theme-border'
                        }`}
                      >
                        <p className="text-[10px] theme-text-secondary">
                          {cell.date.toLocaleDateString(undefined, { weekday: 'short' })}
                        </p>
                        <p className="text-sm font-medium theme-text">{cell.date.getDate()}</p>
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {cell.holidays.slice(0, 1).map((h) => (
                            <span
                              key={h._id}
                              className="text-[9px] px-1 rounded bg-slate-500/20 theme-text-secondary truncate max-w-full"
                              title={h.name}
                            >
                              {h.name}
                            </span>
                          ))}
                          {cell.leaves.slice(0, 2).map((l) => (
                            <span
                              key={l._id}
                              className={`text-[9px] px-1 rounded truncate max-w-full ${
                                l.status === 'approved' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-200'
                              }`}
                              title={l.requesterName}
                            >
                              {l.requesterName?.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="text-[10px] font-medium text-center theme-text-secondary py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {padding.map((i) => (
                    <div key={`pad-${i}`} className="min-h-[4.5rem] rounded-md opacity-0" />
                  ))}
                  {days.map((day) => {
                    const key = toLocalDateKey(day);
                    const dayLeaves = leaves.filter((l) => leaveSpansDate(l, day));
                    const dayHolidays = holidays.filter((h) => holidayOnDate(h, day, viewYear));
                    const isToday = key === toLocalDateKey(new Date());
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`min-h-[4.5rem] rounded-md border text-left p-1 transition-colors ${
                          isToday
                            ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5'
                            : 'theme-border hover:bg-white/5'
                        }`}
                        onClick={() => dayLeaves[0] && setSelectedLeave(dayLeaves[0])}
                      >
                        <span className="text-[11px] font-medium theme-text">{day.getDate()}</span>
                        <div className="mt-0.5 space-y-0.5">
                          {dayHolidays.slice(0, 1).map((h) => (
                            <p
                              key={h._id}
                              className="text-[8px] leading-tight px-0.5 truncate text-slate-300"
                              title={h.name}
                            >
                              {h.name}
                            </p>
                          ))}
                          {dayLeaves.slice(0, 2).map((l) => (
                            <p
                              key={l._id}
                              className="text-[8px] leading-tight px-0.5 truncate flex items-center gap-0.5"
                              title={`${l.requesterName} — ${l.leaveTypeName}`}
                            >
                              <span className={`h-1 w-1 rounded-full shrink-0 ${LEAVE_STATUS_DOT[l.status] || LEAVE_STATUS_DOT.pending}`} />
                              <span className="truncate">{l.requesterName?.split(' ')[0]}</span>
                            </p>
                          ))}
                          {dayLeaves.length > 2 ? (
                            <p className="text-[8px] theme-text-secondary">+{dayLeaves.length - 2}</p>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {selectedLeave ? (
            <div className="rounded-lg border theme-border px-3 py-2.5 text-sm">
              <p className="font-medium theme-text">{selectedLeave.requesterName}</p>
              <p className="text-xs theme-text-secondary mt-1">
                {selectedLeave.leaveTypeName} · {formatLeaveDateRange(selectedLeave.fromDate, selectedLeave.toDate)}
              </p>
              <span className={`badge ${leaveStatusMeta(selectedLeave.status).badge} text-[10px] mt-2 inline-block`}>
                {leaveStatusMeta(selectedLeave.status).label}
              </span>
              <button
                type="button"
                className={`${surface.btnGhost} mt-2 !text-xs`}
                onClick={() => setSelectedLeave(null)}
              >
                Close
              </button>
            </div>
          ) : null}
        </div>

        <aside className="border-t xl:border-t-0 xl:border-l theme-border pt-4 xl:pt-0 xl:pl-4 min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wide theme-text-secondary mb-2">
            Upcoming & active
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-xs theme-text-secondary">No team leave in this period.</p>
          ) : (
            <ul className="space-y-2 max-h-[20rem] overflow-y-auto overscroll-contain">
              {upcoming.map((l) => {
                const meta = leaveStatusMeta(l.status);
                return (
                  <li
                    key={l._id}
                    className="rounded-md border theme-border px-2.5 py-2 text-xs hover:border-[var(--color-primary)]/30 cursor-pointer"
                    onClick={() => setSelectedLeave(l)}
                  >
                    <p className="font-medium theme-text truncate">{l.requesterName}</p>
                    <p className="theme-text-secondary mt-0.5 truncate">
                      {formatLeaveDateRange(l.fromDate, l.toDate)}
                    </p>
                    <span className={`badge ${meta.badge} text-[9px] mt-1`}>{meta.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
};

export default ManagerTeamLeaveCalendar;
