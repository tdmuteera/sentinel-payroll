import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(value || 0)
  );
}

function ManagerPortal() {
  const { role, user } = useAuth();
  const canAccess = role === "manager" || role === "admin";
  const [data, setData] = useState(null);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const issueForm = useForm({
    defaultValues: {
      employee_id: "",
      issue_type: "General Complaint",
      severity: "Medium",
      description: "",
    },
  });

  useEffect(() => {
    if (!canAccess) {
      return;
    }
    api
      .get("/manager/dashboard")
      .then((response) => {
        setData(response.data);
        if (response.data.employees?.[0]?.id) {
          issueForm.setValue("employee_id", String(response.data.employees[0].id));
        }
      })
      .catch(() => setErrorMessage("Failed to load manager portal data."));
  }, [canAccess]);

  const kpis = useMemo(() => {
    if (!data) {
      return { employeeCount: 0, attendanceRate: 0, payrollTotal: 0 };
    }
    const employeeCount = data.employees.length;
    const totals = data.attendanceSummary.reduce(
      (acc, row) => {
        acc.present += Number(row.present || 0);
        acc.late += Number(row.late || 0);
        acc.total += Number(row.total || 0);
        return acc;
      },
      { present: 0, late: 0, total: 0 }
    );
    const attendanceRate = totals.total
      ? ((totals.present + totals.late) / totals.total) * 100
      : 0;

    return {
      employeeCount,
      attendanceRate,
      payrollTotal: Number(data.payrollSummary?.totalNetPay || 0),
    };
  }, [data]);

  const openIssueModal = () => {
    if (!data?.employees?.length) {
      setErrorMessage("No department employees available for feedback.");
      return;
    }
    issueForm.reset({
      employee_id: String(data.employees[0].id),
      issue_type: "General Complaint",
      severity: "Medium",
      description: "",
    });
    setIsIssueOpen(true);
  };

  const submitIssue = async (values) => {
    try {
      await api.post("/feedback", {
        ...values,
        employee_id: Number(values.employee_id),
      });
      setIsIssueOpen(false);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to raise issue.");
    }
  };

  if (!canAccess) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-slate-800">Access Restricted</h2>
        <p className="text-slate-600 mt-2">
          Manager Portal is available to manager and admin roles only.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-slate-600">Loading manager portal...</div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-sm">
          {errorMessage}
        </div>
      ) : null}

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold text-slate-800">
          Welcome, {user?.fullName || user?.email} - {data.department?.name || "Department"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-slate-500">Employees Managed</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{kpis.employeeCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-slate-500">Attendance Rate This Month</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{kpis.attendanceRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-slate-500">Department Payroll This Month</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(kpis.payrollTotal)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 flex gap-3">
        <Link
          to="/attendance"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Mark Today&apos;s Attendance
        </Link>
        <button
          type="button"
          onClick={openIssueModal}
          className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md"
        >
          Raise an Issue
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <h3 className="text-lg font-semibold text-slate-800 px-4 pt-4">Department Employees</h3>
        <table className="w-full text-sm mt-2">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date Joined</th>
            </tr>
          </thead>
          <tbody>
            {data.employees.map((employee) => (
              <tr key={employee.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{employee.full_name}</td>
                <td className="px-4 py-3">{employee.position}</td>
                <td className="px-4 py-3">{employee.employment_status}</td>
                <td className="px-4 py-3">{employee.date_joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <h3 className="text-lg font-semibold text-slate-800 px-4 pt-4">Attendance Overview This Month</h3>
        <table className="w-full text-sm mt-2">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Present</th>
              <th className="px-4 py-3">Late</th>
              <th className="px-4 py-3">Absent</th>
              <th className="px-4 py-3">Leave</th>
            </tr>
          </thead>
          <tbody>
            {data.attendanceSummary.map((row) => (
              <tr key={row.employee_id} className="border-t border-slate-100">
                <td className="px-4 py-3">{row.full_name}</td>
                <td className="px-4 py-3">{row.present}</td>
                <td className="px-4 py-3">{row.late}</td>
                <td className="px-4 py-3">{row.absent}</td>
                <td className="px-4 py-3">{row.leave}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isIssueOpen ? (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2">
              Raise an Issue - {data.department?.name || "Department"}
            </h3>
            <form className="space-y-3" onSubmit={issueForm.handleSubmit(submitIssue)}>
              <select
                className="w-full rounded-md border-slate-300"
                {...issueForm.register("employee_id", { required: true })}
              >
                {data.employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select className="w-full rounded-md border-slate-300" {...issueForm.register("issue_type", { required: true })}>
                  <option value="Payroll Error">Payroll Error</option>
                  <option value="Attendance Dispute">Attendance Dispute</option>
                  <option value="Leave Request">Leave Request</option>
                  <option value="General Complaint">General Complaint</option>
                  <option value="Other">Other</option>
                </select>
                <select className="w-full rounded-md border-slate-300" {...issueForm.register("severity", { required: true })}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <textarea
                rows={5}
                className="w-full rounded-md border-slate-300"
                placeholder="Describe the issue..."
                {...issueForm.register("description", { required: true })}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsIssueOpen(false)} className="px-4 py-2 rounded-md border border-slate-300">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white">
                  Submit Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ManagerPortal;
