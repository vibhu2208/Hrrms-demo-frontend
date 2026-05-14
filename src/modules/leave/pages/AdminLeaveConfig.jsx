import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAdminLeaveOverview, fetchEscalatedLeaves, fetchHolidays, adminOverrideLeave } from '../../../api/leave';
import { LayoutDashboard, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, Palmtree } from 'lucide-react';
import toast from 'react-hot-toast';

function ymdLocal(d) {
  if (!d) return '';
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfToday() {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfToday() {
  const x = new Date();
  x.setHours(23, 59, 59, 999);
  return x;
}

function rowSegment(row) {
  const fs = new Date(row.fromDate);
  const te = new Date(row.toDate);
  const ts = startOfToday();
  const teod = endOfToday();
  if (row.status === 'pending') return { key: 'pending', label: 'Pending approval' };
  if (row.status === 'approved') {
    if (fs <= teod && te >= ts) return { key: 'current', label: 'On leave now' };
    if (fs > teod) return { key: 'upcoming', label: 'Upcoming (approved)' };
  }
  return { key: 'past', label: 'Past / other' };
}

/** Active holidays on a local calendar day (supports recurring yearly). */
function holidayOccursOnLocalCal(h, viewYear, viewMonthIndex, cellDay) {
  if (!h || h.status === 'inactive') return false;
  const ref = new Date(h.date);
  if (Number.isNaN(ref.getTime())) return false;
  if (h.isRecurringYearly) {
    return ref.getMonth() === viewMonthIndex && ref.getDate() === cellDay;
  }
  return ref.getFullYear() === viewYear && ref.getMonth() === viewMonthIndex && ref.getDate() === cellDay;
}

function getHolidaysForLocalDay(holidayList, date) {
  if (!date || !holidayList?.length) return [];
  return holidayList.filter((h) => holidayOccursOnLocalCal(h, date.getFullYear(), date.getMonth(), date.getDate()));
}

const AdminLeaveConfig = () => {
  const [escalations, setEscalations] = useState([]);
  const [holidays, setHolidays] = useState([]);

  const [viewMode, setViewMode] = useState('dashboard');
  const [calDate, setCalDate] = useState(() => new Date());
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState('all');
  const [selectedDay, setSelectedDay] = useState(null);

  const load = async () => {
    const escRes = await fetchEscalatedLeaves();
    setEscalations(escRes.data || []);
    try {
      const holRes = await fetchHolidays();
      setHolidays(holRes.data || []);
    } catch {
      setHolidays([]);
    }
  };

  const loadOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
      let startDate;
      let endDate;
      if (viewMode === 'calendar') {
        const y = calDate.getFullYear();
        const m = calDate.getMonth();
        startDate = new Date(y, m, 1).toISOString();
        endDate = new Date(y, m + 1, 0, 23, 59, 59, 999).toISOString();
      } else {
        const s = new Date();
        s.setDate(s.getDate() - 7);
        s.setHours(0, 0, 0, 0);
        const e = new Date();
        e.setDate(e.getDate() + 90);
        e.setHours(23, 59, 59, 999);
        startDate = s.toISOString();
        endDate = e.toISOString();
      }
      const res = await fetchAdminLeaveOverview({ startDate, endDate });
      setOverview(res.data || null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load leave overview');
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, [viewMode, calDate]);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const filteredLeaves = useMemo(() => {
    const list = overview?.leaves || [];
    if (tableFilter === 'all') return list;
    return list.filter((row) => rowSegment(row).key === tableFilter);
  }, [overview, tableFilter]);

  const calendarMap = overview?.calendar || {};

  const getDaysInMonth = () => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i += 1) days.push(null);
    for (let i = 1; i <= daysInMonth; i += 1) days.push(new Date(year, month, i));
    return days;
  };

  const getLeavesForDate = (date) => {
    if (!date) return [];
    const key = ymdLocal(date);
    return calendarMap[key] || [];
  };

  const navigateMonth = (dir) => {
    setCalDate((prev) => {
      const n = new Date(prev);
      n.setMonth(n.getMonth() + (dir === 'prev' ? -1 : 1));
      return n;
    });
    setSelectedDay(null);
  };

  const takeAdminAction = async (leaveId, status) => {
    const note = window.prompt(
      status === 'approved' ? 'Approval note (required)' : 'Rejection note (required)'
    );
    if (!note) return;
    await adminOverrideLeave(leaveId, { status, note });
    await load();
    await loadOverview();
  };

  const days = getDaysInMonth();
  const selectedLeaves = selectedDay ? getLeavesForDate(selectedDay) : [];
  const selectedHolidays = selectedDay ? getHolidaysForLocalDay(holidays, selectedDay) : [];
  const today = new Date();
  const isToday = (date) => date && date.toDateString() === today.toDateString();

  const summary = overview?.summary;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Admin Leave Overview</h1>
        <p className="text-sm text-gray-400 mt-1">
          Planned and current time off across the organization (approved and pending in range).
        </p>
      </div>

      <section className="rounded-xl border border-amber-500/25 bg-[#2A2A3A] p-4 ring-1 ring-amber-500/15">
        <h2 className="text-white font-medium flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 shrink-0" aria-hidden />
          Admin leave approval inbox
        </h2>
        <p className="text-xs text-gray-500 mt-1 mb-3">Requests requiring your decision appear here first.</p>
        {escalations.map((e) => (
          <div key={e._id} className="mt-2 rounded border border-gray-700 bg-[#1E1E2A] p-3 text-sm text-gray-200">
            <p className="font-medium text-white">{e.requesterName || 'Unknown User'}</p>
            <p className="text-gray-300">Type: {e.leaveTypeName || 'Unknown Leave Type'}</p>
            <p className="text-gray-300">
              Dates: {new Date(e.fromDate).toLocaleDateString()} - {new Date(e.toDate).toLocaleDateString()}
            </p>
            <p className="text-gray-400">Status: {e.status}</p>
            <p className="text-xs text-yellow-400 mt-1">
              {e.inboxReason === 'manager_self_request'
                ? 'Manager self-request (Admin action required)'
                : 'Escalated due to manager inaction'}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                className="rounded bg-green-600 px-3 py-1 text-white"
                onClick={() => takeAdminAction(e._id, 'approved')}
              >
                Approve
              </button>
              <button
                className="rounded bg-red-600 px-3 py-1 text-white"
                onClick={() => takeAdminAction(e._id, 'rejected')}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
        {escalations.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">No pending leave approvals requiring admin action.</p>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-700 bg-[#2A2A3A] p-2">
        <button
          type="button"
          onClick={() => setViewMode('dashboard')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === 'dashboard'
              ? 'bg-[#A88BFF] text-white'
              : 'text-gray-300 hover:bg-[#1E1E2A] hover:text-white'
          }`}
        >
          <LayoutDashboard size={18} />
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => setViewMode('calendar')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === 'calendar'
              ? 'bg-[#A88BFF] text-white'
              : 'text-gray-300 hover:bg-[#1E1E2A] hover:text-white'
          }`}
        >
          <CalendarIcon size={18} />
          Calendar
        </button>
      </div>

      {viewMode === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">On leave today</p>
              <p className="text-3xl font-bold text-white mt-1">{summary?.onLeaveNow ?? '—'}</p>
              <p className="text-xs text-gray-500 mt-2">Approved (company-wide)</p>
            </div>
            <div className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Upcoming (approved)</p>
              <p className="text-3xl font-bold text-emerald-300 mt-1">{summary?.plannedApproved ?? '—'}</p>
              <p className="text-xs text-gray-500 mt-2">Starts after today (company-wide)</p>
            </div>
            <div className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Pending in window</p>
              <p className="text-3xl font-bold text-amber-300 mt-1">{summary?.pendingInRange ?? '—'}</p>
              <p className="text-xs text-gray-500 mt-2">In the table date range</p>
            </div>
          </div>

          <section className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-white font-medium">Leave requests in window</h2>
                <p className="text-xs text-gray-500 mt-1">Last 7 days through the next 90 days</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'current', label: 'On leave now' },
                  { id: 'upcoming', label: 'Upcoming' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'past', label: 'Past / other' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTableFilter(f.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      tableFilter === f.id
                        ? 'bg-[#A88BFF] text-white'
                        : 'bg-[#1E1E2A] text-gray-300 border border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {overviewLoading ? (
              <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
            ) : filteredLeaves.length === 0 ? (
              <p className="text-sm text-gray-400 py-6">No leave records match this filter.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#1E1E2A] text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2">Employee</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">From</th>
                      <th className="px-3 py-2">To</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Bucket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 text-gray-200">
                    {filteredLeaves.map((row) => {
                      const seg = rowSegment(row);
                      return (
                        <tr key={`${row.legacy ? 'l' : 'v'}-${row._id}`} className="hover:bg-[#1E1E2A]/80">
                          <td className="px-3 py-2">
                            <div className="font-medium text-white">{row.employeeName}</div>
                            {row.employeeCode ? (
                              <div className="text-xs text-gray-500">{row.employeeCode}</div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">{row.leaveTypeName}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {new Date(row.fromDate).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {new Date(row.toDate).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 capitalize">{row.status}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs ${
                                seg.key === 'current'
                                  ? 'bg-violet-500/20 text-violet-200'
                                  : seg.key === 'upcoming'
                                    ? 'bg-emerald-500/20 text-emerald-200'
                                    : seg.key === 'pending'
                                      ? 'bg-amber-500/20 text-amber-200'
                                      : 'bg-gray-600/30 text-gray-400'
                              }`}
                            >
                              {seg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {viewMode === 'calendar' && (
        <section className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            <div className="rounded-lg border border-gray-700 bg-[#1E1E2A] px-3 py-2 text-center">
              <p className="text-[10px] uppercase text-gray-500">On leave today</p>
              <p className="text-lg font-semibold text-white">{summary?.onLeaveNow ?? '—'}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Company-wide</p>
            </div>
            <div className="rounded-lg border border-gray-700 bg-[#1E1E2A] px-3 py-2 text-center">
              <p className="text-[10px] uppercase text-gray-500">Future approved</p>
              <p className="text-lg font-semibold text-emerald-300">{summary?.plannedApproved ?? '—'}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Company-wide</p>
            </div>
            <div className="rounded-lg border border-gray-700 bg-[#1E1E2A] px-3 py-2 text-center">
              <p className="text-[10px] uppercase text-gray-500">Approved (grid month)</p>
              <p className="text-lg font-semibold text-violet-200">{summary?.approvedInRange ?? '—'}</p>
            </div>
            <div className="rounded-lg border border-gray-700 bg-[#1E1E2A] px-3 py-2 text-center">
              <p className="text-[10px] uppercase text-gray-500">Pending (grid month)</p>
              <p className="text-lg font-semibold text-amber-200">{summary?.pendingInRange ?? '—'}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Company-wide counts use all approved records. Month columns only include approved and pending requests
            that overlap the month shown. Holidays from Holiday master (active) are shown in teal. Click a day for
            details.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-3 text-[10px] text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-teal-400/80" />
              Holiday
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-amber-400/80" />
              Leave pending
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-violet-400/80" />
              Leave approved
            </span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-lg hover:bg-[#1E1E2A] text-gray-300"
              aria-label="Previous month"
            >
              <ChevronLeft size={22} />
            </button>
            <h2 className="text-lg font-semibold text-white">
              {calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className="p-2 rounded-lg hover:bg-[#1E1E2A] text-gray-300"
              aria-label="Next month"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {overviewLoading ? (
            <p className="text-sm text-gray-400 py-12 text-center">Loading calendar…</p>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">
                    {d}
                  </div>
                ))}
                {days.map((date, index) => {
                  const leaves = getLeavesForDate(date);
                  const dayHolidays = date ? getHolidaysForLocalDay(holidays, date) : [];
                  const sel =
                    selectedDay && date && date.toDateString() === selectedDay.toDateString();
                  const hasHoliday = dayHolidays.length > 0;
                  const holidayRowsUsed =
                    Math.min(dayHolidays.length, 2) + (dayHolidays.length > 2 ? 1 : 0);
                  const leaveSlots = Math.max(0, 3 - holidayRowsUsed);
                  const leavesShown = leaves.slice(0, leaveSlots);
                  return (
                    <div
                      key={index}
                      role="presentation"
                      onClick={() => date && setSelectedDay(date)}
                      className={[
                        'min-h-[76px] rounded-lg border p-1.5 transition-colors',
                        !date ? 'border-transparent' : 'border-gray-700 cursor-pointer hover:border-[#A88BFF]/60 bg-[#1E1E2A]/40',
                        date && isToday(date) ? 'ring-1 ring-[#A88BFF]' : '',
                        sel ? 'ring-2 ring-[#A88BFF]' : ''
                      ].join(' ')}
                    >
                      {date ? (
                        <>
                          <div className="flex items-center justify-between gap-0.5 mb-0.5">
                            <div
                              className={`text-xs font-medium ${isToday(date) ? 'text-[#A88BFF]' : 'text-gray-300'}`}
                            >
                              {date.getDate()}
                            </div>
                            {hasHoliday ? (
                              <Palmtree className="text-teal-400/90 shrink-0" size={12} aria-hidden />
                            ) : null}
                          </div>
                          <div className="space-y-0.5">
                            {dayHolidays.slice(0, 2).map((h) => (
                              <div
                                key={h._id}
                                className="text-[10px] leading-tight truncate rounded px-0.5 bg-teal-500/25 text-teal-100 border border-teal-500/20"
                                title={h.name}
                              >
                                {h.name}
                              </div>
                            ))}
                            {dayHolidays.length > 2 ? (
                              <div className="text-[10px] text-teal-300/80">+{dayHolidays.length - 2} holidays</div>
                            ) : null}
                            {leavesShown.map((lv, i) => (
                              <div
                                key={`${lv.id}-${i}`}
                                className={`text-[10px] leading-tight truncate rounded px-0.5 ${
                                  lv.status === 'pending'
                                    ? 'bg-amber-500/25 text-amber-200'
                                    : 'bg-violet-500/25 text-violet-100'
                                }`}
                                title={`${lv.employeeName} · ${lv.leaveType}`}
                              >
                                {lv.employeeName?.split?.(' ')?.[0] || lv.employeeName}
                              </div>
                            ))}
                            {leaves.length > leaveSlots ? (
                              <div className="text-[10px] text-gray-500">+{leaves.length - leaveSlots} leave</div>
                            ) : null}
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {selectedDay && (selectedHolidays.length > 0 || selectedLeaves.length > 0) ? (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-semibold text-white mb-3">
                    {selectedDay.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>
                  <div className="space-y-2">
                    {selectedHolidays.map((h) => (
                      <div
                        key={h._id}
                        className="rounded-lg border border-teal-500/30 bg-teal-500/10 p-3 text-sm text-gray-200"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Palmtree size={14} className="text-teal-400 shrink-0" />
                          <span className="font-medium text-white">{h.name}</span>
                          <span className="ml-auto text-[10px] uppercase px-2 py-0.5 rounded bg-teal-500/25 text-teal-100">
                            Holiday
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs">
                          {h.isRecurringYearly ? 'Recurring yearly · ' : ''}
                          {h.holidayType ? `${h.holidayType} · ` : ''}
                          {h.isOptional ? 'Optional observance' : 'Company calendar'}
                        </p>
                      </div>
                    ))}
                    {selectedLeaves.map((lv, idx) => (
                      <div
                        key={`${lv.id}-${idx}`}
                        className="rounded-lg border border-gray-700 bg-[#1E1E2A] p-3 text-sm text-gray-200"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Users size={14} className="text-gray-500 shrink-0" />
                          <span className="font-medium text-white">{lv.employeeName}</span>
                          {lv.employeeCode ? (
                            <span className="text-xs text-gray-500">({lv.employeeCode})</span>
                          ) : null}
                          <span
                            className={`ml-auto text-[10px] uppercase px-2 py-0.5 rounded ${
                              lv.status === 'pending' ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/20 text-emerald-200'
                            }`}
                          >
                            {lv.status}
                          </span>
                        </div>
                        <p className="text-gray-400">
                          <span className="text-gray-300">Type:</span> {lv.leaveType}
                        </p>
                        <p className="text-gray-400">
                          <span className="text-gray-300">Range:</span>{' '}
                          {new Date(lv.startDate).toLocaleDateString()} –{' '}
                          {new Date(lv.endDate).toLocaleDateString()}
                          {lv.numberOfDays != null ? ` · ${lv.numberOfDays} day(s)` : ''}
                        </p>
                        {lv.reason ? (
                          <p className="text-gray-500 text-xs mt-1">
                            <span className="text-gray-400">Reason:</span> {lv.reason}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedDay ? (
                <p className="text-sm text-gray-500 mt-3">No leave or company holiday entries on this day.</p>
              ) : null}
            </>
          )}
        </section>
      )}

    </div>
  );
};

export default AdminLeaveConfig;
