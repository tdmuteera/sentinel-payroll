import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function statusClass(status) {
  return status === "Approved"
    ? "bg-green-100 text-green-700"
    : "bg-yellow-100 text-yellow-700";
}

function Payroll() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [runForm, setRunForm] = useState({
    pay_period_start: "",
    pay_period_end: "",
    bonus_override: "",
  });
  const [filters, setFilters] = useState({
    pay_period_start: "",
    pay_period_end: "",
    status: "",
  });
  const [rows, setRows] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const fetchPayroll = async () => {
    const params = {};
    if (filters.pay_period_start) params.pay_period_start = filters.pay_period_start;
    if (filters.pay_period_end) params.pay_period_end = filters.pay_period_end;
    if (filters.status) params.status = filters.status;
    const response = await api.get("/payroll", { params });
    setRows(response.data);
  };

  useEffect(() => {
    fetchPayroll().catch(() => {
      setErrorMessage("Failed to load payroll records.");
    });
  }, []);

  const runPayroll = async () => {
    if (!runForm.pay_period_start || !runForm.pay_period_end) {
      setErrorMessage("Select both payroll period dates before running payroll.");
      return;
    }
    setIsRunning(true);
    setErrorMessage("");
    try {
      await api.post("/payroll/run", {
        pay_period_start: runForm.pay_period_start,
        pay_period_end: runForm.pay_period_end,
        bonus_override: runForm.bonus_override ? Number(runForm.bonus_override) : 0,
      });
      setFilters((prev) => ({
        ...prev,
        pay_period_start: runForm.pay_period_start,
        pay_period_end: runForm.pay_period_end,
      }));
      await fetchPayroll();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Payroll run failed.");
    } finally {
      setIsRunning(false);
    }
  };

  const applyFilters = async () => {
    setErrorMessage("");
    try {
      await fetchPayroll();
    } catch (error) {
      setErrorMessage("Failed to apply payroll filters.");
    }
  };

  const approveAll = async () => {
    const draftRows = rows.filter((row) => row.status === "Draft");
    if (draftRows.length === 0) {
      return;
    }
    setIsApproving(true);
    setErrorMessage("");
    try {
      await Promise.all(draftRows.map((row) => api.put(`/payroll/${row.id}/approve`)));
      await fetchPayroll();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to approve payroll.");
    } finally {
      setIsApproving(false);
    }
  };

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          gross: acc.gross + Number(row.gross_pay || 0),
          tax: acc.tax + Number(row.tax_deducted || 0),
          net: acc.net + Number(row.net_pay || 0),
        }),
        { gross: 0, tax: 0, net: 0 }
      ),
    [rows]
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <h3 className="text-lg font-semibold text-slate-800">Run Payroll</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="date"
            value={runForm.pay_period_start}
            onChange={(e) =>
              setRunForm((prev) => ({ ...prev, pay_period_start: e.target.value }))
            }
            className="rounded-md border-slate-300"
          />
          <input
            type="date"
            value={runForm.pay_period_end}
            onChange={(e) => setRunForm((prev) => ({ ...prev, pay_period_end: e.target.value }))}
            className="rounded-md border-slate-300"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Bonus override (optional)"
            value={runForm.bonus_override}
            onChange={(e) => setRunForm((prev) => ({ ...prev, bonus_override: e.target.value }))}
            className="rounded-md border-slate-300"
          />
          {isAdmin ? (
            <button
              type="button"
              onClick={runPayroll}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-md px-4 py-2"
            >
              {isRunning ? "Running..." : "Run Payroll"}
            </button>
          ) : (
            <div className="flex items-center text-sm text-slate-500">
              Admin role required to run payroll
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="date"
            value={filters.pay_period_start}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, pay_period_start: e.target.value }))
            }
            className="rounded-md border-slate-300"
          />
          <input
            type="date"
            value={filters.pay_period_end}
            onChange={(e) => setFilters((prev) => ({ ...prev, pay_period_end: e.target.value }))}
            className="rounded-md border-slate-300"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="rounded-md border-slate-300"
          >
            <option value="">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Approved">Approved</option>
          </select>
          <button
            type="button"
            onClick={applyFilters}
            className="bg-slate-800 hover:bg-slate-700 text-white rounded-md px-4 py-2"
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Payroll Results</h3>
          {isAdmin ? (
            <button
              type="button"
              onClick={approveAll}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-md px-4 py-2 text-sm"
            >
              {isApproving ? "Approving..." : "Approve All"}
            </button>
          ) : null}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Base Salary</th>
              <th className="px-4 py-3">Overtime Pay</th>
              <th className="px-4 py-3">Gross Pay</th>
              <th className="px-4 py-3">Tax Deducted</th>
              <th className="px-4 py-3">Net Pay</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{row.full_name}</td>
                <td className="px-4 py-3">{row.department_name || "-"}</td>
                <td className="px-4 py-3">${Number(row.base_salary).toFixed(2)}</td>
                <td className="px-4 py-3">${Number(row.overtime_pay).toFixed(2)}</td>
                <td className="px-4 py-3">${Number(row.gross_pay).toFixed(2)}</td>
                <td className="px-4 py-3">${Number(row.tax_deducted).toFixed(2)}</td>
                <td className="px-4 py-3 font-semibold">${Number(row.net_pay).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass(
                      row.status
                    )}`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No payroll records found.
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200">
            <tr className="font-semibold text-slate-700">
              <td className="px-4 py-3" colSpan={4}>
                Totals
              </td>
              <td className="px-4 py-3">${totals.gross.toFixed(2)}</td>
              <td className="px-4 py-3">${totals.tax.toFixed(2)}</td>
              <td className="px-4 py-3">${totals.net.toFixed(2)}</td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default Payroll;
