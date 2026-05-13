import React, { useEffect, useMemo, useState } from 'react';
import { bulkAllocateLeave, fetchLeaveTypes } from '../../../api/leave';
import { getEmployees } from '../../../api/employees';
import api from '../../../api/axios';

const currentYear = new Date().getFullYear();

const AdminLeaveAllocations = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    year: currentYear,
    days: ''
  });

  const employeeOptions = useMemo(() => {
    return employees.map((emp) => ({
      id: emp._id || emp.id,
      label:
        emp.fullName ||
        `${emp.firstName || ''} ${emp.lastName || ''}`.trim() ||
        emp.email ||
        emp.employeeCode ||
        String(emp._id || emp.id)
    }));
  }, [employees]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [typesRes, employeeRes, usersRes] = await Promise.all([
        fetchLeaveTypes(),
        getEmployees({ limit: 1000 }),
        api.get('/user/all')
      ]);
      setLeaveTypes(typesRes.data || []);

      const employeeRecords =
        employeeRes?.data?.employees ||
        employeeRes?.data ||
        employeeRes?.employees ||
        [];
      const userRecords = usersRes?.data?.data || [];

      // Merge tenant employees + tenant users so HR/manager users are also available
      // for allocation even when they don't have full employee profile rows.
      const mergedById = new Map();
      (Array.isArray(employeeRecords) ? employeeRecords : []).forEach((emp) => {
        const id = String(emp._id || emp.id || '');
        if (!id) return;
        mergedById.set(id, emp);
      });
      userRecords
        .filter((u) => u?.isActive !== false && ['employee', 'hr', 'manager'].includes(u?.role))
        .forEach((u) => {
          const id = String(u._id || u.id || '');
          if (!id) return;
          if (!mergedById.has(id)) {
            mergedById.set(id, {
              _id: id,
              firstName: u.firstName,
              lastName: u.lastName,
              email: u.email,
              role: u.role
            });
          }
        });

      setEmployees([...mergedById.values()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leave allocation dependencies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      if (!form.employeeId || !form.leaveTypeId || !form.days) {
        setError('Employee, leave type and days are required');
        return;
      }
      await bulkAllocateLeave({
        employeeIds: [form.employeeId],
        leaveTypeId: form.leaveTypeId,
        year: Number(form.year),
        days: Number(form.days)
      });
      setMessage('Leave allocation saved successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save allocation');
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-white">Leave Allocations</h1>
      <p className="text-sm text-gray-300">
        Allocate yearly leave balance to employees. Paid leave types require allocation before employees can apply.
      </p>

      {loading ? <p className="text-gray-300">Loading...</p> : null}
      {message ? <p className="text-green-400 text-sm">{message}</p> : null}
      {error ? <p className="text-red-400 text-sm">{error}</p> : null}

      <form onSubmit={submit} className="rounded-xl border border-gray-700 bg-[#2A2A3A] p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className="rounded bg-[#1E1E2A] p-2 text-white"
            value={form.employeeId}
            onChange={(e) => setForm((prev) => ({ ...prev, employeeId: e.target.value }))}
            required
          >
            <option value="">Select employee</option>
            {employeeOptions.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.label}
              </option>
            ))}
          </select>

          <select
            className="rounded bg-[#1E1E2A] p-2 text-white"
            value={form.leaveTypeId}
            onChange={(e) => setForm((prev) => ({ ...prev, leaveTypeId: e.target.value }))}
            required
          >
            <option value="">Select leave type</option>
            {leaveTypes.map((lt) => (
              <option key={lt._id} value={lt._id}>
                {lt.name}
              </option>
            ))}
          </select>

          <input
            className="rounded bg-[#1E1E2A] p-2 text-white"
            type="number"
            min="2020"
            max="2100"
            value={form.year}
            onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
            required
          />

          <input
            className="rounded bg-[#1E1E2A] p-2 text-white"
            type="number"
            min="0"
            step="0.5"
            placeholder="Allocated days"
            value={form.days}
            onChange={(e) => setForm((prev) => ({ ...prev, days: e.target.value }))}
            required
          />
        </div>

        <button className="rounded bg-[#A88BFF] px-4 py-2 text-white">Save Allocation</button>
      </form>
    </div>
  );
};

export default AdminLeaveAllocations;
