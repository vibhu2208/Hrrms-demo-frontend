import React, { useEffect, useState } from 'react';
import { fetchManagerTimesheetQueue, unlockTimesheet } from '../../../api/timesheet';

const AdminTimesheetView = () => {
  const [rows, setRows] = useState([]);

  const load = async () => {
    const res = await fetchManagerTimesheetQueue();
    setRows(res.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const unlock = async (id) => {
    const note = window.prompt('Unlock reason (required)');
    if (!note) return;
    await unlockTimesheet(id, { note });
    await load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Admin Timesheet Global View</h1>
      {rows.map((row) => (
        <div key={row._id} className="rounded bg-[#2A2A3A] p-3 text-gray-200">
          <p>{new Date(row.periodStart).toLocaleDateString()} - {row.overallStatus}</p>
          <button className="mt-2 rounded bg-yellow-600 px-3 py-1 text-sm text-white" onClick={() => unlock(row._id)}>
            Unlock (Admin)
          </button>
        </div>
      ))}
    </div>
  );
};

export default AdminTimesheetView;
