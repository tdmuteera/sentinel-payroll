import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";

const statusOptions = ["Present", "Late", "Absent", "Leave"];

function statusBadgeClass(status) {
  if (status === "Present") return "bg-green-100 text-green-700";
  if (status === "Late") return "bg-yellow-100 text-yellow-700";
  if (status === "Absent") return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
}

function Attendance() {
  const today = new Date().toISOString().slice(0, 10);
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    employeeSearch: "",
    status: "",
  });
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summaryRows, setSummaryRows] = useState([]);
  const [bulkDate, setBulkDate] = useState(today);
  const [bulkRows, setBulkRows] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      status: "Present",
      hours_worked: 8,
      overtime_hours: 0,
    },
  });

  const buildQueryParams = () => {
    const params = {};
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.status) params.status = filters.status;
    return params;
  };

  const fetchAttendance = async () => {
    const params = buildQueryParams();
    const [attendanceRes, summaryRes] = await Promise.all([
      api.get("/attendance", { params }),
      api.get("/attendance/summary", {
        params: {
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
        },
      }),
    ]);
    setAttendanceRows(attendanceRes.data);
    setSummaryRows(summaryRes.data);
  };

  const fetchEmployees = async () => {
    const res = await api.get("/employees");
    setEmployees(res.data);
  };

  useEffect(() => {
    Promise.all([fetchEmployees(), fetchAttendance()]).catch(() => {
      setErrorMessage("Failed to load attendance module data.");
    });
  }, []);

  useEffect(() => {
    setBulkRows(
      employees.map((employee) => ({
        employee_id: employee.id,
        full_name: employee.full_name,
        status: "Present",
        hours_worked: 8,
        overtime_hours: 0,
      }))
    );
  }, [employees]);

  const filteredRows = useMemo(() => {
    const term = filters.employeeSearch.trim().toLowerCase();
    return attendanceRows.filter((row) => {
      if (!term) {
        return true;
      }
      return (
        row.full_name?.toLowerCase().includes(term) ||
        row.employee_code?.toLowerCase().includes(term)
      );
    });
  }, [attendanceRows, filters.employeeSearch]);

  const summaryTotals = useMemo(
    () =>
      summaryRows.reduce(
        (acc, row) => ({
          present: acc.present + Number(row.present_count || 0),
          late: acc.late + Number(row.late_count || 0),
          absent: acc.absent + Number(row.absent_count || 0),
          leave: acc.leave + Number(row.leave_count || 0),
        }),
        { present: 0, late: 0, absent: 0, leave: 0 }
      ),
    [summaryRows]
  );

  const updateBulkRow = (employeeId, key, value) => {
    setBulkRows((prev) =>
      prev.map((row) =>
        row.employee_id === employeeId
          ? {
              ...row,
              [key]:
                key === "hours_worked" || key === "overtime_hours"
                  ? Number(value)
                  : value,
            }
          : row
      )
    );
  };

  const applyFilters = async () => {
    setErrorMessage("");
    try {
      await fetchAttendance();
    } catch (error) {
      setErrorMessage("Failed to apply filters.");
    }
  };

  const submitBulkAttendance = async () => {
    setIsSubmittingBulk(true);
    setErrorMessage("");
    try {
      const payload = bulkRows.map((row) => ({
        employee_id: row.employee_id,
        date: bulkDate,
        status: row.status,
        hours_worked: Number(row.hours_worked || 0),
        overtime_hours: Number(row.overtime_hours || 0),
      }));
      await api.post("/attendance/bulk", payload);
      await fetchAttendance();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to submit bulk attendance.");
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  const openEdit = (row) => {
    setEditingRow(row);
    reset({
      status: row.status,
      hours_worked: row.hours_worked,
      overtime_hours: row.overtime_hours,
    });
  };

  const onSaveEdit = async (values) => {
    if (!editingRow) {
      return;
    }
    try {
      await api.put(`/attendance/${editingRow.id}`, {
        status: values.status,
        hours_worked: Number(values.hours_worked),
        overtime_hours: Number(values.overtime_hours),
      });
      setEditingRow(null);
      await fetchAttendance();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to update attendance.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters((prev) => ({ ...prev, date_from: e.target.value }))}
            className="rounded-md border-slate-300"
          />
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters((prev) => ({ ...prev, date_to: e.target.value }))}
            className="rounded-md border-slate-300"
          />
          <input
            type="text"
            value={filters.employeeSearch}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, employeeSearch: e.target.value }))
            }
            placeholder="Search employee"
            className="rounded-md border-slate-300"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="rounded-md border-slate-300"
          >
            <option value="">All Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={applyFilters}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-sm">
          {errorMessage}
        </div>
      ) : null}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <th className="px-4 py-3">Employee Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Hours Worked</th>
              <th className="px-4 py-3">Overtime</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{row.full_name}</td>
                <td className="px-4 py-3">{row.department_name || "-"}</td>
                <td className="px-4 py-3">{row.date}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(
                      row.status
                    )}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3">{row.hours_worked}</td>
                <td className="px-4 py-3">{row.overtime_hours}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No attendance records found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-800">Mark Attendance</h3>
          <input
            type="date"
            value={bulkDate}
            onChange={(e) => setBulkDate(e.target.value)}
            className="rounded-md border-slate-300"
          />
        </div>
        <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-600">
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Hours</th>
                <th className="px-3 py-2">Overtime</th>
              </tr>
            </thead>
            <tbody>
              {bulkRows.map((row) => (
                <tr key={row.employee_id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{row.full_name}</td>
                  <td className="px-3 py-2">
                    <select
                      value={row.status}
                      onChange={(e) => updateBulkRow(row.employee_id, "status", e.target.value)}
                      className="rounded-md border-slate-300"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.5"
                      value={row.hours_worked}
                      onChange={(e) =>
                        updateBulkRow(row.employee_id, "hours_worked", e.target.value)
                      }
                      className="w-24 rounded-md border-slate-300"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.5"
                      value={row.overtime_hours}
                      onChange={(e) =>
                        updateBulkRow(row.employee_id, "overtime_hours", e.target.value)
                      }
                      className="w-24 rounded-md border-slate-300"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={submitBulkAttendance}
            disabled={isSubmittingBulk}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-md"
          >
            {isSubmittingBulk ? "Submitting..." : "Submit All"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">Present</p>
          <p className="text-2xl font-bold text-green-800">{summaryTotals.present}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-700">Late</p>
          <p className="text-2xl font-bold text-yellow-800">{summaryTotals.late}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">Absent</p>
          <p className="text-2xl font-bold text-red-800">{summaryTotals.absent}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">Leave</p>
          <p className="text-2xl font-bold text-blue-800">{summaryTotals.leave}</p>
        </div>
      </div>

      {editingRow ? (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Attendance</h3>
            <form className="space-y-3" onSubmit={handleSubmit(onSaveEdit)}>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Status</label>
                <select
                  className="w-full rounded-md border-slate-300"
                  {...register("status", { required: "Status is required" })}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Hours Worked</label>
                  <input
                    type="number"
                    step="0.5"
                    className="w-full rounded-md border-slate-300"
                    {...register("hours_worked", { required: "Hours worked is required" })}
                  />
                  {errors.hours_worked ? (
                    <p className="text-xs text-red-600 mt-1">{errors.hours_worked.message}</p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Overtime</label>
                  <input
                    type="number"
                    step="0.5"
                    className="w-full rounded-md border-slate-300"
                    {...register("overtime_hours", { required: "Overtime is required" })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="px-4 py-2 rounded-md border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Attendance;
