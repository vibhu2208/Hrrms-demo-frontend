import React from 'react';

const getWeekDates = (weekStart) => {
  const start = new Date(weekStart);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
};

const dateLabel = (dateStr) => {
  const d = new Date(dateStr);
  return {
    dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
    dayMonth: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  };
};

const rowKeyForEntry = (entry) => (
  `${entry.projectId || ''}__${entry.managerId || ''}__${entry.taskDescription || ''}__${entry.entryType || 'work'}__${entry.isBillable !== false}`
);

const buildRowsFromEntries = (entries, weekDates) => {
  const weekSet = new Set(weekDates);
  const rowsMap = new Map();

  entries.forEach((entry) => {
    const entryDate = entry.entryDate ? new Date(entry.entryDate).toISOString().slice(0, 10) : '';
    if (!weekSet.has(entryDate)) return;
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
        days: weekDates.reduce((acc, d) => ({ ...acc, [d]: { hours: 0, id: null } }), {})
      });
    }
    const row = rowsMap.get(rowKey);
    row.days[entryDate] = {
      hours: Number(entry.hours || 0),
      id: entry._id || null
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
      days: weekDates.reduce((acc, d) => ({ ...acc, [d]: { hours: 0, id: null } }), {})
    });
  }

  return rows;
};

const flattenRowsToEntries = (rows, weekDates) => {
  const flat = [];
  rows.forEach((row) => {
    weekDates.forEach((date) => {
      const day = row.days[date] || { hours: 0, id: null };
      if ((day.hours || 0) > 0 || day.id) {
        flat.push({
          _id: day.id || undefined,
          entryDate: date,
          projectId: row.projectId,
          managerId: row.managerId || '',
          taskDescription: row.taskDescription,
          hours: Number(day.hours || 0),
          entryType: row.entryType,
          isBillable: row.isBillable,
          sliceStatus: row.sliceStatus,
          isEditable: row.isEditable
        });
      }
    });
  });
  return flat;
};

const TimesheetGrid = ({ entries, setEntries, projects, allProjectOptions = [], segregationMode = 'project', weekStart }) => {
  const weekDates = getWeekDates(weekStart);
  const rows = buildRowsFromEntries(entries, weekDates);

  const projectLookup = allProjectOptions.reduce((acc, project) => {
    acc[project.id] = project;
    return acc;
  }, {});

  const updateRow = (rowKey, updater) => {
    setEntries((prev) => {
      const prevRows = buildRowsFromEntries(prev, weekDates);
      const nextRows = prevRows.map((row) => (row.rowKey === rowKey ? updater(row) : row));
      return flattenRowsToEntries(nextRows, weekDates);
    });
  };

  const removeRow = (rowKey) => {
    setEntries((prev) => {
      const prevRows = buildRowsFromEntries(prev, weekDates);
      const nextRows = prevRows.filter((row) => row.rowKey !== rowKey);
      return flattenRowsToEntries(nextRows, weekDates);
    });
  };

  const groupedRows = rows.reduce((acc, row) => {
    const project = projectLookup[row.projectId];
    const projectName = project?.name || 'Unassigned Project';
    const selectedManager = (project?.managerOptions || []).find((manager) => (manager.id || '') === (row.managerId || ''));
    const managerName = selectedManager?.name || project?.managerName || 'Unassigned Manager';
    const groupKey = segregationMode === 'manager' ? managerName : projectName;
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(row);
    return acc;
  }, {});

  return (
    <div className="w-full rounded-xl border border-gray-800 bg-[#06090f]">
      <div className="space-y-3 overflow-x-auto p-2">
        {Object.entries(groupedRows).map(([groupLabel, groupItems]) => (
          <div key={groupLabel} className="rounded-lg border border-gray-800 bg-[#0a0f17]">
            <div className="border-b border-gray-800 px-3 py-2 text-sm font-semibold text-cyan-300">
              {segregationMode === 'manager' ? `Reporting Manager: ${groupLabel}` : `Project: ${groupLabel}`}
            </div>
            <div className="min-w-[1300px]">
              <div className="grid grid-cols-[260px_repeat(7,minmax(120px,1fr))_140px] bg-[#111827]">
                <div className="border-r border-gray-800 p-3 text-xs font-semibold uppercase tracking-wide text-gray-300">
                  Project / Task
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
                <div className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-300">Time Spent</div>
              </div>

              {groupItems.map((row) => {
                const rowTotal = weekDates.reduce((sum, date) => sum + Number(row.days[date]?.hours || 0), 0);
                return (
                  <div
                    key={row.rowKey}
                    className="grid grid-cols-[260px_repeat(7,minmax(120px,1fr))_140px] border-t border-gray-900 bg-[#0b1220]"
                  >
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
                        disabled={row.isEditable === false}
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
                        disabled={row.isEditable === false || !row.projectId}
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
                        disabled={row.isEditable === false}
                      />
                    </div>
                    {weekDates.map((date) => (
                      <div key={`${row.rowKey}-${date}`} className="border-r border-gray-900 p-2">
                        <input
                          className="w-full rounded border border-gray-700 bg-[#090f19] p-1 text-center text-white"
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={row.days[date]?.hours ?? 0}
                          onChange={(e) => {
                            const value = Number(e.target.value || 0);
                            updateRow(row.rowKey, (curr) => ({
                              ...curr,
                              days: {
                                ...curr.days,
                                [date]: {
                                  ...(curr.days[date] || { id: null }),
                                  hours: value
                                }
                              }
                            }));
                          }}
                          disabled={row.isEditable === false}
                        />
                      </div>
                    ))}
                    <div className="flex items-center justify-center gap-2 p-2 text-white">
                      <span className="text-sm font-semibold">{rowTotal}h</span>
                      <button
                        className="rounded bg-red-700 px-2 py-1 text-[10px] text-white disabled:opacity-50"
                        onClick={() => removeRow(row.rowKey)}
                        disabled={row.isEditable === false}
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
        ))}
      </div>
    </div>
  );
};

export default TimesheetGrid;
