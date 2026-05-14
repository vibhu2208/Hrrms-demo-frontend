import React, { useMemo } from 'react';

const STATUS_STYLES = {
  present: { label: 'Present', className: 'bg-emerald-900/50 text-emerald-100 ring-1 ring-emerald-600/60' },
  paid_leave: { label: 'Paid Leave', className: 'bg-violet-900/70 text-violet-100 ring-1 ring-violet-500' },
  unpaid_leave: { label: 'Unpaid Leave', className: 'bg-amber-900/60 text-amber-100 ring-1 ring-amber-600' },
  half_day_leave: { label: 'Half-day Leave', className: 'bg-violet-900/50 text-violet-100 ring-1 ring-violet-500/80' },
  holiday: { label: 'Holiday', className: 'bg-sky-900/60 text-sky-100 ring-1 ring-sky-500' },
  week_off: { label: 'Week Off', className: 'bg-slate-700/70 text-slate-200 ring-1 ring-slate-500' },
  training: { label: 'Training', className: 'bg-cyan-900/50 text-cyan-100 ring-1 ring-cyan-600' },
  internal: { label: 'Internal', className: 'bg-teal-900/50 text-teal-100 ring-1 ring-teal-600' }
};

/** Days where the attendance strip is full-day non-work — block project hour inputs (half-day leave still allows project time). */
const PROJECT_HOURS_BLOCKED_STATUSES = ['paid_leave', 'unpaid_leave', 'holiday', 'week_off'];

/** Calendar day in local timezone (matches typical date picker / Monday week UI). */
const toLocalDateKey = (dateLike) => {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Calendar day in UTC (server often stores leave/timesheet at UTC noon). */
const toUtcDateKey = (dateLike) => {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** First YYYY-MM-DD segment if `entryDate` is an ISO string (stable calendar day from API). */
const isoDatePrefixKey = (entryDate) => {
  if (typeof entryDate !== 'string' || entryDate.length < 10) return '';
  const m = entryDate.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
};

/** True if this entry falls on the grid column `weekDayKey` (YYYY-MM-DD). */
const entryMatchesWeekDate = (entry, weekDayKey) => {
  if (!entry?.entryDate || !weekDayKey) return false;
  const raw = entry.entryDate;
  const keys = new Set();
  const prefix = isoDatePrefixKey(typeof raw === 'string' ? raw : '');
  if (prefix) keys.add(prefix);
  const d = raw instanceof Date ? raw : new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    keys.add(toLocalDateKey(d));
    keys.add(toUtcDateKey(d));
  }
  return keys.has(weekDayKey);
};

const getWeekDates = (weekStart) => {
  const raw = String(weekStart || '').trim();
  const parts = raw.split('-').map((n) => Number(n));
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    const start = new Date(parts[0], parts[1] - 1, parts[2]);
    if (!Number.isNaN(start.getTime())) {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return toLocalDateKey(d);
      });
    }
  }
  const start = new Date(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toLocalDateKey(d);
  });
};

const dateLabel = (dateStr) => {
  const d = new Date(dateStr);
  return {
    dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
    dayMonth: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  };
};

/** Column key for an entry: which week day column it belongs to (first match in week). */
const columnKeyForEntry = (entry, weekDates) =>
  weekDates.find((d) => entryMatchesWeekDate(entry, d)) || '';

/** Leave / holiday / week-off rows produced by the server (autofill or locked system slices). */
const isSystemAttendanceEntry = (entry) => {
  if (!entry) return false;
  const src = entry.source || '';
  if (['leave_autofill', 'holiday_autofill', 'week_off_autofill'].includes(src)) return true;
  const et = entry.entryType || '';
  if (entry.leaveRequestId) return true;
  if (entry.isEditable === false && ['leave', 'holiday', 'week_off'].includes(et)) return true;
  if (et === 'leave') return true;
  return false;
};

/**
 * Priority (highest wins): Holiday → Week off → Paid leave → Unpaid leave → Present (implicit).
 * Higher rank = higher priority.
 */
const entryAttendanceRank = (entry) => {
  const et = entry.entryType || '';
  const src = entry.source || '';
  const st = entry.attendanceStatus || '';
  if (et === 'holiday' || st === 'holiday' || src === 'holiday_autofill') return 500;
  if (et === 'week_off' || st === 'week_off' || src === 'week_off_autofill') return 400;
  const leaveLinked = Boolean(entry.leaveRequestId) || et === 'leave' || src === 'leave_autofill' || /leave/i.test(st);
  if (leaveLinked) {
    if (st === 'unpaid_leave' || entry.isPaidLeave === false) return 200;
    return 300;
  }
  return 0;
};

const inferAttendanceStatus = (entry) => {
  const st = entry.attendanceStatus;
  if (st && st !== 'present') return st;
  const et = entry.entryType || '';
  if (et === 'holiday') return 'holiday';
  if (et === 'week_off') return 'week_off';
  if (et === 'leave' || entry.leaveRequestId) return entry.isPaidLeave === false ? 'unpaid_leave' : 'paid_leave';
  return 'present';
};

/**
 * One consolidated state per calendar day for the attendance summary row.
 */
const buildConsolidatedAttendanceByDay = (allEntries, weekDates) => {
  const weekSet = new Set(weekDates);
  const system = allEntries.filter((e) => isSystemAttendanceEntry(e));
  const work = allEntries.filter((e) => !isSystemAttendanceEntry(e));

  const map = {};
  weekDates.forEach((d) => {
    map[d] = {
      status: 'present',
      payable: 0,
      leaveTypeName: null,
      workedFromProjects: 0
    };
  });

  weekDates.forEach((d) => {
    if (!weekSet.has(d)) return;
    const daySys = system.filter((e) => entryMatchesWeekDate(e, d));
    const dayWork = work.filter((e) => entryMatchesWeekDate(e, d));

    const workPayable = dayWork.reduce((s, e) => s + Number(e.payableHours != null ? e.payableHours : e.hours ?? 0), 0);
    const workWorked = dayWork.reduce((s, e) => s + Number(e.workedHours ?? e.hours ?? 0), 0);
    map[d].workedFromProjects = workWorked;

    let winner = null;
    let best = -1;
    for (const e of daySys) {
      const r = entryAttendanceRank(e);
      const ph = Number(e.payableHours != null ? e.payableHours : 0);
      if (r > best) {
        best = r;
        winner = e;
      } else if (r === best && r > 0 && winner) {
        const wph = Number(winner.payableHours != null ? winner.payableHours : 0);
        if (ph > wph) winner = e;
      }
    }

    if (daySys.length > 0) {
      const chosen = best > 0 && winner ? winner : daySys[0];
      const lt = chosen.leaveTypeId;
      const leaveTypeName = typeof lt === 'object' && lt?.name ? lt.name : chosen.leaveTypeName || null;
      map[d] = {
        status: inferAttendanceStatus(chosen),
        /** System-attributed payable only (matches badge); project hours stay in work rows. */
        payable: Number(chosen.payableHours != null ? chosen.payableHours : 0),
        leaveTypeName:
          leaveTypeName || (chosen.taskDescription && chosen.entryType === 'leave' ? chosen.taskDescription : null),
        workedFromProjects: workWorked
      };
    } else {
      map[d] = {
        status: 'present',
        payable: workPayable,
        leaveTypeName: null,
        workedFromProjects: workWorked
      };
    }
  });

  return map;
};

const rowKeyForEntry = (entry) =>
  `${entry.projectId || ''}__${entry.managerId || ''}__${entry.taskDescription || ''}__${entry.entryType || 'work'}__${entry.isBillable !== false}`;

const emptyDay = () => ({
  hours: 0,
  payable: 0,
  id: null,
  attendanceStatus: null,
  leaveTypeName: null,
  source: null,
  isPaidLeave: false,
  cellPaid: false,
  entryType: 'work'
});

const buildWorkRowsFromEntries = (entries, weekDates) => {
  const workOnly = entries.filter((e) => !isSystemAttendanceEntry(e));
  const weekSet = new Set(weekDates);
  const rowsMap = new Map();

  workOnly.forEach((entry) => {
    const entryDate = columnKeyForEntry(entry, weekDates);
    if (!entryDate || !weekSet.has(entryDate)) return;
    const rowKey = rowKeyForEntry(entry);
    if (!rowsMap.has(rowKey)) {
      rowsMap.set(rowKey, {
        rowKey,
        projectId: entry.projectId || '',
        managerId: entry.managerId || '',
        taskDescription: entry.taskDescription || '',
        entryType: entry.entryType || 'work',
        isBillable: entry.isBillable !== false,
        isEditable: entry.isEditable !== false,
        sliceStatus: entry.sliceStatus || 'draft',
        days: weekDates.reduce((acc, d) => ({ ...acc, [d]: emptyDay() }), {})
      });
    }
    const row = rowsMap.get(rowKey);
    const worked = Number(entry.workedHours ?? entry.hours ?? 0);
    const payable = Number(entry.payableHours != null ? entry.payableHours : worked);
    const lt = entry.leaveTypeId;
    const leaveTypeName = typeof lt === 'object' && lt?.name ? lt.name : entry.leaveTypeName || null;
    row.days[entryDate] = {
      hours: worked,
      payable,
      id: entry._id || null,
      attendanceStatus: entry.attendanceStatus || null,
      leaveTypeName,
      source: entry.source || null,
      isPaidLeave: entry.isPaidLeave !== false && entry.attendanceStatus !== 'unpaid_leave',
      entryType: entry.entryType || 'work',
      cellPaid: false
    };
  });

  const rows = Array.from(rowsMap.values());
  if (rows.length === 0) {
    rows.push({
      rowKey: 'new-row',
      projectId: '',
      managerId: '',
      taskDescription: '',
      entryType: 'work',
      isBillable: true,
      isEditable: true,
      sliceStatus: 'draft',
      days: weekDates.reduce((acc, d) => ({ ...acc, [d]: emptyDay() }), {})
    });
  }

  return rows;
};

const flattenWorkRowsToEntries = (workRows, weekDates, systemEntriesToPreserve) => {
  const flat = [];
  const weekSet = new Set(weekDates);

  workRows.forEach((row) => {
    weekDates.forEach((date) => {
      const day = row.days[date] || emptyDay();
      if ((day.hours || 0) > 0 || day.id) {
        flat.push({
          _id: day.id || undefined,
          entryDate: date,
          projectId: row.projectId,
          managerId: row.managerId || '',
          taskDescription: row.taskDescription,
          hours: Number(day.hours || 0),
          workedHours: Number(day.hours || 0),
          payableHours: Number(day.payable != null ? day.payable : day.hours || 0),
          entryType: day.entryType || row.entryType,
          isBillable: row.isBillable,
          sliceStatus: row.sliceStatus,
          isEditable: row.isEditable,
          attendanceStatus: day.attendanceStatus,
          source: day.source
        });
      }
    });
  });

  systemEntriesToPreserve.forEach((e) => {
    if (weekDates.some((d) => entryMatchesWeekDate(e, d))) flat.push(e);
  });

  return flat;
};

const AttendanceBadge = ({ status, compact }) => {
  const meta = STATUS_STYLES[status] || STATUS_STYLES.present;
  const cls = compact
    ? `${meta.className} px-1 py-0.5 text-[9px]`
    : `${meta.className} px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide`;
  return <span className={`inline-block rounded font-semibold ${cls}`}>{meta.label}</span>;
};

const GRID_COLS = 'grid grid-cols-[260px_repeat(7,minmax(120px,1fr))_160px]';

const TimesheetGrid = ({
  entries,
  setEntries,
  projects,
  allProjectOptions = [],
  segregationMode = 'project',
  weekStart,
  readOnly = false
}) => {
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const systemEntriesSnapshot = useMemo(
    () => (Array.isArray(entries) ? entries.filter(isSystemAttendanceEntry) : []),
    [entries]
  );

  const attendanceByDay = useMemo(
    () => buildConsolidatedAttendanceByDay(entries || [], weekDates),
    [entries, weekDates]
  );

  const projectHoursBlockedByDay = useMemo(() => {
    const m = {};
    weekDates.forEach((d) => {
      const st = attendanceByDay[d]?.status || 'present';
      m[d] = PROJECT_HOURS_BLOCKED_STATUSES.includes(st);
    });
    return m;
  }, [weekDates, attendanceByDay]);

  const rows = useMemo(() => buildWorkRowsFromEntries(entries || [], weekDates), [entries, weekDates]);

  const projectLookup = allProjectOptions.reduce((acc, project) => {
    acc[project.id] = project;
    return acc;
  }, {});

  const updateRow = (rowKey, updater) => {
    if (readOnly) return;
    setEntries((prev) => {
      const preserved = (prev || []).filter(isSystemAttendanceEntry);
      const prevRows = buildWorkRowsFromEntries(prev || [], weekDates);
      const nextRows = prevRows.map((row) => (row.rowKey === rowKey ? updater(row) : row));
      return flattenWorkRowsToEntries(nextRows, weekDates, preserved);
    });
  };

  const removeRow = (rowKey) => {
    if (readOnly) return;
    setEntries((prev) => {
      const preserved = (prev || []).filter(isSystemAttendanceEntry);
      const prevRows = buildWorkRowsFromEntries(prev || [], weekDates);
      const nextRows = prevRows.filter((row) => row.rowKey !== rowKey);
      return flattenWorkRowsToEntries(nextRows, weekDates, preserved);
    });
  };

  const groupedWorkRows = rows.reduce((acc, row) => {
    const project = projectLookup[row.projectId];
    const projectName = project?.name || 'Unassigned Project';
    const selectedManager = (project?.managerOptions || []).find((manager) => (manager.id || '') === (row.managerId || ''));
    const managerName = selectedManager?.name || project?.managerName || 'Unassigned Manager';
    const groupKey = segregationMode === 'manager' ? managerName : projectName;
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(row);
    return acc;
  }, {});

  const workedWeekTotal = rows.reduce(
    (sum, row) => sum + weekDates.reduce((s, date) => s + Number(row.days[date]?.hours || 0), 0),
    0
  );

  const cellPayableTotal = (cell) => {
    if (!cell) return 0;
    if (cell.payable != null && cell.payable !== '') return Number(cell.payable);
    return Number(cell.hours || 0);
  };

  const payableFromWorkRows = rows.reduce(
    (sum, row) => sum + weekDates.reduce((s, date) => s + cellPayableTotal(row.days[date]), 0),
    0
  );

  const payableFromSystem = systemEntriesSnapshot.reduce(
    (sum, e) => sum + Number(e.payableHours != null ? e.payableHours : 0),
    0
  );

  const payableWeekTotal = payableFromWorkRows + payableFromSystem;

  const attendanceRowPayableTotal = weekDates.reduce((s, d) => s + Number(attendanceByDay[d]?.payable || 0), 0);

  return (
    <div className="w-full rounded-xl border border-gray-800 bg-[#06090f]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 px-3 py-2 text-xs text-gray-300">
        <span>
          Week totals: <span className="font-semibold text-white">{workedWeekTotal}h</span> worked (projects)
        </span>
        <span>
          Payable (payroll, all): <span className="font-semibold text-emerald-300">{payableWeekTotal}h</span>
        </span>
      </div>

      <div className="space-y-3 overflow-x-auto p-2">
        <div className="rounded-lg border border-gray-700/80 bg-[#0c1018]">
          <div className="min-w-[1300px]">
            <div className={`${GRID_COLS} bg-[#111827]`}>
              <div className="border-r border-gray-800 p-3 text-xs font-semibold uppercase tracking-wide text-gray-300">
                Week
              </div>
              {weekDates.map((date) => {
                const label = dateLabel(date);
                return (
                  <div key={date} className="border-r border-gray-800 p-3 text-center text-white">
                    <div className="text-xs text-gray-300">{label.dayName}</div>
                    <div className="text-sm font-semibold">{label.dayMonth}</div>
                  </div>
                );
              })}
              <div className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-300">Totals</div>
            </div>

            {/* Section 1 — consolidated attendance */}
            <div className={`${GRID_COLS} border-t border-gray-800/80 bg-[#0e141f]`}>
              <div className="border-r border-gray-800 p-2">
                <p className="text-xs font-semibold text-gray-200">Attendance (system)</p>
                <p className="mt-0.5 text-[10px] leading-snug text-gray-500">
                  One state per day: holiday → week off → paid leave → unpaid leave → present.
                </p>
              </div>
              {weekDates.map((date) => {
                const cell = attendanceByDay[date] || { status: 'present', payable: 0, leaveTypeName: null };
                const st = cell.status || 'present';
                return (
                  <div key={`att-${date}`} className="border-r border-gray-800 p-1.5">
                    <div className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded border border-gray-700/50 bg-[#080c14] px-1 py-1.5 text-center">
                      <AttendanceBadge status={st} compact />
                      <div className={`text-xs font-semibold ${Number(cell.payable) > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {Number(cell.payable)}h <span className="font-normal text-gray-500">pay</span>
                      </div>
                      {cell.leaveTypeName ? (
                        <span className="line-clamp-2 max-w-full text-[9px] text-cyan-200/80">{cell.leaveTypeName}</span>
                      ) : st === 'present' && cell.workedFromProjects > 0 ? (
                        <span className="text-[9px] text-gray-500">{cell.workedFromProjects}h worked</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              <div
                className="flex flex-col items-center justify-center p-2 text-center text-white"
                title="Sum of per-day values shown (system row). Full week payable is the top banner."
              >
                <span className="text-[10px] uppercase text-gray-500">Row sum</span>
                <span className="text-sm font-semibold text-emerald-300/90">{attendanceRowPayableTotal}h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 — project / work entries */}
        <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Project time (editable; full-day leave, holiday, and week off lock hours for that day)
        </p>
        {Object.entries(groupedWorkRows).map(([groupKey, groupItems]) => {
          const headerLabel =
            segregationMode === 'manager' ? `Reporting Manager: ${groupKey}` : `Project: ${groupKey}`;
          return (
            <div key={groupKey} className="rounded-lg border border-gray-800 bg-[#0a0f17]">
              <div className="border-b border-gray-800 px-3 py-2 text-sm font-semibold text-cyan-300">{headerLabel}</div>
              <div className="min-w-[1300px]">
                <div className={`${GRID_COLS} bg-[#111827]`}>
                  <div className="border-r border-gray-800 p-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Project / Task
                  </div>
                  {weekDates.map((date) => {
                    const label = dateLabel(date);
                    return (
                      <div key={date} className="border-r border-gray-800 p-2 text-center text-white">
                        <div className="text-[10px] text-gray-400">{label.dayName}</div>
                        <div className="text-xs font-semibold">{label.dayMonth}</div>
                      </div>
                    );
                  })}
                  <div className="p-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">Totals</div>
                </div>

                {groupItems.map((row) => {
                  const rowWorked = weekDates.reduce((sum, date) => sum + Number(row.days[date]?.hours || 0), 0);
                  const rowPayable = weekDates.reduce((sum, date) => sum + cellPayableTotal(row.days[date]), 0);
                  const rowInputsDisabled = readOnly || row.isEditable === false;
                  return (
                    <div key={row.rowKey} className={`${GRID_COLS} border-t border-gray-900 bg-[#0b1220]`}>
                      <div className="border-r border-gray-900 p-2">
                        <select
                          className="mb-1 w-full rounded border border-gray-700 bg-[#090f19] p-1 text-xs text-white"
                          value={row.projectId || ''}
                          onChange={(e) =>
                            updateRow(row.rowKey, (curr) => {
                              const selectedProject = projectLookup[e.target.value];
                              const defaultManagerId = selectedProject?.managerOptions?.[0]?.id || '';
                              return { ...curr, projectId: e.target.value, managerId: defaultManagerId };
                            })
                          }
                          disabled={rowInputsDisabled}
                        >
                          <option value="">Select project</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.label}
                            </option>
                          ))}
                        </select>
                        <select
                          className="mb-1 w-full rounded border border-gray-700 bg-[#090f19] p-1 text-xs text-white"
                          value={row.managerId || ''}
                          onChange={(e) => updateRow(row.rowKey, (curr) => ({ ...curr, managerId: e.target.value }))}
                          disabled={rowInputsDisabled || !row.projectId}
                        >
                          <option value="">{row.projectId ? 'Select manager' : 'Select project first'}</option>
                          {((projectLookup[row.projectId]?.managerOptions) || []).map((manager) => (
                            <option key={manager.id || manager.name} value={manager.id || ''}>
                              {manager.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className="w-full rounded border border-gray-700 bg-[#090f19] p-1 text-xs text-white"
                          placeholder="Task"
                          value={row.taskDescription || ''}
                          onChange={(e) => updateRow(row.rowKey, (curr) => ({ ...curr, taskDescription: e.target.value }))}
                          disabled={rowInputsDisabled}
                        />
                      </div>
                      {weekDates.map((date) => {
                        const cell = row.days[date] || emptyDay();
                        const dayBlocked = projectHoursBlockedByDay[date];
                        return (
                          <div key={`${row.rowKey}-${date}`} className="border-r border-gray-900 p-2">
                            <input
                              className={`w-full rounded border border-gray-700 bg-[#090f19] p-1 text-center text-white ${
                                dayBlocked ? 'cursor-not-allowed opacity-60' : ''
                              }`}
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={cell.hours ?? 0}
                              onChange={(e) => {
                                if (readOnly || rowInputsDisabled || dayBlocked) return;
                                const value = Number(e.target.value || 0);
                                updateRow(row.rowKey, (curr) => ({
                                  ...curr,
                                  days: {
                                    ...curr.days,
                                    [date]: {
                                      ...(curr.days[date] || emptyDay()),
                                      hours: value,
                                      payable: value
                                    }
                                  }
                                }));
                              }}
                              disabled={rowInputsDisabled || dayBlocked}
                              title={
                                dayBlocked
                                  ? 'Full-day leave, holiday, or week off — project hours are not available for this day.'
                                  : undefined
                              }
                            />
                          </div>
                        );
                      })}
                      <div className="flex flex-col items-center justify-center gap-1 p-2 text-white">
                        <div className="text-center text-[10px] uppercase text-gray-500">Worked</div>
                        <span className="text-sm font-semibold">{rowWorked}h</span>
                        <div className="text-center text-[10px] uppercase text-gray-500">Payable</div>
                        <span className={`text-sm font-semibold ${rowPayable > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                          {rowPayable}h
                        </span>
                        <button
                          className="rounded bg-red-700 px-2 py-1 text-[10px] text-white disabled:opacity-50"
                          onClick={() => removeRow(row.rowKey)}
                          disabled={rowInputsDisabled}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimesheetGrid;
