import React from 'react';

const SliceApprovalView = ({ rows, onApprove, onSendBack }) => {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row._id} className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-3">
          <p className="text-white">{new Date(row.entryDate).toLocaleDateString()} | {row.hours}h</p>
          <p className="text-sm text-gray-400">{row.taskDescription}</p>
          <div className="mt-2 flex gap-2">
            <button className="rounded bg-green-600 px-3 py-1 text-sm text-white" onClick={() => onApprove(row.projectId)}>Approve Slice</button>
            <button className="rounded bg-yellow-600 px-3 py-1 text-sm text-white" onClick={() => onSendBack(row.projectId)}>Send Back</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SliceApprovalView;
