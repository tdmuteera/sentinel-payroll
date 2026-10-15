import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";

function EmployeeAccess() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.get("/employee-access");
      setRows(res.data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load employee access.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showGenerated = (plain) => {
    setNotice(
      `Temporary password (copy now; it will not be shown again): ${plain}`
    );
  };

  const createAccess = async (employeeId) => {
    setNotice("");
    setBusyId(employeeId);
    try {
      const res = await api.post("/employee-access", {
        employee_id: employeeId,
        generate_password: true,
        is_active: true,
      });
      if (res.data.generated_password) {
        showGenerated(res.data.generated_password);
      }
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not create access.");
    } finally {
      setBusyId(null);
    }
  };

  const resetPassword = async (employeeId) => {
    setNotice("");
    setBusyId(employeeId);
    try {
      const res = await api.patch(`/employee-access/${employeeId}`, {
        generate_password: true,
      });
      if (res.data.generated_password) {
        showGenerated(res.data.generated_password);
      }
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not reset password.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (employeeId, nextActive) => {
    setNotice("");
    setBusyId(employeeId);
    try {
      await api.patch(`/employee-access/${employeeId}`, { is_active: nextActive });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not update access.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-slate-800">Employee access management</h2>
        <p className="text-slate-600 mt-2 text-sm">
          Portal accounts are linked to the employees list. Passwords are stored hashed; use reset to
          issue a new temporary password.
        </p>
      </div>

      {notice ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Portal</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.employee_id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-700">{r.employee_code}</td>
                  <td className="px-4 py-3">{r.full_name}</td>
                  <td className="px-4 py-3">{r.department_name || "—"}</td>
                  <td className="px-4 py-3">{r.employment_status}</td>
                  <td className="px-4 py-3">
                    {!r.has_account ? (
                      <span className="text-slate-500">No account</span>
                    ) : r.is_active ? (
                      <span className="text-green-700 font-medium">Active</span>
                    ) : (
                      <span className="text-amber-700 font-medium">Disabled</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {!r.has_account ? (
                        <button
                          type="button"
                          disabled={busyId === r.employee_id || r.employment_status !== "Active"}
                          onClick={() => createAccess(r.employee_id)}
                          className="rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Create login
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={busyId === r.employee_id}
                            onClick={() => resetPassword(r.employee_id)}
                            className="rounded-md bg-slate-100 px-3 py-1 hover:bg-slate-200"
                          >
                            Reset password
                          </button>
                          {r.is_active ? (
                            <button
                              type="button"
                              disabled={busyId === r.employee_id}
                              onClick={() => toggleActive(r.employee_id, false)}
                              className="rounded-md bg-amber-100 px-3 py-1 text-amber-900 hover:bg-amber-200"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === r.employee_id || r.employment_status !== "Active"}
                              onClick={() => toggleActive(r.employee_id, true)}
                              className="rounded-md bg-green-100 px-3 py-1 text-green-900 hover:bg-green-200 disabled:opacity-50"
                            >
                              Activate
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EmployeeAccess;
