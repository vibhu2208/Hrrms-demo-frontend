import React, { useMemo, useState } from 'react';
import { Filter, Inbox } from 'lucide-react';
import { formatLeaveDateRange, leaveStatusMeta, surface } from '../leaveUi';

const LeaveHistoryTable = ({ history = [], leaveTypes = [], onWithdraw, className = '' }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  const years = useMemo(() => {
    const set = new Set();
    history.forEach((h) => {
      const y = new Date(h.fromDate).getFullYear();
      if (!Number.isNaN(y)) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [history]);

  const filtered = useMemo(() => {
    return history.filter((h) => {
      if (statusFilter !== 'all' && (h.status || '').toLowerCase() !== statusFilter) return false;
      const typeId = String(h.leaveTypeId?._id || h.leaveTypeId || '');
      if (typeFilter !== 'all' && typeId !== typeFilter) return false;
      if (yearFilter !== 'all') {
        const y = new Date(h.fromDate).getFullYear();
        if (String(y) !== yearFilter) return false;
      }
      return true;
    });
  }, [history, statusFilter, typeFilter, yearFilter]);

  return (
    <div className={`${surface.card} h-full flex flex-col min-h-0 min-w-0 ${className}`.trim()}>
      <div className={`${surface.section} border-b theme-border flex flex-col gap-3 shrink-0 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <h2 className={surface.sectionTitle}>Leave history</h2>
          <p className={surface.sectionSub}>Track applications, approvals, and status changes.</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs theme-text-secondary">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </div>
      </div>

      <div className={`${surface.section} border-b theme-border`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={surface.label}>Status</label>
            <select
              className={`${surface.select} w-full`}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className={surface.label}>Leave type</label>
            <select
              className={`${surface.select} w-full`}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All types</option>
              {leaveTypes.map((lt) => (
                <option key={lt._id} value={lt._id}>
                  {lt.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={surface.label}>Year</label>
            <select
              className={`${surface.select} w-full`}
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="all">All years</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={`${surface.section} py-12 text-center flex-1`}>
          <Inbox className="mx-auto h-10 w-10 theme-text-secondary opacity-50" />
          <p className="mt-3 text-sm font-medium theme-text">No leave records</p>
          <p className={`${surface.muted} mt-1`}>
            {history.length === 0
              ? 'Your leave applications will appear here after you submit a request.'
              : 'No records match the selected filters.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch">
          <table className="table min-w-[36rem] w-full">
            <thead>
              <tr>
                <th>Leave type</th>
                <th>Date range</th>
                <th>Days</th>
                <th>Status</th>
                <th>Applied</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const meta = leaveStatusMeta(row.status);
                const typeName = row.leaveTypeId?.name || 'Leave';
                return (
                  <tr key={row._id}>
                    <td className="font-medium">{typeName}</td>
                    <td>{formatLeaveDateRange(row.fromDate, row.toDate)}</td>
                    <td>
                      {row.durationDays ?? '—'}
                      {row.halfDay ? (
                        <span className="text-[11px] theme-text-secondary ml-1">(½ day)</span>
                      ) : null}
                    </td>
                    <td>
                      <span className={`badge ${meta.badge}`}>{meta.label}</span>
                    </td>
                    <td className="theme-text-secondary text-sm">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        : '—'}
                    </td>
                    <td className="text-right">
                      {row.status === 'pending' && onWithdraw ? (
                        <button
                          type="button"
                          className={surface.btnGhost}
                          onClick={() => onWithdraw(row._id)}
                        >
                          Withdraw
                        </button>
                      ) : (
                        <span className="text-xs theme-text-secondary">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeaveHistoryTable;
