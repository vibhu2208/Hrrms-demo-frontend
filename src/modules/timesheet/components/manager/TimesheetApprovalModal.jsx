import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { formatTimesheetWeek, surface, timesheetStatusMeta } from '../../timesheetUi';

const REASON_MAX = 500;

const TimesheetApprovalModal = ({ open, mode, row, dayOptions, onClose, onConfirm, submitting }) => {
  const [note, setNote] = useState('');
  const [day, setDay] = useState('');
  const [touched, setTouched] = useState(false);

  const isSendBack = mode === 'sendBack';
  const days = useMemo(() => dayOptions || [], [dayOptions]);

  useEffect(() => {
    if (!open) return undefined;
    setNote('');
    setTouched(false);
    setDay(days[0] || '');
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, submitting, days]);

  if (!open || !row) return null;

  const meta = timesheetStatusMeta(row.overallStatus);
  const reasonInvalid = isSendBack && touched && !note.trim();
  const dayInvalid = isSendBack && touched && !day;

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (isSendBack && (!note.trim() || !day)) return;
    onConfirm(isSendBack ? { date: day, reason: note.trim() } : { note: note.trim() || null });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timesheet-approval-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border theme-border theme-surface shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`${surface.section} border-b theme-border flex items-start justify-between gap-3 ${
            isSendBack ? 'bg-amber-500/5' : 'bg-emerald-500/5'
          }`}
        >
          <div className="flex gap-3 min-w-0">
            {isSendBack ? (
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <h2 id="timesheet-approval-title" className={surface.sectionTitle}>
                {isSendBack ? 'Send back day' : 'Approve whole week'}
              </h2>
              <p className={surface.sectionSub}>
                {isSendBack
                  ? 'Select the day and provide a reason. The employee can correct and resubmit.'
                  : 'All submitted slices for this week will be marked approved.'}
              </p>
            </div>
          </div>
          <button type="button" className={surface.btnGhost} onClick={onClose} disabled={submitting} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={surface.section}>
          <div className="rounded-lg border theme-border theme-surface/80 px-3 py-2.5 space-y-1.5 text-sm mb-4">
            <p className="font-medium theme-text">{row.employeeName}</p>
            <p className="theme-text-secondary">{formatTimesheetWeek(row.periodStart, row.periodEnd)}</p>
            <span className={`badge ${meta.badge} text-[10px]`}>{meta.label}</span>
          </div>

          {isSendBack ? (
            <>
              <div className="mb-3">
                <label className={surface.label} htmlFor="sendback-day">
                  Day to send back
                </label>
                <select
                  id="sendback-day"
                  className={`${surface.select} w-full ${dayInvalid ? 'ring-1 ring-red-500/50' : ''}`}
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  disabled={submitting || !days.length}
                >
                  {days.length === 0 ? <option value="">No submitted work days</option> : null}
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={surface.label} htmlFor="sendback-reason">
                  Reason (required)
                </label>
                <textarea
                  id="sendback-reason"
                  className={`${surface.textarea} w-full ${reasonInvalid ? 'ring-1 ring-red-500/50' : ''}`}
                  rows={3}
                  placeholder="Explain what needs to be corrected…"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, REASON_MAX))}
                  onBlur={() => setTouched(true)}
                  required
                  disabled={submitting}
                />
                <p className={`${surface.hint} flex justify-between`}>
                  <span>{reasonInvalid ? 'Reason is required.' : ' '}</span>
                  <span>
                    {note.length}/{REASON_MAX}
                  </span>
                </p>
              </div>
            </>
          ) : (
            <div>
              <label className={surface.label} htmlFor="approve-note">
                Note (optional)
              </label>
              <textarea
                id="approve-note"
                className={`${surface.textarea} w-full`}
                rows={2}
                placeholder="Optional note for records…"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, REASON_MAX))}
                disabled={submitting}
              />
            </div>
          )}

          <div className={`${surface.divider} pt-4 mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end`}>
            <button type="button" className={surface.btnSecondary} onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={
                isSendBack
                  ? 'btn-secondary !border-amber-500/40 !text-amber-100 hover:!bg-amber-500/10'
                  : surface.btnPrimary
              }
              disabled={submitting || (isSendBack && (!note.trim() || !day))}
            >
              {submitting ? (
                <>
                  <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                  Processing…
                </>
              ) : isSendBack ? (
                'Confirm send back'
              ) : (
                'Confirm approval'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimesheetApprovalModal;
