import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ClipboardList, Inbox, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { actionLeaveRequest, fetchManagerLeaveQueue } from '../../../api/leave';
import LeaveApprovalModal from '../components/manager/LeaveApprovalModal';
import ManagerLeaveRequestCard from '../components/manager/ManagerLeaveRequestCard';
import ManagerQueueStats from '../components/manager/ManagerQueueStats';
import ManagerTeamLeaveCalendar from '../components/manager/ManagerTeamLeaveCalendar';
import { surface } from '../leaveUi';

const TABS = [
  { id: 'queue', label: 'Approval queue', icon: ClipboardList },
  { id: 'calendar', label: 'Team calendar', icon: CalendarDays }
];

const ManagerLeaveQueue = () => {
  const [activeTab, setActiveTab] = useState('queue');
  const [calendarKey, setCalendarKey] = useState(0);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('approve');
  const [activeRequest, setActiveRequest] = useState(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) params.q = search.trim();
      if (leaveTypeFilter.trim()) params.leaveType = leaveTypeFilter.trim();
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const res = await fetchManagerLeaveQueue(params);
      setRows(res.data || []);
      setMeta(res.meta || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load approval queue');
    } finally {
      setLoading(false);
    }
  }, [search, leaveTypeFilter, fromDate, toDate]);

  useEffect(() => {
    if (activeTab !== 'queue') return undefined;
    const t = setTimeout(() => {
      loadQueue();
    }, 300);
    return () => clearTimeout(t);
  }, [loadQueue, activeTab]);

  const leaveTypes = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      if (r.leaveTypeName) set.add(r.leaveTypeName);
    });
    return Array.from(set).sort();
  }, [rows]);

  const pendingCount = meta?.pendingCount ?? rows.length;

  const openModal = (row, mode) => {
    if (row.legacy) {
      toast.error('Legacy records are read-only in this queue.');
      return;
    }
    setActiveRequest(row);
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleConfirm = async (note) => {
    if (!activeRequest) return;
    setActing(true);
    try {
      await actionLeaveRequest(activeRequest._id, {
        decision: modalMode === 'reject' ? 'reject' : 'approve',
        note
      });
      toast.success(modalMode === 'reject' ? 'Leave request rejected' : 'Leave request approved');
      setModalOpen(false);
      setActiveRequest(null);
      await loadQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
      throw err;
    } finally {
      setActing(false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'queue') loadQueue();
    else setCalendarKey((k) => k + 1);
  };

  return (
    <div className={surface.page}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold theme-text tracking-tight sm:text-2xl flex items-center gap-2">
            <ClipboardList className="h-6 w-6 theme-text-secondary" />
            Leave approvals
          </h1>
          <p className={`${surface.muted} mt-1 max-w-2xl`}>
            Review pending requests or open the team calendar to plan coverage.
          </p>
        </div>
        <button type="button" className={surface.btnGhost} onClick={handleRefresh} disabled={loading && activeTab === 'queue'}>
          <RefreshCw
            className={`inline h-3.5 w-3.5 mr-1.5 -mt-0.5 ${loading && activeTab === 'queue' ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</div>
      ) : null}

      <ManagerQueueStats meta={meta} loading={loading && activeTab === 'queue'} />

      <div className="card !p-1">
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-1 p-1"
          role="tablist"
          aria-label="Leave approval sections"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const selected = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`leave-tab-${id}`}
                id={`leave-tab-btn-${id}`}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  selected
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'theme-text-secondary hover:theme-text hover:bg-white/5'
                }`}
                onClick={() => setActiveTab(id)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
                {id === 'queue' && pendingCount > 0 ? (
                  <span
                    className={`ml-0.5 min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                      selected ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-200'
                    }`}
                  >
                    {pendingCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'queue' ? (
        <section
          id="leave-tab-queue"
          role="tabpanel"
          aria-labelledby="leave-tab-btn-queue"
          className="space-y-4"
        >
          <div className={surface.card}>
            <div className={`${surface.section} border-b theme-border`}>
              <h2 className={surface.sectionTitle}>Pending approvals</h2>
              <p className={surface.sectionSub}>Action leave requests from your team.</p>
            </div>
            <div className={surface.section}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-2 lg:col-span-5">
                <label className={surface.label} htmlFor="queue-search">
                  Employee
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 theme-text-secondary pointer-events-none" />
                  <input
                    id="queue-search"
                    className={`${surface.input} w-full !pl-9`}
                    placeholder="Search by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="sm:col-span-1 lg:col-span-3">
                <label className={surface.label} htmlFor="queue-leave-type">
                  Leave type
                </label>
                <select
                  id="queue-leave-type"
                  className={`${surface.select} w-full`}
                  value={leaveTypeFilter}
                  onChange={(e) => setLeaveTypeFilter(e.target.value)}
                >
                  <option value="">All types</option>
                  {leaveTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1 lg:col-span-2">
                <label className={surface.label} htmlFor="queue-from">
                  From
                </label>
                <input
                  id="queue-from"
                  type="date"
                  className={`${surface.input} w-full`}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="sm:col-span-1 lg:col-span-2">
                <label className={surface.label} htmlFor="queue-to">
                  To
                </label>
                <input
                  id="queue-to"
                  type="date"
                  className={`${surface.input} w-full`}
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="card h-32 animate-pulse theme-surface" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="card py-14 text-center">
              <Inbox className="mx-auto h-10 w-10 theme-text-secondary opacity-50" />
              <p className="mt-3 text-sm font-medium theme-text">No pending requests</p>
              <p className={`${surface.muted} mt-1 max-w-sm mx-auto`}>
                When your team submits leave, requests will appear here for approval.
              </p>
              <button
                type="button"
                className={`${surface.btnSecondary} mt-4`}
                onClick={() => setActiveTab('calendar')}
              >
                View team calendar
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <ManagerLeaveRequestCard
                  key={row._id}
                  row={row}
                  disabled={acting}
                  onApprove={(r) => openModal(r, 'approve')}
                  onReject={(r) => openModal(r, 'reject')}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section
          id="leave-tab-calendar"
          role="tabpanel"
          aria-labelledby="leave-tab-btn-calendar"
          className="card !p-4 sm:!p-5"
        >
          <ManagerTeamLeaveCalendar key={calendarKey} embedded />
        </section>
      )}

      <LeaveApprovalModal
        open={modalOpen}
        mode={modalMode}
        request={activeRequest}
        onClose={() => !acting && setModalOpen(false)}
        onConfirm={handleConfirm}
        submitting={acting}
      />
    </div>
  );
};

export default ManagerLeaveQueue;
