import React, { useEffect, useState } from 'react';
import { createLeaveType, fetchLeaveTypes, updateLeaveType } from '../../../api/leave';

const initialForm = {
  name: '',
  isPaid: true,
  carryoverAllowed: false,
  maxCarryoverDays: '',
  resetCycle: 'yearly',
  requiresDocument: false,
  minNoticeDays: 0,
  maxDaysPerRequest: '',
  allowHalfDay: false,
  genderRestriction: 'all',
  probationAllowed: true,
  attachmentRequiredAfterDays: '',
  sandwichPolicyApplicable: false,
  countWeekends: false,
  maxConsecutiveDays: '',
  autoApproval: false
};

const numberFields = [
  'minNoticeDays',
  'maxCarryoverDays',
  'maxDaysPerRequest',
  'attachmentRequiredAfterDays',
  'maxConsecutiveDays'
];

const AdminLeaveTypes = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetchLeaveTypes({ includeArchived: true });
      setRows(res.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leave types');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form };
      numberFields.forEach((field) => {
        payload[field] = payload[field] === '' ? null : Number(payload[field]);
      });
      payload.minNoticeDays = Number(form.minNoticeDays || 0);
      if (editingId) {
        await updateLeaveType(editingId, payload);
      } else {
        await createLeaveType(payload);
      }
      setForm(initialForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save leave type');
    } finally {
      setSaving(false);
    }
  };

  const editRow = (row) => {
    setEditingId(row._id);
    setForm({
      name: row.name || '',
      isPaid: Boolean(row.isPaid),
      carryoverAllowed: Boolean(row.carryoverAllowed),
      maxCarryoverDays: row.maxCarryoverDays ?? '',
      resetCycle: row.resetCycle || 'yearly',
      requiresDocument: Boolean(row.requiresDocument),
      minNoticeDays: row.minNoticeDays ?? 0,
      maxDaysPerRequest: row.maxDaysPerRequest ?? '',
      allowHalfDay: Boolean(row.allowHalfDay),
      genderRestriction: row.genderRestriction || 'all',
      probationAllowed: row.probationAllowed !== false,
      attachmentRequiredAfterDays: row.attachmentRequiredAfterDays ?? '',
      sandwichPolicyApplicable: Boolean(row.sandwichPolicyApplicable),
      countWeekends: Boolean(row.countWeekends),
      maxConsecutiveDays: row.maxConsecutiveDays ?? '',
      autoApproval: Boolean(row.autoApproval)
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const toggleArchive = async (row) => {
    try {
      await updateLeaveType(row._id, { isArchived: !row.isArchived });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update leave type');
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-white">Leave Type Management</h1>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <form onSubmit={submit} className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4 space-y-5">
        <h2 className="text-white font-medium">{editingId ? 'Edit Leave Type' : 'Create Leave Type'}</h2>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-200">Basic Setup</p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm text-gray-300">
              <span>Leave type name</span>
              <input
                className="w-full rounded bg-[#1E1E2A] p-2 text-white"
                placeholder="e.g. Casual Leave"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
            <label className="space-y-1 text-sm text-gray-300">
              <span>Leave cycle</span>
              <select
                className="w-full rounded bg-[#1E1E2A] p-2 text-white"
                value={form.resetCycle}
                onChange={(e) => setForm((prev) => ({ ...prev, resetCycle: e.target.value }))}
              >
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label className="space-y-1 text-sm text-gray-300">
              <span>Minimum notice days</span>
              <input
                className="w-full rounded bg-[#1E1E2A] p-2 text-white"
                type="number"
                value={form.minNoticeDays}
                onChange={(e) => setForm((prev) => ({ ...prev, minNoticeDays: e.target.value }))}
                min="0"
              />
            </label>
            <label className="space-y-1 text-sm text-gray-300">
              <span>Gender restriction</span>
              <select
                className="w-full rounded bg-[#1E1E2A] p-2 text-white"
                value={form.genderRestriction}
                onChange={(e) => setForm((prev) => ({ ...prev, genderRestriction: e.target.value }))}
              >
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-200">Limits and Rules</p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm text-gray-300">
              <span>Max days per request</span>
              <input
                className="w-full rounded bg-[#1E1E2A] p-2 text-white"
                type="number"
                min="0.5"
                step="0.5"
                value={form.maxDaysPerRequest}
                onChange={(e) => setForm((prev) => ({ ...prev, maxDaysPerRequest: e.target.value }))}
              />
              <small className="text-xs text-gray-500">Leave days allowed in a single request.</small>
            </label>
            <label className="space-y-1 text-sm text-gray-300">
              <span>Max consecutive days</span>
              <input
                className="w-full rounded bg-[#1E1E2A] p-2 text-white"
                type="number"
                min="1"
                value={form.maxConsecutiveDays}
                onChange={(e) => setForm((prev) => ({ ...prev, maxConsecutiveDays: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm text-gray-300">
              <span>Attachment required after days</span>
              <input
                className="w-full rounded bg-[#1E1E2A] p-2 text-white"
                type="number"
                min="0.5"
                step="0.5"
                value={form.attachmentRequiredAfterDays}
                onChange={(e) => setForm((prev) => ({ ...prev, attachmentRequiredAfterDays: e.target.value }))}
              />
              <small className="text-xs text-gray-500">Example: 2 means leave above 2 days needs proof.</small>
            </label>
            <label className="space-y-1 text-sm text-gray-300">
              <span>Max carryover days</span>
              <input
                className="w-full rounded bg-[#1E1E2A] p-2 text-white"
                type="number"
                min="0"
                value={form.maxCarryoverDays}
                onChange={(e) => setForm((prev) => ({ ...prev, maxCarryoverDays: e.target.value }))}
              />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-200">Policy Toggles</p>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['isPaid', 'Paid leave'],
              ['carryoverAllowed', 'Carryover allowed'],
              ['requiresDocument', 'Always requires document'],
              ['allowHalfDay', 'Allow half-day request'],
              ['probationAllowed', 'Allow during probation'],
              ['sandwichPolicyApplicable', 'Sandwich policy applicable'],
              ['countWeekends', 'Count weekends'],
              ['autoApproval', 'Auto approve requests']
            ].map(([key, label]) => (
              <label key={key} className="flex items-start gap-2 rounded border border-gray-700 p-3 text-sm text-gray-300">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(form[key])}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button className="rounded bg-[#A88BFF] px-4 py-2 text-white" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update Type' : 'Create Type'}
          </button>
          {editingId ? (
            <button type="button" className="rounded bg-gray-600 px-4 py-2 text-white" onClick={resetForm}>
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4">
        <h2 className="text-white font-medium mb-3">Existing Leave Types</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <div key={row._id} className="rounded bg-[#1E1E2A] p-3 text-sm text-gray-200">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-white">{row.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      row.isArchived ? 'bg-yellow-700 text-yellow-100' : 'bg-emerald-700 text-emerald-100'
                    }`}
                  >
                    {row.isArchived ? 'Archived' : 'Active'}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-300">
                  <p>Type: {row.isPaid ? 'Paid' : 'Unpaid'}</p>
                  <p>Half-day: {row.allowHalfDay ? 'Allowed' : 'No'}</p>
                  <p>Auto approval: {row.autoApproval ? 'Enabled' : 'Manual'}</p>
                  <p>Carry forward: {row.carryoverAllowed ? 'Enabled' : 'No'}</p>
                  <p>Max request: {row.maxDaysPerRequest ?? 'NA'}</p>
                  <p>Weekend policy: {row.countWeekends ? 'Counted' : 'Excluded'}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="rounded bg-indigo-600 px-3 py-1 text-xs text-white" onClick={() => editRow(row)}>
                  Edit
                </button>
                <button
                  className={`rounded px-3 py-1 text-xs ${row.isArchived ? 'bg-green-600' : 'bg-yellow-600'} text-white`}
                  onClick={() => toggleArchive(row)}
                >
                  {row.isArchived ? 'Unarchive' : 'Archive'}
                </button>
              </div>
            </div>
          ))}
          {rows.length === 0 ? <p className="text-sm text-gray-400">No leave types created yet.</p> : null}
        </div>
      </div>
    </div>
  );
};

export default AdminLeaveTypes;
