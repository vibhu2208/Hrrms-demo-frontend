import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import LeaveApplicationForm from './LeaveApplicationForm';
import { surface } from '../leaveUi';

const LeaveApplyModal = ({ open, onClose, leaveTypes, balances, onSubmit, submitting }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, submitting]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-apply-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-xl border theme-border theme-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${surface.section} border-b theme-border flex items-start justify-between gap-3 shrink-0`}>
          <div>
            <h2 id="leave-apply-title" className={surface.sectionTitle}>
              Apply for leave
            </h2>
            <p className={surface.sectionSub}>Submit a request for manager approval.</p>
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

        <div className="overflow-y-auto flex-1 px-4 py-4 sm:px-5 sm:py-4">
          <LeaveApplicationForm
            variant="embedded"
            leaveTypes={leaveTypes}
            balances={balances}
            onSubmit={onSubmit}
            submitting={submitting}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default LeaveApplyModal;
