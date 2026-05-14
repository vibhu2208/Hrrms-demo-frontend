import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Pencil,
  Trash2,
  Sparkles
} from 'lucide-react';
import { fetchHolidays, createHoliday, updateHoliday, deleteHoliday } from '../../../api/leave';
import toast from 'react-hot-toast';

const HOLIDAY_TYPES = [
  { value: 'national', label: 'National' },
  { value: 'regional', label: 'Regional' },
  { value: 'company', label: 'Company' },
  { value: 'optional', label: 'Optional' }
];

const TYPE_META = {
  national: { label: 'National', badge: 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/30' },
  regional: { label: 'Regional', badge: 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/30' },
  company: { label: 'Company', badge: 'bg-[#A88BFF]/25 text-violet-100 ring-1 ring-[#A88BFF]/40' },
  optional: { label: 'Optional', badge: 'bg-slate-500/25 text-slate-200 ring-1 ring-slate-500/35' }
};

const STATUS_META = {
  active: { label: 'Active', badge: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25' },
  inactive: { label: 'Inactive', badge: 'bg-gray-600/30 text-gray-400 ring-1 ring-gray-600/40' }
};

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** YYYY-MM-DD in local calendar for date input */
function toInputDate(d) {
  if (!d) return '';
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
}

function holidayOccursOn(h, viewYear, viewMonthIndex, cellDay) {
  const ref = new Date(h.date);
  if (Number.isNaN(ref.getTime())) return false;
  if (h.isRecurringYearly) {
    return ref.getMonth() === viewMonthIndex && ref.getDate() === cellDay;
  }
  return ref.getFullYear() === viewYear && ref.getMonth() === viewMonthIndex && ref.getDate() === cellDay;
}

function holidaysOnLocalDay(holidays, viewYear, viewMonthIndex, cellDay) {
  return holidays.filter((h) => holidayOccursOn(h, viewYear, viewMonthIndex, cellDay));
}

function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function holidaySortDate(h) {
  const ref = new Date(h.date);
  return ref.getTime();
}

function ConfirmModal({ open, title, message, confirmLabel, onCancel, onConfirm, busy }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-[#2A2A3A] shadow-2xl shadow-black/40 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title" className="text-lg font-semibold text-white">
          {title}
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#1E1E2A] focus:outline-none focus:ring-2 focus:ring-[#A88BFF]/50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 min-w-[96px]"
          >
            {busy ? <Loader2 className="animate-spin" size={18} /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group rounded-lg border border-gray-700/80 bg-[#1E1E2A]/60 px-3 py-2.5 hover:border-gray-600 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-gray-600 bg-[#1E1E2A] text-[#A88BFF] focus:ring-[#A88BFF] focus:ring-offset-0 focus:ring-offset-transparent"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-white group-hover:text-gray-100">{label}</span>
        {description ? <span className="block text-xs text-gray-500 mt-0.5 leading-snug">{description}</span> : null}
      </span>
    </label>
  );
}

function HolidayFormModal({ open, mode, initial, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [holidayType, setHolidayType] = useState('company');
  const [isOptional, setIsOptional] = useState(false);
  const [isRecurringYearly, setIsRecurringYearly] = useState(false);
  const [status, setStatus] = useState('active');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setName(initial.name || '');
      setDateStr(toInputDate(initial.date));
      setHolidayType(initial.holidayType || 'company');
      setIsOptional(Boolean(initial.isOptional));
      setIsRecurringYearly(Boolean(initial.isRecurringYearly));
      setStatus(initial.status || 'active');
    } else {
      setName('');
      setDateStr('');
      setHolidayType('company');
      setIsOptional(false);
      setIsRecurringYearly(false);
      setStatus('active');
    }
  }, [open, mode, initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !dateStr) {
      toast.error('Name and date are required');
      return;
    }
    const payload = {
      name: name.trim(),
      date: dateStr,
      holidayType,
      isOptional,
      isRecurringYearly,
      status
    };
    setSubmitting(true);
    try {
      if (mode === 'edit' && initial?._id) {
        await updateHoliday(initial._id, payload);
        toast.success('Holiday updated');
      } else {
        await createHoliday(payload);
        toast.success('Holiday created');
      }
      await onSaved();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-[#2A2A3A] shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-700 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">{mode === 'edit' ? 'Edit holiday' : 'Add holiday'}</h2>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'edit' ? 'Update details and save changes.' : 'Create a new entry on the company calendar.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">Holiday name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-700 bg-[#1E1E2A] px-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A88BFF]/50 focus:border-transparent transition-shadow"
              placeholder="e.g. Republic Day"
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">Date</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-700 bg-[#1E1E2A] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF]/50 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">Holiday type</label>
              <select
                value={holidayType}
                onChange={(e) => setHolidayType(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-700 bg-[#1E1E2A] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF]/50 focus:border-transparent"
              >
                {HOLIDAY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-700 bg-[#1E1E2A] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF]/50 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <p className="text-[11px] text-gray-500 mt-1">Inactive holidays are hidden from leave calculations.</p>
          </div>
          <div className="space-y-2">
            <Toggle
              checked={isOptional}
              onChange={setIsOptional}
              label="Optional observance"
              description="Employees may treat this day as a normal working day if policy allows."
            />
            <Toggle
              checked={isRecurringYearly}
              onChange={setIsRecurringYearly}
              label="Recurring yearly"
              description="Applies on the same month and day every year for leave and timesheet rules."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-700/80">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#1E1E2A] focus:outline-none focus:ring-2 focus:ring-[#A88BFF]/40 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 min-w-[100px] rounded-lg bg-[#A88BFF] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#A88BFF]/60 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : mode === 'edit' ? 'Save changes' : 'Create holiday'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const AdminLeaveHolidays = () => {
  const [rawHolidays, setRawHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [selectedLocal, setSelectedLocal] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formInitial, setFormInitial] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyAction, setBusyAction] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchHolidays();
      setRawHolidays(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load holidays');
      setRawHolidays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (yearFilter === 'all') return;
    const y = Number(yearFilter);
    if (Number.isNaN(y)) return;
    setCalendarCursor((prev) => new Date(y, prev.getMonth(), 1));
  }, [yearFilter]);

  const filtered = useMemo(() => {
    let rows = [...rawHolidays];
    if (yearFilter !== 'all') {
      const yf = Number(yearFilter);
      if (!Number.isNaN(yf)) {
        rows = rows.filter((h) => {
          if (h.isRecurringYearly) return true;
          const d = new Date(h.date);
          return d.getFullYear() === yf;
        });
      }
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((h) => (h.name || '').toLowerCase().includes(q));
    }
    return rows.sort((a, b) => holidaySortDate(a) - holidaySortDate(b));
  }, [rawHolidays, yearFilter, search]);

  const calYear = calendarCursor.getFullYear();
  const calMonth = calendarCursor.getMonth();
  const today = startOfToday();

  const calendarDays = useMemo(() => {
    const first = new Date(calYear, calMonth, 1);
    const last = new Date(calYear, calMonth + 1, 0);
    const startPad = first.getDay();
    const total = last.getDate();
    const cells = [];
    for (let i = 0; i < startPad; i += 1) cells.push(null);
    for (let d = 1; d <= total; d += 1) cells.push(d);
    return cells;
  }, [calYear, calMonth]);

  const upcoming = useMemo(() => {
    const list = [];
    const seen = new Set();
    const t0 = startOfToday();
    const addOcc = (h, occDate) => {
      if (occDate < t0) return;
      const key = `${h._id}-${occDate.toDateString()}`;
      if (seen.has(key)) return;
      seen.add(key);
      list.push({ holiday: h, occDate });
    };

    filtered.forEach((h) => {
      if (h.status === 'inactive') return;
      if (h.isRecurringYearly) {
        const ref = new Date(h.date);
        const m = ref.getMonth();
        const d = ref.getDate();
        let y = t0.getFullYear();
        let occ = new Date(y, m, d);
        if (occ < t0) occ = new Date(y + 1, m, d);
        addOcc(h, occ);
      } else {
        addOcc(h, new Date(h.date));
      }
    });

    return list.sort((a, b) => a.occDate - b.occDate).slice(0, 8);
  }, [filtered]);

  const navigateMonth = (dir) => {
    setCalendarCursor((prev) => {
      const n = new Date(prev);
      n.setMonth(n.getMonth() + (dir === 'prev' ? -1 : 1));
      return n;
    });
    setSelectedLocal(null);
  };

  const openCreate = () => {
    setFormMode('create');
    setFormInitial(null);
    setFormOpen(true);
  };

  const openEdit = (h) => {
    setFormMode('edit');
    setFormInitial(h);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormInitial(null);
  };

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return ['all', y - 1, y, y + 1, y + 2];
  }, []);

  const selectedDayHolidays = useMemo(() => {
    if (!selectedLocal) return [];
    return holidaysOnLocalDay(filtered, selectedLocal.y, selectedLocal.m, selectedLocal.d);
  }, [selectedLocal, filtered]);

  const isTodayCell = (day) => {
    if (!day) return false;
    return (
      today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day
    );
  };

  const isSelectedCell = (day) => {
    if (!day || !selectedLocal) return false;
    return selectedLocal.y === calYear && selectedLocal.m === calMonth && selectedLocal.d === day;
  };

  return (
    <div className="min-h-0 w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-6 space-y-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A88BFF]/90">Leave admin</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Holiday master</h1>
            <p className="text-sm text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
              Plan and maintain your organization holiday calendar. Active entries feed leave duration and timesheet
              rules; recurring dates repeat every year on the same calendar day.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#A88BFF] text-white text-sm font-semibold shadow-lg shadow-[#A88BFF]/20 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#A88BFF]/60 transition-all shrink-0"
          >
            <Plus size={18} strokeWidth={2.25} />
            Add holiday
          </button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by holiday name…"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-700 bg-[#1E1E2A] text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A88BFF]/45 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-500 shrink-0">Year</label>
          <select
            value={yearFilter}
            onChange={(e) => {
              const v = e.target.value;
              setYearFilter(v === 'all' ? 'all' : Number(v));
            }}
            className="h-10 min-w-[128px] rounded-lg border border-gray-700 bg-[#1E1E2A] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#A88BFF]/45"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y === 'all' ? 'All years' : y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-w-0">
        <section className="xl:col-span-2 rounded-xl border border-gray-800 bg-[#2A2A3A] shadow-sm overflow-hidden min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-gray-800 bg-[#252532]/80">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarIcon className="text-[#A88BFF] shrink-0" size={20} />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white">Calendar</h2>
                <p className="text-[11px] text-gray-500 truncate">Color-coded by type · click a day to inspect or edit</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => navigateMonth('prev')}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E1E2A] focus:outline-none focus:ring-2 focus:ring-[#A88BFF]/40 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-medium text-white min-w-[140px] text-center tabular-nums">
                {calendarCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => navigateMonth('next')}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E1E2A] focus:outline-none focus:ring-2 focus:ring-[#A88BFF]/40 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-5 min-w-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                <Loader2 className="animate-spin text-[#A88BFF]" size={28} />
                <span className="text-sm">Loading calendar…</span>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-3 mb-4 text-[11px]">
                  {Object.entries(TYPE_META).map(([k, v]) => (
                    <span key={k} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${v.badge}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                      {v.label}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="text-center text-[10px] sm:text-xs font-semibold text-gray-500 py-2">
                      {d}
                    </div>
                  ))}
                  {calendarDays.map((day, idx) => {
                    const onDay = day ? holidaysOnLocalDay(filtered, calYear, calMonth, day) : [];
                    const activeOnDay = onDay.filter((h) => h.status !== 'inactive');
                    return (
                      <div
                        key={idx}
                        role={day ? 'button' : undefined}
                        tabIndex={day ? 0 : undefined}
                        onClick={() => day && setSelectedLocal({ y: calYear, m: calMonth, d: day })}
                        onKeyDown={(e) => {
                          if (day && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            setSelectedLocal({ y: calYear, m: calMonth, d: day });
                          }
                        }}
                        className={[
                          'min-h-[72px] sm:min-h-[88px] rounded-lg border p-1 sm:p-1.5 transition-colors min-w-0',
                          !day ? 'border-transparent' : 'border-gray-700/90 bg-[#1E1E2A]/50 cursor-pointer hover:border-[#A88BFF]/50 hover:bg-[#1E1E2A]',
                          day && isTodayCell(day) ? 'ring-1 ring-[#A88BFF]/70' : '',
                          day && isSelectedCell(day) ? 'ring-2 ring-[#A88BFF]' : ''
                        ].join(' ')}
                      >
                        {day ? (
                          <>
                            <div
                              className={`text-xs font-semibold mb-1 ${isTodayCell(day) ? 'text-[#A88BFF]' : 'text-gray-300'}`}
                            >
                              {day}
                            </div>
                            <div className="flex flex-wrap gap-0.5">
                              {activeOnDay.slice(0, 4).map((h) => {
                                const meta = TYPE_META[h.holidayType] || TYPE_META.company;
                                return (
                                  <button
                                    key={h._id}
                                    type="button"
                                    title={h.name}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEdit(h);
                                    }}
                                    className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full shrink-0 ring-1 ring-white/10 ${meta.badge.split(' ')[0]}`}
                                    style={{
                                      backgroundColor:
                                        h.holidayType === 'national'
                                          ? 'rgb(56, 189, 248)'
                                          : h.holidayType === 'regional'
                                            ? 'rgb(251, 191, 36)'
                                            : h.holidayType === 'optional'
                                              ? 'rgb(148, 163, 184)'
                                              : 'rgb(167, 139, 250)'
                                    }}
                                  />
                                );
                              })}
                              {activeOnDay.length > 4 ? (
                                <span className="text-[9px] text-gray-500 pl-0.5">+{activeOnDay.length - 4}</span>
                              ) : null}
                            </div>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {selectedLocal ? (
                  <div className="mt-5 rounded-lg border border-gray-700 bg-[#252532] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-white">
                        {new Date(selectedLocal.y, selectedLocal.m, selectedLocal.d).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setSelectedLocal(null)}
                        className="text-xs text-gray-500 hover:text-gray-300"
                      >
                        Clear
                      </button>
                    </div>
                    {selectedDayHolidays.length === 0 ? (
                      <p className="text-sm text-gray-500">No holidays on this day for the current filters.</p>
                    ) : (
                      <ul className="space-y-2">
                        {selectedDayHolidays.map((h) => {
                          const tmeta = TYPE_META[h.holidayType] || TYPE_META.company;
                          const smeta = STATUS_META[h.status] || STATUS_META.active;
                          return (
                            <li
                              key={h._id}
                              className="flex flex-wrap items-center gap-2 justify-between rounded-lg border border-gray-700/80 bg-[#1E1E2A] px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">{h.name}</p>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  <span className={`text-[10px] font-medium rounded px-2 py-0.5 ${tmeta.badge}`}>{tmeta.label}</span>
                                  <span className={`text-[10px] font-medium rounded px-2 py-0.5 ${smeta.badge}`}>{smeta.label}</span>
                                  {h.isRecurringYearly ? (
                                    <span className="text-[10px] font-medium rounded px-2 py-0.5 bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/25">
                                      Recurring
                                    </span>
                                  ) : null}
                                  {h.isOptional ? (
                                    <span className="text-[10px] font-medium rounded px-2 py-0.5 bg-gray-500/20 text-gray-300">
                                      Optional obs.
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEdit(h)}
                                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-[#A88BFF]/40"
                                  title="Edit"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget({ id: h._id, name: h.name })}
                                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>

        <aside className="rounded-xl border border-gray-800 bg-[#2A2A3A] shadow-sm flex flex-col min-h-[280px] min-w-0 overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-2">
            <Sparkles className="text-amber-300/90 shrink-0" size={18} />
            <div>
              <h2 className="text-sm font-semibold text-white">Upcoming</h2>
              <p className="text-[11px] text-gray-500">Next scheduled observances</p>
            </div>
          </div>
          <div className="p-3 flex-1 overflow-y-auto max-h-[420px]">
            {!loading && upcoming.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 px-3">
                <CalendarIcon className="text-gray-600 mb-2" size={32} />
                <p className="text-sm text-gray-400">No upcoming holidays</p>
                <p className="text-xs text-gray-600 mt-1">Try another year or add a new holiday.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {upcoming.map(({ holiday: h, occDate }) => {
                  const tmeta = TYPE_META[h.holidayType] || TYPE_META.company;
                  return (
                    <li key={`${h._id}-${occDate.toISOString()}`}>
                      <button
                        type="button"
                        onClick={() => openEdit(h)}
                        className="w-full text-left rounded-lg border border-gray-700/80 bg-[#1E1E2A]/80 px-3 py-2.5 hover:border-[#A88BFF]/40 hover:bg-[#1E1E2A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#A88BFF]/35"
                      >
                        <p className="text-sm font-medium text-white truncate">{h.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {occDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <span className={`inline-block mt-1.5 text-[10px] font-medium rounded px-2 py-0.5 ${tmeta.badge}`}>
                          {tmeta.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <section className="rounded-xl border border-gray-800 bg-[#2A2A3A] shadow-sm overflow-hidden min-w-0">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Holiday register</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">Compact list for audits and bulk review</p>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16 text-gray-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Search className="text-gray-600 mb-2" size={28} />
              <p className="text-sm text-gray-400 font-medium">No holidays match your filters</p>
              <p className="text-xs text-gray-600 mt-1 max-w-sm">
                Clear the search box or pick a different year. You can also add a holiday from the button above.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-[#252532] text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Holiday name</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Day</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map((h) => {
                  const d = new Date(h.date);
                  const tmeta = TYPE_META[h.holidayType] || TYPE_META.company;
                  const smeta = STATUS_META[h.status] || STATUS_META.active;
                  return (
                    <tr key={h._id} className="hover:bg-[#1E1E2A]/40 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-white">{h.name}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5 flex flex-wrap gap-1">
                          {h.isRecurringYearly ? <span>Recurring</span> : null}
                          {h.isOptional ? <span>· Optional obs.</span> : null}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-300 whitespace-nowrap tabular-nums">
                        {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{d.toLocaleDateString('en-US', { weekday: 'long' })}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[11px] font-medium rounded px-2 py-0.5 ${tmeta.badge}`}>{tmeta.label}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[11px] font-medium rounded px-2 py-0.5 ${smeta.badge}`}>{smeta.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEdit(h)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#A88BFF] hover:bg-[#A88BFF]/10 focus:outline-none focus:ring-2 focus:ring-[#A88BFF]/35 mr-1"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: h._id, name: h.name })}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <HolidayFormModal
        open={formOpen}
        mode={formMode}
        initial={formInitial}
        onClose={closeForm}
        onSaved={async () => {
          await load();
          closeForm();
        }}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete holiday?"
        message={
          deleteTarget
            ? `Remove “${deleteTarget.name}” from the calendar? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        busy={busyAction}
        onCancel={() => !busyAction && setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setBusyAction(true);
          try {
            await deleteHoliday(deleteTarget.id);
            toast.success('Holiday deleted');
            setDeleteTarget(null);
            setSelectedLocal(null);
            await load();
          } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Delete failed');
          } finally {
            setBusyAction(false);
          }
        }}
      />
    </div>
  );
};

export default AdminLeaveHolidays;
