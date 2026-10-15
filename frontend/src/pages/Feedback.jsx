import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";

const issueTypes = [
  "Payroll Error",
  "Attendance Dispute",
  "Leave Request",
  "General Complaint",
  "Other",
];
const severities = ["Low", "Medium", "High", "Critical"];

function severityClass(severity) {
  if (severity === "Low") return "bg-slate-100 text-slate-700";
  if (severity === "Medium") return "bg-yellow-100 text-yellow-700";
  if (severity === "High") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function statusClass(status) {
  if (status === "Resolved") return "bg-green-100 text-green-700";
  if (status === "In Progress") return "bg-yellow-100 text-yellow-700";
  if (status === "Closed") return "bg-slate-100 text-slate-700";
  return "bg-red-100 text-red-700";
}

function Feedback() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [resolvingRow, setResolvingRow] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [filters, setFilters] = useState({ status: "", severity: "", issue_type: "" });

  const createForm = useForm({
    defaultValues: {
      employee_id: "",
      issue_type: issueTypes[0],
      severity: severities[0],
      description: "",
    },
  });
  const resolveForm = useForm({
    defaultValues: {
      status: "Resolved",
      resolution_notes: "",
    },
  });

  const fetchData = async () => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.severity) params.severity = filters.severity;
    if (filters.issue_type) params.issue_type = filters.issue_type;
    const [feedbackRes, employeesRes] = await Promise.all([
      api.get("/feedback", { params }),
      api.get("/employees"),
    ]);
    setRows(feedbackRes.data);
    setEmployees(employeesRes.data);
  };

  useEffect(() => {
    fetchData().catch(() => setErrorMessage("Failed to load feedback data."));
  }, []);

  const applyFilters = () => {
    fetchData().catch(() => setErrorMessage("Failed to apply feedback filters."));
  };

  const submitCreate = async (values) => {
    try {
      await api.post("/feedback", values);
      setIsCreateOpen(false);
      createForm.reset();
      await fetchData();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to create feedback issue.");
    }
  };

  const openResolveModal = (row) => {
    setResolvingRow(row);
    resolveForm.reset({ status: "Resolved", resolution_notes: row.resolution_notes || "" });
  };

  const submitResolve = async (values) => {
    if (!resolvingRow) return;
    try {
      await api.put(`/feedback/${resolvingRow.id}`, values);
      setResolvingRow(null);
      await fetchData();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to update feedback issue.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="rounded-md border-slate-300"
          >
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
          <select
            value={filters.severity}
            onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value }))}
            className="rounded-md border-slate-300"
          >
            <option value="">All Severity</option>
            {severities.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
          <select
            value={filters.issue_type}
            onChange={(e) => setFilters((prev) => ({ ...prev, issue_type: e.target.value }))}
            className="rounded-md border-slate-300"
          >
            <option value="">All Issue Types</option>
            {issueTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyFilters}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md"
          >
            Filter
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Add Issue
        </button>
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
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Issue Type</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{row.full_name || `Employee #${row.employee_id}`}</td>
                <td className="px-4 py-3">{row.issue_type}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${severityClass(row.severity)}`}>
                    {row.severity}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass(row.status)}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3">{String(row.created_at || "").slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => openResolveModal(row)}
                    className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200"
                  >
                    Resolve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Add Feedback Issue</h3>
            <form className="space-y-3" onSubmit={createForm.handleSubmit(submitCreate)}>
              <select className="w-full rounded-md border-slate-300" {...createForm.register("employee_id", { required: true })}>
                <option value="">Select Employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select className="w-full rounded-md border-slate-300" {...createForm.register("issue_type", { required: true })}>
                  {issueTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <select className="w-full rounded-md border-slate-300" {...createForm.register("severity", { required: true })}>
                  {severities.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                rows={4}
                className="w-full rounded-md border-slate-300"
                placeholder="Describe the issue..."
                {...createForm.register("description", { required: true })}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 rounded-md border border-slate-300">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {resolvingRow ? (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Resolve Feedback Issue</h3>
            <form className="space-y-3" onSubmit={resolveForm.handleSubmit(submitResolve)}>
              <select className="w-full rounded-md border-slate-300" {...resolveForm.register("status", { required: true })}>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
              <textarea
                rows={5}
                className="w-full rounded-md border-slate-300"
                placeholder="Resolution notes..."
                {...resolveForm.register("resolution_notes", { required: true })}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setResolvingRow(null)} className="px-4 py-2 rounded-md border border-slate-300">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Feedback;
