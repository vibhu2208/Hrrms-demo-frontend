import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Trash2 } from 'lucide-react';
import { attendancePillMeta, formatHours, normalizeRefId, ts } from '../timesheetUi';

const PROJECT_HOURS_BLOCKED_STATUSES = ['paid_leave', 'unpaid_leave', 'holiday', 'week_off'];

const toLocalDateKey = (dateLike) => {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toUtcDateKey = (dateLike) => {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isoDatePrefixKey = (entryDate) => {
  if (typeof entryDate !== 'string' || entryDate.length < 10) return '';
  const m = entryDate.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
};

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
  const d = new Date(`${dateStr}T12:00:00`);
  return {
    dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
    dayMonth: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  };
};

const columnKeyForEntry = (entry, weekDates) =>
  weekDates.find((d) => entryMatchesWeekDate(entry, d)) || '';

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

const buildConsolidatedAttendanceByDay = (allEntries, weekDates) => {
  const weekSet = new Set(weekDates);
  const system = allEntries.filter((e) => isSystemAttendanceEntry(e));
  const work = allEntries.filter((e) => !isSystemAttendanceEntry(e));
  const map = {};
  weekDates.forEach((d) => {
    map[d] = { status: 'present', payable: 0, leaveTypeName: null, workedFromProjects: 0 };
  });

  weekDates.forEach((d) => {
    if (!weekSet.has(d)) return;
    const daySys = system.filter((e) => entryMatchesWeekDate(e, d));
    const dayWork = work.filter((e) => entryMatchesWeekDate(e, d));
    const workWorked = dayWork.reduce((s, e) => s + Number(e.workedHours ?? e.hours ?? 0), 0);

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
        payable: Number(chosen.payableHours != null ? chosen.payableHours : 0),
        leaveTypeName:
          leaveTypeName || (chosen.taskDescription && chosen.entryType === 'leave' ? chosen.taskDescription : null),
        workedFromProjects: workWorked
      };
    } else {
      map[d] = {
        status: 'present',
        payable: dayWork.reduce((s, e) => s + Number(e.payableHours != null ? e.payableHours : e.hours ?? 0), 0),
        leaveTypeName: null,
        workedFromProjects: workWorked
      };
    }
  });
  return map;
};

const rowKeyForEntry = (entry) =>
  `${normalizeRefId(entry.projectId)}__${normalizeRefId(entry.managerId)}__${entry.taskDescription || ''}__${entry.entryType || 'work'}__${entry.isBillable !== false}`;

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
        projectId: normalizeRefId(entry.projectId),
        managerId: normalizeRefId(entry.managerId),
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
  workRows.forEach((row) => {
    const projectId = normalizeRefId(row.projectId);
    const managerId = normalizeRefId(row.managerId);
    const taskDescription = row.taskDescription || '';
    let emitted = false;

    weekDates.forEach((date) => {
      const day = row.days[date] || emptyDay();
      if ((day.hours || 0) > 0 || day.id) {
        emitted = true;
        const onSentBackDay = Boolean(sentBackByDay[date]);
        flat.push({
          _id: day.id || undefined,
          entryDate: date,
          projectId,
          managerId,
          taskDescription,
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

    // Keep draft row metadata in entries so project/manager can be set before hours are entered.
    if (!emitted && (projectId || managerId || taskDescription.trim())) {
      flat.push({
        entryDate: weekDates[0],
        projectId,
        managerId,
        taskDescription,
        hours: 0,
        workedHours: 0,
        payableHours: 0,
        entryType: row.entryType || 'work',
        isBillable: row.isBillable,
        sliceStatus: row.sliceStatus || 'draft',
        isEditable: row.isEditable !== false
      });
    }
  });
  systemEntriesToPreserve.forEach((e) => {
    if (weekDates.some((d) => entryMatchesWeekDate(e, d))) flat.push(e);
  });
  return flat;
};

const HourInput = ({ value, onChange, disabled, warn, title }) => (
  <input
    type="number"
    min="0"
    max="24"
    step="0.5"
    className={`${ts.hourInput} !h-8 ${warn ? ts.hourInputWarn : ''}`}
    value={value ?? 0}
    onChange={onChange}
    disabled={disabled}
    title={title}
    placeholder="0"
    aria-label="Hours"
  />
);

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
  const [collapsedGroups, setCollapsedGroups] = useState({});

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
      m[d] = PROJECT_HOURS_BLOCKED_STATUSES.includes(attendanceByDay[d]?.status || 'present');
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

  const rows = useMemo(() => buildWorkRowsFromEntries(entries || [], weekDates), [entries, weekDates]);

  const projectLookup = allProjectOptions.reduce((acc, project) => {
    const id = normalizeRefId(project.id);
    if (id) acc[id] = project;
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

  const copyRowToNextDay = (rowKey, fromDate) => {
    const idx = weekDates.indexOf(fromDate);
    if (idx < 0 || idx >= 6) return;
    const toDate = weekDates[idx + 1];
    if (!isCellEditable(toDate) || projectHoursBlockedByDay[toDate]) return;
    updateRow(rowKey, (curr) => {
      const src = curr.days[fromDate] || emptyDay();
      return {
        ...curr,
        days: {
          ...curr.days,
          [toDate]: { ...(curr.days[toDate] || emptyDay()), hours: src.hours, payable: src.payable }
        }
      };
    });
  };

  const groupedWorkRows = rows.reduce((acc, row) => {
    const project = projectLookup[normalizeRefId(row.projectId)];
    const projectName = project?.name || 'Unassigned project';
    const selectedManager = (project?.managerOptions || []).find((m) => (m.id || '') === (row.managerId || ''));
    const managerName = selectedManager?.name || project?.managerName || 'Unassigned';
    const groupKey = segregationMode === 'manager' ? managerName : projectName;
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(row);
    return acc;
  }, {});

  const cellPayableTotal = (cell) => {
    if (!cell) return 0;
    if (cell.payable != null && cell.payable !== '') return Number(cell.payable);
    return Number(cell.hours || 0);
  };

  const workedWeekTotal = rows.reduce(
    (sum, row) => sum + weekDates.reduce((s, date) => s + Number(row.days[date]?.hours || 0), 0),
    0
  );

  const payableFromWorkRows = rows.reduce(
    (sum, row) => sum + weekDates.reduce((s, date) => s + cellPayableTotal(row.days[date]), 0),
    0
  );

  const payableFromSystem = systemEntriesSnapshot.reduce(
    (sum, e) => sum + Number(e.payableHours != null ? e.payableHours : 0),
    0
  );

  const payableWeekTotal = payableFromWorkRows + payableFromSystem;

  const overtimeHours = useMemo(() => {
    let ot = 0;
    weekDates.forEach((d) => {
      const dayWork = rows.reduce((s, row) => s + Number(row.days[d]?.hours || 0), 0);
      if (dayWork > 8) ot += dayWork - 8;
    });
    return Number(ot.toFixed(1));
  }, [rows, weekDates]);

  const sentBackDayList = weekDates.filter((d) => sentBackByDay[d]);
  const groupKeys = Object.keys(groupedWorkRows);
  const attendanceRowPayableTotal = weekDates.reduce((s, d) => s + Number(attendanceByDay[d]?.payable || 0), 0);

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isGroupCollapsed = (key) => collapsedGroups[key] === true;

  const renderHourCell = (row, date) => {
    const cell = row.days[date] || emptyDay();
    const dayBlocked = projectHoursBlockedByDay[date];
    const cellEditable = isCellEditable(date);
    const managerNote = sentBackByDay[date];
    return (
      <div key={`${row.rowKey}-${date}`}>
        <HourInput
          value={cell.hours ?? 0}
          warn={Boolean(managerNote)}
          disabled={!cellEditable || dayBlocked}
          title={
            dayBlocked
              ? 'Leave / holiday / week off — no project hours'
              : managerNote || (!cellEditable ? 'Locked' : undefined)
          }
          onChange={(e) => {
            if (!cellEditable || dayBlocked) return;
            const value = Number(e.target.value || 0);
            const sentBackDefaults = managerNote ? { sliceStatus: 'sent_back', sentBackReason: managerNote } : {};
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
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Week summary chips */}
      <div className="flex flex-wrap gap-2">
        <div className={ts.statChip}>
          <span className="text-slate-500">Worked</span>
          <span className="font-bold text-slate-100 tabular-nums">{formatHours(workedWeekTotal)}</span>
        </div>
        <div className={ts.statChip}>
          <span className="text-slate-500">Payable</span>
          <span className="font-bold text-emerald-300 tabular-nums">{formatHours(payableWeekTotal)}</span>
        </div>
        <div className={ts.statChip}>
          <span className="text-slate-500">Overtime</span>
          <span className="font-bold text-amber-300 tabular-nums">{formatHours(overtimeHours)}</span>
        </div>
        <div className={ts.statChip}>
          <span className="text-slate-500">Projects</span>
          <span className="font-bold text-slate-100 tabular-nums">
            {rows.filter((r) => normalizeRefId(r.projectId)).length}
          </span>
        </div>
      </div>

      {sentBackDayList.length > 0 ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
          <p className="text-sm font-medium text-amber-100">Days returned for correction</p>
          <p className="text-xs text-amber-200/70 mt-0.5">Only highlighted days are editable.</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {sentBackDayList.map((d) => (
              <li
                key={d}
                className="rounded-md bg-amber-500/10 border border-amber-500/25 px-2 py-1 text-[11px] text-amber-100"
              >
                {dateLabel(d).dayName} {dateLabel(d).dayMonth} · {sentBackByDay[d]}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className={`${ts.elevated} overflow-x-auto`}>
        <div className="min-w-[920px]">
          <div className="sticky top-0 z-20 bg-[#161F33]/98 backdrop-blur-md border-b border-white/[0.06] pt-1.5 pb-1">
            <div className={ts.gridCols}>
              <p className={`${ts.label} self-end pb-1`}>Week</p>
              {weekDates.map((date) => {
                const cell = attendanceByDay[date] || { status: 'present', payable: 0, leaveTypeName: null };
                const label = dateLabel(date);
                const isToday = date === toLocalDateKey(new Date());
                const sentBack = sentBackByDay[date];
                const meta = attendancePillMeta(cell.status);
                return (
                  <div
                    key={`day-${date}`}
                    className={`flex flex-col gap-0.5 ${sentBack ? 'rounded-md bg-amber-500/10 ring-1 ring-amber-500/20 px-0.5 pt-0.5' : ''}`}
                  >
                    <div className="text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 leading-none">
                        {label.dayName}
                      </p>
                      <p
                        className={`text-xs font-bold tabular-nums mt-0.5 leading-tight ${
                          isToday ? 'text-[var(--color-primary)]' : 'text-slate-100'
                        }`}
                      >
                        {label.dayMonth}
                      </p>
                      {sentBack ? <p className="text-[8px] text-amber-400/90 mt-0.5 leading-none">Sent back</p> : null}
                    </div>
                    <div
                      className={`rounded-md border px-1 py-0.5 text-center min-h-[24px] flex flex-col justify-center ${meta.shell}`}
                    >
                      <span className="text-[9px] font-semibold leading-tight truncate">{meta.label}</span>
                      <span className="text-[10px] font-bold tabular-nums leading-tight">{formatHours(cell.payable)}</span>
                      {cell.leaveTypeName ? (
                        <span className="text-[8px] opacity-75 truncate leading-tight">{cell.leaveTypeName}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              <div className="text-center self-end pb-1">
                <p className={ts.label}>Total</p>
                <p className="text-xs font-bold text-slate-200 tabular-nums mt-1">{formatHours(attendanceRowPayableTotal)}</p>
              </div>
            </div>
          </div>

          {groupKeys.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-300">No project rows yet</p>
              <p className="text-xs text-slate-500 mt-1">Use Add row to log time against a project.</p>
            </div>
          ) : (
            groupKeys.map((groupKey) => {
              const groupItems = groupedWorkRows[groupKey];
              const collapsed = isGroupCollapsed(groupKey);
              const groupWorked = groupItems.reduce(
                (sum, row) => sum + weekDates.reduce((s, d) => s + Number(row.days[d]?.hours || 0), 0),
                0
              );
              const headerPrefix = segregationMode === 'manager' ? 'Manager' : 'Project';

              return (
                <div key={groupKey} className="border-t border-white/[0.05]">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-white/[0.02] text-left"
                    onClick={() => toggleGroup(groupKey)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {collapsed ? (
                        <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">{headerPrefix}</p>
                        <p className="text-sm font-semibold text-slate-100 truncate">{groupKey}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 tabular-nums shrink-0">{formatHours(groupWorked)}</span>
                  </button>

                  {!collapsed
                    ? groupItems.map((row) => {
                        const rowWorked = weekDates.reduce((sum, date) => sum + Number(row.days[date]?.hours || 0), 0);
                        const rowPayable = weekDates.reduce((sum, date) => sum + cellPayableTotal(row.days[date]), 0);
                        const rowInputsDisabled = effectiveEditMode === 'locked';
                        const projectId = normalizeRefId(row.projectId);
                        const project = projectLookup[projectId];

                        return (
                          <div
                            key={row.rowKey}
                            className={`${ts.gridCols} items-start py-2 px-1 border-b border-white/[0.04] hover:bg-white/[0.015]`}
                          >
                            <div className="space-y-1.5 pr-1">
                              <select
                                className={`${ts.select} !py-1.5 !text-xs`}
                                value={projectId}
                                onChange={(e) => {
                                  const nextProjectId = normalizeRefId(e.target.value);
                                  const selectedProject = projectLookup[nextProjectId];
                                  const defaultManagerId = normalizeRefId(
                                    selectedProject?.managerOptions?.[0]?.id
                                  );
                                  updateRow(row.rowKey, (curr) => ({
                                    ...curr,
                                    projectId: nextProjectId,
                                    managerId: defaultManagerId
                                  }));
                                }}
                                disabled={rowInputsDisabled}
                              >
                                <option value="">Project</option>
                                {projects.map((p) => {
                                  const id = normalizeRefId(p.id);
                                  return (
                                    <option key={id} value={id}>
                                      {p.label}
                                    </option>
                                  );
                                })}
                              </select>
                              <input
                                className={`${ts.select} !py-1.5 !text-xs`}
                                placeholder="Task"
                                value={row.taskDescription || ''}
                                onChange={(e) =>
                                  updateRow(row.rowKey, (curr) => ({ ...curr, taskDescription: e.target.value }))
                                }
                                disabled={rowInputsDisabled}
                              />
                              <div className="flex items-center gap-1">
                                <select
                                  className={`${ts.select} !py-1 !text-[11px] flex-1 min-w-0`}
                                  value={normalizeRefId(row.managerId)}
                                  onChange={(e) =>
                                    updateRow(row.rowKey, (curr) => ({
                                      ...curr,
                                      managerId: normalizeRefId(e.target.value)
                                    }))
                                  }
                                  disabled={rowInputsDisabled || !projectId}
                                >
                                  <option value="">Manager</option>
                                  {((project?.managerOptions) || []).map((manager) => {
                                    const mid = normalizeRefId(manager.id);
                                    return (
                                      <option key={mid || manager.name} value={mid}>
                                        {manager.name}
                                      </option>
                                    );
                                  })}
                                </select>
                                <button
                                  type="button"
                                  className="p-1.5 rounded-md text-slate-500 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-30"
                                  onClick={() => removeRow(row.rowKey)}
                                  disabled={rowInputsDisabled}
                                  title="Remove row"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            {weekDates.map((date) => renderHourCell(row, date))}
                            <div className="pt-1 text-center">
                              <p className="text-[10px] text-slate-500">Worked</p>
                              <p className="text-sm font-bold text-slate-100 tabular-nums">{formatHours(rowWorked)}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{formatHours(rowPayable)} pay</p>
                            </div>
                          </div>
                        );
                      })
                    : null}
                </div>
              );
            })
          )}
        </div>
      </div>


    </div>
  );
};

export default TimesheetGrid;
