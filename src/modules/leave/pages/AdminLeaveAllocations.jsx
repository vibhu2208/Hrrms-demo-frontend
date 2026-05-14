import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  bulkAllocateLeave,
  fetchLeaveTypes,
  fetchLeaveAllocationsSummary,
  fetchLeaveAllocationsRecent
} from '../../../api/leave';
import { getEmployees } from '../../../api/employees';
import api from '../../../api/axios';
import {
  Building2,
  Calendar,
  Gauge,
  History,
  Info,
  Layers,
  Loader2,
  RefreshCw,
  SkipForward,
  User,
  Users
} from 'lucide-react';

const currentYear = new Date().getFullYear();

const ALLOCATION_TYPE_LABELS = {
  company_wide: 'Company wide',
  designation_wise: 'By role',
  employee_specific: 'Individual',
  manual_adjustment: 'Manual adjust'
};

const ALLOCATION_TYPES = [
  {
    value: 'company_wide',
    label: 'Company wide',
    description: 'Active employee, HR & manager users',
    icon: Building2
  },
  {
    value: 'designation_wise',
    label: 'By role',
    description: 'Manager, HR and/or employee roles',
    icon: Users
  },
  {
    value: 'employee_specific',
    label: 'Individual',
    description: 'Single selected user',
    icon: User
  },
  {
    value: 'manual_adjustment',
    label: 'Manual adjust',
    description: 'Add or deduct with reason',
    icon: Gauge
  }
];

const HRMS_ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'HR' },
  { value: 'employee', label: 'Employee' }
];

const initialForm = () => ({
  allocationType: 'company_wide',
  leaveTypeId: '',
  year: currentYear,
  days: '',
  roles: [],
  employeeId: '',
  adjustmentDelta: '',
  adjustmentReason: '',
  conflictPolicy: 'overwrite'
});

function SectionCard({ eyebrow, title, description, children, className = '' }) {
  return (
    <section
      className={`rounded-xl border border-gray-700 bg-[#2A2A3A] p-3 shadow-sm sm:p-4 ${className}`}
    >
      <header className="mb-3 border-b border-gray-700/80 pb-2.5">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{eyebrow}</p>
        ) : null}
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
        ) : null}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function FieldLabel({ children, required }) {
  return (
    <label className="mb-1 block text-xs font-medium text-gray-400">
      {children}
      {required ? <span className="text-rose-400">*</span> : null}
    </label>
  );
}

const inputClass =
  'w-full max-w-full rounded-lg border border-gray-700 bg-[#1E1E2A] px-2.5 py-1.5 text-sm text-white placeholder:text-gray-500 transition-colors focus:border-[#A88BFF] focus:outline-none focus:ring-1 focus:ring-[#A88BFF]/40 disabled:cursor-not-allowed disabled:opacity-50';

const selectClass = `${inputClass} appearance-none bg-[length:0.875rem] bg-[right_0.5rem_center] bg-no-repeat pr-8`;

const SELECT_CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`;

const AdminLeaveAllocations = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});

  const employeeOptions = useMemo(() => {
    return employees.map((emp) => ({
      id: emp._id || emp.id,
      label:
        emp.fullName ||
        `${emp.firstName || ''} ${emp.lastName || ''}`.trim() ||
        emp.email ||
        emp.employeeCode ||
        String(emp._id || emp.id)
    }));
  }, [employees]);

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res = await fetchLeaveAllocationsSummary({ year: form.year });
      setSummary(res.data || null);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [form.year]);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await fetchLeaveAllocationsRecent({ year: form.year, limit: 50 });
      setHistoryRows(res.data || []);
    } catch {
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [form.year]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [typesRes, employeeRes, usersRes] = await Promise.all([
        fetchLeaveTypes(),
        getEmployees({ limit: 1000 }),
        api.get('/user/all')
      ]);
      setLeaveTypes(typesRes.data || []);

      const employeeRecords =
        employeeRes?.data?.employees ||
        employeeRes?.data ||
        employeeRes?.employees ||
        [];
      const userRecords = usersRes?.data?.data || [];

      const mergedById = new Map();
      (Array.isArray(employeeRecords) ? employeeRecords : []).forEach((emp) => {
        const id = String(emp._id || emp.id || '');
        if (!id) return;
        mergedById.set(id, emp);
      });
      userRecords
        .filter((u) => u?.isActive !== false && ['employee', 'hr', 'manager'].includes(u?.role))
        .forEach((u) => {
          const id = String(u._id || u.id || '');
          if (!id) return;
          if (!mergedById.has(id)) {
            mergedById.set(id, {
              _id: id,
              firstName: u.firstName,
              lastName: u.lastName,
              email: u.email,
              role: u.role,
              designation: u.designation,
              departmentId: u.departmentId
            });
          }
        });

      setEmployees([...mergedById.values()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leave allocation dependencies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadSummary();
    loadHistory();
  }, [loadSummary, loadHistory]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onAllocationTypeChange = (value) => {
    setForm((prev) => ({
      ...initialForm(),
      allocationType: value,
      year: prev.year,
      leaveTypeId: prev.leaveTypeId
    }));
    setFieldErrors({});
    setMessage('');
    setError('');
  };

  const toggleStringInList = (listKey, value) => {
    setForm((prev) => {
      const arr = prev[listKey] || [];
      const has = arr.includes(value);
      const next = has ? arr.filter((x) => x !== value) : [...arr, value];
      return { ...prev, [listKey]: next };
    });
    setFieldErrors((fe) => {
      const n = { ...fe };
      delete n[listKey];
      return n;
    });
  };

  const validate = () => {
    const fe = {};
    if (!form.allocationType) fe.allocationType = 'Allocation type is required';
    if (!form.leaveTypeId) fe.leaveTypeId = 'Leave type is required';
    if (form.year === '' || form.year == null || Number.isNaN(Number(form.year))) {
      fe.year = 'Valid year is required';
    }

    if (form.allocationType === 'manual_adjustment') {
      if (!form.employeeId) fe.employeeId = 'Select an employee';
      if (form.adjustmentDelta === '' || Number.isNaN(Number(form.adjustmentDelta))) {
        fe.adjustmentDelta = 'Enter adjustment amount (use negative to deduct)';
      }
      if (!form.adjustmentReason || !String(form.adjustmentReason).trim()) {
        fe.adjustmentReason = 'Reason is required for manual adjustment';
      }
    } else {
      if (form.days === '' || Number(form.days) < 0 || Number.isNaN(Number(form.days))) {
        fe.days = 'Enter allocated days (0 or greater)';
      }
      if (form.allocationType === 'designation_wise' && (!form.roles || form.roles.length === 0)) {
        fe.roles = 'Select at least one role';
      }
      if (form.allocationType === 'employee_specific' && !form.employeeId) {
        fe.employeeId = 'Select an employee';
      }
    }

    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!validate()) return;

    const base = {
      allocationType: form.allocationType,
      leaveTypeId: form.leaveTypeId,
      year: Number(form.year),
      conflictPolicy: form.conflictPolicy
    };

    let payload = { ...base };
    if (form.allocationType === 'manual_adjustment') {
      payload = {
        ...base,
        employeeId: form.employeeId,
        adjustmentDelta: Number(form.adjustmentDelta),
        adjustmentReason: String(form.adjustmentReason).trim()
      };
    } else {
      payload = {
        ...base,
        days: Number(form.days)
      };
      if (form.allocationType === 'designation_wise') payload.roles = form.roles;
      if (form.allocationType === 'employee_specific') payload.employeeId = form.employeeId;
    }

    setSubmitting(true);
    try {
      const res = await bulkAllocateLeave(payload);
      const { updates = [], skipped = [], summary: sum } = res.data || {};
      const affected = sum?.affected ?? updates?.length ?? 0;
      const skippedCount = sum?.skippedCount ?? skipped?.length ?? 0;
      let msg = `Saved successfully. ${affected} allocation record(s) updated.`;
      if (skippedCount) msg += ` ${skippedCount} skipped (conflict policy: skip).`;
      setMessage(msg);
      if (form.allocationType === 'manual_adjustment') {
        setForm((p) => ({
          ...p,
          adjustmentDelta: '',
          adjustmentReason: ''
        }));
      }
      await Promise.all([loadSummary(), loadHistory()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save allocation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearForm = () => {
    setForm(initialForm());
    setFieldErrors({});
    setMessage('');
    setError('');
  };

  const isManual = form.allocationType === 'manual_adjustment';
  const isSetMode = !isManual;

  const summaryCards = [
    {
      key: 'alloc',
      label: 'Allocations',
      value: summaryLoading ? null : summary?.totalAllocations,
      hint: `Year ${summary?.year ?? form.year}`,
      icon: Layers
    },
    {
      key: 'types',
      label: 'Leave types',
      value: summaryLoading ? null : summary?.activeLeaveTypes ?? leaveTypes.length,
      hint: 'Active catalog',
      icon: Calendar
    },
    {
      key: 'people',
      label: 'Eligible users',
      value: summaryLoading ? null : summary?.employeesCovered ?? employeeOptions.length,
      hint: 'Staff pool',
      icon: Users
    },
    {
      key: 'year',
      label: 'Form year',
      value: form.year,
      hint: 'Filters stats & table',
      icon: Calendar,
      noSpinner: true
    }
  ];

  const formatShortDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return '—';
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-3xl space-y-4 px-0 sm:max-w-3xl">
        <header className="min-w-0 border-b border-gray-800/80 pb-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Admin · Leave</p>
          <h1 className="mt-0.5 text-lg font-semibold text-white sm:text-xl">Leave allocations</h1>
          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-gray-500 sm:text-sm">
            Bulk-set balances or adjust an individual ledger. Layout follows the same surfaces as other admin screens.
          </p>
        </header>

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
          {summaryCards.map(({ key, label, value, hint, icon: Icon, noSpinner }) => (
            <div
              key={key}
              className="flex min-w-0 flex-col rounded-lg border border-gray-700/90 bg-[#1E1E2A]/80 px-2.5 py-2 sm:px-3 sm:py-2.5"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  {label}
                </span>
                <Icon className="h-3 w-3 shrink-0 text-gray-600" aria-hidden />
              </div>
              <div className="mt-0.5 flex min-h-[1.375rem] items-center">
                {summaryLoading && !noSpinner ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#A88BFF]" aria-label="Loading" />
                ) : (
                  <span className="truncate text-base font-semibold tabular-nums text-white">
                    {value === null || value === undefined ? '—' : value}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[10px] text-gray-600">{hint}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-700 bg-[#2A2A3A] py-6 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin text-[#A88BFF]" />
            Loading…
          </div>
        ) : null}

        {message ? (
          <div
            className="rounded-lg border border-emerald-700/40 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-200/95"
            role="status"
          >
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-red-800/50 bg-red-950/25 px-3 py-2 text-sm text-red-200" role="alert">
            {error}
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-3">
          <SectionCard
            eyebrow="Step 1"
            title="Allocation scope"
            description="Who receives this update."
          >
            <div className="min-w-0">
              <FieldLabel required>Allocation type</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {ALLOCATION_TYPES.map(({ value, label, description, icon: Icon }) => {
                  const active = form.allocationType === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={submitting || loading}
                      onClick={() => onAllocationTypeChange(value)}
                      className={`flex min-w-0 gap-2 rounded-lg border px-2 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A88BFF]/50 disabled:opacity-50 ${
                        active
                          ? 'border-[#A88BFF]/60 bg-[#3d3558]/50'
                          : 'border-gray-700 bg-[#1E1E2A]/80 hover:border-gray-600'
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-gray-300 ${
                          active ? 'border-[#A88BFF]/40 bg-[#A88BFF]/15' : 'border-gray-700 bg-[#252532]'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-white">{label}</span>
                        <span className="line-clamp-2 text-[10px] leading-snug text-gray-500">{description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {fieldErrors.allocationType ? (
                <p className="text-xs text-red-400">{fieldErrors.allocationType}</p>
              ) : null}
            </div>

            {form.allocationType === 'company_wide' ? (
              <div className="flex gap-2 rounded-lg border border-gray-700/80 bg-[#1E1E2A]/60 p-2.5 text-xs leading-relaxed text-gray-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A88BFF]" aria-hidden />
                <p>Applies to all active users with roles employee, HR, or manager. Company admins excluded.</p>
              </div>
            ) : null}

            {form.allocationType === 'designation_wise' ? (
              <div className="min-w-0">
                <FieldLabel required>Roles</FieldLabel>
                <p className="mb-1.5 text-[11px] text-gray-500">Tenant account roles — not job titles.</p>
                <div className="flex flex-wrap gap-1.5">
                  {HRMS_ROLE_OPTIONS.map((opt) => {
                    const on = form.roles.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={submitting}
                        onClick={() => toggleStringInList('roles', opt.value)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A88BFF]/40 disabled:opacity-50 ${
                          on
                            ? 'border-[#A88BFF]/50 bg-[#A88BFF]/15 text-violet-100'
                            : 'border-gray-600 bg-[#1E1E2A] text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.roles ? <p className="text-xs text-red-400">{fieldErrors.roles}</p> : null}
              </div>
            ) : null}

            {(form.allocationType === 'employee_specific' || form.allocationType === 'manual_adjustment') && (
              <div className="min-w-0 max-w-md">
                <FieldLabel required>Employee</FieldLabel>
                <select
                  className={selectClass}
                  style={{ backgroundImage: SELECT_CHEVRON }}
                  value={form.employeeId}
                  onChange={(e) => setField('employeeId', e.target.value)}
                  disabled={submitting || loading}
                >
                  <option value="">Select employee</option>
                  {employeeOptions.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.employeeId ? <p className="text-xs text-red-400">{fieldErrors.employeeId}</p> : null}
              </div>
            )}
          </SectionCard>

          <SectionCard eyebrow="Step 2" title="Leave & period" description="Catalog types (non-archived).">
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <FieldLabel required>Leave type</FieldLabel>
                <select
                  className={selectClass}
                  style={{ backgroundImage: SELECT_CHEVRON }}
                  value={form.leaveTypeId}
                  onChange={(e) => setField('leaveTypeId', e.target.value)}
                  disabled={submitting || loading}
                >
                  <option value="">Select type</option>
                  {leaveTypes.map((lt) => (
                    <option key={lt._id} value={lt._id}>
                      {lt.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.leaveTypeId ? <p className="text-xs text-red-400">{fieldErrors.leaveTypeId}</p> : null}
              </div>
              <div className="min-w-0 sm:max-w-[140px]">
                <FieldLabel required>Year</FieldLabel>
                <input
                  className={inputClass}
                  type="number"
                  min="2020"
                  max="2100"
                  inputMode="numeric"
                  value={form.year}
                  onChange={(e) => setField('year', e.target.value)}
                  disabled={submitting || loading}
                />
                {fieldErrors.year ? <p className="text-xs text-red-400">{fieldErrors.year}</p> : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Step 3"
            title="Amount"
            description={
              isManual ? 'Manual delta (+ / −) with audit reason.' : 'Sets total allocated for the year.'
            }
          >
            {isSetMode ? (
              <div className="max-w-[200px]">
                <FieldLabel required>Allocated days</FieldLabel>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g. 12"
                  value={form.days}
                  onChange={(e) => setField('days', e.target.value)}
                  disabled={submitting || loading}
                />
                {fieldErrors.days ? <p className="text-xs text-red-400">{fieldErrors.days}</p> : null}
              </div>
            ) : (
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 sm:max-w-[200px]">
                  <FieldLabel required>Adjustment (days)</FieldLabel>
                  <input
                    className={inputClass}
                    type="number"
                    step="0.5"
                    placeholder="e.g. 2 or -1.5"
                    value={form.adjustmentDelta}
                    onChange={(e) => setField('adjustmentDelta', e.target.value)}
                    disabled={submitting || loading}
                  />
                  {fieldErrors.adjustmentDelta ? (
                    <p className="text-xs text-red-400">{fieldErrors.adjustmentDelta}</p>
                  ) : null}
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <FieldLabel required>Reason</FieldLabel>
                  <textarea
                    className={`${inputClass} min-h-[72px] resize-y py-2`}
                    placeholder="Required audit note"
                    value={form.adjustmentReason}
                    onChange={(e) => setField('adjustmentReason', e.target.value)}
                    disabled={submitting || loading}
                  />
                  {fieldErrors.adjustmentReason ? (
                    <p className="text-xs text-red-400">{fieldErrors.adjustmentReason}</p>
                  ) : null}
                </div>
              </div>
            )}
          </SectionCard>

          {isSetMode ? (
            <SectionCard
              eyebrow="Policy"
              title="If allocation already exists"
              description="Per employee, leave type and year."
            >
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setField('conflictPolicy', 'overwrite')}
                  className={`flex gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A88BFF]/45 disabled:opacity-50 ${
                    form.conflictPolicy === 'overwrite'
                      ? 'border-[#A88BFF]/55 bg-[#A88BFF]/10'
                      : 'border-gray-700 bg-[#1E1E2A]/80 hover:border-gray-600'
                  }`}
                >
                  <RefreshCw
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${form.conflictPolicy === 'overwrite' ? 'text-[#A88BFF]' : 'text-gray-500'}`}
                    aria-hidden
                  />
                  <span>
                    <span className="block text-xs font-medium text-white">Overwrite</span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-gray-500">Replace total allocated</span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setField('conflictPolicy', 'skip')}
                  className={`flex gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A88BFF]/45 disabled:opacity-50 ${
                    form.conflictPolicy === 'skip'
                      ? 'border-[#A88BFF]/55 bg-[#A88BFF]/10'
                      : 'border-gray-700 bg-[#1E1E2A]/80 hover:border-gray-600'
                  }`}
                >
                  <SkipForward
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${form.conflictPolicy === 'skip' ? 'text-[#A88BFF]' : 'text-gray-500'}`}
                    aria-hidden
                  />
                  <span>
                    <span className="block text-xs font-medium text-white">Skip exists</span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-gray-500">Keep existing rows</span>
                  </span>
                </button>
              </div>
            </SectionCard>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-gray-800 pt-3 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={handleClearForm}
              disabled={submitting || loading}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-600 px-3 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:bg-[#1E1E2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500/40 disabled:opacity-45"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={submitting || loading}
              className="inline-flex h-9 min-w-[160px] items-center justify-center gap-2 rounded-lg bg-[#A88BFF] px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A88BFF]/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                  Saving…
                </>
              ) : (
                'Apply allocation'
              )}
            </button>
          </div>
        </form>

        <section className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-gray-700/80 pb-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-gray-500" aria-hidden />
              <h2 className="text-sm font-semibold text-white">Recent allocations</h2>
            </div>
            <span className="text-[11px] text-gray-500">Year {form.year} · last 50 updates</span>
          </div>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  <th className="w-[22%] py-2 pl-1 pr-2">Employee</th>
                  <th className="w-[12%] py-2 pr-2">Code</th>
                  <th className="w-[18%] py-2 pr-2">Leave type</th>
                  <th className="w-[10%] py-2 pr-2 text-right">Allocated</th>
                  <th className="w-[8%] py-2 pr-2 text-right">Used</th>
                  <th className="w-[8%] py-2 pr-2 text-right">Pend.</th>
                  <th className="w-[14%] py-2 pr-2">Scope</th>
                  <th className="w-[8%] py-2 pr-1 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/90">
                {historyLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#A88BFF]" aria-label="Loading" />
                    </td>
                  </tr>
                ) : historyRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-sm text-gray-500">
                      No allocation rows for this year yet.
                    </td>
                  </tr>
                ) : (
                  historyRows.map((row) => (
                    <tr key={row._id} className="text-gray-300 hover:bg-[#1E1E2A]/50">
                      <td className="py-1.5 pl-1 pr-2">
                        <span className="line-clamp-2 font-medium text-gray-200" title={row.employeeName}>
                          {row.employeeName}
                        </span>
                      </td>
                      <td className="truncate py-1.5 pr-2 text-gray-500" title={row.employeeCode || ''}>
                        {row.employeeCode || '—'}
                      </td>
                      <td className="truncate py-1.5 pr-2" title={row.leaveTypeName}>
                        {row.leaveTypeName}
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-white">{row.totalAllocated}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-gray-400">{row.used}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-gray-400">{row.pending}</td>
                      <td className="truncate py-1.5 pr-2 text-gray-400">
                        {ALLOCATION_TYPE_LABELS[row.allocationType] || row.allocationType}
                      </td>
                      <td className="truncate py-1.5 pr-1 text-right text-[11px] text-gray-500">
                        {formatShortDate(row.updatedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminLeaveAllocations;
