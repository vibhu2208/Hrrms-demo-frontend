import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Rows,
  Save,
  Send
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axios';
import { fetchWeekTimesheet, upsertTimesheetEntries, submitTimesheet } from '../../../api/timesheet';
import TimesheetGrid from '../components/TimesheetGrid';
import {
  TIMESHEET_WEEK_STATUS,
  formatLastSaved,
  formatTimesheetWeek,
  normalizeRefId,
  resolveWeekStatusKey,
  ts
} from '../timesheetUi';

const toLocalDateKey = (dateLike) => {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseLocalDateKey = (ymd) => {
  const m = String(ymd || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return new Date(ymd);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

const getMonday = (date = new Date()) => {
  const d = typeof date === 'string' ? parseLocalDateKey(date) : new Date(date);
  const day = d.getDay();
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1));
  return toLocalDateKey(monday);
};

const resolveUserId = (user) => {
  if (!user) return '';
  return user._id || user.id || user.userId || user.employeeId || user.uid || '';
};

const refId = (ref) => {
  if (ref == null) return '';
  if (typeof ref === 'string' || typeof ref === 'number') return String(ref);
  return String(ref._id || ref.id || '');
};

const toMonday = (dateStr) => getMonday(dateStr);

const weekRangeLabel = (weekStart) => {
  const start = parseLocalDateKey(weekStart);
  const end = parseLocalDateKey(weekStart);
  end.setDate(end.getDate() + 6);
  return formatTimesheetWeek(start, end);
};

const workEntriesMissingProject = (list) => {
  const days = new Set();
  (list || []).forEach((e) => {
    if ((e.entryType || 'work') !== 'work') return;
    const hours = Number(e.workedHours != null ? e.workedHours : e.hours || 0);
    if (hours > 0 && !normalizeRefId(e.projectId)) {
      const key = String(e.entryDate || '').slice(0, 10);
      if (key) days.add(key);
    }
  });
  return Array.from(days).sort();
};

const fullName = (user) => {
  if (!user) return 'Unassigned';
  if (typeof user === 'string') return user;
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.name || 'Unassigned';
};

const normalizeManager = (manager, nameById) => {
  if (!manager) return null;
  if (typeof manager === 'string') {
    const id = String(manager);
    return { id, name: nameById?.get(id) || id };
  }
  const id = String(manager._id || manager.id || '');
  const nameFromObj = fullName(manager);
  const resolved = id ? nameById?.get(id) : '';
  const name = (nameFromObj && nameFromObj !== 'Unassigned' ? nameFromObj : '') || resolved || '';
  if (!id && !name) return null;
  return { id, name: name || id || 'Unassigned' };
};

const managersFromProject = (project, nameById) => {
  const list = [];
  const directManager = normalizeManager(project?.projectManager, nameById);
  if (directManager) list.push(directManager);
  (project?.assignedManagers || []).forEach((manager) => {
    const normalized = normalizeManager(manager, nameById);
    if (normalized) list.push(normalized);
  });
  const unique = new Map();
  list.forEach((manager) => {
    const key = manager.id || `name:${manager.name}`;
    if (!unique.has(key)) unique.set(key, manager);
  });
  return Array.from(unique.values());
};

const TimesheetPageSkeleton = () => (
  <div className={`${ts.page} space-y-4 animate-pulse`}>
    <div className="h-20 rounded-xl bg-[#161F33]/80" />
    <div className="h-12 rounded-xl bg-[#141B2E]/60" />
    <div className="h-28 rounded-xl bg-[#141B2E]/60" />
    <div className="h-64 rounded-xl bg-[#141B2E]/60" />
  </div>
);

const EmployeeTimesheetPage = () => {
  const { user } = useAuth();
  const [timesheet, setTimesheet] = useState(null);
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [segregationMode, setSegregationMode] = useState('project');
  const [selectedManagerId, setSelectedManagerId] = useState('all');
  const [weekStart, setWeekStart] = useState(getMonday());
  const [error, setError] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const isManager = user?.role === 'manager';

  const loadDependencies = async () => {
    let dependencyError = '';
    try {
      const projectRes = await api.get('/spc/projects');
      const projectData = projectRes?.data?.data || projectRes?.data?.projects || projectRes?.data || [];
      setProjects(Array.isArray(projectData) ? projectData : []);
    } catch (err) {
      dependencyError = err.response?.data?.message || 'Failed to load projects';
      setProjects([]);
    }

    try {
      const userRes = await api.get('/user/all');
      const users = userRes?.data?.data || [];
      let editableUsers = users.filter((u) => u?.isActive !== false && ['employee', 'hr', 'manager'].includes(u?.role));

      if (isManager) {
        const projectRes = await api.get('/spc/projects');
        const projectData = projectRes?.data?.data || projectRes?.data?.projects || projectRes?.data || [];
        const allowedIds = new Set([resolveUserId(user)]);
        (Array.isArray(projectData) ? projectData : []).forEach((p) => {
          (p.assignedHRs || []).forEach((hr) => {
            const id = refId(hr);
            if (id) allowedIds.add(id);
          });
          (p.assignedManagers || []).forEach((mid) => {
            const id = refId(mid);
            if (id) allowedIds.add(id);
          });
          (p.teamMembers || []).forEach((m) => {
            const id = refId(m?.employee);
            if (id) allowedIds.add(id);
          });
          const pmId = refId(p.projectManager);
          if (pmId) allowedIds.add(pmId);
        });
        editableUsers = editableUsers.filter((u) => allowedIds.has(String(resolveUserId(u))));
      }
      setTeamUsers(editableUsers);
    } catch (err) {
      if (resolveUserId(user)) setTeamUsers([user]);
      if (!dependencyError) dependencyError = err.response?.data?.message || 'Failed to load users';
    }
    if (dependencyError) setError(dependencyError);
  };

  const loadWeek = async (employeeId = selectedEmployeeId, week = weekStart) => {
    const requestedWeek = getMonday(week);
    if (!employeeId) return;
    setLoadingWeek(true);
    try {
      const res = await fetchWeekTimesheet({ employeeId, week: requestedWeek });
      setTimesheet(res.data.timesheet);
      setEntries(res.data.entries || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load timesheet');
    } finally {
      setLoadingWeek(false);
    }
  };

  useEffect(() => {
    const currentUserId = resolveUserId(user);
    if (currentUserId && !selectedEmployeeId) setSelectedEmployeeId(currentUserId);
  }, [user, selectedEmployeeId]);

  useEffect(() => {
    const init = async () => {
      setInitializing(true);
      await loadDependencies();
      const fallbackUserId = selectedEmployeeId || resolveUserId(user);
      if (fallbackUserId) {
        await loadWeek(fallbackUserId, weekStart);
      } else {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const storedUserId = resolveUserId(storedUser);
        if (storedUserId) {
          setSelectedEmployeeId(storedUserId);
          await loadWeek(storedUserId, weekStart);
        } else {
          setError('Unable to resolve current user for timesheet');
        }
      }
      setInitializing(false);
    };
    init();
  }, [selectedEmployeeId, weekStart, user]);

  const managerNameById = useMemo(() => {
    const map = new Map();
    const put = (id, name) => {
      const key = String(id || '');
      if (!key) return;
      const label = (name || '').trim();
      if (!label || label === 'Unassigned') return;
      if (!map.has(key)) map.set(key, label);
    };
    teamUsers.forEach((u) => put(resolveUserId(u), fullName(u)));
    if (user) put(resolveUserId(user), fullName(user));
    (projects || []).forEach((p) => {
      const pm = p.projectManager;
      if (pm && typeof pm === 'object') put(pm._id || pm.id, fullName(pm));
      (p.assignedManagers || []).forEach((am) => {
        if (am && typeof am === 'object') put(am._id || am.id, fullName(am));
      });
    });
    return map;
  }, [teamUsers, user, projects]);

  const selectedEmployeeProjects = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return projects.filter((project) => {
      const employeeId = String(selectedEmployeeId);
      const managerIds = managersFromProject(project, managerNameById)
        .map((m) => String(m.id || ''))
        .filter(Boolean);
      const assignedHrs = (project.assignedHRs || []).map((id) => String(id));
      const teamMemberIds = (project.teamMembers || [])
        .map((member) => String(member?.employee || member?.employee?._id || member?.userId || ''))
        .filter(Boolean);
      return managerIds.includes(employeeId) || assignedHrs.includes(employeeId) || teamMemberIds.includes(employeeId);
    });
  }, [projects, selectedEmployeeId, managerNameById]);

  const projectOptions = useMemo(
    () =>
      selectedEmployeeProjects.map((project) => {
        const managers = managersFromProject(project, managerNameById);
        const primaryManager = managers[0] || { id: '', name: 'Unassigned' };
        const id = normalizeRefId(project._id || project.id);
        return {
          id,
          name: project.name || project.projectName || project.projectCode || id,
          managerId: normalizeRefId(primaryManager.id),
          managerName: primaryManager.name,
          managerOptions: managers.map((m) => ({
            ...m,
            id: normalizeRefId(m.id)
          })),
          label: project.name || project.projectName || project.projectCode || id
        };
      }),
    [selectedEmployeeProjects, managerNameById]
  );

  const reportingManagers = useMemo(() => {
    const map = new Map();
    projectOptions.forEach((p) => {
      (p.managerOptions || []).forEach((manager) => {
        const key = manager.id || `name:${manager.name}`;
        if (!map.has(key)) map.set(key, { id: manager.id || '', name: manager.name });
      });
    });
    return Array.from(map.values());
  }, [projectOptions]);

  const filteredProjectOptions = useMemo(() => {
    if (segregationMode !== 'manager' || selectedManagerId === 'all') return projectOptions;
    return projectOptions.filter((p) =>
      (p.managerOptions || []).some((manager) => (manager.id || '') === selectedManagerId)
    );
  }, [projectOptions, segregationMode, selectedManagerId]);

  const gridEditMode = useMemo(() => {
    if (!timesheet) return 'locked';
    const st = timesheet.overallStatus || 'draft';
    if (['locked', 'fully_approved', 'submitted'].includes(st)) return 'locked';
    if (st === 'draft') return 'full';
    if (st === 'partially_approved') {
      const hasSentBack = (entries || []).some(
        (e) => (e.entryType || 'work') === 'work' && e.sliceStatus === 'sent_back' && e.isEditable !== false
      );
      return hasSentBack ? 'corrections' : 'locked';
    }
    return 'locked';
  }, [timesheet, entries]);

  const timesheetReadOnly = gridEditMode === 'locked';

  const canSubmitForApproval = useMemo(() => {
    if (!timesheet) return false;
    const st = timesheet.overallStatus || 'draft';
    if (['locked', 'fully_approved', 'submitted'].includes(st)) return false;
    if (st === 'draft') return true;
    if (st === 'partially_approved') {
      return (entries || []).some(
        (e) => (e.entryType || 'work') === 'work' && ['draft', 'sent_back'].includes(e.sliceStatus || '')
      );
    }
    return false;
  }, [timesheet, entries]);

  const workSentBack = useMemo(
    () =>
      (entries || []).some(
        (e) => (e.entryType || 'work') === 'work' && e.sliceStatus === 'sent_back' && e.isEditable !== false
      ),
    [entries]
  );

  const statusMeta = useMemo(() => {
    if (!timesheet) return null;
    const key = resolveWeekStatusKey(timesheet.overallStatus, workSentBack);
    const cfg = TIMESHEET_WEEK_STATUS[key] || TIMESHEET_WEEK_STATUS.draft;
    return {
      key,
      ...cfg,
      submittedAt: timesheet.submittedAt ? new Date(timesheet.submittedAt).toLocaleString() : null
    };
  }, [timesheet, workSentBack]);

  const shiftWeek = (deltaWeeks) => {
    const d = parseLocalDateKey(weekStart);
    d.setDate(d.getDate() + deltaWeeks * 7);
    setWeekStart(getMonday(d));
  };

  const isCurrentWeek = weekStart === getMonday();

  const addRow = () => {
    if (timesheetReadOnly) return;
    setEntries((prev) => [
      ...prev,
      {
        entryDate: weekStart,
        projectId: '',
        taskDescription: '',
        hours: 0,
        entryType: 'work',
        managerId: '',
        isBillable: true,
        sliceStatus: 'draft',
        isEditable: true
      }
    ]);
  };

  const addWholeWeekRows = () => {
    if (timesheetReadOnly) return;
    const start = parseLocalDateKey(weekStart);
    const rows = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      rows.push({
        entryDate: toLocalDateKey(d),
        projectId: '',
        taskDescription: '',
        hours: 0,
        entryType: 'work',
        managerId: '',
        isBillable: true,
        sliceStatus: 'draft',
        isEditable: true
      });
    }
    setEntries(rows);
  };

  const saveEntries = async () => {
    if (!timesheet?._id || timesheetReadOnly) return;
    const missingProjectDays = workEntriesMissingProject(entries);
    if (missingProjectDays.length) {
      setError(
        `Select a project for worked hours on: ${missingProjectDays.join(', ')}`
      );
      return;
    }
    setSaving(true);
    try {
      const payloadEntries = entries
        .map((e) => ({
          id: e._id,
          entryDate: e.entryDate,
          projectId: normalizeRefId(e.projectId) || undefined,
          taskDescription: e.taskDescription,
          hours: Number(e.hours || 0),
          workedHours: e.workedHours != null ? Number(e.workedHours) : Number(e.hours || 0),
          payableHours: e.payableHours != null ? Number(e.payableHours) : Number(e.hours || 0),
          entryType: e.entryType || 'work',
          isBillable: e.isBillable !== false
        }))
        .filter(
          (e) =>
            e.id ||
            e.hours > 0 ||
            (e.payableHours || 0) > 0 ||
            ['leave', 'holiday', 'week_off'].includes(e.entryType)
        );

      await upsertTimesheetEntries({
        employeeId: selectedEmployeeId,
        week: weekStart,
        entries: payloadEntries
      });
      setLastSavedAt(new Date());
      await loadWeek(selectedEmployeeId, weekStart);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save timesheet');
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!timesheet?._id || !canSubmitForApproval) return;
    const missingProjectDays = workEntriesMissingProject(entries);
    if (missingProjectDays.length) {
      setError(
        `Select a project for worked hours on: ${missingProjectDays.join(', ')}`
      );
      return;
    }
    setSubmitting(true);
    try {
      await saveEntries();
      await submitTimesheet(timesheet._id);
      await loadWeek(selectedEmployeeId, weekStart);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Timesheet submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (initializing && !timesheet) {
    return <TimesheetPageSkeleton />;
  }

  const pageTitle = isManager ? 'Team Weekly Timesheet' : 'Weekly Timesheet';

  return (
    <div className={ts.page}>
      {/* Sticky top toolbar */}
      <div className={ts.stickyHeader}>
        <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.2fr)] xl:items-center">
          {/* Left ? title */}
          <div className="min-w-0">
            <h1 className={ts.title}>{pageTitle}</h1>
            <p className={ts.subtitle}>Log project hours by day</p>
            {statusMeta?.submittedAt ? (
              <p className="text-[11px] text-slate-500 mt-1">Submitted {statusMeta.submittedAt}</p>
            ) : lastSavedAt ? (
              <p className="text-[11px] text-emerald-500/80 mt-1">
                Saved {lastSavedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </p>
            ) : null}
          </div>

          {/* Center ? week navigation */}
          <div className="flex flex-col items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#0B1220]/80 p-1">
              <button type="button" className={ts.btnIcon} onClick={() => shiftWeek(-1)} aria-label="Previous week">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="px-3 py-1 text-center min-w-[150px]">
                <p className="text-sm font-semibold text-slate-100 tabular-nums">{weekRangeLabel(weekStart)}</p>
                <input
                  type="date"
                  className="mt-0.5 w-full bg-transparent text-[10px] text-slate-500 border-0 p-0 focus:ring-0 text-center"
                  value={weekStart}
                  onChange={(e) => setWeekStart(toMonday(e.target.value))}
                  aria-label="Pick week"
                />
              </div>
              <button type="button" className={ts.btnIcon} onClick={() => shiftWeek(1)} aria-label="Next week">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              className={`text-xs font-medium px-3 py-1 rounded-lg border transition-colors ${
                isCurrentWeek
                  ? 'border-white/10 text-slate-500 cursor-default'
                  : 'border-[var(--color-primary)]/30 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10'
              }`}
              onClick={() => setWeekStart(getMonday())}
              disabled={isCurrentWeek}
            >
              <CalendarDays className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              Current week
            </button>
          </div>

          {/* Right ? controls */}
          <div className="flex flex-wrap items-end justify-start xl:justify-end gap-2">
            {statusMeta ? (
              <span className={`badge ${statusMeta.badge} !text-xs shrink-0`}>{statusMeta.label}</span>
            ) : null}

            {isManager ? (
              <div className="min-w-[140px] flex-1 sm:flex-none">
                <label className={ts.label}>Employee</label>
                <select
                  className={ts.select}
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                >
                  {teamUsers.map((u) => (
                    <option key={u._id || u.id} value={u._id || u.id}>
                      {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="min-w-[110px]">
              <label className={ts.label}>View</label>
              <select
                className={ts.select}
                value={segregationMode}
                onChange={(e) => {
                  setSegregationMode(e.target.value);
                  if (e.target.value !== 'manager') setSelectedManagerId('all');
                }}
              >
                <option value="project">Project</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            {segregationMode === 'manager' ? (
              <div className="min-w-[130px]">
                <label className={ts.label}>Manager</label>
                <select
                  className={ts.select}
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                >
                  <option value="all">All</option>
                  {reportingManagers.map((m) => (
                    <option key={m.id || m.name} value={m.id || ''}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="flex gap-2 ml-auto xl:ml-0">
              <button type="button" className={ts.btnSecondary} onClick={addRow} disabled={timesheetReadOnly}>
                <Plus className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                Add row
              </button>
              <button
                type="button"
                className={ts.btnSecondary}
                onClick={addWholeWeekRows}
                disabled={timesheetReadOnly || gridEditMode === 'corrections'}
              >
                <Rows className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                Fill week
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</div>
      ) : null}

      {statusMeta && statusMeta.key === 'sent_back' ? (
        <p className="text-xs text-amber-300/90 px-1">{statusMeta.message}</p>
      ) : null}

      {loadingWeek ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading week?
        </div>
      ) : timesheet ? (
        <TimesheetGrid
          entries={entries}
          setEntries={setEntries}
          projects={filteredProjectOptions}
          allProjectOptions={projectOptions}
          segregationMode={segregationMode}
          weekStart={weekStart}
          readOnly={timesheetReadOnly}
          editMode={gridEditMode}
        />
      ) : (
        <div className={`${ts.elevated} p-10 text-center`}>
          <p className="text-sm font-medium text-slate-300">No timesheet for this week</p>
          <p className="text-xs text-slate-500 mt-1">Change employee or week to continue.</p>
        </div>
      )}

      <div className={ts.bottomBar}>
        <div className={ts.footerInner}>
          <div className="min-w-0">
            {saving ? (
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                Saving?
              </p>
            ) : timesheetReadOnly ? (
              <p className="text-xs text-slate-500">Read-only</p>
            ) : lastSavedAt ? (
              <p className="text-xs text-slate-500">{formatLastSaved(lastSavedAt)}</p>
            ) : (
              <p className="text-xs text-slate-600">Not saved yet</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className={`${ts.btnDraft} inline-flex items-center justify-center`}
              onClick={saveEntries}
              disabled={timesheetReadOnly || saving || submitting}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save draft
            </button>
            <button
              type="button"
              className={`${ts.btnPrimary} inline-flex items-center justify-center`}
              onClick={submit}
              disabled={!canSubmitForApproval || saving || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Submit for approval
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTimesheetPage;
