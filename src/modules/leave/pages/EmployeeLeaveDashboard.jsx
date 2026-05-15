import React, { useEffect, useState } from 'react';
import { CalendarDays, Plus, RefreshCw } from 'lucide-react';
import {
  fetchLeaveTypes,
  fetchMyLeaveBalances,
  applyLeaveRequest,
  fetchLeaveHistory,
  withdrawLeaveRequest
} from '../../../api/leave';
import LeaveApplyModal from '../components/LeaveApplyModal';
import LeaveBalanceCard from '../components/LeaveBalanceCard';
import LeaveHistoryTable from '../components/LeaveHistoryTable';
import LeaveHolidaysSection from '../components/LeaveHolidaysSection';
import LeaveInsightsBar from '../components/LeaveInsightsBar';
import { surface } from '../leaveUi';

const EmployeeLeaveDashboard = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await applyLeaveRequest(payload);
      setSuccess('Leave request submitted successfully.');
      setApplyOpen(false);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply leave');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (id) => {
    if (!window.confirm('Withdraw this pending leave request?')) return;
    setError('');
    try {
      await withdrawLeaveRequest(id);
      setSuccess('Leave request withdrawn.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to withdraw leave');
    }
  };

  if (loading) {
    return (
      <div className={surface.page}>
        <div className="card p-10 text-center text-sm theme-text-secondary">Loading leave dashboard…</div>
      </div>
    );
  }

  return (
    <div className={surface.page}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold theme-text tracking-tight sm:text-2xl flex items-center gap-2">
            <CalendarDays className="h-6 w-6 theme-text-secondary" />
            Leave
          </h1>
          <p className={`${surface.muted} mt-1 max-w-2xl`}>
            View balances, request time off, and track approval status in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={surface.btnPrimary} onClick={() => setApplyOpen(true)}>
            <Plus className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            Apply for leave
          </button>
          <button type="button" className={surface.btnGhost} onClick={loadData} disabled={loading}>
            <RefreshCw className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-300">
          {success}
        </div>
      ) : null}

      <LeaveInsightsBar balances={balances} history={history} />

      <section>
        <div className="mb-3">
          <h2 className={surface.sectionTitle}>Leave balances</h2>
          <p className={surface.sectionSub}>Allocated, used, pending, and available by leave type.</p>
        </div>
        {balances.length === 0 ? (
          <div className="card py-10 text-center">
            <p className="text-sm theme-text-secondary">No leave allocations found for this period.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {balances.map((b) => (
              <LeaveBalanceCard key={b._id} allocation={b} />
            ))}
          </div>
        )}
      </section>

      <section
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 items-stretch w-full min-w-0"
        aria-label="Holidays and leave history"
      >
        <LeaveHolidaysSection className="min-w-0" />
        <LeaveHistoryTable
          className="min-w-0"
          history={history}
          leaveTypes={leaveTypes}
          onWithdraw={handleWithdraw}
        />
      </section>

      <LeaveApplyModal
        open={applyOpen}
        onClose={() => !submitting && setApplyOpen(false)}
        leaveTypes={leaveTypes}
        balances={balances}
        onSubmit={handleApply}
        submitting={submitting}
      />
    </div>
  );
};

export default EmployeeLeaveDashboard;
