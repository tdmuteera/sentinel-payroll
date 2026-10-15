import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function Payslips() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [rows, setRows] = useState([]);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [selectedPayrollId, setSelectedPayrollId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchPayslips = async () => {
    const params = {};
    if (employeeFilter) params.employee = employeeFilter;
    if (periodFilter) params.period = periodFilter;
    const response = await api.get("/payslips", { params });
    setRows(response.data);
  };

  const fetchPayrollRuns = async () => {
    const response = await api.get("/payroll");
    setPayrollRuns(response.data);
  };

  useEffect(() => {
    Promise.all([fetchPayslips(), fetchPayrollRuns()]).catch(() => {
      setErrorMessage("Failed to load payslip data.");
    });
  }, []);

  const uniqueRuns = useMemo(() => {
    const map = new Map();
    for (const row of payrollRuns) {
      const key = `${row.pay_period_start}_${row.pay_period_end}`;
      if (!map.has(key)) {
        map.set(key, row);
      }
    }
    return Array.from(map.values());
  }, [payrollRuns]);

  const applyFilters = async () => {
    setErrorMessage("");
    try {
      await fetchPayslips();
    } catch (error) {
      setErrorMessage("Failed to filter payslips.");
    }
  };

  const generatePayslips = async () => {
    if (!selectedPayrollId) {
      setErrorMessage("Select a payroll run to generate payslips.");
      return;
    }
    setIsGenerating(true);
    setErrorMessage("");
    try {
      await api.post(`/payslips/generate/${selectedPayrollId}`);
      setIsGenerateModalOpen(false);
      await fetchPayslips();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Failed to generate payslips.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getPdfBlob = async (payslipId) => {
    const response = await api.get(`/payslips/${payslipId}/pdf`, {
      responseType: "blob",
    });
    return response.data;
  };

  const downloadPDF = async (payslip) => {
    try {
      const blob = await getPdfBlob(payslip.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const periodName = payslip.period_label.replace(/\s+/g, "_");
      link.href = url;
      link.download = `payslip_${payslip.employee_code}_${periodName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage("Unable to download PDF.");
    }
  };

  const printPDF = async (payslip) => {
    try {
      const blob = await getPdfBlob(payslip.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setErrorMessage("Unable to open PDF for printing.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            placeholder="Search employee"
            className="w-64 rounded-md border-slate-300"
          />
          <input
            type="text"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            placeholder="Filter by period"
            className="w-64 rounded-md border-slate-300"
          />
          <button
            type="button"
            onClick={applyFilters}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md"
          >
            Apply Filters
          </button>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setIsGenerateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Generate Payslips
          </button>
        ) : null}
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
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Gross Pay</th>
              <th className="px-4 py-3">Deductions</th>
              <th className="px-4 py-3">Net Pay</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{row.full_name}</td>
                <td className="px-4 py-3">{row.department_name || "-"}</td>
                <td className="px-4 py-3">{row.period_label}</td>
                <td className="px-4 py-3">${Number(row.gross_pay).toFixed(2)}</td>
                <td className="px-4 py-3">${Number(row.deductions).toFixed(2)}</td>
                <td className="px-4 py-3 font-semibold">${Number(row.net_pay).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => downloadPDF(row)}
                      className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200"
                    >
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => printPDF(row)}
                      className="px-3 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700"
                    >
                      Print
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No payslip records found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {isGenerateModalOpen ? (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Generate Payslips</h3>
            <label className="block text-sm text-slate-700 mb-1">Select Payroll Run ID</label>
            <select
              value={selectedPayrollId}
              onChange={(e) => setSelectedPayrollId(e.target.value)}
              className="w-full rounded-md border-slate-300 mb-4"
            >
              <option value="">Choose payroll run</option>
              {uniqueRuns.map((run) => (
                <option key={run.id} value={run.id}>
                  #{run.id} - {run.pay_period_start} to {run.pay_period_end} ({run.status})
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="px-4 py-2 rounded-md border border-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={generatePayslips}
                disabled={isGenerating}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white"
              >
                {isGenerating ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Payslips;
