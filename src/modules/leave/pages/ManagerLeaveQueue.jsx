import React, { useEffect, useState } from 'react';
import { fetchManagerLeaveQueue, actionLeaveRequest } from '../../../api/leave';

const ManagerLeaveQueue = () => {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const loadQueue = async () => {
    try {
      const res = await fetchManagerLeaveQueue();
      setRows(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load manager queue');
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const act = async (id, decision) => {
    const row = rows.find((item) => item._id === id);
    if (row?.legacy) {
      setError('Legacy leave records are read-only in this queue. Please action them from the existing leave workflow.');
      return;
    }
    const note = decision === 'reject' ? window.prompt('Rejection reason is required') : window.prompt('Optional note');
    if (decision === 'reject' && !note) return;
    await actionLeaveRequest(id, { decision, note });
    await loadQueue();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Manager Leave Queue</h1>
      {error ? <p className="text-red-400">{error}</p> : null}
      {rows.map((row) => (
        <div key={row._id} className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4 text-gray-200">
          <div className="space-y-1">
            <p className="text-base font-semibold text-white">{row.requesterName || 'Unknown User'}</p>
            <p className="text-sm text-gray-300">
              Leave Type: <span className="text-gray-100">{row.leaveTypeName || 'Unknown Leave Type'}</span>
            </p>
            <p className="text-sm text-gray-300">
              Dates:{' '}
              <span className="text-gray-100">
                {new Date(row.fromDate).toLocaleDateString()} - {new Date(row.toDate).toLocaleDateString()}
              </span>
            </p>
            {row.durationDays ? (
              <p className="text-sm text-gray-300">
                Duration: <span className="text-gray-100">{row.durationDays} day(s)</span>
              </p>
            ) : null}
            <p className="text-sm text-gray-300">
              Status: <span className="text-gray-100">{row.status || 'pending'}</span>
            </p>
          </div>
          <p className="mt-2 text-sm text-gray-400">{row.reason || 'No reason provided'}</p>
          {row.legacy ? <p className="text-xs text-yellow-400 mt-1">Legacy record (read-only)</p> : null}
          <div className="mt-3 flex gap-2">
            <button onClick={() => act(row._id, 'approve')} className="rounded bg-green-600 px-3 py-1 text-sm">Approve</button>
            <button onClick={() => act(row._id, 'reject')} className="rounded bg-red-600 px-3 py-1 text-sm">Reject</button>
          </div>
        </div>
      ))}
      {rows.length === 0 && !error ? (
        <div className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4 text-sm text-gray-300">
          No pending leave requests found. Once employees apply for leave, requests will appear here.
        </div>
      ) : null}
    </div>
  );
};

export default ManagerLeaveQueue;
