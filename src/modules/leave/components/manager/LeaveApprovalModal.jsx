import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { formatLeaveDateRange, leaveStatusMeta, surface } from '../../leaveUi';

const NOTE_MAX = 500;

const LeaveApprovalModal = ({ open, mode, request, onClose, onConfirm, submitting }) => {
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setNote('');
    setTouched(false);
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, submitting, mode]);

  if (!open || !request) return null;

  const isReject = mode === 'reject';
  const noteRequired = isReject;
  const noteInvalid = noteRequired && touched && !note.trim();
  const meta = leaveStatusMeta(request.status);

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (noteRequired && !note.trim()) return;
    onConfirm(note.trim() || null);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-approval-title"
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
            isReject ? 'bg-red-500/5' : 'bg-emerald-500/5'
          }`}
        >
          <div className="flex gap-3 min-w-0">
            {isReject ? (
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <h2 id="leave-approval-title" className={surface.sectionTitle}>
                {isReject ? 'Reject leave request' : 'Approve leave request'}
              </h2>
              <p className={surface.sectionSub}>
                {isReject
                  ? 'A rejection reason is required and will be shared with the employee.'
                  : 'You may add an optional note for the employee or HR records.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={surface.btnGhost}
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={surface.section}>
          <div className="rounded-lg border theme-border theme-surface/80 px-3 py-2.5 space-y-1.5 text-sm mb-4">
            <p className="font-medium theme-text">{request.requesterName}</p>
            <p className="theme-text-secondary">
              {request.leaveTypeName} · {formatLeaveDateRange(request.fromDate, request.toDate)}
            </p>
            <p className="theme-text-secondary">
              {request.durationDays != null ? `${request.durationDays} day(s)` : '—'}
              {request.halfDay ? ' · Half day' : ''}
            </p>
            <span className={`badge ${meta.badge} text-[10px]`}>{meta.label}</span>
            {request.reason ? (
              <p className="text-xs theme-text-secondary pt-1 border-t theme-border mt-2">
                <span className="font-medium theme-text">Reason: </span>
                {request.reason}
              </p>
            ) : null}
          </div>

          <div>
            <label className={surface.label} htmlFor="approval-note">
              {isReject ? 'Rejection reason' : 'Note (optional)'}
            </label>
            <textarea
              id="approval-note"
              className={`${surface.textarea} w-full ${noteInvalid ? 'ring-1 ring-red-500/50' : ''}`}
              rows={3}
              placeholder={
                isReject ? 'Explain why this request cannot be approved…' : 'Optional message for the employee…'
              }
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              onBlur={() => setTouched(true)}
              required={noteRequired}
              disabled={submitting}
            />
            <p className={`${surface.hint} flex justify-between`}>
              <span>{noteInvalid ? 'Rejection reason is required.' : ' '}</span>
              <span>
                {note.length}/{NOTE_MAX}
              </span>
            </p>
          </div>

          <div className={`${surface.divider} pt-4 mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end`}>
            <button type="button" className={surface.btnSecondary} onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={isReject ? 'btn-secondary !border-red-500/40 !text-red-200 hover:!bg-red-500/10' : surface.btnPrimary}
              disabled={submitting || (noteRequired && !note.trim())}
            >
              {submitting ? (
                <>
                  <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                  Processing…
                </>
              ) : isReject ? (
                'Confirm rejection'
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

export default LeaveApprovalModal;
