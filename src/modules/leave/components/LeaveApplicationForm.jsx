import React, { useState } from 'react';

const LeaveApplicationForm = ({ leaveTypes, onSubmit }) => {
  const [form, setForm] = useState({
    leaveTypeId: '',
    fromDate: '',
    toDate: '',
    halfDay: false,
    halfDayPeriod: '',
    reason: '',
    attachmentUrl: ''
  });
  const selectedLeaveType = leaveTypes.find((lt) => lt._id === form.leaveTypeId);
  const halfDayAllowed = selectedLeaveType?.allowHalfDay !== false;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-700 bg-[#2A2A3A] p-4">
      <select
        className="w-full rounded bg-[#1E1E2A] p-2 text-white"
        value={form.leaveTypeId}
        onChange={(e) =>
          setForm((prev) => ({
            ...prev,
            leaveTypeId: e.target.value,
            halfDay: false,
            halfDayPeriod: ''
          }))
        }
        required
      >
        <option value="">Select leave type</option>
        {leaveTypes.map((lt) => (
          <option key={lt._id} value={lt._id}>
            {lt.name}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input
          className="rounded bg-[#1E1E2A] p-2 text-white"
          type="date"
          value={form.fromDate}
          onChange={(e) => setForm((prev) => ({ ...prev, fromDate: e.target.value }))}
          required
        />
        <input
          className="rounded bg-[#1E1E2A] p-2 text-white"
          type="date"
          value={form.toDate}
          onChange={(e) => setForm((prev) => ({ ...prev, toDate: e.target.value }))}
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={form.halfDay}
          disabled={!halfDayAllowed}
          onChange={(e) => setForm((prev) => ({ ...prev, halfDay: e.target.checked }))}
        />
        Half-day leave
      </label>
      {!halfDayAllowed && selectedLeaveType ? (
        <p className="text-xs text-yellow-400">Half-day is not allowed for this leave type policy.</p>
      ) : null}
      {form.halfDay && (
        <select
          className="w-full rounded bg-[#1E1E2A] p-2 text-white"
          value={form.halfDayPeriod}
          onChange={(e) => setForm((prev) => ({ ...prev, halfDayPeriod: e.target.value }))}
          required
        >
          <option value="">Select period</option>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
        </select>
      )}
      <textarea
        className="w-full rounded bg-[#1E1E2A] p-2 text-white"
        rows="3"
        placeholder="Reason"
        value={form.reason}
        onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
      />
      <input
        className="w-full rounded bg-[#1E1E2A] p-2 text-white"
        placeholder="Attachment URL (if policy requires)"
        value={form.attachmentUrl}
        onChange={(e) => setForm((prev) => ({ ...prev, attachmentUrl: e.target.value }))}
      />
      {selectedLeaveType ? (
        <div className="rounded border border-gray-700 p-2 text-xs text-gray-300">
          <p>
            Policy: notice {selectedLeaveType.minNoticeDays || 0} day(s), max request{' '}
            {selectedLeaveType.maxDaysPerRequest || 'NA'}, weekends{' '}
            {selectedLeaveType.countWeekends ? 'counted' : 'excluded'}.
          </p>
        </div>
      ) : null}
      <button className="rounded bg-[#A88BFF] px-4 py-2 text-white">Submit Leave Request</button>
    </form>
  );
};

export default LeaveApplicationForm;
