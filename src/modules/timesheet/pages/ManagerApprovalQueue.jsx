import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Inbox, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  approveWholeWeek,
  fetchManagerTimesheetQueue,
  fetchTimesheetDetail,
  sendBackParticularDay
} from '../../../api/timesheet';
import ManagerTimesheetQueueCard from '../components/manager/ManagerTimesheetQueueCard';
import ManagerTimesheetQueueStats from '../components/manager/ManagerTimesheetQueueStats';
import TimesheetApprovalModal from '../components/manager/TimesheetApprovalModal';
import TimesheetDetailPanel from '../components/manager/TimesheetDetailPanel';
import { entryDayKey, surface } from '../timesheetUi';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Awaiting review' },
  { value: 'submitted', label: 'Submitted only' },
  { value: 'partially_approved', label: 'Partially approved' },
  { value: 'fully_approved', label: 'Fully approved' },
  { value: 'all', label: 'All statuses' }
];

const SORT_OPTIONS = [
  { value: 'submitted_desc', label: 'Recently submitted' },
  { value: 'period_desc', label: 'Week (newest)' },
  { value: 'period_asc', label: 'Week (oldest)' },
  { value: 'employee_asc', label: 'Employee A–Z' }
];

const ManagerApprovalQueue = () => {
  const [queue, setQueue] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState('submitted_desc');

  const [selectedId, setSelectedId] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [detail, setDetail] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('approve');

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { status: statusFilter, sort };
      if (search.trim()) params.q = search.trim();
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const res = await fetchManagerTimesheetQueue(params);
      setQueue(res.data || []);
      setMeta(res.meta || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load timesheet queue');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, fromDate, toDate, sort]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadQueue();
    }, 300);
    return () => clearTimeout(t);
  }, [loadQueue]);

  const loadDetail = useCallback(async (row) => {
    if (!row || row.legacy) {
      setDetail(null);
      setSelectedId(row?._id || null);
      setSelectedRow(row || null);
      if (row?.legacy) {
        toast.error('Legacy timesheet records are read-only in this queue.');
      }
      return;
    }
    setSelectedId(row._id);
    setSelectedRow(row);
    setDetailLoading(true);
    try {
      const res = await fetchTimesheetDetail(row._id);
      setDetail(res.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load timesheet details');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const sendBackDayOptions = useMemo(() => {
    const keys = new Set();
    (detail?.entries || []).forEach((e) => {
      const type = e.entryType || 'work';
      if (!['work', 'training', 'internal'].includes(type)) return;
      if (!['submitted', 'under_review'].includes(String(e.sliceStatus || '').toLowerCase())) return;
      const k = entryDayKey(e.entryDate);
      if (k) keys.add(k);
    });
    return [...keys].sort();
  }, [detail]);

  const openModal = (mode) => {
    if (!selectedRow || selectedRow.legacy) {
      toast.error('Legacy records are read-only.');
      return;
    }
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleModalConfirm = async (payload) => {
    if (!selectedId) return;
    setActing(true);
    try {
      if (modalMode === 'sendBack') {
        await sendBackParticularDay(selectedId, payload);
        toast.success('Day sent back for correction');
      } else {
        await approveWholeWeek(selectedId);
        toast.success('Whole week approved');
      }
      setModalOpen(false);
      await loadDetail(selectedRow);
      await loadQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
      throw err;
    } finally {
      setActing(false);
    }
  };

  const pendingCount = meta?.pendingCount ?? queue.length;

  return (
    <div className={surface.page}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold theme-text tracking-tight sm:text-2xl flex items-center gap-2">
            <ClipboardList className="h-6 w-6 theme-text-secondary" />
            Timesheet approvals
          </h1>
          <p className={`${surface.muted} mt-1 max-w-2xl`}>
            Review team weekly timesheets, approve full weeks, or send back specific days for correction.
          </p>
        </div>
        <button type="button" className={surface.btnGhost} onClick={loadQueue} disabled={loading}>
          <RefreshCw className={`inline h-3.5 w-3.5 mr-1.5 -mt-0.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</div>
      ) : null}

      <ManagerTimesheetQueueStats meta={meta} loading={loading} />

      <div className={surface.card}>
        <div className={`${surface.section} border-b theme-border`}>
          <h2 className={surface.sectionTitle}>Approval queue</h2>
          <p className={surface.sectionSub}>
            {pendingCount} item{pendingCount === 1 ? '' : 's'} awaiting review
          </p>
        </div>
        <div className={`${surface.section} sticky top-0 z-20 theme-surface/95 backdrop-blur-sm border-b theme-border -mx-px`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-2 lg:col-span-4">
              <label className={surface.label} htmlFor="ts-queue-search">
                Employee
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 theme-text-secondary pointer-events-none" />
                <input
                  id="ts-queue-search"
                  className={`${surface.input} w-full !pl-9`}
                  placeholder="Search by name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:col-span-1 lg:col-span-2">
              <label className={surface.label} htmlFor="ts-status">
                Status
              </label>
              <select
                id="ts-status"
                className={`${surface.select} w-full`}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-1 lg:col-span-2">
              <label className={surface.label} htmlFor="ts-sort">
                Sort
              </label>
              <select id="ts-sort" className={`${surface.select} w-full`} value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-1 lg:col-span-2">
              <label className={surface.label} htmlFor="ts-from">
                Week from
              </label>
              <input
                id="ts-from"
                type="date"
                className={`${surface.input} w-full`}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-1 lg:col-span-2">
              <label className={surface.label} htmlFor="ts-to">
                Week to
              </label>
              <input
                id="ts-to"
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,42%)] gap-4 items-start">
        <section className="space-y-3 min-w-0">
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="card h-28 animate-pulse theme-surface" />
              ))}
            </>
          ) : queue.length === 0 ? (
            <div className="card py-14 text-center">
              <Inbox className="mx-auto h-10 w-10 theme-text-secondary opacity-50" />
              <p className="mt-3 text-sm font-medium theme-text">No timesheets in queue</p>
              <p className={`${surface.muted} mt-1 max-w-sm mx-auto`}>
                When your team submits weekly timesheets, they will appear here for approval.
              </p>
            </div>
          ) : (
            queue.map((row) => (
              <ManagerTimesheetQueueCard
                key={row._id}
                row={row}
                selected={selectedId === row._id}
                disabled={acting}
                onSelect={loadDetail}
              />
            ))
          )}
        </section>

        <TimesheetDetailPanel
          loading={detailLoading}
          detail={detail}
          employeeName={detail?.employeeName || selectedRow?.employeeName}
          periodStart={detail?.timesheet?.periodStart || selectedRow?.periodStart}
          periodEnd={detail?.timesheet?.periodEnd || selectedRow?.periodEnd}
          overallStatus={detail?.timesheet?.overallStatus || selectedRow?.overallStatus}
          legacy={selectedRow?.legacy}
          onApprove={() => openModal('approve')}
          onSendBack={() => openModal('sendBack')}
          acting={acting}
        />
      </div>

      <TimesheetApprovalModal
        open={modalOpen}
        mode={modalMode}
        row={selectedRow}
        dayOptions={sendBackDayOptions}
        onClose={() => !acting && setModalOpen(false)}
        onConfirm={handleModalConfirm}
        submitting={acting}
      />
    </div>
  );
};

export default ManagerApprovalQueue;
