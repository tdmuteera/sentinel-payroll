import { useEffect, useState } from "react";
import api from "../api/axios";

function AuditTrail() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    action: "",
    user: "",
  });
  const [errorMessage, setErrorMessage] = useState("");

  const fetchLogs = async (page = 1) => {
    const params = {
      page,
      limit: 20,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
      action: filters.action || undefined,
      user: filters.user || undefined,
    };
    const response = await api.get("/audit-logs", { params });
    setRows(response.data.data);
    setPagination(response.data.pagination);
  };

  useEffect(() => {
    fetchLogs(1).catch(() => setErrorMessage("Failed to load audit logs."));
  }, []);

  const applyFilters = () => {
    fetchLogs(1).catch(() => setErrorMessage("Failed to apply audit filters."));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3">
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
            placeholder="Action keyword"
            value={filters.action}
            onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}
            className="rounded-md border-slate-300"
          />
          <input
            type="text"
            placeholder="User"
            value={filters.user}
            onChange={(e) => setFilters((prev) => ({ ...prev, user: e.target.value }))}
            className="rounded-md border-slate-300"
          />
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
          onClick={() => window.alert("Export coming in future version")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Export
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
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{String(row.timestamp).replace("T", " ").slice(0, 19)}</td>
                <td className="px-4 py-3">{row.full_name || "System"}</td>
                <td className="px-4 py-3">{row.action}</td>
                <td className="px-4 py-3">{row.entity}</td>
                <td className="px-4 py-3">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between bg-white rounded-xl shadow p-4">
        <p className="text-sm text-slate-600">
          Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => fetchLogs(pagination.page - 1)}
            className="px-3 py-1 rounded-md border border-slate-300 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchLogs(pagination.page + 1)}
            className="px-3 py-1 rounded-md border border-slate-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuditTrail;
