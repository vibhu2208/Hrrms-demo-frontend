import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Rows, Save, Send } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axios';
import { fetchWeekTimesheet, upsertTimesheetEntries, submitTimesheet } from '../../../api/timesheet';
import TimesheetGrid from '../components/TimesheetGrid';
import { surface, TIMESHEET_WEEK_STATUS, resolveWeekStatusKey } from '../timesheetUi';

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
  return (
    user._id ||
    user.id ||
    user.userId ||
    user.employeeId ||
    user.uid ||
    ''
  );
};

/** Mongo ref may be an ObjectId string or a populated { _id, firstName, ... } */
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
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
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
    const resolved = nameById?.get(id);
    return { id, name: resolved || id };
  }
  const id = String(manager._id || manager.id || '');
  const nameFromObj = fullName(manager);
  const resolved = id ? nameById?.get(id) : '';
  const name =
    (nameFromObj && nameFromObj !== 'Unassigned' ? nameFromObj : '') || resolved || '';
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
  const isManager = user?.role === 'manager';

  const loadDependencies = async () => {
    let dependencyError = '';
    try {
      const projectRes = await api.get('/spc/projects');
      const projectData = projectRes?.data?.data || projectRes?.data?.projects || projectRes?.data || [];
      setProjects(Array.isArray(projectData) ? projectData : []);
    } catch (err) {
      dependencyError = err.response?.data?.message || 'Failed to load projects for timesheet';
      setProjects([]);
    }

    try {
      const userRes = await api.get('/user/all');
      const users = userRes?.data?.data || [];
      let editableUsers = users.filter((u) => u?.isActive !== false && ['employee', 'hr', 'manager'].includes(u?.role));

      // Managers can fill for self + users who are part of their managed projects only.
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
            if (m?.employee) {
              const id = refId(m.employee);
              if (id) allowedIds.add(id);
            }
          });
          const pmId = refId(p.projectManager);
          if (pmId) allowedIds.add(pmId);
        });
        editableUsers = editableUsers.filter((u) => allowedIds.has(String(resolveUserId(u))));
      }

      setTeamUsers(editableUsers);
    } catch (err) {
      // Fallback to current user only
      if (resolveUserId(user)) {
        setTeamUsers([user]);
      }
      if (!dependencyError) {
        dependencyError = err.response?.data?.message || 'Failed to load users for timesheet';
      }
    }

    if (dependencyError) {
      setError(dependencyError);
    }
  };

  const loadWeek = async (employeeId = selectedEmployeeId, week = weekStart) => {
    const requestedWeek = getMonday(week);
    if (!employeeId) return;
    try {
      const res = await fetchWeekTimesheet({ employeeId, week: requestedWeek });
      const ts = res.data.timesheet;
      setTimesheet(ts);
      setEntries(res.data.entries || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load timesheet');
    }
  };

  useEffect(() => {
    const currentUserId = resolveUserId(user);
    if (currentUserId && !selectedEmployeeId) {
      setSelectedEmployeeId(currentUserId);
    }
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
      if (pm && typeof pm === 'object') {
        put(pm._id || pm.id, fullName(pm));
      }
      (p.assignedManagers || []).forEach((am) => {
        if (am && typeof am === 'object') put(am._id || am.id, fullName(am));
      });
      (p.assignedHRs || []).forEach((hr) => {
        if (hr && typeof hr === 'object') put(hr._id || hr.id, fullName(hr));
      });
    });
    return map;
  }, [teamUsers, user, projects]);

  const selectedEmployeeProjects = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return projects.filter((project) => {
      const employeeId = String(selectedEmployeeId);
      const managerIds = managersFromProject(project, managerNameById)
        .map((manager) => String(manager.id || ''))
        .filter(Boolean);
      const assignedHrs = (project.assignedHRs || []).map((id) => String(id));
      const teamMemberIds = (project.teamMembers || [])
        .map((member) => String(member?.employee || member?.employee?._id || member?.userId || ''))
        .filter(Boolean);
      return managerIds.includes(employeeId) || assignedHrs.includes(employeeId) || teamMemberIds.includes(employeeId);
    });
  }, [projects, selectedEmployeeId, managerNameById]);

  const projectOptions = useMemo(() => {
    return selectedEmployeeProjects.map((project) => {
      const managers = managersFromProject(project, managerNameById);
      const primaryManager = managers[0] || { id: '', name: 'Unassigned' };
      return {
        id: project._id,
        name: project.name || project.projectName || project.projectCode || project._id,
        managerId: primaryManager.id,
        managerName: primaryManager.name,
        managerOptions: managers,
        label: project.name || project.projectName || project.projectCode || project._id
      };
    });
  }, [selectedEmployeeProjects, managerNameById]);

  const reportingManagers = useMemo(() => {
    const map = new Map();
    projectOptions.forEach((p) => {
      (p.managerOptions || []).forEach((manager) => {
        const key = manager.id || `name:${manager.name}`;
        if (!map.has(key)) {
          map.set(key, { id: manager.id || '', name: manager.name });
        }
      });
    });
    return Array.from(map.values());
  }, [projectOptions]);

  const filteredProjectOptions = useMemo(() => {
    if (segregationMode !== 'manager' || selectedManagerId === 'all') {
      return projectOptions;
    }
    return projectOptions.filter((project) => (project.managerOptions || []).some((manager) => (manager.id || '') === selectedManagerId));
  }, [projectOptions, segregationMode, selectedManagerId]);

  const gridEditMode = useMemo(() => {
    if (!timesheet) return 'locked';
    const st = timesheet.overallStatus || 'draft';
    if (['locked', 'fully_approved', 'submitted'].includes(st)) return 'locked';
    if (st === 'draft') return 'full';
    if (st === 'partially_approved') {
      const hasSentBack = (entries || []).some(
        (e) =>
          (e.entryType || 'work') === 'work' &&
          e.sliceStatus === 'sent_back' &&
          e.isEditable !== false
      );
      return hasSentBack ? 'corrections' : 'locked';
    }
    return 'locked';
  }, [timesheet, entries]);

  /** True when no work row is editable (submitted / waiting / finalized). False in draft or when correcting sent-back days. */
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
    const payloadEntries = entries
      .map((e) => ({
        id: e._id,
        entryDate: e.entryDate,
        projectId: e.projectId,
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
    await loadWeek(selectedEmployeeId, weekStart);
  };

  const submit = async () => {
    if (!timesheet?._id || !canSubmitForApproval) return;
    try {
      // Persist current UI edits first, then submit.
      await saveEntries();
      await submitTimesheet(timesheet._id);
      await loadWeek(selectedEmployeeId, weekStart);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Timesheet submission failed');
    }
  };

  if (initializing && !timesheet) {
    return (
      <div className={surface.page}>
        <div className="card p-8 text-center text-sm theme-text-secondary">Loading timesheet…</div>
      </div>
    );
  }
  return (
    <div className={surface.page}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold theme-text tracking-tight sm:text-2xl">
            {isManager ? 'Team weekly timesheet' : 'Weekly timesheet'}
          </h1>
          <p className={`${surface.muted} mt-1 max-w-2xl`}>
            Log project hours by day. Attendance from leave and holidays is applied automatically.
          </p>
        </div>
        {statusMeta ? (
          <div className="flex flex-col items-start gap-1 sm:items-end shrink-0">
            <span className={`badge ${statusMeta.badge}`}>{statusMeta.label}</span>
            <p className="text-xs theme-text-secondary max-w-xs text-left sm:text-right">{statusMeta.message}</p>
            {statusMeta.submittedAt ? (
              <p className="text-[11px] theme-text-secondary opacity-80">Submitted {statusMeta.submittedAt}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</div>
      ) : null}

      <div className={surface.card}>
        <div className={surface.toolbar}>
          <div className="flex flex-col gap-2 min-w-[200px]">
            <span className={surface.label}>Week</span>
            <div className="inline-flex items-center gap-1 rounded-lg border theme-border theme-surface p-0.5">
              <button type="button" className={`${surface.btnGhost} !border-0 !px-2`} onClick={() => shiftWeek(-1)} aria-label="Previous week">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex flex-col items-center px-2 min-w-[140px]">
                <span className="text-xs font-medium theme-text">{weekRangeLabel(weekStart)}</span>
                <input
                  type="date"
                  className="mt-0.5 w-full bg-transparent text-[11px] theme-text-secondary border-0 p-0 focus:ring-0"
                  value={weekStart}
                  onChange={(e) => setWeekStart(toMonday(e.target.value))}
                  aria-label="Pick week start"
                />
              </div>
              <button type="button" className={`${surface.btnGhost} !border-0 !px-2`} onClick={() => shiftWeek(1)} aria-label="Next week">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button type="button" className={`${surface.btnGhost} !text-xs !py-1`} onClick={() => setWeekStart(getMonday())} disabled={isCurrentWeek}>
              <CalendarDays className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              Current week
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3 flex-1">
            {isManager ? (
              <div className="min-w-[180px] flex-1">
                <label className={surface.label}>Employee</label>
                <select
                  className={`${surface.select} w-full`}
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
            <div className="min-w-[160px]">
              <label className={surface.label}>View by</label>
              <select
                className={`${surface.select} w-full`}
                value={segregationMode}
                onChange={(e) => {
                  const mode = e.target.value;
                  setSegregationMode(mode);
                  if (mode !== 'manager') setSelectedManagerId('all');
                }}
              >
                <option value="project">Project</option>
                <option value="manager">Reporting manager</option>
              </select>
            </div>

            {segregationMode === 'manager' ? (
              <div className="min-w-[180px] flex-1">
                <label className={surface.label}>Manager filter</label>
                <select
                  className={`${surface.select} w-full`}
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                >
                  <option value="all">All managers</option>
                  {reportingManagers.map((manager) => (
                    <option key={manager.id || manager.name} value={manager.id || ''}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="flex flex-wrap items-end gap-2 ml-auto">
              <button type="button" className={surface.btnGhost} onClick={addRow} disabled={timesheetReadOnly}>
                <Plus className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                Add row
              </button>
              <button
                type="button"
                className={surface.btnGhost}
                onClick={addWholeWeekRows}
                disabled={timesheetReadOnly || gridEditMode === 'corrections'}
              >
                <Rows className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                Fill week
              </button>
            </div>
          </div>
        </div>

        {timesheet ? (
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
          <div className={`${surface.section} text-sm theme-text-secondary`}>
            Timesheet could not be loaded for this user or week. Change the week or employee and try again.
          </div>
        )}

        <div className={`${surface.divider} flex flex-wrap items-center justify-end gap-2 p-4`}>
          <button type="button" className={surface.btnSecondary} onClick={saveEntries} disabled={timesheetReadOnly}>
            <Save className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
            Save draft
          </button>
          <button type="button" className={surface.btnPrimary} onClick={submit} disabled={!canSubmitForApproval}>
            <Send className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
            Submit for approval
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTimesheetPage;
