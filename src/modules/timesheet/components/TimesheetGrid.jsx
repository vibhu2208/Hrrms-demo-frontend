import React, { useMemo } from 'react';
import { ATTENDANCE_STATUS, surface } from '../timesheetUi';

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

const emptyDay = (overrides = {}) => ({
  hours: 0,
  payable: 0,
  id: null,
  attendanceStatus: null,
  leaveTypeName: null,
  source: null,
  isPaidLeave: false,
  cellPaid: false,
  entryType: 'work',
  sliceStatus: 'draft',
  sentBackReason: null,
  isEditable: true,
  ...overrides
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
      cellPaid: false,
      sliceStatus: entry.sliceStatus || 'draft',
      sentBackReason: entry.sentBackReason || null,
      isEditable: entry.isEditable !== false
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

const flattenWorkRowsToEntries = (workRows, weekDates, systemEntriesToPreserve, sentBackByDay = {}) => {
  const flat = [];
  const weekSet = new Set(weekDates);

  workRows.forEach((row) => {
    weekDates.forEach((date) => {
      const day = row.days[date] || emptyDay();
      if ((day.hours || 0) > 0 || day.id) {
        const onSentBackDay = Boolean(sentBackByDay[date]);
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
          sliceStatus: day.sliceStatus || (onSentBackDay ? 'sent_back' : row.sliceStatus || 'draft'),
          sentBackReason: day.sentBackReason || sentBackByDay[date] || null,
          isEditable: day.isEditable !== false,
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
  const meta = ATTENDANCE_STATUS[status] || ATTENDANCE_STATUS.present;
  const size = compact ? 'text-[10px] px-1.5 py-0' : 'text-[11px] px-2 py-0.5';
  return <span className={`badge ${meta.badge} ${size}`}>{meta.label}</span>;
};

const GRID_COLS = 'grid grid-cols-[240px_repeat(7,minmax(108px,1fr))_140px]';
const cellBorder = 'border-r theme-border';
const headerCell = `${cellBorder} p-2.5 text-xs font-medium theme-text-secondary`;

/** `full` = draft week; `corrections` = only manager sent-back days; `locked` = no edits */
const TimesheetGrid = ({
  entries,
  setEntries,
  projects,
  allProjectOptions = [],
  segregationMode = 'project',
  weekStart,
  readOnly = false,
  editMode = 'full'
}) => {
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const effectiveEditMode = readOnly ? 'locked' : editMode;

  const sentBackByDay = useMemo(() => {
    const map = {};
    (entries || []).forEach((entry) => {
      if ((entry.entryType || 'work') !== 'work') return;
      if (entry.sliceStatus !== 'sent_back' || entry.isEditable === false) return;
      const reason = (entry.sentBackReason || '').trim() || 'Returned for correction';
      weekDates.forEach((d) => {
        if (entryMatchesWeekDate(entry, d)) map[d] = reason;
      });
    });
    return map;
  }, [entries, weekDates]);

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

  const isCellEditable = (date) => {
    if (effectiveEditMode === 'locked') return false;
    if (projectHoursBlockedByDay[date]) return false;
    if (effectiveEditMode === 'full') return true;
    if (effectiveEditMode === 'corrections') return Boolean(sentBackByDay[date]);
    return false;
  };

  const rowHasEditableCell = (row) => weekDates.some((d) => isCellEditable(d));

  const rows = useMemo(() => buildWorkRowsFromEntries(entries || [], weekDates), [entries, weekDates]);

  const projectLookup = allProjectOptions.reduce((acc, project) => {
    acc[project.id] = project;
    return acc;
  }, {});

  const updateRow = (rowKey, updater) => {
    if (effectiveEditMode === 'locked') return;
    setEntries((prev) => {
      const preserved = (prev || []).filter(isSystemAttendanceEntry);
      const prevRows = buildWorkRowsFromEntries(prev || [], weekDates);
      const nextRows = prevRows.map((row) => (row.rowKey === rowKey ? updater(row) : row));
      return flattenWorkRowsToEntries(nextRows, weekDates, preserved, sentBackByDay);
    });
  };

  const removeRow = (rowKey) => {
    if (effectiveEditMode === 'locked') return;
    setEntries((prev) => {
      const preserved = (prev || []).filter(isSystemAttendanceEntry);
      const prevRows = buildWorkRowsFromEntries(prev || [], weekDates);
      const nextRows = prevRows.filter((row) => row.rowKey !== rowKey);
      return flattenWorkRowsToEntries(nextRows, weekDates, preserved, sentBackByDay);
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

  const sentBackDayList = weekDates.filter((d) => sentBackByDay[d]);
  const formatSentBackDate = (ymd) => {
    const d = new Date(`${ymd}T12:00:00`);
    if (Number.isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="w-full">
      {sentBackDayList.length > 0 ? (
        <div className={`${surface.section} border-b theme-border bg-amber-500/5`}>
          <p className="text-sm font-medium theme-text">Days returned for correction</p>
          <p className={`${surface.muted} mt-1`}>
            Only highlighted columns are editable. Update those days, save, then submit again.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {sentBackDayList.map((d) => (
              <li
                key={d}
                className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-xs theme-text"
              >
                <span className="font-medium">{formatSentBackDate(d)}</span>
                <span className="mx-1.5 theme-text-secondary">·</span>
                <span className="theme-text-secondary">{sentBackByDay[d]}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className={`${surface.section} flex flex-wrap items-center justify-between gap-2 border-b theme-border text-xs`}>
        <span className="theme-text-secondary">
          Worked <span className="font-semibold theme-text">{workedWeekTotal}h</span>
        </span>
        <span className="theme-text-secondary">
          Payable <span className="font-semibold theme-text">{payableWeekTotal}h</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1180px]">
            <div className={`${GRID_COLS} theme-surface border-b theme-border`}>
              <div className={headerCell}>Week</div>
              {weekDates.map((date) => {
                const label = dateLabel(date);
                const sentBack = sentBackByDay[date];
                return (
                  <div
                    key={date}
                    className={`${headerCell} text-center ${sentBack ? 'bg-amber-500/5' : ''}`}
                  >
                    <div className="theme-text-secondary">{label.dayName}</div>
                    <div className="text-sm font-medium theme-text">{label.dayMonth}</div>
                    {sentBack ? <div className="mt-0.5 text-[10px] text-amber-500/90">Sent back</div> : null}
                  </div>
                );
              })}
              <div className={`${headerCell} text-center`}>Totals</div>
            </div>

            {/* Section 1 — consolidated attendance */}
            <div className={`${GRID_COLS} border-b theme-border`}>
              <div className={`${cellBorder} p-2`}>
                <p className="text-xs font-medium theme-text">Attendance</p>
                <p className={`${surface.muted} mt-0.5`}>System-applied per day</p>
              </div>
              {weekDates.map((date) => {
                const cell = attendanceByDay[date] || { status: 'present', payable: 0, leaveTypeName: null };
                const st = cell.status || 'present';
                return (
                  <div key={`att-${date}`} className={`${cellBorder} p-1.5`}>
                    <div className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-md border theme-border theme-surface px-1 py-1.5 text-center">
                      <AttendanceBadge status={st} compact />
                      <div className={`text-xs font-medium ${Number(cell.payable) > 0 ? 'theme-text' : 'theme-text-secondary'}`}>
                        {Number(cell.payable)}h <span className="font-normal opacity-70">pay</span>
                      </div>
                      {cell.leaveTypeName ? (
                        <span className="line-clamp-2 max-w-full text-[10px] theme-text-secondary">{cell.leaveTypeName}</span>
                      ) : st === 'present' && cell.workedFromProjects > 0 ? (
                        <span className={surface.muted}>{cell.workedFromProjects}h worked</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-col items-center justify-center p-2 text-center" title="Attendance row sum">
                <span className={surface.muted}>Sum</span>
                <span className="text-sm font-medium theme-text">{attendanceRowPayableTotal}h</span>
              </div>
            </div>
          </div>

        {/* Section 2 — project / work entries */}
        <p className={`${surface.section} ${surface.muted} border-b theme-border`}>
          Project time — full-day leave, holiday, and week off lock project hours for that day
        </p>
        {Object.entries(groupedWorkRows).map(([groupKey, groupItems]) => {
          const headerLabel =
            segregationMode === 'manager' ? `Reporting Manager: ${groupKey}` : `Project: ${groupKey}`;
          return (
            <div key={groupKey} className="border-b theme-border">
              <div className={`${surface.section} border-b theme-border text-sm font-medium theme-text`}>{headerLabel}</div>
              <div className="min-w-[1300px]">
                <div className={`${GRID_COLS} theme-surface`}>
                  <div className={headerCell}>Project / task</div>
                  {weekDates.map((date) => {
                    const label = dateLabel(date);
                    const sentBack = sentBackByDay[date];
                    return (
                      <div
                        key={date}
                        className={`${headerCell} text-center ${sentBack ? 'bg-amber-500/5' : ''}`}
                      >
                        <div className="theme-text-secondary text-[10px]">{label.dayName}</div>
                        <div className="text-xs font-medium theme-text">{label.dayMonth}</div>
                        {sentBack ? (
                          <div className="mt-1 text-[10px] text-amber-500/90">Sent back</div>
                        ) : null}
                      </div>
                    );
                  })}
                  <div className={`${headerCell} text-center`}>Totals</div>
                </div>

                {groupItems.map((row) => {
                  const rowWorked = weekDates.reduce((sum, date) => sum + Number(row.days[date]?.hours || 0), 0);
                  const rowPayable = weekDates.reduce((sum, date) => sum + cellPayableTotal(row.days[date]), 0);
                  const rowInputsDisabled = !rowHasEditableCell(row);
                  return (
                    <div key={row.rowKey} className={`${GRID_COLS} border-t theme-border`}>
                      <div className={`${cellBorder} p-2`}>
                        <select
                          className={`${surface.select} w-full mb-1 !py-1 !text-xs`}
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
                          className={`${surface.select} w-full mb-1 !py-1 !text-xs`}
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
                          className={`${surface.input} w-full !py-1 !text-xs`}
                          placeholder="Task"
                          value={row.taskDescription || ''}
                          onChange={(e) => updateRow(row.rowKey, (curr) => ({ ...curr, taskDescription: e.target.value }))}
                          disabled={rowInputsDisabled}
                        />
                      </div>
                      {weekDates.map((date) => {
                        const cell = row.days[date] || emptyDay();
                        const dayBlocked = projectHoursBlockedByDay[date];
                        const cellEditable = isCellEditable(date);
                        const managerNote = sentBackByDay[date];
                        return (
                          <div key={`${row.rowKey}-${date}`} className={`${cellBorder} p-2`}>
                            <input
                              className={`${surface.inputCompact} ${
                                dayBlocked
                                  ? 'cursor-not-allowed opacity-50'
                                  : managerNote
                                    ? '!border-amber-500/60 ring-1 ring-amber-500/30'
                                    : !cellEditable
                                      ? 'cursor-not-allowed opacity-50'
                                      : ''
                              }`}
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={cell.hours ?? 0}
                              onChange={(e) => {
                                if (!cellEditable || dayBlocked) return;
                                const value = Number(e.target.value || 0);
                                const sentBackDefaults = managerNote
                                  ? { sliceStatus: 'sent_back', sentBackReason: managerNote }
                                  : {};
                                updateRow(row.rowKey, (curr) => ({
                                  ...curr,
                                  days: {
                                    ...curr.days,
                                    [date]: {
                                      ...(curr.days[date] || emptyDay(sentBackDefaults)),
                                      ...sentBackDefaults,
                                      hours: value,
                                      payable: value
                                    }
                                  }
                                }));
                              }}
                              disabled={!cellEditable || dayBlocked}
                              title={
                                dayBlocked
                                  ? 'Full-day leave, holiday, or week off — project hours are not available for this day.'
                                  : managerNote
                                    ? `Returned for correction: ${managerNote}`
                                    : !cellEditable
                                      ? 'This day is locked while your timesheet is under review.'
                                      : undefined
                              }
                            />
                          </div>
                        );
                      })}
                      <div className="flex flex-col items-center justify-center gap-1 p-2">
                        <div className={`text-center ${surface.muted}`}>Worked</div>
                        <span className="text-sm font-medium theme-text">{rowWorked}h</span>
                        <div className={`text-center ${surface.muted}`}>Payable</div>
                        <span className={`text-sm font-medium ${rowPayable > 0 ? 'theme-text' : 'theme-text-secondary'}`}>
                          {rowPayable}h
                        </span>
                        <button
                          className={`${surface.btnDanger} disabled:opacity-50`}
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
