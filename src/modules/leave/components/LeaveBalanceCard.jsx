import React from 'react';

const LeaveBalanceCard = ({ allocation }) => {
  const available = Number((allocation.totalAllocated - allocation.used - allocation.pending).toFixed(2));
  return (
    <div className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4">
      <h3 className="text-white font-semibold">{allocation.leaveTypeId?.name || 'Leave Type'}</h3>
      <p className="text-sm text-gray-300 mt-2">Allocated: {allocation.totalAllocated}</p>
      <p className="text-sm text-gray-300">Used: {allocation.used}</p>
      <p className="text-sm text-gray-300">Pending: {allocation.pending}</p>
      <p className="text-sm text-green-400 font-medium mt-1">Available: {available}</p>
    </div>
  );
};

export default LeaveBalanceCard;
