import React, { useEffect, useState } from 'react';
import { fetchLeaveTypes, fetchMyLeaveBalances, applyLeaveRequest, fetchLeaveHistory } from '../../../api/leave';
import LeaveApplicationForm from '../components/LeaveApplicationForm';
import LeaveBalanceCard from '../components/LeaveBalanceCard';

const EmployeeLeaveDashboard = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [typesRes, balRes, histRes] = await Promise.all([
        fetchLeaveTypes(),
        fetchMyLeaveBalances(),
        fetchLeaveHistory()
      ]);
      setLeaveTypes(typesRes.data || []);
      setBalances(balRes.data || []);
      setHistory(histRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApply = async (payload) => {
    try {
      await applyLeaveRequest(payload);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply leave');
    }
  };

  if (loading) return <div className="text-gray-200">Loading leave dashboard...</div>;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-white">Leave Dashboard</h1>
      {error ? <p className="text-red-400">{error}</p> : null}
      <LeaveApplicationForm leaveTypes={leaveTypes} onSubmit={handleApply} />
      <div className="grid gap-3 md:grid-cols-3">
        {balances.map((b) => (
          <LeaveBalanceCard key={b._id} allocation={b} />
        ))}
      </div>
      <div className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4">
        <h2 className="text-white font-medium mb-2">Leave History</h2>
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h._id} className="rounded bg-[#1E1E2A] p-2 text-sm text-gray-200">
              {new Date(h.fromDate).toLocaleDateString()} - {new Date(h.toDate).toLocaleDateString()} | {h.status}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmployeeLeaveDashboard;
