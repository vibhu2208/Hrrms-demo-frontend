import React, { useMemo, useState } from 'react';
import { Calendar, Paperclip, Send, Upload } from 'lucide-react';
import { previewLeaveDays, surface } from '../leaveUi';

const INITIAL_FORM = {
  leaveTypeId: '',
  fromDate: '',
  toDate: '',
  halfDay: false,
  halfDayPeriod: '',
  reason: '',
  attachmentUrl: ''
};

const LeaveApplicationForm = ({
  leaveTypes,
  balances = [],
  onSubmit,
  submitting = false,
  variant = 'page',
  onCancel
}) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const selectedLeaveType = leaveTypes.find((lt) => lt._id === form.leaveTypeId);
  const halfDayAllowed = selectedLeaveType?.allowHalfDay !== false;

  const balanceForType = useMemo(() => {
    if (!form.leaveTypeId) return null;
    return balances.find((b) => String(b.leaveTypeId?._id || b.leaveTypeId) === String(form.leaveTypeId));
  }, [balances, form.leaveTypeId]);

  const available =
    balanceForType != null
      ? Number(
          (balanceForType.totalAllocated - balanceForType.used - balanceForType.pending).toFixed(2)
        )
      : null;

  const dayPreview = previewLeaveDays(form.fromDate, form.toDate, form.halfDay);

  const attachmentRequired =
    selectedLeaveType?.requiresDocument ||
    (selectedLeaveType?.attachmentRequiredAfterDays &&
      dayPreview != null &&
      dayPreview > selectedLeaveType.attachmentRequiredAfterDays);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setAttachmentFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSubmit({
        ...form,
        attachmentUrl: form.attachmentUrl?.trim() || null
      });
      resetForm();
    } catch {
      /* parent shows error; keep form values */
    }
  };

  const onFilePick = (file) => {
    if (!file) return;
    setAttachmentFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    onFilePick(file);
  };

  const formEl = (
      <form onSubmit={handleSubmit} className={variant === 'page' ? `${surface.section} max-w-3xl` : ''}>
        <div className="space-y-4">
          <div>
            <label className={surface.label} htmlFor="leave-type">
              Leave type
            </label>
            <select
              id="leave-type"
              className={`${surface.select} w-full`}
              value={form.leaveTypeId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  leaveTypeId: e.target.value,
                  halfDay: false,
                  halfDayPeriod: ''
                }))
              }
              required
            >
              <option value="">Select leave type</option>
              {leaveTypes.map((lt) => (
                <option key={lt._id} value={lt._id}>
                  {lt.name}
                  {lt.isPaid === false ? ' (unpaid)' : ''}
                </option>
              ))}
            </select>
            {available != null ? (
              <p className={surface.hint}>
                Available balance: <span className="font-medium theme-text">{available}</span> day
                {available === 1 ? '' : 's'}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={surface.label} htmlFor="from-date">
                Start date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 theme-text-secondary pointer-events-none" />
                <input
                  id="from-date"
                  className={`${surface.input} w-full !pl-9`}
                  type="date"
                  value={form.fromDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, fromDate: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <label className={surface.label} htmlFor="to-date">
                End date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 theme-text-secondary pointer-events-none" />
                <input
                  id="to-date"
                  className={`${surface.input} w-full !pl-9`}
                  type="date"
                  value={form.toDate}
                  min={form.fromDate || undefined}
                  onChange={(e) => setForm((prev) => ({ ...prev, toDate: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          {dayPreview != null && form.fromDate && form.toDate ? (
            <div className="rounded-md border theme-border theme-surface px-3 py-2 text-sm theme-text-secondary">
              Estimated duration: <span className="font-medium theme-text">{dayPreview}</span> day
              {dayPreview === 1 ? '' : 's'}
              <span className="text-[11px] ml-1 opacity-80">(calendar; policy may adjust)</span>
            </div>
          ) : null}

          <div>
            <span className={surface.label}>Duration</span>
            <div className="inline-flex rounded-lg border theme-border p-0.5 theme-surface">
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  !form.halfDay ? 'bg-[var(--color-primary)] text-white' : 'theme-text-secondary hover:theme-text'
                }`}
                onClick={() => setForm((prev) => ({ ...prev, halfDay: false, halfDayPeriod: '' }))}
              >
                Full day
              </button>
              <button
                type="button"
                disabled={!halfDayAllowed}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                  form.halfDay ? 'bg-[var(--color-primary)] text-white' : 'theme-text-secondary hover:theme-text'
                }`}
                onClick={() => setForm((prev) => ({ ...prev, halfDay: true, toDate: prev.fromDate || prev.toDate }))}
              >
                Half day
              </button>
            </div>
            {!halfDayAllowed && selectedLeaveType ? (
              <p className={`${surface.hint} text-amber-500/90`}>Half-day is not allowed for this leave type.</p>
            ) : null}
            {form.halfDay ? (
              <div className="mt-3">
                <label className={surface.label} htmlFor="half-period">
                  Session
                </label>
                <select
                  id="half-period"
                  className={`${surface.select} w-full max-w-xs`}
                  value={form.halfDayPeriod}
                  onChange={(e) => setForm((prev) => ({ ...prev, halfDayPeriod: e.target.value }))}
                  required
                >
                  <option value="">Select session</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                </select>
              </div>
            ) : null}
          </div>

          <div>
            <label className={surface.label} htmlFor="reason">
              Reason
            </label>
            <textarea
              id="reason"
              className={`${surface.textarea} w-full`}
              rows={3}
              placeholder="Brief reason for your leave request"
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
              maxLength={2000}
            />
            <p className={surface.hint}>{form.reason.length}/2000 characters</p>
          </div>

          <div>
            <label className={surface.label}>
              Attachment {attachmentRequired ? '(required)' : '(optional)'}
            </label>
            <div
              className={`rounded-lg border border-dashed theme-border p-4 text-center transition-colors ${
                dragOver ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]' : 'theme-surface'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <Upload className="mx-auto h-8 w-8 theme-text-secondary opacity-60" />
              <p className="mt-2 text-sm theme-text">Drag and drop a file, or</p>
              <label className="mt-2 inline-block cursor-pointer text-sm font-medium theme-primary-text hover:underline">
                browse files
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => onFilePick(e.target.files?.[0])}
                />
              </label>
              {attachmentFile ? (
                <p className="mt-2 text-xs theme-text-secondary flex items-center justify-center gap-1">
                  <Paperclip className="h-3.5 w-3.5" />
                  {attachmentFile.name}
                  <button
                    type="button"
                    className="text-red-400 hover:text-red-300 ml-1"
                    onClick={() => setAttachmentFile(null)}
                  >
                    Remove
                  </button>
                </p>
              ) : null}
              <p className={`${surface.hint} mt-2`}>
                Provide a shareable document link below if your policy requires proof.
              </p>
            </div>
            <input
              className={`${surface.input} w-full mt-2`}
              type="url"
              placeholder="https://… document link (if required)"
              value={form.attachmentUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, attachmentUrl: e.target.value }))}
              required={attachmentRequired && !form.attachmentUrl}
            />
          </div>

          {selectedLeaveType ? (
            <div className="rounded-md border theme-border px-3 py-2.5 text-xs theme-text-secondary space-y-1">
              <p className="font-medium theme-text text-[11px] uppercase tracking-wide">Policy summary</p>
              <p>
                Notice: {selectedLeaveType.minNoticeDays || 0} day(s) · Max per request:{' '}
                {selectedLeaveType.maxDaysPerRequest ?? '—'} · Weekends:{' '}
                {selectedLeaveType.countWeekends ? 'included' : 'excluded'}
              </p>
            </div>
          ) : null}

          <div className={`${surface.divider} pt-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end`}>
            {onCancel ? (
              <button type="button" className={surface.btnSecondary} onClick={onCancel} disabled={submitting}>
                Cancel
              </button>
            ) : null}
            <button
              type="submit"
              className={surface.btnPrimary}
              disabled={submitting || (attachmentRequired && !form.attachmentUrl?.trim())}
            >
              <Send className="inline h-4 w-4 mr-2 -mt-0.5" />
              {submitting ? 'Submitting…' : 'Submit for approval'}
            </button>
          </div>
        </div>
      </form>
  );

  if (variant === 'embedded') return formEl;

  return (
    <div className={surface.card}>
      <div className={`${surface.section} border-b theme-border`}>
        <h2 className={surface.sectionTitle}>Request leave</h2>
        <p className={surface.sectionSub}>Submit a new leave application for manager approval.</p>
      </div>
      {formEl}
    </div>
  );
};

export default LeaveApplicationForm;
