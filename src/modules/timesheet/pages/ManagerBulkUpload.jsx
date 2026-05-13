import React, { useState } from 'react';
import { previewBulkUpload, commitBulkUpload } from '../../../api/timesheet';

const ManagerBulkUpload = () => {
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  const doPreview = async () => {
    const res = await previewBulkUpload(csv);
    setPreview(res.data);
  };

  const doCommit = async () => {
    const res = await commitBulkUpload({ csv, overwriteExisting: false });
    setResult(res.data);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Manager Bulk Upload</h1>
      <textarea
        className="h-48 w-full rounded bg-[#1E1E2A] p-3 text-white"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder="employeeId,entryDate,projectId,hours,taskDescription,entryType,isBillable"
      />
      <div className="flex gap-2">
        <button className="rounded bg-[#8B6FE8] px-3 py-2 text-white" onClick={doPreview}>Preview</button>
        <button className="rounded bg-green-600 px-3 py-2 text-white" onClick={doCommit}>Commit</button>
      </div>
      {preview ? <pre className="rounded bg-[#2A2A3A] p-3 text-xs text-gray-200">{JSON.stringify(preview, null, 2)}</pre> : null}
      {result ? <pre className="rounded bg-[#2A2A3A] p-3 text-xs text-gray-200">{JSON.stringify(result, null, 2)}</pre> : null}
    </div>
  );
};

export default ManagerBulkUpload;
