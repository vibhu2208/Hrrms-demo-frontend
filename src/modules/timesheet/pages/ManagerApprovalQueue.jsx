import React, { useEffect, useState } from 'react';
import {
  fetchManagerTimesheetQueue,
  fetchTimesheetDetail,
  approveWholeWeek,
  sendBackParticularDay
} from '../../../api/timesheet';

const ManagerApprovalQueue = () => {
  const [queue, setQueue] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedTimesheetId, setSelectedTimesheetId] = useState(null);
  const [selectedTimesheetMeta, setSelectedTimesheetMeta] = useState(null);
  const [error, setError] = useState('');

  const loadQueue = async () => {
    try {
      const res = await fetchManagerTimesheetQueue();
      setQueue(res.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load timesheet queue');
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const openDetails = async (timesheetId) => {
    const selected = queue.find((item) => item._id === timesheetId);
    if (selected?.source === 'legacy') {
      setSelectedRows([]);
      setSelectedTimesheetId(null);
      setError('Legacy timesheet records are read-only in this queue.');
      return;
    }
    try {
      const res = await fetchTimesheetDetail(timesheetId);
      setSelectedRows(res.data.entries || []);
      setSelectedTimesheetId(timesheetId);
      const sourceMeta = queue.find((item) => item._id === timesheetId);
      setSelectedTimesheetMeta({
        employeeName: res.data.employeeName || sourceMeta?.employeeName || 'Unknown User',
        periodStart: res.data.timesheet?.periodStart || sourceMeta?.periodStart,
        periodEnd: res.data.timesheet?.periodEnd || sourceMeta?.periodEnd
      });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load timesheet details');
    }
  };

  const handleApproveWholeWeek = async () => {
    if (!selectedTimesheetId) return;
    await approveWholeWeek(selectedTimesheetId);
    await openDetails(selectedTimesheetId);
    await loadQueue();
  };

  const handleSendBackDay = async () => {
    if (!selectedTimesheetId) return;
    const uniqueDays = [...new Set(selectedRows.map((r) => new Date(r.entryDate).toISOString().slice(0, 10)))];
    if (!uniqueDays.length) return;
    const day = window.prompt(`Enter day to send back (${uniqueDays.join(', ')})`);
    if (!day) return;
    const reason = window.prompt('Reason for send back (required)');
    if (!reason) return;
    await sendBackParticularDay(selectedTimesheetId, { date: day, reason });
    await openDetails(selectedTimesheetId);
    await loadQueue();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Manager Timesheet Queue</h1>
      {error ? <p className="text-red-400">{error}</p> : null}
      <div className="grid gap-2">
        {queue.map((q) => (
          <button key={q._id} onClick={() => openDetails(q._id)} className="rounded bg-[#2A2A3A] p-3 text-left text-gray-200">
            <div className="font-medium">{q.employeeName || 'Unknown User'}</div>
            <div className="text-sm text-gray-400">
              Week: {new Date(q.periodStart).toLocaleDateString()} - {new Date(q.periodEnd).toLocaleDateString()}
            </div>
            <div className="text-xs text-gray-300 mt-1">Status: {q.overallStatus}</div>
            {q.source === 'legacy' ? <span className="ml-2 text-xs text-yellow-400">(legacy)</span> : null}
          </button>
        ))}
      </div>
      {queue.length === 0 && !error ? (
        <div className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4 text-sm text-gray-300">
          No submitted timesheets found. Submitted project slices will appear here.
        </div>
      ) : null}
      {selectedTimesheetId ? (
        <div className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4">
          <h2 className="text-white font-medium mb-3">Weekly Timesheet Details (Tabular)</h2>
          {selectedTimesheetMeta ? (
            <div className="mb-3 rounded bg-[#1E1E2A] p-3 text-sm text-gray-200">
              <div><span className="text-gray-400">Employee:</span> {selectedTimesheetMeta.employeeName}</div>
              <div>
                <span className="text-gray-400">Week:</span>{' '}
                {new Date(selectedTimesheetMeta.periodStart).toLocaleDateString()} -{' '}
                {new Date(selectedTimesheetMeta.periodEnd).toLocaleDateString()}
              </div>
            </div>
          ) : null}
          <div className="mb-3 flex gap-2">
            <button className="rounded bg-green-600 px-3 py-2 text-sm text-white" onClick={handleApproveWholeWeek}>
              Approve Whole Week
            </button>
            <button className="rounded bg-yellow-600 px-3 py-2 text-sm text-white" onClick={handleSendBackDay}>
              Send Back Particular Day
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm text-gray-200">
              <thead>
                <tr className="border-b border-gray-700 text-gray-300">
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Project</th>
                  <th className="p-2 text-left">Task</th>
                  <th className="p-2 text-left">Hours</th>
                  <th className="p-2 text-left">Entry Type</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Send Back Reason</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.map((row) => (
                  <tr key={row._id} className="border-b border-gray-800">
                    <td className="p-2">{new Date(row.entryDate).toLocaleDateString()}</td>
                    <td className="p-2">{row.projectName || row.projectId || '-'}</td>
                    <td className="p-2">{row.taskDescription || '-'}</td>
                    <td className="p-2">{row.hours}</td>
                    <td className="p-2">{row.entryType}</td>
                    <td className="p-2">{row.sliceStatus}</td>
                    <td className="p-2">{row.sentBackReason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ManagerApprovalQueue;
