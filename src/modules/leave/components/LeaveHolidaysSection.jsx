import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { fetchHolidays } from '../../../api/leave';
import { formatHolidayDate, holidaysInCalendarYear, HOLIDAY_TYPE_META, surface } from '../leaveUi';

function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

const LeaveHolidaysSection = ({ className = '' }) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [rawHolidays, setRawHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchHolidays({ year: String(year) });
        if (!cancelled) setRawHolidays(res.data || []);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load holidays');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const expanded = useMemo(() => holidaysInCalendarYear(rawHolidays, year), [rawHolidays, year]);

  const { upcoming, past } = useMemo(() => {
    const today = startOfToday();
    const up = [];
    const pa = [];
    for (const h of expanded) {
      if (h.displayDate >= today) up.push(h);
      else pa.push(h);
    }
    return { upcoming: up, past: pa.reverse() };
  }, [expanded]);

  return (
    <div className={`${surface.card} h-full flex flex-col min-h-0 min-w-0 ${className}`.trim()}>
      <div className={`${surface.section} border-b theme-border flex flex-col gap-3 shrink-0 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <h2 className={`${surface.sectionTitle} flex items-center gap-2`}>
            <Sparkles className="h-4 w-4 theme-text-secondary" />
            Company holidays
          </h2>
          <p className={surface.sectionSub}>Official holidays for planning your time off.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border theme-border theme-surface p-0.5">
          <button
            type="button"
            className={surface.btnGhost}
            onClick={() => setYear((y) => y - 1)}
            aria-label="Previous year"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[4.5rem] text-center text-sm font-medium theme-text px-2">{year}</span>
          <button
            type="button"
            className={surface.btnGhost}
            onClick={() => setYear((y) => y + 1)}
            aria-label="Next year"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={`${surface.section} flex-1 min-h-0 overflow-y-auto overscroll-contain`}>
        {loading ? (
          <p className="text-sm theme-text-secondary py-6 text-center">Loading holidays…</p>
        ) : error ? (
          <p className="text-sm text-red-300 py-4">{error}</p>
        ) : expanded.length === 0 ? (
          <p className="text-sm theme-text-secondary py-6 text-center">No holidays listed for {year}.</p>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 ? (
              <HolidayGroup title="Upcoming" items={upcoming} />
            ) : null}
            {past.length > 0 ? (
              <HolidayGroup title="Earlier this year" items={past} muted />
            ) : null}
            {upcoming.length === 0 && past.length === 0 ? (
              <p className="text-sm theme-text-secondary text-center py-4">No holidays in this period.</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

function HolidayGroup({ title, items, muted = false }) {
  return (
    <div>
      <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${muted ? 'theme-text-secondary' : 'theme-text'}`}>
        {title}
      </h3>
      <ul className="divide-y theme-border rounded-lg border theme-border overflow-hidden">
        {items.map((h) => {
          const typeMeta = HOLIDAY_TYPE_META[h.holidayType] || HOLIDAY_TYPE_META.company;
          return (
            <li
              key={`${h._id}-${h.displayDate.getTime()}`}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2.5 ${
                muted ? 'theme-surface opacity-80' : 'theme-surface'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <Calendar className="h-4 w-4 shrink-0 mt-0.5 theme-text-secondary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium theme-text truncate">{h.name}</p>
                  <p className="text-xs theme-text-secondary">{formatHolidayDate(h.displayDate)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                <span className={`badge text-[10px] ${typeMeta.badge}`}>{typeMeta.label}</span>
                {h.isRecurringYearly ? (
                  <span className="badge badge-default text-[10px]">Yearly</span>
                ) : null}
                {h.isOptional ? (
                  <span className="badge badge-warning text-[10px]">Optional</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default LeaveHolidaysSection;
