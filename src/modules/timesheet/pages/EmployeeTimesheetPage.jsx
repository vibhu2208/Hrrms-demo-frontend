import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axios';
import { fetchWeekTimesheet, upsertTimesheetEntries, submitTimesheet } from '../../../api/timesheet';
import TimesheetGrid from '../components/TimesheetGrid';

const getMonday = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
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

const toMonday = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

const weekRangeLabel = (weekStart) => {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(start.getDate() + 6);
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
    try {
      const res = await fetchWeekTimesheet({ employeeId, week });
      setTimesheet(res.data.timesheet);
      setEntries(res.data.entries || []);
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

  const addRow = () => {
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
    const start = new Date(weekStart);
    const rows = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      rows.push({
        entryDate: d.toISOString().slice(0, 10),
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
    if (!timesheet?._id) return;
    const payloadEntries = entries
      .map((e) => ({
        id: e._id,
        entryDate: e.entryDate,
        projectId: e.projectId,
        taskDescription: e.taskDescription,
        hours: Number(e.hours || 0),
        entryType: e.entryType || 'work',
        isBillable: e.isBillable !== false
      }))
      // Keep auto-filled rows and meaningful manual rows only
      .filter((e) => e.id || e.hours > 0 || e.entryType === 'leave' || e.entryType === 'holiday');

    await upsertTimesheetEntries({
      employeeId: selectedEmployeeId,
      week: timesheet.periodStart,
      entries: payloadEntries
    });
    await loadWeek(selectedEmployeeId, weekStart);
  };

  const submit = async () => {
    if (!timesheet?._id) return;
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

  if (initializing && !timesheet) return <div className="text-gray-200">Loading timesheet...</div>;
  return (
    <div className="w-full space-y-4 rounded-xl border border-gray-900 bg-black p-4">
      <h1 className="text-2xl font-semibold text-white">
        {isManager ? 'Team Weekly Timesheet Fill' : 'Weekly Timesheet'}
      </h1>
      {error ? <p className="text-red-400">{error}</p> : null}
      <div className="grid gap-3 md:grid-cols-4">
        <input
          type="date"
          className="rounded border border-gray-700 bg-[#0f0f0f] p-2 text-white"
          value={weekStart}
          onChange={(e) => setWeekStart(toMonday(e.target.value))}
        />
        {isManager && (
          <select
            className="rounded border border-gray-700 bg-[#0f0f0f] p-2 text-white"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
          >
            {teamUsers.map((u) => (
              <option key={u._id || u.id} value={u._id || u.id}>
                {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
              </option>
            ))}
          </select>
        )}
        <select
          className="rounded border border-gray-700 bg-[#0f0f0f] p-2 text-white"
          value={segregationMode}
          onChange={(e) => {
            const mode = e.target.value;
            setSegregationMode(mode);
            if (mode !== 'manager') {
              setSelectedManagerId('all');
            }
          }}
        >
          <option value="project">Segregate by Project</option>
          <option value="manager">Segregate by Reporting Manager</option>
        </select>
        {segregationMode === 'manager' ? (
          <select
            className="rounded border border-gray-700 bg-[#0f0f0f] p-2 text-white"
            value={selectedManagerId}
            onChange={(e) => setSelectedManagerId(e.target.value)}
          >
            <option value="all">All Reporting Managers</option>
            {reportingManagers.map((manager) => (
              <option key={manager.id || manager.name} value={manager.id || ''}>
                {manager.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded border border-gray-800 bg-[#0f0f0f] p-2 text-sm text-gray-400">
            Switch to Reporting Manager mode to filter projects manager-wise.
          </div>
        )}
        <div className="flex gap-2">
          <button
            className="rounded bg-[#1f2937] px-3 py-2 text-sm text-white"
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() - 7);
              setWeekStart(d.toISOString().slice(0, 10));
            }}
            type="button"
          >
            Prev Week
          </button>
          <button
            className="rounded bg-[#1f2937] px-3 py-2 text-sm text-white"
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() + 7);
              setWeekStart(d.toISOString().slice(0, 10));
            }}
            type="button"
          >
            Next Week
          </button>
          <button className="rounded bg-[#475569] px-3 py-2 text-sm text-white" onClick={addRow} type="button">
            Add Row
          </button>
          <button className="rounded bg-[#334155] px-3 py-2 text-sm text-white" onClick={addWholeWeekRows} type="button">
            Fill Full Week
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-300">Week: {weekRangeLabel(weekStart)}</p>
      <p className="text-sm text-gray-400">
        Projects and reporting managers are separated for the selected employee. If the employee is in multiple projects,
        each manager is shown along with each project.
      </p>

      {timesheet ? (
        <TimesheetGrid
          entries={entries}
          setEntries={setEntries}
          projects={filteredProjectOptions}
          allProjectOptions={projectOptions}
          segregationMode={segregationMode}
          weekStart={weekStart}
        />
      ) : (
        <div className="rounded border border-gray-700 bg-[#2A2A3A] p-4 text-sm text-gray-300">
          Timesheet could not be loaded for this user/week. Please change week or user and retry.
        </div>
      )}
      <div className="flex gap-2">
        <button className="rounded bg-[#8B6FE8] px-4 py-2 text-white" onClick={saveEntries}>Save</button>
        <button className="rounded bg-green-600 px-4 py-2 text-white" onClick={submit}>
          Submit Whole Week
        </button>
      </div>
    </div>
  );
};

export default EmployeeTimesheetPage;
