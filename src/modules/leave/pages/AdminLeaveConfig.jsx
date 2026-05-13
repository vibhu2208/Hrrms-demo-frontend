import React, { useEffect, useState } from 'react';
import { fetchEscalatedLeaves, fetchHolidays, createHoliday, deleteHoliday, adminOverrideLeave } from '../../../api/leave';

const AdminLeaveConfig = () => {
  const [escalations, setEscalations] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');

  const load = async () => {
    const [escRes, holRes] = await Promise.all([fetchEscalatedLeaves(), fetchHolidays()]);
    setEscalations(escRes.data || []);
    setHolidays(holRes.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const addHoliday = async () => {
    if (!holidayName || !holidayDate) return;
    await createHoliday({ name: holidayName, date: holidayDate, isOptional: false });
    setHolidayName('');
    setHolidayDate('');
    await load();
  };

  const takeAdminAction = async (leaveId, status) => {
    const note = window.prompt(
      status === 'approved' ? 'Approval note (required)' : 'Rejection note (required)'
    );
    if (!note) return;
    await adminOverrideLeave(leaveId, { status, note });
    await load();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-white">Admin Leave Configuration</h1>
      <section className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4">
        <h2 className="text-white font-medium">Admin Leave Approval Inbox</h2>
        {escalations.map((e) => (
          <div key={e._id} className="mt-2 rounded border border-gray-700 bg-[#1E1E2A] p-3 text-sm text-gray-200">
            <p className="font-medium text-white">{e.requesterName || 'Unknown User'}</p>
            <p className="text-gray-300">Type: {e.leaveTypeName || 'Unknown Leave Type'}</p>
            <p className="text-gray-300">
              Dates: {new Date(e.fromDate).toLocaleDateString()} - {new Date(e.toDate).toLocaleDateString()}
            </p>
            <p className="text-gray-400">Status: {e.status}</p>
            <p className="text-xs text-yellow-400 mt-1">
              {e.inboxReason === 'manager_self_request'
                ? 'Manager self-request (Admin action required)'
                : 'Escalated due to manager inaction'}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                className="rounded bg-green-600 px-3 py-1 text-white"
                onClick={() => takeAdminAction(e._id, 'approved')}
              >
                Approve
              </button>
              <button
                className="rounded bg-red-600 px-3 py-1 text-white"
                onClick={() => takeAdminAction(e._id, 'rejected')}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
        {escalations.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">No pending leave approvals requiring admin action.</p>
        ) : null}
      </section>
      <section className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4">
        <h2 className="text-white font-medium mb-2">Holiday Master</h2>
        <div className="flex gap-2 mb-3">
          <input className="rounded bg-[#1E1E2A] p-2 text-white" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="Holiday name" />
          <input className="rounded bg-[#1E1E2A] p-2 text-white" type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
          <button className="rounded bg-[#A88BFF] px-3 py-2 text-white" onClick={addHoliday}>Add</button>
        </div>
        {holidays.map((h) => (
          <div key={h._id} className="flex items-center justify-between text-sm text-gray-300 mb-1">
            <span>{new Date(h.date).toLocaleDateString()} - {h.name}</span>
            <button className="text-red-400" onClick={() => deleteHoliday(h._id).then(load)}>Delete</button>
          </div>
        ))}
      </section>
    </div>
  );
};

export default AdminLeaveConfig;
